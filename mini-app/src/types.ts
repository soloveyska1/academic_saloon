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

export interface Order {
  id: number
  user_id: number
  subject: string | null
  topic: string | null
  deadline: string | null
  status: OrderStatus
  price: number
  paid_amount: number
  discount?: number
  promo_code?: string | null  // Applied promo code
  promo_discount?: number  // Promo discount percentage
  created_at: string
  files_url: string | null
  description: string | null
  work_type: string
  work_type_label?: string
  final_price?: number
  progress?: number
  bonus_used?: number
  payment_scheme?: 'full' | 'half' | null
  // Admin-specific fields
  fullname?: string
  username?: string | null
  telegram_id?: number
  review_submitted?: boolean
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
  valid_until?: string | null  // ISO date string for promo expiration
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
  promo_code?: string  // Optional promo code to apply
}

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

// --- ADMIN TYPES ---
export interface AdminUser {
  internal_id: number
  telegram_id: number
  fullname: string
  username: string | null
  is_admin: boolean
  last_active: string | null
}

export interface AdminStats {
  revenue: number
  active_orders_count: number
  total_users_count: number
}

export interface AdminSqlResponse {
  columns?: string[]
  rows?: string[][]
  error?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          GOD MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GodDashboard {
  timestamp: string
  orders: {
    total: number
    active: number
    needing_attention: number
    today: number
    completed_today: number
    by_status: Record<string, number>
  }
  revenue: {
    total: number
    today: number
    week: number
    month: number
    average_order: number
  }
  users: {
    total: number
    today: number
    week: number
    banned: number
    watched: number
    online: number
    total_bonus_balance: number
  }
  promos: {
    total: number
    active: number
    total_uses: number
    total_discount_given: number
    popular: Array<{
      code: string
      uses: number
    }>
  }
}

export interface GodOrder {
  id: number
  status: string
  work_type: string
  work_type_label: string
  subject: string | null
  topic: string | null
  deadline: string | null
  price: number
  final_price: number
  paid_amount: number
  discount: number
  promo_code: string | null  // Applied promo code
  promo_discount: number  // Promo discount percentage
  promo_discount_amount: number  // Actual amount saved with promo
  promo_returned?: boolean  // Whether promo was returned (for cancelled orders)
  bonus_used: number
  progress: number
  payment_scheme: string | null
  files_url: string | null
  created_at: string
  user_telegram_id: number
  user_fullname: string
  user_username: string | null
  admin_notes: string | null
  revision_count: number
  description: string | null
}

export interface GodUser {
  id: number
  telegram_id: number
  username: string | null
  fullname: string | null
  balance: number
  orders_count: number
  total_spent: number
  is_banned: boolean
  is_watched: boolean
  admin_notes: string | null
  ban_reason?: string | null
  rank_name: string
  rank_emoji: string
  rank_cashback?: number
  loyalty_status: string
  loyalty_discount: number
  referrer_id?: number | null
  referrals_count: number
  referral_earnings: number
  daily_bonus_streak?: number
  created_at: string | null
  updated_at?: string | null
}

export interface GodPromo {
  id: number
  code: string
  discount_percent: number
  max_uses: number
  current_uses: number
  active_usages: number
  total_savings: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  created_by: {
    telegram_id: number
    username: string | null
    fullname: string
  } | null
  created_at: string | null
}

export interface GodLog {
  id: number
  admin_id: number
  admin_username: string | null
  action_type: string
  action_emoji: string
  target_type: string | null
  target_id: number | null
  details: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string | null
}

export interface GodLiveUser {
  telegram_id: number
  username: string | null
  fullname: string | null
  current_page: string | null
  current_action: string | null
  current_order_id: number | null
  session_duration_min: number
  last_activity: string | null
  platform: string | null
}

export interface GodOrderMessage {
  id: number
  sender_type: string
  message_text: string | null
  file_type: string | null
  file_name: string | null
  created_at: string | null
}

