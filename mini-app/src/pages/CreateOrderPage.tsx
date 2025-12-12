import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, AlertCircle, Send, ChevronRight, Loader2,
  Tag, Clock, Zap, Flame, Rocket, Timer, Hourglass
} from 'lucide-react'
import { WorkType, OrderCreateRequest } from '../types'
import { createOrder } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'
import { usePromo } from '../contexts/PromoContext'
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

// Prefill data interface for Quick Reorder feature
interface PrefillData {
  work_type?: WorkType
  subject?: string
  deadline?: string
  topic?: string
}

export function CreateOrderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { isDark } = useTheme()
  const { activePromo, clearPromo, revalidatePromo, isValidating: isRevalidating } = usePromo()

  // State for promo warning modal
  const [showPromoWarning, setShowPromoWarning] = useState(false)
  const [promoLostReason, setPromoLostReason] = useState<string | null>(null)

  // Check for prefill data from navigation state (Quick Reorder)
  const prefillData = (location.state as { prefill?: PrefillData })?.prefill

  // Check for urgent/panic mode from URL params
  const isUrgentMode = searchParams.get('urgent') === 'true'
  const preselectedType = (prefillData?.work_type || searchParams.get('type')) as WorkType | null

  // Is this a reorder?
  const isReorder = !!prefillData

  // Wizard
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)

  // Form data - initialize with prefill values if available
  const [serviceTypeId, setServiceTypeId] = useState<string | null>(preselectedType)
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
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    msg: string
    id?: number
    promoUsed?: { code: string; discount: number } | null
    basePrice?: number
  } | null>(null)

  // Ref for Telegram MainButton
  const mainButtonCallbackRef = useRef<(() => void) | null>(null)

  // ─────────────────────────────────────────────────────────────────────────
  //  TELEGRAM MAINBUTTON INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.MainButton) return

    const canProceed = step === 1 ? serviceTypeId !== null
      : step === 2 ? subject.trim().length >= 2
      : step === 3 ? deadline !== null
      : false

    if (step === 4 || result) {
      tg.MainButton.hide()
      return
    }

    // Configure MainButton text based on step
    const buttonText = step === 3
      ? (submitting ? 'Отправка...' : 'Рассчитать стоимость')
      : step === 2
        ? 'Выбрать сроки'
        : 'Продолжить'

    tg.MainButton.setParams({
      text: buttonText,
      color: '#D4AF37',
      text_color: '#050505',
    })

    // Show/hide based on canProceed
    if (canProceed && !submitting) {
      tg.MainButton.show()
    } else {
      tg.MainButton.hide()
    }

    // Set up callback
    const handleMainButton = () => {
      if (step === 3) {
        handleSubmit()
      } else {
        goNext()
      }
    }

    // Remove old callback and add new one
    if (mainButtonCallbackRef.current) {
      tg.MainButton.offClick(mainButtonCallbackRef.current)
    }
    tg.MainButton.onClick(handleMainButton)
    mainButtonCallbackRef.current = handleMainButton

    return () => {
      if (mainButtonCallbackRef.current) {
        tg.MainButton.offClick(mainButtonCallbackRef.current)
      }
    }
  }, [step, serviceTypeId, subject, deadline, submitting, result])

  // Hide MainButton on unmount
  useEffect(() => {
    return () => {
      const tg = window.Telegram?.WebApp
      if (tg?.MainButton) {
        tg.MainButton.hide()
        if (mainButtonCallbackRef.current) {
          tg.MainButton.offClick(mainButtonCallbackRef.current)
        }
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

  // ─────────────────────────────────────────────────────────────────────────
  //  VALIDATION & NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const canStep1 = serviceTypeId !== null
  const canStep2 = subject.trim().length >= 2
  const canStep3 = deadline !== null
  const canProceed = step === 1 ? canStep1 : step === 2 ? canStep2 : canStep3

  const goNext = useCallback(() => {
    haptic('medium')
    setDirection(1)
    setStep((s) => Math.min(s + 1, 3))
  }, [haptic])

  const goBack = useCallback(() => {
    haptic('light')
    if (step === 1) navigate(-1)
    else {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [step, navigate, haptic])

  const handleServiceTypeSelect = useCallback((id: string) => {
    haptic('light')
    setServiceTypeId(id)
  }, [haptic])

  const handleDeadlineSelect = useCallback((value: string) => {
    haptic('light')
    setDeadline(value)
  }, [haptic])

  // Files
  const addFiles = useCallback((fileList: FileList) => {
    haptic('light')
    setFiles((prev) => [...prev, ...Array.from(fileList)])
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

  const getEstimate = useCallback(() => {
    const basePrice = getBaseEstimate()
    if (!basePrice) return null
    if (activePromo) {
      return Math.round(basePrice * (1 - activePromo.discount / 100))
    }
    return basePrice
  }, [getBaseEstimate, activePromo])

  // ─────────────────────────────────────────────────────────────────────────
  //  SUBMIT
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (forceWithoutPromo: boolean = false) => {
    if (!serviceTypeId || !deadline || !subject.trim()) return

    haptic('heavy')
    setSubmitting(true)

    try {
      let promoToUse = activePromo?.code
      if (activePromo && !forceWithoutPromo) {
        const promoStillValid = await revalidatePromo()
        if (!promoStillValid) {
          setSubmitting(false)
          setPromoLostReason('Промокод больше не действителен')
          setShowPromoWarning(true)
          hapticError()
          return
        }
      }

      if (forceWithoutPromo === true) {
        promoToUse = undefined
      }

      const data: OrderCreateRequest = {
        work_type: serviceTypeId as WorkType,
        subject: subject.trim(),
        topic: topic.trim() || undefined,
        deadline,
        description: requirements.trim() || undefined,
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

        setResult({
          ok: true,
          msg: finalMsg,
          id: res.order_id,
          promoUsed: actualPromoUsed,
          basePrice: basePrice || undefined
        })
      } else {
        hapticError()
        const errorMsg = typeof res.message === 'string'
          ? res.message
          : (typeof res.message === 'object' ? JSON.stringify(res.message) : 'Произошла ошибка')
        setResult({ ok: false, msg: errorMsg })
      }
    } catch (err) {
      hapticError()
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
      setResult({ ok: false, msg: errorMessage })
    } finally {
      setSubmitting(false)
      setStep(4)
    }
  }, [serviceTypeId, deadline, subject, topic, requirements, activePromo, revalidatePromo, haptic, hapticSuccess, hapticError, getBaseEstimate, clearPromo, clearAllDrafts])

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
      ? Math.round(basePrice * (promoUsed.discount / 100))
      : 0

    return (
      <div style={{ padding: 24, paddingBottom: 100, minHeight: '100vh', background: 'var(--bg-main)' }}>
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
            {result.ok ? 'Заказ создан!' : 'Ошибка'}
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
              onClick={() => navigate('/')}
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
              На главную
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIZARD
  // ─────────────────────────────────────────────────────────────────────────

  const currentConfig = WIZARD_STEPS[step - 1]
  const estimate = getEstimate()

  return (
    <div style={{
      minHeight: '100vh',
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
          </div>

          <div style={{
            padding: '10px 16px',
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid var(--border-gold)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--gold-400)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {step}/3
          </div>
        </motion.div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map((s) => (
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
              <ServiceTypeStep
                selected={serviceTypeId}
                onSelect={handleServiceTypeSelect}
              />
            </motion.div>
          )}

          {step === 2 && (
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

          {step === 3 && (
            <motion.div
              key="s3"
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ marginTop: 20 }}
              >
                <PromoCodeSection
                  variant="inline"
                  basePrice={getBaseEstimate() || undefined}
                />
              </motion.div>

              {/* Estimate Card */}
              {estimate && (
                <EstimateCard
                  estimate={estimate}
                  baseEstimate={getBaseEstimate()}
                  activePromo={activePromo}
                  isDark={isDark}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating CTA Dock (Fallback when MainButton not available) */}
      <FloatingCtaDock
        step={step}
        canProceed={canProceed}
        submitting={submitting}
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
  const getIcon = () => {
    if (config.urgency >= 85) return Flame
    if (config.urgency >= 60) return Rocket
    if (config.urgency >= 40) return Zap
    if (config.urgency >= 20) return Timer
    return Hourglass
  }
  const Icon = getIcon()

  const theme = {
    cardBg: isDark ? 'rgba(18, 18, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    cardBgSelected: isDark
      ? `linear-gradient(135deg, ${config.color}15 0%, ${config.color}08 100%)`
      : `linear-gradient(135deg, ${config.color}12 0%, ${config.color}05 100%)`,
    border: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(120, 85, 40, 0.08)',
    borderSelected: isDark ? `${config.color}60` : `${config.color}50`,
    text: isDark ? '#f2f2f2' : '#18181b',
    textSecondary: isDark ? '#a1a1aa' : '#52525b',
    barBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    iconBg: isDark ? `${config.color}18` : `${config.color}12`,
    iconBorder: isDark ? `${config.color}35` : `${config.color}25`,
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '16px 18px',
        background: selected ? theme.cardBgSelected : theme.cardBg,
        border: `2px solid ${selected ? theme.borderSelected : theme.border}`,
        borderRadius: 18,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: theme.iconBg,
          border: `1.5px solid ${theme.iconBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          size={24}
          color={config.color}
          strokeWidth={selected ? 2.5 : 2}
          style={{ filter: selected ? `drop-shadow(0 0 8px ${config.color}60)` : 'none' }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: selected ? 700 : 600, color: selected ? theme.text : theme.textSecondary }}>
            {config.label}
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 800,
            color: config.color,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {config.multiplier}
          </span>
        </div>

        {/* Urgency bar */}
        <div style={{ height: 6, background: theme.barBg, borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${config.urgency}%` }}
            transition={{ delay: index * 0.06 + 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${config.color}cc, ${config.color})`,
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #f5d061, #d4af37, #b48e26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={16} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ESTIMATE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface EstimateCardProps {
  estimate: number
  baseEstimate: number | null
  activePromo: { code: string; discount: number } | null
  isDark: boolean
}

function EstimateCard({ estimate, baseEstimate, activePromo, isDark }: EstimateCardProps) {
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
          {activePromo && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'block', marginTop: 2 }}>
              С промокодом {activePromo.discount}%
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {activePromo && baseEstimate && (
            <div style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              textDecoration: 'line-through',
              marginBottom: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {baseEstimate.toLocaleString('ru-RU')} ₽
            </div>
          )}
          <motion.span
            key={estimate}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: activePromo ? '#22c55e' : (isDark ? '#d4af37' : '#9e7a1a'),
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {estimate.toLocaleString('ru-RU')} ₽
          </motion.span>
          {activePromo && (
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
              <Tag size={12} />
              {activePromo.code} −{activePromo.discount}%
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
  canProceed: boolean
  submitting: boolean
  isRevalidating: boolean
  onNext: () => void
  onSubmit: () => void
  selectedServiceLabel?: string
}

function FloatingCtaDock({
  step,
  canProceed,
  submitting,
  isRevalidating,
  onNext,
  onSubmit,
  selectedServiceLabel,
}: FloatingCtaDockProps) {
  // Check if Telegram MainButton is available
  const hasTelegramMainButton = !!window.Telegram?.WebApp?.MainButton

  // Don't render if Telegram MainButton is available
  if (hasTelegramMainButton) return null

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
            onClick={step === 3 ? onSubmit : onNext}
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
            {step === 1 && selectedServiceLabel && (
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
                ? (isRevalidating ? 'Проверка...' : 'Отправка...')
                : step === 3
                  ? 'Рассчитать'
                  : step === 2
                    ? 'Выбрать сроки'
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
              ) : step === 3 ? (
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
