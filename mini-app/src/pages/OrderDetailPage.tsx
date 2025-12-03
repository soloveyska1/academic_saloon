import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera, Sparkles,
  Clock, Calendar, CreditCard, MessageCircle, XCircle, CheckCircle,
  Loader, FileUp, Download, Tag, Percent, Gift, Receipt
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail } from '../api/userApi'

// Work type icons mapping
const WORK_TYPE_ICONS: Record<string, typeof FileText> = {
  masters: GraduationCap,
  diploma: GraduationCap,
  coursework: BookOpen,
  practice: Briefcase,
  essay: PenTool,
  presentation: Presentation,
  control: ClipboardCheck,
  independent: Scroll,
  report: FileText,
  photo_task: Camera,
  other: Sparkles,
}

// Status config
interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  step: number
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_estimation: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_payment: { label: 'Ожидает оплаты', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)', icon: CreditCard, step: 2 },
  verification_pending: { label: 'Проверка оплаты', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)', icon: Loader, step: 2 },
  paid: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  paid_full: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  in_progress: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader, step: 3 },
  review: { label: 'На проверке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 4 },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: CheckCircle, step: 5 },
  cancelled: { label: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: 0 },
  rejected: { label: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: 0 },
}

const PROGRESS_STEPS = [
  { num: 1, label: 'Оценка' },
  { num: 2, label: 'Оплата' },
  { num: 3, label: 'Работа' },
  { num: 4, label: 'Проверка' },
  { num: 5, label: 'Готово' },
]

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, openBot } = useTelegram()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrder() {
      if (!id) return
      try {
        const data = await fetchOrderDetail(parseInt(id))
        setOrder(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id])

  const handleBack = () => {
    haptic('light')
    navigate('/orders')
  }

  const handleChat = () => {
    haptic('medium')
    openBot(`chat_order_${order?.id}`)
  }

  const handlePay = () => {
    haptic('medium')
    openBot(`pay_order_${order?.id}`)
  }

  const getStatusConfig = (status: string): StatusConfig => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }

  const getWorkTypeIcon = (workType: string) => {
    return WORK_TYPE_ICONS[workType] || FileText
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader size={32} color="#d4af37" />
        </motion.div>
      </div>
    )
  }

  // Error state
  if (!order) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 20,
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <XCircle size={40} color="#ef4444" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#f2f2f2' }}>Заказ не найден</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: '#f2f2f2',
            background: '#14141a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            cursor: 'pointer',
          }}
        >
          Назад к заказам
        </motion.button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(order.status)
  const WorkIcon = getWorkTypeIcon(order.work_type)
  const StatusIcon = statusConfig.icon
  const isPaid = order.paid_amount >= order.final_price
  const isActive = !['completed', 'cancelled', 'rejected'].includes(order.status)
  const needsPayment = ['waiting_payment', 'verification_pending'].includes(order.status)
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      padding: 24,
      paddingBottom: 180,
    }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: '#14141a',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={22} color="#a1a1aa" />
        </motion.button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #f5d061, #d4af37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: 4,
          }}>
            {order.work_type_label}
          </h1>
          <p style={{
            fontSize: 13,
            color: '#71717a',
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Заказ #{order.id}
          </p>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: statusConfig.bgColor,
          borderRadius: 14,
        }}>
          <StatusIcon size={16} color={statusConfig.color} />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: statusConfig.color,
          }}>
            {statusConfig.label}
          </span>
        </div>
      </motion.header>

      {/* Progress Steps (only for active non-cancelled orders) */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: '#14141a',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          {/* Progress Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            {PROGRESS_STEPS.map((step, i) => {
              const isCompleted = statusConfig.step >= step.num
              const isCurrent = statusConfig.step === step.num

              return (
                <div key={step.num} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Step Circle */}
                  <motion.div
                    animate={{
                      scale: isCurrent ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      repeat: isCurrent ? Infinity : 0,
                      duration: 2,
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isCompleted
                        ? 'linear-gradient(135deg, #d4af37, #f5d061)'
                        : 'rgba(255,255,255,0.05)',
                      border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 20px rgba(212,175,55,0.4)' : 'none',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle size={16} color="#050505" strokeWidth={2.5} />
                    ) : (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#52525b',
                      }}>
                        {step.num}
                      </span>
                    )}
                  </motion.div>

                  {/* Connector Line */}
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background: statusConfig.step > step.num
                        ? 'linear-gradient(90deg, #d4af37, #f5d061)'
                        : 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            {PROGRESS_STEPS.map((step) => {
              const isCompleted = statusConfig.step >= step.num
              const isCurrent = statusConfig.step === step.num

              return (
                <span
                  key={step.num}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isCurrent ? '#d4af37' : isCompleted ? '#a1a1aa' : '#52525b',
                    textAlign: 'center',
                    width: 60,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {step.label}
                </span>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Bento Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Topic Card (Full Width) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: '#14141a',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}>
            <BookOpen size={16} color="#d4af37" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#d4af37',
            }}>
              Предмет
            </span>
          </div>
          <p style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#f2f2f2',
            margin: 0,
            lineHeight: 1.4,
          }}>
            {order.subject}
          </p>
        </motion.div>

        {/* Two-Column Row: Deadline + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Deadline Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: '#14141a',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)',
              padding: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <Calendar size={14} color="#d4af37" />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#d4af37',
              }}>
                Дедлайн
              </span>
            </div>
            <p style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#f2f2f2',
              margin: 0,
            }}>
              {order.deadline || 'Не указан'}
            </p>
          </motion.div>

          {/* Price Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))',
              borderRadius: 20,
              border: '1px solid rgba(212,175,55,0.2)',
              padding: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <Receipt size={14} color="#d4af37" />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#d4af37',
              }}>
                Итого
              </span>
            </div>
            <p style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#e6c547',
              margin: 0,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {order.final_price.toLocaleString('ru-RU')} ₽
            </p>
          </motion.div>
        </div>

        {/* Payment Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: '#14141a',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}>
            <CreditCard size={16} color="#d4af37" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#d4af37',
            }}>
              Детали оплаты
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Base Price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={14} color="#71717a" />
                <span style={{ fontSize: 14, color: '#a1a1aa' }}>Стоимость</span>
              </div>
              <span style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#f2f2f2',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {order.price.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            {/* Discount */}
            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Percent size={14} color="#22c55e" />
                  <span style={{ fontSize: 14, color: '#22c55e' }}>Скидка {order.discount}%</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#22c55e',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  −{Math.round(order.price * order.discount / 100).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            {/* Bonus Used */}
            {order.bonus_used > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gift size={14} color="#f59e0b" />
                  <span style={{ fontSize: 14, color: '#f59e0b' }}>Бонусы</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#f59e0b',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  −{order.bonus_used.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{
              height: 1,
              background: 'rgba(255,255,255,0.08)',
              margin: '4px 0',
            }} />

            {/* Paid Amount */}
            {order.paid_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} color="#22c55e" />
                  <span style={{ fontSize: 14, color: '#22c55e' }}>Оплачено</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#22c55e',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {order.paid_amount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            {/* Remaining */}
            {!isPaid && order.final_price > order.paid_amount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color="#ef4444" />
                  <span style={{ fontSize: 14, color: '#ef4444' }}>К оплате</span>
                </div>
                <span style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#ef4444',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {(order.final_price - order.paid_amount).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Created Date Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            background: '#14141a',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={16} color="#71717a" />
            <span style={{ fontSize: 14, color: '#71717a' }}>Создан</span>
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#a1a1aa',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {new Date(order.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </motion.div>
      </div>

      {/* Fixed Action Bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 100,
          left: 24,
          right: 24,
          display: 'flex',
          gap: 12,
          zIndex: 1000,
        }}
      >
        {/* Pay Button (if needed) */}
        {needsPayment && !isPaid && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePay}
            style={{
              flex: 1,
              padding: '18px 24px',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              color: '#050505',
              background: 'linear-gradient(180deg, #f5d061, #d4af37, #b48e26)',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 0 40px -8px rgba(212,175,55,0.6)',
            }}
          >
            <CreditCard size={20} />
            Оплатить
          </motion.button>
        )}

        {/* Chat Button */}
        {isActive && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleChat}
            style={{
              flex: needsPayment && !isPaid ? 0 : 1,
              minWidth: needsPayment && !isPaid ? 60 : 'auto',
              padding: needsPayment && !isPaid ? '18px' : '18px 24px',
              fontSize: 16,
              fontWeight: 600,
              color: '#f2f2f2',
              background: '#14141a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <MessageCircle size={20} color="#d4af37" />
            {!(needsPayment && !isPaid) && 'Написать менеджеру'}
          </motion.button>
        )}

        {/* Support Button (for completed/cancelled) */}
        {!isActive && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleChat}
            style={{
              flex: 1,
              padding: '18px 24px',
              fontSize: 16,
              fontWeight: 600,
              color: '#f2f2f2',
              background: '#14141a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <MessageCircle size={20} color="#d4af37" />
            Поддержка
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
