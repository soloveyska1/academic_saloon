import { memo } from 'react'
import { motion } from 'framer-motion'
import { Copy, ArrowRight, Clock } from 'lucide-react'
import { Order } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK REORDER CARD — One-click reorder based on previous order
//  Reduces friction for repeat customers
// ═══════════════════════════════════════════════════════════════════════════

interface QuickReorderCardProps {
  lastOrder: Order
  onReorder: (orderId: number) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

// Work type labels mapping
const WORK_TYPE_LABELS: Record<string, string> = {
  masters: 'Магистерская',
  diploma: 'Дипломная',
  coursework: 'Курсовая',
  practice: 'Практика',
  essay: 'Эссе',
  presentation: 'Презентация',
  control: 'Контрольная',
  independent: 'Самостоятельная',
  report: 'Доклад',
  photo_task: 'Фото задания',
  other: 'Другое',
}

export const QuickReorderCard = memo(function QuickReorderCard({
  lastOrder,
  onReorder,
  haptic,
}: QuickReorderCardProps) {
  // Only show if last order was completed
  if (lastOrder.status !== 'completed') return null

  const workTypeLabel = lastOrder.work_type_label || WORK_TYPE_LABELS[lastOrder.work_type] || lastOrder.work_type
  const subject = lastOrder.subject || 'Предмет не указан'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      onClick={() => {
        haptic('medium')
        onReorder(lastOrder.id)
      }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(201,162,39,0.06) 0%, rgba(12, 12, 10, 0.6) 60%, rgba(201,162,39,0.04) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 12,
                background: 'var(--gold-glass-medium)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Copy size={14} color="var(--gold-400)" strokeWidth={1.5} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
              }}
            >
              БЫСТРЫЙ ЗАКАЗ
            </span>
          </div>

          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--gold-glass-subtle)',
              borderRadius: 16,
              border: '1px solid var(--border-gold)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Повторить
            </span>
            <ArrowRight size={12} color="var(--gold-400)" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Order info */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            {workTypeLabel}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{subject}</span>
          </div>
        </div>

        {/* Hint */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <Clock size={11} strokeWidth={1.5} />
          <span>Создать похожий заказ в 1 клик</span>
        </div>
      </div>
    </motion.div>
  )
})
