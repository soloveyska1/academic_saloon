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
  price?: number
  is_manual_required?: boolean
  promo_applied?: boolean
  promo_failed?: boolean
  promo_failure_reason?: string | null
}

// Development flag
const IS_DEV = import.meta.env.DEV || false

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
  if (!hasTelegramContext()) {
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<UserData>('/user')
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

import type { GodDashboard, GodOrder, GodUser, GodPromo, GodLog, GodLiveUser } from '../types'

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
  messages: Array<{ id: number; sender_type: string; message_text: string | null; created_at: string | null }>
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
  streak_milestones: { day: number; bonus: number }[]
}

export interface DailyBonusClaimResult {
  success: boolean
  won: boolean
  bonus: number
  streak: number
  message: string
  new_balance: number
  next_claim_at: string | null
}

export async function fetchDailyBonusInfo(): Promise<DailyBonusInfo> {
  return apiFetch<DailyBonusInfo>('/daily-bonus/info')
}

export async function claimDailyBonus(): Promise<DailyBonusClaimResult> {
  return apiFetch<DailyBonusClaimResult>('/daily-bonus/claim', { method: 'POST' })
}

