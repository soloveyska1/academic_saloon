import {
  CreditCard,
  Gift,
  LucideIcon,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet2,
} from 'lucide-react'
import { Order, OrderStatus, Transaction } from '../../types'
import { getDisplayName } from '../../lib/ranks'

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

export interface OrderActionMeta {
  title: string
  description: string
  button: string
  color: string
  icon: LucideIcon
}

export const ACTIONABLE_ORDER_META: Record<string, OrderActionMeta> = {
  confirmed: {
    title: 'Завершить оплату',
    description: 'После оплаты команда сразу запускает заказ в работу.',
    button: 'Оплатить',
    color: '#d4af37',
    icon: CreditCard,
  },
  waiting_payment: {
    title: 'Завершить оплату',
    description: 'После оплаты команда сразу запускает заказ в работу.',
    button: 'Оплатить',
    color: '#d4af37',
    icon: CreditCard,
  },
  review: {
    title: 'Проверить готовую работу',
    description: 'Откройте заказ, чтобы посмотреть результат.',
    button: 'Проверить',
    color: '#4ade80',
    icon: ShieldCheck,
  },
  revision: {
    title: 'Посмотреть правки',
    description: 'Откройте заказ и подтвердите следующий шаг.',
    button: 'Открыть',
    color: '#fb923c',
    icon: Sparkles,
  },
}

export const TRANSACTION_REASON_LABELS: Record<string, string> = {
  order_created: 'Бонус за новый заказ',
  referral_bonus: 'Реферальный бонус',
  admin_adjustment: 'Корректировка баланса',
  order_discount: 'Оплата бонусами',
  compensation: 'Компенсация',
  order_cashback: 'Кэшбэк за заказ',
  bonus_expired: 'Сгорание бонусов',
  streak_freeze: 'Защита серии',
  coupon: 'Купон',
  promo_code: 'Промокод',
  order_refund: 'Возврат бонусов',
  welcome_bonus: 'Приветственный бонус',
  achievement: 'Награда',
}

const TRANSACTION_REASON_HINTS: Record<string, string> = {
  order_created: 'Начисление за новую заявку',
  referral_bonus: 'Бонус за приглашение',
  admin_adjustment: 'Ручная корректировка',
  order_discount: 'Списано в оплату заказа',
  compensation: 'Начисление от команды',
  order_cashback: 'Начисление после заказа',
  bonus_expired: 'Неиспользованный остаток',
  streak_freeze: 'Списано за защиту серии',
  coupon: 'Активация купона',
  promo_code: 'Активация промокода',
  order_refund: 'Возврат после отмены',
  welcome_bonus: 'Стартовое начисление',
  achievement: 'Награда за активность',
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTING HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

export const prefersReducedMotion =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toSafeNumber(value: number | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatMoney(value: number | null | undefined) {
  return `${Math.max(0, Math.round(toSafeNumber(value))).toLocaleString('ru-RU')} ₽`
}

export function formatCompactDate(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'Без даты'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatMemberSince(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'недавно'
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

export function formatExpiryHint(daysLeft: number | null | undefined) {
  const days = toSafeNumber(daysLeft)
  if (days <= 0) return 'сгорают сегодня'
  if (days === 1) return 'сгорают завтра'
  if (days < 5) return `сгорают через ${days} дня`
  return `сгорают через ${days} дней`
}

export function formatCountWithWord(value: number, one: string, two: string, five: string) {
  const abs = Math.abs(value) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return `${value} ${five}`
  if (last === 1) return `${value} ${one}`
  if (last >= 2 && last <= 4) return `${value} ${two}`
  return `${value} ${five}`
}

export function formatDeadline(deadline: string | null | undefined) {
  const days = getDaysUntilDeadline(deadline)
  if (days === null) return 'Без срока'
  if (days <= 0) return 'Срок прошел'
  if (days === 1) return '1 день'
  if (days < 5) return `${days} дня`
  if (days < 21) return `${days} дней`
  return formatCompactDate(deadline)
}

/* ═══════════════════════════════════════════════════════════════════════════
   RANK & ORDER HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

export function getProfileRankName(rankName: string | null | undefined) {
  const mapped = getDisplayName(rankName || '')
  if (!mapped || mapped.trim() === '') return 'Статус клиента'
  return mapped === 'Премиум' ? 'Премиум клуб' : mapped
}

export function getMemberSince(orders: Order[], createdAt?: string | null) {
  if (createdAt) return createdAt
  const oldestOrder = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0]
  if (oldestOrder) return oldestOrder.created_at
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
}

export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function getOrderDisplayTitle(order: Order) {
  return order.topic?.trim() || order.subject?.trim() || order.work_type_label || `Заказ #${order.id}`
}

export function getRemainingAmount(order: Order) {
  return Math.max((order.final_price || order.price || 0) - (order.paid_amount || 0), 0)
}

export function getPrimaryOrderPath(order: Order) {
  if (order.status === 'confirmed' || order.status === 'waiting_payment') {
    return `/order/${order.id}?action=pay`
  }
  return `/order/${order.id}`
}

export function getActionableOrder(orders: Order[]): Order | null {
  const priorityMap: Record<OrderStatus, number> = {
    confirmed: 1,
    waiting_payment: 1,
    review: 2,
    revision: 3,
    pending: 4,
    waiting_estimation: 4,
    verification_pending: 5,
    paid: 6,
    paid_full: 6,
    in_progress: 6,
    completed: 9,
    cancelled: 10,
    rejected: 10,
    draft: 11,
  }

  return (
    [...orders]
      .filter((order) => Boolean(ACTIONABLE_ORDER_META[order.status]))
      .sort((a, b) => {
        const aPriority = priorityMap[a.status]
        const bPriority = priorityMap[b.status]
        if (aPriority !== bPriority) return aPriority - bPriority
        const aDeadline = getDaysUntilDeadline(a.deadline) ?? 999
        const bDeadline = getDaysUntilDeadline(b.deadline) ?? 999
        return aDeadline - bDeadline
      })[0] || null
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSACTION PRESENTATION
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TransactionVisual {
  icon: LucideIcon
  iconColor: string
  iconBackground: string
  iconBorder: string
  amountColor: string
  title: string
  subtitle: string
}

const CREDIT_VISUALS: Record<string, { icon: LucideIcon; color: string; background: string; border: string }> = {
  order_cashback: { icon: Wallet2, color: '#93c5fd', background: 'rgba(147, 197, 253, 0.12)', border: 'rgba(147, 197, 253, 0.20)' },
  referral_bonus: { icon: Users, color: '#c4b5fd', background: 'rgba(196, 181, 253, 0.12)', border: 'rgba(196, 181, 253, 0.20)' },
  compensation: { icon: Sparkles, color: '#f9a8d4', background: 'rgba(249, 168, 212, 0.12)', border: 'rgba(249, 168, 212, 0.20)' },
  welcome_bonus: { icon: Gift, color: '#86efac', background: 'rgba(134, 239, 172, 0.12)', border: 'rgba(134, 239, 172, 0.20)' },
}

const DEFAULT_CREDIT_VISUAL = { icon: Wallet2, color: '#86efac', background: 'rgba(134, 239, 172, 0.12)', border: 'rgba(134, 239, 172, 0.20)' }

export function getTransactionPresentation(transaction: Transaction): TransactionVisual {
  if (transaction.type === 'debit') {
    return {
      icon: CreditCard,
      iconColor: '#fbbf24',
      iconBackground: 'rgba(251, 191, 36, 0.12)',
      iconBorder: 'rgba(251, 191, 36, 0.22)',
      amountColor: '#fbbf24',
      title: transaction.description?.trim() || TRANSACTION_REASON_LABELS[transaction.reason] || 'Списание бонусов',
      subtitle: `${formatCompactDate(transaction.created_at)} • ${TRANSACTION_REASON_HINTS[transaction.reason] || 'Списание'}`,
    }
  }

  const visual = CREDIT_VISUALS[transaction.reason] || DEFAULT_CREDIT_VISUAL

  return {
    icon: visual.icon,
    iconColor: visual.color,
    iconBackground: visual.background,
    iconBorder: visual.border,
    amountColor: visual.color,
    title: transaction.description?.trim() || TRANSACTION_REASON_LABELS[transaction.reason] || 'Начисление бонусов',
    subtitle: `${formatCompactDate(transaction.created_at)} • ${TRANSACTION_REASON_HINTS[transaction.reason] || 'Начисление'}`,
  }
}
