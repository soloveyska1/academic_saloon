import { UserData, PromoResult, RouletteResult, Order } from '../types'

// API base URL - will be your bot's API endpoint
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Get init data from Telegram
function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

// Generic fetch with auth
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

// User data
export async function fetchUserData(): Promise<UserData> {
  // For development/demo, return mock data
  if (!getInitData()) {
    return getMockUserData()
  }
  return apiFetch<UserData>('/user')
}

// Orders
export async function fetchOrders(): Promise<Order[]> {
  if (!getInitData()) {
    return getMockUserData().orders
  }
  return apiFetch<Order[]>('/orders')
}

export async function fetchOrderDetail(orderId: number): Promise<Order> {
  if (!getInitData()) {
    const orders = getMockUserData().orders
    const order = orders.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')
    return order
  }
  return apiFetch<Order>(`/orders/${orderId}`)
}

// Promo code
export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!getInitData()) {
    // Mock response
    if (code.toUpperCase() === 'COWBOY20') {
      return { success: true, message: 'Промокод применён!', discount: 20 }
    }
    return { success: false, message: 'Промокод не найден' }
  }
  return apiFetch<PromoResult>('/promo/apply', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

// Daily roulette
export async function spinRoulette(): Promise<RouletteResult> {
  if (!getInitData()) {
    // Mock response
    const prizes = [
      { prize: '50 бонусов', type: 'bonus' as const, value: 50 },
      { prize: '5% скидка', type: 'discount' as const, value: 5 },
      { prize: '100 бонусов', type: 'bonus' as const, value: 100 },
      { prize: 'Попробуй завтра', type: 'nothing' as const, value: 0 },
    ]
    return prizes[Math.floor(Math.random() * prizes.length)]
  }
  return apiFetch<RouletteResult>('/roulette/spin', { method: 'POST' })
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
