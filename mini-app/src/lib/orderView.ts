import type { Order, OrderDeliveryBatch, OrderRevisionRound, OrderStatus } from '../types'

export type OrderLike = Partial<Order> | null | undefined

/** Strip emoji characters from API labels (e.g. "🎩 Магистерская" → "Магистерская") */
export const stripEmoji = (text: string): string =>
  text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()

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
  'paid',
  'paid_full',
  'in_progress',
  'paused',
  'review',
  'revision',
  'completed',
  'cancelled',
  'rejected',
])

const KNOWN_WORK_TYPES = new Set(Object.keys(ORDER_WORK_TYPE_LABELS))
const ORDER_STATUS_ALIASES: Readonly<Record<string, OrderStatus>> = {
  confirmed: 'waiting_payment',
}

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

export function canonicalizeOrderStatusAlias(value: unknown): string | null {
  const safeValue = toSafeString(value)?.toLowerCase()
  if (!safeValue) return null
  return ORDER_STATUS_ALIASES[safeValue] ?? safeValue
}

export function normalizeOrderStatus(value: unknown): OrderStatus {
  const safeValue = canonicalizeOrderStatusAlias(value) as OrderStatus | undefined
  if (!safeValue || !KNOWN_ORDER_STATUSES.has(safeValue)) {
    return 'pending'
  }

  return safeValue
}

export function isAwaitingPaymentStatus(value: unknown): boolean {
  return canonicalizeOrderStatusAlias(value) === 'waiting_payment'
}

export function canBatchPayOrderStatus(value: unknown): boolean {
  const status = canonicalizeOrderStatusAlias(value)
  return status === 'waiting_payment' || status === 'paid' || status === 'in_progress' || status === 'review'
}

export function normalizeWorkType(value: unknown): string {
  const safeValue = toSafeString(value)?.toLowerCase()
  return safeValue && KNOWN_WORK_TYPES.has(safeValue) ? safeValue : 'other'
}

function normalizeRevisionRound(value: unknown): OrderRevisionRound | null {
  if (!value || typeof value !== 'object') return null
  const round = value as Partial<OrderRevisionRound>
  const roundNumber = Math.max(0, Math.trunc(toSafeNumber(round.round_number, 0)))

  return {
    id: Math.max(0, Math.trunc(toSafeNumber(round.id, 0))),
    round_number: roundNumber,
    status: toSafeString(round.status) || 'open',
    initial_comment: toSafeString(round.initial_comment),
    requested_at: toSafeIsoString(round.requested_at),
    last_client_activity_at: toSafeIsoString(round.last_client_activity_at),
    closed_at: toSafeIsoString(round.closed_at),
    closed_by_delivery_batch_id: Math.max(0, Math.trunc(toSafeNumber(round.closed_by_delivery_batch_id, 0))) || null,
    requested_by_user_id: Math.max(0, Math.trunc(toSafeNumber(round.requested_by_user_id, 0))) || null,
  }
}

function normalizeRevisionHistory(values: unknown): OrderRevisionRound[] {
  if (!Array.isArray(values)) return []

  const seenIds = new Set<number>()
  return values
    .map(item => normalizeRevisionRound(item))
    .filter((item): item is OrderRevisionRound => item !== null)
    .filter((item) => {
      if (!item.id) return true
      if (seenIds.has(item.id)) return false
      seenIds.add(item.id)
      return true
    })
    .sort((a, b) => {
      if (b.round_number !== a.round_number) return b.round_number - a.round_number
      const aDate = parseOrderDateSafe(a.requested_at)?.getTime() ?? 0
      const bDate = parseOrderDateSafe(b.requested_at)?.getTime() ?? 0
      return bDate - aDate
    })
}

export function normalizeOrder(order: OrderLike, index = 0): Order {
  const safeOrder = order && typeof order === 'object' ? order : {}
  const normalizedWorkType = normalizeWorkType((safeOrder as Partial<Order>).work_type)
  const pausedFromStatusRaw = toSafeString((safeOrder as Partial<Order>).paused_from_status)
  const pausedFromStatus = pausedFromStatusRaw ? normalizeOrderStatus(pausedFromStatusRaw) : null
  const normalizeDeliveryBatch = (value: unknown): OrderDeliveryBatch | null => {
    if (!value || typeof value !== 'object') return null
    const batch = value as Partial<OrderDeliveryBatch>
    return {
      id: Math.max(0, Math.trunc(toSafeNumber(batch.id, 0))),
      status: toSafeString(batch.status) || 'sent',
      version_number: Math.max(0, Math.trunc(toSafeNumber(batch.version_number, 0))) || null,
      revision_count_snapshot: Math.max(0, Math.trunc(toSafeNumber(batch.revision_count_snapshot, 0))),
      manager_comment: toSafeString(batch.manager_comment),
      source: toSafeString(batch.source),
      files_url: toSafeString(batch.files_url),
      file_count: Math.max(0, Math.trunc(toSafeNumber(batch.file_count, 0))),
      created_at: toSafeIsoString(batch.created_at),
      sent_at: toSafeIsoString(batch.sent_at),
    }
  }
  const normalizedLatestDelivery = normalizeDeliveryBatch((safeOrder as Partial<Order>).latest_delivery)
  const normalizedDeliveryHistory = Array.isArray((safeOrder as Partial<Order>).delivery_history)
    ? ((safeOrder as Partial<Order>).delivery_history as unknown[])
        .map(item => normalizeDeliveryBatch(item))
        .filter((item): item is OrderDeliveryBatch => item !== null)
    : []
  const normalizedCurrentRevisionRound = normalizeRevisionRound((safeOrder as Partial<Order>).current_revision_round)
  const normalizedRevisionHistory = normalizeRevisionHistory((safeOrder as Partial<Order>).revision_history)
  const mergedRevisionHistory = normalizedCurrentRevisionRound && normalizedCurrentRevisionRound.id
    ? [
        normalizedCurrentRevisionRound,
        ...normalizedRevisionHistory.filter(round => round.id !== normalizedCurrentRevisionRound.id),
      ]
    : normalizedRevisionHistory

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
    work_type_label: stripEmoji(toSafeString((safeOrder as Partial<Order>).work_type_label) || ORDER_WORK_TYPE_LABELS[normalizedWorkType]),
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
    paused_from_status: pausedFromStatus,
    pause_started_at: toSafeIsoString((safeOrder as Partial<Order>).pause_started_at),
    pause_until: toSafeIsoString((safeOrder as Partial<Order>).pause_until),
    pause_reason: toSafeString((safeOrder as Partial<Order>).pause_reason),
    pause_days_used: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).pause_days_used, 0))),
    pause_available_days: Math.max(0, Math.trunc(toSafeNumber((safeOrder as Partial<Order>).pause_available_days, 0))),
    can_pause: toSafeBoolean((safeOrder as Partial<Order>).can_pause),
    can_resume: toSafeBoolean((safeOrder as Partial<Order>).can_resume),
    completed_at: toSafeIsoString((safeOrder as Partial<Order>).completed_at),
    delivered_at: toSafeIsoString((safeOrder as Partial<Order>).delivered_at),
    latest_delivery: normalizedLatestDelivery,
    delivery_history: normalizedDeliveryHistory,
    current_revision_round: normalizedCurrentRevisionRound,
    revision_history: mergedRevisionHistory,
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
  const wtl = toSafeString(order.work_type_label)
  return toSafeString(order.topic) || toSafeString(order.subject) || (wtl ? stripEmoji(wtl) : null) || `Заказ #${order.id}`
}

export function getOrderDisplaySubtitle(order: Order): string {
  const topic = toSafeString(order.topic)
  const subject = toSafeString(order.subject)
  const wtl = toSafeString(order.work_type_label)

  const parts = [
    topic && subject && topic !== subject ? subject : null,
    wtl ? stripEmoji(wtl) : null,
  ].filter(Boolean)

  return parts.join(' • ') || `Заказ #${order.id}`
}

export function getOrderHeadlineSafe(order: Order): string {
  const topic = toSafeString(order.topic)
  const subject = toSafeString(order.subject)
  // Fallback if topic is too short or garbled (< 3 chars)
  const headline = topic && topic.length >= 3 ? topic : subject && subject.length >= 3 ? subject : null
  return headline || toSafeString(order.work_type_label) || 'Тема уточняется'
}

export function getOpenRevisionRound(order: OrderLike): OrderRevisionRound | null {
  if (!order || typeof order !== 'object') return null

  const normalizedRound = normalizeRevisionRound((order as Partial<Order>).current_revision_round)
  return normalizedRound?.status === 'open' ? normalizedRound : null
}

export function hasOpenRevisionRound(order: OrderLike): boolean {
  return getOpenRevisionRound(order) !== null
}

export function getEffectiveOrderStatus(order: OrderLike): OrderStatus | null {
  if (!order || typeof order !== 'object') return null
  if (getOpenRevisionRound(order)) return 'revision'
  return normalizeOrderStatus((order as Partial<Order>).status)
}

export function getLatestDeliveryBatch(order: OrderLike): OrderDeliveryBatch | null {
  if (!order || typeof order !== 'object') return null

  return (order as Partial<Order>).latest_delivery ?? (order as Partial<Order>).delivery_history?.[0] ?? null
}

export function getOrderSublineSafe(order: Order): string {
  const parts: string[] = []
  const wtl = toSafeString(order.work_type_label)
  const subject = toSafeString(order.subject)
  const headline = getOrderHeadlineSafe(order)

  if (wtl) {
    parts.push(stripEmoji(wtl))
  }

  if (subject && subject !== headline) {
    parts.push(`Предмет: ${subject}`)
  }

  return parts.join(' • ') || 'Все детали можно уточнить в чате заказа'
}
