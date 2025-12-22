import {
  GraduationCap, Clock, Percent, Shield, Zap, Camera, FileText,
  CreditCard, MessageCircle, RotateCcw, CheckCircle2
} from 'lucide-react'
import { QuickAction, UrgentOption, OrderStatusInfo } from './types'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS — Single row, no duplicates
// ═══════════════════════════════════════════════════════════════════════════

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'urgent',
    icon: Zap,
    title: 'Срочно',
    subtitle: 'от 24ч',
    action: 'sheet',
    modal: 'urgent',
  },
  {
    id: 'cashback',
    icon: Percent,
    title: 'Кешбэк',
    subtitle: 'до 10%',
    action: 'modal',
    modal: 'cashback',
  },
  {
    id: 'guarantees',
    icon: Shield,
    title: 'Гарантии',
    subtitle: 'Возврат',
    action: 'modal',
    modal: 'guarantees',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB OPTIONS — Bottom sheet with 2 choices
// ═══════════════════════════════════════════════════════════════════════════

export const URGENT_OPTIONS: UrgentOption[] = [
  {
    id: 'urgent_24h',
    icon: Clock,
    title: 'Срочный заказ',
    subtitle: 'Выполним за 24 часа',
    badge: '24ч',
    route: '/create-order?urgent=true',
    variant: 'primary',
  },
  {
    id: 'photo_estimate',
    icon: Camera,
    title: 'Скинь фото',
    subtitle: 'Оценим за 5 минут',
    badge: '5 мин',
    route: '/create-order?type=photo_task&urgent=true',
    variant: 'secondary',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER STATUS MAP — Premium styling per status
// ═══════════════════════════════════════════════════════════════════════════

export const ORDER_STATUS_MAP: Record<string, OrderStatusInfo> = {
  'draft': { label: 'Черновик', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  'pending': { label: 'Ожидает', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'waiting_estimation': { label: 'Оценка', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'waiting_payment': { label: 'К оплате', color: '#D4AF37', bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.4)' },
  'verification_pending': { label: 'Проверка', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  'confirmed': { label: 'Подтверждён', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'paid': { label: 'Оплачен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'paid_full': { label: 'Оплачен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'in_progress': { label: 'В работе', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
  'review': { label: 'На проверке', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' },
  'revision': { label: 'Доработка', color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  'completed': { label: 'Выполнен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'cancelled': { label: 'Отменён', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  'rejected': { label: 'Отклонён', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
}

// ═══════════════════════════════════════════════════════════════════════════
//  NEXT ACTION PRIORITIES — Dynamic card logic
// ═══════════════════════════════════════════════════════════════════════════

export const NEXT_ACTION_CONFIG = {
  payment: {
    priority: 1,
    icon: CreditCard,
    color: '#D4AF37',
    bgColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  files_needed: {
    priority: 2,
    icon: FileText,
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  revision: {
    priority: 3,
    icon: RotateCcw,
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.12)',
    borderColor: 'rgba(249,115,22,0.35)',
  },
  review: {
    priority: 4,
    icon: CheckCircle2,
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.35)',
  },
  new_message: {
    priority: 5,
    icon: MessageCircle,
    color: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.35)',
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORK TYPE ICONS — Visual distinction
// ═══════════════════════════════════════════════════════════════════════════

export const WORK_TYPE_ICONS: Record<string, typeof GraduationCap> = {
  'Курсовая работа': GraduationCap,
  'Дипломная работа': FileText,
  'Реферат': FileText,
  'Контрольная работа': FileText,
  'Эссе': FileText,
  'Отчёт по практике': FileText,
  'Диссертация': GraduationCap,
  'Презентация': FileText,
  'Задача': Zap,
  'Лабораторная работа': FileText,
  'Чертёж': FileText,
  'Фото задания': Camera,
}
