// User data types
export interface UserData {
  id: number
  telegram_id: number
  username: string | null
  fullname: string
  balance: number
  bonus_balance: number
  transactions: Transaction[]
  orders_count: number
  total_spent: number
  rank: RankInfo
  loyalty: LoyaltyInfo
  bonus_expiry?: BonusExpiryInfo
  discount: number
  referral_code: string
  referrals_count: number  // Number of referrals
  orders: Order[]
  daily_luck_available: boolean
  daily_bonus_streak: number  // Days in a row claimed daily bonus
  free_spins: number
  roulette_onboarding_seen: boolean
}

export interface Transaction {
  id: number
  amount: number
  type: 'credit' | 'debit'
  reason: string
  description?: string | null
  created_at: string
}

export interface RankInfo {
  name: string
  emoji: string
  level: number
  cashback: number
  bonus: string | null  // Bonus perk for this rank
  next_rank: string | null
  progress: number
  spent_to_next: number
  is_max: boolean
}

export interface LoyaltyInfo {
  status: string
  emoji: string
  level: number
  discount: number
  orders_to_next: number
}

export interface BonusExpiryInfo {
  has_expiry: boolean
  balance: number
  days_left?: number
  expiry_date?: string
  burn_amount?: number
  status?: 'ok' | 'warning' | 'expired'
  status_text?: string
  color?: string
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
  payment_scheme: 'full' | 'half' | null  // full / half (prepayment)
  files_url: string | null  // Yandex.Disk URL with work files
  review_submitted: boolean  // Whether review was submitted
  revision_count: number  // Счётчик кругов правок (3 бесплатно)
  created_at: string
  completed_at: string | null
  delivered_at: string | null  // When work was delivered (30-day revision period starts)
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
  | 'revision'
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
  message: string
}

// Order Creation (Web App First)
export interface OrderCreateRequest {
  work_type: string
  subject: string
  topic?: string
  deadline: string
  description?: string
}

export interface OrderCreateResponse {
  success: boolean
  order_id: number
  message: string
  price?: number
  is_manual_required: boolean
}

// Work types for order creation
export type WorkType =
  | 'masters'
  | 'diploma'
  | 'coursework'
  | 'independent'
  | 'essay'
  | 'report'
  | 'control'
  | 'presentation'
  | 'practice'
  | 'other'
  | 'photo_task'

export interface WorkTypeOption {
  value: WorkType
  label: string
  emoji: string
  price: string
}

export interface DeadlineOption {
  value: string
  label: string
  multiplier: string
}

// Chat types
export interface ChatMessage {
  id: number
  sender_type: 'admin' | 'client'
  sender_name: string
  message_text: string | null
  file_type: string | null
  file_name: string | null
  file_url: string | null
  created_at: string
  is_read: boolean
}

export interface ChatMessagesResponse {
  order_id: number
  messages: ChatMessage[]
  unread_count: number
}

export interface SendMessageResponse {
  success: boolean
  message_id: number
  message: string
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
      photo_url?: string
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
    selectionChanged: () => void
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
