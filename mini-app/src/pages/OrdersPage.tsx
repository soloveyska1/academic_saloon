import { memo, useMemo, useState, useCallback, useDeferredValue } from 'react'
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
  X,
  XCircle,
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useReducedMotion } from '../hooks/useDeviceCapability'
import { SkeletonOrderCard } from '../components/ui/Skeleton'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import {
  canBatchPayOrderStatus,
  canonicalizeOrderStatusAlias,
  getOpenRevisionRound,
  getOrderDisplaySubtitle,
  getOrderDisplayTitle,
  isAwaitingPaymentStatus,
  normalizeOrders,
  parseOrderDateSafe,
  toSafeString,
} from '../lib/orderView'
import s from './OrdersPage.module.css'
import ps from '../styles/PremiumPageSystem.module.css'

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
    hint: 'Заявка сохранена. Завершите оформление, чтобы мы начали.',
    color: '#a1a1aa',
    chipBg: 'rgba(161,161,170,0.10)',
    icon: FileText,
    priority: 6,
    needsAction: true,
    step: 1,
    actionLabel: 'Продолжить',
  },
  pending: {
    label: 'На оценке',
    hint: 'Изучаем задание и готовим стоимость.',
    color: '#fbbf24',
    chipBg: 'rgba(251,191,36,0.12)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
  },
  waiting_estimation: {
    label: 'На оценке',
    hint: 'Изучаем задание и готовим стоимость.',
    color: '#fbbf24',
    chipBg: 'rgba(251,191,36,0.12)',
    icon: Clock3,
    priority: 3,
    needsAction: false,
    step: 1,
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
    hint: 'Платёж получен, подтверждаем зачисление.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.10)',
    icon: Activity,
    priority: 4,
    needsAction: false,
    step: 2,
  },
  paid: {
    label: 'В работе',
    hint: 'Работаем над вашим заданием.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.10)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  paid_full: {
    label: 'В работе',
    hint: 'Работаем над вашим заданием.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.10)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  in_progress: {
    label: 'В работе',
    hint: 'Работаем над вашим заданием.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.10)',
    icon: Activity,
    priority: 5,
    needsAction: false,
    step: 3,
  },
  paused: {
    label: 'На паузе',
    hint: 'Заказ приостановлен. Можно возобновить в любой момент.',
    color: '#d4af37',
    chipBg: 'rgba(212,175,55,0.14)',
    icon: Clock3,
    priority: 5,
    needsAction: true,
    step: 3,
    actionLabel: 'Возобновить',
  },
  review: {
    label: 'Готов к проверке',
    hint: 'Работа готова — откройте и проверьте результат.',
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
    actionLabel: 'Посмотреть',
  },
  completed: {
    label: 'Завершён',
    hint: 'Заказ выполнен. Материалы всегда доступны.',
    color: '#4ade80',
    chipBg: 'rgba(74,222,128,0.10)',
    icon: CheckCircle2,
    priority: 10,
    needsAction: false,
    step: 4,
  },
  cancelled: {
    label: 'Отменён',
    hint: 'Заказ отменён.',
    color: '#71717a',
    chipBg: 'rgba(113,113,122,0.10)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
  rejected: {
    label: 'Отклонён',
    hint: 'К сожалению, заказ не удалось принять.',
    color: '#71717a',
    chipBg: 'rgba(113,113,122,0.10)',
    icon: XCircle,
    priority: 11,
    needsAction: false,
    step: 0,
  },
}

// ─── Utility functions ───────────────────────────────────────────────────

function getStatusMeta(status: string): StatusMeta {
  const canonicalStatus = canonicalizeOrderStatusAlias(status) ?? status
  return STATUS_META[canonicalStatus] || STATUS_META.pending
}

function getEffectiveOrderStatus(order: Order): string {
  if (getOpenRevisionRound(order)) {
    return 'revision'
  }
  return canonicalizeOrderStatusAlias(order.status) ?? order.status
}

function getOrderStatusMeta(order: Order): StatusMeta {
  const effectiveStatus = getEffectiveOrderStatus(order)
  const baseMeta = getStatusMeta(effectiveStatus)
  const openRevisionRound = getOpenRevisionRound(order)
  const latestVersionNumber = order.latest_delivery?.version_number ?? order.delivery_history?.[0]?.version_number ?? null

  if (effectiveStatus === 'revision' && openRevisionRound) {
    return {
      ...baseMeta,
      label: `Правка #${openRevisionRound.round_number}`,
      hint: 'Комментарий уже отправлен. Можно открыть заказ и дослать материалы в текущую правку.',
      actionLabel: 'Открыть чат',
    }
  }

  if (effectiveStatus === 'review' && latestVersionNumber) {
    return {
      ...baseMeta,
      hint: `Версия ${latestVersionNumber} уже отправлена — откройте заказ и проверьте результат.`,
      actionLabel: `Проверить v${latestVersionNumber}`,
    }
  }

  return baseMeta
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
  if (hours !== null && hours <= 0) return 'Срок истёк'
  if (hours !== null && hours <= 24) return `${hours} ч`
  if (days <= 7) return `${days} дн`
  const date = parseOrderDateSafe(deadline)
  if (!date) return 'Без срока'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function getPauseHoursLeft(pauseUntil: string | null | undefined): number | null {
  const date = parseOrderDateSafe(pauseUntil)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60))
}

function formatRelevantTiming(order: Order): string {
  if (order.status === 'paused') {
    const pauseDate = parseOrderDateSafe(order.pause_until)
    if (!pauseDate) return 'На паузе'
    return `Пауза до ${pauseDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
  }

  return formatDeadline(order.deadline)
}

function getRelevantHoursLeft(order: Order): number | null {
  if (order.status === 'paused') {
    return getPauseHoursLeft(order.pause_until)
  }

  return getHoursUntilDeadline(order.deadline)
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
  if (isAwaitingPaymentStatus(order.status)) {
    return `/order/${order.id}?action=pay`
  }
  if (getEffectiveOrderStatus(order) === 'revision') {
    return `/order/${order.id}?focus=revision`
  }
  return `/order/${order.id}`
}

function formatCompactDate(value: string | null | undefined): string | null {
  const date = parseOrderDateSafe(value)
  if (!date) return null
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function compareOrders(a: Order, b: Order): number {
  const metaA = getOrderStatusMeta(a)
  const metaB = getOrderStatusMeta(b)
  if (metaA.priority !== metaB.priority) return metaA.priority - metaB.priority
  const dA = getRelevantHoursLeft(a)
  const dB = getRelevantHoursLeft(b)
  if (dA !== null && dB !== null && dA !== dB) return dA - dB
  const cA = parseOrderDateSafe(a.created_at)?.getTime() ?? 0
  const cB = parseOrderDateSafe(b.created_at)?.getTime() ?? 0
  return cB - cA
}

// ─── Section grouping ────────────────────────────────────────────────────

interface OrderSection {
  key: string
  title: string
  orders: Order[]
  total: number
  filterKey?: FilterType
}

function getSectionedOrders(orders: Order[], filter: FilterType, query: string): OrderSection[] {
  if (query.trim() || filter !== 'all') {
    return [{
      key: filter,
      title: getFilterTitle(filter),
      orders,
      total: orders.length,
    }]
  }

  const normalizedAction = orders.filter(o => getOrderStatusMeta(o).needsAction)
  const normalizedActive = orders.filter(o => !getOrderStatusMeta(o).needsAction && isActiveStatus(getEffectiveOrderStatus(o)))
  const completed = orders.filter(o => getEffectiveOrderStatus(o) === 'completed')
  const closed = orders.filter(o => ['cancelled', 'rejected'].includes(o.status))

  const sections = [
    {
      key: 'action',
      title: 'Ожидают вас',
      filterKey: 'action' as FilterType,
      orders: normalizedAction.slice(0, 4),
      total: normalizedAction.length,
    },
    {
      key: 'active',
      title: 'В работе',
      filterKey: 'active' as FilterType,
      orders: normalizedActive.slice(0, 4),
      total: normalizedActive.length,
    },
    {
      key: 'completed',
      title: 'Завершено',
      filterKey: 'completed' as FilterType,
      orders: completed.slice(0, 2),
      total: completed.length,
    },
    {
      key: 'closed',
      title: 'История',
      orders: closed.slice(0, 2),
      total: closed.length,
    },
  ].filter(s => s.orders.length > 0)

  return sections.length > 0 ? sections : [{ key: 'all', title: 'Все заказы', orders, total: orders.length }]
}

function getFilterTitle(filter: FilterType): string {
  switch (filter) {
    case 'action': return 'Ожидают вас'
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
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  const reduced = useReducedMotion()

  return (
    <motion.button
      type="button"
      whileHover={reduced ? undefined : { y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`${s.filterChip} ${active ? s.filterChipActive : ''}`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={s.filterCount}>{count}</span>
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
}: {
  order: Order | null
  payableCount: number
  payableTotal: number
  onOpenOrder: (order: Order, path?: string) => void
  onBatchPay: () => void
}) {
  const reduced = useReducedMotion()

  // Batch payment banner
  if (payableCount > 1) {
    return (
      <motion.button
        type="button"
        initial={reduced ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={reduced ? undefined : { y: -1 }}
        whileTap={{ scale: 0.985 }}
        onClick={onBatchPay}
        className={s.actionBanner}
      >
        <div className={s.actionIcon}>
          <CreditCard size={18} color="var(--gold-200)" />
        </div>
        <div className={s.actionBody}>
          <div className={s.actionTitle}>
            Оплатить {payableCount} {pluralize(payableCount, ['заказ', 'заказа', 'заказов'])}
          </div>
          <div className={s.actionText}>
            Одним платежом · {formatMoney(payableTotal)}
          </div>
        </div>
        <div className={s.actionCta}>
          <ArrowUpRight size={16} color="var(--text-on-gold)" />
        </div>
      </motion.button>
    )
  }

  // Single action banner
  if (!order) return null
  const meta = getOrderStatusMeta(order)

  return (
    <motion.button
      type="button"
      initial={reduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduced ? undefined : { y: -1 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenOrder(order, getPrimaryActionPath(order))}
      className={s.actionBanner}
      style={{
        '--accent': meta.color,
        '--accent-bg': meta.chipBg,
      } as React.CSSProperties}
    >
      <div className={s.actionIcon}>
        <meta.icon size={18} color={meta.color} />
      </div>
      <div className={s.actionBody}>
        <div className={s.actionTitle}>
          {meta.actionLabel}: {getOrderDisplayTitle(order)}
        </div>
        <div className={s.actionText}>
          {meta.hint}
        </div>
      </div>
      <div className={s.actionCta}>
        {meta.actionLabel || 'Открыть'}
      </div>
    </motion.button>
  )
}

const OrderCard = memo(function OrderCard({
  order,
  index,
  onOpenOrder,
}: {
  order: Order
  index: number
  onOpenOrder: (order: Order) => void
}) {
  const reduced = useReducedMotion()
  const meta = getOrderStatusMeta(order)
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const amount = order.final_price || order.price || 0
  const subtitle = getOrderDisplaySubtitle(order)
  const deadlineText = formatRelevantTiming(order)
  const hoursLeft = getRelevantHoursLeft(order)
  const effectiveStatus = getEffectiveOrderStatus(order)
  const isPaused = effectiveStatus === 'paused'
  const isOverdue = !isPaused && hoursLeft !== null && hoursLeft <= 0 && isActiveStatus(effectiveStatus)
  const isUrgent = !isPaused && hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 48 && isActiveStatus(effectiveStatus)
  const openRevisionRound = getOpenRevisionRound(order)
  const latestVersionNumber = order.latest_delivery?.version_number ?? order.delivery_history?.[0]?.version_number ?? null
  const latestDeliveryDate = formatCompactDate(order.latest_delivery?.sent_at || order.latest_delivery?.created_at || order.delivered_at)
  const contextChips = [
    openRevisionRound ? `Правка #${openRevisionRound.round_number}` : null,
    effectiveStatus === 'review' && latestVersionNumber ? `Версия ${latestVersionNumber}` : null,
    latestDeliveryDate ? `Выдача ${latestDeliveryDate}` : null,
  ].filter(Boolean) as string[]

  return (
    <motion.button
      type="button"
      initial={reduced ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.35 }}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpenOrder(order)}
      style={{
        width: '100%',
        padding: '18px',
        borderRadius: 12,
        background: meta.needsAction
          ? 'var(--gold-glass-subtle)'
          : 'var(--bg-card)',
        border: `1px solid ${meta.needsAction
          ? 'var(--border-gold)'
          : 'var(--border-default)'}`,
        cursor: 'pointer',
        textAlign: 'left',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Left accent bar — color-coded by status */}
      <div aria-hidden="true" style={{
        position: 'absolute',
        top: 10, bottom: 10, left: 0,
        width: 3,
        borderRadius: '0 3px 3px 0',
        background: meta.color,
        opacity: meta.needsAction ? 0.8 : 0.3,
      }} />

      {/* Progress bar — visible line at bottom */}
      {(order.progress ?? 0) > 0 && (order.progress ?? 0) < 100 && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 3,
          background: 'var(--border-subtle)',
        }}>
          <div style={{
            height: '100%',
            width: `${order.progress}%`,
            background: meta.color,
            opacity: 0.7,
            borderRadius: '0 2px 2px 0',
            boxShadow: `0 0 6px ${meta.color}`,
          }} />
        </div>
      )}

      {/* Row 1: Icon + Title + Price */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--gold-glass-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WorkIcon
            size={20}
            color="var(--gold-400)"
            style={{ opacity: meta.needsAction ? 0.6 : 0.45 }}
            strokeWidth={1.5}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 3,
          }}>
            {getOrderDisplayTitle(order)}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </div>

          {contextChips.length > 0 && (
            <div className={s.contextChipRow}>
              {contextChips.slice(0, 3).map((chip) => (
                <span key={chip} className={s.contextChip}>
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price — prominent, right-aligned */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: amount > 0 ? 'var(--gold-200)' : 'var(--text-muted)',
            letterSpacing: '-0.01em',
          }}>
            {amount > 0 ? formatMoney(amount) : 'Оценка'}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{
        height: 1, marginBottom: 12,
        background: meta.needsAction
          ? 'var(--border-gold)'
          : 'var(--border-subtle)',
      }} />

      <div className={s.orderHint}>
        {meta.hint}
      </div>

      {/* Row 2: Status + Deadline + Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          fontSize: 12.5, fontWeight: 600,
          color: isOverdue
            ? 'var(--error-text)'
            : isUrgent
              ? '#fbbf24'
              : 'var(--text-muted)',
        }}>
          {deadlineText}
        </span>

        {/* Order ID */}
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          #{order.id}
        </span>

        <ChevronRight
          size={16}
          color="var(--text-secondary)"
          style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.6 }}
        />
      </div>
    </motion.button>
  )
})

const SectionHeader = memo(function SectionHeader({
  title,
  count,
  onOpenAll,
}: {
  title: string
  count: number
  onOpenAll?: () => void
}) {
  return (
    <div className={s.sectionHeader}>
      <div className={s.sectionLabelGroup}>
        <span className={s.sectionTitle}>{title}</span>
        <span className={s.sectionCount}>{count}</span>
      </div>
      {onOpenAll ? (
        <button type="button" className={s.sectionAction} onClick={onOpenAll}>
          Все
        </button>
      ) : null}
    </div>
  )
})

function EmptyState({
  onCreateOrder,
  hasSearch,
  onReset,
}: {
  onCreateOrder: () => void
  hasSearch: boolean
  onReset: () => void
}) {
  const reduced = useReducedMotion()

  return (
    <div className={s.emptyState}>
      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className={s.emptyIcon}>
          <FolderOpen size={24} color="var(--gold-400)" style={{ opacity: 0.5 }} />
        </div>
      </motion.div>

      <div className={s.emptyTitle}>
        {hasSearch ? 'Ничего не нашлось' : 'Здесь будут ваши заказы'}
      </div>
      <div className={s.emptyText}>
        {hasSearch
          ? 'Попробуйте изменить запрос или фильтр.'
          : 'Новый заказ открывается за пару минут. Стоимость рассчитаем отдельно.'}
      </div>

      <div className={s.emptyActions}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onCreateOrder}
          className={s.primaryButton}
        >
          Оформить заказ
        </motion.button>
        {hasSearch && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            className={s.secondaryButton}
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
  const reduced = useReducedMotion()

  const { containerRef, PullIndicator } = usePullToRefresh({
    onRefresh: async () => { if (onRefresh) await onRefresh() },
    disabled: !onRefresh,
  })
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const normalizedOrders = useMemo(() => normalizeOrders(orders), [orders])

  const nonArchivedOrders = useMemo(
    () => normalizedOrders.filter(o => !o.is_archived).sort(compareOrders),
    [normalizedOrders],
  )

  const stats = useMemo(() => {
    const archived = normalizedOrders.filter(o => o.is_archived)
    const action = nonArchivedOrders.filter(o => getOrderStatusMeta(o).needsAction)
    const active = nonArchivedOrders.filter(o => isActiveStatus(getEffectiveOrderStatus(o)))
    const completed = nonArchivedOrders.filter(o => getEffectiveOrderStatus(o) === 'completed')
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
      canBatchPayOrderStatus(o.status) && getRemainingAmount(o) > 0),
    [nonArchivedOrders],
  )

  const batchPaymentTotal = useMemo(
    () => payableOrders.reduce((sum, o) => sum + getRemainingAmount(o), 0),
    [payableOrders],
  )

  const spotlightOrder = useMemo(
    () => nonArchivedOrders.find(o => getOrderStatusMeta(o).needsAction) || null,
    [nonArchivedOrders],
  )

  const filteredOrders = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase()
    return nonArchivedOrders
      .filter(o => {
        if (filter === 'action') return getOrderStatusMeta(o).needsAction
        if (filter === 'active') return isActiveStatus(getEffectiveOrderStatus(o))
        if (filter === 'completed') return getEffectiveOrderStatus(o) === 'completed'
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
  }, [deferredSearchQuery, filter, nonArchivedOrders])

  const archivedOrders = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase()
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
  }, [deferredSearchQuery, normalizedOrders])

  const visibleOrders = filter === 'archived' ? archivedOrders : filteredOrders
  const sections = useMemo(
    () => getSectionedOrders(visibleOrders, filter, deferredSearchQuery),
    [visibleOrders, filter, deferredSearchQuery],
  )

  const handleCreateOrder = useCallback(() => { haptic('medium'); navigate('/create-order') }, [haptic, navigate])
  const handleOpenOrder = useCallback((order: Order, path?: string) => {
    if (!order?.id) return
    haptic('light')
    navigate(path || `/order/${order.id}`)
  }, [haptic, navigate])
  const handleBatchPay = useCallback(() => {
    if (payableOrders.length < 2) return
    haptic('medium')
    navigate(`/batch-payment?orders=${payableOrders.map(o => o.id).join(',')}`)
  }, [haptic, navigate, payableOrders])
  const handleReset = useCallback(() => { haptic('light'); setSearchQuery(''); setFilter('all') }, [haptic])
  const handleFilterChange = useCallback((nextFilter: FilterType) => {
    haptic('light')
    setFilter(nextFilter)
  }, [haptic])

  const filterItems = [
    { key: 'all' as FilterType, label: 'Все', count: stats.all },
    { key: 'action' as FilterType, label: 'Ожидают вас', count: stats.action },
    { key: 'active' as FilterType, label: 'В работе', count: stats.active },
    { key: 'completed' as FilterType, label: 'Завершено', count: stats.completed },
    ...(stats.archived > 0 ? [{ key: 'archived' as FilterType, label: 'Архив', count: stats.archived }] : []),
  ]

  return (
    <motion.div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-scroll-container="true"
      className={`${s.page} saloon-page-shell saloon-page-shell--workspace`}
    >
      <PullIndicator />
      <div className="page-background" aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>
      <div className={`${s.pageContent} saloon-page-content saloon-page-content--wide`}>
        <div className={ps.sectionStack}>
          <motion.section
            initial={reduced ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${ps.hero} ${ps.heroWorkspace}`}
          >
            <div className={ps.heroGrid}>
              <div className={ps.heroCopy}>
                <div className={ps.chipRow}>
                  <span className={`${ps.chip} ${ps.chipStrong}`}>{stats.all} заказов</span>
                  {stats.action > 0 ? (
                    <span className={`${ps.chip} ${ps.chipStrong}`}>{stats.action} ожидают</span>
                  ) : null}
                  {payableOrders.length > 1 ? (
                    <span className={ps.chip}>{payableOrders.length} к оплате</span>
                  ) : null}
                </div>

                <div className={s.heroHeader}>
                  <div className={s.heroTitleBlock}>
                    <h1 className={ps.heroTitle}>Заказы</h1>
                  </div>

                  <motion.button
                    type="button"
                    aria-label="Оформить заказ"
                    whileTap={{ scale: 0.92 }}
                    onClick={handleCreateOrder}
                    className={`${s.newOrderButton} ${s.heroCreateButton}`}
                  >
                    <Plus size={20} color="var(--gold-200)" />
                  </motion.button>
                </div>

                <div className={ps.heroMetrics}>
                  <div className={`${ps.metric} ${stats.action > 0 ? ps.metricStrong : ''}`}>
                    <div className={ps.metricLabel}>Ожидают</div>
                    <div className={`${ps.metricValue} ${stats.action > 0 ? ps.metricValueAccent : ''}`}>
                      {stats.action}
                    </div>
                    <div className={ps.metricHint}>Требуют следующего шага</div>
                  </div>
                  <div className={ps.metric}>
                    <div className={ps.metricLabel}>В работе</div>
                    <div className={ps.metricValue}>{stats.active}</div>
                    <div className={ps.metricHint}>Активные процессы</div>
                  </div>
                  <div className={ps.metric}>
                    <div className={ps.metricLabel}>Завершено</div>
                    <div className={ps.metricValue}>{stats.completed}</div>
                    <div className={ps.metricHint}>Готовые материалы</div>
                  </div>
                  <div className={`${ps.metric} ${ps.metricStrong}`}>
                    <div className={ps.metricLabel}>Сумма заказов</div>
                    <div className={`${ps.metricValue} ${ps.metricValueAccent}`}>{formatMoney(stats.totalValue)}</div>
                    <div className={ps.metricHint}>По всей витрине заказов</div>
                  </div>
                </div>
              </div>

              <div className={ps.heroAside}>
                <ActionBanner
                  order={spotlightOrder}
                  payableCount={payableOrders.length}
                  payableTotal={batchPaymentTotal}
                  onOpenOrder={handleOpenOrder}
                  onBatchPay={handleBatchPay}
                />
              </div>
            </div>
          </motion.section>

          <div className={`${ps.surface} ${s.toolbar}`}>
            <div className={s.searchShell}>
              <Search size={16} color="var(--gold-400)" style={{ opacity: 0.45 }} />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Номер, предмет или тема"
                className={s.searchInput}
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  className={s.searchClear}
                  aria-label="Очистить поиск"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className={s.filterRail}>
              {filterItems.map(item => (
                <FilterChip
                  key={item.key}
                  label={item.label}
                  count={item.count}
                  active={filter === item.key}
                  onClick={() => handleFilterChange(item.key)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════ Orders list ═══════ */}
        {loading ? (
          <div className={`${ps.surface} ${s.loadingStack}`}>
            {[1, 2, 3].map(i => <SkeletonOrderCard key={i} />)}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className={ps.surface}>
            <EmptyState
              onCreateOrder={handleCreateOrder}
              hasSearch={Boolean(searchQuery.trim()) || filter !== 'all'}
              onReset={handleReset}
            />
          </div>
        ) : (
          sections.map(section => (
            <section key={section.key} className={`${s.section} ${s.sectionPanel}`}>
              <SectionHeader
                title={section.title}
                count={section.total}
                onOpenAll={section.filterKey && section.total > section.orders.length
                  ? () => handleFilterChange(section.filterKey!)
                  : undefined}
              />
              <div className={s.orderGrid}>
                {section.orders.map((order, i) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={i}
                    onOpenOrder={handleOpenOrder}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default OrdersPage
