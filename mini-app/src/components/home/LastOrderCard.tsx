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
  work_type_label?: string
  subject: string | null
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
    color: 'var(--text-secondary)',
    // In elite theme we override this with CSS but keep fallback
    bg: 'var(--border-default)',
  }

  const title = order.subject || order.work_type_label || `Заказ #${order.id}`
  const WorkTypeIcon = (order.work_type_label && WORK_TYPE_ICONS[order.work_type_label]) || FileText
  const isActive = !shouldReduceMotion && ['pending', 'in_progress', 'review', 'waiting_payment'].includes(order.status)
  const createdAt = new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div style={{ paddingBottom: '30px' }}>
      <div className={s.sectionTitle}>ПОСЛЕДНИЙ ЗАКАЗ</div>

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
          border: '1px solid var(--border-strong)',
          position: 'relative',
          background: `
            radial-gradient(circle at top right, var(--gold-glass-medium), transparent 34%),
            linear-gradient(180deg, var(--bg-surface), var(--bg-void))
          `,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Icon Container */}
          <div style={{
            width: 50, height: 50, borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--border-default) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? '0 0 20px var(--gold-glass-medium)' : 'none'
          }}>
            <WorkTypeIcon size={24} color={isActive ? 'var(--gold-400)' : 'var(--text-secondary)'} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: '11px',
                color: isActive ? 'var(--gold-400)' : 'var(--text-muted)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                {status.label}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                {createdAt}
              </span>
              {isActive && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-400)' }}
                />
              )}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              marginBottom: 4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {title}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              Нажмите, чтобы увидеть статус и написать менеджеру
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ArrowRight size={16} color="var(--text-muted)" />
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
