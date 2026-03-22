import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, Check, ChevronRight, Clock, Tag, Sparkles
} from 'lucide-react'
import { UserData, WorkType, OrderCreateRequest } from '../types'
import { createOrder, uploadOrderFiles, FileUploadResponse } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { usePromo } from '../contexts/PromoContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { Confetti } from '../components/ui/Confetti'
import {
  ServiceTypeStep,
  RequirementsStep,
  DeadlineStep,
  EstimateCard,
  FloatingCtaDock,
  PromoWarningModal,
  useDrafts,
  SERVICE_TYPES,
  DEADLINES,
  WIZARD_STEPS,
  DRAFT_KEY,
} from '../components/order-wizard'
import { FastComposer } from '../components/order-wizard/FastComposer'
import { PhotoTaskComposer } from '../components/order-wizard/PhotoTaskComposer'
import { OtherComposer } from '../components/order-wizard/OtherComposer'
import homeStyles from './HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  CREATE ORDER PAGE — Premium Order Wizard
//  Версия 2.0: Отдельные компоненты шагов, drafts per service type,
//  исправленный scroll/keyboard, Telegram MainButton
// ═══════════════════════════════════════════════════════════════════════════

// Reduced motion support
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

// Animation
const slideVariants = prefersReducedMotion
  ? {
      enter: () => ({ opacity: 0 }),
      center: { opacity: 1 },
      exit: () => ({ opacity: 0 }),
    }
  : {
      enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
    }

const FAST_STEPS_GENERIC = [
  { num: 1, title: 'Быстрый запрос', subtitle: 'Опишите задачу — менеджер уточнит формат' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен ответ?' },
]

const FAST_STEPS_PHOTO = [
  { num: 1, title: 'Задача по фото', subtitle: 'Сфотографируйте или загрузите задание' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен ответ?' },
]

const FAST_STEPS_OTHER = [
  { num: 1, title: 'Ваша задача', subtitle: 'Расскажите, что нужно сделать' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен результат?' },
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
  const { activePromo, clearPromo, revalidatePromo, isValidating: isRevalidating } = usePromo()
  const safeBack = useSafeBackNavigation('/')

  // State for promo warning modal
  const [showPromoWarning, setShowPromoWarning] = useState(false)
  const [promoLostReason, setPromoLostReason] = useState<string | null>(null)

  // Check for prefill data from navigation state (Quick Reorder)
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill
  // First order flag from Welcome Tour completion
  const isFirstOrder = !!(location.state as { firstOrder?: boolean })?.firstOrder

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
  const fastStepConfig = preselectedType === 'photo_task'
    ? FAST_STEPS_PHOTO
    : preselectedType === 'other'
      ? FAST_STEPS_OTHER
      : FAST_STEPS_GENERIC
  const stepConfig = isFastMode ? fastStepConfig : WIZARD_STEPS

  // Form data - initialize with prefill values if available
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(preselectedType || (isFastMode ? 'other' : null))
  const [subject, setSubject] = useState(prefillData?.subject || '')
  const [topic, setTopic] = useState(prefillData?.topic || '')
  const [requirements, setRequirements] = useState(isUrgentMode ? 'СРОЧНО! ' : '')
  const [files, setFiles] = useState<File[]>([])
  const [deadline, setDeadline] = useState<string | null>(isUrgentMode ? 'today' : null)
  // Fast mode: single composer text replaces subject + topic + requirements
  const [composerText, setComposerText] = useState(isUrgentMode ? 'СРОЧНО! ' : '')
  // Photo task: separate comment field
  const [photoComment, setPhotoComment] = useState('')
  // Other: help category tag
  const [helpCategory, setHelpCategory] = useState('')
  // Other: structured description
  const [otherDescription, setOtherDescription] = useState('')

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
    isManual?: boolean
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

  // Combined effect: reset step on mode change + auto-advance for urgent mode
  useEffect(() => {
    setDirection(0)

    if (isFastMode) {
      setStep(1)
      setServiceTypeId(preselectedType || 'other')
      return
    }

    if (!preselectedType && !isReorder && serviceTypeId === 'other') {
      setServiceTypeId(null)
    }

    // Auto-advance to step 2 if type is pre-selected (urgent mode)
    if (preselectedType && isUrgentMode && !isFastMode) {
      setStep(2)
    } else {
      setStep(1)
    }
  }, [isFastMode, isReorder, preselectedType, isUrgentMode])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step, isFastMode])

  // ─────────────────────────────────────────────────────────────────────────
  //  VALIDATION & NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const selectedService = SERVICE_TYPES.find(s => s.id === serviceTypeId)
  const isExpressService = selectedService?.category === 'express'
  const canStep1Fast = preselectedType === 'photo_task'
    ? files.length > 0  // photo_task: at least 1 photo
    : preselectedType === 'other'
      ? (subject.trim().length >= 2 || otherDescription.trim().length >= 2 || files.length > 0) // other: subject or description or file
      : (composerText.trim().length >= 2 || files.length > 0)  // generic fast
  const canStep1 = isFastMode ? canStep1Fast : serviceTypeId !== null
  const canStep2 = isFastMode ? deadline !== null : (isExpressService ? true : subject.trim().length >= 2)
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

  const switchMode = useCallback((mode: 'full' | 'fast', serviceId?: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (mode === 'fast') {
      params.set('mode', 'fast')
      if (serviceId) {
        params.set('type', serviceId)
      }
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
    if (!serviceTypeId || !deadline) return
    if (!isFastMode && !isExpressService && !subject.trim()) return

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

      // In fast mode, map composer data to API fields
      let finalSubject = subject.trim()
      let finalTopic = topic.trim()
      let finalDescription = buildOrderDescription(requirements)

      if (isFastMode && preselectedType === 'photo_task') {
        // Photo task: subject from chips, comment as description
        finalSubject = subject.trim() || 'Задача по фото'
        finalTopic = ''
        finalDescription = photoComment.trim() || undefined
      } else if (isFastMode && preselectedType === 'other') {
        // Other: structured subject + description + category tag
        finalSubject = subject.trim() || 'Индивидуальный запрос'
        finalTopic = ''
        const parts: string[] = []
        if (helpCategory) parts.push(`[Категория: ${helpCategory}]`)
        if (otherDescription.trim()) parts.push(otherDescription.trim())
        finalDescription = parts.length > 0 ? parts.join('\n') : undefined
      } else if (isFastMode) {
        // Generic fast mode: first line → subject, rest → description
        const lines = composerText.trim().split('\n')
        finalSubject = lines[0]?.trim() || 'Быстрый запрос'
        finalTopic = ''
        finalDescription = lines.length > 1 ? lines.slice(1).join('\n').trim() : undefined
      }

      const data: OrderCreateRequest = {
        work_type: serviceTypeId as WorkType,
        subject: finalSubject || (isExpressService ? 'Не указан' : ''),
        topic: finalTopic || undefined,
        deadline,
        description: finalDescription,
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
          basePrice: basePrice || undefined,
          isManual: res.is_manual_required ?? false
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
  }, [serviceTypeId, deadline, subject, topic, requirements, composerText, photoComment, otherDescription, helpCategory, isFastMode, preselectedType, isExpressService, activePromo, revalidatePromo, haptic, hapticSuccess, hapticError, getBaseEstimate, clearPromo, clearAllDrafts, files])

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
      ? (result.isManual
          ? `Заказ #${result.id} создан. Сейчас проверяем вводные и готовим оценку от менеджера.`
          : `Заказ #${result.id} создан. Можете перейти к оплате.`)
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

              {promoUsed && savings > 0 && (
                <div className={homeStyles.heroProofRail}>
                  <div className={homeStyles.heroProofItem}>
                    <Tag size={15} color="#22c55e" />
                    Промокод {promoUsed.code} сэкономил {savings.toLocaleString('ru-RU')} ₽
                  </div>
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
        data-scroll-container="true"
        style={{
          flex: 1,
          padding: 24,
          paddingBottom: 120, // Space for sticky CTA
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}
      >
        {/* First Order Welcome Banner */}
        {isFirstOrder && !isReorder && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 14,
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={20} color="#050505" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#d4af37', marginBottom: 2 }}>
                Ваш первый заказ
              </div>
              <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                Выберите тип работы и заполните детали
              </div>
            </div>
          </motion.div>
        )}

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
              whileTap={{ scale: 0.97 }}
              onClick={goBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(12, 12, 10, 0.6)',
                backdropFilter: 'blur(16px) saturate(140%)',
                WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
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
                  <div
                    key={s}
                    style={{
                      width: s === step ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: s <= step
                        ? 'var(--gold-400)'
                        : 'rgba(255, 255, 255, 0.06)',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
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
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                marginBottom: 3,
              }}>
                {currentConfig?.title}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4, fontWeight: 500 }}>
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
              {isFastMode && preselectedType === 'photo_task' ? (
                <PhotoTaskComposer
                  files={files}
                  onFilesAdd={addFiles}
                  onFileRemove={removeFile}
                  comment={photoComment}
                  onCommentChange={setPhotoComment}
                  subject={subject}
                  onSubjectChange={setSubject}
                  disabled={submitting || isRevalidating}
                />
              ) : isFastMode && preselectedType === 'other' ? (
                <OtherComposer
                  description={otherDescription}
                  onDescriptionChange={setOtherDescription}
                  subject={subject}
                  onSubjectChange={setSubject}
                  helpCategory={helpCategory}
                  onHelpCategoryChange={setHelpCategory}
                  files={files}
                  onFilesAdd={addFiles}
                  onFileRemove={removeFile}
                  disabled={submitting || isRevalidating}
                />
              ) : isFastMode ? (
                <FastComposer
                  value={composerText}
                  onChange={setComposerText}
                  files={files}
                  onFilesAdd={addFiles}
                  onFileRemove={removeFile}
                  disabled={submitting || isRevalidating}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <ServiceTypeStep
                    selected={serviceTypeId}
                    onSelect={handleServiceTypeSelect}
                    onUrgentRequest={(serviceId) => switchMode('fast', serviceId)}
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
                basePrice={SERVICE_TYPES.find(s => s.id === serviceTypeId)?.priceNum}
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
      />

      {/* Confetti */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  )
}
