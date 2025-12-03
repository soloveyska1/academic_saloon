import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, FileText, BookOpen, Scroll, PenTool,
  ClipboardCheck, Presentation, Briefcase, Sparkles, Camera,
  Calendar, Clock, Zap, Flame, ChevronRight, Check, ArrowLeft,
  Send, AlertCircle
} from 'lucide-react'
import { WorkType, WorkTypeOption, DeadlineOption, OrderCreateRequest } from '../types'
import { createOrder } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const WORK_TYPES: WorkTypeOption[] = [
  { value: 'diploma', label: 'Диплом', emoji: '🎓', price: 'от 34 900₽' },
  { value: 'coursework', label: 'Курсовая', emoji: '📚', price: 'от 11 900₽' },
  { value: 'essay', label: 'Эссе', emoji: '📝', price: 'от 1 400₽' },
  { value: 'report', label: 'Реферат', emoji: '📄', price: 'от 900₽' },
  { value: 'control', label: 'Контрольная', emoji: '✏️', price: 'от 1 400₽' },
  { value: 'presentation', label: 'Презентация', emoji: '📊', price: 'от 1 900₽' },
  { value: 'practice', label: 'Практика', emoji: '🏢', price: 'от 4 900₽' },
  { value: 'independent', label: 'Самостоятельная', emoji: '📖', price: 'от 2 400₽' },
  { value: 'masters', label: 'Магистерская', emoji: '🎩', price: 'от 44 900₽' },
  { value: 'other', label: 'Другое', emoji: '🦄', price: 'индивидуально' },
]

const WORK_TYPE_ICONS: Record<WorkType, typeof FileText> = {
  diploma: GraduationCap,
  coursework: BookOpen,
  essay: PenTool,
  report: FileText,
  control: ClipboardCheck,
  presentation: Presentation,
  practice: Briefcase,
  independent: Scroll,
  masters: GraduationCap,
  other: Sparkles,
  photo_task: Camera,
}

const DEADLINES: DeadlineOption[] = [
  { value: 'today', label: 'Сегодня', multiplier: 'x2.0' },
  { value: 'tomorrow', label: 'Завтра', multiplier: 'x1.7' },
  { value: '3_days', label: '2-3 дня', multiplier: 'x1.4' },
  { value: 'week', label: 'Неделя', multiplier: 'x1.2' },
  { value: '2_weeks', label: '2 недели', multiplier: 'x1.1' },
  { value: 'month', label: 'Месяц+', multiplier: 'x1.0' },
]

const DEADLINE_ICONS: Record<string, typeof Clock> = {
  today: Flame,
  tomorrow: Zap,
  '3_days': Clock,
  week: Calendar,
  '2_weeks': Calendar,
  month: Calendar,
}

const STEP_TITLES = [
  { title: 'Тип работы', subtitle: 'Что нужно сделать?' },
  { title: 'Детали', subtitle: 'Расскажите подробнее' },
  { title: 'Сроки', subtitle: 'Когда нужно сдать?' },
]

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORK TYPE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface WorkTypeCardProps {
  type: WorkTypeOption
  selected: boolean
  onSelect: () => void
  index: number
}

function WorkTypeCard({ type, selected, onSelect, index }: WorkTypeCardProps) {
  const Icon = WORK_TYPE_ICONS[type.value] || FileText

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect()
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '18px 12px',
        minHeight: 110,
        background: selected
          ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.06) 100%)'
          : 'rgba(20, 20, 23, 0.85)',
        border: selected
          ? '2px solid rgba(212, 175, 55, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 25px -5px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 4px 20px -10px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Gold glow background when selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            inset: -20,
            background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon container */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: selected
            ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.1))'
            : 'rgba(255, 255, 255, 0.04)',
          border: selected
            ? '1px solid rgba(212, 175, 55, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Icon size={22} color={selected ? '#e6c547' : '#71717a'} strokeWidth={1.8} />
      </div>

      {/* Text content */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: selected ? '#f2f2f2' : '#a1a1aa',
            marginBottom: 3,
          }}
        >
          {type.label}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: selected ? '#e6c547' : '#71717a',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {type.price}
        </div>
      </div>

      {/* Selection checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e6c547, #b48e26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
            }}
          >
            <Check size={12} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEADLINE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DeadlineCardProps {
  deadline: DeadlineOption
  selected: boolean
  onSelect: () => void
  index: number
}

function DeadlineCard({ deadline, selected, onSelect, index }: DeadlineCardProps) {
  const Icon = DEADLINE_ICONS[deadline.value] || Calendar
  const isUrgent = ['today', 'tomorrow'].includes(deadline.value)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect()
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '16px 12px',
        minHeight: 100,
        background: selected
          ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.06) 100%)'
          : 'rgba(20, 20, 23, 0.85)',
        border: selected
          ? '2px solid rgba(212, 175, 55, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 25px -5px rgba(212, 175, 55, 0.4)'
          : '0 4px 20px -10px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Urgent indicator */}
      {isUrgent && !selected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: deadline.value === 'today' ? '#ef4444' : '#eab308',
            boxShadow: `0 0 8px ${deadline.value === 'today' ? '#ef4444' : '#eab308'}`,
          }}
        />
      )}

      {/* Gold glow when selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: -20,
            background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: selected
            ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.1))'
            : 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Icon
          size={20}
          color={selected ? '#e6c547' : isUrgent ? (deadline.value === 'today' ? '#ef4444' : '#eab308') : '#71717a'}
          strokeWidth={1.8}
        />
      </div>

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#f2f2f2' : '#a1a1aa' }}>
          {deadline.label}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: selected ? '#e6c547' : isUrgent ? (deadline.value === 'today' ? '#ef4444' : '#eab308') : '#71717a',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {deadline.multiplier}
        </div>
      </div>

      {/* Selection checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e6c547, #b48e26)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={10} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PremiumInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  multiline?: boolean
  required?: boolean
}

function PremiumInput({ label, value, onChange, placeholder, multiline, required }: PremiumInputProps) {
  const [focused, setFocused] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15,
    color: '#f2f2f2',
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${focused ? '#d4af37' : 'rgba(113, 113, 122, 0.5)'}`,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    resize: 'none' as const,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 28 }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color: focused ? '#d4af37' : '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 10,
          transition: 'color 0.2s ease',
        }}
      >
        {label}
        {required && <span style={{ color: '#d4af37' }}>*</span>}
      </label>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={4}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
        />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface FloatingButtonProps {
  onClick: () => void
  disabled: boolean
  loading?: boolean
  label: string
  icon?: React.ReactNode
}

function FloatingButton({ onClick, disabled, loading, label, icon }: FloatingButtonProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 100, // Above the navigation bar (90px + padding)
        left: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <motion.button
        type="button"
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '18px 24px',
          fontFamily: "'Playfair Display', serif",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: disabled ? '#71717a' : '#050505',
          background: disabled
            ? 'rgba(255, 255, 255, 0.08)'
            : 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #b48e26 100%)',
          border: 'none',
          borderRadius: 16,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled
            ? 'none'
            : '0 0 40px -8px rgba(212, 175, 55, 0.6), 0 10px 25px -10px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Clock size={20} />
            </motion.div>
            Отправка...
          </>
        ) : (
          <>
            {label}
            {icon}
          </>
        )}
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CREATE ORDER PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function CreateOrderPage() {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError } = useTelegram()

  // Wizard state
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)

  // Form data
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; orderId?: number } | null>(null)

  // Validation
  const canProceedStep1 = selectedWorkType !== null
  const canProceedStep2 = subject.trim().length >= 2
  const canProceedStep3 = selectedDeadline !== null

  // Handlers
  const handleWorkTypeSelect = (type: WorkType) => {
    haptic('light')
    setSelectedWorkType(type)
  }

  const handleDeadlineSelect = (deadline: string) => {
    haptic('light')
    setSelectedDeadline(deadline)
  }

  const goToNextStep = () => {
    haptic('medium')
    setDirection(1)
    setStep((s) => Math.min(s + 1, 3))
  }

  const goToPrevStep = () => {
    haptic('light')
    if (step === 1) {
      navigate(-1)
    } else {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }

  const handleSubmit = async () => {
    if (!selectedWorkType || !selectedDeadline || !subject.trim()) return

    haptic('heavy')
    setIsSubmitting(true)

    const orderData: OrderCreateRequest = {
      work_type: selectedWorkType,
      subject: subject.trim(),
      topic: topic.trim() || undefined,
      deadline: selectedDeadline,
      description: description.trim() || undefined,
    }

    try {
      const response = await createOrder(orderData)

      if (response.success) {
        hapticSuccess()
        setResult({
          success: true,
          message: response.message,
          orderId: response.order_id,
        })
      } else {
        hapticError()
        setResult({
          success: false,
          message: response.message,
        })
      }
    } catch {
      hapticError()
      setResult({
        success: false,
        message: 'Произошла ошибка. Попробуйте позже.',
      })
    } finally {
      setIsSubmitting(false)
      setStep(4) // Result step
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RESULT SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 4 && result) {
    return (
      <div style={{ padding: 20, paddingBottom: 180, minHeight: '100vh' }}>
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
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: result.success
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.08))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.08))',
              border: result.success
                ? '2px solid rgba(34, 197, 94, 0.5)'
                : '2px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              boxShadow: result.success
                ? '0 0 50px -10px rgba(34, 197, 94, 0.5)'
                : '0 0 50px -10px rgba(239, 68, 68, 0.5)',
            }}
          >
            {result.success ? (
              <Check size={45} color="#22c55e" strokeWidth={2.5} />
            ) : (
              <AlertCircle size={45} color="#ef4444" strokeWidth={2} />
            )}
          </motion.div>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 700,
              marginBottom: 14,
              color: result.success ? '#f2f2f2' : '#ef4444',
            }}
          >
            {result.success ? 'Заказ создан!' : 'Ошибка'}
          </h2>

          <p
            style={{
              fontSize: 15,
              color: '#a1a1aa',
              marginBottom: 40,
              maxWidth: 300,
              lineHeight: 1.5,
            }}
          >
            {result.message}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
            {result.success && result.orderId && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/order/${result.orderId}`)}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#050505',
                  background: 'linear-gradient(180deg, #f5d061, #d4af37, #b48e26)',
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                  boxShadow: '0 0 30px -8px rgba(212, 175, 55, 0.5)',
                }}
              >
                Открыть заказ
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: 15,
                fontWeight: 600,
                color: '#a1a1aa',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  MAIN WIZARD UI
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      padding: 20,
      paddingBottom: 200, // Critical: Space for floating button + navigation
      minHeight: '100vh',
      background: 'var(--bg-void)',
    }}>
      {/* Header with back button */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={goToPrevStep}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="#a1a1aa" />
        </motion.button>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f5d061, #d4af37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 4,
            }}
          >
            {STEP_TITLES[step - 1]?.title || 'Новый заказ'}
          </h1>
          <p style={{ fontSize: 13, color: '#71717a' }}>
            {STEP_TITLES[step - 1]?.subtitle || ''}
          </p>
        </div>

        {/* Step counter */}
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            color: '#d4af37',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {step}/3
        </div>
      </motion.div>

      {/* Progress bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 28,
        }}
      >
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            animate={{
              background: s <= step
                ? 'linear-gradient(90deg, #d4af37, #f5d061)'
                : 'rgba(255, 255, 255, 0.08)',
              boxShadow: s <= step ? '0 0 12px rgba(212, 175, 55, 0.5)' : 'none',
            }}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      {/* Step content with animations */}
      <AnimatePresence mode="wait" custom={direction}>
        {/* STEP 1: Work Type Selection */}
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {WORK_TYPES.map((type, index) => (
                <WorkTypeCard
                  key={type.value}
                  type={type}
                  selected={selectedWorkType === type.value}
                  onSelect={() => handleWorkTypeSelect(type.value)}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Order Details */}
        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <PremiumInput
              label="Предмет / Дисциплина"
              value={subject}
              onChange={setSubject}
              placeholder="Математический анализ"
              required
            />

            <PremiumInput
              label="Тема работы"
              value={topic}
              onChange={setTopic}
              placeholder="Исследование пределов функций"
            />

            <PremiumInput
              label="Дополнительные требования"
              value={description}
              onChange={setDescription}
              placeholder="Методичка, особые требования, объём страниц..."
              multiline
            />

            {/* Info notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                padding: 16,
                background: 'rgba(212, 175, 55, 0.06)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: 14,
              }}
            >
              <p style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
                <span style={{ color: '#d4af37' }}>Файлы</span> можно будет прикрепить после создания заказа
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: Deadline Selection */}
        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {DEADLINES.map((deadline, index) => (
                <DeadlineCard
                  key={deadline.value}
                  deadline={deadline}
                  selected={selectedDeadline === deadline.value}
                  onSelect={() => handleDeadlineSelect(deadline.value)}
                  index={index}
                />
              ))}
            </div>

            {/* Pricing notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                padding: 16,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 14,
              }}
            >
              <p style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
                <span style={{ color: '#ef4444' }}>Срочность</span> влияет на стоимость. Множитель применяется к базовой цене.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {step === 1 && (
          <FloatingButton
            onClick={goToNextStep}
            disabled={!canProceedStep1}
            label="Продолжить"
            icon={<ChevronRight size={22} />}
          />
        )}

        {step === 2 && (
          <FloatingButton
            onClick={goToNextStep}
            disabled={!canProceedStep2}
            label="Выбрать сроки"
            icon={<ChevronRight size={22} />}
          />
        )}

        {step === 3 && (
          <FloatingButton
            onClick={handleSubmit}
            disabled={!canProceedStep3}
            loading={isSubmitting}
            label="Рассчитать стоимость"
            icon={<Send size={20} />}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
