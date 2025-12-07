import { motion } from 'framer-motion'
import {
  PlusCircle, Clock, CreditCard, Loader2, FileCheck,
  CheckCircle2, RefreshCw, XCircle, Eye
} from 'lucide-react'
import { Order, OrderStatus } from '../../types'

interface OrderTimelineProps {
  order: Order
}

interface TimelineStep {
  key: string
  icon: typeof Clock
  label: string
  description: string
  color: string
  bgColor: string
  borderColor: string
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: 'created',
    icon: PlusCircle,
    label: 'Заказ создан',
    description: 'Заявка отправлена на оценку',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  {
    key: 'estimated',
    icon: Clock,
    label: 'Оценён',
    description: 'Стоимость рассчитана',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  {
    key: 'paid',
    icon: CreditCard,
    label: 'Оплачен',
    description: 'Оплата подтверждена',
    color: '#d4af37',
    bgColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  {
    key: 'in_progress',
    icon: Loader2,
    label: 'В работе',
    description: 'Автор работает над заказом',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  {
    key: 'review',
    icon: Eye,
    label: 'На проверке',
    description: 'Готов к проверке клиентом',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  {
    key: 'completed',
    icon: CheckCircle2,
    label: 'Завершён',
    description: 'Заказ успешно выполнен',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
]

// Map order status to timeline progress
function getTimelineProgress(status: OrderStatus): number {
  const statusMap: Record<OrderStatus, number> = {
    draft: 0,
    pending: 1,
    waiting_estimation: 1,
    confirmed: 2,
    waiting_payment: 2,
    verification_pending: 2.5,
    paid: 3,
    paid_full: 3,
    in_progress: 4,
    revision: 4,
    review: 5,
    completed: 6,
    cancelled: 0,
    rejected: 0,
  }
  return statusMap[status] || 0
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `Сегодня, ${time}`
  if (isYesterday) return `Вчера, ${time}`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + `, ${time}`
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const progress = getTimelineProgress(order.status)
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)

  if (isCancelled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 24,
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(20, 20, 23, 0.9) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: 24,
        }}
      >
        <div className="flex items-center gap-4">
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <XCircle size={24} color="#ef4444" />
          </div>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#ef4444',
              marginBottom: 4,
            }}>
              Заказ {order.status === 'cancelled' ? 'отменён' : 'отклонён'}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-muted)',
            }}>
              {formatDate(order.created_at) || 'Дата неизвестна'}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 24,
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(20, 20, 23, 0.9), rgba(25, 25, 30, 0.95))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Clock size={18} color="#d4af37" />
        </div>
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-main)',
          }}>
            История заказа
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            Создан {formatDate(order.created_at)}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: 19,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 1,
        }}>
          {/* Progress fill */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.min(100, (progress / 6) * 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, #d4af37, #22c55e)',
              borderRadius: 1,
            }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {TIMELINE_STEPS.map((step, index) => {
            const stepIndex = index + 1
            const isCompleted = progress >= stepIndex
            const isCurrent = Math.floor(progress) === stepIndex
            const isPending = progress < stepIndex
            const StepIcon = step.icon

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '12px 0',
                  opacity: isPending ? 0.4 : 1,
                }}
              >
                {/* Step indicator */}
                <motion.div
                  animate={isCurrent ? {
                    boxShadow: [
                      `0 0 0 0 ${step.color}40`,
                      `0 0 0 8px ${step.color}00`,
                    ],
                  } : {}}
                  transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: isCompleted || isCurrent ? step.bgColor : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${isCompleted || isCurrent ? step.borderColor : 'rgba(255, 255, 255, 0.08)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {isCurrent && step.icon === Loader2 ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <StepIcon size={18} color={step.color} />
                    </motion.div>
                  ) : (
                    <StepIcon
                      size={18}
                      color={isCompleted || isCurrent ? step.color : 'rgba(255, 255, 255, 0.3)'}
                    />
                  )}
                </motion.div>

                {/* Step content */}
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isCompleted || isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                    marginBottom: 2,
                  }}>
                    {step.label}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}>
                    {step.description}
                  </div>

                  {/* Current step badge */}
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 8,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: step.bgColor,
                        border: `1px solid ${step.borderColor}`,
                      }}
                    >
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: step.color,
                        }}
                      />
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: step.color,
                      }}>
                        Сейчас
                      </span>
                    </motion.div>
                  )}

                  {/* Completed checkmark */}
                  {isCompleted && !isCurrent && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 8,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                    }}>
                      <CheckCircle2 size={12} color="#22c55e" />
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#22c55e',
                      }}>
                        Выполнено
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
