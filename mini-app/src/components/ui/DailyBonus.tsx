import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Flame, X } from 'lucide-react'

interface Props {
  streak: number
  canClaim: boolean
  onClaim: () => Promise<{ bonus: number }>
  onClose: () => void
}

export function DailyBonusModal({ streak, canClaim, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [bonus, setBonus] = useState(0)

  const handleClaim = async () => {
    if (!canClaim || claiming) return
    setClaiming(true)
    try {
      const result = await onClaim()
      setBonus(result.bonus)
      setClaimed(true)
    } catch (e) {
      console.error(e)
    }
    setClaiming(false)
  }

  // Bonus multiplier based on streak
  const multiplier = Math.min(streak, 7)
  const baseBonus = 10
  const todayBonus = baseBonus * multiplier

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(20,20,23,0.98) 30%)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 24,
          padding: 24,
          textAlign: 'center',
          maxWidth: 340,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            padding: 8,
            cursor: 'pointer',
            color: '#71717a',
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: claimed ? 3 : 0 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #d4af37, #b38728)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(212,175,55,0.4)',
          }}
        >
          <Gift size={40} color="#09090b" />
        </motion.div>

        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 8,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          Ежедневный бонус
        </h2>

        {/* Streak */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 20,
        }}>
          <Flame size={18} color="#ef4444" />
          <span style={{ fontSize: 14, color: '#a1a1aa' }}>
            Серия: <span style={{ color: '#d4af37', fontWeight: 700 }}>{streak} дней</span>
          </span>
        </div>

        {/* Week Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 24,
          padding: '0 10px',
        }}>
          {weekDays.map((day, i) => {
            const dayNum = i + 1
            const isCompleted = dayNum <= streak % 7 || (streak >= 7 && streak % 7 === 0)
            const isCurrent = dayNum === (streak % 7) + 1 || (streak % 7 === 0 && dayNum === 1)

            return (
              <div key={day} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'
                    : 'rgba(255,255,255,0.05)',
                  border: isCurrent && canClaim
                    ? '2px solid #d4af37'
                    : isCompleted
                      ? '1px solid rgba(212,175,55,0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  boxShadow: isCurrent && canClaim ? '0 0 15px rgba(212,175,55,0.3)' : 'none',
                }}>
                  {isCompleted ? (
                    <span style={{ fontSize: 14 }}>✓</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#52525b' }}>{dayNum}</span>
                  )}
                </div>
                <span style={{ fontSize: 9, color: '#52525b' }}>{day}</span>
              </div>
            )
          })}
        </div>

        {/* Bonus Amount */}
        <AnimatePresence mode="wait">
          {claimed ? (
            <motion.div
              key="claimed"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: '#22c55e',
                marginBottom: 20,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              +{bonus} ₽
            </motion.div>
          ) : (
            <motion.div
              key="unclaimed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginBottom: 20,
                background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              +{todayBonus} ₽
            </motion.div>
          )}
        </AnimatePresence>

        {/* Claim Button */}
        {!claimed && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            style={{
              width: '100%',
              padding: '16px',
              background: canClaim
                ? 'linear-gradient(90deg, #B38728, #D4AF37, #FBF5B7, #D4AF37, #B38728)'
                : 'rgba(255,255,255,0.1)',
              backgroundSize: '200% auto',
              border: 'none',
              borderRadius: 14,
              color: canClaim ? '#09090b' : '#52525b',
              fontSize: 16,
              fontWeight: 700,
              cursor: canClaim ? 'pointer' : 'not-allowed',
              boxShadow: canClaim ? '0 0 30px rgba(212,175,55,0.4)' : 'none',
            }}
          >
            {claiming ? 'Получаем...' : canClaim ? 'Забрать бонус' : 'Приходите завтра!'}
          </motion.button>
        )}

        {claimed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              width: '100%',
              padding: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 14,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Отлично!
          </motion.button>
        )}

        {/* Tip */}
        <p style={{
          fontSize: 11,
          color: '#52525b',
          marginTop: 16,
        }}>
          Заходите каждый день для увеличения бонуса!
        </p>
      </motion.div>
    </motion.div>
  )
}
