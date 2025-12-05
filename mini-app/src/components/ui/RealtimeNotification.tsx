import { useState, useEffect } from 'react'
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

const iconMap: Record<string, React.ComponentType<any>> = {
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

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN SMART NOTIFICATION COMPONENT (PREMIUM REDESIGN)
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
  const color = notification.color || '#d4af37' // Default Gold
  const isHighPriority = notification.priority === 'high'

  // Bonus/Balance specific styling (Two-tone aesthetic)
  const isBonus = notification.type === 'balance_update' || notification.icon === 'gift' || notification.icon === 'wallet'

  // Premium Theme Configuration
  const theme = {
    bg: isBonus
      ? isDark
        ? 'linear-gradient(135deg, rgba(20, 20, 23, 0.98) 0%, rgba(13, 33, 13, 0.98) 100%)' // Black to Deep Green
        : 'linear-gradient(135deg, rgba(255, 255, 252, 0.98) 0%, rgba(240, 253, 240, 0.98) 100%)' // Cream to Light Green
      : isDark
        ? 'rgba(20, 20, 23, 0.95)'
        : 'rgba(255, 255, 252, 0.95)',
    backdrop: 'blur(25px)',
    border: isBonus
      ? '1px solid rgba(34, 197, 94, 0.3)' // Green Accent Border
      : isDark
        ? '1px solid rgba(255, 255, 255, 0.08)'
        : '1px solid rgba(212, 175, 55, 0.15)',
    shadow: isBonus
      ? '0 12px 40px -12px rgba(34, 197, 94, 0.2), 0 0 20px rgba(212, 175, 55, 0.1)' // Green/Gold Glow
      : isDark
        ? '0 12px 40px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.1)'
        : '0 20px 60px -15px rgba(212, 175, 55, 0.25), 0 10px 25px -10px rgba(0,0,0,0.05)',
    titleColor: isDark ? '#fff' : '#1a1a1a',
    textColor: isDark ? '#a1a1aa' : '#5c5c5c',
    iconBg: isBonus
      ? `linear-gradient(135deg, #d4af37 0%, #22c55e 100%)` // Gold to Green Gradient Icon
      : isDark
        ? `linear-gradient(135deg, ${color}20, ${color}10)`
        : `linear-gradient(135deg, ${color}15, #fff 100%)`,
    iconBorder: isDark ? `${color}30` : `${color}20`,
    closeBtn: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    actionText: isDark ? '#71717a' : '#a1a1aa',
  }

  return (
    <>
      <Confetti
        active={confetti.isActive}
        intensity="high"
        duration={3000}
      />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, mass: 0.8 }}
            onClick={() => {
              if (notification.action && onAction) {
                haptic('light')
                onAction(notification.action, notification.data || {})
              }
            }}
            style={{
              position: 'fixed',
              top: 12,
              left: 12,
              right: 12,
              zIndex: 10000,
              background: theme.bg,
              backdropFilter: theme.backdrop,
              WebkitBackdropFilter: theme.backdrop,
              border: theme.border,
              borderRadius: 20, // More rounded for modern feel
              padding: '16px 18px',
              cursor: notification.action ? 'pointer' : 'default',
              boxShadow: theme.shadow,
              overflow: 'hidden',
            }}
          >
            {/* Top decorative gradient sheen */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
              pointerEvents: 'none',
              borderRadius: '20px 20px 0 0',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Premium Icon Container */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: theme.iconBg,
                  border: `1px solid ${theme.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: `0 4px 12px ${color}15`,
                }}
              >
                <Icon size={22} color={isBonus ? '#fff' : color} strokeWidth={2} />

                {/* Ping animation for high priority */}
                {isHighPriority && (
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 14,
                      border: `1px solid ${color}`,
                    }}
                  />
                )}
              </motion.div>

              {/* Content Area */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.titleColor,
                      letterSpacing: '-0.01em',
                      fontFamily: "'Inter', system-ui, sans-serif", // Ensure clean font
                    }}
                  >
                    {notification.title}
                  </motion.div>

                  {notification.order_id && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: color,
                      background: isDark ? `${color}15` : `${color}10`,
                      padding: '2px 6px',
                      borderRadius: 6,
                      marginLeft: 8,
                    }}>
                      #{notification.order_id}
                    </span>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    fontSize: 14,
                    color: theme.textColor,
                    lineHeight: 1.5,
                    fontWeight: 400,
                  }}
                >
                  {notification.message}
                </motion.div>

                {/* Progress Bar */}
                {notification.type === 'progress_update' && notification.progress !== undefined && (
                  <div style={{ marginTop: 10, height: 4, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${notification.progress}%` }}
                      style={{ height: '100%', background: color, borderRadius: 2 }}
                    />
                  </div>
                )}
              </div>

              {/* Close Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsVisible(false)
                  setTimeout(onDismiss, 300)
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  transition: 'color 0.2s',
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Action Hint / Footer */}
            {notification.action && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span style={{
                  fontSize: 12,
                  color: theme.actionText,
                  fontWeight: 500
                }}>
                  Нармите чтобы посмотреть
                </span>
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex' }}
                >
                  <TrendingUp size={12} color={theme.actionText} style={{ transform: 'rotate(45deg)' }} />
                </motion.div>
              </motion.div>
            )}

            {/* Auto-dismiss timer line */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}>
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: isHighPriority ? 8 : 5, ease: 'linear' }}
                style={{ height: '100%', background: color, borderRadius: 1 }}
              />
            </div>

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
  onDismiss
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
