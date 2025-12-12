import { LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER WIZARD TYPES
//  Единый источник правды для типов данных мастера создания заказа
// ═══════════════════════════════════════════════════════════════════════════

export type ServiceCategory = 'premium' | 'standard' | 'express'

export interface ServiceType {
  id: string
  label: string
  description: string
  price: string
  priceNum: number
  icon: LucideIcon
  category: ServiceCategory
  duration: string // "7-14 дней", "3-5 дней"
  popular?: boolean
}

export interface DeadlineOption {
  value: string
  label: string
  multiplier: string
  multiplierNum: number
  urgency: number // 0-100
  color: string
}

// Drafts хранятся по serviceTypeId
export interface DraftsMap {
  [serviceTypeId: string]: {
    topic: string
    requirements: string
    subject: string
    timestamp: number
  }
}

// Состояние формы
export interface WizardFormState {
  serviceTypeId: string | null
  subject: string
  topic: string
  requirements: string
  files: File[]
  deadline: string | null
}

// Prefill данные (для повторного заказа)
export interface PrefillData {
  work_type?: string
  subject?: string
  topic?: string
  deadline?: string
}

// Локальный черновик
export interface LocalDraft extends WizardFormState {
  step: number
  timestamp: number
}
