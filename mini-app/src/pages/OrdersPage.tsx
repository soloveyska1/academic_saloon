import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  LucideIcon,
  PenTool,
  Plus,
  Presentation,
  Scroll,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { SkeletonOrderCard } from '../components/ui/Skeleton'
import {
  getOrderDisplaySubtitle,
  getOrderDisplayTitle,
  normalizeOrders,
  parseOrderDateSafe,
  toSafeString,
} from '../lib/orderView'
import { useThemeValue } from '../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS PAGE — Quiet Luxury Redesign
//  Philosophy: utility screen, fast scanning, clear status at a glance.
//  No visual noise — just clean info hierarchy + gold accents for actions.
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
  loading?: boolean
  onRefresh?: () => Promise<void>
}

type FilterType = 'all' | 'action' | 'active' | 'completed' | 'archived'

// ─── Status system ───────────────────────────────────────────────────────

interface StatusMeta {
  label: string
  hint: string
  color: string
  chipBg: string
  icon: LucideIcon
  priority: number
  needsAction: boolean
  step: number
  actionLabel?: string
}

const WORK_TYPE_ICONS: Record<string, LucideIcon> = {
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

const STATUS_META: Record<string, StatusMeta> = {
  draft: {
    label: 'Черновик',
    hint: 'Заявка сохранена и ждёт завершения оформления.',
    color: '#a1a1aa',
    chipBg: 'rgba(161,161,170,0.10)',
    icon: FileText,
    priority: 6,
    needsAction: true,
    step: 1,
    actionLabel: 'Продолжить',
  },
  pending: {
    label: 'Оценка',
    hint: 'Собираем вводные и готовим расчёт.',
    color: '#fbbf24',
    chipBg: 'rgba(251,191,36,0.12)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
  },
  waiting_estimation: {
    label: 'Оценка',
    hint: 'Собираем вводные и готовим расчёт.',
    color: '#fbbf24',
    chipBg: 'rgba(251,191,36,0.12)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
  },
  confirmed: {
    label: 'К оплате',
    hint: 'После оплаты сразу запускаем заказ в работу.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.14)',
    icon: CreditCard,
    priority: 1,
    needsAction: true,
    step: 2,
    actionLabel: 'Оплатить',
  },
  waiting_payment: {
    label: 'К оплате',
    hint: 'После оплаты сразу запускаем заказ в работу.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.14)',
    icon: CreditCard,
    priority: 1,
    needsAction: true,
    step: 2,
    actionLabel: 'Оплатить',
  },
  verification_pending: {
    label: 'Проверяем оплату',
    hint: 'Платёж получен, сейчас подтверждаем зачисление.',
    color: '#60a5fa',
    chipBg: 'rgba(96,165,250,0.12)',
    icon: Activity,
    priority: 4,
    needsAction: false,
    step: 2,
  },
  paid: {
    label: 'В работе',
    hint: 'Уже работаем над задачей.',
    color: '#60a5fa',
    chipBg: 'rgba(96,165,250,0.12)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  paid_full: {
    label: 'В работе',
    hint: 'Уже работаем над задачей.',
    color: '#60a5fa',
    chipBg: 'rgba(96,165,250,0.12)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  in_progress: {
    label: 'В работе',
    hint: 'Уже работаем над задачей.',
    color: '#60a5fa',
    chipBg: 'rgba(96,165,250,0.12)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  review: {
    label: 'Готов',
    hint: 'Нужно открыть заказ и посмотреть готовый результат.',
    color: '#4ade80',
    chipBg: 'rgba(74,222,128,0.12)',
    icon: CheckCircle2,
    priority: 2,
    needsAction: true,
    step: 4,
    actionLabel: 'Проверить',
  },
  revision: {
    label: 'На доработке',
    hint: 'Посмотрите комментарии и подтвердите следующий шаг.',
    color: '#fb923c',
    chipBg: 'rgba(251,146,60,0.12)',
    icon: AlertCircle,
    priority: 2,
    needsAction: true,
    step: 3,
    actionLabel: 'Открыть',
  },
  completed: {
    label: 'Завершён',
    hint: 'Заказ закрыт и доступен в истории.',
    color: '#4ade80',
    chipBg: 'rgba(74,222,128,0.10)',
    icon: CheckCircle2,
    priority: 10,
    needsAction: false,
    step: 4,
  },
  cancelled: {
    label: 'Закрыт',
    hint: 'Заказ остановлен и перенесён в историю.',
    color: '#71717a',
    chipBg: 'rgba(113,113,122,0.10)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
  rejected: {
    label: 'Закрыт',
    hint: 'Заказ остановлен и перенесён в историю.',
    color: '#71717a',
    chipBg: 'rgba(113,113,122,0.10)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
}

// ─── Utility functions ───────────────────────────────────────────────────

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] || STATUS_META.pending
}

function isActiveStatus(status: string): boolean {
  return !['completed', 'cancelled', 'rejected'].includes(status)
}

function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseOrderDateSafe(deadline)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getHoursUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseOrderDateSafe(deadline)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60))
}

function formatDeadline(deadline: string | null | undefined): string {
  const hours = getHoursUntilDeadline(deadline)
  const days = getDaysUntilDeadline(deadline)
  if (days === null) return 'Без срока'
  if (hours !== null && hours <= 0) return 'Просрочен'
  if (hours !== null && hours <= 24) return `${hours} ч`
  if (days <= 7) return `${days} дн`
  const date = parseOrderDateSafe(deadline)
  if (!date) return 'Без срока'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatMoney(amount: number | null | undefined): string {
  return `${Math.max(0, Math.round(amount || 0)).toLocaleString('ru-RU')} ₽`
}

function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const r = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (r > 1 && r < 5) return forms[1]
  if (r === 1) return forms[0]
  return forms[2]
}

function getRemainingAmount(order: Order): number {
  return Math.max((order.final_price || order.price || 0) - (order.paid_amount || 0), 0)
}

function getPrimaryActionPath(order: Order): string {
  if (['confirmed', 'waiting_payment'].includes(order.status)) {
    return `/order/${order.id}?action=pay`
  }
  return `/order/${order.id}`
}

function compareOrders(a: Order, b: Order): number {
  const metaA = getStatusMeta(a.status)
  const metaB = getStatusMeta(b.status)
  if (metaA.priority !== metaB.priority) return metaA.priority - metaB.priority
  const dA = getHoursUntilDeadline(a.deadline)
  const dB = getHoursUntilDeadline(b.deadline)
  if (dA !== null && dB !== null && dA !== dB) return dA - dB
  const cA = parseOrderDateSafe(a.created_at)?.getTime() ?? 0
  const cB = parseOrderDateSafe(b.created_at)?.getTime() ?? 0
  return cB - cA
}

// ─── Section grouping ────────────────────────────────────────────────────

function getSectionedOrders(orders: Order[], filter: FilterType, query: string) {
  if (query.trim() || filter !== 'all') {
    return [{
      key: filter,
      title: getFilterTitle(filter),
      orders,
    }]
  }

  const action = orders.filter(o => getStatusMeta(o.status).needsAction)
  const active = orders.filter(o => !getStatusMeta(o.status).needsAction && isActiveStatus(o.status))
  const completed = orders.filter(o => o.status === 'completed').slice(0, 3)
  const closed = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).slice(0, 3)

  const sections = [
    { key: 'action', title: 'Требуют внимания', orders: action },
    { key: 'active', title: 'В работе', orders: active },
    { key: 'completed', title: 'Завершено', orders: completed },
    { key: 'closed', title: 'История', orders: closed },
  ].filter(s => s.orders.length > 0)

  return sections.length > 0 ? sections : [{ key: 'all', title: 'Все заказы', orders }]
}

function getFilterTitle(filter: FilterType): string {
  switch (filter) {
    case 'action': return 'Требуют внимания'
    case 'active': return 'В работе'
    case 'completed': return 'Завершённые'
    case 'archived': return 'Архив'
    default: return 'Все заказы'
  }
}

// ─── UI Components ───────────────────────────────────────────────────────

function FilterChip({
  label,
  count,
  active,
  onClick,
  isDark,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  isDark: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flexShrink: 0,
        height: 36,
        padding: '0 14px',
        borderRadius: 99,
        border: `1px solid ${active
          ? (isDark ? 'rgba(212,175,55,0.25)' : 'rgba(158,122,26,0.25)')
          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)')}`,
        background: active
          ? (isDark ? 'rgba(212,175,55,0.10)' : 'rgba(158,122,26,0.10)')
          : 'transparent',
        color: active
          ? (isDark ? '#E8D5A3' : '#7d5c12')
          : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(87,83,78,0.7)'),
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      {count > 0 && (
        <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
      )}
    </motion.button>
  )
}

function ActionBanner({
  order,
  payableCount,
  payableTotal,
  onOpenOrder,
  onBatchPay,
  isDark,
}: {
  order: Order | null
  payableCount: number
  payableTotal: number
  onOpenOrder: (order: Order, path?: string) => void
  onBatchPay: () => void
  isDark: boolean
}) {
  // Batch payment banner
  if (payableCount > 1) {
    return (
      <motion.button
        type="button"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.985 }}
        onClick={onBatchPay}
        style={{
          width: '100%',
          padding: '14px 16px',
          marginBottom: 16,
          borderRadius: 16,
          background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(158,122,26,0.06)',
          border: `1px solid ${isDark ? 'rgba(212,175,55,0.12)' : 'rgba(158,122,26,0.14)'}`,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: isDark ? 'rgba(212,175,55,0.10)' : 'rgba(158,122,26,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CreditCard size={18} color={isDark ? '#E8D5A3' : '#7d5c12'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#E8D5A3' : '#7d5c12', marginBottom: 2 }}>
            Оплатить {payableCount} {pluralize(payableCount, ['заказ', 'заказа', 'заказов'])}
          </div>
          <div style={{ fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(87,83,78,0.7)' }}>
            Одним платежом · {formatMoney(payableTotal)}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: isDark
            ? 'linear-gradient(135deg, #C9A227, #D4AF37)'
            : 'linear-gradient(135deg, #9e7a1a, #b8922d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ArrowUpRight size={16} color={isDark ? '#090909' : '#FFFFFF'} />
        </div>
      </motion.button>
    )
  }

  // Single action banner
  if (!order) return null
  const meta = getStatusMeta(order.status)

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenOrder(order, getPrimaryActionPath(order))}
      style={{
        width: '100%',
        padding: '14px 16px',
        marginBottom: 16,
        borderRadius: 16,
        background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(158,122,26,0.06)',
        border: `1px solid ${isDark ? 'rgba(212,175,55,0.12)' : 'rgba(158,122,26,0.14)'}`,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: meta.chipBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <meta.icon size={18} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(28,25,23,0.88)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {meta.actionLabel}: {getOrderDisplayTitle(order)}
        </div>
        <div style={{
          fontSize: 12.5,
          color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(87,83,78,0.7)',
          marginTop: 2,
        }}>
          {meta.hint}
        </div>
      </div>
      <div style={{
        height: 32, padding: '0 12px', borderRadius: 10,
        background: isDark
          ? 'linear-gradient(135deg, #C9A227, #D4AF37)'
          : 'linear-gradient(135deg, #9e7a1a, #b8922d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 12, fontWeight: 700,
        color: isDark ? '#090909' : '#FFFFFF',
      }}>
        {meta.actionLabel || 'Открыть'}
      </div>
    </motion.button>
  )
}

const OrderCard = memo(function OrderCard({
  order,
  index,
  onOpenOrder,
  isDark,
}: {
  order: Order
  index: number
  onOpenOrder: (order: Order) => void
  isDark: boolean
}) {
  const meta = getStatusMeta(order.status)
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const amount = order.final_price || order.price || 0
  const subtitle = getOrderDisplaySubtitle(order)
  const deadlineText = formatDeadline(order.deadline)
  const hoursLeft = getHoursUntilDeadline(order.deadline)
  const isOverdue = hoursLeft !== null && hoursLeft <= 0 && isActiveStatus(order.status)
  const isUrgent = hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 48 && isActiveStatus(order.status)

  return (
    <motion.button
      type="button"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.35 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenOrder(order)}
      style={{
        width: '100%',
        padding: '18px',
        borderRadius: 20,
        background: meta.needsAction
          ? (isDark
            ? 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)'
            : 'linear-gradient(135deg, rgba(158,122,26,0.05) 0%, rgba(158,122,26,0.02) 100%)')
          : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.88)'),
        border: `1px solid ${meta.needsAction
          ? (isDark ? 'rgba(212,175,55,0.10)' : 'rgba(158,122,26,0.12)')
          : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.08)')}`,
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: 10,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isDark ? 'none' : '0 2px 8px rgba(120,85,40,0.06)',
      }}
    >
      {/* Action indicator — thin gold top line */}
      {meta.needsAction && (
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: 0, left: 24, right: 24,
          height: 1,
          background: isDark
            ? 'linear-gradient(90deg, transparent, rgba(212,175,55,0.20), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(158,122,26,0.25), transparent)',
        }} />
      )}

      {/* Progress bar — thin line at bottom */}
      {(order.progress ?? 0) > 0 && (order.progress ?? 0) < 100 && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 2,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(120,85,40,0.06)',
        }}>
          <div style={{
            height: '100%',
            width: `${order.progress}%`,
            background: meta.color,
            opacity: 0.45,
            borderRadius: 1,
          }} />
        </div>
      )}

      {/* Row 1: Icon + Title + Price */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        marginBottom: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: meta.needsAction
            ? (isDark ? 'rgba(212,175,55,0.07)' : 'rgba(158,122,26,0.08)')
            : (isDark ? 'rgba(212,175,55,0.05)' : 'rgba(158,122,26,0.06)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WorkIcon
            size={20}
            color={meta.needsAction
              ? (isDark ? 'rgba(212,175,55,0.60)' : 'rgba(158,122,26,0.65)')
              : (isDark ? 'rgba(212,175,55,0.45)' : 'rgba(158,122,26,0.50)')}
            strokeWidth={1.5}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(28,25,23,0.88)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }}>
            {getOrderDisplayTitle(order)}
          </div>
          <div style={{
            fontSize: 13,
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(120,113,108,0.65)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </div>
        </div>

        {/* Price — prominent, right-aligned */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: isDark ? '#E8D5A3' : '#7d5c12',
            letterSpacing: '-0.01em',
          }}>
            {formatMoney(amount)}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{
        height: 1, marginBottom: 12,
        background: meta.needsAction
          ? (isDark ? 'rgba(212,175,55,0.06)' : 'rgba(158,122,26,0.08)')
          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(120,85,40,0.06)'),
      }} />

      {/* Row 2: Status + Deadline + Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 9px', borderRadius: 8,
          background: meta.chipBg,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: meta.color,
            boxShadow: meta.needsAction ? `0 0 6px ${meta.color}` : 'none',
          }} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: meta.color }}>
            {meta.label}
          </span>
        </div>

        {/* Deadline */}
        <span style={{
          fontSize: 12.5, fontWeight: 500,
          color: isOverdue
            ? '#ef4444'
            : isUrgent
              ? '#fbbf24'
              : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(120,113,108,0.6)'),
        }}>
          {deadlineText}
        </span>

        {/* Order ID */}
        <span style={{
          fontSize: 11,
          color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,113,108,0.45)',
        }}>
          #{order.id}
        </span>

        <ChevronRight
          size={14}
          color={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,113,108,0.4)'}
          style={{ marginLeft: 'auto', flexShrink: 0 }}
        />
      </div>
    </motion.button>
  )
})

const SectionHeader = memo(function SectionHeader({ title, count, isDark }: { title: string; count: number; isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10, marginTop: 4,
    }}>
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(87,83,78,0.8)',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(120,113,108,0.5)',
      }}>
        {count}
      </span>
    </div>
  )
})

function EmptyState({
  onCreateOrder,
  hasSearch,
  onReset,
  isDark,
}: {
  onCreateOrder: () => void
  hasSearch: boolean
  onReset: () => void
  isDark: boolean
}) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          margin: '0 auto 20px',
          background: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(158,122,26,0.07)',
          border: `1px solid ${isDark ? 'rgba(212,175,55,0.10)' : 'rgba(158,122,26,0.12)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FolderOpen size={24} color={isDark ? 'rgba(212,175,55,0.50)' : 'rgba(158,122,26,0.55)'} />
        </div>
      </motion.div>

      <div style={{
        fontSize: 18, fontWeight: 700,
        color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(28,25,23,0.88)',
        marginBottom: 8,
      }}>
        {hasSearch ? 'Ничего не нашли' : 'Пока нет заказов'}
      </div>
      <div style={{
        fontSize: 13, lineHeight: 1.6,
        color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(87,83,78,0.7)',
        marginBottom: 24,
        maxWidth: 260,
        margin: '0 auto 24px',
      }}>
        {hasSearch
          ? 'Попробуйте изменить запрос или фильтр.'
          : 'Когда создадите первый заказ, он появится здесь.'}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onCreateOrder}
          style={{
            height: 44, padding: '0 20px', borderRadius: 14,
            border: 'none',
            background: isDark
              ? 'linear-gradient(135deg, #C9A227, #D4AF37)'
              : 'linear-gradient(135deg, #9e7a1a, #b8922d)',
            color: isDark ? '#090909' : '#FFFFFF',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Создать заказ
        </motion.button>
        {hasSearch && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            style={{
              height: 44, padding: '0 20px', borderRadius: 14,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,85,40,0.10)'}`,
              background: 'transparent',
              color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(87,83,78,0.7)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Сбросить
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────

export function OrdersPage({ orders, loading, onRefresh }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  const { containerRef, PullIndicator } = usePullToRefresh({
    onRefresh: async () => { if (onRefresh) await onRefresh() },
    disabled: !onRefresh,
  })
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const normalizedOrders = useMemo(() => normalizeOrders(orders), [orders])

  const nonArchivedOrders = useMemo(
    () => normalizedOrders.filter(o => !o.is_archived).sort(compareOrders),
    [normalizedOrders],
  )

  const stats = useMemo(() => {
    const archived = normalizedOrders.filter(o => o.is_archived)
    const action = nonArchivedOrders.filter(o => getStatusMeta(o.status).needsAction)
    const active = nonArchivedOrders.filter(o => isActiveStatus(o.status))
    const completed = nonArchivedOrders.filter(o => o.status === 'completed')
    const totalValue = nonArchivedOrders.reduce((sum, o) => {
      if (['cancelled', 'rejected'].includes(o.status)) return sum
      return sum + (o.final_price || o.price || 0)
    }, 0)
    return {
      all: nonArchivedOrders.length,
      action: action.length,
      active: active.length,
      completed: completed.length,
      archived: archived.length,
      totalValue,
    }
  }, [normalizedOrders, nonArchivedOrders])

  const payableOrders = useMemo(
    () => nonArchivedOrders.filter(o =>
      ['confirmed', 'waiting_payment'].includes(o.status) && getRemainingAmount(o) > 0),
    [nonArchivedOrders],
  )

  const batchPaymentTotal = useMemo(
    () => payableOrders.reduce((sum, o) => sum + getRemainingAmount(o), 0),
    [payableOrders],
  )

  const spotlightOrder = useMemo(
    () => nonArchivedOrders.find(o => getStatusMeta(o.status).needsAction) || null,
    [nonArchivedOrders],
  )

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return nonArchivedOrders
      .filter(o => {
        if (filter === 'action') return getStatusMeta(o.status).needsAction
        if (filter === 'active') return isActiveStatus(o.status)
        if (filter === 'completed') return o.status === 'completed'
        if (filter === 'archived') return false
        return true
      })
      .filter(o => {
        if (!q) return true
        return [
          toSafeString(o.subject),
          toSafeString(o.topic),
          toSafeString(o.work_type_label),
          String(o.id),
        ].some(v => v?.toLowerCase().includes(q))
      })
  }, [filter, nonArchivedOrders, searchQuery])

  const archivedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return normalizedOrders
      .filter(o => o.is_archived)
      .sort(compareOrders)
      .filter(o => {
        if (!q) return true
        return [
          toSafeString(o.subject),
          toSafeString(o.topic),
          toSafeString(o.work_type_label),
          String(o.id),
        ].some(v => v?.toLowerCase().includes(q))
      })
  }, [normalizedOrders, searchQuery])

  const visibleOrders = filter === 'archived' ? archivedOrders : filteredOrders
  const sections = getSectionedOrders(visibleOrders, filter, searchQuery)

  const handleCreateOrder = () => { haptic('medium'); navigate('/create-order') }
  const handleOpenOrder = (order: Order, path?: string) => {
    if (!order?.id) return
    haptic('light')
    navigate(path || `/order/${order.id}`)
  }
  const handleBatchPay = () => {
    if (payableOrders.length < 2) return
    haptic('medium')
    navigate(`/batch-payment?orders=${payableOrders.map(o => o.id).join(',')}`)
  }
  const handleReset = () => { haptic('light'); setSearchQuery(''); setFilter('all') }

  const filterItems = [
    { key: 'all' as FilterType, label: 'Все', count: stats.all },
    { key: 'action' as FilterType, label: 'Важное', count: stats.action },
    { key: 'active' as FilterType, label: 'В работе', count: stats.active },
    { key: 'completed' as FilterType, label: 'Готово', count: stats.completed },
    ...(stats.archived > 0 ? [{ key: 'archived' as FilterType, label: 'Архив', count: stats.archived }] : []),
  ]

  return (
    <motion.div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-scroll-container="true"
      style={{ background: 'var(--bg-main)', minHeight: '100vh', overflowY: 'auto', height: '100vh' }}
    >
      <PullIndicator />
      <div style={{ padding: '16px 20px', paddingBottom: 100 }}>

        {/* ═══════ Header: Title + New Order ═══════ */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: '#E8D5A3',
            fontFamily: "'Manrope', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            Заказы
          </h1>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleCreateOrder}
            style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Plus size={20} color="#E8D5A3" />
          </motion.button>
        </motion.div>

        {/* ═══════ Summary line ═══════ */}
        {stats.all > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {stats.action > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#E8D5A3' }}>
                {stats.action} {pluralize(stats.action, ['ждёт', 'ждут', 'ждут'])} вас
              </span>
            )}
            {stats.action > 0 && stats.active > 0 && (
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            )}
            {stats.active > 0 && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>
                {stats.active} в работе
              </span>
            )}
            <span style={{
              marginLeft: 'auto',
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
            }}>
              {formatMoney(stats.totalValue)}
            </span>
          </motion.div>
        )}

        {/* ═══════ Action banner ═══════ */}
        <ActionBanner
          order={spotlightOrder}
          payableCount={payableOrders.length}
          payableTotal={batchPaymentTotal}
          onOpenOrder={handleOpenOrder}
          onBatchPay={handleBatchPay}
        />

        {/* ═══════ Search ═══════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          marginBottom: 12,
        }}>
          <Search size={16} color="rgba(212,175,55,0.45)" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Номер, предмет или тема"
            style={{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'rgba(255,255,255,0.88)', fontSize: 14,
            }}
          />
        </div>

        {/* ═══════ Filters ═══════ */}
        <div style={{
          display: 'flex', gap: 8,
          overflowX: 'auto', paddingBottom: 4,
          scrollbarWidth: 'none',
          marginBottom: 20,
        }}>
          {filterItems.map(item => (
            <FilterChip
              key={item.key}
              label={item.label}
              count={item.count}
              active={filter === item.key}
              onClick={() => { haptic('light'); setFilter(item.key) }}
            />
          ))}
        </div>

        {/* ═══════ Orders list ═══════ */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <SkeletonOrderCard key={i} />)}
          </div>
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            onCreateOrder={handleCreateOrder}
            hasSearch={Boolean(searchQuery.trim()) || filter !== 'all'}
            onReset={handleReset}
          />
        ) : (
          sections.map(section => (
            <section key={section.key} style={{ marginBottom: 20 }}>
              <SectionHeader title={section.title} count={section.orders.length} />
              {section.orders.map((order, i) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={i}
                  onOpenOrder={(o) => handleOpenOrder(o)}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default OrdersPage
