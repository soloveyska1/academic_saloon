import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, FileText } from 'lucide-react'
import { ORDER_STATUS_MAP, WORK_TYPE_ICONS } from './constants'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  LAST ORDER CARD — Elite Edition
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
    color: '#a1a1aa',
    // In elite theme we override this with CSS but keep fallback
    bg: 'rgba(255,255,255,0.05)',
  }

  const title = order.subject || order.work_type_label || `Заказ #${order.id}`
  const WorkTypeIcon = WORK_TYPE_ICONS[order.work_type_label] || FileText
  const isActive = !shouldReduceMotion && ['pending', 'in_progress', 'review', 'waiting_payment'].includes(order.status)

  return (
    <div style={{ paddingBottom: '30px' }}>
      <div className={s.sectionTitle}>ПОСЛЕДНЯЯ АКТИВНОСТЬ</div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptic?.('light'); onClick() }}
        className={s.voidGlass}
        style={{
          borderRadius: '20px',
          padding: '20px',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Icon Container */}
          <div style={{
            width: 50, height: 50, borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? '0 0 20px rgba(212,175,55,0.1)' : 'none'
          }}>
            <WorkTypeIcon size={24} color={isActive ? '#d4af37' : '#a1a1aa'} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4
            }}>
              <span style={{
                fontSize: '11px',
                color: isActive ? '#d4af37' : '#71717a',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                {status.label}
              </span>
              {isActive && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4af37' }}
                />
              )}
            </div>
            <div className="truncate" style={{
              fontSize: '15px', fontWeight: 600, color: '#f2f2f2'
            }}>
              {title}
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ArrowRight size={16} color="#71717a" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}, (prevProps: Readonly<LastOrderCardProps>, nextProps: Readonly<LastOrderCardProps>) => {
  return prevProps.order.id === nextProps.order.id &&
    prevProps.order.work_type_label === nextProps.order.work_type_label &&
    prevProps.order.subject === nextProps.order.subject &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.created_at === nextProps.order.created_at
})

