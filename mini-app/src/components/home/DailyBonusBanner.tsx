import { memo } from 'react'
import { motion } from 'framer-motion'
import { Gift, ChevronRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS BANNER — Compact, elegant secondary action
//  Premium "old money" design:
//  - Single line, minimal footprint
//  - Subtle but noticeable
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
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      aria-label={`Забрать ежедневный бонус до ${bonusWithStreak} рублей`}
      style={{
        width: '100%',
        marginBottom: 12,
        padding: '12px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Gift size={18} color="var(--gold-400)" strokeWidth={1.5} style={{ opacity: 0.9 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Бонус дня
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--gold-400)',
          }}
        >
          до {bonusWithStreak}₽
        </span>
        {currentStreak > 1 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
            }}
          >
            {currentStreak} дн.
          </span>
        )}
      </div>

      {/* Right side */}
      <ChevronRight size={16} color="var(--gold-400)" strokeWidth={1.5} style={{ opacity: 0.7 }} />
    </motion.button>
  )
})
