// User data types
export interface UserData {
  id: number
  telegram_id: number
  username: string | null
  fullname: string
  balance: number
  bonus_balance: number
  orders_count: number
  total_spent: number
  rank: RankInfo
  loyalty: LoyaltyInfo
  discount: number
  referral_code: string
  orders: Order[]
  daily_luck_available: boolean
}

export interface RankInfo {
  name: string
  emoji: string
  level: number
  next_rank: string | null
  progress: number
  spent_to_next: number
}

export interface LoyaltyInfo {
  status: string
  emoji: string
  level: number
  discount: number
  orders_to_next: number
}

export interface Order {
  id: number
  status: OrderStatus
  work_type: string
  work_type_label: string
  subject: string
  deadline: string | null
  price: number
  final_price: number
  paid_amount: number
  discount: number
  bonus_used: number
  progress: number
  created_at: string
  completed_at: string | null
}

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'waiting_estimation'
  | 'waiting_payment'
  | 'verification_pending'
  | 'confirmed'
  | 'paid'
  | 'paid_full'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export interface PromoResult {
  success: boolean
  message: string
  discount?: number
}

export interface RouletteResult {
  prize: string
  type: 'bonus' | 'discount' | 'nothing' | 'jackpot'
  value: number
}

// Telegram Web App types
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    start_param?: string
  }
  initData: string
  openTelegramLink: (url: string) => void
  showAlert: (message: string) => void
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    setParams: (params: { text?: string; color?: string; text_color?: string }) => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
}
