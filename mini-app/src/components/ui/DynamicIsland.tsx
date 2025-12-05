import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, Gift, Star, Zap, X } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════

type NotificationType = 'success' | 'error' | 'info' | 'bonus' | 'achievement' | 'urgent'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // ms, 0 = persistent
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface DynamicIslandContextValue {
  show: (notification: Omit<Notification, 'id'>) => string
  hide: (id: string) => void
  hideAll: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const DynamicIslandContext = createContext<DynamicIslandContextValue | null>(null)

export function useDynamicIsland() {
  const context = useContext(DynamicIslandContext)
  if (!context) {
    throw new Error('useDynamicIsland must be used within DynamicIslandProvider')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════════════
//  NOTIFICATION CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_CONFIG: Record<NotificationType, {
  icon: ReactNode
  gradient: string
  glow: string
  textColor: string
}> = {
  success: {
    icon: <Check size={18} strokeWidth={2.5} />,
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))',
    glow: 'rgba(34, 197, 94, 0.4)',
    textColor: '#4ade80',
  },
  error: {
    icon: <AlertCircle size={18} strokeWidth={2} />,
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
    glow: 'rgba(239, 68, 68, 0.4)',
    textColor: '#f87171',
  },
  info: {
    icon: <Star size={18} strokeWidth={2} />,
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))',
    glow: 'rgba(59, 130, 246, 0.4)',
    textColor: '#60a5fa',
  },
  bonus: {
    icon: <Gift size={18} strokeWidth={2} />,
    gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(180, 142, 38, 0.15))',
    glow: 'rgba(212, 175, 55, 0.5)',
    textColor: '#D4AF37',
  },
  achievement: {
    icon: <Star size={18} fill="currentColor" strokeWidth={0} />,
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.1))',
    glow: 'rgba(168, 85, 247, 0.4)',
    textColor: '#c084fc',
  },
  urgent: {
    icon: <Zap size={18} strokeWidth={2} />,
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(212, 175, 55, 0.15))',
    glow: 'rgba(239, 68, 68, 0.5)',
    textColor: '#fbbf24',
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  NOTIFICATION ITEM
// ═══════════════════════════════════════════════════════════════════════════

function NotificationItem({
  notification,
  onClose,
  isExpanded,
  onExpand,
}: {
  notification: Notification
  onClose: () => void
  isExpanded: boolean
  onExpand: () => void
}) {
  const config = TYPE_CONFIG[notification.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        width: isExpanded ? 340 : 'auto',
      }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      onClick={onExpand}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: isExpanded ? '16px 20px' : '10px 16px',
        background: 'rgba(20, 20, 23, 0.95)',
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
        borderRadius: isExpanded ? 28 : 50,
        cursor: 'pointer',
        overflow: 'hidden',
        maxWidth: '90vw',
      }}
    >
      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: config.gradient,
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      {/* Glow effect */}
      <motion.div
        animate={{
          boxShadow: `0 10px 40px -10px ${config.glow}, 0 0 20px -5px ${config.glow}`,
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      {/* Border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: 1,
          background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <motion.div
        layout
        style={{
          position: 'relative',
          zIndex: 1,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${config.textColor}22, ${config.textColor}11)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.textColor,
          flexShrink: 0,
        }}
      >
        {notification.icon || config.icon}
      </motion.div>

      {/* Content */}
      <motion.div
        layout
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        <motion.div
          layout
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#EDEDED',
            whiteSpace: isExpanded ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {notification.title}
        </motion.div>

        <AnimatePresence>
          {isExpanded && notification.message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                fontSize: 12,
                color: '#a1a1aa',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        <AnimatePresence>
          {isExpanded && notification.action && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => {
                e.stopPropagation()
                notification.action?.onClick()
                onClose()
              }}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                background: config.textColor,
                border: 'none',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              {notification.action.label}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Close button */}
      <AnimatePresence>
        {isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            style={{
              position: 'relative',
              zIndex: 1,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#a1a1aa',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function DynamicIslandProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const show = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 4000,
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto-hide after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hide(id)
      }, newNotification.duration)
    }

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (notification.type === 'success' || notification.type === 'bonus') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      } else if (notification.type === 'error') {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error')
      } else {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
      }
    }

    return id
  }, [])

  const hide = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (expandedId === id) {
      setExpandedId(null)
    }
  }, [expandedId])

  const hideAll = useCallback(() => {
    setNotifications([])
    setExpandedId(null)
  }, [])

  // Show only the latest notification
  const currentNotification = notifications[notifications.length - 1]

  return (
    <DynamicIslandContext.Provider value={{ show, hide, hideAll }}>
      {children}

      {/* Dynamic Island Container */}
      <div
        style={{
          position: 'fixed',
          top: 'max(env(safe-area-inset-top, 12px), 12px)',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {currentNotification && (
            <div style={{ pointerEvents: 'auto' }}>
              <NotificationItem
                key={currentNotification.id}
                notification={currentNotification}
                onClose={() => hide(currentNotification.id)}
                isExpanded={expandedId === currentNotification.id}
                onExpand={() => setExpandedId(
                  expandedId === currentNotification.id ? null : currentNotification.id
                )}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </DynamicIslandContext.Provider>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPER HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Quick notification helpers
export function useNotify() {
  const { show } = useDynamicIsland()

  return {
    success: (title: string, message?: string) =>
      show({ type: 'success', title, message }),

    error: (title: string, message?: string) =>
      show({ type: 'error', title, message }),

    info: (title: string, message?: string) =>
      show({ type: 'info', title, message }),

    bonus: (title: string, message?: string) =>
      show({ type: 'bonus', title, message, duration: 5000 }),

    achievement: (title: string, message?: string) =>
      show({ type: 'achievement', title, message, duration: 6000 }),

    urgent: (title: string, message?: string, action?: Notification['action']) =>
      show({ type: 'urgent', title, message, duration: 0, action }),
  }
}
