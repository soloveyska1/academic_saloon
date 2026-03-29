import { motion } from 'framer-motion'
import { FONT } from './design-tokens'

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM PRICE TAG — Investment-style price display

   Stripe pricing technique:
   - "от" label small, above the number
   - Amount in tabular monospace, large
   - Currency symbol de-emphasized (smaller, muted)
   - Selected state: gold color transition
   ═══════════════════════════════════════════════════════════════════════════ */

interface PremiumPriceTagProps {
  price: string
  selected?: boolean
}

export function PremiumPriceTag({ price, selected = false }: PremiumPriceTagProps) {
  // Parse "от 40 000 ₽" → { prefix, amount, currency }
  const match = price.match(/^(от\s+)?([0-9\s]+)\s*(₽)$/)

  if (!match) {
    // Fallback for "индивидуально", "По запросу" etc
    return (
      <span style={{
        fontSize: FONT.size.xs,
        fontWeight: 600,
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {price}
      </span>
    )
  }

  const [, prefix, amount, currency] = match

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 1,
    }}>
      {/* "от" label — tiny, above the number */}
      {prefix && (
        <span style={{
          fontSize: 8,
          fontWeight: 600,
          color: selected ? 'rgba(212, 175, 55, 0.5)' : 'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          lineHeight: 1,
          opacity: 0.6,
        }}>
          от
        </span>
      )}

      {/* Amount + currency */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
      }}>
        <motion.span
          animate={{ color: selected ? '#d4af37' : 'var(--text-secondary)' }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: FONT.family.mono,
            fontSize: FONT.size.base,
            fontWeight: 600,
            letterSpacing: '0.03em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {amount.trim()}
        </motion.span>
        <span style={{
          fontFamily: FONT.family.mono,
          fontSize: FONT.size['2xs'],
          fontWeight: 500,
          color: selected ? 'rgba(212, 175, 55, 0.5)' : 'var(--text-muted)',
          lineHeight: 1,
          opacity: 0.6,
        }}>
          {currency}
        </span>
      </div>
    </div>
  )
}
