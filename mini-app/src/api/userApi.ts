import {
  UserData, PromoResult, Order,
  OrderCreateRequest, ChatMessagesResponse,
  SendMessageResponse, AdminUser, AdminStats, AdminSqlResponse
} from '../types'

// Response type for order creation
export interface OrderCreateResponse {
  success: boolean
  order_id: number
  message: string
}

// Development flag
const IS_DEV = import.meta.env.DEV || false

// Demo mode - enables mock data fallback when API is unavailable
// Set VITE_DEMO_MODE=true in .env to enable
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || IS_DEV

// API base URL — normalized to ensure /api suffix is always present
function normalizeApiBase(rawUrl?: string): string {
  const fallback = IS_DEV ? 'http://localhost:8000/api' : 'https://academic-saloon.duckdns.org/api'
  const candidate = (rawUrl || '').trim() || fallback

  try {
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

// Generic fetch
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
    throw new Error('Ошибка сети. Проверьте подключение.')
  }

  if (!response.ok) {
    let errorMessage = `Ошибка сервера (${response.status})`
    try {
      const error = await response.json()
      if (error.detail) {
        // Ensure detail is a string - convert objects/arrays to JSON string
        const detailStr = typeof error.detail === 'string'
          ? error.detail
          : JSON.stringify(error.detail)

        if (detailStr.includes('Invalid or expired')) {
          errorMessage = 'Сессия истекла. Перезапустите приложение.'
        } else if (detailStr.includes('Missing X-Telegram')) {
          errorMessage = 'Откройте приложение через Telegram'
        } else if (detailStr.includes('Rate limit')) {
          errorMessage = 'Слишком много запросов. Подождите минуту.'
        } else {
          errorMessage = detailStr
        }
      }
    } catch { }
    throw new Error(errorMessage)
  }

  return response.json()
}

// ═══════════════════════════════════════════════════════════════════════════
//  CORE API
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchConfig(): Promise<{ bot_username: string; support_username: string }> {
  try {
    return await apiFetch<{ bot_username: string; support_username: string }>('/config')
  } catch {
    return { bot_username: 'Kladovaya_GIPSR_bot', support_username: 'Thisissaymoon' }
  }
}

export async function fetchUserData(): Promise<UserData> {
  // In demo mode without Telegram context, return mock data
  if (!hasTelegramContext()) {
    if (DEMO_MODE) return getMockUserData()
    throw new Error('Откройте приложение через Telegram')
  }

  // Try to fetch from API, fallback to mock in demo mode
  try {
    return await apiFetch<UserData>('/user')
  } catch (err) {
    // If network error and demo mode enabled, use mock data
    if (DEMO_MODE && err instanceof Error && err.message.includes('сети')) {
      console.warn('[DEMO MODE] API unavailable, using mock data')
      return getMockUserData()
    }
    throw err
  }
}

export async function fetchOrders(status?: string): Promise<Order[]> {
  if (!hasTelegramContext() && IS_DEV) return getMockUserData().orders
  const params = status ? `?status=${status}` : ''
  const response = await apiFetch<{ orders: Order[] }>(`/orders${params}`)
  return response.orders
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  if (!hasTelegramContext() && IS_DEV) {
    const o = getMockUserData().orders.find(x => x.id === orderId)
    if (o) return o
  }
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

export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!hasTelegramContext() && IS_DEV) return { success: code === 'COWBOY20', message: 'OK', discount: 20 }
  return await apiFetch<PromoResult>('/promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyBonusInfo {
  can_claim: boolean; streak: number; next_bonus: number; cooldown_remaining: string | null; bonuses: number[]
}
export interface DailyBonusClaimResult {
  success: boolean; won: boolean; bonus: number; streak: number; message: string; next_claim_at: string | null
}

export async function fetchDailyBonusInfo(): Promise<DailyBonusInfo> {
  if (!hasTelegramContext() && IS_DEV) return { can_claim: true, streak: 1, next_bonus: 10, cooldown_remaining: null, bonuses: [10, 20] }
  return await apiFetch<DailyBonusInfo>('/daily-bonus/info')
}

export async function claimDailyBonus(): Promise<DailyBonusClaimResult> {
  if (!hasTelegramContext() && IS_DEV) return { success: true, won: true, bonus: 10, streak: 1, message: 'Won', next_claim_at: null }
  return await apiFetch<DailyBonusClaimResult>('/daily-bonus/claim', { method: 'POST' })
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN: Daily Bonus Testing
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyBonusResetResult {
  success: boolean
  message: string
  streak?: number
  old_streak?: number
  new_streak?: number
  next_milestone?: { day: number; reward: number } | null
}

export async function resetDailyBonusCooldown(): Promise<DailyBonusResetResult> {
  return await apiFetch<DailyBonusResetResult>('/daily-bonus/reset', { method: 'POST' })
}

export async function resetDailyBonusFull(): Promise<DailyBonusResetResult> {
  return await apiFetch<DailyBonusResetResult>('/daily-bonus/reset-streak', { method: 'POST' })
}

export async function setDailyBonusStreak(streak: number): Promise<DailyBonusResetResult> {
  return await apiFetch<DailyBonusResetResult>(`/daily-bonus/set-streak?streak=${streak}`, { method: 'POST' })
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILES & ORDERS
// ═══════════════════════════════════════════════════════════════════════════

export interface FileUploadResponse {
  success: boolean; message: string; files_url?: string; uploaded_count: number
}

export async function uploadOrderFiles(orderId: number, files: File[], onProgress?: (percent: number) => void): Promise<FileUploadResponse> {
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
          reject(new Error('Invalid server response'))
        }
      } else {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
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
  if (!hasTelegramContext() && IS_DEV) return {
    order_id: orderId, status: 'waiting_payment', price: 1000, final_price: 1000, discount: 0, bonus_used: 0,
    paid_amount: 0, remaining: 1000, card_number: '0000', card_holder: 'Dev', sbp_phone: '000', sbp_bank: 'Dev'
  }
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

export async function createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse> {
  return await apiFetch<OrderCreateResponse>('/orders/create', { method: 'POST', body: JSON.stringify(data) })
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchOrderMessages(orderId: number): Promise<ChatMessagesResponse> {
  if (!hasTelegramContext() && IS_DEV) return { order_id: orderId, messages: [], unread_count: 0 }
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
          reject(new Error('Invalid server response'))
        }
      } else {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Error'))
    xhr.open('POST', `${API_BASE_URL}/orders/${orderId}/messages/file`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

export async function uploadVoiceMessage(orderId: number, audioBlob: Blob, onProgress?: (p: number) => void): Promise<ChatFileUploadResponse> {
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
          reject(new Error('Invalid server response'))
        }
      } else {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Error'))
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
  if (!hasTelegramContext() && IS_DEV) return { order_id: 0, messages: [], unread_count: 0 }
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
  final_price: number
  remaining: number
}

export interface BatchPaymentInfo {
  orders: BatchOrderItem[]
  total_amount: number
  orders_count: number
  card_number: string
  card_holder: string
  sbp_phone: string
  sbp_bank: string
}

export async function fetchBatchPaymentInfo(orderIds: number[]): Promise<BatchPaymentInfo> {
  if (!hasTelegramContext() && IS_DEV) {
    return {
      orders: orderIds.map(id => ({
        id,
        work_type_label: 'Курсовая работа',
        subject: 'Предмет',
        final_price: 1000,
        remaining: 1000,
      })),
      total_amount: orderIds.length * 1000,
      orders_count: orderIds.length,
      card_number: '0000 0000 0000 0000',
      card_holder: 'DEV USER',
      sbp_phone: '+7 (000) 000-00-00',
      sbp_bank: 'Банк',
    }
  }
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
//  GOD MODE API
// ═══════════════════════════════════════════════════════════════════════════

import type { GodDashboard, GodOrder, GodUser, GodPromo, GodLog, GodLiveUser } from '../types'

// Dashboard
export async function fetchGodDashboard(): Promise<GodDashboard> {
  return apiFetch<GodDashboard>('/god/dashboard')
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
  return apiFetch(`/god/orders${query ? `?${query}` : ''}`)
}

export async function fetchGodOrderDetails(orderId: number): Promise<{
  order: GodOrder
  user: GodUser | null
  messages: Array<{ id: number; sender_type: string; message_text: string | null; created_at: string | null }>
}> {
  return apiFetch(`/god/orders/${orderId}`)
}

export async function updateGodOrderStatus(orderId: number, status: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export async function updateGodOrderPrice(orderId: number, price: number): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/price`, {
    method: 'POST',
    body: JSON.stringify({ price }),
  })
}

export async function updateGodOrderProgress(orderId: number, progress: number, statusText?: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ progress, status_text: statusText }),
  })
}

export async function confirmGodPayment(orderId: number, amount?: number, isFull?: boolean): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount, is_full: isFull }),
  })
}

export async function rejectGodPayment(orderId: number, reason?: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/reject-payment`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function sendGodOrderMessage(orderId: number, text: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/orders/${orderId}/message`, {
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
  return apiFetch(`/god/users${query ? `?${query}` : ''}`)
}

export async function fetchGodUserDetails(userId: number): Promise<{
  user: GodUser
  orders: GodOrder[]
  transactions: Array<{ id: number; amount: number; type: string; reason: string; description: string | null; created_at: string | null }>
}> {
  return apiFetch(`/god/users/${userId}`)
}

export async function modifyGodUserBalance(userId: number, amount: number, reason: string, notify?: boolean): Promise<{ success: boolean }> {
  return apiFetch(`/god/users/${userId}/balance`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason, notify }),
  })
}

export async function toggleGodUserBan(userId: number, ban: boolean, reason?: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ ban, reason }),
  })
}

export async function toggleGodUserWatch(userId: number, watch: boolean): Promise<{ success: boolean }> {
  return apiFetch(`/god/users/${userId}/watch`, {
    method: 'POST',
    body: JSON.stringify({ watch }),
  })
}

export async function updateGodUserNotes(userId: number, notes: string): Promise<{ success: boolean }> {
  return apiFetch(`/god/users/${userId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

// Promos
export async function fetchGodPromos(): Promise<{ promos: GodPromo[] }> {
  return apiFetch('/god/promos')
}

export async function createGodPromo(data: {
  code: string
  discount_percent: number
  max_uses?: number
  valid_until?: string
  new_users_only?: boolean
}): Promise<{ success: boolean; promo_id: number }> {
  return apiFetch('/god/promos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function toggleGodPromo(promoId: number): Promise<{ success: boolean; is_active: boolean }> {
  return apiFetch(`/god/promos/${promoId}/toggle`, { method: 'POST' })
}

export async function deleteGodPromo(promoId: number): Promise<{ success: boolean }> {
  return apiFetch(`/god/promos/${promoId}`, { method: 'DELETE' })
}

// Live monitoring
export async function fetchGodLiveActivity(): Promise<{ online_count: number; users: GodLiveUser[] }> {
  return apiFetch('/god/live')
}

// Report user activity (for tracking)
export async function reportUserActivity(page: string, action?: string, orderId?: number): Promise<void> {
  try {
    await apiFetch('/god/activity', {
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
  return apiFetch(`/god/logs${query ? `?${query}` : ''}`)
}

// SQL Console
export async function executeGodSql(query: string): Promise<{
  success: boolean
  columns: string[]
  rows: string[][]
  error?: string
  total_rows?: number
}> {
  return apiFetch('/god/sql', {
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
  return apiFetch('/god/broadcast', {
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

// Admin WebSocket subscription
export async function subscribeGodNotifications(): Promise<{ success: boolean }> {
  return apiFetch('/god/subscribe', { method: 'POST' })
}

export async function unsubscribeGodNotifications(): Promise<{ success: boolean }> {
  return apiFetch('/god/unsubscribe', { method: 'POST' })
}

// MOCK DATA GENERATOR
function getMockUserData(): UserData {
  return {
    id: 1, telegram_id: 123456789, username: 'dev', fullname: 'Dev User', balance: 1000, bonus_balance: 100,
    transactions: [], orders: [], orders_count: 0, total_spent: 0, discount: 0, referral_code: 'DEV', referrals_count: 0,
    daily_luck_available: true, daily_bonus_streak: 1, free_spins: 0, roulette_onboarding_seen: true,
    rank: { name: 'Player', emoji: '🎲', level: 1, cashback: 0, bonus: null, next_rank: null, progress: 0, spent_to_next: 100, is_max: false },
    loyalty: { status: 'Start', emoji: 'S', level: 1, discount: 0, orders_to_next: 1 }
  }
}
