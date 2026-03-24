import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney } from '../../lib/utils'
import { StaggerReveal } from '../ui/StaggerReveal'

interface FinanceStripProps {
  balance: number
  bonusBalance: number
  cashback: number
  activeOrders: number
  onOpenLounge: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

const ACCENT_STYLE = {
  border: '1px solid rgba(212,175,55,0.14)',
  background: 'rgba(212,175,55,0.06)',
} as const

const NEUTRAL_STYLE = {
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
} as const

const LABEL_STYLE = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.34)',
  marginBottom: 4,
  whiteSpace: 'nowrap' as const,
}

const NUMBER_BASE_STYLE = {
  fontFamily: "'Manrope', system-ui, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '-0.03em',
  whiteSpace: 'nowrap' as const,
  lineHeight: 1.1,
}

const PILL_BASE = {
  flexShrink: 0,
  padding: '12px 16px',
  borderRadius: 12,
} as const

export const FinanceStrip = memo(function FinanceStrip({
  balance,
  bonusBalance,
  cashback,
  activeOrders,
  onOpenLounge,
  haptic,
}: FinanceStripProps) {
  const items = useMemo(() => {
    const result: Array<{ label: string; value: string; accent?: boolean }> = []

    result.push({
      label: 'Баланс',
      value: formatMoney(balance),
      accent: true,
    })

    result.push({
      label: 'Кэшбэк',
      value: `${cashback}%`,
    })

    if (bonusBalance > 0) {
      result.push({
        label: 'Бонусы',
        value: formatMoney(bonusBalance),
      })
    }

    if (activeOrders > 0) {
      result.push({
        label: 'В работе',
        value: String(activeOrders),
      })
    }

    return result
  }, [balance, bonusBalance, cashback, activeOrders])

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 2,
        }}
      >
        <StaggerReveal
          direction="left"
          animation="slide"
          staggerDelay={0.05}
          style={{ display: 'flex', gap: 8 }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                ...PILL_BASE,
                ...(item.accent ? ACCENT_STYLE : NEUTRAL_STYLE),
              }}
            >
              <div style={LABEL_STYLE}>{item.label}</div>
              <div
                style={{
                  ...NUMBER_BASE_STYLE,
                  color: item.accent ? 'var(--gold-200)' : 'var(--text-primary)',
                }}
              >
                {item.value}
              </div>
            </div>
          ))}

          {/* Club button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic('light')
              onOpenLounge()
            }}
            style={{
              ...PILL_BASE,
              ...ACCENT_STYLE,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--gold-300)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Клуб
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </motion.button>
        </StaggerReveal>
      </div>
    </div>
  )
})
