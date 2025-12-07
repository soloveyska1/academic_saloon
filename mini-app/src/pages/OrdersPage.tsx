import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  FileStack, Search, SlidersHorizontal, Plus, ChevronRight,
  Clock, CheckCircle, XCircle, CreditCard, Loader, AlertCircle,
  TrendingUp, Calendar, MessageCircle, Sparkles, Filter,
  ArrowUpDown, X, Bell,
  GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera,
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS PAGE V2 — Premium Redesign
//  Features: Hero Stats, Attention Section, Enhanced Cards, Search, Sort
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
}

type Filter = 'all' | 'active' | 'completed' | 'attention'
type SortOption = 'date' | 'price' | 'status'

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

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

const WORK_TYPE_COLORS: Record<string, string> = {
  masters: '#8b5cf6',
  diploma: '#8b5cf6',
  coursework: '#f59e0b',
  practice: '#06b6d4',
  essay: '#ec4899',
  presentation: '#10b981',
  control: '#3b82f6',
  independent: '#6366f1',
  report: '#64748b',
  photo_task: '#f97316',
  other: '#d4af37',
}

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  priority: number
  needsAttention: boolean
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', icon: Clock, priority: 2, needsAttention: false },
  waiting_estimation: { label: 'На оценке', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', icon: Clock, priority: 2, needsAttention: false },
  confirmed: { label: 'К оплате', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', icon: CreditCard, priority: 1, needsAttention: true },
  waiting_payment: { label: 'К оплате', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)', icon: CreditCard, priority: 1, needsAttention: true },
  verification_pending: { label: 'Проверка оплаты', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.12)', icon: Loader, priority: 3, needsAttention: false },
  paid: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)', icon: Loader, priority: 4, needsAttention: false },
  paid_full: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)', icon: Loader, priority: 4, needsAttention: false },
  in_progress: { label: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)', icon: Loader, priority: 4, needsAttention: false },
  review: { label: 'Готов', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)', icon: CheckCircle, priority: 5, needsAttention: true },
  revision: { label: 'На правках', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', icon: AlertCircle, priority: 3, needsAttention: true },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)', icon: CheckCircle, priority: 6, needsAttention: false },
  cancelled: { label: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)', icon: XCircle, priority: 7, needsAttention: false },
  rejected: { label: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)', icon: XCircle, priority: 7, needsAttention: false },
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v: number) => `${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v: string) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING
// ═══════════════════════════════════════════════════════════════════════════

function ProgressRing({ progress, size = 44, strokeWidth = 3, color = '#d4af37' }: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STAT CARD
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  onClick,
  isActive,
}: {
  icon: typeof Clock
  value: number
  label: string
  color: string
  onClick?: () => void
  isActive?: boolean
}) {
  const { ref, handlers } = usePremiumGesture<HTMLDivElement>({
    onTap: onClick,
    scale: 0.95,
    hapticType: 'light',
  })

  return (
    <motion.div
      ref={ref}
      {...handlers}
      whileHover={{ y: -2 }}
      style={{
        flex: 1,
        padding: '14px 12px',
        borderRadius: 16,
        background: isActive
          ? `linear-gradient(135deg, ${color}20, ${color}08)`
          : 'var(--bg-card)',
        border: `1px solid ${isActive ? color + '40' : 'var(--border-default)'}`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)`,
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={14} color={color} />
          </div>
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: isActive ? color : 'var(--text-main)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          <AnimatedCounter value={value} />
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {label}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTENTION CARD (Compact)
// ═══════════════════════════════════════════════════════════════════════════

function AttentionCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        cursor: 'pointer',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: statusConfig.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <StatusIcon size={18} color={statusConfig.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {order.work_type_label} #{order.id}
        </div>
        <div style={{
          fontSize: 12,
          color: statusConfig.color,
          fontWeight: 500,
        }}>
          {statusConfig.label}
        </div>
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ORDER CARD
// ═══════════════════════════════════════════════════════════════════════════

function PremiumOrderCard({ order, index }: { order: Order; index: number }) {
  const navigate = useNavigate()
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const workTypeColor = WORK_TYPE_COLORS[order.work_type] || '#d4af37'
  const StatusIcon = statusConfig.icon

  const { ref, handlers } = usePremiumGesture<HTMLDivElement>({
    onTap: () => navigate(`/order/${order.id}`),
    scale: 0.98,
    hapticType: 'light',
    tolerance: 15,
    pressDelay: 40,
  })

  // Calculate days until deadline
  const daysUntilDeadline = useMemo(() => {
    if (!order.deadline) return null
    const deadline = new Date(order.deadline)
    const now = new Date()
    const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }, [order.deadline])

  const progress = (order as any).progress || 0
  const isInProgress = ['paid', 'paid_full', 'in_progress'].includes(order.status)
  const isCompleted = order.status === 'completed'
  const needsPayment = ['confirmed', 'waiting_payment'].includes(order.status)

  return (
    <motion.div
      ref={ref}
      {...handlers}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        padding: 18,
        borderRadius: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 16,
        bottom: 16,
        width: 3,
        borderRadius: '0 3px 3px 0',
        background: `linear-gradient(180deg, ${workTypeColor}, ${workTypeColor}80)`,
        boxShadow: `0 0 12px ${workTypeColor}50`,
      }} />

      {/* Top shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      }} />

      {/* Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingLeft: 8,
      }}>
        {/* Left: Icon + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {/* Work Type Icon with Progress Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {isInProgress && progress > 0 ? (
              <div style={{ position: 'relative' }}>
                <ProgressRing progress={progress} size={48} strokeWidth={3} color={workTypeColor} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <WorkIcon size={20} color={workTypeColor} strokeWidth={1.5} />
                </div>
              </div>
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${workTypeColor}20, ${workTypeColor}08)`,
                border: `1px solid ${workTypeColor}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <WorkIcon size={22} color={workTypeColor} strokeWidth={1.5} />
              </div>
            )}
            {/* Progress percentage badge */}
            {isInProgress && progress > 0 && (
              <div style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                background: workTypeColor,
                color: '#000',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
              }}>
                {progress}%
              </div>
            )}
          </div>

          {/* Title + Subject */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
              }}>
                {order.work_type_label}
              </h3>
            </div>
            <p style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {order.subject || order.topic || 'Без темы'}
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
          flexShrink: 0,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusConfig.color,
            boxShadow: `0 0 8px ${statusConfig.color}`,
            animation: needsPayment ? 'pulse 2s infinite' : 'none',
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

      {/* Progress Bar (for in-progress orders) */}
      {isInProgress && progress > 0 && progress < 100 && (
        <div style={{ marginBottom: 14, paddingLeft: 8 }}>
          <div style={{
            height: 4,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${workTypeColor}, ${workTypeColor}cc)`,
                borderRadius: 2,
                boxShadow: `0 0 10px ${workTypeColor}60`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 14,
        paddingLeft: 8,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {/* Left: ID + Deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            #{order.id}
          </span>

          {daysUntilDeadline !== null && !isCompleted && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: daysUntilDeadline <= 3
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(255,255,255,0.04)',
              borderRadius: 6,
            }}>
              <Calendar size={12} color={daysUntilDeadline <= 3 ? '#ef4444' : 'var(--text-muted)'} />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: daysUntilDeadline <= 3 ? '#ef4444' : 'var(--text-muted)',
              }}>
                {daysUntilDeadline <= 0 ? 'Сегодня' : `${daysUntilDeadline} дн.`}
              </span>
            </div>
          )}
        </div>

        {/* Right: Price + Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: needsPayment ? '#8b5cf6' : 'var(--gold-200)',
            fontFamily: 'var(--font-mono)',
          }}>
            {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
          </span>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      </div>

      {/* Pulse animation for attention-needed cards */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILTER CHIP
// ═══════════════════════════════════════════════════════════════════════════

function FilterChip({
  label,
  isActive,
  onClick,
  count,
  icon: Icon,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  count?: number
  icon?: typeof Clock
}) {
  const { ref, handlers } = usePremiumGesture<HTMLButtonElement>({
    onTap: onClick,
    scale: 0.95,
    hapticType: 'light',
  })

  return (
    <button
      ref={ref}
      {...handlers}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 12,
        border: 'none',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: isActive
          ? 'var(--gold-metallic)'
          : 'transparent',
        color: isActive
          ? 'var(--bg-void)'
          : 'var(--text-muted)',
        boxShadow: isActive
          ? 'var(--glow-gold)'
          : 'none',
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function FABButton({ onClick }: { onClick: () => void }) {
  const { ref, handlers } = usePremiumGesture<HTMLButtonElement>({
    onTap: onClick,
    scale: 0.9,
    hapticType: 'medium',
  })

  return (
    <motion.button
      ref={ref}
      {...handlers}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.05 }}
      style={{
        position: 'fixed',
        bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 16,
        border: 'none',
        background: 'var(--liquid-gold)',
        boxShadow: '0 8px 24px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <Plus size={24} color="#0a0a0c" strokeWidth={2.5} />
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ filter }: { filter: Filter }) {
  const messages: Record<Filter, { title: string; subtitle: string }> = {
    all: { title: 'Нет заказов', subtitle: 'Создайте первый заказ, нажав +' },
    active: { title: 'Нет активных', subtitle: 'Все заказы завершены' },
    completed: { title: 'Нет завершённых', subtitle: 'Завершённые заказы появятся здесь' },
    attention: { title: 'Всё в порядке!', subtitle: 'Нет заказов, требующих внимания' },
  }

  const msg = messages[filter]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'var(--bg-card)',
        borderRadius: 24,
        border: '1px solid var(--border-default)',
      }}
    >
      <div style={{
        width: 72,
        height: 72,
        margin: '0 auto 20px',
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
        border: '1px solid var(--border-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <FileStack size={32} color="var(--gold-400)" strokeWidth={1.5} />
      </div>
      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 8,
      }}>
        {msg.title}
      </h3>
      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
      }}>
        {msg.subtitle}
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSort, setShowSort] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const active = orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    const needsPayment = orders.filter(o => ['confirmed', 'waiting_payment'].includes(o.status))
    const inProgress = orders.filter(o => ['paid', 'paid_full', 'in_progress'].includes(o.status))
    const completed = orders.filter(o => o.status === 'completed')
    const attention = orders.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    const totalSpent = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.final_price || o.price || 0), 0)

    return { active, needsPayment, inProgress, completed, attention, totalSpent }
  }, [orders])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply filter
    if (filter === 'active') {
      result = result.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    } else if (filter === 'completed') {
      result = result.filter(o => o.status === 'completed')
    } else if (filter === 'attention') {
      result = result.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.subject?.toLowerCase().includes(query) ||
        o.topic?.toLowerCase().includes(query) ||
        o.work_type_label?.toLowerCase().includes(query) ||
        o.id.toString().includes(query)
      )
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'price') {
        return (b.final_price || b.price || 0) - (a.final_price || a.price || 0)
      } else if (sortBy === 'status') {
        const priorityA = STATUS_CONFIG[a.status]?.priority || 99
        const priorityB = STATUS_CONFIG[b.status]?.priority || 99
        return priorityA - priorityB
      }
      return 0
    })

    return result
  }, [orders, filter, searchQuery, sortBy])

  const handleFilterChange = (newFilter: Filter) => {
    haptic('light')
    setFilter(newFilter)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      paddingBottom: 160,
    }}>
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        padding: '24px 20px 20px',
        background: 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 100%)',
      }}>
        {/* Decorative gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08), transparent)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Title Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-gold)',
              }}>
                <FileStack size={26} color="var(--gold-400)" />
              </div>
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 28,
                  fontWeight: 700,
                  background: 'var(--gold-text-shine)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  margin: 0,
                }}>
                  Мои заказы
                </h1>
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  margin: 0,
                  marginTop: 2,
                }}>
                  {orders.length} {orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  haptic('light')
                  setShowSearch(!showSearch)
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--border-default)',
                  background: showSearch ? 'var(--gold-metallic)' : 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Search size={18} color={showSearch ? '#0a0a0c' : 'var(--text-muted)'} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  haptic('light')
                  setShowSort(!showSort)
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--border-default)',
                  background: showSort ? 'var(--gold-metallic)' : 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={18} color={showSort ? '#0a0a0c' : 'var(--text-muted)'} />
              </motion.button>
            </div>
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon={Loader}
              value={stats.active.length}
              label="Активные"
              color="#3b82f6"
              onClick={() => handleFilterChange('active')}
              isActive={filter === 'active'}
            />
            <StatCard
              icon={CreditCard}
              value={stats.needsPayment.length}
              label="К оплате"
              color="#8b5cf6"
              onClick={() => handleFilterChange('attention')}
              isActive={filter === 'attention'}
            />
            <StatCard
              icon={CheckCircle}
              value={stats.completed.length}
              label="Готовы"
              color="#22c55e"
              onClick={() => handleFilterChange('completed')}
              isActive={filter === 'completed'}
            />
          </motion.div>

          {/* Total sum */}
          {stats.totalSpent > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
                borderRadius: 12,
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="var(--gold-400)" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Общая сумма заказов
                </span>
              </div>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--gold-300)',
                fontFamily: 'var(--font-mono)',
              }}>
                <AnimatedCounter value={stats.totalSpent} suffix=" ₽" />
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEARCH BAR (Expandable)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', padding: '0 20px' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: 14,
              border: '1px solid var(--border-default)',
              marginBottom: 16,
            }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Поиск по теме, предмету..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              {searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  <X size={14} color="var(--text-muted)" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          SORT OPTIONS (Expandable)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSort && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', padding: '0 20px' }}
          >
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}>
              {[
                { value: 'date' as SortOption, label: 'По дате', icon: Calendar },
                { value: 'price' as SortOption, label: 'По цене', icon: TrendingUp },
                { value: 'status' as SortOption, label: 'По статусу', icon: Filter },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    haptic('light')
                    setSortBy(option.value)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: `1px solid ${sortBy === option.value ? 'var(--border-gold)' : 'var(--border-default)'}`,
                    background: sortBy === option.value
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
                      : 'var(--bg-card)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: sortBy === option.value ? 'var(--gold-300)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <option.icon size={14} />
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          ATTENTION SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      {stats.attention.length > 0 && filter === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ padding: '0 20px', marginBottom: 20 }}
        >
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
            borderRadius: 18,
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#8b5cf6" />
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}>
                  Требует внимания
                </span>
              </div>
              <span style={{
                background: 'rgba(139,92,246,0.2)',
                color: '#a78bfa',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 8,
              }}>
                {stats.attention.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.attention.slice(0, 3).map((order) => (
                <AttentionCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/order/${order.id}`)}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FILTERS
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: '0 20px',
          marginBottom: 20,
        }}
      >
        <div style={{
          display: 'flex',
          gap: 8,
          padding: 6,
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border-default)',
        }}>
          <FilterChip
            label="Все"
            isActive={filter === 'all'}
            onClick={() => handleFilterChange('all')}
            count={orders.length}
          />
          <FilterChip
            label="Активные"
            isActive={filter === 'active'}
            onClick={() => handleFilterChange('active')}
            count={stats.active.length}
          />
          <FilterChip
            label="Готовые"
            isActive={filter === 'completed'}
            onClick={() => handleFilterChange('completed')}
            count={stats.completed.length}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ORDERS LIST
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 20px' }}>
        {filteredOrders.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredOrders.map((order, index) => (
              <PremiumOrderCard
                key={order.id}
                order={order}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FAB BUTTON
          ═══════════════════════════════════════════════════════════════════════ */}
      <FABButton onClick={() => {
        haptic('medium')
        navigate('/create-order')
      }} />
    </div>
  )
}
