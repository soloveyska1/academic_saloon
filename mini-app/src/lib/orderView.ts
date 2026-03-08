import type { Order, OrderStatus } from '../types'

export type OrderLike = Partial<Order> | null | undefined

export const ORDER_WORK_TYPE_LABELS: Record<string, string> = {
  masters: 'Магистерская',
  diploma: 'Дипломная',
  coursework: 'Курсовая',
  practice: 'Практика',
  essay: 'Эссе',
  presentation: 'Презентация',
  control: 'Контрольная',
  independent: 'Самостоятельная',
  report: 'Реферат',
  photo_task: 'Фото задания',
  other: 'Заказ',
}

export const KNOWN_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'draft',
  'pending',
  'waiting_estimation',
  'waiting_payment',
  'verification_pending',
  'confirmed',
  'paid',
  'paid_full',
  'in_progress',
  'review',
  'revision',
  'completed',
  'cancelled',
  'rejected',
])

const KNOWN_WORK_TYPES = new Set(Object.keys(ORDER_WORK_TYPE_LABELS))

export function toSafeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

export function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'))
    if (Number.isFinite(normalized)) {
      return normalized
    }
  }

  return fallback
}

export function toSafeBoolean(value: unknown): boolean {
  return value === true
}

export function parseOrderDateSafe(value: unknown): Date | null {
  const safeValue = toSafeString(value)
  if (!safeValue) return null

  const parsed = new Date(safeValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function toSafeIsoString(value: unknown, fallback: string | null = null): string | null {
  const parsed = parseOrderDateSafe(value)
  if (!parsed) return fallback
  return parsed.toISOString()
}

export function formatOrderTimelineDateSafe(value: unknown): string | undefined {
  const parsed = parseOrderDateSafe(value)
  if (!parsed) return undefined

  return parsed.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatOrderDeadlineRu(value: unknown): string {
  const safeValue = toSafeString(value)
  if (!safeValue) return ''

  const lower = safeValue.toLowerCase().trim()

  if (lower === 'today' || lower === 'сегодня') return 'Сегодня'
  if (lower === 'tomorrow' || lower === 'завтра') return 'Завтра'
  if (lower === 'yesterday' || lower === 'вчера') return 'Вчера'
  if (lower === '3days') return '2-3 дня'
  if (lower === 'week') return 'Неделя'
  if (lower === '2weeks') return '2 недели'
  if (lower === 'month') return 'Месяц+'

  const parsed = parseOrderDateSafe(safeValue)
  if (!parsed) return safeValue

  return parsed.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export function normalizeOrderStatus(value: unknown): OrderStatus {
  const safeValue = toSafeString(value)?.toLowerCase() as OrderStatus | undefined
  return safeValue && KNOWN_ORDER_STATUSES.has(safeValue) ? safeValue : 'pending'
}

export function normalizeWorkType(value: unknown): string {
  const safeValue = toSafeString(value)?.toLowerCase()
  return safeValue && KNOWN_WORK_TYPES.has(safeValue) ? safeValue : 'other'
}

export function normalizeOrder(order: OrderLike, index = 0): Order {
  const safeOrder = order && typeof order === 'object' ? order : {}
  const normalizedWorkType = normalizeWorkType((safeOrder as Partial<Order>).work_type)

  return {
    id: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).id, index + 1))),
    user_id: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).user_id, 0))),
    subject: toSafeString((safeOrder as Partial<Order>).subject),
    topic: toSafeString((safeOrder as Partial<Order>).topic),
    deadline: toSafeString((safeOrder as Partial<Order>).deadline),
    status: normalizeOrderStatus((safeOrder as Partial<Order>).status),
    price: toSafeNumber((safeOrder as Partial<Order>).price, 0),
    paid_amount: toSafeNumber((safeOrder as Partial<Order>).paid_amount, 0),
    discount: toSafeNumber((safeOrder as Partial<Order>).discount, 0),
    promo_code: toSafeString((safeOrder as Partial<Order>).promo_code),
    promo_discount: toSafeNumber((safeOrder as Partial<Order>).promo_discount, 0),
    created_at: toSafeIsoString((safeOrder as Partial<Order>).created_at, new Date(0).toISOString()) || new Date(0).toISOString(),
    updated_at: toSafeIsoString((safeOrder as Partial<Order>).updated_at),
    files_url: toSafeString((safeOrder as Partial<Order>).files_url),
    description: toSafeString((safeOrder as Partial<Order>).description),
    work_type: normalizedWorkType,
    work_type_label: toSafeString((safeOrder as Partial<Order>).work_type_label) || ORDER_WORK_TYPE_LABELS[normalizedWorkType],
    final_price: toSafeNumber(
      (safeOrder as Partial<Order>).final_price,
      toSafeNumber((safeOrder as Partial<Order>).price, 0)
    ),
    progress: Math.max(0, Math.min(100, Math.round(toSafeNumber((safeOrder as Partial<Order>).progress, 0)))),
    bonus_used: toSafeNumber((safeOrder as Partial<Order>).bonus_used, 0),
    payment_scheme:
      (safeOrder as Partial<Order>).payment_scheme === 'half' || (safeOrder as Partial<Order>).payment_scheme === 'full'
        ? (safeOrder as Partial<Order>).payment_scheme
        : null,
    revision_count: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).revision_count, 0))),
    completed_at: toSafeIsoString((safeOrder as Partial<Order>).completed_at),
    delivered_at: toSafeIsoString((safeOrder as Partial<Order>).delivered_at),
    fullname: toSafeString((safeOrder as Partial<Order>).fullname) || undefined,
    username: toSafeString((safeOrder as Partial<Order>).username),
    telegram_id: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).telegram_id, 0))) || undefined,
    review_submitted: toSafeBoolean((safeOrder as Partial<Order>).review_submitted),
    is_archived: toSafeBoolean((safeOrder as Partial<Order>).is_archived),
  }
}

export function normalizeOrders(orders: OrderLike[] | null | undefined): Order[] {
  if (!Array.isArray(orders)) return []
  return orders.map((order, index) => normalizeOrder(order, index))
}

export function getOrderDisplayTitle(order: Order): string {
  return toSafeString(order.topic) || toSafeString(order.subject) || toSafeString(order.work_type_label) || `Заказ #${order.id}`
}

export function getOrderDisplaySubtitle(order: Order): string {
  const topic = toSafeString(order.topic)
  const subject = toSafeString(order.subject)

  const parts = [
    topic && subject && topic !== subject ? subject : null,
    toSafeString(order.work_type_label),
  ].filter(Boolean)

  return parts.join(' • ') || `Заказ #${order.id}`
}

export function getOrderHeadlineSafe(order: Order): string {
  return toSafeString(order.topic) || toSafeString(order.subject) || 'Тема уточняется в заявке'
}

export function getOrderSublineSafe(order: Order): string {
  const parts: string[] = []
  const workTypeLabel = toSafeString(order.work_type_label)
  const subject = toSafeString(order.subject)
  const headline = getOrderHeadlineSafe(order)

  if (workTypeLabel) {
    parts.push(workTypeLabel)
  }

  if (subject && subject !== headline) {
    parts.push(`Предмет: ${subject}`)
  }

  return parts.join(' • ') || 'Все детали можно уточнить в чате заказа'
}
