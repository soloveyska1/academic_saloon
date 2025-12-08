import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Download, Star, CheckCircle, PenTool,
  CreditCard, RefreshCw
} from 'lucide-react'
import { Order, OrderStatus } from '../../types'

interface FloatingActionBarProps {
  order: Order
  unreadMessages?: number
  onChatClick: () => void
  onFilesClick?: () => void
  onReviewClick?: () => void
  onConfirmClick?: () => void
  onRevisionClick?: () => void
  onPaymentClick?: () => void
  onReorderClick?: () => void
}

interface ActionButton {
  id: string
  icon: typeof MessageCircle
  label: string
  color: string
  bgColor: string
  borderColor: string
  onClick: () => void
  badge?: number
  primary?: boolean
  pulse?: boolean
}

function getActionsForStatus(
  status: OrderStatus,
  order: Order,
  props: FloatingActionBarProps
): ActionButton[] {
  const actions: ActionButton[] = []

  // Chat is always available
  // REMOVED at user request: Chat button is redundant as there is an inline chat interface
  /*
  actions.push({
    id: 'chat',
    icon: MessageCircle,
    label: 'Чат',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    onClick: props.onChatClick,
    badge: props.unreadMessages,
  })
  */

  // Status-specific actions
  // NOTE: Payment button removed - GoldenInvoice has the payment CTA directly on the page
  switch (status) {
    case 'waiting_payment':
    case 'confirmed':
      // Кнопка оплаты убрана - GoldenInvoice виден на странице с кнопкой "Я оплатил"
      break

    case 'review':
      if (order.files_url && props.onFilesClick) {
        actions.unshift({
          id: 'files',
          icon: Download,
          label: 'Скачать',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
          onClick: props.onFilesClick,
        })
      }
      if (props.onConfirmClick) {
        actions.unshift({
          id: 'confirm',
          icon: CheckCircle,
          label: 'Принять',
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.15)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          onClick: props.onConfirmClick,
          primary: true,
        })
      }
      if (props.onRevisionClick) {
        actions.push({
          id: 'revision',
          icon: PenTool,
          label: 'Правки',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          onClick: props.onRevisionClick,
        })
      }
      break

    case 'completed':
      if (order.files_url && props.onFilesClick) {
        actions.unshift({
          id: 'files',
          icon: Download,
          label: 'Скачать',
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.15)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          onClick: props.onFilesClick,
        })
      }
      if (!order.review_submitted && props.onReviewClick) {
        actions.push({
          id: 'review',
          icon: Star,
          label: 'Отзыв',
          color: '#d4af37',
          bgColor: 'rgba(212, 175, 55, 0.15)',
          borderColor: 'rgba(212, 175, 55, 0.3)',
          onClick: props.onReviewClick,
          primary: true,
        })
      }
      if (props.onReorderClick) {
        actions.push({
          id: 'reorder',
          icon: RefreshCw,
          label: 'Ещё раз',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
          onClick: props.onReorderClick,
        })
      }
      break

    case 'paid':
    case 'paid_full':
    case 'in_progress':
      // Just chat - no extra buttons needed
      break
  }

  return actions.slice(0, 4) // Max 4 buttons
}

export function FloatingActionBar(props: FloatingActionBarProps) {
  const { order, unreadMessages } = props
  const actions = getActionsForStatus(order.status, order, props)

  // Don't show for cancelled orders
  if (['cancelled', 'rejected'].includes(order.status)) {
    return null
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: 90,
        left: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{
        display: 'flex',
        gap: 10,
        padding: 8,
        borderRadius: 22,
        background: 'rgba(20, 20, 23, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(212, 175, 55, 0.1)',
      }}>
        <AnimatePresence mode="popLayout">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={action.onClick}
              style={{
                position: 'relative',
                padding: action.primary ? '12px 20px' : '12px 16px',
                borderRadius: 16,
                background: action.primary
                  ? `linear-gradient(135deg, ${action.color}30, ${action.color}10)`
                  : action.bgColor,
                border: `1px solid ${action.borderColor}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: action.primary ? 'auto' : 56,
                justifyContent: 'center',
              }}
            >
              {/* Pulse animation for primary actions */}
              {action.pulse && (
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 0 0 ${action.color}40`,
                      `0 0 0 8px ${action.color}00`,
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 16,
                    pointerEvents: 'none',
                  }}
                />
              )}

              <action.icon size={action.primary ? 18 : 20} color={action.color} />

              {action.primary && (
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: action.color,
                }}>
                  {action.label}
                </span>
              )}

              {/* Badge for unread messages */}
              {action.badge && action.badge > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: '#ef4444',
                    border: '2px solid rgba(20, 20, 23, 0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
