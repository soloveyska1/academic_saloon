import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Gift, ChevronRight, Coins } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS BANNER — Secondary action banner (subtle, not competing)
//  Cleaned up: removed excessive animations per design review
// ═══════════════════════════════════════════════════════════════════════════

interface DailyBonusBannerProps {
  canClaim: boolean
  currentStreak?: number
  potentialBonus?: number
  onClaim: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const DailyBonusBanner = memo(function DailyBonusBanner({
  canClaim,
  currentStreak = 0,
  potentialBonus = 100,
  onClaim,
  haptic,
}: DailyBonusBannerProps) {
  const shouldReduceMotion = useReducedMotion()

  // Don't show if already claimed today
  if (!canClaim) return null

  const handleClick = () => {
    haptic?.('medium')
    onClaim()
  }

  // Calculate streak bonus multiplier
  const streakMultiplier = Math.min(1 + currentStreak * 0.1, 2)
  const bonusWithStreak = Math.round(potentialBonus * streakMultiplier)

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`Забрать ежедневный бонус до ${bonusWithStreak} рублей`}
      style={{
        position: 'relative',
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        background: 'var(--bg-card)',
        border: '1px solid rgba(212,175,55,0.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        outline: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left side - Icon and text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Gift icon - static, no animation */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={22} color="var(--gold-400)" strokeWidth={1.5} />
          </div>

          {/* Text content */}
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 2,
                color: 'var(--text-main)',
              }}
            >
              Ежедневный бонус
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Coins size={12} color="var(--gold-400)" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  до {bonusWithStreak}₽
                </span>
              </div>
              {currentStreak > 0 && (
                <div
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid rgba(74, 222, 128, 0.2)',
                    borderRadius: 100,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#22c55e',
                  }}
                >
                  🔥 {currentStreak}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Subtle CTA */}
        <motion.div
          whileHover={shouldReduceMotion ? {} : { x: 2 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--gold-400)',
            }}
          >
            Забрать
          </span>
          <ChevronRight size={14} color="var(--gold-400)" strokeWidth={1.5} />
        </motion.div>
      </div>
    </motion.div>
  )
})
