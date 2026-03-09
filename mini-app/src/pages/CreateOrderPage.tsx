import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, AlertCircle, Send, ChevronRight, Loader2,
  Tag, Clock, Zap, Flame, Rocket, Timer, Hourglass
} from 'lucide-react'
import { UserData, WorkType, OrderCreateRequest } from '../types'
import { createOrder, uploadOrderFiles, FileUploadResponse } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'
import { usePromo } from '../contexts/PromoContext'
import { useModalRegistration } from '../contexts/NavigationContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { Confetti } from '../components/ui/Confetti'
import {
  ServiceTypeStep,
  RequirementsStep,
  useDrafts,
  SERVICE_TYPES,
  DEADLINES,
  WIZARD_STEPS,
  DRAFT_KEY,
} from '../components/order-wizard'
import homeStyles from './HomePage.module.css'

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

function buildOrderDescription(requirements: string): string | undefined {
  const parts: string[] = []
  const trimmedRequirements = requirements.trim()

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
  const hasVisibleFolderLink = Boolean(uploadResult.files_url)
  const parts: string[] = []

  if (uploadResult.success && uploadResult.uploaded_count > 0) {
    if (!hasVisibleFolderLink) {
      if (uploadResult.uploaded_count === selectedCount && rejectedCount === 0) {
        parts.push('Файлы загружены. Ссылка на папку появится в заказе в течение нескольких секунд.')
      } else {
        parts.push(`Загрузили ${uploadResult.uploaded_count} из ${selectedCount} файлов. Ссылка на папку может появиться с небольшой задержкой.`)
      }
    } else if (uploadResult.uploaded_count === selectedCount && rejectedCount === 0) {
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

  if (
    (uploadResult.success && uploadResult.uploaded_count < selectedCount) ||
    (!uploadResult.success && selectedCount > 0) ||
    (uploadResult.success && uploadResult.uploaded_count > 0 && !hasVisibleFolderLink)
  ) {
    parts.push('Если что-то не появится в заказе, файлы можно дослать позже в чате.')
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
  const safeBack = useSafeBackNavigation('/')

  // State for promo warning modal
  const [showPromoWarning, setShowPromoWarning] = useState(false)
  const [promoLostReason, setPromoLostReason] = useState<string | null>(null)

  // Check for prefill data from navigation state (Quick Reorder)
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill

  // Check for urgent/panic mode from URL params
  const isUrgentMode = searchParams.get('urgent') === 'true'
  const isFastMode = searchParams.get('mode') === 'fast'
  const preselectedType = (prefillData?.work_type || searchParams.get('type')) as WorkType | null

  // Is this a reorder?
  const isReorder = !!prefillData

  // Wizard
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const totalSteps = isFastMode ? 2 : 3
  const stepConfig = isFastMode ? FAST_WIZARD_STEPS : WIZARD_STEPS

  // Form data - initialize with prefill values if available
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(preselectedType || (isFastMode ? 'other' : null))
  const [subject, setSubject] = useState(prefillData?.subject || '')
  const [topic, setTopic] = useState(prefillData?.topic || '')
  const [requirements, setRequirements] = useState(isUrgentMode ? 'СРОЧНО! ' : '')
  const [files, setFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState<string | null>(isUrgentMode ? 'today' : null)

  // Drafts per service type
  const { saveDraft, loadDraft, clearAllDrafts, hasDraft } = useDrafts({
    serviceTypeId,
    currentData: { topic, requirements, subject },
  })

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
    if (preselectedType && isUrgentMode && !isFastMode) {
      setStep(2)
    }
  }, [preselectedType, isUrgentMode, isFastMode])

  useEffect(() => {
    setStep(1)
    setDirection(0)

    if (isFastMode) {
      setServiceTypeId(preselectedType || 'other')
      return
    }

    if (!preselectedType && !isReorder && serviceTypeId === 'other') {
      setServiceTypeId(null)
    }
  }, [isFastMode, isReorder, preselectedType])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step, isFastMode])

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
        description: buildOrderDescription(requirements),
        promo_code: promoToUse,
      }

      const res = await createOrder(data)
      if (res.success) {
        const actualPromoUsed = res.promo_failed ? null : (activePromo ? {
          code: activePromo.code,
          discount: activePromo.discount
        } : null)

        const basePrice = getBaseEstimate()

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
  }, [serviceTypeId, deadline, subject, topic, requirements, activePromo, revalidatePromo, haptic, hapticSuccess, hapticError, getBaseEstimate, clearPromo, clearAllDrafts, files])

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
    const title = result.ok ? 'Заявка принята' : 'Не удалось отправить заявку'
    const lead = result.ok && result.id
      ? `Заказ #${result.id} создан. Сейчас проверяем вводные и готовим оценку от менеджера.`
      : result.msg
    const details = result.ok
      ? result.msg.replace(/^✅?\s*Заказ #?\d+\s+создан!?/i, '').trim()
      : result.msg

    return (
      <div style={{ padding: 24, paddingBottom: 100, minHeight: '100vh', height: '100dvh', background: 'var(--bg-main)' }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
          }}
        >
          <motion.section
            className={`${homeStyles.voidGlass} ${homeStyles.primaryActionCard} ${homeStyles.returningOrderActionCard}`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              padding: '26px 22px 22px',
              borderRadius: 30,
              overflow: 'hidden',
              border: `1px solid ${result.ok ? 'rgba(74,222,128,0.22)' : 'rgba(239,68,68,0.18)'}`,
            }}
          >
            <div className={homeStyles.primaryActionGlow} aria-hidden="true" />
            <div className={homeStyles.primaryActionShine} aria-hidden="true" />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  background: result.ok
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.05))'
                    : 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(239,68,68,0.05))',
                  border: `2px solid ${result.ok ? 'rgba(74,222,128,0.42)' : 'rgba(239,68,68,0.35)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  boxShadow: `0 0 52px -18px ${result.ok ? 'rgba(74,222,128,0.55)' : 'rgba(239,68,68,0.45)'}`,
                }}
              >
                {result.ok ? (
                  <Check size={42} color="#4ade80" strokeWidth={2.2} />
                ) : (
                  <AlertCircle size={42} color="#f87171" strokeWidth={2.2} />
                )}
              </motion.div>

              <motion.div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(9, 9, 11, 0.58)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: result.ok ? '#ecfccb' : '#fecaca',
                  margin: '0 auto 14px',
                }}
              >
                {result.ok ? <Check size={12} /> : <AlertCircle size={12} />}
                {result.ok ? 'Заявка отправлена' : 'Нужна повторная отправка'}
              </motion.div>

              <div className={homeStyles.goldAccent} style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 'clamp(30px, 7vw, 40px)',
                fontWeight: 800,
                lineHeight: 1.04,
                textAlign: 'center',
                marginBottom: 12,
              }}>
                {title}
              </div>

              <div style={{
                fontSize: 15.5,
                lineHeight: 1.65,
                color: '#d4d4d8',
                textAlign: 'center',
                marginBottom: 16,
              }}>
                {lead}
              </div>

              {details && details !== lead && (
                <div className={homeStyles.heroProofRail}>
                  <div className={homeStyles.heroProofItem} style={{ alignItems: 'flex-start' }}>
                    <Tag size={15} color="#d4af37" style={{ marginTop: 1 }} />
                    <span style={{ lineHeight: 1.6 }}>{details}</span>
                  </div>
                  {promoUsed && savings > 0 && (
                    <div className={homeStyles.heroProofItem}>
                      <Tag size={15} color="#22c55e" />
                      Промокод {promoUsed.code} сэкономил {savings.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                {result.ok && result.id && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: promoUsed ? 0.35 : 0.25 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/order/${result.id}`)}
                    className={homeStyles.heroPrimaryButton}
                  >
                    <span>Открыть заказ</span>
                    <div className={homeStyles.primaryActionArrow}>
                      <ChevronRight size={18} color="#09090b" strokeWidth={2.6} />
                    </div>
                  </motion.button>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: promoUsed ? 0.45 : 0.35 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(result.ok ? '/orders' : '/')}
                  style={{
                    minHeight: 56,
                    padding: '0 18px',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-main)',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {result.ok ? 'Перейти в мои заказы' : 'Вернуться на главную'}
                </motion.button>
              </div>
            </div>
          </motion.section>

          {!result.ok && (
            <div
              style={{
                width: '100%',
                maxWidth: 420,
                marginTop: 14,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              Проверьте подключение и попробуйте ещё раз. Если ошибка повторится, можно написать в поддержку из профиля.
            </div>
          )}
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
        ref={scrollContainerRef}
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

        {/* Header — compact premium */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20 }}
        >
          {/* Top row: back + step counter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} color="var(--text-secondary)" />
            </motion.button>

            {/* Step dots + counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: totalSteps }, (_, index) => index + 1).map((s) => (
                  <motion.div
                    key={s}
                    animate={{
                      background: s <= step
                        ? 'linear-gradient(90deg, #d4af37, #f5d061)'
                        : 'rgba(255, 255, 255, 0.08)',
                      boxShadow: s === step ? '0 0 8px rgba(212, 175, 55, 0.4)' : 'none',
                    }}
                    style={{
                      width: s === step ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {step}/{totalSteps}
              </span>
            </div>
          </div>

          {/* Title row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-main)',
                fontFamily: "'Manrope', sans-serif",
                lineHeight: 1.2,
                marginBottom: 4,
              }}>
                {currentConfig?.title}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {currentConfig?.subtitle}
              </p>
            </div>

            {canShowModeSwitch && isFastMode && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => switchMode('full')}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Полная заявка
              </motion.button>
            )}
          </div>
        </motion.div>

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
//  DEADLINE STEP — v3 Clean Design
// ═══════════════════════════════════════════════════════════════════════════

const dlCardBorder = 'rgba(255, 255, 255, 0.08)'
const dlCardBg = 'rgba(255, 255, 255, 0.02)'
const dlGoldBorder = 'rgba(212, 175, 55, 0.30)'

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  isDark: boolean
}

function DeadlineStep({ selected, onSelect, isDark }: DeadlineStepProps) {
  void isDark

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Hint */}
      <div style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'rgba(255,255,255,0.38)',
        padding: '0 4px',
        marginBottom: 2,
      }}>
        Срочные варианты с наценкой, спокойные — без доплаты
      </div>

      {DEADLINES.map((dl, i) => {
        const isSel = selected === dl.value
        const meta = getDeadlineMeta(dl.value)

        return (
          <motion.button
            key={dl.value}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(dl.value)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: isSel ? 'rgba(212, 175, 55, 0.06)' : dlCardBg,
              border: `1px solid ${isSel ? dlGoldBorder : dlCardBorder}`,
              borderLeft: `3px solid ${dl.color}`,
              borderRadius: 16,
              cursor: 'pointer',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Left: label + description */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: isSel ? '#E8D5A3' : 'rgba(255,255,255,0.88)',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  {dl.label}
                </span>
                {meta.recommended && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(212, 175, 55, 0.70)',
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'rgba(212, 175, 55, 0.10)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    lineHeight: '14px',
                  }}>
                    оптимально
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 12,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.38)',
              }}>
                {meta.pace}
              </div>
            </div>

            {/* Right: multiplier badge */}
            <div style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: dl.multiplier === 'Базовая'
                  ? 'rgba(34,197,94,0.80)'
                  : `${dl.color}cc`,
                padding: '4px 10px',
                borderRadius: 999,
                background: dl.multiplier === 'Базовая'
                  ? 'rgba(34,197,94,0.10)'
                  : `${dl.color}15`,
                border: `1px solid ${dl.multiplier === 'Базовая' ? 'rgba(34,197,94,0.15)' : `${dl.color}25`}`,
              }}>
                {dl.multiplier === 'Базовая' ? '×1' : dl.multiplier}
              </span>

              {/* Check indicator */}
              {isSel && (
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: 'rgba(212, 175, 55, 0.18)',
                  border: '1px solid rgba(212, 175, 55, 0.30)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={13} color="#D4AF37" strokeWidth={2.5} />
                </div>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

function getDeadlineMeta(value: string) {
  switch (value) {
    case 'today':
      return { pace: 'Экстренный приоритет', recommended: false }
    case 'tomorrow':
      return { pace: 'Сдача на следующий день', recommended: false }
    case '3days':
      return { pace: 'Баланс скорости и качества', recommended: true }
    case 'week':
      return { pace: 'Комфортный темп', recommended: false }
    case '2weeks':
      return { pace: 'С запасом на правки', recommended: false }
    case 'month':
    default:
      return { pace: 'Без срочной надбавки', recommended: false }
  }
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
