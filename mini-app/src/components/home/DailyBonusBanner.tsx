import { memo } from 'react'
import { motion } from 'framer-motion'
import { Gift, ChevronRight } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS BANNER — Elite Edition
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
  if (!canClaim) return null

  const handleClick = () => {
    haptic?.('medium')
    onClaim()
  }

  // Calculate streak bonus multiplier
  const streakMultiplier = Math.min(1 + currentStreak * 0.1, 2)
  const bonusWithStreak = Math.round(potentialBonus * streakMultiplier)

  return (
    <div className={s.dailyBonusWrapper}>
      {/* Background Glow */}
      <div className={s.heroGlow} />

      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={s.voidGlass}
        style={{
          position: 'relative',
          width: '100%',
          padding: '20px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden'
        }}
      >
        {/* Animated Gold Sheen */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, transparent 40%, rgba(212,175,55,0.1) 50%, transparent 60%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: '14px',
            background: 'linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 0 15px rgba(212,175,55,0.15)'
          }}>
            <Gift size={24} color="#d4af37" />
          </div>

          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '13px',
              color: '#a1a1aa',
              letterSpacing: '0.05em',
              marginBottom: '4px',
              textTransform: 'uppercase'
            }}>
              ЕЖЕДНЕВНЫЙ БОНУС
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#f2f2f2',
              fontFamily: "'Manrope', sans-serif"
            }}>
              ЗАБРАТЬ <span style={{ color: '#d4af37' }}>{bonusWithStreak}₽</span>
            </div>
          </div>
        </div>

        <div style={{
          width: 32, height: 32,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2
        }}>
          <ChevronRight size={18} color="#d4af37" />
        </div>
      </motion.button>
    </div>
  )
})
