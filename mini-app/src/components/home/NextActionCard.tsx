import { useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CreditCard, FileText, RotateCcw, CheckCircle2, MessageCircle } from 'lucide-react'
import { NextAction } from './types'
import { NEXT_ACTION_CONFIG } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  NEXT ACTION CARD — Dynamic priority-based action card
//  Shows the most important action user needs to take:
//  1. Payment required (waiting_payment)
//  2. Files needed (pending info)
//  3. Revision needed
//  4. Review ready
//  5. New message
// ═══════════════════════════════════════════════════════════════════════════

interface Order {
  id: number
  status: string
  work_type_label: string
  subject: string
  has_unread_messages?: boolean
}

interface NextActionCardProps {
  orders: Order[]
  onNavigate: (route: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

function getNextAction(orders: Order[]): NextAction | null {
  // Priority 1: Payment required
  const paymentOrder = orders.find(o => o.status === 'waiting_payment')
  if (paymentOrder) {
    return {
      id: `payment-${paymentOrder.id}`,
      type: 'payment',
      priority: 1,
      title: 'Оплата заказа',
      subtitle: paymentOrder.subject || paymentOrder.work_type_label || `Заказ #${paymentOrder.id}`,
      icon: CreditCard,
      color: NEXT_ACTION_CONFIG.payment.color,
      bgColor: NEXT_ACTION_CONFIG.payment.bgColor,
      borderColor: NEXT_ACTION_CONFIG.payment.borderColor,
      orderId: paymentOrder.id,
      route: `/order/${paymentOrder.id}`,
    }
  }

  // Priority 2: Files/info needed (waiting_estimation can mean they need more info)
  const filesOrder = orders.find(o => o.status === 'waiting_estimation')
  if (filesOrder) {
    return {
      id: `files-${filesOrder.id}`,
      type: 'files_needed',
      priority: 2,
      title: 'Нужны материалы',
      subtitle: filesOrder.subject || filesOrder.work_type_label || `Заказ #${filesOrder.id}`,
      icon: FileText,
      color: NEXT_ACTION_CONFIG.files_needed.color,
      bgColor: NEXT_ACTION_CONFIG.files_needed.bgColor,
      borderColor: NEXT_ACTION_CONFIG.files_needed.borderColor,
      orderId: filesOrder.id,
      route: `/order/${filesOrder.id}`,
    }
  }

  // Priority 3: Revision needed
  const revisionOrder = orders.find(o => o.status === 'revision')
  if (revisionOrder) {
    return {
      id: `revision-${revisionOrder.id}`,
      type: 'revision',
      priority: 3,
      title: 'Проверьте доработку',
      subtitle: revisionOrder.subject || revisionOrder.work_type_label || `Заказ #${revisionOrder.id}`,
      icon: RotateCcw,
      color: NEXT_ACTION_CONFIG.revision.color,
      bgColor: NEXT_ACTION_CONFIG.revision.bgColor,
      borderColor: NEXT_ACTION_CONFIG.revision.borderColor,
      orderId: revisionOrder.id,
      route: `/order/${revisionOrder.id}`,
    }
  }

  // Priority 4: Review ready
  const reviewOrder = orders.find(o => o.status === 'review')
  if (reviewOrder) {
    return {
      id: `review-${reviewOrder.id}`,
      type: 'review',
      priority: 4,
      title: 'Работа готова',
      subtitle: reviewOrder.subject || reviewOrder.work_type_label || `Заказ #${reviewOrder.id}`,
      icon: CheckCircle2,
      color: NEXT_ACTION_CONFIG.review.color,
      bgColor: NEXT_ACTION_CONFIG.review.bgColor,
      borderColor: NEXT_ACTION_CONFIG.review.borderColor,
      orderId: reviewOrder.id,
      route: `/order/${reviewOrder.id}`,
    }
  }

  // Priority 5: New messages
  const messageOrder = orders.find(o => o.has_unread_messages)
  if (messageOrder) {
    return {
      id: `message-${messageOrder.id}`,
      type: 'new_message',
      priority: 5,
      title: 'Новое сообщение',
      subtitle: messageOrder.subject || messageOrder.work_type_label || `Заказ #${messageOrder.id}`,
      icon: MessageCircle,
      color: NEXT_ACTION_CONFIG.new_message.color,
      bgColor: NEXT_ACTION_CONFIG.new_message.bgColor,
      borderColor: NEXT_ACTION_CONFIG.new_message.borderColor,
      orderId: messageOrder.id,
      route: `/order/${messageOrder.id}`,
    }
  }

  return null
}

export const NextActionCard = memo(function NextActionCard({ orders, onNavigate, haptic }: NextActionCardProps) {
  const nextAction = useMemo(() => getNextAction(orders), [orders])

  if (!nextAction) return null

  const Icon = nextAction.icon

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nextAction.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptic('medium')
            onNavigate(nextAction.route)
          }}
          className="order-card-responsive"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            width: '100%',
            padding: '16px 18px',
            marginBottom: 12,
            background: nextAction.bgColor,
            border: `1.5px solid ${nextAction.borderColor}`,
            borderRadius: 14,
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          {/* Static glow effect */}
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${nextAction.color}25 0%, transparent 70%)`,
              filter: 'blur(10px)',
              pointerEvents: 'none',
              opacity: 0.5,
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: 'var(--touch-target-min)',
              height: 'var(--touch-target-min)',
              borderRadius: 'var(--radius-responsive-md)',
              background: `linear-gradient(145deg, ${nextAction.color}25, ${nextAction.color}15)`,
              border: `1px solid ${nextAction.borderColor}`,
              boxShadow: `0 0 16px ${nextAction.color}50`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
              flexShrink: 0,
            }}
          >
            <Icon size="var(--icon-md)" color={nextAction.color} strokeWidth={1.5} style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--gap-sm)',
                marginBottom: 'var(--gap-xs)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: nextAction.color,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                СЛЕДУЮЩИЙ ШАГ
              </span>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: nextAction.color,
                  boxShadow: `0 0 8px ${nextAction.color}`,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 'var(--text-md)',
                fontWeight: 600,
                color: '#fff',
                marginBottom: 2,
              }}
            >
              {nextAction.title}
            </div>
            <div
              className="order-card-subtitle truncate"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nextAction.subtitle}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight
            size="var(--icon-sm)"
            color={nextAction.color}
            strokeWidth={1.5}
            style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 'var(--icon-sm)', height: 'var(--icon-sm)' }}
          />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  // Compare orders array by checking length and each order's key properties
  if (prevProps.orders.length !== nextProps.orders.length) return false

  for (let i = 0; i < prevProps.orders.length; i++) {
    const prev = prevProps.orders[i]
    const next = nextProps.orders[i]
    if (prev.id !== next.id ||
        prev.status !== next.status ||
        prev.has_unread_messages !== next.has_unread_messages) {
      return false
    }
  }

  return true
})
