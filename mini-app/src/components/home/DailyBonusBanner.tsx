import { memo } from 'react'
import { motion } from 'framer-motion'
import { Gift, Sparkles, ChevronRight, Coins } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS BANNER — Prominent banner for daily bonus claim
//  Replaces floating button with high-visibility card
// ═══════════════════════════════════════════════════════════════════════════

interface DailyBonusBannerProps {
  canClaim: boolean
  currentStreak?: number
  potentialBonus?: number // e.g., 50-200₽
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
  const streakMultiplier = Math.min(1 + currentStreak * 0.1, 2) // Max 2x at 10 day streak
  const bonusWithStreak = Math.round(potentialBonus * streakMultiplier)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        marginBottom: 16,
        padding: '18px 20px',
        borderRadius: 18,
        cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(180,140,40,0.08) 50%, rgba(212,175,55,0.12) 100%)',
        border: '1px solid rgba(212,175,55,0.4)',
        boxShadow: '0 4px 24px rgba(212,175,55,0.15), inset 0 0 30px rgba(212,175,55,0.03)',
        overflow: 'hidden',
      }}
    >
      {/* Animated shine effect */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Sparkle particles */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: 8,
          right: 60,
          pointerEvents: 'none',
        }}
      >
        <Sparkles size={12} color="var(--gold-400)" strokeWidth={1.5} />
      </motion.div>
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 100,
          pointerEvents: 'none',
        }}
      >
        <Sparkles size={10} color="var(--gold-300)" strokeWidth={1.5} />
      </motion.div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left side - Icon and text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Animated gift icon */}
            <motion.div
              animate={{
                rotate: [-5, 5, -5],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.3) 0%, rgba(180,140,40,0.2) 100%)',
                border: '1px solid rgba(212,175,55,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(212,175,55,0.2)',
              }}
            >
              <Gift size={26} color="#D4AF37" strokeWidth={1.5} />
            </motion.div>

            {/* Text content */}
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 4,
                  background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
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
                  <Coins size={13} color="var(--gold-400)" strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gold-400)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    до {bonusWithStreak}₽
                  </span>
                </div>
                {currentStreak > 0 && (
                  <div
                    style={{
                      padding: '2px 8px',
                      background: 'rgba(74, 222, 128, 0.15)',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                      borderRadius: 100,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#4ade80',
                    }}
                  >
                    🔥 {currentStreak} дней
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - CTA button */}
          <motion.div
            whileHover={{ scale: 1.05, x: 3 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 18px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 100%)',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(212,175,55,0.3)',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1a1a1a',
              }}
            >
              Забрать
            </span>
            <ChevronRight size={16} color="#1a1a1a" strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Bottom hint about streak */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid rgba(212,175,55,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Заходи каждый день →
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--gold-400)',
            }}
          >
            бонус растёт до x2
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
})
