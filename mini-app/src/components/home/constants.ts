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
    id: 'cashback',
    icon: Percent,
    title: 'Кэшбэк',
    subtitle: 'условия клуба',
    action: 'modal',
    modal: 'cashback',
  },
  {
    id: 'guarantees',
    icon: Shield,
    title: 'Гарантии',
    subtitle: 'сроки и защита заказа',
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
    title: 'Фото задания',
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
  'draft': { label: 'Черновик', color: 'var(--text-muted)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'pending': { label: 'Ожидает', color: 'var(--text-muted)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'waiting_estimation': { label: 'Оценка', color: 'var(--text-muted)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'waiting_payment': { label: 'К оплате', color: 'var(--gold-400)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'verification_pending': { label: 'Проверка', color: 'var(--gold-400)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'confirmed': { label: 'Подтверждён', color: 'var(--success-text)', bg: 'var(--success-glass)', border: 'var(--success-border)' },
  'paid': { label: 'Оплачен', color: 'var(--success-text)', bg: 'var(--success-glass)', border: 'var(--success-border)' },
  'paid_full': { label: 'Оплачен', color: 'var(--success-text)', bg: 'var(--success-glass)', border: 'var(--success-border)' },
  'in_progress': { label: 'В работе', color: 'var(--gold-400)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'review': { label: 'На проверке', color: 'var(--gold-400)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'revision': { label: 'Доработка', color: 'var(--gold-400)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'completed': { label: 'Выполнен', color: 'var(--success-text)', bg: 'var(--success-glass)', border: 'var(--success-border)' },
  'cancelled': { label: 'Отменён', color: 'var(--text-muted)', bg: 'rgba(201,162,39,0.06)', border: 'rgba(201,162,39,0.08)' },
  'rejected': { label: 'Отклонён', color: 'var(--error-text)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.12)' },
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
    color: 'var(--gold-400)',
    bgColor: 'rgba(201,162,39,0.06)',
    borderColor: 'rgba(201,162,39,0.08)',
  },
  new_message: {
    priority: 5,
    icon: MessageCircle,
    color: 'var(--gold-400)',
    bgColor: 'rgba(201,162,39,0.06)',
    borderColor: 'rgba(201,162,39,0.08)',
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
