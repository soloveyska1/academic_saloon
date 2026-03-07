/**
 * GOD MODE - Full Admin Control Panel
 * ====================================
 * Access restricted to ADMIN_IDS only (verified via Telegram initData)
 * No passwords - pure Telegram authentication
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, Activity, Users, Package, Tag, ScrollText, Terminal, Radio,
  TrendingUp, TrendingDown, DollarSign, Clock, Eye, EyeOff, Ban,
  MessageSquare, Check, X, RefreshCw, Search, Filter, ChevronRight,
  AlertTriangle, Send, Plus, Trash2, ToggleLeft, ToggleRight,
  Zap, Settings, Home, Shield, Bell, CreditCard, Percent, Volume2, VolumeX
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAdmin } from '../contexts/AdminContext'
import {
  fetchGodDashboard,
  fetchGodOrders,
  fetchGodOrderDetails,
  fetchGodUsers,
  fetchGodUserDetails,
  fetchGodPromos,
  fetchGodLogs,
  fetchGodLiveActivity,
  updateGodOrderStatus,
  updateGodOrderPrice,
  updateGodOrderProgress,
  updateGodOrderNotes,
  confirmGodPayment,
  rejectGodPayment,
  sendGodOrderMessage,
  modifyGodUserBalance,
  toggleGodUserBan,
  toggleGodUserWatch,
  updateGodUserNotes,
  createGodPromo,
  toggleGodPromo,
  deleteGodPromo,
  executeGodSql,
  sendGodBroadcast,
  subscribeGodNotifications,
  unsubscribeGodNotifications,
  API_WS_URL,
} from '../api/userApi'
import type { GodDashboard, GodOrder, GodUser, GodPromo, GodLog, GodLiveUser } from '../types'
import { useToast } from '../components/ui/Toast'
import { getLastAppRoute } from '../utils/navigation'

// Notification sound (base64 encoded simple beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoGAACBhYaJioiGg4B9enh3dnd5fICDhYaHiImJiomJiIeGhYOBf3x6d3V0dHV2eXx/goWHiYqLjIyMi4qIhoSBfnx5dnRyc3N1d3p9gIOGiImLjI2NjYyLiYeFgn98eXd0cnFyc3Z4e36BhIeLjI6Pj4+OjYuJhoN/fHl2c3FwcXJ0d3p+gYSHi46Qk5KRkI6Liod/e3ZycG9vb3Byd3p+goeLj5KVlpWUko+Mh4B7dXFubmxsbW90eH2Dh4yQlJeYmJiWk4+LhX51cG1ramprbnJ3fYOJjZGVmJqampiVko6IgHpzbWppaGhqbnN5f4WKjpSXmZqbmZaUkYuEfnhxbGloZ2hqb3R7gYeMkZWYmpubmJaTjoiAeXJsaGdmZ2ptc3qAhoyRlpmbnJ2bmJaTjYaAeXJsaGZlZmhtc3mAh4ySlpmcnp6bmJaTjYaAeXJsamdmZ2htc3qAhoySlpmbnJ2bmJaUj4iFfnlybWppaWltc3mAhoqPlJibnJ2bmJaTj4iFgHlzbWppZ2hrb3V7gYeMkZWYmpubmJaSjoiCe3VuaGdmZ2hscnl/hYqPlJeampyamJaTj4mDfXZwbGhnZmdqb3V7gYeNkZWYmZqZl5WSkI2KhYB6dXBsaGZlZWdrcHZ8goeMkJOWl5iXlZKPjImFgXx3c29raWhmZmdqbXF3fIGGioqKi4uLioqJh4aCfXl1cnBtbWxsbW1vcHJ1d3p9f4GCg4OEhISDg4KAfn18e3p6enp7fH5/gIGCgoKCgoKCgYGAfn18e3t7fH1+f4GCgoKCgoKBgYCAfn18e3t7e3x+gIGCg4ODg4OCgYCAfn18fHx8fH1/gIGCg4ODgoKBgH9+fXx8fHx9fn+AgYKDg4OCgYGAf359fHx8fX1+f4CCgoODg4KBgH9+fXx8fH19foCAgoKDg4OCgYB/fn18fHx9fX6AgIKCg4OCgoGAf359fHx8fX1+gICCgoODg4KCAX9/fn1+fn5+foCAgoKCgoKBgIB/fn19fX19fX+AgIGCgoKCgoGAgH9+fX19fX5/gICBgoKCgoKBgH9/fn19fX5+f4CAgYKCgoKBgYCAf35+fn5+fn+AgIGBgoKCgoGAgIB/fn5+fn5/gICBgoKCgoGBgIB/f35+fn5/gICBgoKCgoGBgIB/f39+fn5/f4CAgYGCgoKBgYCAf39/fn5/f4CAgYGCgoKBgYCAf39/f39/f4CAgYGBgoKBgYCAgH9/f39/f4CAgYGBgYGBgYCAgIB/f39/f4CAgIGBgYGBgYGAgICAf39/f3+AgICBgYGBgYGBgICAgH9/f3+AgICBgYGBgYGBgICAgH9/f3+AgICBgYGBgYGBgICAf39/f4CAgICBgYGBgYCAgICAgH9/f4CAgICBgYGBgYCAf39/f39/f4CAgICBgYGBgYB/f39/f39/gICAgYGBgYGAgH9/f39/f4CAgIGBgYGBgIB/f39/f39/gICAgYGBgYGAf39/f39/f4CAgIGBgYGBgH9/f39/f3+AgICBgYGBgYB/f39/f39/gICAgYGBgYGAf39/f39/gICAgIGBgYGBgH9/f39/f4CAgICBgYGBgYB/f39/f3+AgICAgYGBgYGAf39/f39/gICAgIGBgYGBgH9/f39/f4CAgICBgYGBgYB/f39/f3+AgICAgYGBgYGAf39/f39/gICAgYGBgYGAgH9/f39/f4CAgICBgYGBgIB/f39/f39/gICAgYGBgYCAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgIGBgYCAgH9/f39/f4CAgICBgYGAgIB/f39/f3+AgICAgYGBgICAf39/f39/gICAgICAgICAf39/f39/f3+AgICAgICAf39/f39/f3+AgICAgICAf39/f39/f3+AgICAgICAf39/f39/f4CAgICAgIB/f39/f39/f4CAgICAgH9/f39/f39/gICAgICAgH9/f39/f39/gICAgICAgA=='

// Admin notification types
interface AdminNotification {
  id: string
  type: 'new_order' | 'payment_pending' | 'new_message'
  title: string
  message: string
  timestamp: Date
  data?: unknown
}

// Status colors and labels
const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  draft: { label: 'Черновик', emoji: '📝', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  pending: { label: 'Ожидает', emoji: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  waiting_estimation: { label: 'Оценка', emoji: '🔍', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  waiting_payment: { label: 'К оплате', emoji: '💵', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  verification_pending: { label: 'Проверка', emoji: '🔔', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  confirmed: { label: 'Подтверждён', emoji: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  paid: { label: 'Аванс', emoji: '💳', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  paid_full: { label: 'Оплачен', emoji: '💰', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  in_progress: { label: 'В работе', emoji: '⚙️', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  review: { label: 'Готово', emoji: '🔍', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  revision: { label: 'Правки', emoji: '✏️', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  completed: { label: 'Завершён', emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled: { label: 'Отменён', emoji: '—', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  rejected: { label: 'Отклонён', emoji: '—', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

// Tabs configuration
type TabId = 'dashboard' | 'orders' | 'users' | 'promos' | 'live' | 'logs' | 'sql' | 'broadcast'
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Центр', icon: <Home size={18} /> },
  { id: 'orders', label: 'Заказы', icon: <Package size={18} /> },
  { id: 'users', label: 'Клиенты', icon: <Users size={18} /> },
  { id: 'promos', label: 'Промокоды', icon: <Tag size={18} /> },
  { id: 'live', label: 'Онлайн', icon: <Radio size={18} /> },
  { id: 'logs', label: 'Журнал', icon: <ScrollText size={18} /> },
  { id: 'sql', label: 'Запросы', icon: <Terminal size={18} /> },
  { id: 'broadcast', label: 'Рассылка', icon: <Bell size={18} /> },
]

// Common styles
const cardStyle: React.CSSProperties = {
  background: 'radial-gradient(circle at top right, rgba(212,175,55,0.12), transparent 38%), linear-gradient(145deg, rgba(24,24,28,0.96), rgba(12,12,15,0.98))',
  border: '1px solid rgba(212,175,55,0.16)',
  boxShadow: '0 18px 48px rgba(0,0,0,0.28)',
  borderRadius: 22,
  padding: 18,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 18px',
  background: 'linear-gradient(180deg, #f5d485, #D4AF37)',
  border: 'none',
  borderRadius: 14,
  color: '#0a0a0c',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
  color: '#fff',
}

const TRANSACTION_REASON_LABELS: Record<string, string> = {
  order_created: 'Бонус за новый заказ',
  referral_bonus: 'Реферальный бонус',
  admin_adjustment: 'Ручная корректировка',
  order_discount: 'Оплата бонусами',
  compensation: 'Компенсация',
  order_cashback: 'Кэшбэк за заказ',
  bonus_expired: 'Сгорание бонусов',
  daily_luck: 'Ежедневный бонус',
  coupon: 'Купон',
  promo_code: 'Промокод',
  order_refund: 'Возврат бонусов',
}

function formatMoney(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Нет данных'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Нет данных'
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPageLabel(value: string | null | undefined) {
  if (!value) return 'Экран не определён'

  const labels: Record<string, string> = {
    '/': 'Главная',
    '/orders': 'Заказы',
    '/profile': 'Профиль',
    '/club': 'Клуб',
    '/support': 'Поддержка',
    '/create-order': 'Оформление заказа',
  }

  return labels[value] || value
}

function withRouteParams(current: URLSearchParams, updates: Record<string, string | null | undefined>) {
  const next = new URLSearchParams(current)

  Object.entries(updates).forEach(([key, value]) => {
    if (!value || value === 'all') {
      next.delete(key)
      return
    }
    next.set(key, value)
  })

  return next
}

function getActiveTab(searchParams: URLSearchParams): TabId {
  const tab = searchParams.get('tab')
  return TABS.some(item => item.id === tab) ? (tab as TabId) : 'dashboard'
}

function SectionHeader({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow: string
  title: string
  description: string
  meta?: string
}) {
  return (
    <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 10px',
          borderRadius: 999,
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.16)',
          color: '#d4af37',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {eyebrow}
        </div>
        {meta && (
          <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12 }}>
            {meta}
          </div>
        )}
      </div>
      <div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
    </div>
  )
}

function StateCard({
  title,
  description,
  tone = 'neutral',
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  tone?: 'neutral' | 'error'
  actionLabel?: string
  onAction?: () => void
}) {
  const accent = tone === 'error' ? '#fca5a5' : '#d4af37'

  return (
    <div style={{
      ...cardStyle,
      padding: 18,
      borderColor: tone === 'error' ? 'rgba(239,68,68,0.22)' : 'rgba(212,175,55,0.14)',
      background: tone === 'error'
        ? 'radial-gradient(circle at top right, rgba(239,68,68,0.12), transparent 40%), linear-gradient(145deg, rgba(24,20,22,0.96), rgba(12,12,15,0.98))'
        : cardStyle.background,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: tone === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(212,175,55,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AlertTriangle size={18} color={accent} />
        </div>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
          {title}
        </div>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.6 }}>
        {description}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{ ...secondaryButtonStyle, width: 'fit-content' }}
        >
          <RefreshCw size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function GodModePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin, telegramId, simulateNewUser, toggleSimulateNewUser, accessResolved } = useAdmin()
  const activeTab = useMemo(() => getActiveTab(searchParams), [searchParams])
  const appReturnPath = useMemo(() => getLastAppRoute(), [])
  const appReturnLabel = useMemo(
    () => formatPageLabel(appReturnPath.split('?')[0] || '/'),
    [appReturnPath]
  )

  // Notification state
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND)
        audioRef.current.volume = 0.5
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [soundEnabled])

  // Add notification
  const addNotification = useCallback((notif: Omit<AdminNotification, 'id' | 'timestamp'>) => {
    const newNotif: AdminNotification = {
      ...notif,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date(),
    }
    setNotifications(prev => [newNotif, ...prev.slice(0, 19)]) // Keep last 20
    setUnreadCount(prev => prev + 1)
    playSound()

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }, [playSound])

  // Connect to WebSocket for real-time admin notifications
  useEffect(() => {
    if (!isAdmin || !telegramId) return

    // Subscribe to admin notifications
    subscribeGodNotifications().catch(() => {})

    // Connect WebSocket
    const connectWs = () => {
      const ws = new WebSocket(`${API_WS_URL}?telegram_id=${telegramId}`)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle admin-specific messages
          if (data.type === 'admin_new_order') {
            const order = data.order
            addNotification({
              type: 'new_order',
              title: '🆕 Новый заказ',
              message: `#${order.id} - ${order.work_type_label}\n${order.subject}\nОт: ${order.user_fullname}`,
              data: order,
            })
          } else if (data.type === 'admin_payment_pending') {
            addNotification({
              type: 'payment_pending',
              title: '💳 Ожидает оплаты',
              message: `Заказ #${data.order_id}\nСумма: ${data.amount}₽\nОт: ${data.user_fullname}`,
              data,
            })
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        setTimeout(connectWs, 3000) // Reconnect after 3s
      }

      ws.onerror = () => {
        ws.close()
      }

      wsRef.current = ws
    }

    connectWs()

    // Cleanup
    return () => {
      unsubscribeGodNotifications().catch(() => {})
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [isAdmin, telegramId, addNotification])

  // Clear unread count when viewing dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      setUnreadCount(0)
    }
  }, [activeTab])

  const handleTabChange = useCallback((tab: TabId) => {
    const next = withRouteParams(searchParams, {
      tab,
      order_q: null,
      order_status: null,
      user_q: null,
      user_filter: null,
    })
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleReturnToApp = useCallback(() => {
    navigate(appReturnPath || '/')
  }, [appReturnPath, navigate])

  if (!accessResolved) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 14,
      }}>
        <LoadingSpinner />
        <div style={{ color: '#D4AF37', fontSize: 14, fontWeight: 700 }}>
          Проверяем доступ к операционному центру
        </div>
        <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, textAlign: 'center', maxWidth: 320 }}>
          Подтягиваем Telegram-сессию и права администратора.
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={40} color="#ef4444" />
        </motion.div>
        <h1 style={{ color: '#ef4444', fontSize: 24, margin: 0 }}>Доступ закрыт</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 300 }}>
          У вас нет доступа к админ-панели.
          Если это ошибка, проверьте права доступа.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #09090b 0%, #0d0d11 46%, #09090b 100%)',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(180deg, rgba(10,10,12,0.98), rgba(10,10,12,0.9))',
        backdropFilter: 'blur(24px)',
        zIndex: 100,
      }}>
        <div style={{
          ...cardStyle,
          padding: 16,
          borderRadius: 24,
          background: 'radial-gradient(circle at top right, rgba(212,175,55,0.18), transparent 36%), linear-gradient(145deg, rgba(24,24,28,0.98), rgba(10,10,13,0.98))',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12, flex: '1 1 260px', minWidth: 0 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #D4AF37, #f5d485)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 30px rgba(212,175,55,0.2)',
                flexShrink: 0,
              }}>
                <Crown size={24} color="#0a0a0c" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: '#D4AF37',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  Админка салона
                </div>
                <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>
                  Операционный центр
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 520 }}>
                  Заказы, клиенты, промокоды и вся операционная работа в одном ритме с приложением.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 1 auto' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleReturnToApp}
                style={{ ...secondaryButtonStyle, minHeight: 44 }}
                title={`Вернуться на экран "${appReturnLabel}"`}
              >
                <Home size={16} />
                Вернуться в приложение
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={toggleSimulateNewUser}
                style={{
                  ...secondaryButtonStyle,
                  minHeight: 44,
                  background: simulateNewUser
                    ? 'linear-gradient(180deg, rgba(168,85,247,0.22), rgba(124,58,237,0.16))'
                    : secondaryButtonStyle.background,
                  border: simulateNewUser ? '1px solid rgba(196,181,253,0.32)' : '1px solid rgba(255,255,255,0.08)',
                  color: simulateNewUser ? '#ddd6fe' : '#fff',
                }}
                title={simulateNewUser ? 'Выключить полный сценарий новичка' : 'Включить полный сценарий новичка'}
              >
                <Users size={16} />
                {simulateNewUser ? 'Тест новичка активен' : 'Сценарий новичка'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  ...secondaryButtonStyle,
                  minHeight: 44,
                  background: soundEnabled
                    ? 'linear-gradient(180deg, rgba(34,197,94,0.18), rgba(21,128,61,0.12))'
                    : 'linear-gradient(180deg, rgba(239,68,68,0.16), rgba(153,27,27,0.12))',
                  border: `1px solid ${soundEnabled ? 'rgba(34,197,94,0.26)' : 'rgba(239,68,68,0.26)'}`,
                  color: soundEnabled ? '#bbf7d0' : '#fecaca',
                }}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {soundEnabled ? 'Звук включён' : 'Звук выключен'}
              </motion.button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.14)',
              color: '#d4af37',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Раздел: {TABS.find(tab => tab.id === activeTab)?.label}
            </div>
            <div style={{
              padding: '8px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              Возврат: {appReturnLabel}
            </div>
            <div style={{
              padding: '8px 12px',
              borderRadius: 999,
              background: unreadCount > 0 ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)',
              border: `1px solid ${unreadCount > 0 ? 'rgba(239,68,68,0.24)' : 'rgba(34,197,94,0.2)'}`,
              color: unreadCount > 0 ? '#fecaca' : '#bbf7d0',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Bell size={14} />
              {unreadCount > 0 ? `${unreadCount} новых сигналов` : 'Сигналы под контролем'}
            </div>
          </div>

        {/* Notification toast */}
        <AnimatePresence>
          {notifications.length > 0 && notifications[0].timestamp > new Date(Date.now() - 5000) && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              style={{
                marginTop: 12,
                padding: '12px 16px',
                background: notifications[0].type === 'new_order'
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(236,72,153,0.15)',
                border: `1px solid ${notifications[0].type === 'new_order' ? 'rgba(34,197,94,0.3)' : 'rgba(236,72,153,0.3)'}`,
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: notifications[0].type === 'new_order'
                    ? 'rgba(34,197,94,0.2)'
                    : 'rgba(236,72,153,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {notifications[0].type === 'new_order' ? (
                    <Package size={16} color="#22c55e" />
                  ) : (
                    <CreditCard size={16} color="#ec4899" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: notifications[0].type === 'new_order' ? '#22c55e' : '#ec4899',
                    marginBottom: 4,
                  }}>
                    {notifications[0].title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.4,
                  }}>
                    {notifications[0].message}
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.slice(1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 10,
        padding: '12px 16px 0',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '12px 16px',
              borderRadius: 16,
              border: `1px solid ${activeTab === tab.id ? 'rgba(212,175,55,0.28)' : 'rgba(255,255,255,0.08)'}`,
              background: activeTab === tab.id
                ? 'linear-gradient(180deg, rgba(245,212,133,0.98), rgba(212,175,55,0.98))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
              color: activeTab === tab.id ? '#0a0a0c' : 'rgba(255,255,255,0.74)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.id ? '0 12px 30px rgba(212,175,55,0.2)' : 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardTab key="dashboard" />}
          {activeTab === 'orders' && <OrdersTab key="orders" />}
          {activeTab === 'users' && <UsersTab key="users" />}
          {activeTab === 'promos' && <PromosTab key="promos" />}
          {activeTab === 'live' && <LiveTab key="live" />}
          {activeTab === 'logs' && <LogsTab key="logs" />}
          {activeTab === 'sql' && <SqlTab key="sql" />}
          {activeTab === 'broadcast' && <BroadcastTab key="broadcast" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<GodDashboard | null>(null)
  const [pendingOrders, setPendingOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const previousPendingCountRef = useRef(0)

  const openRoute = useCallback((tab: TabId, updates: Record<string, string | null | undefined>) => {
    const next = withRouteParams(searchParams, {
      tab,
      order_status: null,
      order_q: null,
      user_filter: null,
      user_q: null,
      ...updates,
    })
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardResult, ordersResult] = await Promise.all([
        fetchGodDashboard(),
        fetchGodOrders({ status: 'verification_pending', limit: 10 })
      ])
      setData(dashboardResult)
      setPendingOrders(ordersResult.orders)
      setError(null)

      // Play sound if new pending orders
      if (ordersResult.orders.length > 0 && previousPendingCountRef.current < ordersResult.orders.length) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2ckIB0aGRqeIyeo52SgHBjYGd3jJ+pqJuKd2hkaHqOnqmomox4aGVofI+gqqmai3doZWl9kKGrq5qKeGhlanySoaurmop4aGVqfZKhq6yainhoZWp9kqGrrJqKeGhlbH6SoausmYp4aGZsfpOiq6yZinhpZm1/k6KsrJmJeGlmbYCToqysmon/');
          audio.volume = 0.3
          audio.play().catch(() => {})
        } catch {}
      }
      previousPendingCountRef.current = ordersResult.orders.length
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить сводку'
      setError(message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => {
      void load()
    }, 15000)
    return () => window.clearInterval(interval)
  }, [load])

  const handleQuickConfirm = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await confirmGodPayment(orderId)
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      await load()
      // Vibrate on success
      if (navigator.vibrate) navigator.vibrate(100)
    } catch {
      /* silent */
    }
    setActionLoading(null)
  }

  const handleQuickReject = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await rejectGodPayment(orderId, 'Платёж не найден')
      setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      await load()
    } catch {
      /* silent */
    }
    setActionLoading(null)
  }

  if (loading && !data) {
    return <LoadingSpinner />
  }

  if (!data) {
    return (
      <StateCard
        tone="error"
        title="Сводка центра сейчас недоступна"
        description={error || 'Не удалось собрать показатели админки.'}
        actionLabel="Загрузить ещё раз"
        onAction={() => void load()}
      />
    )
  }

  const focusQueues = [
    {
      id: 'pending',
      label: 'Новые заявки',
      count: data.orders.by_status.pending || 0,
      description: 'Сразу забрать в работу и оценить объём.',
      accent: '#f59e0b',
      onClick: () => openRoute('orders', { order_status: 'pending' }),
    },
    {
      id: 'waiting_estimation',
      label: 'На оценке',
      count: data.orders.by_status.waiting_estimation || 0,
      description: 'Назначить цену и не потерять горячий спрос.',
      accent: '#8b5cf6',
      onClick: () => openRoute('orders', { order_status: 'waiting_estimation' }),
    },
    {
      id: 'verification_pending',
      label: 'Проверка оплаты',
      count: data.orders.by_status.verification_pending || 0,
      description: 'Подтвердить платёж и запустить заказ без задержки.',
      accent: '#ec4899',
      onClick: () => openRoute('orders', { order_status: 'verification_pending' }),
    },
    {
      id: 'watched',
      label: 'Клиенты под наблюдением',
      count: data.users.watched || 0,
      description: 'Проблемные и ценные клиенты в отдельной очереди.',
      accent: '#D4AF37',
      onClick: () => openRoute('users', { user_filter: 'watched' }),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        eyebrow="Контроль"
        title="Центр управления"
        description="Ключевые показатели, горячие очереди и быстрые действия, чтобы ничего не терялось между статусами."
        meta={error ? 'Последняя загрузка прошла с предупреждением' : `Онлайн: ${data.users.online}`}
      />

      {/* QUICK ACTIONS - Pending Payments */}
      {pendingOrders.length > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05))',
            border: '2px solid rgba(236,72,153,0.4)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '12px 16px',
            background: 'rgba(236,72,153,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Bell size={20} color="#ec4899" />
            </motion.div>
            <span style={{ color: '#ec4899', fontWeight: 700, fontSize: 14 }}>
              Проверка оплаты ({pendingOrders.length})
            </span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingOrders.slice(0, 5).map(order => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{
                  padding: 12,
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                      #{order.id} •{' '}
                      {order.promo_code && order.price !== order.final_price && (
                        <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>
                          {order.price.toLocaleString()}
                        </span>
                      )}
                      <span style={{ color: order.promo_code ? '#22c55e' : '#fff' }}>
                        {order.final_price.toLocaleString()}₽
                      </span>
                    </span>
                    {order.promo_code && (
                      <span style={{
                        padding: '3px 8px',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,197,94,0.2))',
                        border: '1px solid rgba(139,92,246,0.5)',
                        color: '#a78bfa',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        🎟️ {order.promo_code} −{order.promo_discount}%
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {order.user_fullname} • {order.work_type_label}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleQuickConfirm(order.id)}
                    disabled={actionLoading === order.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: actionLoading === order.id ? 0.5 : 1,
                    }}
                  >
                    <Check size={20} color="#fff" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleQuickReject(order.id)}
                    disabled={actionLoading === order.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: actionLoading === order.id ? 0.5 : 1,
                    }}
                  >
                    <X size={20} color="#fff" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Attention Alert */}
      {data.orders.needing_attention > 0 && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
            border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={24} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
                Требуют внимания: {data.orders.needing_attention}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                Новые, на оценке и на проверке оплаты
              </div>
            </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {focusQueues.map(queue => (
          <FocusCard
            key={queue.id}
            label={queue.label}
            count={queue.count}
            description={queue.description}
            accent={queue.accent}
            onClick={queue.onClick}
          />
        ))}
      </div>

      {/* Revenue Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <DollarSign size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Выручка</span>
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Сегодня" value={`${data.revenue.today.toLocaleString()}₽`} color="#22c55e" />
          <StatCard label="Неделя" value={`${data.revenue.week.toLocaleString()}₽`} color="#3b82f6" />
          <StatCard label="Месяц" value={`${data.revenue.month.toLocaleString()}₽`} color="#8b5cf6" />
          <StatCard label="Всего" value={`${data.revenue.total.toLocaleString()}₽`} color="#D4AF37" />
        </div>
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          Средний чек: {data.revenue.average_order.toLocaleString()}₽
        </div>
      </div>

      {/* Orders Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Package size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Заказы</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Активных" value={data.orders.active} color="#3b82f6" />
          <StatCard label="Сегодня" value={data.orders.today} color="#22c55e" />
          <StatCard label="Завершено сегодня" value={data.orders.completed_today} color="#8b5cf6" />
          <StatCard label="Всего" value={data.orders.total} color="#D4AF37" />
        </div>
      </div>

      {/* Users Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Users size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Пользователи</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Онлайн" value={data.users.online} color="#22c55e" />
          <StatCard label="Сегодня" value={data.users.today} color="#3b82f6" />
          <StatCard label="За неделю" value={data.users.week} color="#8b5cf6" />
          <StatCard label="Всего" value={data.users.total} color="#D4AF37" />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          <span>Забанено: {data.users.banned}</span>
          <span>Под наблюдением: {data.users.watched}</span>
        </div>
        <div style={{ marginTop: 8, color: 'rgba(212,175,55,0.6)', fontSize: 12 }}>
          Общий баланс бонусов: {data.users.total_bonus_balance.toLocaleString()}₽
        </div>
      </div>

      {/* Promo Stats */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Tag size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>Промокоды</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Всего" value={data.promos.total} color="#D4AF37" />
          <StatCard label="Активных" value={data.promos.active} color="#22c55e" />
          <StatCard label="Использований" value={data.promos.total_uses} color="#3b82f6" />
          <StatCard label="Сэкономлено" value={`${data.promos.total_discount_given.toLocaleString()}₽`} color="#8b5cf6" />
        </div>
        {data.promos.popular.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>
              Популярные промокоды:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.promos.popular.map((promo, idx) => (
                <div
                  key={promo.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'rgba(212,175,55,0.1)',
                    borderRadius: 6,
                    borderLeft: `3px solid ${idx === 0 ? '#D4AF37' : idx === 1 ? '#c0c0c0' : '#cd7f32'}`,
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <span style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>
                    {promo.code}
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {promo.uses} исп.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orders by Status */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={20} color="#D4AF37" />
          <span style={{ color: '#fff', fontWeight: 600 }}>По статусам</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(data.orders.by_status)
            .filter(([_, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { label: status, emoji: '📋', color: '#fff', bg: 'rgba(255,255,255,0.1)' }
              return (
                <div key={status} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  background: cfg.bg,
                  borderRadius: 8,
                }}>
                  <span>{cfg.emoji}</span>
                  <span style={{ color: cfg.color, fontWeight: 500, flex: 1 }}>{cfg.label}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: 12,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 10,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function FocusCard({
  label,
  count,
  description,
  accent,
  onClick,
}: {
  label: string
  count: number
  description: string
  accent: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...cardStyle,
        padding: 14,
        cursor: 'pointer',
        textAlign: 'left',
        border: `1px solid ${accent}25`,
        background: `linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98)), ${accent}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          minWidth: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${accent}18`,
          color: accent,
          fontSize: 18,
          fontWeight: 800,
        }}>
          {count}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, lineHeight: 1.35, marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12, lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent, fontSize: 12, fontWeight: 700 }}>
        Открыть очередь
        <ChevronRight size={14} />
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function OrdersTab() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('order_q') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('order_status') || 'all')
  const [selectedOrder, setSelectedOrder] = useState<GodOrder | null>(null)
  const [total, setTotal] = useState(0)
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    const nextSearch = searchParams.get('order_q') || ''
    const nextStatus = searchParams.get('order_status') || 'all'
    if (nextSearch !== search) {
      setSearch(nextSearch)
    }
    if (nextStatus !== statusFilter) {
      setStatusFilter(nextStatus)
    }
  }, [search, searchParams, statusFilter])

  useEffect(() => {
    const next = withRouteParams(searchParams, {
      tab: 'orders',
      order_q: search.trim() || null,
      order_status: statusFilter,
    })

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [search, searchParams, setSearchParams, statusFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodOrders({ status: statusFilter, search: deferredSearch, limit: 100 })
      setOrders(result.orders)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить заказы'
      setOrders([])
      setTotal(0)
      setError(message)
      showToast({
        type: 'error',
        title: 'Заказы не загрузились',
        message,
      })
    }
    setLoading(false)
  }, [deferredSearch, showToast, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        eyebrow="Операции"
        title="Заказы"
        description="Все заявки, статусы и быстрый вход в детали заказа без провалов между очередями."
        meta={statusFilter === 'all'
          ? `Показано ${total} заказов`
          : `Очередь: ${STATUS_CONFIG[statusFilter]?.label || statusFilter}`}
      />

      <div style={{ ...cardStyle, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ID заказа, тема или предмет"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 40 }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 156 }}
          >
            <option value="all">Все статусы</option>
            <option value="pending">Ожидает</option>
            <option value="verification_pending">Проверка</option>
            <option value="waiting_payment">К оплате</option>
            <option value="in_progress">В работе</option>
            <option value="review">Готово</option>
            <option value="completed">Завершён</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            style={{ ...secondaryButtonStyle, minHeight: 48 }}
          >
            <RefreshCw size={16} />
            Обновить
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Найдено: {total}
          </div>
          <div style={{
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.16)',
            color: '#d4af37',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {statusFilter === 'all' ? 'Все очереди' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? <LoadingSpinner /> : error ? (
        <StateCard
          tone="error"
          title="Очередь заказов сейчас недоступна"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      ) : (
        orders.length === 0 ? (
          <StateCard
            title="По текущему фильтру заявок нет"
            description="Попробуйте снять фильтр или уточнить поисковый запрос. Очередь останется здесь же, без перезагрузки экрана."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function OrderCard({ order, onClick }: { order: GodOrder; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const shortUserName = order.user_username ? `@${order.user_username}` : order.user_fullname

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 18px 40px rgba(0,0,0,0.34)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        ...cardStyle,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{
              padding: '6px 10px',
              background: cfg.bg,
              color: cfg.color,
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              border: `1px solid ${cfg.color}20`,
            }}>
              {cfg.label}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700 }}>
              #{order.id}
            </span>
            {order.promo_code && (
              <span style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: order.promo_returned ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)',
                border: `1px solid ${order.promo_returned ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                color: order.promo_returned ? '#fca5a5' : '#86efac',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {order.promo_code}{order.promo_discount > 0 ? ` • −${order.promo_discount}%` : ''}
              </span>
            )}
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {order.work_type_label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 13, lineHeight: 1.5 }}>
            {order.subject || 'Предмет не указан'}
          </div>
        </div>
        <div style={{
          padding: '12px 14px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'right',
          minWidth: 120,
        }}>
          <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18 }}>
            {formatMoney(order.final_price)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 4 }}>
            {order.paid_amount > 0 ? `Оплачено ${formatMoney(order.paid_amount)}` : 'Без оплаты'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '7px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.68)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Клиент: {shortUserName}
        </span>
        <span style={{
          padding: '7px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.68)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Создан: {formatDateTime(order.created_at)}
        </span>
        {order.deadline && (
          <span style={{
            padding: '7px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.68)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Дедлайн: {formatDateTime(order.deadline)}
          </span>
        )}
        {order.admin_notes && (
          <span style={{
            padding: '7px 10px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.16)',
            color: '#D4AF37',
            fontSize: 12,
            fontWeight: 700,
          }}>
            Есть заметка
          </span>
        )}
        {order.progress > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', minWidth: 128 }}>
            <div style={{
              width: 84,
              height: 6,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(order.progress, 100))}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #d4af37, #f5d061)',
                borderRadius: 999,
              }} />
            </div>
            <span style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700 }}>{order.progress}%</span>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#D4AF37', fontWeight: 700 }}>
          Детали
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  )
}

function OrderDetailModal({ order, onClose, onUpdate }: { order: GodOrder; onClose: () => void; onUpdate: () => void }) {
  const { showToast } = useToast()
  const [detailOrder, setDetailOrder] = useState<GodOrder>(order)
  const [detailUser, setDetailUser] = useState<{
    telegram_id: number | null
    username: string | null
    fullname: string | null
    balance: number
    orders_count: number
    total_spent: number
    is_banned: boolean
  } | null>(null)
  const [messages, setMessages] = useState<Array<{
    id: number
    sender_type: string
    message_text: string | null
    file_type: string | null
    file_name: string | null
    created_at: string | null
  }>>([])
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [status, setStatus] = useState(order.status)
  const [price, setPrice] = useState(order.price.toString())
  const [progress, setProgress] = useState(order.progress.toString())
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState(order.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const syncOrder = useCallback((nextOrder: GodOrder) => {
    setDetailOrder(nextOrder)
    setStatus(nextOrder.status)
    setPrice(String(nextOrder.price || nextOrder.final_price || 0))
    setProgress(String(nextOrder.progress || 0))
    setNotes(nextOrder.admin_notes || '')
  }, [])

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true)
    try {
      const data = await fetchGodOrderDetails(order.id)
      syncOrder(data.order as GodOrder)
      setDetailUser(data.user)
      setMessages(data.messages)
      setNotes((data.order as GodOrder).admin_notes || '')
    } catch {
      showToast({
        type: 'error',
        title: 'Не удалось открыть заказ',
        message: 'Попробуйте обновить данные ещё раз',
      })
    } finally {
      setDetailsLoading(false)
    }
  }, [order.id, showToast, syncOrder])

  useEffect(() => {
    syncOrder(order)
    setDetailUser(null)
    setMessages([])
    setNotes(order.admin_notes || '')
  }, [order, syncOrder])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadDetails(),
      Promise.resolve(onUpdate()),
    ])
  }, [loadDetails, onUpdate])

  const handleStatusChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderStatus(detailOrder.id, status)
      showToast({ type: 'success', title: 'Статус обновлён' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось обновить статус' })
    }
    setSaving(false)
  }

  const handlePriceChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderPrice(detailOrder.id, parseFloat(price))
      showToast({ type: 'success', title: 'Стоимость обновлена' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось обновить стоимость' })
    }
    setSaving(false)
  }

  const handleProgressChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderProgress(detailOrder.id, parseInt(progress, 10))
      showToast({ type: 'success', title: 'Прогресс обновлён' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось обновить прогресс' })
    }
    setSaving(false)
  }

  const handleConfirmPayment = async () => {
    setSaving(true)
    try {
      await confirmGodPayment(detailOrder.id)
      showToast({ type: 'success', title: 'Оплата подтверждена' })
      await Promise.resolve(onUpdate())
      onClose()
    } catch {
      showToast({ type: 'error', title: 'Не удалось подтвердить оплату' })
    }
    setSaving(false)
  }

  const handleRejectPayment = async () => {
    setSaving(true)
    try {
      await rejectGodPayment(detailOrder.id, 'Платёж не найден')
      showToast({ type: 'success', title: 'Проверка оплаты отклонена' })
      await Promise.resolve(onUpdate())
      onClose()
    } catch {
      showToast({ type: 'error', title: 'Не удалось отклонить оплату' })
    }
    setSaving(false)
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    setSaving(true)
    try {
      await sendGodOrderMessage(detailOrder.id, message)
      setMessage('')
      showToast({ type: 'success', title: 'Сообщение отправлено' })
      await loadDetails()
    } catch {
      showToast({ type: 'error', title: 'Не удалось отправить сообщение' })
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateGodOrderNotes(detailOrder.id, notes)
      showToast({ type: 'success', title: 'Заметка по заказу сохранена' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось сохранить заметку' })
    }
    setSaving(false)
  }

  const cfg = STATUS_CONFIG[detailOrder.status] || STATUS_CONFIG.pending
  const recentMessages = [...messages].slice(-6).reverse()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: '24px 24px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{
            padding: '6px 14px',
            background: cfg.bg,
            color: cfg.color,
            borderRadius: 8,
            fontWeight: 600,
          }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Заказ #{detailOrder.id}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            {detailOrder.work_type_label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 1.6 }}>
            {detailOrder.subject || 'Предмет не указан'}
            {detailOrder.topic ? ` • ${detailOrder.topic}` : ''}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 8 }}>
            Клиент: {detailOrder.user_fullname || 'Клиент без имени'}
            {detailOrder.user_username ? ` • @${detailOrder.user_username}` : ''}
            {detailOrder.created_at ? ` • создан ${formatDateTime(detailOrder.created_at)}` : ''}
          </div>
        </div>

        {detailOrder.promo_code && (
          <div style={{
            marginBottom: 18,
            padding: '16px 18px',
            background: detailOrder.promo_returned
              ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.08))'
              : 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(34,197,94,0.10))',
            border: `1px solid ${detailOrder.promo_returned ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.24)'}`,
            borderRadius: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ color: detailOrder.promo_returned ? '#fca5a5' : '#D4AF37', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Промокод {detailOrder.promo_code}
              </span>
              {detailOrder.promo_discount > 0 && (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(34,197,94,0.18)',
                  color: '#86efac',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  −{detailOrder.promo_discount}%
                </span>
              )}
              {detailOrder.promo_returned && (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(239,68,68,0.18)',
                  color: '#fca5a5',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  Возвращён
                </span>
              )}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 1.5 }}>
              Экономия клиента: {formatMoney(detailOrder.promo_discount_amount)}
            </div>
          </div>
        )}

        {detailUser && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            marginBottom: 18,
          }}>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Баланс</div>
              <div style={{ color: '#D4AF37', fontWeight: 700 }}>{formatMoney(detailUser.balance)}</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Заказов</div>
              <div style={{ color: '#fff', fontWeight: 700 }}>{detailUser.orders_count}</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Потратил</div>
              <div style={{ color: '#fff', fontWeight: 700 }}>{formatMoney(detailUser.total_spent)}</div>
            </div>
          </div>
        )}

        {(detailOrder.description || detailOrder.files_url) && (
          <div style={{ ...cardStyle, marginBottom: 18, padding: 14 }}>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>Материалы заказа</div>
            {detailOrder.description && (
              <div style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: 13,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
                marginBottom: detailOrder.files_url ? 12 : 0,
              }}>
                {detailOrder.description}
              </div>
            )}
            {detailOrder.files_url && (
              <button
                type="button"
                onClick={() => window.open(detailOrder.files_url!, '_blank', 'noopener,noreferrer')}
                style={{
                  ...secondaryButtonStyle,
                  width: '100%',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                <Package size={16} />
                Открыть папку с файлами
              </button>
            )}
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: 18, padding: 14 }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>Внутренняя заметка</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Что важно помнить по этому заказу"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={saving}
            style={{ ...secondaryButtonStyle, width: '100%', justifyContent: 'center' }}
          >
            Сохранить заметку
          </button>
        </div>

        {detailOrder.status === 'verification_pending' && (
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 18,
            padding: 16,
            background: 'rgba(236,72,153,0.1)',
            borderRadius: 12,
          }}>
            <button
              onClick={handleConfirmPayment}
              disabled={saving}
              style={{ ...buttonStyle, flex: 1, background: 'linear-gradient(180deg, #22c55e, #16a34a)' }}
            >
              <Check size={18} /> Подтвердить оплату
            </button>
            <button
              onClick={handleRejectPayment}
              disabled={saving}
              style={{ ...buttonStyle, flex: 1, background: 'linear-gradient(180deg, #ef4444, #dc2626)' }}
            >
              <X size={18} /> Отклонить
            </button>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Статус заказа
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <button
              onClick={handleStatusChange}
              disabled={saving || status === detailOrder.status}
              style={buttonStyle}
            >
              <Check size={16} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Стоимость и оплата
          </label>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 8 }}>
            База: {formatMoney(detailOrder.price)} • Финальная: {formatMoney(detailOrder.final_price)} • Оплачено: {formatMoney(detailOrder.paid_amount)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              placeholder={detailOrder.final_price.toString()}
            />
            <button
              onClick={handlePriceChange}
              disabled={saving}
              style={buttonStyle}
            >
              <CreditCard size={16} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Прогресс: {progress}%
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleProgressChange}
              disabled={saving}
              style={buttonStyle}
            >
              <Percent size={16} />
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Сообщение клиенту
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите сообщение..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleSendMessage}
              disabled={saving || !message.trim()}
              style={buttonStyle}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>Последние сообщения</div>
            <button
              type="button"
              onClick={loadDetails}
              disabled={detailsLoading}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={14} color="rgba(255,255,255,0.45)" />
            </button>
          </div>
          {detailsLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>Загружаем переписку и детали…</div>
          ) : recentMessages.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>Сообщений пока нет.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentMessages.map(item => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: item.sender_type === 'admin' ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${item.sender_type === 'admin' ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <span style={{ color: item.sender_type === 'admin' ? '#D4AF37' : '#d4d4d8', fontSize: 12, fontWeight: 700 }}>
                      {item.sender_type === 'admin' ? 'Команда' : 'Клиент'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  {item.message_text && (
                    <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 1.55 }}>
                      {item.message_text}
                    </div>
                  )}
                  {item.file_name && (
                    <div style={{ color: '#D4AF37', fontSize: 12, marginTop: 6 }}>
                      Файл: {item.file_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  USERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function UsersTab() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<GodUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('user_q') || '')
  const [filterType, setFilterType] = useState(() => searchParams.get('user_filter') || '')
  const [selectedUser, setSelectedUser] = useState<GodUser | null>(null)
  const [total, setTotal] = useState(0)
  const deferredSearch = useDeferredValue(search.trim())
  const filterLabel = ({
    banned: 'заблокированные',
    watched: 'под наблюдением',
    with_balance: 'с балансом',
  } as Record<string, string>)[filterType] || 'все клиенты'

  useEffect(() => {
    const nextSearch = searchParams.get('user_q') || ''
    const nextFilter = searchParams.get('user_filter') || ''
    if (nextSearch !== search) {
      setSearch(nextSearch)
    }
    if (nextFilter !== filterType) {
      setFilterType(nextFilter)
    }
  }, [filterType, search, searchParams])

  useEffect(() => {
    const next = withRouteParams(searchParams, {
      tab: 'users',
      user_q: search.trim() || null,
      user_filter: filterType || null,
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [filterType, search, searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodUsers({ search: deferredSearch, filter_type: filterType, limit: 100 })
      setUsers(result.users)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить клиентов'
      setUsers([])
      setTotal(0)
      setError(message)
      showToast({
        type: 'error',
        title: 'Клиенты не загрузились',
        message,
      })
    }
    setLoading(false)
  }, [deferredSearch, filterType, showToast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        eyebrow="CRM"
        title="Клиенты"
        description="Профили, баланс, наблюдение и быстрый вход в историю клиента без лишних переходов."
        meta={filterType ? `Фильтр: ${filterLabel}` : `Показано ${total} клиентов`}
      />

      <div style={{ ...cardStyle, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', position: 'relative' }}>
            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ID, username или имя"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 40 }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 156 }}
          >
            <option value="">Все клиенты</option>
            <option value="banned">Забанены</option>
            <option value="watched">Под наблюдением</option>
            <option value="with_balance">С балансом</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            style={{ ...secondaryButtonStyle, minHeight: 48 }}
          >
            <RefreshCw size={16} />
            Обновить
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Найдено: {total}
          </div>
          <div style={{
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.16)',
            color: '#d4af37',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {filterType ? filterLabel : 'Все клиенты'}
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? <LoadingSpinner /> : error ? (
        <StateCard
          tone="error"
          title="База клиентов сейчас недоступна"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      ) : (
        users.length === 0 ? (
          <StateCard
            title="По текущему фильтру никого нет"
            description="Снимите фильтр или измените запрос. Список клиентов появится здесь же без переходов между разделами."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(user => (
              <UserCard
                key={user.telegram_id}
                user={user}
                onClick={() => setSelectedUser(user)}
              />
            ))}
          </div>
        )
      )}

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function UserCard({ user, onClick }: { user: GodUser; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 18px 40px rgba(0,0,0,0.34)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...cardStyle,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}>
          {user.rank_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{user.fullname || 'Без имени'}</span>
            {user.is_banned && (
              <span style={{
                padding: '5px 8px',
                borderRadius: 999,
                background: 'rgba(239,68,68,0.14)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
                fontSize: 11,
                fontWeight: 700,
              }}>
                Заблокирован
              </span>
            )}
            {user.is_watched && (
              <span style={{
                padding: '5px 8px',
                borderRadius: 999,
                background: 'rgba(245,158,11,0.14)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: '#fcd34d',
                fontSize: 11,
                fontWeight: 700,
              }}>
                Под наблюдением
              </span>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 12 }}>
            {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, marginTop: 8 }}>
            {user.rank_name} • {user.loyalty_status}
          </div>
        </div>
        <div style={{
          padding: '12px 14px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'right',
          minWidth: 116,
        }}>
          <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18 }}>
            {formatMoney(user.balance)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 4 }}>
            Баланс
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          padding: '7px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Заказов: {user.orders_count}
        </span>
        <span style={{
          padding: '7px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Потратил: {formatMoney(user.total_spent)}
        </span>
        <span style={{
          padding: '7px 10px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Рефералы: {user.referrals_count}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#D4AF37', fontWeight: 700 }}>
          Профиль клиента
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  )
}

function UserDetailModal({ user, onClose, onUpdate }: { user: GodUser; onClose: () => void; onUpdate: () => void }) {
  const { showToast } = useToast()
  const [detailUser, setDetailUser] = useState<GodUser>(user)
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [transactions, setTransactions] = useState<Array<{
    id: number
    amount: number
    type: string
    reason: string
    description: string | null
    created_at: string | null
  }>>([])
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [banReason, setBanReason] = useState('')
  const [notes, setNotes] = useState(user.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true)
    try {
      const data = await fetchGodUserDetails(user.telegram_id)
      setDetailUser(data.user as GodUser)
      setOrders(data.orders as GodOrder[])
      setTransactions(data.transactions)
      setNotes((data.user as GodUser).admin_notes || '')
    } catch {
      showToast({
        type: 'error',
        title: 'Не удалось открыть клиента',
        message: 'Попробуйте обновить данные ещё раз',
      })
    } finally {
      setDetailsLoading(false)
    }
  }, [showToast, user.telegram_id])

  useEffect(() => {
    setDetailUser(user)
    setNotes(user.admin_notes || '')
    setOrders([])
    setTransactions([])
  }, [user])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadDetails(),
      Promise.resolve(onUpdate()),
    ])
  }, [loadDetails, onUpdate])

  const handleBalance = async (add: boolean) => {
    if (!balanceAmount) return
    setSaving(true)
    try {
      const amount = add ? parseFloat(balanceAmount) : -parseFloat(balanceAmount)
      await modifyGodUserBalance(detailUser.telegram_id, amount, balanceReason || 'Ручная корректировка', true)
      setBalanceAmount('')
      setBalanceReason('')
      showToast({ type: 'success', title: 'Баланс обновлён' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить баланс' })
    }
    setSaving(false)
  }

  const handleBan = async () => {
    setSaving(true)
    try {
      await toggleGodUserBan(detailUser.telegram_id, !detailUser.is_banned, banReason)
      showToast({ type: 'success', title: detailUser.is_banned ? 'Блокировка снята' : 'Клиент заблокирован' })
      await refreshAll()
      if (!detailUser.is_banned) {
        onClose()
      }
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить блокировку' })
    }
    setSaving(false)
  }

  const handleWatch = async () => {
    setSaving(true)
    try {
      await toggleGodUserWatch(detailUser.telegram_id, !detailUser.is_watched)
      showToast({ type: 'success', title: detailUser.is_watched ? 'Наблюдение снято' : 'Клиент добавлен под наблюдение' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить наблюдение' })
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateGodUserNotes(detailUser.telegram_id, notes)
      showToast({ type: 'success', title: 'Заметки сохранены' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось сохранить заметки' })
    }
    setSaving(false)
  }

  const recentOrders = orders.slice(0, 5)
  const recentTransactions = transactions.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: '24px 24px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 32 }}>{detailUser.rank_emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              {detailUser.fullname || 'Клиент без имени'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              {detailUser.username ? `@${detailUser.username}` : 'Без username'} • ID: {detailUser.telegram_id}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 18,
        }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: 18 }}>{formatMoney(detailUser.balance)}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Баланс</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{detailUser.orders_count}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Заказов</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{formatMoney(detailUser.total_spent)}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Потрачено</div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}>
          <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Статус</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{detailUser.rank_name}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 }}>
              Лояльность: {detailUser.loyalty_status} • скидка {detailUser.loyalty_discount}%
            </div>
          </div>
          <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Рефералы</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{detailUser.referrals_count}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 4 }}>
              Заработано: {formatMoney(detailUser.referral_earnings)}
            </div>
          </div>
        </div>

        {detailUser.bonus_expiry?.has_expiry && (
          <div style={{
            ...cardStyle,
            marginBottom: 18,
            padding: 14,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>
              Бонусный баланс под контролем
            </div>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.55 }}>
              {detailUser.bonus_expiry.status_text} • cгорит {formatMoney(detailUser.bonus_expiry.burn_amount)}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Изменить баланс
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="Сумма"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => handleBalance(true)}
              disabled={saving || !balanceAmount}
              style={{ ...buttonStyle, background: 'linear-gradient(180deg, #22c55e, #16a34a)' }}
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => handleBalance(false)}
              disabled={saving || !balanceAmount}
              style={{ ...buttonStyle, background: 'linear-gradient(180deg, #ef4444, #dc2626)' }}
            >
              <TrendingDown size={16} />
            </button>
          </div>
          <input
            type="text"
            value={balanceReason}
            onChange={(e) => setBalanceReason(e.target.value)}
            placeholder="Причина изменения"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleBan}
            disabled={saving}
            style={{
              ...buttonStyle,
              flex: 1,
              background: detailUser.is_banned
                ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                : 'linear-gradient(180deg, #ef4444, #dc2626)',
            }}
          >
            {detailUser.is_banned ? <Check size={16} /> : <Ban size={16} />}
            {detailUser.is_banned ? 'Разблокировать' : 'Заблокировать'}
          </button>
          <button
            onClick={handleWatch}
            disabled={saving}
            style={{
              ...secondaryButtonStyle,
              flex: 1,
              background: detailUser.is_watched ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {detailUser.is_watched ? <EyeOff size={16} /> : <Eye size={16} />}
            {detailUser.is_watched ? 'Снять наблюдение' : 'Наблюдать'}
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
            Заметки по клиенту
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Что важно помнить о клиенте"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            style={{ ...buttonStyle, marginTop: 8, width: '100%', justifyContent: 'center' }}
          >
            Сохранить заметки
          </button>
        </div>

        <div style={{ ...cardStyle, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ color: '#fff', fontWeight: 700 }}>Последние заказы</div>
            <button onClick={loadDetails} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <RefreshCw size={14} color="rgba(255,255,255,0.45)" />
            </button>
          </div>
          {detailsLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>Загружаем историю клиента…</div>
          ) : recentOrders.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>У клиента пока нет заказов.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentOrders.map(item => {
                const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
                return (
                  <div key={item.id} style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>#{item.id}</span>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: statusMeta.bg,
                        color: statusMeta.color,
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {statusMeta.label}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#D4AF37', fontWeight: 700 }}>
                        {formatMoney(item.final_price)}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      {item.work_type_label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 4 }}>
                      {item.subject || 'Предмет не указан'} • {formatDateTime(item.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>Последние операции</div>
          {detailsLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>Загружаем операции…</div>
          ) : recentTransactions.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>Операций пока нет.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentTransactions.map(item => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {TRANSACTION_REASON_LABELS[item.reason] || item.description || 'Операция'}
                    </div>
                    <div style={{ color: item.amount >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>
                      {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
                    </div>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12 }}>
                    {item.description || 'Без комментария'} • {formatDateTime(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROMOS TAB
// ═══════════════════════════════════════════════════════════════════════════

function PromosTab() {
  const { showToast } = useToast()
  const [promos, setPromos] = useState<GodPromo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newMaxUses, setNewMaxUses] = useState('0')
  const [newUsersOnly, setNewUsersOnly] = useState(false)
  const [newValidUntil, setNewValidUntil] = useState('')

  const applyValidityPreset = useCallback((days: number) => {
    const next = new Date()
    next.setDate(next.getDate() + days)
    next.setMinutes(next.getMinutes() - next.getTimezoneOffset())
    setNewValidUntil(next.toISOString().slice(0, 16))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodPromos()
      setPromos(result.promos)
    } catch {
      showToast({ type: 'error', title: 'Ошибка загрузки', message: 'Не удалось загрузить промокоды' })
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (!newCode.trim()) return
    setCreating(true)
    try {
      await createGodPromo({
        code: newCode,
        discount_percent: Number(newDiscount || '0'),
        max_uses: Number(newMaxUses || '0'),
        valid_until: newValidUntil ? new Date(newValidUntil).toISOString() : undefined,
        new_users_only: newUsersOnly,
      })
      showToast({
        type: 'success',
        title: '✓ Промокод создан',
        message: `${newCode} — скидка ${newDiscount}%${newUsersOnly ? ' (новые пользователи)' : ''}`
      })
      setNewCode('')
      setNewDiscount('10')
      setNewMaxUses('0')
      setNewUsersOnly(false)
      setNewValidUntil('')
      setShowCreate(false)
      load()
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Ошибка создания',
        message: e instanceof Error ? e.message : 'Не удалось создать промокод'
      })
    }
    setCreating(false)
  }

  const handleToggle = async (id: number, currentlyActive: boolean) => {
    try {
      await toggleGodPromo(id)
      showToast({
        type: 'success',
        title: currentlyActive ? '⏸ Промокод деактивирован' : '✓ Промокод активирован'
      })
      load()
    } catch {
      showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось изменить статус' })
    }
  }

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Удалить промокод ${code}?`)) return
    try {
      await deleteGodPromo(id)
      showToast({ type: 'success', title: '🗑 Промокод удалён', message: code })
      load()
    } catch {
      showToast({ type: 'error', title: 'Ошибка удаления', message: 'Не удалось удалить промокод' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Create button */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        style={buttonStyle}
      >
        <Plus size={18} /> Создать промокод
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={cardStyle}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                inputMode="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="Код (напр. SALE20)"
                style={{
                  ...inputStyle,
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  WebkitAppearance: 'none',
                }}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  placeholder="Скидка %"
                  min="1"
                  max="100"
                  style={{ ...inputStyle, flex: 1, WebkitAppearance: 'none' }}
                  autoComplete="off"
                  enterKeyHint="next"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="Лимит (0=∞)"
                  min="0"
                  style={{ ...inputStyle, flex: 1, WebkitAppearance: 'none' }}
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
              {/* New users only toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  Срок действия
                </label>
                <input
                  type="datetime-local"
                  value={newValidUntil}
                  onChange={(e) => setNewValidUntil(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[3, 7, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => applyValidityPreset(days)}
                      style={{
                        ...secondaryButtonStyle,
                        padding: '8px 12px',
                        fontSize: 12,
                        background: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewValidUntil('')}
                    style={{
                      ...secondaryButtonStyle,
                      padding: '8px 12px',
                      fontSize: 12,
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    Без срока
                  </button>
                </div>
              </div>

              <div
                onClick={() => setNewUsersOnly(!newUsersOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: newUsersOnly ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${newUsersOnly ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${newUsersOnly ? '#D4AF37' : 'rgba(255,255,255,0.3)'}`,
                  background: newUsersOnly ? '#D4AF37' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  {newUsersOnly && <Check size={14} color="#0a0a0c" strokeWidth={3} />}
                </div>
                <span style={{
                  color: newUsersOnly ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: 500,
                }}>Только для новых пользователей</span>
              </div>
              <button
                onClick={handleCreate}
                disabled={!newCode.trim() || creating}
                style={{
                  ...buttonStyle,
                  opacity: newCode.trim() && !creating ? 1 : 0.5,
                  cursor: newCode.trim() && !creating ? 'pointer' : 'not-allowed',
                }}
              >
                {creating ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Создание...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Создать
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promos list */}
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {promos.map(promo => {
            const validFrom = promo.valid_from ? new Date(promo.valid_from) : null
            const validUntil = promo.valid_until ? new Date(promo.valid_until) : null
            const now = new Date()
            const isExpired = validUntil && validUntil < now
            const notYetValid = validFrom && validFrom > now

            return (
              <div key={promo.id} style={{
                ...cardStyle,
                opacity: promo.is_active && !isExpired && !notYetValid ? 1 : 0.5,
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: 16 }}>{promo.code}</span>
                      <span style={{
                        padding: '2px 8px',
                        background: promo.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)',
                        color: promo.is_active ? '#22c55e' : '#6b7280',
                        borderRadius: 4,
                        fontSize: 11,
                      }}>
                        {promo.is_active ? 'Активен' : 'Выкл'}
                      </span>
                      {isExpired && (
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(239,68,68,0.2)',
                          color: '#ef4444',
                          borderRadius: 4,
                          fontSize: 11,
                        }}>
                          Истёк
                        </span>
                      )}
                      {notYetValid && (
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(245,158,11,0.2)',
                          color: '#f59e0b',
                          borderRadius: 4,
                          fontSize: 11,
                        }}>
                          Скоро
                        </span>
                      )}
                      {promo.new_users_only && (
                        <span style={{
                          padding: '2px 8px',
                          background: 'rgba(59,130,246,0.2)',
                          color: '#3b82f6',
                          borderRadius: 4,
                          fontSize: 11,
                        }}>
                          Новые
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>
                      -{promo.discount_percent}%
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(promo.id, promo.is_active)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    title={promo.is_active ? 'Деактивировать' : 'Активировать'}
                  >
                    {promo.is_active
                      ? <ToggleRight size={28} color="#22c55e" />
                      : <ToggleLeft size={28} color="#6b7280" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id, promo.code)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    title="Удалить"
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </button>
                </div>

                {/* Stats Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  padding: 10,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                  marginBottom: 8,
                }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Использования</div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                      {promo.active_usages}/{promo.max_uses || '∞'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Всего сэкономлено</div>
                    <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
                      {promo.total_savings.toFixed(0)}₽
                    </div>
                  </div>
                </div>

                {/* Validity & Creator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {validFrom && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      Действует с: {validFrom.toLocaleDateString('ru-RU')}
                    </div>
                  )}
                  {validUntil && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      Действует до: {validUntil.toLocaleDateString('ru-RU')}
                      {isExpired && <span style={{ color: '#ef4444' }}> (истёк)</span>}
                    </div>
                  )}
                  {!validUntil && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      Без срока действия
                    </div>
                  )}
                  {promo.created_by && (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                      Создал: {promo.created_by.fullname}
                      {promo.created_by.username && ` (@${promo.created_by.username})`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE TAB
// ═══════════════════════════════════════════════════════════════════════════

function LiveTab() {
  const [data, setData] = useState<{ online_count: number; users: GodLiveUser[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchGodLiveActivity()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить онлайн-активность')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [load])

  if (loading && !data) return <LoadingSpinner />

  if (!data) {
    return (
      <StateCard
        tone="error"
        title="Не удалось открыть онлайн-активность"
        description={error || 'Сервис активности временно не ответил.'}
        actionLabel="Загрузить ещё раз"
        onAction={() => void load()}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <SectionHeader
        eyebrow="Мониторинг"
        title="Кто сейчас в приложении"
        description="Активные пользователи, текущие экраны и быстрый срез поведения без перехода в логи."
        meta={error ? 'Последняя загрузка с предупреждением' : `${data.online_count} онлайн`}
      />

      {/* Online count */}
      <div style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
        border: '1px solid rgba(34,197,94,0.3)',
      }}>
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#22c55e',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>
          {data?.online_count || 0}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>клиентов онлайн</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {/* Users list */}
      {data?.users.map(user => (
        <div key={user.telegram_id} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 500 }}>
                {user.fullname || 'Клиент без имени'} {user.username ? `@${user.username}` : ''}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {formatPageLabel(user.current_page)}
                {user.current_order_id && ` • Заказ #${user.current_order_id}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                {user.session_duration_min} мин
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                {user.platform}
              </div>
            </div>
          </div>
        </div>
      ))}

      {data?.users.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
          Никого нет онлайн
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOGS TAB
// ═══════════════════════════════════════════════════════════════════════════

function LogsTab() {
  const [logs, setLogs] = useState<GodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodLogs({ limit: 100 })
      setLogs(result.logs)
      setError(null)
    } catch (err) {
      setLogs([])
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал действий')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <SectionHeader
        eyebrow="Аудит"
        title="Журнал действий"
        description="Последние 100 операций админки с контекстом по целям и времени выполнения."
        meta={error ? 'Загрузка завершилась с ошибкой' : `${logs.length} записей`}
      />

      {error ? (
        <StateCard
          tone="error"
          title="Журнал не загрузился"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Последние 100 действий</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {logs.map(log => (
        <div key={log.id} style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          borderLeft: '3px solid rgba(212,175,55,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{log.action_emoji}</span>
            <span style={{ color: '#fff', fontWeight: 500, fontSize: 13 }}>{log.action_type}</span>
            {log.target_type && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                • {log.target_type} #{log.target_id}
              </span>
            )}
          </div>
          {log.details && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
              {log.details}
            </div>
          )}
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            {log.admin_username || `Админ ${log.admin_id}`} • {new Date(log.created_at!).toLocaleString('ru')}
          </div>
        </div>
      ))}

      {!error && logs.length === 0 && (
        <StateCard
          title="Журнал пока пуст"
          description="Здесь появятся действия после работы с заказами, клиентами и промокодами."
        />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SQL TAB
// ═══════════════════════════════════════════════════════════════════════════

function SqlTab() {
  const [query, setQuery] = useState('SELECT id, fullname, balance FROM users ORDER BY balance DESC LIMIT 10')
  const [result, setResult] = useState<{ columns: string[]; rows: string[][]; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = async () => {
    setLoading(true)
    try {
      const res = await executeGodSql(query)
      setResult(res)
    } catch (e: any) {
      setResult({ columns: [], rows: [], error: e.message })
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Warning */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <AlertTriangle size={18} color="#f59e0b" />
        <span style={{ color: '#f59e0b', fontSize: 12 }}>
          Только SELECT-запросы. Любые изменения проводим через отдельные действия панели.
        </span>
      </div>

      {/* Query input */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10"
        rows={4}
        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
      />

      <button onClick={execute} disabled={loading} style={buttonStyle}>
        <Zap size={18} /> {loading ? 'Выполняю...' : 'Выполнить'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ ...cardStyle, overflow: 'auto' }}>
          {result.error ? (
            <div style={{ color: '#ef4444' }}>Ошибка: {result.error}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={i} style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: '1px solid rgba(212,175,55,0.2)',
                      color: '#D4AF37',
                      fontWeight: 600,
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.7)',
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  BROADCAST TAB
// ═══════════════════════════════════════════════════════════════════════════

function BroadcastTab() {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'all' | 'active' | 'with_orders'>('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const send = async () => {
    if (!text.trim()) return
    if (!confirm(`Отправить рассылку ${target}?`)) return

    setSending(true)
    try {
      const res = await sendGodBroadcast(text, target)
      setResult({ sent: res.sent, failed: res.failed })
      setText('')
    } catch {
      /* silent */
    }
    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Warning */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <AlertTriangle size={18} color="#ef4444" />
        <span style={{ color: '#ef4444', fontSize: 12 }}>
          Осторожно! Сообщение будет отправлено всем выбранным пользователям.
        </span>
      </div>

      {/* Target selection */}
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
          Получатели
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as any)}
          style={inputStyle}
        >
          <option value="all">Все пользователи</option>
          <option value="active">Активные (7 дней)</option>
          <option value="with_orders">С заказами</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6, display: 'block' }}>
          Сообщение (поддерживает HTML)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="<b>Заголовок</b>\n\nТекст сообщения..."
          rows={6}
          style={inputStyle}
        />
      </div>

      {/* Send */}
      <button
        onClick={send}
        disabled={sending || !text.trim()}
        style={{
          ...buttonStyle,
          background: 'linear-gradient(180deg, #ef4444, #dc2626)',
          justifyContent: 'center',
        }}
      >
        <Send size={18} /> {sending ? 'Отправка...' : 'Отправить рассылку'}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          ...cardStyle,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ color: '#22c55e', fontWeight: 600 }}>
            Отправлено: {result.sent}
          </div>
          {result.failed > 0 && (
            <div style={{ color: '#ef4444', fontSize: 12 }}>
              Ошибок: {result.failed}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <RefreshCw size={24} color="#D4AF37" />
      </motion.div>
    </div>
  )
}

export default GodModePage
