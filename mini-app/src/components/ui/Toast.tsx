import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, Info, X, Gift, Zap } from 'lucide-react'

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'bonus' | 'achievement'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

// Hook to use toasts
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Toast config by type
const toastConfig: Record<ToastType, {
  icon: typeof Check
  gradient: string
  border: string
  iconBg: string
  iconColor: string
}> = {
  success: {
    icon: Check,
    gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(34, 197, 94, 0.3)',
    iconBg: 'rgba(34, 197, 94, 0.2)',
    iconColor: 'var(--success-text)',
  },
  error: {
    icon: AlertCircle,
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: 'var(--error-text)',
  },
  info: {
    icon: Info,
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(59, 130, 246, 0.3)',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: 'var(--info-text)',
  },
  bonus: {
    icon: Gift,
    gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(212, 175, 55, 0.4)',
    iconBg: 'linear-gradient(135deg, var(--gold-400), var(--gold-700))',
    iconColor: 'var(--text-on-gold)',
  },
  achievement: {
    icon: Zap,
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(168, 85, 247, 0.3)',
    iconBg: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    iconColor: 'var(--text-primary)',
  },
}

// Single Toast Component
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: config.gradient,
        border: `1px solid ${config.border}`,
        borderRadius: 12,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `
          0 10px 40px -10px rgba(0, 0, 0, 0.5),
          0 0 20px -5px ${config.border}
        `,
        maxWidth: 340,
        width: '100%',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: config.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={config.iconColor} />
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: toast.message ? 2 : 0,
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--surface-active)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} color="var(--text-muted)" />
      </motion.button>
    </motion.div>
  )
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    const duration = toast.duration || 4000

    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '0 16px',
          width: '100%',
          maxWidth: 380,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem
                toast={toast}
                onClose={() => hideToast(toast.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// Note: For toast functionality, use the useToast() hook within components:
// const { showToast } = useToast()
// showToast({ type: 'success', title: 'Done!', message: 'Optional message' })
