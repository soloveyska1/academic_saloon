import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, FileText, BookOpen, Scroll, PenTool, FileSpreadsheet,
  ClipboardCheck, Presentation, Briefcase, Sparkles, Camera,
  Calendar, Clock, Zap, Flame, ChevronRight, Check, ArrowLeft, Send
} from 'lucide-react'
import { WorkType, WorkTypeOption, DeadlineOption, OrderCreateRequest } from '../types'
import { createOrder } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  WORK TYPE OPTIONS
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

// ═══════════════════════════════════════════════════════════════════════════
//  DEADLINE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

const DEADLINES: DeadlineOption[] = [
  { value: 'today', label: 'Сегодня', multiplier: 'x2.0' },
  { value: 'tomorrow', label: 'Завтра', multiplier: 'x1.7' },
  { value: '3_days', label: '2-3 дня', multiplier: 'x1.4' },
  { value: 'week', label: 'Неделя', multiplier: 'x1.2' },
  { value: '2_weeks', label: '2 недели', multiplier: 'x1.1' },
  { value: 'month', label: 'Месяц', multiplier: 'x1.0' },
]

const DEADLINE_ICONS: Record<string, typeof Clock> = {
  today: Flame,
  tomorrow: Zap,
  '3_days': Clock,
  week: Calendar,
  '2_weeks': Calendar,
  month: Calendar,
}

// ═══════════════════════════════════════════════════════════════════════════
//  SELECTION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SelectionCardProps {
  selected: boolean
  onClick: () => void
  icon: typeof FileText
  label: string
  sublabel?: string
  delay?: number
}

function SelectionCard({ selected, onClick, icon: Icon, label, sublabel, delay = 0 }: SelectionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        minHeight: 90,
        background: selected
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
          : 'rgba(20, 20, 23, 0.7)',
        border: selected
          ? '1px solid rgba(212, 175, 55, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: selected
          ? '0 0 20px -5px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 4px 20px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: selected
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))'
          : 'rgba(255, 255, 255, 0.03)',
        border: selected
          ? '1px solid rgba(212, 175, 55, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <Icon size={18} color={selected ? '#d4af37' : '#71717a'} />
      </div>

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{
            fontSize: 9,
            color: selected ? 'var(--gold-400)' : 'var(--text-muted)',
            marginTop: 2,
          }}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Check indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4af37, #b48e26)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={10} color="#050505" strokeWidth={3} />
        </motion.div>
      )}
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

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 600,
        color: focused ? 'var(--gold-400)' : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom: 8,
        transition: 'color 0.2s ease',
      }}>
        {label} {required && <span style={{ color: 'var(--gold-400)' }}>*</span>}
      </label>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          style={{
            width: '100%',
            padding: '14px 0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            borderBottom: focused
              ? '1px solid var(--gold-400)'
              : '1px solid var(--text-muted)',
            outline: 'none',
            resize: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '14px 0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            borderBottom: focused
              ? '1px solid var(--gold-400)'
              : '1px solid var(--text-muted)',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CREATE ORDER PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function CreateOrderPage() {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError } = useTelegram()

  // Form state
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null)
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')

  // UI state
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; orderId?: number } | null>(null)

  const handleWorkTypeSelect = (type: WorkType) => {
    haptic('light')
    setSelectedWorkType(type)
  }

  const handleDeadlineSelect = (deadline: string) => {
    haptic('light')
    setSelectedDeadline(deadline)
  }

  const handleNextStep = () => {
    haptic('medium')
    setStep(step + 1)
  }

  const handleBack = () => {
    haptic('light')
    if (step > 1) {
      setStep(step - 1)
    } else {
      navigate(-1)
    }
  }

  const canProceedStep1 = selectedWorkType !== null
  const canProceedStep2 = selectedDeadline !== null
  const canProceedStep3 = subject.trim().length > 0

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
      setStep(4)
    }
  }

  // Result screen
  if (step === 4 && result) {
    return (
      <div className="app-content" style={{ paddingBottom: 110 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: result.success
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
              border: result.success
                ? '2px solid rgba(34, 197, 94, 0.5)'
                : '2px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: result.success
                ? '0 0 40px -10px rgba(34, 197, 94, 0.4)'
                : '0 0 40px -10px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Check size={40} color={result.success ? '#22c55e' : '#ef4444'} />
          </motion.div>

          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 12,
            color: result.success ? 'var(--text-primary)' : '#ef4444',
          }}>
            {result.success ? 'Заказ создан!' : 'Ошибка'}
          </h2>

          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 32,
            maxWidth: 280,
          }}>
            {result.message}
          </p>

          <div style={{ display: 'flex', gap: 12, flexDirection: 'column', width: '100%', maxWidth: 280 }}>
            {result.success && result.orderId && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/order/${result.orderId}`)}
                className="btn-gold"
                style={{ width: '100%' }}
              >
                Открыть заказ
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="btn-ghost"
              style={{ width: '100%' }}
            >
              На главную
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="app-content" style={{ paddingBottom: 140 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </motion.button>

        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--gold-200), var(--gold-400))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Новый Заказ
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Заполните детали, и шериф найдёт исполнителя
          </p>
        </div>
      </motion.div>

      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 24,
          marginTop: 16,
        }}
      >
        {[1, 2, 3].map((s) => (
          <motion.div
            key={s}
            animate={{
              background: s <= step
                ? 'linear-gradient(90deg, #d4af37, #f5d061)'
                : 'rgba(255, 255, 255, 0.1)',
            }}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              boxShadow: s <= step ? '0 0 10px rgba(212, 175, 55, 0.4)' : 'none',
            }}
          />
        ))}
      </motion.div>

      {/* Step 1: Work Type Selection */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}>
              Выберите тип работы
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {WORK_TYPES.map((type, index) => (
                <SelectionCard
                  key={type.value}
                  selected={selectedWorkType === type.value}
                  onClick={() => handleWorkTypeSelect(type.value)}
                  icon={WORK_TYPE_ICONS[type.value] || FileText}
                  label={type.label}
                  sublabel={type.price}
                  delay={index * 0.03}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Deadline Selection */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}>
              Когда нужно сдать?
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {DEADLINES.map((deadline, index) => (
                <SelectionCard
                  key={deadline.value}
                  selected={selectedDeadline === deadline.value}
                  onClick={() => handleDeadlineSelect(deadline.value)}
                  icon={DEADLINE_ICONS[deadline.value] || Calendar}
                  label={deadline.label}
                  sublabel={deadline.multiplier}
                  delay={index * 0.05}
                />
              ))}
            </div>

            {/* Urgency notice */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                marginTop: 16,
                padding: 14,
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: 12,
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--gold-400)' }}>Чем срочнее</span> — тем выше множитель к базовой цене
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 20,
            }}>
              Детали заказа
            </h3>

            <PremiumInput
              label="Предмет"
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
              label="Дополнительное описание"
              value={description}
              onChange={setDescription}
              placeholder="Особые требования, ссылки на методички..."
              multiline
            />

            {/* Files placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                marginTop: 8,
                padding: 16,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Файлы можно будет прикрепить после создания заказа
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 30%)',
          zIndex: 100,
        }}
      >
        {step < 3 ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNextStep}
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2)
            }
            style={{
              width: '100%',
              padding: '16px 24px',
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              fontWeight: 700,
              color: '#050505',
              background: (step === 1 && canProceedStep1) || (step === 2 && canProceedStep2)
                ? 'linear-gradient(180deg, var(--gold-200) 0%, var(--gold-400) 40%, var(--gold-500) 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 14,
              cursor: (step === 1 && canProceedStep1) || (step === 2 && canProceedStep2)
                ? 'pointer'
                : 'not-allowed',
              boxShadow: (step === 1 && canProceedStep1) || (step === 2 && canProceedStep2)
                ? '0 0 30px -5px rgba(212, 175, 55, 0.5), 0 8px 20px -8px rgba(0, 0, 0, 0.5)'
                : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: (step === 1 && canProceedStep1) || (step === 2 && canProceedStep2) ? 1 : 0.4,
            }}
          >
            Далее
            <ChevronRight size={20} />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!canProceedStep3 || isSubmitting}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              fontWeight: 700,
              color: canProceedStep3 ? '#050505' : 'var(--text-muted)',
              background: canProceedStep3
                ? 'linear-gradient(180deg, var(--gold-200) 0%, var(--gold-400) 40%, var(--gold-500) 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 14,
              cursor: canProceedStep3 && !isSubmitting ? 'pointer' : 'not-allowed',
              boxShadow: canProceedStep3
                ? '0 0 30px -5px rgba(212, 175, 55, 0.5), 0 8px 20px -8px rgba(0, 0, 0, 0.5)'
                : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: canProceedStep3 ? 1 : 0.4,
            }}
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Clock size={20} />
                </motion.div>
                Создаём...
              </>
            ) : (
              <>
                <Send size={18} />
                Рассчитать и отправить
              </>
            )}
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
