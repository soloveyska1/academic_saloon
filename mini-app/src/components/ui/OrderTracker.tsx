import { motion } from 'framer-motion'
import {
  Check, FileText, Search, CheckCircle,
  Loader2, AlertCircle
} from 'lucide-react'

interface Props {
  status: string
  variant?: 'vertical' | 'horizontal' | 'compact'
}

// Step configuration with rich data
const STEP_CONFIG = {
  pending: {
    label: 'Создан',
    shortLabel: 'Создан',
    icon: FileText,
    description: 'Заказ создан и ожидает оценки',
    color: '#71717a',
  },
  reviewing: {
    label: 'На оценке',
    shortLabel: 'Оценка',
    icon: Search,
    description: 'Эксперт оценивает сложность',
    color: '#f59e0b',
  },
  confirmed: {
    label: 'Подтверждён',
    shortLabel: 'Подтв.',
    icon: Check,
    description: 'Заказ подтверждён, ожидает оплаты',
    color: '#3b82f6',
  },
  in_progress: {
    label: 'В работе',
    shortLabel: 'Работа',
    icon: Loader2,
    description: 'Эксперт работает над заказом',
    color: '#8b5cf6',
  },
  on_review: {
    label: 'На проверке',
    shortLabel: 'Проверка',
    icon: Search,
    description: 'Финальная проверка качества',
    color: '#06b6d4',
  },
  completed: {
    label: 'Готов',
    shortLabel: 'Готов',
    icon: CheckCircle,
    description: 'Заказ выполнен!',
    color: '#22c55e',
  },
  cancelled: {
    label: 'Отменён',
    shortLabel: 'Отменён',
    icon: AlertCircle,
    description: 'Заказ был отменён',
    color: '#ef4444',
  },
  rejected: {
    label: 'Отклонён',
    shortLabel: 'Отклонён',
    icon: AlertCircle,
    description: 'Заказ отклонён',
    color: '#ef4444',
  },
}

const STATUS_TO_STEPS: Record<string, string[]> = {
  'pending': ['pending'],
  'reviewing': ['pending', 'reviewing'],
  'confirmed': ['pending', 'reviewing', 'confirmed'],
  'in_progress': ['pending', 'reviewing', 'confirmed', 'in_progress'],
  'on_review': ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review'],
  'completed': ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review', 'completed'],
}

const ALL_STEPS = ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review', 'completed']

// Horizontal Timeline (Domino's/Uber style)
function HorizontalTracker({ status }: { status: string }) {
  const activeSteps = STATUS_TO_STEPS[status] || ['pending']
  const currentStep = activeSteps[activeSteps.length - 1]
  const currentConfig = STEP_CONFIG[currentStep as keyof typeof STEP_CONFIG]
  const progress = (activeSteps.length / ALL_STEPS.length) * 100

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Current Status Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <motion.div
          animate={currentStep === 'in_progress' ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: currentStep === 'in_progress' ? Infinity : 0, ease: 'linear' }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${currentConfig.color}30, ${currentConfig.color}10)`,
            border: `2px solid ${currentConfig.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 25px ${currentConfig.color}40`,
          }}
        >
          <currentConfig.icon size={24} color={currentConfig.color} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 2,
          }}>
            {currentConfig.label}
          </div>
          <div style={{ fontSize: 12, color: '#71717a' }}>
            {currentConfig.description}
          </div>
        </div>
        {status === 'completed' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 8,
            }}
          >
            <Sparkles size={16} color="#22c55e" />
          </motion.div>
        )}
      </motion.div>

      {/* Progress Bar */}
      <div style={{
        position: 'relative',
        height: 8,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%',
            background: status === 'completed'
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : `linear-gradient(90deg, #d4af37, ${currentConfig.color})`,
            borderRadius: 4,
            boxShadow: `0 0 15px ${currentConfig.color}60`,
          }}
        />

        {/* Animated pulse on progress end */}
        {status !== 'completed' && (
          <motion.div
            animate={{
              left: `${progress}%`,
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: currentConfig.color,
            }}
          />
        )}
      </div>

      {/* Step indicators */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        {ALL_STEPS.map((stepId, index) => {
          const config = STEP_CONFIG[stepId as keyof typeof STEP_CONFIG]
          const isCompleted = activeSteps.includes(stepId)
          const isCurrent = currentStep === stepId
          const Icon = config.icon

          return (
            <motion.div
              key={stepId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                flex: 1,
              }}
            >
              <motion.div
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isCompleted
                    ? isCurrent
                      ? `linear-gradient(135deg, ${config.color}, ${config.color}80)`
                      : `${config.color}30`
                    : 'rgba(255,255,255,0.05)',
                  border: isCompleted
                    ? `2px solid ${config.color}`
                    : '2px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? `0 0 15px ${config.color}50` : 'none',
                }}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={14} color={config.color} />
                ) : (
                  <Icon size={14} color={isCompleted ? '#fff' : '#52525b'} />
                )}
              </motion.div>
              <span style={{
                fontSize: 9,
                color: isCompleted ? '#a1a1aa' : '#52525b',
                textAlign: 'center',
                fontWeight: isCurrent ? 600 : 400,
              }}>
                {config.shortLabel}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Vertical Timeline
function VerticalTracker({ status }: { status: string }) {
  const activeSteps = STATUS_TO_STEPS[status] || ['pending']

  return (
    <div style={{ padding: '8px 0' }}>
      {ALL_STEPS.map((stepId, index) => {
        const config = STEP_CONFIG[stepId as keyof typeof STEP_CONFIG]
        const isCompleted = activeSteps.includes(stepId)
        const isCurrent = activeSteps[activeSteps.length - 1] === stepId
        const Icon = config.icon

        return (
          <div key={stepId} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Timeline */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginRight: 14,
            }}>
              {/* Icon Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isCompleted
                    ? isCurrent
                      ? `linear-gradient(135deg, ${config.color}, ${config.color}80)`
                      : `${config.color}20`
                    : 'rgba(255,255,255,0.05)',
                  border: isCompleted
                    ? `2px solid ${config.color}`
                    : '2px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? `0 0 20px ${config.color}40` : 'none',
                }}
              >
                <motion.div
                  animate={isCurrent && stepId === 'in_progress' ? { rotate: 360 } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon
                    size={16}
                    color={isCompleted ? (isCurrent ? '#fff' : config.color) : '#52525b'}
                  />
                </motion.div>
              </motion.div>

              {/* Connector Line */}
              {index < ALL_STEPS.length - 1 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 32 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  style={{
                    width: 2,
                    background: isCompleted && activeSteps.includes(ALL_STEPS[index + 1])
                      ? `linear-gradient(180deg, ${config.color}, ${STEP_CONFIG[ALL_STEPS[index + 1] as keyof typeof STEP_CONFIG].color})`
                      : 'rgba(255,255,255,0.1)',
                    marginTop: 4,
                    marginBottom: 4,
                    borderRadius: 1,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              paddingBottom: index < ALL_STEPS.length - 1 ? 20 : 0,
            }}>
              <div style={{
                fontSize: 14,
                fontWeight: isCurrent ? 700 : 500,
                color: isCompleted ? '#fff' : '#52525b',
                marginBottom: 2,
              }}>
                {config.label}
              </div>
              {isCurrent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    fontSize: 11,
                    color: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: config.color,
                    }}
                  />
                  Текущий этап
                </motion.div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Compact inline tracker
function CompactTracker({ status }: { status: string }) {
  const activeSteps = STATUS_TO_STEPS[status] || ['pending']
  const currentStep = activeSteps[activeSteps.length - 1]
  const config = STEP_CONFIG[currentStep as keyof typeof STEP_CONFIG]
  const progress = (activeSteps.length / ALL_STEPS.length) * 100
  const Icon = config.icon

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: `${config.color}10`,
      border: `1px solid ${config.color}30`,
      borderRadius: 12,
    }}>
      <motion.div
        animate={currentStep === 'in_progress' ? { rotate: 360 } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Icon size={18} color={config.color} />
      </motion.div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 4,
        }}>
          {config.label}
        </div>
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
            style={{
              height: '100%',
              background: config.color,
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      <span style={{
        fontSize: 11,
        color: '#71717a',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {activeSteps.length}/{ALL_STEPS.length}
      </span>
    </div>
  )
}

// Main export with variant support
export function OrderTracker({ status, variant = 'horizontal' }: Props) {
  // Handle cancelled/rejected status
  if (status === 'cancelled' || status === 'rejected') {
    const config = STEP_CONFIG[status]
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          padding: 16,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={20} color="#ef4444" />
        </div>
        <div>
          <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>
            {status === 'cancelled' ? 'Заказ отменён' : 'Заказ отклонён'}
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
            {config.description}
          </div>
        </div>
      </motion.div>
    )
  }

  switch (variant) {
    case 'vertical':
      return <VerticalTracker status={status} />
    case 'compact':
      return <CompactTracker status={status} />
    default:
      return <HorizontalTracker status={status} showTime={showTime} />
  }
}

// Delivery-style tracker for completed orders
export function DeliveryTracker({ status }: { status: string }) {
  const isCompleted = status === 'completed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 20,
        background: isCompleted
          ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
          : 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.3)'}`,
        borderRadius: 20,
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={isCompleted ? {} : { y: [0, -5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: 70,
          height: 70,
          borderRadius: 20,
          background: isCompleted
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : 'linear-gradient(135deg, #d4af37, #b38728)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: isCompleted
            ? '0 0 40px rgba(34,197,94,0.4)'
            : '0 0 40px rgba(212,175,55,0.4)',
        }}
      >
        {isCompleted ? (
          <CheckCircle size={36} color="#fff" />
        ) : (
          <Truck size={36} color="#09090b" />
        )}
      </motion.div>

      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#fff',
        marginBottom: 6,
      }}>
        {isCompleted ? 'Заказ готов!' : 'Заказ в работе'}
      </h3>

      <p style={{
        fontSize: 13,
        color: '#a1a1aa',
      }}>
        {isCompleted
          ? 'Ваш заказ успешно выполнен и готов к скачиванию'
          : 'Эксперт работает над вашим заказом'}
      </p>

      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 16,
            color: '#22c55e',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Sparkles size={16} />
          Отличная работа!
        </motion.div>
      )}
    </motion.div>
  )
}
