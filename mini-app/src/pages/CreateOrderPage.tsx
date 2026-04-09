import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Clock, Sparkles
} from 'lucide-react'
import { UserData, WorkType, OrderCreateRequest } from '../types'
import { createOrder, uploadOrderFiles, FileUploadResponse } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { usePromo } from '../contexts/PromoContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { Confetti } from '../components/ui/Confetti'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import s from './CreateOrderPage.module.css'
import {
  ServiceTypeStep,
  RequirementsStep,
  DeadlineStep,
  EstimateCard,
  FloatingCtaDock,
  PromoWarningModal,
  SuccessScreen,
  useDrafts,
  SERVICE_TYPES,
  DEADLINES,
  WIZARD_STEPS,
  DRAFT_KEY,
} from '../components/order-wizard'
import { FastComposer } from '../components/order-wizard/FastComposer'
import { AuroraBackground } from '../components/order-wizard/AuroraBackground'
import { PhotoTaskComposer } from '../components/order-wizard/PhotoTaskComposer'
import { OtherComposer } from '../components/order-wizard/OtherComposer'
// homeStyles moved to SuccessScreen component

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
      enter: (dir: number) => ({
        x: dir > 0 ? 40 : -40,
        opacity: 0,
        scale: 0.985,
        filter: 'blur(2px)',
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
      },
      exit: (dir: number) => ({
        x: dir < 0 ? 40 : -40,
        opacity: 0,
        scale: 0.985,
        filter: 'blur(2px)',
      }),
    }

const FAST_STEPS_GENERIC = [
  { num: 1, title: 'Опиши задачу', subtitle: 'Формат уточним после заявки' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен результат?' },
]

const FAST_STEPS_PHOTO = [
  { num: 1, title: 'Задание по фото', subtitle: 'Загрузите фото или файл с условием' },
  { num: 2, title: 'Срок', subtitle: 'Когда нужен результат?' },
]

const FAST_STEPS_OTHER = [
  { num: 1, title: 'Ваша задача', subtitle: 'Коротко опишите, что нужно сделать' },
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

  // Wizard — skip step 1 if type is pre-selected from carousel/reorder
  const [step, setStep] = useState(preselectedType && !isFastMode ? 2 : 1)
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
  const { drafts, saveDraft, loadDraft, clearAllDrafts, hasDraft } = useDrafts({
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
  }, [serviceTypeId, isReorder, loadDraft, haptic])

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
  }, [haptic, isReorder, isUrgentMode])

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
  }, [isFastMode, isReorder, preselectedType, isUrgentMode, serviceTypeId])

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
    // Choreographed step transition: haptic + rising whoosh
    haptic('medium')
    setTimeout(() => {
      try {
        const tg = (window as any).Telegram // eslint-disable-line @typescript-eslint/no-explicit-any
        tg?.WebApp?.HapticFeedback?.impactOccurred?.('soft')
      } catch { /* noop */ }
    }, 50)
    // Rising sine sweep (step_forward sound)
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.18)
        setTimeout(() => ctx.close().catch(() => {}), 250)
      }
    } catch { /* audio optional */ }
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
    const selectedService = SERVICE_TYPES.find((s) => s.id === serviceTypeId)
    const selectedDeadline = DEADLINES.find((d) => d.value === deadline)
    return (
      <>
        <Confetti
          active={showConfetti}
          onComplete={() => setShowConfetti(false)}
          intensity="low"
          colors={['#d4af37', '#f5d061', '#b38728', '#FCF6BA', '#fff']}
          duration={3000}
        />
        <SuccessScreen
          result={result}
          loyaltyDiscount={loyaltyDiscount}
          serviceLabel={selectedService?.label}
          subject={subject || undefined}
          deadlineLabel={selectedDeadline?.label}
          finalEstimate={getEstimate()}
          baseEstimate={getBaseEstimate()}
        />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIZARD
  // ─────────────────────────────────────────────────────────────────────────

  const currentConfig = stepConfig[step - 1]
  const estimate = getEstimate()
  const selectedServiceLabel = SERVICE_TYPES.find((service) => service.id === serviceTypeId)?.label
  const selectedDeadlineLabel = DEADLINES.find((item) => item.value === deadline)?.label
  const headerContext = (() => {
    if (isReorder) {
      return {
        icon: Check,
        title: 'Повторный заказ',
        detail: 'Основные данные уже подставлены',
      }
    }

    if (hasDraft && step === 2 && !isReorder) {
      return {
        icon: Clock,
        title: 'Черновик восстановлен',
        detail: 'Можно продолжить с этого шага',
      }
    }

    if (isFirstOrder && step === 1 && !isReorder) {
      return {
        icon: Sparkles,
        title: 'Первый заказ',
        detail: 'Маршрут займёт всего несколько шагов',
      }
    }

    return null
  })()

  return (
    <div className={`${s.page} saloon-page-shell saloon-page-shell--workflow`}>
      <div className="page-background" aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>
      {/* Aurora ambient background */}
      <AuroraBackground />

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        data-scroll-container="true"
        className={s.scrollArea}
      >
        <div className={s.column}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className={s.header}
          >
            <div className={s.topBar}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={goBack}
                className={s.backButton}
              >
                <ArrowLeft size={18} color="var(--text-secondary)" />
              </motion.button>

              <div className={s.progressMeta}>
                <div className={s.progressDots}>
                  {Array.from({ length: totalSteps }, (_, index) => index + 1).map((progressStep) => (
                    <div
                      key={progressStep}
                      className={[
                        s.progressDot,
                        progressStep === step ? s.progressDotActive : '',
                        progressStep < step ? s.progressDotPassed : '',
                      ].filter(Boolean).join(' ')}
                    />
                  ))}
                </div>
                <span className={s.stepCounter}>
                  {step}/{totalSteps}
                </span>
              </div>
            </div>

            {headerContext && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={s.contextChip}
              >
                <div className={s.contextIcon}>
                  <headerContext.icon size={14} />
                </div>
                <div className={s.contextText}>
                  <div className={s.contextTitle}>{headerContext.title}</div>
                  <div className={s.contextDetail}>{headerContext.detail}</div>
                </div>
              </motion.div>
            )}

            <div className={s.titleRow}>
              <div className={s.titleCopy}>
                <h1 className={s.title}>{currentConfig?.title}</h1>
                <p className={s.subtitle}>{currentConfig?.subtitle}</p>
              </div>

              {canShowModeSwitch && isFastMode && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => switchMode('full')}
                  className={s.modeButton}
                >
                  Полная заявка
                </motion.button>
              )}
            </div>

            <div className={s.heroMeta}>
              {selectedServiceLabel ? (
                <div className={s.heroChip}>{selectedServiceLabel}</div>
              ) : null}
              {selectedDeadlineLabel ? (
                <div className={s.heroChip}>{selectedDeadlineLabel}</div>
              ) : null}
              {files.length > 0 ? (
                <div className={s.heroChip}>{files.length} файлов</div>
              ) : null}
              {estimate ? (
                <div className={`${s.heroChip} ${s.heroChipAccent}`}>~ {estimate.toLocaleString('ru-RU')} ₽</div>
              ) : null}
            </div>
          </motion.div>

          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="s1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
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
                      draftInfo={(() => {
                        if (serviceTypeId) return null
                        const entries = Object.entries(drafts).filter(([, d]) => d && d.timestamp > Date.now() - 86400000)
                        if (entries.length === 0) return null
                        const [draftId, draft] = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)[0]
                        const svc = SERVICE_TYPES.find(s => s.id === draftId)
                        if (!svc) return null
                        const mins = Math.round((Date.now() - draft.timestamp) / 60000)
                        const timeAgo = mins < 60 ? `${mins} мин назад` : mins < 1440 ? `${Math.round(mins / 60)} ч назад` : 'вчера'
                        return { serviceTypeId: draftId, serviceLabel: svc.label, timeAgo }
                      })()}
                      onContinueDraft={(id) => { handleServiceTypeSelect(id) }}
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
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
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
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
              >
                <DeadlineStep
                  selected={deadline}
                  onSelect={handleDeadlineSelect}
                  basePrice={SERVICE_TYPES.find(serviceItem => serviceItem.id === serviceTypeId)?.priceNum}
                />

                {!isFastMode && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      style={{ marginTop: 22 }}
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
