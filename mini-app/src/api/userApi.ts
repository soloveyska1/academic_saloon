import {
  UserData, PromoResult, Order,
  OrderCreateRequest, ChatMessagesResponse, ChatMessage, OrderDeliveryBatch,
  SendMessageResponse, AdminUser, AdminStats, AdminSqlResponse
} from '../types'

// Response type for order creation
export interface OrderCreateResponse {
  success: boolean
  order_id: number
  message: string
  price?: number
  is_manual_required?: boolean
  promo_applied?: boolean
  promo_failed?: boolean
  promo_failure_reason?: string | null
}

// Development flag
const IS_DEV = import.meta.env.DEV || false
export const DEFAULT_OFFER_URL = 'https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26-3'
export const DEFAULT_PRIVACY_POLICY_URL = 'https://telegra.ph/Politika-obrabotki-personalnyh-dannyh-servisa-Akademicheskij-Salon-03-26-2'
export const DEFAULT_EXECUTOR_INFO_URL = 'https://telegra.ph/Svedeniya-ob-ispolnitele-servisa-Akademicheskij-Salon-03-26-2'
export const DEFAULT_LEGAL_HUB_URL = 'https://telegra.ph/Pravovye-dokumenty-servisa-Akademicheskij-Salon-03-26-2'
const LEGACY_OFFER_URLS = new Set([
  'https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-03-25',
  'https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30',
  'https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26',
  'https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26-2',
])
const LEGACY_PRIVACY_POLICY_URLS = new Set([
  'https://telegra.ph/Politika-obrabotki-personalnyh-dannyh-servisa-Akademicheskij-Salon-03-26',
])
const LEGACY_EXECUTOR_INFO_URLS = new Set([
  'https://telegra.ph/Svedeniya-ob-ispolnitele-servisa-Akademicheskij-Salon-03-26',
])
const LEGACY_LEGAL_HUB_URLS = new Set([
  'https://telegra.ph/Pravovye-dokumenty-servisa-Akademicheskij-Salon-03-26',
])

// Known production API host — used as fallback when VITE_API_URL is not set
const PRODUCTION_API_URL = 'https://academic-saloon.duckdns.org/api'

// API base URL — normalized to ensure /api suffix is always present
function normalizeApiBase(rawUrl?: string): string {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://academic-saloon.vercel.app'
  const fallback = IS_DEV ? 'http://localhost:8000/api' : PRODUCTION_API_URL
  const candidate = (rawUrl || '').trim() || fallback

  try {
    // Support relative values like "/api" or "/backend" from Vite env
    if (candidate.startsWith('/')) {
      const rel = new URL(candidate, browserOrigin)
      const cleanPath = rel.pathname.replace(/\/+$/, '')
      rel.pathname = cleanPath.endsWith('/api') ? '/api' : `${cleanPath}/api`
      rel.search = ''
      rel.hash = ''
      return rel.toString().replace(/\/$/, '')
    }

    const url = new URL(candidate)

    // Ensure pathname ends with /api exactly once
    const cleanPath = url.pathname.replace(/\/+$/, '')
    url.pathname = cleanPath.endsWith('/api') ? '/api' : `${cleanPath}/api`
    url.search = ''
    url.hash = ''

    // Remove trailing slash for consistency
    const normalized = url.toString().replace(/\/$/, '')
    return normalized
  } catch {
    return fallback
  }
}

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_URL)

// Derived WebSocket endpoint (ws/wss) that follows the configured API host
export const API_WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws'

// Helpers
function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

function hasTelegramContext(): boolean {
  return !!getInitData()
}

export function getAuthHeaders(): Record<string, string> {
  return {
    'X-Telegram-Init-Data': getInitData()
  }
}

export function isBrowserPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  if (hasTelegramContext()) return false

  const params = new URLSearchParams(window.location.search)
  if (params.get('preview') === '1') return true
  if (import.meta.env.DEV) return true

  return window.location.hostname.endsWith('.vercel.app')
}

function clonePreviewValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function previewNow(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

interface PreviewState {
  orders: Order[]
  orderMessages: Record<number, ChatMessagesResponse>
  supportMessages: ChatMessagesResponse
  nextMessageId: number
  nextOrderId: number
  dailyBonusStreak: number
  dailyBonusBalance: number
}

function createPreviewOrders(): Order[] {
  const reviewDelivery: OrderDeliveryBatch = {
    id: 5001,
    status: 'sent',
    version_number: 3,
    revision_count_snapshot: 2,
    manager_comment: 'Обновили оформление, список литературы и выводы по замечаниям.',
    source: 'topic',
    files_url: 'https://disk.yandex.ru/mock/review-order-v3',
    file_count: 4,
    created_at: previewNow(-380),
    sent_at: previewNow(-360),
  }

  const previousDelivery: OrderDeliveryBatch = {
    id: 5000,
    status: 'sent',
    version_number: 2,
    revision_count_snapshot: 1,
    manager_comment: 'Первая исправленная версия.',
    source: 'api',
    files_url: 'https://disk.yandex.ru/mock/review-order-v2',
    file_count: 3,
    created_at: previewNow(-1200),
    sent_at: previewNow(-1180),
  }

  return [
    {
      id: 101,
      user_id: 0,
      subject: 'История государства и права',
      topic: 'Сравнение судебных реформ XIX века',
      deadline: '2026-04-14',
      status: 'review',
      price: 8900,
      paid_amount: 8900,
      discount: 10,
      promo_code: 'SALON10',
      promo_discount: 10,
      created_at: previewNow(-7200),
      updated_at: previewNow(-240),
      files_url: 'https://disk.yandex.ru/mock/review-order-folder',
      description: 'Проверить оформление, финальные выводы и список источников.',
      work_type: 'coursework',
      work_type_label: '📚 Курсовая',
      final_price: 8900,
      progress: 100,
      bonus_used: 300,
      payment_scheme: 'full',
      revision_count: 2,
      delivered_at: previewNow(-360),
      latest_delivery: reviewDelivery,
      delivery_history: [reviewDelivery, previousDelivery],
      review_submitted: false,
      is_archived: false,
    },
    {
      id: 102,
      user_id: 0,
      subject: 'Маркетинг',
      topic: 'Анализ продвижения бренда в digital-среде',
      deadline: '2026-04-18',
      status: 'in_progress',
      price: 12600,
      paid_amount: 6300,
      discount: 12,
      created_at: previewNow(-8200),
      updated_at: previewNow(-60),
      files_url: 'https://disk.yandex.ru/mock/in-progress-order-folder',
      description: 'Нужен аккуратный аналитический блок и выводы по воронке.',
      work_type: 'diploma',
      work_type_label: '🎓 Диплом',
      final_price: 12600,
      progress: 72,
      bonus_used: 0,
      payment_scheme: 'half',
      revision_count: 0,
      review_submitted: false,
      is_archived: false,
    },
    {
      id: 103,
      user_id: 0,
      subject: 'Менеджмент',
      topic: 'Организационная структура IT-компании',
      deadline: '2026-04-16',
      status: 'waiting_payment',
      price: 5400,
      paid_amount: 0,
      discount: 8,
      created_at: previewNow(-4200),
      updated_at: previewNow(-180),
      files_url: null,
      description: 'После согласования цены перейти к оплате.',
      work_type: 'essay',
      work_type_label: '📝 Эссе',
      final_price: 5400,
      progress: 0,
      bonus_used: 0,
      payment_scheme: null,
      revision_count: 0,
      review_submitted: false,
      is_archived: false,
    },
    {
      id: 104,
      user_id: 0,
      subject: 'Философия',
      topic: 'Экзистенциализм в работах Камю',
      deadline: '2026-03-21',
      status: 'completed',
      price: 3200,
      paid_amount: 3200,
      discount: 5,
      created_at: previewNow(-40000),
      updated_at: previewNow(-25000),
      completed_at: previewNow(-24000),
      delivered_at: previewNow(-25020),
      files_url: 'https://disk.yandex.ru/mock/completed-order-folder',
      description: 'Завершённый заказ для истории.',
      work_type: 'report',
      work_type_label: '📄 Реферат',
      final_price: 3200,
      progress: 100,
      bonus_used: 0,
      payment_scheme: 'full',
      revision_count: 1,
      review_submitted: true,
      is_archived: false,
      latest_delivery: {
        id: 5002,
        status: 'sent',
        version_number: 1,
        revision_count_snapshot: 0,
        manager_comment: 'Финальная сдача.',
        source: 'topic',
        files_url: 'https://disk.yandex.ru/mock/completed-order-v1',
        file_count: 2,
        created_at: previewNow(-25050),
        sent_at: previewNow(-25020),
      },
      delivery_history: [],
    },
  ]
}

function createPreviewOrderMessages(orderId: number): ChatMessagesResponse {
  if (orderId === 101) {
    return {
      order_id: 101,
      unread_count: 0,
      messages: [
        {
          id: 9001,
          sender_type: 'admin',
          sender_name: 'Менеджер',
          message_text: 'Отправили новую версию. Посмотрите оформление и выводы.',
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: previewNow(-360),
          is_read: true,
        },
        {
          id: 9002,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: 'Посмотрю вечером и напишу, если нужно ещё поправить.',
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: previewNow(-300),
          is_read: true,
        },
      ],
    }
  }

  if (orderId === 102) {
    return {
      order_id: 102,
      unread_count: 0,
      messages: [
        {
          id: 9101,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: 'Можно добавить ещё один кейс по performance-маркетингу?',
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: previewNow(-140),
          is_read: false,
        },
      ],
    }
  }

  return {
    order_id: orderId,
    unread_count: 0,
    messages: [],
  }
}

function createPreviewState(): PreviewState {
  const orders = createPreviewOrders()
  return {
    orders,
    orderMessages: Object.fromEntries(orders.map(order => [order.id, createPreviewOrderMessages(order.id)])),
    supportMessages: {
      order_id: 700,
      unread_count: 0,
      messages: [
        {
          id: 9901,
          sender_type: 'admin',
          sender_name: 'Поддержка',
          message_text: 'Это browser preview. Реальные сообщения будут доступны внутри Telegram.',
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: previewNow(-90),
          is_read: true,
        },
      ],
    },
    nextMessageId: 10000,
    nextOrderId: 1000,
    dailyBonusStreak: 5,
    dailyBonusBalance: 1480,
  }
}

let previewState: PreviewState | null = null

function getPreviewState(): PreviewState {
  if (!previewState) {
    previewState = createPreviewState()
  }
  return previewState
}

function getPreviewOrderOrThrow(orderId: number): Order {
  const order = getPreviewState().orders.find(item => item.id === orderId)
  if (!order) {
    throw new Error('Заказ не найден')
  }
  return order
}

function buildPreviewUserData(): UserData {
  const state = getPreviewState()
  return {
    id: 0,
    telegram_id: 0,
    created_at: previewNow(-60000),
    terms_accepted_at: previewNow(-59000),
    has_accepted_terms: true,
    username: 'preview_client',
    fullname: 'Preview Client',
    balance: 0,
    bonus_balance: state.dailyBonusBalance,
    transactions: [
      {
        id: 1,
        amount: 600,
        type: 'credit',
        reason: 'cashback',
        description: 'Кешбэк за завершённый заказ',
        created_at: previewNow(-26000),
      },
      {
        id: 2,
        amount: 300,
        type: 'debit',
        reason: 'bonus',
        description: 'Списание бонусов при оплате',
        created_at: previewNow(-8000),
      },
    ],
    orders_count: state.orders.length,
    total_spent: 30200,
    rank: {
      name: 'Золотой',
      emoji: '✦',
      level: 3,
      cashback: 7,
      bonus: 'Приоритетный канал',
      next_rank: 'Платиновый',
      progress: 68,
      spent_to_next: 9700,
      is_max: false,
    },
    loyalty: {
      status: 'Gold',
      emoji: '✦',
      level: 3,
      discount: 12,
      orders_to_next: 2,
    },
    bonus_expiry: {
      has_expiry: true,
      balance: state.dailyBonusBalance,
      days_left: 16,
      expiry_date: previewNow(16 * 24 * 60),
      burn_amount: 120,
      status: 'warning',
      status_text: 'Часть бонусов сгорит через 16 дней',
      color: '#f59e0b',
    },
    discount: 12,
    referral_code: 'PREVIEW10',
    referrals_count: 3,
    referral_earnings: 1900,
    referral_percent: 5,
    referral_next_percent: 7,
    referral_refs_to_next: 2,
    achievements: [
      {
        key: 'first_order',
        title: 'Первый заказ',
        description: 'Первое успешно оформленное задание',
        icon: 'sparkles',
        rarity: 'common',
        reward_amount: 100,
        unlocked: true,
        unlocked_at: previewNow(-50000),
        progress: 100,
        current: 1,
        target: 1,
        hint: null,
        owners_percent: 82,
        sort_order: 1,
      },
    ],
    orders: clonePreviewValue(state.orders),
    daily_luck_available: true,
    daily_bonus_streak: state.dailyBonusStreak,
    streak_freeze_count: 1,
    free_spins: 0,
    roulette_onboarding_seen: true,
  }
}

function buildPreviewPaymentInfo(order: Order) {
  const finalPrice = order.final_price || order.price
  const paidAmount = order.paid_amount || 0
  return {
    order_id: order.id,
    status: order.status,
    price: order.price,
    final_price: finalPrice,
    discount: order.discount || 0,
    bonus_used: order.bonus_used || 0,
    paid_amount: paidAmount,
    remaining: Math.max(finalPrice - paidAmount, 0),
    card_number: '4276 3800 0000 0000',
    card_holder: 'ACADEMIC SALOON',
    sbp_phone: '+7 (999) 123-45-67',
    sbp_bank: 'Тинькофф / Сбер / Альфа',
  }
}

function pushPreviewMessage(target: ChatMessagesResponse, message: ChatMessage) {
  target.messages = [...target.messages, message]
}

function nextPreviewMessageId(): number {
  const state = getPreviewState()
  state.nextMessageId += 1
  return state.nextMessageId
}

async function mockApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = new URL(endpoint, 'https://preview.local')
  const pathname = url.pathname
  const method = (options.method || 'GET').toUpperCase()
  const state = getPreviewState()

  if (pathname === '/config') {
    return clonePreviewValue({
      bot_username: 'Kladovaya_GIPSR_bot',
      support_username: 'academicsaloon',
      offer_url: DEFAULT_OFFER_URL,
      privacy_policy_url: DEFAULT_PRIVACY_POLICY_URL,
      executor_info_url: DEFAULT_EXECUTOR_INFO_URL,
      legal_hub_url: DEFAULT_LEGAL_HUB_URL,
    }) as T
  }

  if (pathname === '/user') {
    return clonePreviewValue(buildPreviewUserData()) as T
  }

  if (pathname === '/user/accept-terms' && method === 'POST') {
    return { success: true, accepted_at: previewNow() } as T
  }

  if (pathname === '/orders' && method === 'GET') {
    const status = url.searchParams.get('status')
    const orders = state.orders.filter(order => {
      if (!status) return !order.is_archived
      if (status === 'active') return !['completed', 'cancelled', 'rejected'].includes(order.status)
      if (status === 'completed') return order.status === 'completed'
      return order.status === status
    })
    return { orders: clonePreviewValue(orders) } as T
  }

  if (pathname === '/orders/create' && method === 'POST') {
    const body = JSON.parse(String(options.body || '{}')) as OrderCreateRequest
    state.nextOrderId += 1
    const orderId = state.nextOrderId
    const newOrder: Order = {
      id: orderId,
      user_id: 0,
      subject: body.subject,
      topic: body.topic || body.subject,
      deadline: body.deadline,
      status: 'waiting_payment',
      price: 6400,
      paid_amount: 0,
      discount: 12,
      created_at: previewNow(),
      updated_at: previewNow(),
      files_url: null,
      description: body.description || null,
      work_type: body.work_type,
      work_type_label: body.work_type,
      final_price: 6400,
      progress: 0,
      bonus_used: 0,
      payment_scheme: null,
      revision_count: 0,
      review_submitted: false,
      is_archived: false,
      promo_code: body.promo_code || null,
      promo_discount: body.promo_code ? 10 : 0,
    }
    state.orders = [newOrder, ...state.orders]
    state.orderMessages[orderId] = { order_id: orderId, messages: [], unread_count: 0 }
    return {
      success: true,
      order_id: orderId,
      message: `Заказ #${orderId} создан в preview-режиме`,
      price: newOrder.final_price,
      is_manual_required: false,
      promo_applied: Boolean(body.promo_code),
      promo_failed: false,
      promo_failure_reason: null,
    } as T
  }

  if (pathname === '/payments/create' && method === 'POST') {
    return {
      success: false,
      payment_url: null,
      payment_id: null,
      amount: 0,
      error: 'Онлайн-оплата в browser preview отключена',
    } as T
  }

  const orderMatch = pathname.match(/^\/orders\/(\d+)$/)
  if (orderMatch && method === 'GET') {
    return clonePreviewValue(getPreviewOrderOrThrow(Number(orderMatch[1]))) as T
  }

  const paymentInfoMatch = pathname.match(/^\/orders\/(\d+)\/payment-info$/)
  if (paymentInfoMatch && method === 'GET') {
    return clonePreviewValue(buildPreviewPaymentInfo(getPreviewOrderOrThrow(Number(paymentInfoMatch[1])))) as T
  }

  const messagesMatch = pathname.match(/^\/orders\/(\d+)\/messages$/)
  if (messagesMatch && method === 'GET') {
    return clonePreviewValue(state.orderMessages[Number(messagesMatch[1])] || { order_id: Number(messagesMatch[1]), messages: [], unread_count: 0 }) as T
  }

  if (messagesMatch && method === 'POST') {
    const orderId = Number(messagesMatch[1])
    const body = JSON.parse(String(options.body || '{}')) as { text?: string }
    const message: ChatMessage = {
      id: nextPreviewMessageId(),
      sender_type: 'client',
      sender_name: 'Вы',
      message_text: (body.text || '').trim() || 'Сообщение',
      file_type: null,
      file_name: null,
      file_url: null,
      created_at: previewNow(),
      is_read: false,
    }
    const target = state.orderMessages[orderId] || { order_id: orderId, messages: [], unread_count: 0 }
    pushPreviewMessage(target, message)
    state.orderMessages[orderId] = target
    return { success: true, message_id: message.id, message: 'Сообщение отправлено' } as T
  }

  const pauseMatch = pathname.match(/^\/orders\/(\d+)\/pause$/)
  if (pauseMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(pauseMatch[1]))
    order.paused_from_status = order.status
    order.status = 'paused'
    order.pause_until = previewNow(7 * 24 * 60)
    order.pause_available_days = 0
    return {
      success: true,
      message: 'Заказ поставлен на паузу',
      new_status: 'paused',
      pause_until: order.pause_until,
      paused_from_status: order.paused_from_status,
      pause_available_days: 0,
    } as T
  }

  const resumeMatch = pathname.match(/^\/orders\/(\d+)\/resume$/)
  if (resumeMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(resumeMatch[1]))
    order.status = order.paused_from_status || 'in_progress'
    order.pause_until = null
    return {
      success: true,
      message: 'Заказ возобновлён',
      new_status: order.status,
      pause_until: null,
      paused_from_status: null,
      pause_available_days: 7,
    } as T
  }

  const archiveMatch = pathname.match(/^\/orders\/(\d+)\/archive$/)
  if (archiveMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(archiveMatch[1]))
    order.is_archived = true
    return { success: true, message: 'Заказ отправлен в архив' } as T
  }

  const unarchiveMatch = pathname.match(/^\/orders\/(\d+)\/unarchive$/)
  if (unarchiveMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(unarchiveMatch[1]))
    order.is_archived = false
    return { success: true, message: 'Заказ возвращён из архива' } as T
  }

  const cancelMatch = pathname.match(/^\/orders\/(\d+)\/cancel$/)
  if (cancelMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(cancelMatch[1]))
    order.status = 'cancelled'
    return { success: true, message: 'Заказ отменён' } as T
  }

  const confirmPaymentMatch = pathname.match(/^\/orders\/(\d+)\/confirm-payment$/)
  if (confirmPaymentMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(confirmPaymentMatch[1]))
    const paymentInfo = buildPreviewPaymentInfo(order)
    order.status = 'verification_pending'
    if (!order.payment_scheme) {
      const body = JSON.parse(String(options.body || '{}')) as { payment_scheme?: 'full' | 'half' }
      order.payment_scheme = body.payment_scheme || 'full'
    }
    return {
      success: true,
      message: 'Заявка на оплату отправлена на проверку',
      new_status: 'verification_pending',
      amount_to_pay: paymentInfo.remaining,
    } as T
  }

  const confirmCompletionMatch = pathname.match(/^\/orders\/(\d+)\/confirm-completion$/)
  if (confirmCompletionMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(confirmCompletionMatch[1]))
    order.status = 'completed'
    order.completed_at = previewNow()
    return { success: true, message: 'Работа принята' } as T
  }

  const requestRevisionMatch = pathname.match(/^\/orders\/(\d+)\/request-revision$/)
  if (requestRevisionMatch && method === 'POST') {
    const order = getPreviewOrderOrThrow(Number(requestRevisionMatch[1]))
    const body = JSON.parse(String(options.body || '{}')) as { message?: string }
    order.status = 'revision'
    order.revision_count = (order.revision_count || 0) + 1
    const target = state.orderMessages[order.id] || { order_id: order.id, messages: [], unread_count: 0 }
    const revisionMessage: ChatMessage = {
      id: nextPreviewMessageId(),
      sender_type: 'client',
      sender_name: 'Вы',
      message_text: body.message?.trim() || 'Нужны правки',
      file_type: null,
      file_name: null,
      file_url: null,
      created_at: previewNow(),
      is_read: false,
    }
    pushPreviewMessage(target, revisionMessage)
    state.orderMessages[order.id] = target
    return {
      success: true,
      message: 'Правки отправлены',
      prefilled_text: body.message?.trim() || 'Нужны правки',
      revision_count: order.revision_count,
      is_paid: false,
    } as T
  }

  if (pathname === '/orders/batch-payment-info' && method === 'POST') {
    const body = JSON.parse(String(options.body || '{}')) as { order_ids?: number[] }
    const orders = (body.order_ids || [])
      .map(id => state.orders.find(order => order.id === id))
      .filter((order): order is Order => Boolean(order))
      .map(order => {
        const finalPrice = order.final_price || order.price
        const remaining = Math.max(finalPrice - (order.paid_amount || 0), 0)
        return {
          id: order.id,
          work_type_label: order.work_type_label || order.work_type,
          subject: order.subject,
          topic: order.topic,
          status: order.status,
          payment_phase: order.paid_amount && order.paid_amount > 0 ? 'final' : 'initial',
          payment_scheme: order.payment_scheme || null,
          final_price: finalPrice,
          remaining,
          amount_for_half: Math.ceil(finalPrice / 2),
          amount_for_full: remaining,
        }
      })
    const totalFull = orders.reduce((sum, order) => sum + order.amount_for_full, 0)
    const totalHalf = orders.reduce((sum, order) => sum + order.amount_for_half, 0)
    return {
      orders,
      total_amount: totalFull,
      total_amount_half: totalHalf,
      total_amount_full: totalFull,
      orders_count: orders.length,
      card_number: '4276 3800 0000 0000',
      card_holder: 'ACADEMIC SALOON',
      sbp_phone: '+7 (999) 123-45-67',
      sbp_bank: 'Тинькофф / Сбер / Альфа',
    } as T
  }

  if (pathname === '/orders/batch-payment-confirm' && method === 'POST') {
    const body = JSON.parse(String(options.body || '{}')) as { order_ids?: number[]; payment_method?: string; payment_scheme?: string }
    const processed_orders = (body.order_ids || [])
      .map(id => state.orders.find(order => order.id === id))
      .filter((order): order is Order => Boolean(order))
      .map(order => {
        order.status = 'verification_pending'
        return {
          id: order.id,
          work_type_label: order.work_type_label || order.work_type,
          subject: order.subject,
          topic: order.topic,
          amount_to_pay: Math.max((order.final_price || order.price) - (order.paid_amount || 0), 0),
          payment_phase: order.paid_amount && order.paid_amount > 0 ? 'final' : 'initial',
          status: order.status,
        }
      })
    return {
      success: true,
      message: `Заявка на оплату ${processed_orders.length} заказов отправлена на проверку`,
      processed_count: processed_orders.length,
      total_amount: processed_orders.reduce((sum, order) => sum + order.amount_to_pay, 0),
      failed_orders: [],
      processed_orders,
      failed_order_details: [],
      payment_method: body.payment_method || 'card',
      payment_scheme: body.payment_scheme || 'full',
    } as T
  }

  if (pathname === '/support/messages' && method === 'GET') {
    return clonePreviewValue(state.supportMessages) as T
  }

  if (pathname === '/support/messages' && method === 'POST') {
    const body = JSON.parse(String(options.body || '{}')) as { text?: string }
    const message: ChatMessage = {
      id: nextPreviewMessageId(),
      sender_type: 'client',
      sender_name: 'Вы',
      message_text: (body.text || '').trim() || 'Сообщение',
      file_type: null,
      file_name: null,
      file_url: null,
      created_at: previewNow(),
      is_read: false,
    }
    pushPreviewMessage(state.supportMessages, message)
    return { success: true, message_id: message.id, message: 'Сообщение отправлено' } as T
  }

  if (pathname === '/promo' && method === 'POST') {
    const body = JSON.parse(String(options.body || '{}')) as { code?: string }
    if ((body.code || '').trim().toUpperCase() === 'SALON10') {
      return { success: true, message: 'Промокод активирован! Скидка 10%', discount: 10, valid_until: previewNow(14 * 24 * 60) } as T
    }
    return { success: false, message: 'Промокод не найден' } as T
  }

  if (pathname === '/assistant/faq' && method === 'GET') {
    return {
      categories: ['Оплата', 'Сроки', 'Правки'],
      items: [
        { id: 'faq-1', category: 'Оплата', question: 'Как проходит оплата?', answer: 'В preview это демонстрационный сценарий.' },
        { id: 'faq-2', category: 'Правки', question: 'Сколько правок доступно?', answer: 'Правки безлимитны, пока задача в работе.' },
        { id: 'faq-3', category: 'Сроки', question: 'Как узнать дедлайн?', answer: 'Дедлайн отображается в карточке заказа.' },
      ],
    } as T
  }

  if (pathname === '/assistant/ask' && method === 'POST') {
    return {
      found: true,
      answer: 'В browser preview ответы показываются из mock-режима, чтобы можно было проверить интерфейс.',
      confidence: 0.82,
      suggest_human: false,
      related: [],
    } as T
  }

  if (pathname === '/assistant/complexity' && method === 'POST') {
    return {
      level: 'medium',
      score: 62,
      price_range: '5 000–9 000 ₽',
      typical_deadline: '3–5 дней',
      recommendation: 'Нормальный объём для демонстрационного режима.',
    } as T
  }

  if (pathname === '/daily-bonus/info' && method === 'GET') {
    return {
      can_claim: true,
      streak: state.dailyBonusStreak,
      next_bonus: 180,
      cooldown_remaining: null,
      bonuses: [80, 100, 120, 150, 180, 220, 300],
      streak_freeze_count: 1,
      streak_freeze_active: false,
      streak_freeze_pending: false,
      streak_milestones: [
        { day: 3, bonus: 120 },
        { day: 5, bonus: 180 },
        { day: 7, bonus: 300 },
      ],
    } as T
  }

  if (pathname === '/daily-bonus/claim' && method === 'POST') {
    state.dailyBonusStreak += 1
    state.dailyBonusBalance += 180
    return {
      success: true,
      won: true,
      bonus: 180,
      streak: state.dailyBonusStreak,
      message: 'Бонус начислен в preview-режиме',
      new_balance: state.dailyBonusBalance,
      streak_freeze_count: 1,
      streak_freeze_active: false,
      streak_freeze_pending: false,
      freeze_used: false,
      next_claim_at: previewNow(24 * 60),
    } as T
  }

  if (pathname === '/daily-bonus/buy-freeze' && method === 'POST') {
    return {
      success: true,
      message: 'Заморозка добавлена в preview-режиме',
      freeze_count: 2,
      bonus_balance: state.dailyBonusBalance,
    } as T
  }

  if (pathname === '/god/system' && method === 'GET') {
    return {
      bot_username: 'Kladovaya_GIPSR_bot',
      admin_ids: [],
      support_username: 'academicsaloon',
      webapp_url: window.location.origin,
      payment_phone: '+79991234567',
      payment_card: '4276380000000000',
      payment_banks: 'Тинькофф / Сбер / Альфа',
    } as T
  }

  if (method === 'POST') {
    return { success: true, message: 'Действие выполнено в preview-режиме' } as T
  }

  if (method === 'GET') {
    return {} as T
  }

  throw new Error('Preview mode: endpoint not supported')
}

// Generic fetch
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isBrowserPreviewMode()) {
    return mockApiFetch<T>(endpoint, options)
  }

  const initData = getInitData()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Ошибка сети. Проверьте подключение.')
  }

  if (!response.ok) {
    let errorMessage = `Ошибка сервера (${response.status})`
    try {
      const error = await response.json()
      const errorCode = typeof error.code === 'string' ? error.code : ''
      if (error.detail) {
        // Ensure detail is a string - convert objects/arrays to JSON string
        const detailStr = typeof error.detail === 'string'
          ? error.detail
          : JSON.stringify(error.detail)

        if (detailStr.includes('Invalid or expired')) {
          errorMessage = 'Сессия истекла. Перезапустите приложение.'
        } else if (detailStr.includes('Missing X-Telegram')) {
          errorMessage = 'Откройте приложение через Telegram'
        } else if (errorCode === 'TERMS_ACCEPTANCE_REQUIRED' || detailStr.includes('TERMS_ACCEPTANCE_REQUIRED') || detailStr.includes('Требуется принять условия оферты')) {
          errorMessage = 'Сначала примите условия оферты'
        } else if (detailStr.includes('Rate limit')) {
          errorMessage = 'Слишком много запросов. Подождите минуту.'
        } else {
          errorMessage = detailStr
        }
      }
    } catch {
      // Leave the generic HTTP error when the backend body cannot be parsed.
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// ═══════════════════════════════════════════════════════════════════════════
//  CORE API
// ═══════════════════════════════════════════════════════════════════════════

export interface PublicConfig {
  bot_username: string
  support_username: string
  reviews_channel?: string
  offer_url?: string
  privacy_policy_url?: string
  executor_info_url?: string
  legal_hub_url?: string
}

function normalizePublicDocUrl(url: string | undefined, fallback: string, legacyUrls?: Set<string>): string {
  const trimmed = (url || '').trim()
  if (!trimmed || (legacyUrls && legacyUrls.has(trimmed))) {
    return fallback
  }
  return trimmed
}

function normalizeOfferUrl(url?: string): string {
  return normalizePublicDocUrl(url, DEFAULT_OFFER_URL, LEGACY_OFFER_URLS)
}

function normalizePrivacyPolicyUrl(url?: string): string {
  return normalizePublicDocUrl(url, DEFAULT_PRIVACY_POLICY_URL, LEGACY_PRIVACY_POLICY_URLS)
}

function normalizeExecutorInfoUrl(url?: string): string {
  return normalizePublicDocUrl(url, DEFAULT_EXECUTOR_INFO_URL, LEGACY_EXECUTOR_INFO_URLS)
}

function normalizeLegalHubUrl(url?: string): string {
  return normalizePublicDocUrl(url, DEFAULT_LEGAL_HUB_URL, LEGACY_LEGAL_HUB_URLS)
}

export async function fetchConfig(): Promise<PublicConfig> {
  try {
    const config = await apiFetch<PublicConfig>('/config')
    return {
      ...config,
      offer_url: normalizeOfferUrl(config.offer_url),
      privacy_policy_url: normalizePrivacyPolicyUrl(config.privacy_policy_url),
      executor_info_url: normalizeExecutorInfoUrl(config.executor_info_url),
      legal_hub_url: normalizeLegalHubUrl(config.legal_hub_url),
    }
  } catch {
    return {
      bot_username: 'Kladovaya_GIPSR_bot',
      support_username: 'academicsaloon',
      offer_url: DEFAULT_OFFER_URL,
      privacy_policy_url: DEFAULT_PRIVACY_POLICY_URL,
      executor_info_url: DEFAULT_EXECUTOR_INFO_URL,
      legal_hub_url: DEFAULT_LEGAL_HUB_URL,
    }
  }
}

export async function fetchUserData(): Promise<UserData> {
  if (!hasTelegramContext() && !isBrowserPreviewMode()) {
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<UserData>('/user')
}

export interface AcceptTermsResult {
  success: boolean
  accepted_at: string
}

export async function acceptTerms(): Promise<AcceptTermsResult> {
  return await apiFetch<AcceptTermsResult>('/user/accept-terms', {
    method: 'POST',
  })
}

export async function fetchOrders(status?: string): Promise<Order[]> {
  const params = status ? `?status=${status}` : ''
  const response = await apiFetch<{ orders: Order[] }>(`/orders${params}`)
  return response.orders
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  return await apiFetch<Order>(`/orders/${orderId}`)
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER ARCHIVE
// ═══════════════════════════════════════════════════════════════════════════

export interface ArchiveResponse {
  success: boolean
  message: string
}

export async function archiveOrder(orderId: number): Promise<ArchiveResponse> {
  return await apiFetch<ArchiveResponse>(`/orders/${orderId}/archive`, { method: 'POST' })
}

export async function unarchiveOrder(orderId: number): Promise<ArchiveResponse> {
  return await apiFetch<ArchiveResponse>(`/orders/${orderId}/unarchive`, { method: 'POST' })
}

export async function cancelOrder(orderId: number): Promise<{ success: boolean; message: string }> {
  return await apiFetch<{ success: boolean; message: string }>(`/orders/${orderId}/cancel`, { method: 'POST' })
}

export interface PauseOrderResponse {
  success: boolean
  message: string
  new_status: string
  pause_until?: string | null
  paused_from_status?: string | null
  pause_available_days: number
}

export async function pauseOrder(orderId: number, reason?: string): Promise<PauseOrderResponse> {
  return await apiFetch<PauseOrderResponse>(`/orders/${orderId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || null }),
  })
}

export async function resumeOrder(orderId: number): Promise<PauseOrderResponse> {
  return await apiFetch<PauseOrderResponse>(`/orders/${orderId}/resume`, { method: 'POST' })
}

export async function applyPromoCode(code: string): Promise<PromoResult> {
  return await apiFetch<PromoResult>('/promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILES & ORDERS
// ═══════════════════════════════════════════════════════════════════════════

export interface FileUploadResponse {
  success: boolean
  message: string
  files_url?: string
  uploaded_count: number
  blocked_files?: string[]
  oversized_files?: string[]
}

export async function uploadOrderFiles(orderId: number, files: File[], onProgress?: (percent: number) => void): Promise<FileUploadResponse> {
  if (isBrowserPreviewMode()) {
    const order = getPreviewOrderOrThrow(orderId)
    const filesUrl = order.files_url || `https://disk.yandex.ru/mock/order-${orderId}-files`
    order.files_url = filesUrl
    onProgress?.(100)
    return {
      success: true,
      message: `Загружено ${files.length} файл(ов) в preview-режиме`,
      files_url: filesUrl,
      uploaded_count: files.length,
      blocked_files: [],
      oversized_files: [],
    }
  }

  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Некорректный ответ сервера'))
        }
      } else {
        reject(new Error('Ошибка загрузки'))
      }
    }
    xhr.onerror = () => reject(new Error('Ошибка сети'))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/upload-files`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

export interface PaymentInfo {
  order_id: number; status: string; price: number; final_price: number; discount: number; bonus_used: number;
  paid_amount: number; remaining: number; card_number: string; card_holder: string; sbp_phone: string; sbp_bank: string
}

export async function fetchPaymentInfo(orderId: number): Promise<PaymentInfo> {
  return await apiFetch<PaymentInfo>(`/orders/${orderId}/payment-info`)
}

export interface PaymentConfirmResponse {
  success: boolean; message: string; new_status: string; amount_to_pay: number
}

export async function confirmPayment(orderId: number, paymentMethod: string, paymentScheme: string): Promise<PaymentConfirmResponse> {
  return await apiFetch<PaymentConfirmResponse>(`/orders/${orderId}/confirm-payment`, {
    method: 'POST', body: JSON.stringify({ payment_method: paymentMethod, payment_scheme: paymentScheme })
  })
}

// YooKassa online payment
export interface CreateOnlinePaymentResponse {
  success: boolean
  payment_url: string | null
  payment_id: string | null
  amount: number
  error: string | null
}

export async function createOnlinePayment(orderId: number, paymentScheme: string): Promise<CreateOnlinePaymentResponse> {
  return await apiFetch<CreateOnlinePaymentResponse>('/payments/create', {
    method: 'POST', body: JSON.stringify({ order_id: orderId, payment_scheme: paymentScheme })
  })
}

export async function createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse> {
  return await apiFetch<OrderCreateResponse>('/orders/create', { method: 'POST', body: JSON.stringify(data) })
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchOrderMessages(orderId: number): Promise<ChatMessagesResponse> {
  // Add timestamp to prevent caching
  return await apiFetch<ChatMessagesResponse>(`/orders/${orderId}/messages?t=${Date.now()}`)
}

export async function sendOrderMessage(orderId: number, text: string): Promise<SendMessageResponse> {
  return await apiFetch<SendMessageResponse>(`/orders/${orderId}/messages`, {
    method: 'POST', body: JSON.stringify({ text })
  })
}

export interface ChatFileUploadResponse {
  success: boolean; message_id: number; message: string; file_url: string | null
}

export async function uploadChatFile(orderId: number, file: File, onProgress?: (p: number) => void): Promise<ChatFileUploadResponse> {
  if (isBrowserPreviewMode()) {
    onProgress?.(100)
    const messageId = nextPreviewMessageId()
    const target = getPreviewState().orderMessages[orderId] || { order_id: orderId, messages: [], unread_count: 0 }
    pushPreviewMessage(target, {
      id: messageId,
      sender_type: 'client',
      sender_name: 'Вы',
      message_text: null,
      file_type: file.type.startsWith('image/') ? 'photo' : 'document',
      file_name: file.name,
      file_url: `preview://${encodeURIComponent(file.name)}`,
      created_at: previewNow(),
      is_read: false,
    })
    getPreviewState().orderMessages[orderId] = target
    return { success: true, message_id: messageId, message: 'Файл добавлен в preview', file_url: `preview://${encodeURIComponent(file.name)}` }
  }

  const formData = new FormData()
  formData.append('file', file)
  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Некорректный ответ сервера'))
        }
      } else {
        reject(new Error('Ошибка загрузки'))
      }
    }
    xhr.onerror = () => reject(new Error('Ошибка сети'))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/messages/file`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

export async function uploadVoiceMessage(orderId: number, audioBlob: Blob, onProgress?: (p: number) => void): Promise<ChatFileUploadResponse> {
  if (isBrowserPreviewMode()) {
    onProgress?.(100)
    const messageId = nextPreviewMessageId()
    const target = getPreviewState().orderMessages[orderId] || { order_id: orderId, messages: [], unread_count: 0 }
    pushPreviewMessage(target, {
      id: messageId,
      sender_type: 'client',
      sender_name: 'Вы',
      message_text: null,
      file_type: 'voice',
      file_name: 'voice.ogg',
      file_url: 'preview://voice.ogg',
      created_at: previewNow(),
      is_read: false,
    })
    getPreviewState().orderMessages[orderId] = target
    return { success: true, message_id: messageId, message: 'Голосовое добавлено в preview', file_url: 'preview://voice.ogg' }
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.ogg')
  const initData = getInitData()
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Некорректный ответ сервера'))
        }
      } else {
        reject(new Error('Ошибка загрузки'))
      }
    }
    xhr.onerror = () => reject(new Error('Ошибка сети'))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/messages/voice`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVIEWS & CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ReviewSubmitResult { success: boolean; message: string }
export async function submitOrderReview(orderId: number, rating: number, text: string): Promise<ReviewSubmitResult> {
  return apiFetch<ReviewSubmitResult>(`/orders/${orderId}/review`, { method: 'POST', body: JSON.stringify({ rating, text }) })
}

export interface ConfirmWorkResult { success: boolean; message: string }
export async function confirmWorkCompletion(orderId: number): Promise<ConfirmWorkResult> {
  return apiFetch<ConfirmWorkResult>(`/orders/${orderId}/confirm-completion`, { method: 'POST' })
}

export interface RevisionRequestResult { success: boolean; message: string; prefilled_text: string; revision_count: number; is_paid: boolean }
export async function requestRevision(orderId: number, message: string = ''): Promise<RevisionRequestResult> {
  return apiFetch<RevisionRequestResult>(`/orders/${orderId}/request-revision`, { method: 'POST', body: JSON.stringify({ message }) })
}

export async function fetchSupportMessages(): Promise<ChatMessagesResponse> {
  return await apiFetch<ChatMessagesResponse>('/support/messages')
}

export async function sendSupportMessage(text: string): Promise<SendMessageResponse> {
  return await apiFetch<SendMessageResponse>('/support/messages', { method: 'POST', body: JSON.stringify({ text }) })
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN API (NEW)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users')
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats')
}

export async function fetchRevenueChart(days: number = 30): Promise<import('../types').RevenueChartData> {
  return apiFetch<import('../types').RevenueChartData>(`/admin/revenue-chart?days=${days}`)
}

export async function fetchClientProfile(userId: number): Promise<import('../types').ClientProfile> {
  return apiFetch<import('../types').ClientProfile>(`/admin/clients/${userId}`)
}

export async function fetchLiveFeed(since?: string): Promise<import('../types').LiveFeedData> {
  const url = since ? `/admin/live-feed?since=${encodeURIComponent(since)}` : '/admin/live-feed'
  return apiFetch<import('../types').LiveFeedData>(url)
}

export async function executeAdminSql(query: string): Promise<AdminSqlResponse> {
  return apiFetch<AdminSqlResponse>('/admin/sql', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

export async function fetchAdminOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/admin/orders')
}

export async function updateAdminOrderStatus(orderId: number, status: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export async function updateAdminOrderPrice(orderId: number, price: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/orders/${orderId}/price`, {
    method: 'POST',
    body: JSON.stringify({ price }),
  })
}

export async function sendAdminMessage(orderId: number, text: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/orders/${orderId}/message`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export async function updateAdminOrderProgress(orderId: number, percent: number, status_text?: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/orders/${orderId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ percent, status_text }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH PAYMENT API
// ═══════════════════════════════════════════════════════════════════════════

export interface BatchOrderItem {
  id: number
  work_type_label: string
  subject: string | null
  topic: string | null
  status: string
  payment_phase: 'initial' | 'final'
  payment_scheme: string | null
  final_price: number
  remaining: number
  amount_for_half: number
  amount_for_full: number
}

export interface BatchPaymentInfo {
  orders: BatchOrderItem[]
  total_amount: number
  total_amount_half: number
  total_amount_full: number
  orders_count: number
  card_number: string
  card_holder: string
  sbp_phone: string
  sbp_bank: string
}

export async function fetchBatchPaymentInfo(orderIds: number[]): Promise<BatchPaymentInfo> {
  return await apiFetch<BatchPaymentInfo>('/orders/batch-payment-info', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds }),
  })
}

export interface BatchPaymentConfirmResponse {
  success: boolean
  message: string
  processed_count: number
  total_amount: number
  failed_orders: number[]
  processed_orders: Array<{
    id: number
    work_type_label: string
    subject: string | null
    topic: string | null
    amount_to_pay: number
    payment_phase: 'initial' | 'final'
    status: string
  }>
  failed_order_details: Array<{
    id: number
    reason: string
  }>
  payment_method?: string | null
  payment_scheme?: string | null
}

export async function confirmBatchPayment(
  orderIds: number[],
  paymentMethod: string,
  paymentScheme: string
): Promise<BatchPaymentConfirmResponse> {
  return await apiFetch<BatchPaymentConfirmResponse>('/orders/batch-payment-confirm', {
    method: 'POST',
    body: JSON.stringify({
      order_ids: orderIds,
      payment_method: paymentMethod,
      payment_scheme: paymentScheme,
    }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  AI ASSISTANT API
// ═══════════════════════════════════════════════════════════════════════════

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
}

export interface AskAssistantResponse {
  found: boolean
  answer: string | null
  confidence: number
  suggest_human: boolean
  related: FaqItem[]
}

export async function askAssistant(query: string): Promise<AskAssistantResponse> {
  return await apiFetch<AskAssistantResponse>('/assistant/ask', {
    method: 'POST', body: JSON.stringify({ query })
  })
}

export interface ComplexityResponse {
  level: string
  score: number
  price_range: string
  typical_deadline: string
  recommendation: string
}

export async function estimateComplexity(workType: string, deadline?: string, pages?: number): Promise<ComplexityResponse> {
  return await apiFetch<ComplexityResponse>('/assistant/complexity', {
    method: 'POST', body: JSON.stringify({ work_type: workType, deadline, pages })
  })
}

export interface FaqListResponse {
  categories: string[]
  items: FaqItem[]
}

export async function fetchFaqList(): Promise<FaqListResponse> {
  return await apiFetch<FaqListResponse>('/assistant/faq')
}

// ═══════════════════════════════════════════════════════════════════════════
//  GOD MODE API
// ═══════════════════════════════════════════════════════════════════════════

import type { GodDashboard, GodOrder, GodOrderMessage, GodUser, GodPromo, GodLog, GodLiveUser } from '../types'

// Dashboard
export async function fetchGodDashboard(): Promise<GodDashboard> {
  return godFetch<GodDashboard>('/god/dashboard')
}

// Orders
export async function fetchGodOrders(params?: {
  status?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ orders: GodOrder[]; total: number; has_more: boolean }> {
  const queryParams = new URLSearchParams()
  if (params?.status && params.status !== 'all') queryParams.append('status', params.status)
  if (params?.search) queryParams.append('search', params.search)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  const query = queryParams.toString()
  return godFetch(`/god/orders${query ? `?${query}` : ''}`)
}

export async function fetchGodOrderDetails(orderId: number): Promise<{
  order: GodOrder
  user: GodUser | null
  messages: GodOrderMessage[]
}> {
  return godFetch(`/god/orders/${orderId}`)
}

export async function updateGodOrderStatus(orderId: number, status: string): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export async function updateGodOrderPrice(orderId: number, price: number): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/price`, {
    method: 'POST',
    body: JSON.stringify({ price }),
  })
}

export async function updateGodOrderProgress(orderId: number, progress: number, statusText?: string): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ progress, status_text: statusText }),
  })
}

export async function updateGodOrderNotes(orderId: number, notes: string): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

export async function confirmGodPayment(orderId: number, amount?: number, isFull?: boolean): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount, is_full: isFull }),
  })
}

export async function rejectGodPayment(orderId: number, reason?: string): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/reject-payment`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function sendGodOrderMessage(orderId: number, text: string): Promise<{ success: boolean }> {
  return godFetch(`/god/orders/${orderId}/message`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// Users
export async function fetchGodUsers(params?: {
  search?: string
  filter_type?: string
  limit?: number
  offset?: number
}): Promise<{ users: GodUser[]; total: number; has_more: boolean }> {
  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.filter_type) queryParams.append('filter_type', params.filter_type)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  const query = queryParams.toString()
  return godFetch(`/god/users${query ? `?${query}` : ''}`)
}

export async function fetchGodUserDetails(userId: number): Promise<{
  user: GodUser
  orders: GodOrder[]
  transactions: Array<{ id: number; amount: number; type: string; reason: string; description: string | null; created_at: string | null }>
}> {
  return godFetch(`/god/users/${userId}`)
}

export async function modifyGodUserBalance(userId: number, amount: number, reason: string, notify?: boolean): Promise<{ success: boolean }> {
  return godFetch(`/god/users/${userId}/balance`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason, notify }),
  })
}

export async function toggleGodUserBan(userId: number, ban: boolean, reason?: string): Promise<{ success: boolean }> {
  return godFetch(`/god/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ ban, reason }),
  })
}

export async function toggleGodUserWatch(userId: number, watch: boolean): Promise<{ success: boolean }> {
  return godFetch(`/god/users/${userId}/watch`, {
    method: 'POST',
    body: JSON.stringify({ watch }),
  })
}

export async function updateGodUserNotes(userId: number, notes: string): Promise<{ success: boolean }> {
  return godFetch(`/god/users/${userId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

// Promos
export async function fetchGodPromos(): Promise<{ promos: GodPromo[] }> {
  return godFetch('/god/promos')
}

export async function createGodPromo(data: {
  code: string
  discount_percent: number
  max_uses?: number
  valid_until?: string
  new_users_only?: boolean
}): Promise<{ success: boolean; promo_id: number }> {
  return godFetch('/god/promos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function toggleGodPromo(promoId: number): Promise<{ success: boolean; is_active: boolean }> {
  return godFetch(`/god/promos/${promoId}/toggle`, { method: 'POST' })
}

export async function deleteGodPromo(promoId: number): Promise<{ success: boolean }> {
  return godFetch(`/god/promos/${promoId}`, { method: 'DELETE' })
}

// Live monitoring
export async function fetchGodLiveActivity(): Promise<{ online_count: number; users: GodLiveUser[] }> {
  return godFetch('/god/live')
}

// Report user activity (for tracking)
export async function reportUserActivity(page: string, action?: string, orderId?: number): Promise<void> {
  try {
    await godFetch('/god/activity', {
      method: 'POST',
      body: JSON.stringify({
        page,
        action,
        order_id: orderId,
        platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS' :
          /Android/.test(navigator.userAgent) ? 'Android' : 'Web',
      }),
    })
  } catch {
    // Silent fail - activity tracking is not critical
  }
}

// Logs
export async function fetchGodLogs(params?: {
  action_type?: string
  target_type?: string
  limit?: number
  offset?: number
}): Promise<{ logs: GodLog[] }> {
  const queryParams = new URLSearchParams()
  if (params?.action_type) queryParams.append('action_type', params.action_type)
  if (params?.target_type) queryParams.append('target_type', params.target_type)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  const query = queryParams.toString()
  return godFetch(`/god/logs${query ? `?${query}` : ''}`)
}

// SQL Console
export async function executeGodSql(query: string): Promise<{
  success: boolean
  columns: string[]
  rows: string[][]
  error?: string
  total_rows?: number
}> {
  return godFetch('/god/sql', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

// Broadcast
export async function sendGodBroadcast(text: string, target: 'all' | 'active' | 'with_orders'): Promise<{
  success: boolean
  sent: number
  failed: number
  total: number
}> {
  return godFetch('/god/broadcast', {
    method: 'POST',
    body: JSON.stringify({ text, target }),
  })
}

// System info
export async function fetchGodSystemInfo(): Promise<{
  bot_username: string
  admin_ids: number[]
  support_username: string
  webapp_url: string
  payment_phone: string
  payment_card: string
  payment_banks: string
}> {
  return apiFetch('/god/system')
}

// ─── God Mode 2FA ────────────────────────────────────────────────────
const GOD_2FA_STORAGE_KEY = 'god_2fa_token'

export function getGod2FAToken(): string | null {
  try { return sessionStorage.getItem(GOD_2FA_STORAGE_KEY) } catch { return null }
}

export function setGod2FAToken(token: string): void {
  try { sessionStorage.setItem(GOD_2FA_STORAGE_KEY, token) } catch { /* ignore */ }
}

export function clearGod2FAToken(): void {
  try { sessionStorage.removeItem(GOD_2FA_STORAGE_KEY) } catch { /* ignore */ }
}

/** Headers that include 2FA token for god_mode requests */
export function getGod2FAHeaders(): Record<string, string> {
  const token = getGod2FAToken()
  return token ? { 'X-God-2FA-Token': token } : {}
}

/** Wrapper for god_mode API calls that auto-includes the 2FA token */
async function godFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(endpoint, {
    ...options,
    headers: {
      ...getGod2FAHeaders(),
      ...options.headers,
    },
  })
}

export async function requestGod2FACode(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/god/2fa/request', { method: 'POST' })
}

export async function verifyGod2FACode(code: string): Promise<{ success: boolean; token: string; expires_in: number }> {
  const result = await apiFetch<{ success: boolean; token: string; expires_in: number }>('/god/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  if (result.success && result.token) {
    setGod2FAToken(result.token)
  }
  return result
}

export async function checkGod2FAStatus(): Promise<{ authenticated: boolean }> {
  const token = getGod2FAToken()
  if (!token) return { authenticated: false }
  return apiFetch('/god/2fa/status', {
    headers: { 'X-God-2FA-Token': token },
  })
}

// Admin WebSocket subscription
export async function subscribeGodNotifications(): Promise<{ success: boolean }> {
  return apiFetch('/god/subscribe', { method: 'POST' })
}

export async function unsubscribeGodNotifications(): Promise<{ success: boolean }> {
  return apiFetch('/god/unsubscribe', { method: 'POST' })
}

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyBonusInfo {
  can_claim: boolean
  streak: number
  next_bonus: number
  cooldown_remaining: string | null
  bonuses: number[]
  streak_freeze_count: number
  streak_freeze_active: boolean
  streak_freeze_pending: boolean
  streak_milestones: { day: number; bonus: number }[]
}

export interface DailyBonusClaimResult {
  success: boolean
  won: boolean
  bonus: number
  streak: number
  message: string
  new_balance: number
  streak_freeze_count: number
  streak_freeze_active: boolean
  streak_freeze_pending: boolean
  freeze_used: boolean
  next_claim_at: string | null
}

export async function fetchDailyBonusInfo(): Promise<DailyBonusInfo> {
  return apiFetch<DailyBonusInfo>('/daily-bonus/info')
}

export async function claimDailyBonus(): Promise<DailyBonusClaimResult> {
  return apiFetch<DailyBonusClaimResult>('/daily-bonus/claim', { method: 'POST' })
}

export interface StreakFreezeResult {
  success: boolean
  message: string
  freeze_count: number
  bonus_balance: number
}

export async function buyStreakFreeze(): Promise<StreakFreezeResult> {
  return apiFetch<StreakFreezeResult>('/daily-bonus/buy-freeze', { method: 'POST' })
}
