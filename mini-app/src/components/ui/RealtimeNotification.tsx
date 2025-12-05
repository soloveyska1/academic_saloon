import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Package, Wallet, CheckCircle, AlertTriangle,
  Info, X, Sparkles, Clock, TrendingUp, TrendingDown,
  Play, Edit, Eye, RefreshCw, Trophy, XCircle, Calculator,
  Zap, Target, Gift, Star, Award, Percent
} from 'lucide-react'
import { useTelegram } from '../../hooks/useUserData'
import { Confetti, useConfetti } from './Confetti'
import { useTheme } from '../../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  SMART NOTIFICATION DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SmartNotificationData {
  type: 'order_update' | 'balance_update' | 'progress_update' | 'notification'
  notification_type?: string
  order_id?: number
  status?: string
  old_status?: string
  title: string
  message: string
  icon?: string
  color?: string
  priority?: 'normal' | 'high'
  action?: string
  celebration?: boolean
  confetti?: boolean
  progress?: number
  balance?: number
  change?: number
  data?: Record<string, unknown>
}

interface Props {
  notification: SmartNotificationData | null
  onDismiss: () => void
  onAction?: (action: string, data: Record<string, unknown>) => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  ICON MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'bell': Bell,
  'package': Package,
  'wallet': Wallet,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  'info': Info,
  'sparkles': Sparkles,
  'clock': Clock,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'play': Play,
  'edit': Edit,
  'eye': Eye,
  'refresh': RefreshCw,
  'trophy': Trophy,
  'x-circle': XCircle,
  'calculator': Calculator,
  'zap': Zap,
  'target': Target,
  'gift': Gift,
  'star': Star,
  'award': Award,
  'percent': Percent,
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN SMART NOTIFICATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SmartNotification({ notification, onDismiss, onAction }: Props) {
  const { haptic, hapticSuccess } = useTelegram()
  const { isDark } = useTheme()
  const confetti = useConfetti()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)

      // Haptic feedback based on priority
      if (notification.celebration || notification.priority === 'high') {
        hapticSuccess()
      } else {
        haptic('medium')
      }

      // Trigger confetti for celebrations
      if (notification.confetti) {
        setTimeout(() => confetti.fire(), 300)
      }

      // Auto-dismiss
      const dismissTime = notification.priority === 'high' ? 8000 : 5000
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, dismissTime)

      return () => clearTimeout(timer)
    }
  }, [notification, haptic, hapticSuccess, confetti, onDismiss])

  if (!notification) return null

  const Icon = iconMap[notification.icon || 'bell'] || Bell
  const color = notification.color || '#d4af37'
  const isHighPriority = notification.priority === 'high'

  // Theme-aware colors
  const theme = {
    bg: isDark ? 'rgba(20, 20, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    title: isDark ? '#fff' : '#18181b',
    message: isDark ? '#a1a1aa' : '#52525b',
    hint: isDark ? '#71717a' : '#a1a1aa',
    closeBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    closeIcon: isDark ? '#71717a' : '#a1a1aa',
    border: isDark ? `1px solid ${color}50` : `1px solid ${color}40`,
    shadow: isDark
      ? `0 10px 40px rgba(0,0,0,0.5), 0 0 40px ${color}30`
      : `0 10px 40px rgba(0,0,0,0.15), 0 4px 16px ${color}20`,
    progressBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    actionBg: isDark ? `${color}15` : `${color}12`,
    actionBorder: isDark ? `${color}30` : `${color}25`,
  }

  return (
    <>
      {/* Confetti overlay */}
      <Confetti
        active={confetti.isActive}
        intensity="high"
        duration={3000}
      />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={() => {
              if (notification.action && onAction) {
                onAction(notification.action, notification.data || {})
              }
            }}
            style={{
              position: 'fixed',
              top: 16,
              left: 16,
              right: 16,
              zIndex: 10000,
              background: theme.bg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: theme.border,
              borderRadius: 16,
              padding: 16,
              cursor: notification.action ? 'pointer' : 'default',
              boxShadow: theme.shadow,
            }}
          >
            {/* Celebration glow effect */}
            {notification.celebration && (
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 18,
                  border: `2px solid ${color}`,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Top glow line */}
            <motion.div
              animate={notification.celebration ? {
                background: [
                  `linear-gradient(90deg, transparent, ${color}, transparent)`,
                  `linear-gradient(90deg, ${color}, transparent, ${color})`,
                  `linear-gradient(90deg, transparent, ${color}, transparent)`,
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                borderRadius: '16px 16px 0 0',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Icon */}
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
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <Icon size={24} color={color} />

                {/* Pulse effect for high priority */}
                {isHighPriority && (
                  <motion.div
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: 18,
                      border: `2px solid ${color}`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </motion.div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                >
                  <span style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: theme.title,
                  }}>
                    {notification.title}
                  </span>
                  {notification.order_id && (
                    <span style={{
                      fontSize: 11,
                      color: color,
                      background: `${color}20`,
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      #{notification.order_id}
                    </span>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    fontSize: 13,
                    color: theme.message,
                    lineHeight: 1.4,
                  }}
                >
                  {notification.message}
                </motion.div>

                {/* Progress bar for progress updates */}
                {notification.type === 'progress_update' && notification.progress !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ marginTop: 8 }}
                  >
                    <div style={{
                      height: 6,
                      background: theme.progressBg,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${notification.progress}%` }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        style={{
                          height: '100%',
                          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: color,
                      marginTop: 4,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {notification.progress}% выполнено
                    </div>
                  </motion.div>
                )}

                {/* Balance change display */}
                {notification.type === 'balance_update' && notification.change !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, type: 'spring' }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      padding: '4px 10px',
                      background: theme.actionBg,
                      borderRadius: 8,
                      border: `1px solid ${theme.actionBorder}`,
                    }}
                  >
                    <span style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {notification.change > 0 ? '+' : ''}{notification.change.toLocaleString('ru-RU')} ₽
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsVisible(false)
                  setTimeout(onDismiss, 300)
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: theme.closeBg,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={16} color={theme.closeIcon} />
              </motion.button>
            </div>

            {/* Action hint */}
            {notification.action && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12, color: theme.hint }}>
                  Нажмите чтобы посмотреть
                </span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <TrendingUp size={12} color={theme.hint} />
                </motion.div>
              </motion.div>
            )}

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{
                duration: isHighPriority ? 8 : 5,
                ease: 'linear'
              }}
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
        )}
      </AnimatePresence>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LEGACY EXPORTS (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export interface RealtimeNotificationData {
  id: string
  type: 'order' | 'balance' | 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  data?: Record<string, unknown>
}

// Re-export for backwards compatibility
export function RealtimeNotification({
  notification,
  onDismiss,
  autoDismiss = 5000
}: {
  notification: RealtimeNotificationData | null
  onDismiss: () => void
  autoDismiss?: number
}) {
  if (!notification) return null

  const smartNotification: SmartNotificationData = {
    type: 'notification',
    notification_type: notification.type,
    title: notification.title,
    message: notification.message,
    icon: notification.type === 'order' ? 'package' :
          notification.type === 'balance' ? 'wallet' :
          notification.type === 'success' ? 'check-circle' :
          notification.type === 'warning' ? 'alert-triangle' :
          notification.type === 'error' ? 'x-circle' : 'info',
    color: notification.type === 'order' ? '#d4af37' :
           notification.type === 'balance' ? '#22c55e' :
           notification.type === 'success' ? '#22c55e' :
           notification.type === 'warning' ? '#f59e0b' :
           notification.type === 'error' ? '#ef4444' : '#3b82f6',
    data: notification.data,
  }

  return <SmartNotification notification={smartNotification} onDismiss={onDismiss} />
}

// Legacy component aliases
export const OrderStatusNotification = SmartNotification
export const BalanceNotification = SmartNotification
