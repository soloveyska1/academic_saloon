import {
  UserData, PromoResult, RouletteResult, Order,
  OrderCreateRequest, OrderCreateResponse, ChatMessagesResponse,
  SendMessageResponse, AdminUser, AdminStats, AdminSqlResponse
} from '../types'

// API base URL - exported for use in other components
export const API_BASE_URL = 'https://academic-saloon.duckdns.org/api'

// Development mode flag - set to false in production
const IS_DEV = import.meta.env.DEV || false

// Get init data from Telegram
function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

// Get auth headers - exported for direct fetch calls
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
  }
}

// Check if we have valid Telegram context
function hasTelegramContext(): boolean {
  return !!getInitData()
}

// Generic fetch with auth
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  } catch (networkError) {
    // Network error (no internet, DNS, CORS, etc.)
    throw new Error('Ошибка сети. Проверьте подключение.')
  }

  if (!response.ok) {
    let errorMessage = `Ошибка сервера (${response.status})`
    try {
      const error = await response.json()
      if (error.detail) {
        // Translate common API errors to Russian
        if (error.detail.includes('Invalid or expired')) {
          errorMessage = 'Сессия истекла. Перезапустите приложение.'
        } else if (error.detail.includes('Missing X-Telegram')) {
          errorMessage = 'Откройте приложение через Telegram'
        } else if (error.detail.includes('Rate limit')) {
          errorMessage = 'Слишком много запросов. Подождите минуту.'
        } else {
          errorMessage = error.detail
        }
      }
    } catch {
      // JSON parsing failed - use status code message
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

// Config cache
let configCache: { bot_username: string; support_username: string } | null = null

// Get bot config
export async function fetchConfig(): Promise<{ bot_username: string; support_username: string }> {
  if (configCache) return configCache

  try {
    const config = await apiFetch<{ bot_username: string; support_username: string }>('/config')
    configCache = config
    return config
  } catch {
    // Fallback config
    return {
      bot_username: 'Kladovaya_GIPSR_bot',
      support_username: 'Thisissaymoon'
    }
  }
}

// User data
export async function fetchUserData(): Promise<UserData> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return getMockUserData()
    throw new Error('Откройте приложение через Telegram')
  }
  return await apiFetch<UserData>('/user')
}

// Orders
export async function fetchOrders(status?: string): Promise<Order[]> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return getMockUserData().orders
    throw new Error('Откройте приложение через Telegram')
  }
  const params = status ? `?status=${status}` : ''
  const response = await apiFetch<{ orders: Order[] }>(`/orders${params}`)
  return response.orders
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      const order = getMockUserData().orders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found (Dev)')
      return order
    }
    throw new Error('Откройте приложение через Telegram')
  }
  return await apiFetch<Order>(`/orders/${orderId}`)
}

// Promo code
export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { success: code === 'COWBOY20', message: code === 'COWBOY20' ? 'OK' : 'Fail', discount: 20 }
    throw new Error('Откройте приложение через Telegram')
  }
  return await apiFetch<PromoResult>('/promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS API
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyBonusInfo {
  can_claim: boolean
  streak: number
  next_bonus: number
  cooldown_remaining: string | null
  bonuses: number[]
}

export interface DailyBonusClaimResult {
  success: boolean
  won: boolean
  bonus: number
  streak: number
  message: string
  next_claim_at: string | null
}

export async function fetchDailyBonusInfo(): Promise<DailyBonusInfo> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { can_claim: true, streak: 1, next_bonus: 10, cooldown_remaining: null, bonuses: [10, 20, 30] }
    throw new Error('Откройте приложение через Telegram')
  }
  return await apiFetch<DailyBonusInfo>('/daily-bonus/info')
}

export async function claimDailyBonus(): Promise<DailyBonusClaimResult> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { success: true, won: true, bonus: 10, streak: 1, message: 'Won!', next_claim_at: null }
    throw new Error('Telegram required')
  }
  return await apiFetch<DailyBonusClaimResult>('/daily-bonus/claim', { method: 'POST' })
}

// Daily roulette
export async function spinRoulette(): Promise<RouletteResult> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { prize: '50 бонусов', type: 'bonus', value: 50, message: 'Win!' }
    throw new Error('Telegram required')
  }
  const result = await apiFetch<any>('/roulette/spin', { method: 'POST' })
  return {
    prize: result.prize || result.message,
    type: result.type || 'nothing',
    value: result.value || 0,
    message: result.message
  }
}

// Upload files to order
export interface FileUploadResponse {
  success: boolean
  message: string
  files_url?: string
  uploaded_count: number
}

export async function uploadOrderFiles(
  orderId: number,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<FileUploadResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { success: true, message: 'Uploaded (Dev)', uploaded_count: files.length }
    throw new Error('Telegram required')
  }

  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(JSON.parse(xhr.responseText).detail || 'Upload failed'))
    })
    xhr.addEventListener('error', () => reject(new Error('Network Error')))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/upload-files`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

// Payment info
export interface PaymentInfo {
  order_id: number
  status: string
  price: number
  final_price: number
  discount: number
  bonus_used: number
  paid_amount: number
  remaining: number
  card_number: string
  card_holder: string
  sbp_phone: string
  sbp_bank: string
}

export async function fetchPaymentInfo(orderId: number): Promise<PaymentInfo> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { order_id: orderId, status: 'waiting_payment', price: 1000, final_price: 1000, discount: 0, bonus_used: 0, paid_amount: 0, remaining: 1000, card_number: '0000', card_holder: 'TEST', sbp_phone: '000', sbp_bank: 'TEST' }
    throw new Error('Telegram required')
  }
  return await apiFetch<PaymentInfo>(`/orders/${orderId}/payment-info`)
}

// Confirm payment
export interface PaymentConfirmResponse {
  success: boolean
  message: string
  new_status: string
  amount_to_pay: number
}

export async function confirmPayment(
  orderId: number,
  paymentMethod: 'card' | 'sbp' | 'transfer',
  paymentScheme: 'full' | 'half'
): Promise<PaymentConfirmResponse> {
  if (!hasTelegramContext()) throw new Error('Telegram required')
  return await apiFetch<PaymentConfirmResponse>(`/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ payment_method: paymentMethod, payment_scheme: paymentScheme })
  })
}

// Create order
export async function createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { success: true, order_id: 123, message: 'Created (Dev)', price: 1000, is_manual_required: false }
    throw new Error('Telegram required')
  }
  return await apiFetch<OrderCreateResponse>('/orders/create', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT API — In-App Messaging
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchOrderMessages(orderId: number): Promise<ChatMessagesResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { order_id: orderId, messages: [], unread_count: 0 }
    throw new Error('Telegram required')
  }
  return await apiFetch<ChatMessagesResponse>(`/orders/${orderId}/messages`)
}

export async function sendOrderMessage(orderId: number, text: string): Promise<SendMessageResponse> {
  if (!hasTelegramContext()) throw new Error('Telegram required')
  return await apiFetch<SendMessageResponse>(`/orders/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export interface ChatFileUploadResponse {
  success: boolean
  message_id: number
  message: string
  file_url: string | null
}

export async function uploadChatFile(orderId: number, file: File, onProgress?: (p: number) => void): Promise<ChatFileUploadResponse> {
  if (!hasTelegramContext()) throw new Error('Telegram required')

  const formData = new FormData()
  formData.append('file', file)
  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)))
    xhr.addEventListener('error', () => reject(new Error('Network Error')))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/messages/file`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

export async function uploadVoiceMessage(orderId: number, audioBlob: Blob, onProgress?: (p: number) => void): Promise<ChatFileUploadResponse> {
  if (!hasTelegramContext()) throw new Error('Telegram required')

  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.ogg')
  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)))
    xhr.addEventListener('error', () => reject(new Error('Network Error')))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/messages/voice`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

export interface ReviewSubmitResult {
  success: boolean
  message: string
}

export async function submitOrderReview(orderId: number, rating: number, text: string): Promise<ReviewSubmitResult> {
  if (!hasTelegramContext()) return { success: true, message: 'Review (Dev)' }
  return apiFetch<ReviewSubmitResult>(`/orders/${orderId}/review`, {
    method: 'POST', body: JSON.stringify({ rating, text })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORK CONFIRMATION & REVISION
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfirmWorkResult {
  success: boolean
  message: string
}

export interface RevisionRequestResult {
  success: boolean
  message: string
  prefilled_text: string
  revision_count: number
  is_paid: boolean
}

export async function confirmWorkCompletion(orderId: number): Promise<ConfirmWorkResult> {
  if (!hasTelegramContext()) return { success: true, message: 'Done (Dev)' }
  return apiFetch<ConfirmWorkResult>(`/orders/${orderId}/confirm-completion`, { method: 'POST' })
}

export async function requestRevision(orderId: number, message: string = ''): Promise<RevisionRequestResult> {
  if (!hasTelegramContext()) return { success: true, message: 'Rev (Dev)', prefilled_text: '', revision_count: 1, is_paid: false }
  return apiFetch<RevisionRequestResult>(`/orders/${orderId}/request-revision`, {
    method: 'POST', body: JSON.stringify({ message })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUPPORT CHAT API
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchSupportMessages(): Promise<ChatMessagesResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) return { order_id: 999, messages: [], unread_count: 0 }
    throw new Error('Telegram required')
  }
  return await apiFetch<ChatMessagesResponse>('/support/messages')
}

export async function sendSupportMessage(text: string): Promise<SendMessageResponse> {
  if (!hasTelegramContext()) throw new Error('Telegram required')
  return await apiFetch<SendMessageResponse>('/support/messages', {
    method: 'POST', body: JSON.stringify({ text })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN API
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users')
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats')
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

// Mock data (Minified for space, since IS_DEV handles most returns inline now or errors)
function getMockUserData(): UserData {
  return {
    id: 1, telegram_id: 123456789, username: 'dev', fullname: 'Dev User', balance: 1000, bonus_balance: 100,
    transactions: [], orders: [], orders_count: 0, total_spent: 0, discount: 0, referral_code: 'DEV', referrals_count: 0,
    daily_luck_available: true, daily_bonus_streak: 1, free_spins: 0, roulette_onboarding_seen: true,
    rank: { name: 'Player', emoji: '🎲', level: 1, cashback: 0, bonus: null, next_rank: null, progress: 0, spent_to_next: 100, is_max: false },
    loyalty: { status: 'Start', emoji: 'S', level: 1, discount: 0, orders_to_next: 1 }
  }
}
