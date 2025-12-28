import { useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, CreditCard, FileText, RotateCcw, CheckCircle2, MessageCircle } from 'lucide-react'
import { NextAction } from './types'
import { NEXT_ACTION_CONFIG } from './constants'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEXT ACTION CARD — Priority Dossier
// ═══════════════════════════════════════════════════════════════════════════

interface Order {
  id: number
  status: string
  work_type_label?: string
  subject: string | null
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
    <div style={{ marginBottom: 24 }}>
      <div className={s.sectionTitle}>ТРЕБУЕТ ВНИМАНИЯ</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={nextAction.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className={s.voidGlass}
          onClick={() => {
            haptic('medium')
            onNavigate(nextAction.route)
          }}
          style={{
            borderRadius: '16px',
            padding: '2px', // For gradient border effect
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${nextAction.color}40, rgba(255,255,255,0.05))`,
            position: 'relative'
          }}
        >
          <div style={{
            background: '#0c0c0e',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '12px',
              background: `${nextAction.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${nextAction.color}40`,
              boxShadow: `0 0 20px ${nextAction.color}20`
            }}>
              <Icon size={24} color={nextAction.color} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', background: nextAction.color,
                  boxShadow: `0 0 8px ${nextAction.color}`
                }} />
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: nextAction.color,
                  textTransform: 'uppercase'
                }}>
                  ВАЖНО
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f2f2f2', marginBottom: '2px' }}>
                {nextAction.title}
              </div>
              <div style={{ fontSize: '13px', color: '#71717a' }} className="truncate">
                {nextAction.subtitle}
              </div>
            </div>

            <ChevronRight size={20} color="#52525b" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}, (prevProps, nextProps) => {
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
