import { memo } from 'react'
import { motion } from 'framer-motion'
import { FileText, BookOpen, GraduationCap, PenLine, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  PRICING ANCHOR — Psychology-backed price anchoring section.
//  Shows "market price" crossed out + our price = perceived value.
//  Research: price anchoring sets reference point, increases conversions.
//  Each card navigable → create-order with prefilled work_type.
// ═══════════════════════════════════════════════════════════════════════════

interface PricingItem {
  icon: typeof FileText
  workType: string
  workTypeKey: string
  marketPrice: string
  ourPrice: string
}

const PRICING_ITEMS: PricingItem[] = [
  {
    icon: PenLine,
    workType: 'Реферат',
    workTypeKey: 'referat',
    marketPrice: '2 500',
    ourPrice: 'от 990',
  },
  {
    icon: FileText,
    workType: 'Курсовая',
    workTypeKey: 'kursovaya',
    marketPrice: '8 000',
    ourPrice: 'от 2 990',
  },
  {
    icon: GraduationCap,
    workType: 'Дипломная',
    workTypeKey: 'diplomnaya',
    marketPrice: '25 000',
    ourPrice: 'от 9 990',
  },
  {
    icon: BookOpen,
    workType: 'Эссе',
    workTypeKey: 'esse',
    marketPrice: '3 000',
    ourPrice: 'от 1 490',
  },
]

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 14,
          paddingLeft: 2,
        }}
      >
        Популярные работы
      </div>

      {/* Price cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
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
              transition={{ delay: 0.38 + i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic?.('light')
                onNavigateToOrder(item.workTypeKey)
              }}
              style={{
                padding: '18px 16px',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                appearance: 'none',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--gold-glass-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Icon size={16} color="var(--gold-400)" strokeWidth={1.8} />
              </div>

              {/* Work type */}
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
                lineHeight: 1.2,
              }}>
                {item.workType}
              </div>

              {/* Prices — anchor + real */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {/* Market price — crossed out */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                  textDecorationColor: 'var(--error-text)',
                  opacity: 0.7,
                }}>
                  {item.marketPrice} ₽
                </span>
                {/* Our price */}
                <span style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'var(--gold-400)',
                  letterSpacing: '-0.01em',
                }}>
                  {item.ourPrice} ₽
                </span>
              </div>

              {/* Arrow hint */}
              <div style={{
                position: 'absolute',
                bottom: 16,
                right: 14,
                opacity: 0.3,
              }}>
                <ArrowRight size={14} color="var(--text-muted)" strokeWidth={2} />
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 10,
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text-muted)',
        textAlign: 'center',
        letterSpacing: '0.01em',
      }}>
        Точная цена — после оценки эксперта
      </div>
    </motion.div>
  )
})
