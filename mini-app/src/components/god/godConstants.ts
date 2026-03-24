/**
 * God Mode v3 — Constants, formatters & pure helpers
 * ====================================================
 * No React imports — pure TypeScript only.
 */

/* ═══════ Notification sound (base64 WAV beep) ═══════ */

export const NOTIFICATION_SOUND =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoGAACBhYaJioiGg4B9enh3dnd5fICDhYaHiImJiomJiIeGhYOBf3x6d3V0dHV2eXx/goWHiYqLjIyMi4qIhoSBfnx5dnRyc3N1d3p9gIOGiImLjI2NjYyLiYeFgn98eXd0cnFyc3Z4e36BhIeLjI6Pj4+OjYuJhoN/fHl2c3FwcXJ0d3p+gYSHi46Qk5KRkI6Liod/e3ZycG9vb3Byd3p+goeLj5KVlpWUko+Mh4B7dXFubmxsbW90eH2Dh4yQlJeYmJiWk4+LhX51cG1ramprbnJ3fYOJjZGVmJqampiVko6IgHpzbWppaGhqbnN5f4WKjpSXmZqbmZaUkYuEfnhxbGloZ2hqb3R7gYeMkZWYmpubmJaTjoiAeXJsaGdmZ2htc3qAhoyRlpmbnJ2bmJaTjYaAeXJsaGZlZmhtc3mAh4ySlpmcnp6bmJaTjYaAeXJsamdmZ2htc3qAhoySlpmbnJ2bmJaUj4iFfnlybWppaWltc3mAhoqPlJibnJ2bmJaTj4iFgHlzbWppZ2hrb3V7gYeMkZWYmpubmJaSjoiCe3VuaGdmZ2hscnl/hYqPlJeampyamJaTj4mDfXZwbGhnZmdqb3V7gYeNkZWYmZqZl5WSkI2KhYB6dXBsaGZlZWdrcHZ8goeMkJOWl5iXlZKPjImFgXx3c29raWhmZmdqbXF3fIGGioqKi4uLioqJh4aCfXl1cnBtbWxsbW1vcHJ1d3p9f4GCg4OEhISDg4KAfn18e3p6enp7fH5/gIGCgoKCgoKCgYGAfn18e3t7fH1+f4GCgoKCgoKBgYCAfn18e3t7e3x+gIGCg4ODg4OCgYCAfn18fHx8fH1/gIGCg4ODgoKBgH9+fXx8fHx9fn+AgYKDg4OCgYGAf359fHx8fX1+f4CCgoODg4KBgH9+fXx8fH19foCAgoKDg4OCgYB/fn18fHx9fX6AgIKCg4ODgoGAf359fHx8fX1+gICCgoODg4KCAX9/fn1+fn5+foCAgoKCgoKBgIB/fn19fX19fX+AgIGCgoKCgoGAgH9+fX19fX5/gICBgoKCgoKBgH9/fn19fX5+f4CAgYKCgoKBgYCAf35+fn5+fn+AgIGBgoKCgoGAgIB/fn5+fn5/gICBgoKCgoGBgIB/f35+fn5/gICBgoKCgoGBgIB/f39+fn5/f4CAgYGCgoKBgYCAf39/fn5/f4CAgYGCgoKBgYCAf39/f39/f4CAgYGBgoKBgYCAgH9/f39/f4CAgIGBgYGBgYCAgIB/f39/f4CAgICBgYGBgYGAgICAf39/f3+AgICBgYGBgYGBgICAgH9/f3+AgICBgYGBgYGBgICAgH9/f3+AgICBgYGBgYGBgICAf39/f4CAgICBgYGBgYCAgICAgH9/f4CAgICBgYGBgYCAf39/f39/f4CAgICBgYGBgYB/f39/f39/gICAgYGBgYGAgH9/f39/f4CAgIGBgYGBgH9/f39/f3+AgICBgYGBgYB/f39/f39/gICAgYGBgYGAf39/f39/f4CAgIGBgYGBgH9/f39/f3+AgICBgYGBgYB/f39/f39/gICAgYGBgYGAf39/f39/gICAgIGBgYGBgH9/f39/f4CAgICBgYGBgYB/f39/f3+AgICAgYGBgYGAf39/f39/gICAgIGBgYGBgH9/f39/f4CAgICBgYGBgYB/f39/f3+AgICAgYGBgYGAf39/f39/gICAgYGBgYGAgH9/f39/f4CAgICBgYGBgIB/f39/f39/gICAgYGBgYCAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgICAgICAf39/f39/f3+AgICAgICAf39/f39/f3+AgICAgICAf39/f39/f3+AgICAgICAf39/f39/f4CAgICAgIB/f39/f39/f4CAgICAgH9/f39/f39/gICAgICAgH9/f39/f39/gICAgICAgA=='

/* ═══════ Admin notification ═══════ */

export interface AdminNotification {
  id: string
  type: 'new_order' | 'payment_pending' | 'new_message'
  title: string
  message: string
  timestamp: Date
  data?: unknown
}

/* ═══════ Tab system ═══════ */

export type TabId = 'center' | 'orders' | 'clients' | 'analytics' | 'marketing' | 'radar' | 'tools'

export interface TabMeta { id: TabId; label: string }

export const TABS: TabMeta[] = [
  { id: 'center',    label: 'Центр' },
  { id: 'orders',    label: 'Заказы' },
  { id: 'clients',   label: 'Клиенты' },
  { id: 'analytics', label: 'Графики' },
  { id: 'marketing', label: 'Маркетинг' },
  { id: 'radar',     label: 'Радар' },
  { id: 'tools',     label: 'SQL' },
]

/* ═══════ Status config ═══════ */

export const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  draft:                { label: 'Черновик',    emoji: '📝', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  pending:              { label: 'Новый',       emoji: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  waiting_estimation:   { label: 'Оценка',      emoji: '🔍', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  waiting_payment:      { label: 'К оплате',    emoji: '💵', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  verification_pending: { label: 'Проверка',    emoji: '🔔', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  confirmed:            { label: 'Подтверждён', emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  paid:                 { label: 'Аванс',       emoji: '💳', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  paid_full:            { label: 'Оплачен',     emoji: '💰', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  in_progress:          { label: 'В работе',    emoji: '⚙️', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  review:               { label: 'Готово',       emoji: '📋', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  revision:             { label: 'Правки',      emoji: '✏️', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  completed:            { label: 'Завершён',    emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled:            { label: 'Отменён',     emoji: '—',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  rejected:             { label: 'Отклонён',    emoji: '—',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

/* ═══════ Status pipeline (for funnel/pipeline visualizations) ═══════ */

export const STATUS_PIPELINE = [
  'pending', 'waiting_estimation', 'waiting_payment',
  'verification_pending', 'paid', 'paid_full',
  'in_progress', 'review', 'revision', 'completed',
] as const

/* ═══════ Transaction reason labels ═══════ */

export const TRANSACTION_REASON_LABELS: Record<string, string> = {
  order_created: 'Бонус за новый заказ',
  referral_bonus: 'Реферальный бонус',
  admin_adjustment: 'Ручная корректировка',
  order_discount: 'Оплата бонусами',
  compensation: 'Компенсация',
  order_cashback: 'Кэшбэк за заказ',
  bonus_expired: 'Сгорание бонусов',
  streak_freeze: 'Защита серии',
  coupon: 'Купон',
  promo_code: 'Промокод',
  order_refund: 'Возврат бонусов',
}

/* ═══════ SQL quick presets ═══════ */

export const SQL_PRESETS = [
  { label: 'Топ клиенты', query: 'SELECT id, fullname, balance, orders_count, total_spent FROM users ORDER BY total_spent DESC LIMIT 15' },
  { label: 'Заказы сегодня', query: "SELECT id, status, work_type, price, created_at FROM orders WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC" },
  { label: 'Выручка 7д', query: "SELECT DATE(completed_at) as day, SUM(paid_amount) as revenue, COUNT(*) as cnt FROM orders WHERE status='completed' AND completed_at > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day" },
  { label: 'Промо стат', query: "SELECT promo_code, COUNT(*) as uses, SUM(promo_discount_amount) as saved FROM orders WHERE promo_code IS NOT NULL GROUP BY promo_code ORDER BY uses DESC" },
]

/* ═══════ Chart period options ═══════ */

export const CHART_PERIODS = [
  { label: '7д',  days: 7 },
  { label: '14д', days: 14 },
  { label: '30д', days: 30 },
  { label: '90д', days: 90 },
] as const

/* ═══════ User segment filters ═══════ */

export const USER_SEGMENTS = [
  { id: '',             label: 'Все' },
  { id: 'with_balance', label: 'VIP' },
  { id: 'watched',      label: 'Контроль' },
  { id: 'banned',       label: 'Бан' },
] as const

/* ═══════ Formatters ═══════ */

export function formatMoney(value: number | null | undefined): string {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`
}

export function formatMoneyShort(value: number | null | undefined): string {
  const v = Number(value || 0)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₽`
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K ₽`
  return `${v} ₽`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatPageLabel(value: string | null | undefined): string {
  if (!value) return 'Неизвестно'
  const labels: Record<string, string> = {
    '/': 'Главная', '/orders': 'Заказы', '/profile': 'Профиль',
    '/club': 'Клуб', '/support': 'Поддержка', '/create-order': 'Новый заказ',
  }
  return labels[value] || value
}

export function formatTrend(current: number, previous: number): { value: number; label: string; positive: boolean } {
  if (!previous) return { value: 0, label: '—', positive: true }
  const pct = ((current - previous) / previous) * 100
  return {
    value: Math.abs(pct),
    label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    positive: pct >= 0,
  }
}

/* ═══════ URL state helpers ═══════ */

export function withRouteParams(
  current: URLSearchParams,
  updates: Record<string, string | null | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(current)
  Object.entries(updates).forEach(([key, value]) => {
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
  })
  return next
}

export function getActiveTab(searchParams: URLSearchParams): TabId {
  const tab = searchParams.get('tab')
  return TABS.some((t) => t.id === tab) ? (tab as TabId) : 'center'
}
