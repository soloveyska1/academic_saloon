import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Gift, Lock } from 'lucide-react'
import { DAILY_BONUS_CYCLE } from './clubData'

// ═══════════════════════════════════════════════════════════════════════════════
//  STREAK CALENDAR - 7-day bonus cycle visualization
// ═══════════════════════════════════════════════════════════════════════════════

interface StreakCalendarProps {
  currentDay: number  // 1-7
  claimedToday: boolean
  levelMultiplier: number
}

export const StreakCalendar = memo(function StreakCalendar({
  currentDay,
  claimedToday,
  levelMultiplier,
}: StreakCalendarProps) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
      {DAILY_BONUS_CYCLE.map((day, idx) => {
        const dayNumber = idx + 1
        const isPast = dayNumber < currentDay
        const isCurrent = dayNumber === currentDay
        const isFuture = dayNumber > currentDay
        const isCompleted = isPast || (isCurrent && claimedToday)
        const isBonus = day.bonus

        const points = Math.round(day.points * levelMultiplier)

        return (
          <motion.div
            key={day.day}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {/* Day circle */}
            <motion.div
              animate={isCurrent && !claimedToday ? {
                boxShadow: [
                  '0 0 0 0 rgba(212, 175, 55, 0)',
                  '0 0 0 6px rgba(212, 175, 55, 0.2)',
                  '0 0 0 0 rgba(212, 175, 55, 0)',
                ],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isCompleted
                  ? isBonus
                    ? 'linear-gradient(135deg, #D4AF37 0%, #F5D061 100%)'
                    : 'rgba(34, 197, 94, 0.2)'
                  : isCurrent
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                border: isCompleted
                  ? 'none'
                  : isCurrent
                    ? '2px solid rgba(212, 175, 55, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
              }}
            >
              {isCompleted ? (
                <Check
                  size={16}
                  color={isBonus ? '#1a1a1d' : '#22c55e'}
                  strokeWidth={3}
                />
              ) : isFuture ? (
                <Lock size={14} color="rgba(255, 255, 255, 0.3)" />
              ) : isBonus ? (
                <Gift size={16} color="#D4AF37" />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37' }}>
                  {dayNumber}
                </span>
              )}
            </motion.div>

            {/* Points label */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: isCompleted
                  ? 'rgba(255, 255, 255, 0.4)'
                  : isCurrent
                    ? '#D4AF37'
                    : 'rgba(255, 255, 255, 0.5)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              +{points}
            </span>

            {/* Bonus indicator */}
            {isBonus && !isCompleted && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  fontSize: 8,
                  color: '#D4AF37',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                БОНУС
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
})
