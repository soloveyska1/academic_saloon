import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Clock, Sparkles, Check } from 'lucide-react'
import { DailyBonusState, ClubLevelId } from '../../types'
import { StreakCalendar } from './StreakCalendar'
import { LEVEL_BONUS_MULTIPLIER, DAILY_BONUS_CYCLE } from './clubData'

// ═══════════════════════════════════════════════════════════════════════════════
//  DAILY BONUS CARD - Check-in with 7-day streak calendar
// ═══════════════════════════════════════════════════════════════════════════════

interface DailyBonusCardProps {
  bonusState: DailyBonusState
  levelId: ClubLevelId
  onClaimBonus: () => void
  isLoading?: boolean
}

function formatTimeRemaining(nextClaimAt: string | null): string {
  if (!nextClaimAt) return '00:00'

  const now = new Date().getTime()
  const next = new Date(nextClaimAt).getTime()
  const diff = Math.max(0, next - now)

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export const DailyBonusCard = memo(function DailyBonusCard({
  bonusState,
  levelId,
  onClaimBonus,
  isLoading = false,
}: DailyBonusCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => formatTimeRemaining(bonusState.nextClaimAt))
  const [showClaimed, setShowClaimed] = useState(false)

  const multiplier = LEVEL_BONUS_MULTIPLIER[levelId] || 1
  const todayBonus = DAILY_BONUS_CYCLE[bonusState.streakDay - 1] || DAILY_BONUS_CYCLE[0]
  const todayPoints = Math.round(todayBonus.points * multiplier)

  // Update timer every minute
  useEffect(() => {
    if (bonusState.status !== 'cooldown') return

    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(bonusState.nextClaimAt))
    }, 60000)

    return () => clearInterval(interval)
  }, [bonusState.nextClaimAt, bonusState.status])

  const handleClaim = () => {
    if (bonusState.status !== 'available' || isLoading) return

    // Trigger haptic
    try {
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success')
    } catch {}

    setShowClaimed(true)
    onClaimBonus()

    setTimeout(() => setShowClaimed(false), 2000)
  }

  const isAvailable = bonusState.status === 'available'
  const isClaimed = bonusState.status === 'claimed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.15)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gift size={18} color="#D4AF37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Ежедневный бонус
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                День {bonusState.streakDay} из 7
              </div>
            </div>
          </div>

          {/* Streak badge */}
          {bonusState.streakDay > 1 && (
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37' }}>
                {bonusState.streakDay} дней подряд
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div style={{ padding: '0 20px 16px' }}>
        <StreakCalendar
          currentDay={bonusState.streakDay}
          claimedToday={isClaimed}
          levelMultiplier={multiplier}
        />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '0 20px' }} />

      {/* CTA Area */}
      <div style={{ padding: 16 }}>
        <AnimatePresence mode="wait">
          {showClaimed ? (
            <motion.div
              key="claimed-toast"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <Check size={20} color="#22c55e" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#22c55e' }}>
                +{todayPoints} баллов получено!
              </span>
              <Sparkles size={16} color="#22c55e" />
            </motion.div>
          ) : isAvailable ? (
            <motion.button
              key="claim-btn"
              whileTap={{ scale: 0.98 }}
              onClick={handleClaim}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: isLoading ? 'wait' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <Gift size={18} color="#1a1a1d" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1d' }}>
                Забрать +{todayPoints} баллов
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="cooldown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Check size={18} color="rgba(255, 255, 255, 0.5)" />
              <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>
                Бонус получен
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
              <Clock size={14} color="rgba(255, 255, 255, 0.4)" />
              <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                {timeRemaining}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level bonus hint */}
        {multiplier > 1 && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(212, 175, 55, 0.7)' }}>
              Бонус уровня: +{Math.round((multiplier - 1) * 100)}% к баллам
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
})
