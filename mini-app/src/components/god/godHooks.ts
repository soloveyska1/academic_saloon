/**
 * God Mode v3 — Custom Hooks
 * useGodWebSocket · useGodData · useHaptic
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  subscribeGodNotifications,
  unsubscribeGodNotifications,
  API_WS_URL,
} from '../../api/userApi'
import { NOTIFICATION_SOUND } from './godConstants'
import type { AdminNotification } from './godConstants'

/* ═══════ useGodWebSocket ═══════ */

export function useGodWebSocket(
  isAdmin: boolean,
  telegramId: number | null | undefined,
  activeTab: string,
) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND)
        audioRef.current.volume = 0.5
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch { /* silent */ }
  }, [soundEnabled])

  const addNotification = useCallback(
    (notif: Omit<AdminNotification, 'id' | 'timestamp'>) => {
      const n: AdminNotification = {
        ...notif,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date(),
      }
      setNotifications((prev) => [n, ...prev.slice(0, 19)])
      setUnreadCount((prev) => prev + 1)
      playSound()
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    },
    [playSound],
  )

  useEffect(() => {
    if (!isAdmin || !telegramId) return

    subscribeGodNotifications().catch(() => {})

    const connectWs = () => {
      const ws = new WebSocket(`${API_WS_URL}?telegram_id=${telegramId}`)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'admin_new_order') {
            addNotification({
              type: 'new_order',
              title: 'Новый заказ',
              message: `#${data.order.id} — ${data.order.work_type_label}\n${data.order.user_fullname}`,
              data: data.order,
            })
          } else if (data.type === 'admin_payment_pending') {
            const isBatch = data.is_batch === true
            const batchOrders = Array.isArray(data.orders) ? data.orders : []
            const batchPreview = batchOrders
              .slice(0, 3)
              .map((order: { id: number; amount_to_pay?: number }) => `#${order.id} · ${order.amount_to_pay || 0}₽`)
              .join('\n')
            addNotification({
              type: 'payment_pending',
              title: isBatch ? 'Массовая оплата' : 'Проверка оплаты',
              message: isBatch
                ? `${data.orders_count} заказа · ${Number(data.total_amount || 0).toLocaleString('ru-RU')}₽\n${data.user_fullname}${batchPreview ? `\n${batchPreview}` : ''}`
                : `#${data.order_id} — ${Number(data.amount || 0).toLocaleString('ru-RU')}₽\n${data.user_fullname}${data.work_type_label ? `\n${data.work_type_label}` : ''}`,
              data,
            })
          }
        } catch { /* ignore */ }
      }
      ws.onclose = () => setTimeout(connectWs, 3000)
      ws.onerror = () => ws.close()
      wsRef.current = ws
    }

    connectWs()

    return () => {
      unsubscribeGodNotifications().catch(() => {})
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
  }, [isAdmin, telegramId, addNotification])

  useEffect(() => {
    if (activeTab === 'center') setUnreadCount(0)
  }, [activeTab])

  return {
    notifications,
    soundEnabled,
    unreadCount,
    toggleSound: useCallback(() => setSoundEnabled((v) => !v), []),
    dismissFirst: useCallback(() => setNotifications((prev) => prev.slice(1)), []),
  }
}

/* ═══════ useGodData — generic data fetching hook ═══════ */

interface UseGodDataOptions {
  interval?: number
  enabled?: boolean
}

export function useGodData<T>(
  fetchFn: () => Promise<T>,
  options: UseGodDataOptions = {},
) {
  const { interval, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    }
    setLoading(false)
  }, [fetchFn])

  useEffect(() => {
    if (!enabled) return
    load()
    if (interval) {
      const id = setInterval(load, interval)
      return () => clearInterval(id)
    }
  }, [load, interval, enabled])

  return { data, loading, error, refresh: load }
}

/* ═══════ useHaptic — Telegram haptic feedback ═══════ */

export function useHaptic() {
  const hf = typeof window !== 'undefined'
    ? (window as any).Telegram?.WebApp?.HapticFeedback
    : null

  return {
    impact: useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
      if (hf) hf.impactOccurred(style)
      else if (navigator.vibrate) navigator.vibrate(style === 'heavy' ? 50 : 20)
    }, [hf]),
    notify: useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
      if (hf) hf.notificationOccurred(type)
      else if (navigator.vibrate) navigator.vibrate(type === 'error' ? [50, 30, 50] : 30)
    }, [hf]),
    selection: useCallback(() => {
      if (hf) hf.selectionChanged()
    }, [hf]),
  }
}
