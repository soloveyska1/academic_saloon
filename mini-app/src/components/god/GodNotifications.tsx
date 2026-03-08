import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, CreditCard, X } from 'lucide-react'
import {
  subscribeGodNotifications,
  unsubscribeGodNotifications,
  API_WS_URL,
} from '../../api/userApi'
import { NOTIFICATION_SOUND } from './godHelpers'
import type { AdminNotification } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

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
      const newNotif: AdminNotification = {
        ...notif,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date(),
      }
      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)])
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
            addNotification({
              type: 'payment_pending',
              title: 'Проверка оплаты',
              message: `#${data.order_id} — ${data.amount}₽\n${data.user_fullname}`,
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
    if (activeTab === 'dashboard') setUnreadCount(0)
  }, [activeTab])

  return {
    notifications,
    soundEnabled,
    unreadCount,
    toggleSound: useCallback(() => setSoundEnabled((v) => !v), []),
    dismissFirst: useCallback(() => setNotifications((prev) => prev.slice(1)), []),
  }
}

/* ═══════ NotificationToast ═══════ */

interface NotifToastProps {
  notifications: AdminNotification[]
  onDismiss: () => void
}

export function NotificationToast({ notifications, onDismiss }: NotifToastProps) {
  const latest = notifications[0]
  const isVisible = latest && latest.timestamp > new Date(Date.now() - 5000)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={s.notifToast}
          style={{
            background: latest.type === 'new_order'
              ? 'rgba(34,197,94,0.15)' : 'rgba(236,72,153,0.15)',
            border: `1px solid ${latest.type === 'new_order'
              ? 'rgba(34,197,94,0.3)' : 'rgba(236,72,153,0.3)'}`,
          }}
        >
          <div
            className={s.notifIcon}
            style={{
              background: latest.type === 'new_order'
                ? 'rgba(34,197,94,0.2)' : 'rgba(236,72,153,0.2)',
            }}
          >
            {latest.type === 'new_order'
              ? <Package size={14} color="#22c55e" />
              : <CreditCard size={14} color="#ec4899" />}
          </div>
          <div className={s.flex1}>
            <div style={{
              fontSize: 12, fontWeight: 600, marginBottom: 2,
              color: latest.type === 'new_order' ? '#22c55e' : '#ec4899',
            }}>
              {latest.title}
            </div>
            <div style={{ fontSize: 11, color: '#a1a1aa', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
              {latest.message}
            </div>
          </div>
          <button type="button" onClick={onDismiss} className={s.ghostBtn}>
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
