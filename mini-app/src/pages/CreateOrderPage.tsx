import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, AlertCircle, Send, ChevronRight, Loader2,
  Tag, Clock, Zap, Flame, Rocket, Timer, Hourglass
} from 'lucide-react'
import { UserData, WorkType, OrderCreateRequest, Voucher } from '../types'
import { createOrder, uploadOrderFiles, FileUploadResponse } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'
import { usePromo } from '../contexts/PromoContext'
import { useClub } from '../contexts/ClubContext'
import { useModalRegistration } from '../contexts/NavigationContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { Confetti } from '../components/ui/Confetti'
import {
  ServiceTypeStep,
  RequirementsStep,
  VoucherSelector,
  useDrafts,
  SERVICE_TYPES,
  DEADLINES,
  WIZARD_STEPS,
  DRAFT_KEY,
} from '../components/order-wizard'

// ═══════════════════════════════════════════════════════════════════════════
//  CREATE ORDER PAGE — Premium Order Wizard
//  Версия 2.0: Отдельные компоненты шагов, drafts per service type,
//  исправленный scroll/keyboard, Telegram MainButton
// ═══════════════════════════════════════════════════════════════════════════

// Animation
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
}

const FAST_WIZARD_STEPS = [
  { num: 1, title: 'Быстрый запрос', subtitle: 'Тема, комментарий и файлы без выбора формата' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен ответ?' },
]

// Prefill data interface for Quick Reorder feature
interface PrefillData {
  work_type?: WorkType
  subject?: string
  deadline?: string
  topic?: string
  voucherId?: string
}

function buildOrderDescription(requirements: string, selectedVoucher: Voucher | null): string | undefined {
  const parts: string[] = []
  const trimmedRequirements = requirements.trim()

  if (selectedVoucher) {
    parts.push(
      [
        '[Ваучер клиента]',
        selectedVoucher.title,
        selectedVoucher.description,
        `Условия: ${selectedVoucher.applyRules}`,
      ].join('\n')
    )
  }

  if (trimmedRequirements) {
    parts.push(trimmedRequirements)
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined
}

function formatFileNamesPreview(fileNames: string[]) {
  const preview = fileNames.slice(0, 3)
  if (preview.length === 0) {
    return ''
  }

  if (fileNames.length <= 3) {
    return preview.join(', ')
  }

  return `${preview.join(', ')} и ещё ${fileNames.length - 3}`
}

function buildAttachmentUploadMessage(uploadResult: FileUploadResponse, selectedCount: number) {
  const blockedFiles = uploadResult.blocked_files ?? []
  const oversizedFiles = uploadResult.oversized_files ?? []
  const rejectedCount = blockedFiles.length + oversizedFiles.length
  const parts: string[] = []

  if (uploadResult.success && uploadResult.uploaded_count > 0) {
    if (uploadResult.uploaded_count === selectedCount && rejectedCount === 0) {
      parts.push('Файлы прикреплены к заказу.')
    } else {
      parts.push(`К заказу прикрепили ${uploadResult.uploaded_count} из ${selectedCount} файлов.`)
    }
  }

  if (blockedFiles.length > 0) {
    parts.push(`Не приняли неподдерживаемые форматы: ${formatFileNamesPreview(blockedFiles)}.`)
  }

  if (oversizedFiles.length > 0) {
    parts.push(`Не приняли файлы больше 50 МБ: ${formatFileNamesPreview(oversizedFiles)}.`)
  }

  if ((uploadResult.success && uploadResult.uploaded_count < selectedCount) || (!uploadResult.success && selectedCount > 0)) {
    parts.push('Остальное можно дослать позже в чате заказа.')
  }

  if (parts.length > 0) {
    return parts.join(' ')
  }

  return 'Заказ создан, но файлы не загрузились. Их можно отправить позже в чате заказа.'
}

interface CreateOrderPageProps {
  user?: UserData | null
}

export function CreateOrderPage({ user = null }: CreateOrderPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { isDark } = useTheme()
  const { activePromo, clearPromo, revalidatePromo, isValidating: isRevalidating } = usePromo()
  const club = useClub()
  const safeBack = useSafeBackNavigation('/')

  // State for promo warning modal
  const [showPromoWarning, setShowPromoWarning] = useState(false)
  const [promoLostReason, setPromoLostReason] = useState<string | null>(null)

  // Check for prefill data from navigation state (Quick Reorder)
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill

  // Check for voucherId from navigation (coming from MyVouchersPage)
  const preselectedVoucherId = (location.state as { voucherId?: string })?.voucherId || prefillData?.voucherId

  // Check for urgent/panic mode from URL params
  const isUrgentMode = searchParams.get('urgent') === 'true'
  const isFastMode = searchParams.get('mode') === 'fast'
  const preselectedType = (prefillData?.work_type || searchParams.get('type')) as WorkType | null

  // Is this a reorder?
  const isReorder = !!prefillData

  // Wizard
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const totalSteps = isFastMode ? 2 : 3
  const stepConfig = isFastMode ? FAST_WIZARD_STEPS : WIZARD_STEPS

  // Form data - initialize with prefill values if available
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(preselectedType || (isFastMode ? 'other' : null))
  const [subject, setSubject] = useState(prefillData?.subject || '')
  const [topic, setTopic] = useState(prefillData?.topic || '')
  const [requirements, setRequirements] = useState(isUrgentMode ? 'СРОЧНО! ' : '')
  const [files, setFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState<string | null>(isUrgentMode ? 'today' : null)
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(preselectedVoucherId || null)

  // Drafts per service type
  const { saveDraft, loadDraft, clearAllDrafts, hasDraft } = useDrafts({
    serviceTypeId,
    currentData: { topic, requirements, subject },
  })

  const selectedVoucher = useMemo(
    () => club.activeVouchers.find(voucher => voucher.id === selectedVoucherId) ?? null,
    [club.activeVouchers, selectedVoucherId]
  )

  // UI
  const [submitting, setSubmitting] = useState(false)
  const [submittingLabel, setSubmittingLabel] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    msg: string
    id?: number
    promoUsed?: { code: string; discount: number } | null
    basePrice?: number
  } | null>(null)

  const loyaltyDiscount = useMemo(() => {
    const rawDiscount = user?.loyalty?.discount ?? user?.discount ?? 0
    return Math.min(Math.max(rawDiscount, 0), 50)
  }, [user])

  // ─────────────────────────────────────────────────────────────────────────
  //  TELEGRAM MAINBUTTON — DISABLED
  //  Используем собственный FloatingCtaDock для полного контроля над дизайном
  // ─────────────────────────────────────────────────────────────────────────

  // Hide Telegram MainButton on mount and keep it hidden
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.MainButton) {
      tg.MainButton.hide()
    }
    return () => {
      if (tg?.MainButton) {
        tg.MainButton.hide()
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  //  DRAFT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  // Auto-save draft when data changes
  useEffect(() => {
    if (step === 4 || submitting || !serviceTypeId) return
    const timeoutId = setTimeout(saveDraft, 500)
    return () => clearTimeout(timeoutId)
  }, [topic, requirements, subject, serviceTypeId, step, submitting, saveDraft])

  // Load draft when service type changes
  useEffect(() => {
    if (!serviceTypeId || isReorder) return

    const draft = loadDraft()
    if (draft) {
      setTopic(draft.topic)
      setRequirements(draft.requirements)
      setSubject(draft.subject)
      haptic('light')
    } else {
      // Clear fields for new service type
      setTopic('')
      setRequirements('')
      // Keep subject as it's often the same
    }
  }, [serviceTypeId])

  // Legacy draft loading (from old version)
  useEffect(() => {
    if (isReorder || isUrgentMode) return

    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        const age = Date.now() - (draft.timestamp || 0)

        if (age < 24 * 60 * 60 * 1000) {
          setServiceTypeId(draft.workType || null)
          setSubject(draft.subject || '')
          setTopic(draft.topic || '')
          setRequirements(draft.description || '')
          setDeadline(draft.deadline || null)
          setStep(draft.step || 1)
          haptic('light')
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  // Auto-advance to step 2 if type is pre-selected (urgent mode)
  useEffect(() => {
    if (preselectedType && isUrgentMode) {
      setStep(2)
    }
  }, [preselectedType, isUrgentMode])

  useEffect(() => {
    setStep(1)
    setDirection(0)

    if (isFastMode) {
      setSelectedVoucherId(null)
      setServiceTypeId(preselectedType || 'other')
      return
    }

    if (!preselectedType && !isReorder && serviceTypeId === 'other') {
      setServiceTypeId(null)
    }
  }, [isFastMode, isReorder, preselectedType])

  // ─────────────────────────────────────────────────────────────────────────
  //  VALIDATION & NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const canStep1 = isFastMode ? subject.trim().length >= 2 : serviceTypeId !== null
  const canStep2 = isFastMode ? deadline !== null : subject.trim().length >= 2
  const canStep3 = deadline !== null
  const canProceed = step === 1 ? canStep1 : step === 2 ? canStep2 : canStep3

  const goNext = useCallback(() => {
    haptic('medium')
    setDirection(1)
    setStep((s) => Math.min(s + 1, totalSteps))
  }, [haptic, totalSteps])

  const goBack = useCallback(() => {
    haptic('light')
    if (step === 1) {
      safeBack()
      return
    }

    setDirection(-1)
    setStep((s) => s - 1)
  }, [step, safeBack, haptic])

  const handleServiceTypeSelect = useCallback((id: string) => {
    haptic('light')
    setServiceTypeId(id)
  }, [haptic])

  const handleDeadlineSelect = useCallback((value: string) => {
    haptic('light')
    setDeadline(value)
  }, [haptic])

  const switchMode = useCallback((mode: 'full' | 'fast') => {
    const params = new URLSearchParams(searchParams.toString())

    if (mode === 'fast') {
      params.set('mode', 'fast')
    } else {
      params.delete('mode')
    }

    const query = params.toString()
    navigate(`/create-order${query ? `?${query}` : ''}`, { replace: true, state: location.state })
  }, [location.state, navigate, searchParams])

  const canShowModeSwitch = isFastMode || step === 1

  // Voucher selection
  const handleVoucherSelect = useCallback((voucherId: string | null) => {
    haptic('light')
    setSelectedVoucherId(voucherId)
  }, [haptic])

  // Files
  const addFiles = useCallback((newFiles: File[]) => {
    haptic('light')
    setFiles((prev) => [...prev, ...newFiles])
  }, [haptic])

  const removeFile = useCallback((index: number) => {
    haptic('light')
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [haptic])

  // ─────────────────────────────────────────────────────────────────────────
  //  ESTIMATE CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  const getBaseEstimate = useCallback(() => {
    if (!serviceTypeId || !deadline) return null
    const st = SERVICE_TYPES.find((s) => s.id === serviceTypeId)
    const dl = DEADLINES.find((d) => d.value === deadline)
    if (!st || !dl || st.priceNum === 0) return null
    return Math.round(st.priceNum * dl.multiplierNum)
  }, [serviceTypeId, deadline])

  const applyDisplayedDiscounts = useCallback((basePrice: number, promoDiscount = 0) => {
    const priceAfterLoyalty = basePrice * (1 - loyaltyDiscount / 100)
    const priceAfterPromo = priceAfterLoyalty * (1 - promoDiscount / 100)
    return Math.round(priceAfterPromo)
  }, [loyaltyDiscount])

  const getEstimateBaseAfterLoyalty = useCallback(() => {
    const basePrice = getBaseEstimate()
    if (!basePrice) return null
    return applyDisplayedDiscounts(basePrice, 0)
  }, [applyDisplayedDiscounts, getBaseEstimate])

  const getEstimate = useCallback(() => {
    const basePrice = getBaseEstimate()
    if (!basePrice) return null
    return applyDisplayedDiscounts(basePrice, activePromo?.discount ?? 0)
  }, [applyDisplayedDiscounts, getBaseEstimate, activePromo])

  // ─────────────────────────────────────────────────────────────────────────
  //  SUBMIT
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (forceWithoutPromo: boolean = false) => {
    if (!serviceTypeId || !deadline || !subject.trim()) return

    haptic('heavy')
    setSubmitting(true)
    setSubmittingLabel('Отправляем заявку...')
    let shouldShowResult = false

    try {
      let promoToUse = activePromo?.code
      if (activePromo && !forceWithoutPromo) {
        setSubmittingLabel('Проверяем условия...')
        const promoStillValid = await revalidatePromo()
        if (!promoStillValid) {
          setSubmitting(false)
          setSubmittingLabel(null)
          setPromoLostReason('Промокод больше не действителен')
          setShowPromoWarning(true)
          hapticError()
          return
        }
      }

      if (forceWithoutPromo === true) {
        promoToUse = undefined
      }

      setSubmittingLabel('Создаём заказ...')
      const data: OrderCreateRequest = {
        work_type: serviceTypeId as WorkType,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        deadline,
        description: buildOrderDescription(requirements, selectedVoucher),
        promo_code: promoToUse,
      }

      const res = await createOrder(data)
      if (res.success) {
        const actualPromoUsed = res.promo_failed ? null : (activePromo ? {
          code: activePromo.code,
          discount: activePromo.discount
        } : null)

        const basePrice = getBaseEstimate()

        // Use voucher if selected
        let voucherUsed = false
        if (selectedVoucherId && res.order_id) {
          const voucherResult = club.useVoucher(selectedVoucherId, res.order_id)
          voucherUsed = voucherResult.success
        }

        // Clear drafts on success
        localStorage.removeItem(DRAFT_KEY)
        clearAllDrafts()
        if (activePromo) {
          clearPromo()
        }

        hapticSuccess()
        if (!res.promo_failed) setShowConfetti(true)

        let finalMsg = typeof res.message === 'string' ? res.message : JSON.stringify(res.message)
        if (res.promo_failed && res.promo_failure_reason) {
          finalMsg = `Заказ создан, но промокод не применён: ${res.promo_failure_reason}`
        }
        if (selectedVoucher) {
          finalMsg = `${finalMsg} Информация о выбранном ваучере передана менеджеру вместе с заявкой.`
        }
        if (selectedVoucher && !voucherUsed) {
          finalMsg = `${finalMsg} Ваучер останется доступен в профиле до подтверждения вручную.`
        }

        if (files.length > 0 && res.order_id) {
          try {
            setSubmittingLabel('Загружаем файлы...')
            const uploadResult = await uploadOrderFiles(res.order_id, files, (percent) => {
              setSubmittingLabel(percent > 0 ? `Загружаем файлы... ${percent}%` : 'Загружаем файлы...')
            })

            finalMsg = `${finalMsg} ${buildAttachmentUploadMessage(uploadResult, files.length)}`
          } catch {
            finalMsg = `${finalMsg} Заказ создан, но файлы не загрузились. Их можно отправить позже в чате заказа.`
          }
        }

        setResult({
          ok: true,
          msg: finalMsg,
          id: res.order_id,
          promoUsed: actualPromoUsed,
          basePrice: basePrice || undefined
        })
        shouldShowResult = true
      } else {
        hapticError()
        const errorMsg = typeof res.message === 'string'
          ? res.message
          : (typeof res.message === 'object' ? JSON.stringify(res.message) : 'Произошла ошибка')
        setResult({ ok: false, msg: errorMsg })
        shouldShowResult = true
      }
    } catch (err) {
      hapticError()
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setResult({ ok: false, msg: errorMessage })
      shouldShowResult = true
    } finally {
      setSubmitting(false)
      setSubmittingLabel(null)
      if (shouldShowResult) {
        setStep(4)
      }
    }
  }, [serviceTypeId, deadline, subject, topic, requirements, selectedVoucher, activePromo, revalidatePromo, haptic, hapticSuccess, hapticError, getBaseEstimate, clearPromo, clearAllDrafts, selectedVoucherId, club, files])

  const handlePromoWarningContinue = useCallback(() => {
    setShowPromoWarning(false)
    clearPromo()
    handleSubmit(true)
  }, [clearPromo, handleSubmit])

  const handlePromoWarningCancel = useCallback(() => {
    setShowPromoWarning(false)
    setPromoLostReason(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  //  RESULT SCREEN
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 4 && result) {
    const promoUsed = result.promoUsed
    const basePrice = result.basePrice
    const savings = basePrice && promoUsed
      ? Math.round(basePrice * (1 - loyaltyDiscount / 100) * (promoUsed.discount / 100))
      : 0

    return (
      <div style={{ padding: 24, paddingBottom: 100, minHeight: '100vh', height: '100dvh', background: 'var(--bg-main)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            textAlign: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: result.ok
                ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
              border: `3px solid ${result.ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
              boxShadow: `0 0 60px -10px ${result.ok ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
            }}
          >
            {result.ok ? (
              <Check size={50} color="#22c55e" strokeWidth={2} />
            ) : (
              <AlertCircle size={50} color="#ef4444" strokeWidth={2} />
            )}
          </motion.div>

          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: result.ok ? 'var(--text-main)' : 'var(--error-text)',
            marginBottom: 16,
          }}>
            {result.ok ? 'Заявка отправлена' : 'Ошибка'}
          </h2>

          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: result.ok && promoUsed ? 20 : 40, maxWidth: 300, lineHeight: 1.6 }}>
            {result.msg}
          </p>

          {/* Promo savings card */}
          {result.ok && promoUsed && savings > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '20px 24px',
                marginBottom: 32,
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 20,
                maxWidth: 320,
                width: '100%',
                boxShadow: '0 8px 32px -8px rgba(34, 197, 94, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  transform: 'skewX(-20deg)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag size={18} color="#22c55e" />
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#22c55e', letterSpacing: '0.05em' }}>
                  {promoUsed.code}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(34, 197, 94, 0.25)', fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                  -{promoUsed.discount}%
                </span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Ваша экономия
              </div>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {savings.toLocaleString('ru-RU')} ₽
              </motion.div>
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
            {result.ok && result.id && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: promoUsed ? 0.6 : 0.3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/order/${result.id}`)}
                style={{
                  padding: '18px 28px',
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  color: '#050505',
                  background: 'linear-gradient(180deg, #f5d061, #d4af37, #b48e26)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  boxShadow: '0 0 35px -8px rgba(212,175,55,0.6)',
                }}
              >
                Открыть заказ
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: promoUsed ? 0.7 : 0.4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(result.ok ? '/orders' : '/')}
              style={{
                padding: '16px 28px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                borderRadius: 16,
                cursor: 'pointer',
              }}
            >
              {result.ok ? 'В мои заказы' : 'На главную'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIZARD
  // ─────────────────────────────────────────────────────────────────────────

  const currentConfig = stepConfig[step - 1]
  const estimate = getEstimate()

  return (
    <div style={{
      minHeight: '100vh',
      height: '100dvh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          padding: 24,
          paddingBottom: 120, // Space for sticky CTA
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Reorder Banner */}
        {isReorder && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 14,
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={20} color="#050505" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 2 }}>
                Повторный заказ
              </div>
              <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                Данные предзаполнены из прошлого заказа
              </div>
            </div>
          </motion.div>
        )}

        {/* Draft Restored Banner */}
        <AnimatePresence>
          {hasDraft && step === 2 && !isReorder && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                marginBottom: 16,
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 12,
              }}
            >
              <Clock size={16} color="#3b82f6" />
              <span style={{ fontSize: 12, color: '#60a5fa', flex: 1 }}>
                Черновик восстановлен
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goBack}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={22} color="var(--text-secondary)" />
          </motion.button>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 700,
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 4,
            }}>
              {currentConfig?.title}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{currentConfig?.subtitle}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <div style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: isFastMode ? 'rgba(59,130,246,0.12)' : 'rgba(212,175,55,0.1)',
                border: `1px solid ${isFastMode ? 'rgba(59,130,246,0.25)' : 'var(--border-gold)'}`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isFastMode ? '#60a5fa' : 'var(--gold-400)',
              }}>
                {isFastMode ? 'Быстрый запрос' : 'Основной маршрут'}
              </div>

              {canShowModeSwitch && isFastMode && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => switchMode(isFastMode ? 'full' : 'fast')}
                  style={{
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isFastMode ? 'Вернуться к полной заявке' : 'Есть срочная задача? Открыть быстрый запрос'}
                </motion.button>
              )}
            </div>
          </div>

          <div style={{
              padding: '10px 16px',
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid var(--border-gold)',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--gold-400)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
            Шаг {step} из {totalSteps}
          </div>
        </motion.div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map((s) => (
            <motion.div
              key={s}
              animate={{
                background: s <= step ? 'linear-gradient(90deg, #d4af37, #f5d061)' : 'rgba(255,255,255,0.08)',
                boxShadow: s <= step ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
              }}
              style={{ flex: 1, height: 5, borderRadius: 3 }}
            />
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="s1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {isFastMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    padding: '16px 18px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
                    border: '1px solid rgba(59,130,246,0.18)',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#dbeafe', marginBottom: 6 }}>
                      Быстрый запрос для срочных случаев
                    </div>
                    <div style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.55 }}>
                      Здесь можно сразу оставить тему, комментарий и файлы, если не хочется
                      проходить полный выбор услуги. Формат работы менеджер уточнит после отправки.
                    </div>
                  </div>

                  <RequirementsStep
                    serviceTypeId={serviceTypeId}
                    subject={subject}
                    onSubjectChange={setSubject}
                    topic={topic}
                    onTopicChange={setTopic}
                    requirements={requirements}
                    onRequirementsChange={setRequirements}
                    files={files}
                    onFilesAdd={addFiles}
                    onFileRemove={removeFile}
                    disabled={submitting || isRevalidating}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ServiceTypeStep
                    selected={serviceTypeId}
                    onSelect={handleServiceTypeSelect}
                    onUrgentRequest={() => switchMode('fast')}
                    minimal
                  />
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && !isFastMode && (
            <motion.div
              key="s2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <RequirementsStep
                serviceTypeId={serviceTypeId}
                subject={subject}
                onSubjectChange={setSubject}
                topic={topic}
                onTopicChange={setTopic}
                requirements={requirements}
                onRequirementsChange={setRequirements}
                files={files}
                onFilesAdd={addFiles}
                onFileRemove={removeFile}
                disabled={submitting || isRevalidating}
              />
            </motion.div>
          )}

          {((step === 2 && isFastMode) || (step === 3 && !isFastMode)) && (
            <motion.div
              key={isFastMode ? 's2-fast' : 's3'}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <DeadlineStep
                selected={deadline}
                onSelect={handleDeadlineSelect}
                isDark={isDark}
              />

              {/* Promo Code Section */}
              {!isFastMode && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{ marginTop: 20 }}
                  >
                    <PromoCodeSection
                      variant="inline"
                      basePrice={getEstimateBaseAfterLoyalty() || undefined}
                    />
                  </motion.div>

                  <VoucherSelector
                    vouchers={club.activeVouchers}
                    selectedVoucherId={selectedVoucherId}
                    onSelect={handleVoucherSelect}
                  />

                  {selectedVoucher && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: 14,
                        padding: '14px 16px',
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05))',
                        border: '1px solid rgba(212,175,55,0.18)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-300)', marginBottom: 6 }}>
                        Ваучер добавим к этой заявке
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Менеджер увидит выбранный ваучер вместе с условиями и подтвердит его при согласовании заказа.
                      </div>
                    </motion.div>
                  )}

                  {estimate && (
                    <EstimateCard
                      estimate={estimate}
                      baseEstimate={getBaseEstimate()}
                      loyaltyDiscount={loyaltyDiscount}
                      activePromo={activePromo}
                      isDark={isDark}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating CTA Dock (Fallback when MainButton not available) */}
      <FloatingCtaDock
        step={step}
        totalSteps={totalSteps}
        isFastMode={isFastMode}
        canProceed={canProceed}
        submitting={submitting}
        submittingLabel={submittingLabel}
        isRevalidating={isRevalidating}
        onNext={goNext}
        onSubmit={() => handleSubmit()}
        selectedServiceLabel={SERVICE_TYPES.find(s => s.id === serviceTypeId)?.label}
      />

      {/* Promo Warning Modal */}
      <PromoWarningModal
        isOpen={showPromoWarning}
        reason={promoLostReason}
        onContinue={handlePromoWarningContinue}
        onCancel={handlePromoWarningCancel}
        isDark={isDark}
      />

      {/* Confetti */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEADLINE STEP
// ═══════════════════════════════════════════════════════════════════════════

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  isDark: boolean
}

function DeadlineStep({ selected, onSelect, isDark }: DeadlineStepProps) {
  void isDark

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '16px 16px 14px',
          borderRadius: 20,
          background: `
            radial-gradient(circle at top right, rgba(212, 175, 55, 0.10), transparent 32%),
            linear-gradient(180deg, rgba(19, 18, 24, 0.96), rgba(10, 10, 16, 0.94))
          `,
          border: '1px solid rgba(212, 175, 55, 0.14)',
          boxShadow: '0 18px 36px -34px rgba(0, 0, 0, 0.88)',
        }}
      >
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 6,
        }}>
          Выберите комфортный темп
        </div>
        <div style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}>
          Срочные варианты повышают приоритет команды и стоимость. Если запас по времени есть,
          лучше брать спокойный режим без лишней наценки.
        </div>
      </motion.div>

      {DEADLINES.map((dl, i) => (
        <DeadlineCard
          key={dl.value}
          config={dl}
          selected={selected === dl.value}
          onSelect={() => onSelect(dl.value)}
          index={i}
          isDark={isDark}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEADLINE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface DeadlineCardProps {
  config: typeof DEADLINES[0]
  selected: boolean
  onSelect: () => void
  index: number
  isDark: boolean
}

function DeadlineCard({ config, selected, onSelect, index, isDark }: DeadlineCardProps) {
  void isDark

  const getIcon = () => {
    if (config.urgency >= 85) return Flame
    if (config.urgency >= 60) return Rocket
    if (config.urgency >= 40) return Zap
    if (config.urgency >= 20) return Timer
    return Hourglass
  }
  const Icon = getIcon()
  const meta = getDeadlineMeta(config.value)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '15px 16px',
        background: `
          radial-gradient(circle at top right, rgba(212, 175, 55, ${selected ? '0.12' : '0.07'}), transparent 34%),
          linear-gradient(180deg, rgba(19, 18, 24, 0.96), rgba(10, 10, 16, 0.94))
        `,
        border: `1px solid ${selected ? 'rgba(212, 175, 55, 0.28)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRadius: 22,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: selected ? '0 20px 44px -36px rgba(212, 175, 55, 0.24)' : '0 18px 34px -34px rgba(0, 0, 0, 0.85)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: `linear-gradient(180deg, ${config.color}1c, ${config.color}10)`,
            border: `1px solid ${selected ? `${config.color}50` : `${config.color}30`}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            size={22}
            color={config.color}
            strokeWidth={selected ? 2.4 : 2}
            style={{ filter: selected ? `drop-shadow(0 0 10px ${config.color}40)` : 'none' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-main)',
            }}>
              {config.label}
            </span>
          </div>

          <div style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}>
            {meta.description}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <DeadlineMetaPill label={meta.pace} accent={selected ? 'var(--gold-300)' : config.color} />
            <DeadlineMetaPill label={config.multiplier === 'Базовая' ? 'без доплаты' : config.multiplier} />
            {meta.recommended && <DeadlineMetaPill label="оптимально" accent="var(--gold-300)" />}
            {selected && <DeadlineMetaPill label="выбрано" accent="var(--gold-300)" />}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function getDeadlineMeta(value: string) {
  switch (value) {
    case 'today':
      return {
        pace: 'экстренно',
        description: 'Максимальный приоритет, если результат действительно нужен сегодня.',
      }
    case 'tomorrow':
      return {
        pace: 'очень быстро',
        description: 'Подходит, когда дедлайн уже близко, но нужен небольшой запас на работу.',
      }
    case '3days':
      return {
        pace: 'сбалансировано',
        description: 'Хороший баланс между скоростью, качеством проработки и стоимостью.',
        recommended: true,
      }
    case 'week':
      return {
        pace: 'спокойный темп',
        description: 'Комфортный срок для большинства задач без лишней спешки.',
      }
    case '2weeks':
      return {
        pace: 'с запасом',
        description: 'Дает больше времени на правки, согласования и спокойную доработку.',
      }
    case 'month':
    default:
      return {
        pace: 'базовый расчет',
        description: 'Наиболее мягкий режим без срочной надбавки и с полным запасом по времени.',
      }
  }
}

function DeadlineMetaPill({
  label,
  accent,
}: {
  label: string
  accent?: string
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '7px 10px',
      borderRadius: 999,
      background: accent ? 'rgba(212, 175, 55, 0.10)' : 'rgba(255, 255, 255, 0.04)',
      border: `1px solid ${accent ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255, 255, 255, 0.06)'}`,
      color: accent || 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1,
    }}>
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ESTIMATE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface EstimateCardProps {
  estimate: number
  baseEstimate: number | null
  loyaltyDiscount: number
  activePromo: { code: string; discount: number } | null
  isDark: boolean
}

function EstimateCard({ estimate, baseEstimate, loyaltyDiscount, activePromo, isDark }: EstimateCardProps) {
  const priceAfterLoyalty = baseEstimate
    ? Math.round(baseEstimate * (1 - loyaltyDiscount / 100))
    : null
  const hasLoyaltyDiscount = loyaltyDiscount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      style={{
        marginTop: 20,
        padding: '20px 24px',
        background: isDark
          ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(180,142,38,0.1) 0%, rgba(180,142,38,0.03) 100%)',
        border: isDark
          ? '2px solid rgba(212, 175, 55, 0.3)'
          : '2px solid rgba(180, 142, 38, 0.25)',
        borderRadius: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#a1a1aa' : '#52525b' }}>
              Ориентировочно
            </span>
          </div>
          {(activePromo || hasLoyaltyDiscount) && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'block', marginTop: 2 }}>
              {hasLoyaltyDiscount && activePromo
                ? `Статус ${loyaltyDiscount}% + промокод ${activePromo.discount}%`
                : hasLoyaltyDiscount
                  ? `С учетом личной скидки ${loyaltyDiscount}%`
                  : `С промокодом ${activePromo?.discount}%`}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {(activePromo || hasLoyaltyDiscount) && baseEstimate && (
            <>
              <div style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                textDecoration: 'line-through',
                marginBottom: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {baseEstimate.toLocaleString('ru-RU')} ₽
              </div>
              {activePromo && hasLoyaltyDiscount && priceAfterLoyalty && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  После статуса: {priceAfterLoyalty.toLocaleString('ru-RU')} ₽
                </div>
              )}
            </>
          )}
          <motion.span
            key={estimate}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: activePromo || hasLoyaltyDiscount ? '#22c55e' : (isDark ? '#d4af37' : '#9e7a1a'),
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {estimate.toLocaleString('ru-RU')} ₽
          </motion.span>
          {(activePromo || hasLoyaltyDiscount) && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#22c55e',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
            }}>
              {activePromo ? (
                <>
                  <Tag size={12} />
                  {activePromo.code} −{activePromo.discount}%
                </>
              ) : (
                `Личная скидка −${loyaltyDiscount}%`
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING CTA DOCK — Mac-style floating action button
// ═══════════════════════════════════════════════════════════════════════════

interface FloatingCtaDockProps {
  step: number
  totalSteps: number
  isFastMode: boolean
  canProceed: boolean
  submitting: boolean
  submittingLabel?: string | null
  isRevalidating: boolean
  onNext: () => void
  onSubmit: () => void
  selectedServiceLabel?: string
}

function FloatingCtaDock({
  step,
  totalSteps,
  isFastMode,
  canProceed,
  submitting,
  submittingLabel,
  isRevalidating,
  onNext,
  onSubmit,
  selectedServiceLabel,
}: FloatingCtaDockProps) {
  return (
    <AnimatePresence>
      {canProceed && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {/* The Floating Dock */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={step === totalSteps ? onSubmit : onNext}
            disabled={!canProceed || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              background: 'rgba(10, 10, 12, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: 50,
              cursor: submitting ? 'wait' : 'pointer',
              pointerEvents: 'auto',
              boxShadow: `
                0 10px 40px -10px rgba(0, 0, 0, 0.6),
                0 0 30px -5px rgba(212, 175, 55, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            {/* Left side: Context info */}
            {!isFastMode && step === 1 && selectedServiceLabel && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingRight: 14,
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4af37, #f5d061)',
                    boxShadow: '0 0 8px rgba(212, 175, 55, 0.5)',
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedServiceLabel}
                </span>
              </motion.div>
            )}

            {/* CTA Text */}
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#d4af37',
                letterSpacing: '0.01em',
              }}
            >
              {submitting
                ? (submittingLabel || (isRevalidating ? 'Проверка...' : 'Отправка...'))
                : step === totalSteps
                  ? (isFastMode ? 'Отправить быстрый запрос' : 'Отправить заявку')
                  : step === 1 && !isFastMode
                    ? 'Перейти к деталям'
                  : step === 2 && !isFastMode
                    ? 'Выбрать сроки'
                  : step === 1 && isFastMode
                    ? 'Перейти к сроку'
                  : 'Продолжить'}
            </span>

            {/* Icon */}
            <motion.div
              animate={submitting ? { rotate: 360 } : { rotate: 0 }}
              transition={submitting ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4af37, #b48e26)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(212, 175, 55, 0.4)',
              }}
            >
              {submitting ? (
                <Loader2 size={18} color="#050505" strokeWidth={2.5} />
              ) : step === totalSteps ? (
                <Send size={16} color="#050505" strokeWidth={2.5} />
              ) : (
                <ChevronRight size={20} color="#050505" strokeWidth={2.5} />
              )}
            </motion.div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROMO WARNING MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface PromoWarningModalProps {
  isOpen: boolean
  reason: string | null
  onContinue: () => void
  onCancel: () => void
  isDark: boolean
}

function PromoWarningModal({ isOpen, reason, onContinue, onCancel, isDark }: PromoWarningModalProps) {
  useModalRegistration(isOpen, 'create-order-promo-warning')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark
                ? 'linear-gradient(145deg, #1f1f25 0%, #18181c 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
              borderRadius: 28,
              padding: '32px 28px',
              maxWidth: 380,
              width: '100%',
              border: '2px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '3px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AlertCircle size={36} color="#ef4444" strokeWidth={2.5} />
            </div>

            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
              color: isDark ? '#f2f2f2' : '#18181b',
              textAlign: 'center',
              marginBottom: 14,
            }}>
              Промокод недействителен
            </h3>

            <p style={{
              fontSize: 15,
              color: isDark ? '#a1a1aa' : '#52525b',
              textAlign: 'center',
              lineHeight: 1.7,
              marginBottom: 28,
            }}>
              {reason || 'Промокод больше не действителен.'}
              {' '}Вы можете создать заказ без скидки или вернуться и ввести другой промокод.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#050505',
                  background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                Создать без скидки
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: isDark ? '#d4af37' : '#b8962e',
                  background: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.12)',
                  border: `1.5px solid ${isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.3)'}`,
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                Ввести другой промокод
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
