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
    iconColor: '#22c55e',
  },
  error: {
    icon: AlertCircle,
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#ef4444',
  },
  info: {
    icon: Info,
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(59, 130, 246, 0.3)',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
  },
  bonus: {
    icon: Gift,
    gradient: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(212, 175, 55, 0.4)',
    iconBg: 'linear-gradient(135deg, #d4af37, #b38728)',
    iconColor: '#09090b',
  },
  achievement: {
    icon: Zap,
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(20, 20, 23, 0.98) 100%)',
    border: 'rgba(168, 85, 247, 0.3)',
    iconBg: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    iconColor: '#fff',
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
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
          color: '#f2f2f2',
          marginBottom: toast.message ? 2 : 0,
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{
            fontSize: 12,
            color: '#a1a1aa',
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
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} color="#71717a" />
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
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
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
