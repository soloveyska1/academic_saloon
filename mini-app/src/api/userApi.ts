import { UserData, PromoResult, RouletteResult, Order } from '../types'

// API base URL - hardcoded to ensure correct path
const API_BASE = 'https://academic-saloon.duckdns.org/api'

console.log('[API] API_BASE:', API_BASE)

// Get init data from Telegram
function getInitData(): string {
  const initData = window.Telegram?.WebApp?.initData || ''
  console.log('[API] initData exists:', !!initData, 'length:', initData.length)
  return initData
}

// Check if we have valid Telegram context
function hasTelegramContext(): boolean {
  const hasContext = !!getInitData()
  console.log('[API] hasTelegramContext:', hasContext)
  return hasContext
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
  console.log('[API] fetchUserData called')

  // Check Telegram context
  const initData = getInitData()
  console.log('[API] initData length:', initData.length)

  // If no Telegram context (dev mode), use mock data
  if (!hasTelegramContext()) {
    console.warn('[API] ⚠️ No Telegram context (initData empty) - using MOCK DATA')
    console.warn('[API] This happens when app is opened outside Telegram or WebApp not initialized')
    return getMockUserData()
  }

  try {
    console.log('[API] Fetching real user data from:', API_BASE + '/user')
    console.log('[API] initData preview:', initData.substring(0, 50) + '...')
    const data = await apiFetch<UserData>('/user')
    console.log('[API] ✅ Got REAL user data:', data.fullname, 'telegram_id:', data.telegram_id)
    return data
  } catch (e) {
    console.error('[API] ❌ fetchUserData FAILED:', e)
    console.error('[API] ❌ Falling back to MOCK data - check backend logs!')
    // Still return mock to not break UI, but error is logged
    return getMockUserData()
  }
}

// Orders
export async function fetchOrders(status?: string): Promise<Order[]> {
  if (!hasTelegramContext()) {
    return getMockUserData().orders
  }

  try {
    const params = status ? `?status=${status}` : ''
    const response = await apiFetch<{ orders: Order[] }>(`/orders${params}`)
    return response.orders
  } catch (e) {
    console.error('[API] fetchOrders error:', e)
    return getMockUserData().orders
  }
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  if (!hasTelegramContext()) {
    const orders = getMockUserData().orders
    const order = orders.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')
    return order
  }

  try {
    return await apiFetch<Order>(`/orders/${orderId}`)
  } catch (e) {
    console.error('[API] fetchOrderDetail error:', e)
    // Try mock fallback
    const orders = getMockUserData().orders
    const order = orders.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')
    return order
  }
}

// Promo code
export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!hasTelegramContext()) {
    // Mock response
    if (code.toUpperCase() === 'COWBOY20') {
      return { success: true, message: 'Промокод применён!', discount: 20 }
    }
    return { success: false, message: 'Промокод не найден' }
  }

  try {
    return await apiFetch<PromoResult>('/promo', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  } catch (e) {
    console.error('[API] applyPromoCode error:', e)
    return { success: false, message: 'Ошибка сервера' }
  }
}

// Daily roulette
export async function spinRoulette(): Promise<RouletteResult> {
  if (!hasTelegramContext()) {
    const prizes = [
      { prize: '50 бонусов', type: 'bonus' as const, value: 50 },
      { prize: '5% скидка', type: 'discount' as const, value: 5 },
      { prize: '100 бонусов', type: 'bonus' as const, value: 100 },
      { prize: 'Попробуй завтра', type: 'nothing' as const, value: 0 },
    ]
    return prizes[Math.floor(Math.random() * prizes.length)]
  }

  try {
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
  } catch (e) {
    console.error('[API] spinRoulette error:', e)
    return { prize: 'Ошибка', type: 'nothing', value: 0 }
  }
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
