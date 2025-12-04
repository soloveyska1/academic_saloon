import { motion } from 'framer-motion'
import { Check, Clock, FileText, Search, CheckCircle, Package } from 'lucide-react'

interface Step {
  id: string
  label: string
  icon: typeof Check
  completed: boolean
  current: boolean
  timestamp?: string
}

interface Props {
  status: string
  createdAt?: string
}

const statusToSteps: Record<string, string[]> = {
  'pending': ['pending'],
  'reviewing': ['pending', 'reviewing'],
  'confirmed': ['pending', 'reviewing', 'confirmed'],
  'in_progress': ['pending', 'reviewing', 'confirmed', 'in_progress'],
  'on_review': ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review'],
  'completed': ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review', 'completed'],
  'cancelled': ['cancelled'],
  'rejected': ['rejected'],
}

const stepConfig = {
  pending: { label: 'Создан', icon: FileText },
  reviewing: { label: 'На оценке', icon: Search },
  confirmed: { label: 'Подтверждён', icon: Check },
  in_progress: { label: 'В работе', icon: Clock },
  on_review: { label: 'На проверке', icon: Search },
  completed: { label: 'Готов', icon: CheckCircle },
  cancelled: { label: 'Отменён', icon: Package },
  rejected: { label: 'Отклонён', icon: Package },
}

export function OrderTracker({ status }: Props) {
  const activeSteps = statusToSteps[status] || ['pending']

  const allSteps = ['pending', 'reviewing', 'confirmed', 'in_progress', 'on_review', 'completed']

  if (status === 'cancelled' || status === 'rejected') {
    return (
      <div style={{
        padding: 16,
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12,
        textAlign: 'center',
      }}>
        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>
          {status === 'cancelled' ? 'Заказ отменён' : 'Заказ отклонён'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {allSteps.map((stepId, index) => {
        const config = stepConfig[stepId as keyof typeof stepConfig]
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
                      ? 'linear-gradient(135deg, #d4af37, #b38728)'
                      : 'rgba(212,175,55,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: isCompleted
                    ? '2px solid #d4af37'
                    : '2px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 20px rgba(212,175,55,0.4)' : 'none',
                }}
              >
                <Icon
                  size={16}
                  color={isCompleted ? (isCurrent ? '#09090b' : '#d4af37') : '#52525b'}
                />
              </motion.div>

              {/* Connector Line */}
              {index < allSteps.length - 1 && (
                <div style={{
                  width: 2,
                  height: 32,
                  background: isCompleted && activeSteps.includes(allSteps[index + 1])
                    ? 'linear-gradient(180deg, #d4af37, #d4af37)'
                    : 'rgba(255,255,255,0.1)',
                  marginTop: 4,
                  marginBottom: 4,
                  borderRadius: 1,
                }}/>
              )}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              paddingBottom: index < allSteps.length - 1 ? 20 : 0,
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
                    color: '#d4af37',
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
                      background: '#d4af37',
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
