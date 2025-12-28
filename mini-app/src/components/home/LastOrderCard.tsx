import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, FileText, GraduationCap, Zap, Camera } from 'lucide-react'
import { ORDER_STATUS_MAP, WORK_TYPE_ICONS } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  LAST ORDER CARD — Quick access to recent order
//  Premium styling with status-based colors and work type icons
// ═══════════════════════════════════════════════════════════════════════════

interface Order {
  id: number
  work_type_label: string
  subject: string
  status: string
  created_at: string
}

interface LastOrderCardProps {
  order: Order
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const LastOrderCard = memo(function LastOrderCard({ order, onClick, haptic }: LastOrderCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const status = ORDER_STATUS_MAP[order.status] || {
    label: order.status,
    color: '#888',
    bg: 'rgba(136,136,136,0.15)',
    border: 'rgba(136,136,136,0.3)',
  }

  const title = order.subject || order.work_type_label || `Заказ #${order.id}`
  const WorkTypeIcon = WORK_TYPE_ICONS[order.work_type_label] || FileText

  // Check if order is in active/pulsing state (disabled for reduced motion)
  const isActive = !shouldReduceMotion && ['pending', 'in_progress', 'review', 'waiting_payment'].includes(order.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptic?.('light'); onClick() }}
      className="order-card-responsive"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--radius-responsive-lg)',
        padding: 'var(--card-padding)',
        marginBottom: 'var(--gap-md)',
        cursor: 'pointer',
        background: `linear-gradient(135deg, ${status.bg} 0%, var(--bg-card) 50%)`,
        backdropFilter: 'blur(12px) saturate(130%)',
        WebkitBackdropFilter: 'blur(12px) saturate(130%)',
        border: `1px solid ${status.border}`,
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gap-md)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Icon with status glow */}
        <motion.div
          animate={
            isActive
              ? {
                  boxShadow: [
                    `0 0 12px ${status.color}40`,
                    `0 0 20px ${status.color}60`,
                    `0 0 12px ${status.color}40`,
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 'var(--touch-target-min)',
            height: 'var(--touch-target-min)',
            borderRadius: 'var(--radius-responsive-md)',
            background: status.bg,
            border: `1px solid ${status.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WorkTypeIcon size="var(--icon-md)" color={status.color} strokeWidth={1.5} style={{ width: 'var(--icon-md)', height: 'var(--icon-md)' }} />
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
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
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              }}
            >
              ПОСЛЕДНИЙ ЗАКАЗ
            </span>
          </div>
          <div
            className="order-card-title truncate"
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>

          {/* Status Badge */}
          <div
            style={{
              marginTop: 'var(--gap-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--gap-xs)',
              padding: '3px var(--gap-sm)',
              background: status.bg,
              border: `1px solid ${status.border}`,
              borderRadius: 100,
            }}
          >
            <motion.div
              animate={
                isActive ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}
              }
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: status.color,
                boxShadow: `0 0 8px ${status.color}`,
              }}
            />
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: status.color,
              }}
            >
              {status.label}
            </span>
          </div>
        </div>

        <ArrowRight size="var(--icon-sm)" color="var(--text-muted)" strokeWidth={1.5} style={{ width: 'var(--icon-sm)', height: 'var(--icon-sm)' }} />
      </div>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return prevProps.order.id === nextProps.order.id &&
    prevProps.order.work_type_label === nextProps.order.work_type_label &&
    prevProps.order.subject === nextProps.order.subject &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.created_at === nextProps.order.created_at
})
