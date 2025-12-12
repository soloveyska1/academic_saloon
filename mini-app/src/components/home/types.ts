import { LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME COMPONENTS — TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface QuickAction {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  action: 'navigate' | 'modal' | 'sheet'
  route?: string
  modal?: 'cashback' | 'guarantees' | 'urgent'
}

export interface UrgentOption {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  badge?: string
  route: string
  variant: 'primary' | 'secondary'
}

export interface NextAction {
  id: string
  type: 'payment' | 'files_needed' | 'revision' | 'review' | 'new_message'
  priority: number
  title: string
  subtitle: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  orderId?: number
  route: string
}

export interface OrderStatusInfo {
  label: string
  color: string
  bg: string
  border: string
}

export type ModalType = 'cashback' | 'guarantees' | 'transactions' | 'ranks' | 'qr' | 'daily_bonus' | 'welcome'
