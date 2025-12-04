import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera, Sparkles,
  Clock, CheckCircle, XCircle, CreditCard, Loader, ChevronRight,
  FileStack
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'

interface Props {
  orders: Order[]
}

type Filter = 'all' | 'active' | 'completed'

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
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  waiting_estimation: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  waiting_payment: { label: 'К оплате', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)', icon: CreditCard },
  verification_pending: { label: 'Проверка', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)', icon: Loader },
  paid: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  paid_full: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  in_progress: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', icon: Loader },
  review: { label: 'На проверке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', icon: Clock },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', icon: CheckCircle },
  cancelled: { label: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle },
  rejected: { label: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', icon: XCircle },
}

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [filter, setFilter] = useState<Filter>('all')

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'active') {
      return !['completed', 'cancelled', 'rejected'].includes(order.status)
    }
    if (filter === 'completed') {
      return order.status === 'completed'
    }
    return true
  })

  const handleFilterChange = (newFilter: Filter) => {
    haptic('light')
    setFilter(newFilter)
  }

  const handleOrderClick = (orderId: number) => {
    haptic('light')
    navigate(`/order/${orderId}`)
  }

  const getStatusConfig = (status: string): StatusConfig => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending
  }

  const getWorkTypeIcon = (workType: string) => {
    return WORK_TYPE_ICONS[workType] || FileText
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      padding: 24,
      paddingBottom: 140,
    }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--glow-gold)',
          }}>
            <FileStack size={24} color="var(--gold-400)" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}>
              Мои заказы
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {orders.length} {orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          padding: 6,
          background: 'var(--bg-card)',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {[
          { value: 'all', label: 'Все' },
          { value: 'active', label: 'Активные' },
          { value: 'completed', label: 'Готовые' },
        ].map((f) => (
          <motion.button
            key={f.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleFilterChange(f.value as Filter)}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: filter === f.value ? 'var(--bg-void)' : 'var(--text-muted)',
              background: filter === f.value
                ? 'var(--gold-metallic)'
                : 'transparent',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: filter === f.value ? 'var(--glow-gold)' : 'none',
            }}
          >
            {f.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-card)',
                borderRadius: 20,
                border: '1px solid var(--border-default)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 20px',
                borderRadius: 20,
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileStack size={36} color="var(--gold-400)" strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                Нет заказов
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {filter === 'active' ? 'Нет активных заказов' : filter === 'completed' ? 'Нет завершённых заказов' : 'Создайте первый заказ'}
              </p>
            </motion.div>
          ) : (
            filteredOrders.map((order, index) => {
              const statusConfig = getStatusConfig(order.status)
              const WorkIcon = getWorkTypeIcon(order.work_type)
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOrderClick(order.id)}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 20,
                    border: '1px solid var(--border-default)',
                    padding: 20,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  {/* Subtle glow on tap */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileTap={{ opacity: 1 }}
                    style={{
                      position: 'absolute',
                      inset: -1,
                      borderRadius: 20,
                      border: '1px solid rgba(212,175,55,0.3)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Header: Icon + Title + Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(212,175,55,0.1)',
                        border: '1px solid var(--border-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <WorkIcon size={22} color="var(--gold-400)" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          margin: 0,
                          marginBottom: 4,
                        }}>
                          {order.work_type_label}
                        </h3>
                        <p style={{
                          fontSize: 14,
                          color: 'var(--text-muted)',
                          margin: 0,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {order.subject}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: statusConfig.bgColor,
                      borderRadius: 20,
                      backdropFilter: 'blur(8px)',
                    }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusConfig.color,
                        boxShadow: `0 0 8px ${statusConfig.color}`,
                      }} />
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusConfig.color,
                      }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar (if applicable) */}
                  {order.progress > 0 && order.progress < 100 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{
                        height: 4,
                        background: 'var(--bg-glass)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${order.progress}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                          style={{
                            height: '100%',
                            background: 'var(--gold-metallic)',
                            borderRadius: 2,
                            boxShadow: 'var(--glow-gold)',
                          }}
                        />
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 6,
                      }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--gold-400)',
                          fontFamily: "var(--font-mono)",
                        }}>
                          {order.progress}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer: ID + Price */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontFamily: "var(--font-mono)",
                    }}>
                      #{order.id}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--gold-200)',
                        fontFamily: "var(--font-mono)",
                      }}>
                        {order.final_price.toLocaleString('ru-RU')} ₽
                      </span>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
