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
  const hasAnyDiscount = activePromo || hasLoyaltyDiscount

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
      style={{
        marginTop: 24,
        padding: '20px 24px',
        background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.06), rgba(14, 13, 12, 0.88) 50%)',
        border: '1.5px solid rgba(212, 175, 55, 0.18)',
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255, 248, 214, 0.06), 0 4px 20px -8px rgba(212, 175, 55, 0.08)',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ориентировочно
            </span>
          </div>
          {hasAnyDiscount && (
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(212, 175, 55, 0.7)',
              display: 'block',
              marginTop: 4,
            }}>
              {hasLoyaltyDiscount && activePromo
                ? `Статус ${loyaltyDiscount}% + промокод ${activePromo.discount}%`
                : hasLoyaltyDiscount
                  ? `Личная скидка ${loyaltyDiscount}%`
                  : `Промокод ${activePromo?.discount}%`}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          {hasAnyDiscount && baseEstimate && (
            <>
              <div style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                textDecoration: 'line-through',
                marginBottom: 4,
                fontFamily: "'JetBrains Mono', monospace",
                opacity: 0.6,
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
              color: 'var(--gold-400)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.02em',
            }}
          >
            {estimate.toLocaleString('ru-RU')} ₽
          </motion.span>
          {hasAnyDiscount && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(212, 175, 55, 0.65)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
            }}>
              {activePromo ? (
                <>
                  <Tag size={11} />
                  {activePromo.code} −{activePromo.discount}%
                </>
              ) : (
                `Скидка −${loyaltyDiscount}%`
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
