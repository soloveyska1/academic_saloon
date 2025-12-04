import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Package, Wallet, CheckCircle, AlertTriangle,
  Info, X, Sparkles, Clock, TrendingUp
} from 'lucide-react'
import { useTelegram } from '../../hooks/useUserData'

export interface RealtimeNotificationData {
  id: string
  type: 'order' | 'balance' | 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  data?: Record<string, unknown>
}

interface Props {
  notification: RealtimeNotificationData | null
  onDismiss: () => void
  autoDismiss?: number // ms
}

const icons = {
  order: Package,
  balance: Wallet,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
}

const colors = {
  order: '#d4af37',
  balance: '#22c55e',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export function RealtimeNotification({ notification, onDismiss, autoDismiss = 5000 }: Props) {
  const { haptic } = useTelegram()

  useEffect(() => {
    if (notification) {
      haptic('medium')

      if (autoDismiss > 0) {
        const timer = setTimeout(onDismiss, autoDismiss)
        return () => clearTimeout(timer)
      }
    }
  }, [notification, autoDismiss, onDismiss, haptic])

  const Icon = notification ? icons[notification.type] : Bell
  const color = notification ? colors[notification.type] : '#d4af37'

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10000,
            background: 'rgba(20, 20, 23, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${color}40`,
            borderRadius: 16,
            padding: 16,
            boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 30px ${color}20`,
          }}
        >
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            borderRadius: '16px 16px 0 0',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring' }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${color}20`,
                border: `1px solid ${color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={22} color={color} />
            </motion.div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: 4,
                }}
              >
                {notification.title}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  fontSize: 13,
                  color: '#a1a1aa',
                  lineHeight: 1.4,
                }}
              >
                {notification.message}
              </motion.div>
            </div>

            {/* Close button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDismiss}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={16} color="#71717a" />
            </motion.button>
          </div>

          {/* Progress bar for auto-dismiss */}
          {autoDismiss > 0 && (
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoDismiss / 1000, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 2,
                background: color,
                borderRadius: 1,
                transformOrigin: 'left',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Order status notification with more details
interface OrderNotificationProps {
  orderId: number
  status: string
  onDismiss: () => void
  onClick?: () => void
}

const statusConfig: Record<string, {
  title: string
  message: string
  color: string
  icon: typeof Package
}> = {
  pending: {
    title: 'Заказ принят',
    message: 'Ваш заказ принят и ожидает обработки',
    color: '#f59e0b',
    icon: Clock,
  },
  in_progress: {
    title: 'Заказ в работе',
    message: 'Автор начал работу над вашим заказом',
    color: '#3b82f6',
    icon: Sparkles,
  },
  review: {
    title: 'На проверке',
    message: 'Работа отправлена на проверку',
    color: '#a855f7',
    icon: CheckCircle,
  },
  completed: {
    title: 'Заказ выполнен!',
    message: 'Ваша работа готова! Спасибо за заказ',
    color: '#22c55e',
    icon: CheckCircle,
  },
  cancelled: {
    title: 'Заказ отменен',
    message: 'Заказ был отменен',
    color: '#ef4444',
    icon: AlertTriangle,
  },
}

export function OrderStatusNotification({ orderId, status, onDismiss, onClick }: OrderNotificationProps) {
  const { haptic, hapticSuccess } = useTelegram()
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  useEffect(() => {
    if (status === 'completed') {
      hapticSuccess()
    } else {
      haptic('medium')
    }

    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [status, onDismiss, haptic, hapticSuccess])

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={onClick}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 10000,
        background: 'rgba(20, 20, 23, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${config.color}40`,
        borderRadius: 16,
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 30px ${config.color}20`,
      }}
    >
      {/* Animated glow for completed status */}
      {status === 'completed' && (
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 17,
            border: `2px solid ${config.color}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Top glow line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        borderRadius: '16px 16px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon with pulse for completed */}
        <div style={{ position: 'relative' }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${config.color}20`,
              border: `1px solid ${config.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} color={config.color} />
          </motion.div>

          {status === 'completed' && (
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 18,
                border: `2px solid ${config.color}`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
          >
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
            }}>
              {config.title}
            </span>
            <span style={{
              fontSize: 11,
              color: config.color,
              background: `${config.color}20`,
              padding: '2px 8px',
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              #{orderId}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 13,
              color: '#a1a1aa',
            }}
          >
            {config.message}
          </motion.div>
        </div>

        {/* Close */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color="#71717a" />
        </motion.button>
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 6, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          height: 2,
          background: config.color,
          borderRadius: 1,
          transformOrigin: 'left',
        }}
      />
    </motion.div>
  )
}

// Balance change notification
interface BalanceNotificationProps {
  change: number
  newBalance: number
  reason?: string
  onDismiss: () => void
}

export function BalanceNotification({ change, newBalance, reason, onDismiss }: BalanceNotificationProps) {
  const { hapticSuccess } = useTelegram()
  const isPositive = change > 0
  const color = isPositive ? '#22c55e' : '#ef4444'

  useEffect(() => {
    if (isPositive) {
      hapticSuccess()
    }

    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss, hapticSuccess, isPositive])

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        right: 16,
        zIndex: 10000,
        background: 'rgba(20, 20, 23, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${color}40`,
        borderRadius: 16,
        padding: 16,
        boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 30px ${color}20`,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        borderRadius: '16px 16px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPositive ? (
            <TrendingUp size={24} color={color} />
          ) : (
            <Wallet size={24} color={color} />
          )}
        </motion.div>

        <div style={{ flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 4,
            }}
          >
            {isPositive ? 'Баланс пополнен!' : 'Списание с баланса'}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: color,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {isPositive ? '+' : ''}{change.toLocaleString('ru-RU')} P
            </span>
            {reason && (
              <span style={{ fontSize: 12, color: '#71717a' }}>
                {reason}
              </span>
            )}
          </motion.div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#71717a', marginBottom: 2 }}>
            Баланс
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#d4af37',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {newBalance.toLocaleString('ru-RU')} P
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onDismiss}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} color="#71717a" />
        </motion.button>
      </div>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          height: 2,
          background: color,
          borderRadius: 1,
          transformOrigin: 'left',
        }}
      />
    </motion.div>
  )
}
