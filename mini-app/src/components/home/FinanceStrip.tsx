import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney } from '../../lib/utils'
import { StaggerReveal } from '../ui/StaggerReveal'
import { useCapability } from '../../contexts/DeviceCapabilityContext'
import { HolographicCard } from '../ui/HolographicCard'

interface FinanceStripProps {
  balance: number
  bonusBalance: number
  cashback: number
  activeOrders: number
  onOpenLounge: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

const PILL = {
  flexShrink: 0,
  padding: '12px 16px',
  borderRadius: 12,
} as const

const GOLD_PILL = {
  ...PILL,
  border: '1px solid rgba(212,175,55,0.14)',
  background: 'rgba(212,175,55,0.06)',
} as const

const NEUTRAL_PILL = {
  ...PILL,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
} as const

const LABEL = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.34)',
  marginBottom: 4,
  whiteSpace: 'nowrap' as const,
}

const NUMBER = {
  fontFamily: "'Manrope', system-ui, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: '-0.03em',
  whiteSpace: 'nowrap' as const,
  lineHeight: 1.1,
}

export const FinanceStrip = memo(function FinanceStrip({
  balance,
  bonusBalance,
  cashback,
  onOpenLounge,
  haptic,
}: FinanceStripProps) {
  const capability = useCapability()
  // Combine balance + bonus into one "Счёт" pill
  const totalBalance = balance + bonusBalance
  const hasBonus = bonusBalance > 0

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
          {/* Combined balance pill — the hero number */}
          {capability.tier === 3 ? (
            <HolographicCard
              variant="gold"
              intensity="subtle"
              style={{ ...GOLD_PILL, flexShrink: 0 }}
            >
              <div style={LABEL}>Счёт</div>
              <div style={{ ...NUMBER, color: 'var(--gold-200)' }}>
                {formatMoney(totalBalance)}
              </div>
              {hasBonus && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(212,175,55,0.50)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoney(bonusBalance)} бонусов
                </div>
              )}
            </HolographicCard>
          ) : (
            <div style={GOLD_PILL}>
              <div style={LABEL}>Счёт</div>
              <div style={{ ...NUMBER, color: 'var(--gold-200)' }}>
                {formatMoney(totalBalance)}
              </div>
              {hasBonus && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(212,175,55,0.50)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoney(bonusBalance)} бонусов
                </div>
              )}
            </div>
          )}

          {/* Cashback pill */}
          <div style={NEUTRAL_PILL}>
            <div style={LABEL}>Кэшбэк</div>
            <div style={{ ...NUMBER, color: 'var(--text-primary)' }}>
              {cashback}%
            </div>
          </div>

          {/* Club button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic('light')
              onOpenLounge()
            }}
            style={{
              ...GOLD_PILL,
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
