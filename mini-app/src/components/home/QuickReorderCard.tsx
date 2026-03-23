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
  embedded?: boolean
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
  embedded = false,
}: QuickReorderCardProps) {
  // Only show if last order was completed
  if (lastOrder.status !== 'completed') return null

  const workTypeLabel = lastOrder.work_type_label || WORK_TYPE_LABELS[lastOrder.work_type] || lastOrder.work_type
  const subject = lastOrder.subject || 'Предмет не указан'

  if (embedded) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => {
          haptic('medium')
          onReorder(lastOrder.id)
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: 0,
          marginBottom: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.32)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Повтор заказа
          </div>

          <div
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 24,
              lineHeight: 0.98,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Повторить похожую работу
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {workTypeLabel}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              Исходные данные подтянутся автоматически
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subject}
          </div>
        </div>

        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.84))',
            color: 'var(--text-on-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 18px 28px -20px rgba(212, 175, 55, 0.48)',
          }}
        >
          <ArrowRight size={18} strokeWidth={2.2} />
        </div>
      </motion.button>
    )
  }

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
        borderRadius: embedded ? 22 : 28,
        padding: embedded ? 0 : 22,
        marginBottom: 0,
        background: embedded ? 'transparent' : 'linear-gradient(160deg, rgba(25, 21, 13, 0.96) 0%, rgba(13, 13, 14, 0.97) 46%, rgba(8, 8, 10, 1) 100%)',
        border: embedded ? 'none' : '1px solid rgba(212,175,55,0.10)',
        backdropFilter: embedded ? 'none' : 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: embedded ? 'none' : 'blur(16px) saturate(140%)',
        cursor: 'pointer',
        boxShadow: embedded ? 'none' : '0 24px 44px -34px rgba(0, 0, 0, 0.82)',
      }}
    >
      {!embedded && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -56,
            right: -24,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 30%, transparent 72%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Copy size={16} color="var(--gold-300)" strokeWidth={1.8} />
            </div>
            <span
              style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: embedded ? 'rgba(255,255,255,0.32)' : 'rgba(212,175,55,0.72)',
              textTransform: 'uppercase',
            }}
          >
              Повтор заказа
            </span>
          </div>

          {!embedded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--gold-300)',
              }}
            >
              1 касание
            </span>
          </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: embedded ? 'rgba(255,255,255,0.36)' : 'rgba(212,175,55,0.68)',
              marginBottom: 8,
            }}
          >
            {workTypeLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: embedded ? 24 : 28,
              lineHeight: embedded ? 1 : 0.95,
              letterSpacing: '-0.05em',
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Повторить похожий заказ
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              maxWidth: 320,
            }}
          >
            {subject}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={13} strokeWidth={1.7} color="var(--gold-300)" />
            <span>{embedded ? 'Исходные данные подтянутся автоматически' : 'Параметры подтянутся автоматически'}</span>
          </div>

          <div
            style={{
              width: embedded ? 42 : 46,
              height: embedded ? 42 : 46,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.84))',
              color: 'var(--text-on-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 18px 28px -20px rgba(212, 175, 55, 0.48)',
            }}
          >
            <ArrowRight size={18} strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </motion.div>
  )
})
