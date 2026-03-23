import { motion } from 'framer-motion'
import { Tag } from 'lucide-react'

interface EstimateCardProps {
  estimate: number
  baseEstimate: number | null
  loyaltyDiscount: number
  activePromo: { code: string; discount: number } | null
}

export function EstimateCard({ estimate, baseEstimate, loyaltyDiscount, activePromo }: EstimateCardProps) {
  const priceAfterLoyalty = baseEstimate
    ? Math.round(baseEstimate * (1 - loyaltyDiscount / 100))
    : null
  const hasLoyaltyDiscount = loyaltyDiscount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      style={{
        marginTop: 24,
        padding: '20px 24px',
        background: 'var(--gold-glass-medium)',
        border: '2px solid var(--border-gold)',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ориентировочно
            </span>
          </div>
          {(activePromo || hasLoyaltyDiscount) && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'block', marginTop: 2 }}>
              {hasLoyaltyDiscount && activePromo
                ? `Статус ${loyaltyDiscount}% + промокод ${activePromo.discount}%`
                : hasLoyaltyDiscount
                  ? `С учетом личной скидки ${loyaltyDiscount}%`
                  : `С промокодом ${activePromo?.discount}%`}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {(activePromo || hasLoyaltyDiscount) && baseEstimate && (
            <>
              <div style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                textDecoration: 'line-through',
                marginBottom: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {baseEstimate.toLocaleString('ru-RU')} ₽
              </div>
              {activePromo && hasLoyaltyDiscount && priceAfterLoyalty && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  После статуса: {priceAfterLoyalty.toLocaleString('ru-RU')} ₽
                </div>
              )}
            </>
          )}
          <motion.span
            key={estimate}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: activePromo || hasLoyaltyDiscount ? 'var(--success-text)' : 'var(--gold-400)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {estimate.toLocaleString('ru-RU')} ₽
          </motion.span>
          {(activePromo || hasLoyaltyDiscount) && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#22c55e',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}>
              {activePromo ? (
                <>
                  <Tag size={12} />
                  {activePromo.code} −{activePromo.discount}%
                </>
              ) : (
                `Личная скидка −${loyaltyDiscount}%`
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
