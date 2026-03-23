import { memo } from 'react'
import { motion } from 'framer-motion'
import { FileText, BookOpen, GraduationCap, PenLine, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  PRICING ANCHOR — Price anchoring with market comparison.
//  Unified card style. Compact 2-column grid.
// ═══════════════════════════════════════════════════════════════════════════

const PRICING_ITEMS = [
  { icon: PenLine, workType: 'Реферат', workTypeKey: 'report', marketPrice: '2 500', ourPrice: 'от 990' },
  { icon: FileText, workType: 'Курсовая', workTypeKey: 'coursework', marketPrice: '8 000', ourPrice: 'от 2 990' },
  { icon: GraduationCap, workType: 'Дипломная', workTypeKey: 'diploma', marketPrice: '25 000', ourPrice: 'от 9 990' },
  { icon: BookOpen, workType: 'Эссе', workTypeKey: 'essay', marketPrice: '3 000', ourPrice: 'от 1 490' },
] as const

interface PricingAnchorProps {
  onNavigateToOrder: (workType: string) => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const PricingAnchor = memo(function PricingAnchor({
  onNavigateToOrder,
  haptic,
}: PricingAnchorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34 }}
      style={{ marginBottom: 24 }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        Популярные работы
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        {PRICING_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.workTypeKey}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 + i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic?.('light')
                onNavigateToOrder(item.workTypeKey)
              }}
              style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(12, 12, 10, 0.6)',
                backdropFilter: 'blur(16px) saturate(120%)',
                WebkitBackdropFilter: 'blur(16px) saturate(120%)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                cursor: 'pointer',
                appearance: 'none',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(201, 162, 39, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Icon size={15} color="var(--gold-400)" strokeWidth={1.8} />
              </div>

              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
                lineHeight: 1.2,
              }}>
                {item.workType}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                  opacity: 0.6,
                }}>
                  {item.marketPrice} ₽
                </span>
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--gold-400)',
                }}>
                  {item.ourPrice} ₽
                </span>
              </div>

              <ArrowRight
                size={13}
                color="var(--text-muted)"
                strokeWidth={2}
                style={{ position: 'absolute', bottom: 16, right: 16, opacity: 0.25 }}
              />
            </motion.button>
          )
        })}
      </div>

      <div style={{
        marginTop: 8,
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textAlign: 'center',
        opacity: 0.6,
      }}>
        Точная цена — после оценки эксперта
      </div>
    </motion.div>
  )
})
