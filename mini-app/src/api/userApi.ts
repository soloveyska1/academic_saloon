import { UserData, PromoResult, RouletteResult, Order, OrderCreateRequest, OrderCreateResponse, ChatMessagesResponse, SendMessageResponse } from '../types'

// API base URL
const API_BASE = 'https://academic-saloon.duckdns.org/api'

// Development mode flag - set to false in production
const IS_DEV = import.meta.env.DEV || false

// Get init data from Telegram
function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

// Check if we have valid Telegram context
function hasTelegramContext(): boolean {
  return !!getInitData()
}

// Generic fetch with auth
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API Error: ${response.status}`)
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
    // Fallback config - ВАЖНО: правильное имя бота
    return {
      bot_username: 'Kladovaya_GIPSR_bot',
      support_username: 'Thisissaymoon'
    }
  }
}

// User data
export async function fetchUserData(): Promise<UserData> {
  // If no Telegram context - only allow mock in dev mode
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      console.warn('[DEV] No Telegram context - using mock data')
      return getMockUserData()
    }
    throw new Error('Откройте приложение через Telegram')
  }

  // Fetch real data - no silent fallback
  const data = await apiFetch<UserData>('/user')
  return data
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
      if (!order) throw new Error('Заказ не найден')
      return order
    }
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<Order>(`/orders/${orderId}`)
}

// Promo code
export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      if (code.toUpperCase() === 'COWBOY20') {
        return { success: true, message: 'Промокод применён!', discount: 20 }
      }
      return { success: false, message: 'Промокод не найден' }
    }
    return { success: false, message: 'Откройте приложение через Telegram' }
  }

  return await apiFetch<PromoResult>('/promo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// Daily roulette
export async function spinRoulette(): Promise<RouletteResult> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      const prizes = [
        { prize: '50 бонусов', type: 'bonus' as const, value: 50 },
        { prize: '5% скидка', type: 'discount' as const, value: 5 },
        { prize: '100 бонусов', type: 'bonus' as const, value: 100 },
        { prize: 'Попробуй завтра', type: 'nothing' as const, value: 0 },
      ]
      return prizes[Math.floor(Math.random() * prizes.length)]
    }
    throw new Error('Откройте приложение через Telegram')
  }

  const result = await apiFetch<{
    success: boolean
    prize?: string
    type?: 'bonus' | 'discount' | 'nothing'
    value?: number
    message: string
  }>('/roulette/spin', {
    method: 'POST',
  })

  return {
    prize: result.prize || result.message,
    type: result.type || 'nothing',
    value: result.value || 0,
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
    if (IS_DEV) {
      // Mock progress for dev
      if (onProgress) {
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(r => setTimeout(r, 200))
          onProgress(i)
        }
      }
      return {
        success: true,
        message: `✅ Загружено ${files.length} файл(ов) (Dev)`,
        files_url: 'https://disk.yandex.ru/mock',
        uploaded_count: files.length
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  const initData = getInitData()

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        const error = JSON.parse(xhr.responseText)
        reject(new Error(error.detail || 'Upload failed'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')))

    xhr.open('POST', `${API_BASE}/orders/${orderId}/upload-files`)
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
    if (IS_DEV) {
      return {
        order_id: orderId,
        status: 'waiting_payment',
        price: 15000,
        final_price: 14000,
        discount: 5,
        bonus_used: 1000,
        paid_amount: 0,
        remaining: 14000,
        card_number: '2202 **** **** 5678',
        card_holder: 'IVAN PETROV',
        sbp_phone: '+7 (900) ***-**-67',
        sbp_bank: 'Тинькофф'
      }
    }
    throw new Error('Откройте приложение через Telegram')
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
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      await new Promise(r => setTimeout(r, 1500))
      return {
        success: true,
        message: 'Заявка на оплату отправлена (Dev)',
        new_status: 'verification_pending',
        amount_to_pay: 14000
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<PaymentConfirmResponse>(`/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({
      payment_method: paymentMethod,
      payment_scheme: paymentScheme
    })
  })
}

// Create order
export async function createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      return {
        success: true,
        order_id: Math.floor(Math.random() * 1000) + 100,
        message: '✅ Заказ создан! (Dev)',
        price: 15000,
        is_manual_required: data.work_type === 'other'
      }
    }
    throw new Error('Откройте приложение через Telegram')
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
    if (IS_DEV) {
      // Mock chat messages for development
      return {
        order_id: orderId,
        messages: [
          {
            id: 1,
            sender_type: 'admin',
            sender_name: 'Менеджер',
            message_text: 'Здравствуйте! Ваш заказ принят в работу.',
            file_type: null,
            file_name: null,
            file_url: null,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_read: true,
          },
          {
            id: 2,
            sender_type: 'client',
            sender_name: 'Вы',
            message_text: 'Спасибо! Когда примерно будет готово?',
            file_type: null,
            file_name: null,
            file_url: null,
            created_at: new Date(Date.now() - 3000000).toISOString(),
            is_read: true,
          },
          {
            id: 3,
            sender_type: 'admin',
            sender_name: 'Менеджер',
            message_text: 'Планируем закончить к завтрашнему вечеру. Напишу как только будет готово.',
            file_type: null,
            file_name: null,
            file_url: null,
            created_at: new Date(Date.now() - 2400000).toISOString(),
            is_read: false,
          },
        ],
        unread_count: 1,
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<ChatMessagesResponse>(`/orders/${orderId}/messages`)
}

export async function sendOrderMessage(orderId: number, text: string): Promise<SendMessageResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      return {
        success: true,
        message_id: Date.now(),
        message: 'Сообщение отправлено',
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  return await apiFetch<SendMessageResponse>(`/orders/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// Chat file upload response
export interface ChatFileUploadResponse {
  success: boolean
  message_id: number
  message: string
  file_url: string | null
}

// Upload file to chat
export async function uploadChatFile(
  orderId: number,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ChatFileUploadResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      // Simulate upload progress
      if (onProgress) {
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(r => setTimeout(r, 150))
          onProgress(i)
        }
      }
      return {
        success: true,
        message_id: Date.now(),
        message: 'Файл отправлен (Dev)',
        file_url: 'https://disk.yandex.ru/mock-file',
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  const formData = new FormData()
  formData.append('file', file)

  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        const error = JSON.parse(xhr.responseText)
        reject(new Error(error.detail || 'Upload failed'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')))

    xhr.open('POST', `${API_BASE}/orders/${orderId}/messages/file`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

// Upload voice message to chat
export async function uploadVoiceMessage(
  orderId: number,
  audioBlob: Blob,
  onProgress?: (percent: number) => void
): Promise<ChatFileUploadResponse> {
  if (!hasTelegramContext()) {
    if (IS_DEV) {
      if (onProgress) {
        for (let i = 0; i <= 100; i += 25) {
          await new Promise(r => setTimeout(r, 100))
          onProgress(i)
        }
      }
      return {
        success: true,
        message_id: Date.now(),
        message: 'Голосовое отправлено (Dev)',
        file_url: 'https://disk.yandex.ru/mock-voice',
      }
    }
    throw new Error('Откройте приложение через Telegram')
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'voice.ogg')

  const initData = getInitData()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        const error = JSON.parse(xhr.responseText)
        reject(new Error(error.detail || 'Upload failed'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')))

    xhr.open('POST', `${API_BASE}/orders/${orderId}/messages/voice`)
    xhr.setRequestHeader('X-Telegram-Init-Data', initData)
    xhr.send(formData)
  })
}

// Mock data for development
function getMockUserData(): UserData {
  return {
    id: 1,
    telegram_id: 123456789,
    username: 'cowboy_joe',
    fullname: 'Ковбой Джо',
    balance: 1240,
    bonus_balance: 350,
    orders_count: 12,
    total_spent: 45000,
    discount: 10,
    referral_code: 'COWBOY123',
    daily_luck_available: true,
    rank: {
      name: 'Рейнджер',
      emoji: '🤠',
      level: 3,
      next_rank: 'Шериф',
      progress: 65,
      spent_to_next: 5000,
    },
    loyalty: {
      status: 'Серебряный',
      emoji: '🥈',
      level: 2,
      discount: 5,
      orders_to_next: 3,
    },
    orders: [
      {
        id: 175,
        status: 'in_progress',
        work_type: 'coursework',
        work_type_label: 'Курсовая',
        subject: 'Математический анализ',
        deadline: '15 декабря',
        price: 15000,
        final_price: 14128,
        paid_amount: 14128,
        discount: 5,
        bonus_used: 872,
        progress: 45,
        created_at: '2024-12-01T18:39:00',
        completed_at: null,
      },
      {
        id: 168,
        status: 'completed',
        work_type: 'essay',
        work_type_label: 'Эссе',
        subject: 'Философия',
        deadline: '1 декабря',
        price: 3000,
        final_price: 2850,
        paid_amount: 2850,
        discount: 5,
        bonus_used: 0,
        progress: 100,
        created_at: '2024-11-25T10:00:00',
        completed_at: '2024-11-30T15:30:00',
      },
      {
        id: 152,
        status: 'completed',
        work_type: 'control',
        work_type_label: 'Контрольная',
        subject: 'Экономика',
        deadline: '20 ноября',
        price: 2500,
        final_price: 2500,
        paid_amount: 2500,
        discount: 0,
        bonus_used: 0,
        progress: 100,
        created_at: '2024-11-15T09:00:00',
        completed_at: '2024-11-19T18:00:00',
      },
    ],
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  ORDER REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

export interface ReviewSubmitResult {
  success: boolean
  message: string
}

export async function submitOrderReview(
  orderId: number,
  rating: number,
  text: string
): Promise<ReviewSubmitResult> {
  if (!hasTelegramContext()) {
    // Mock for dev
    return { success: true, message: 'Спасибо за отзыв! (DEV)' }
  }

  return apiFetch<ReviewSubmitResult>(`/orders/${orderId}/review`, {
    method: 'POST',
    body: JSON.stringify({ rating, text }),
  })
}
