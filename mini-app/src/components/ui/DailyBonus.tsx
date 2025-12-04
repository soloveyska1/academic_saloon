import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Flame, X, Frown, PartyPopper } from 'lucide-react'
import { DailyBonusClaimResult } from '../../api/userApi'

interface Props {
  streak: number
  canClaim: boolean
  bonuses: number[]
  cooldownRemaining?: string | null
  onClaim: () => Promise<DailyBonusClaimResult>
  onClose: () => void
}

export function DailyBonusModal({ streak, canClaim, bonuses, cooldownRemaining, onClaim, onClose }: Props) {
  const [claiming, setClaiming] = useState(false)
  const [result, setResult] = useState<DailyBonusClaimResult | null>(null)

  const handleClaim = async () => {
    if (!canClaim || claiming) return
    setClaiming(true)
    try {
      const claimResult = await onClaim()
      setResult(claimResult)
    } catch (e) {
      console.error(e)
    }
    setClaiming(false)
  }

  // Current day bonus (1-7)
  const currentDayIndex = canClaim ? (streak % 7) : ((streak - 1) % 7)
  const todayBonus = bonuses[currentDayIndex] || 10

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
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          background: 'var(--modal-bg)',
          border: '1px solid var(--border-gold)',
          borderRadius: 24,
          padding: 24,
          textAlign: 'center',
          maxWidth: 340,
          width: '100%',
          position: 'relative',
          boxShadow: 'var(--modal-shadow)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: 8,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">
          {result ? (
            // Result state (won or lost)
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Result Icon */}
              <motion.div
                animate={result.won ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : { scale: [1, 0.95, 1] }}
                transition={{ duration: 0.5, repeat: result.won ? 3 : 0 }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: result.won
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'var(--bg-glass)',
                  border: result.won ? 'none' : '1px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: result.won ? '0 0 40px rgba(34,197,94,0.4)' : 'none',
                }}
              >
                {result.won ? (
                  <PartyPopper size={40} color="#fff" />
                ) : (
                  <Frown size={40} color="var(--text-muted)" />
                )}
              </motion.div>

              <h2 style={{
                fontSize: 22,
                fontWeight: 700,
                color: result.won ? 'var(--success-text)' : 'var(--text-main)',
                marginBottom: 12,
                fontFamily: "var(--font-serif)",
              }}>
                {result.won ? 'Поздравляем!' : 'Не повезло'}
              </h2>

              {result.won ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    color: 'var(--success-text)',
                    marginBottom: 16,
                    fontFamily: "var(--font-serif)",
                    textShadow: '0 0 20px rgba(34,197,94,0.3)',
                  }}
                >
                  +{result.bonus} ₽
                </motion.div>
              ) : (
                <p style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}>
                  Попробуй снова завтра!<br/>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Шанс выигрыша: 50%
                  </span>
                </p>
              )}

              {/* Streak info */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                borderRadius: 100,
                marginBottom: 20,
              }}>
                <Flame size={16} color="#ef4444" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  День {result.streak} из 7
                </span>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: result.won ? 'var(--gold-metallic)' : 'var(--bg-glass)',
                  border: result.won ? 'none' : '1px solid var(--border-default)',
                  borderRadius: 14,
                  color: result.won ? '#09090b' : 'var(--text-main)',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: result.won ? '0 0 25px rgba(212,175,55,0.3)' : 'none',
                }}
              >
                {result.won ? 'Отлично!' : 'Понятно'}
              </motion.button>
            </motion.div>
          ) : (
            // Initial state (can claim or cooldown)
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Icon */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
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
                color: 'var(--text-main)',
                marginBottom: 8,
                fontFamily: "var(--font-serif)",
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
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Серия: <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}</span>
                </span>
              </div>

              {/* Week Progress */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 24,
                padding: '0 4px',
              }}>
                {weekDays.map((day, i) => {
                  const dayNum = i + 1
                  const dayBonus = bonuses[i] || 10
                  const isCompleted = dayNum < (canClaim ? streak + 1 : streak + 1) && dayNum <= streak
                  const isCurrent = dayNum === (canClaim ? (streak % 7) + 1 : ((streak - 1) % 7) + 1)

                  return (
                    <div key={day} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isCompleted
                          ? 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))'
                          : 'var(--bg-glass)',
                        border: isCurrent && canClaim
                          ? '2px solid var(--gold-400)'
                          : isCompleted
                            ? '1px solid var(--border-gold)'
                            : '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 4px',
                        boxShadow: isCurrent && canClaim ? '0 0 15px rgba(212,175,55,0.3)' : 'none',
                        position: 'relative',
                      }}>
                        {isCompleted ? (
                          <span style={{ fontSize: 14, color: 'var(--gold-400)' }}>✓</span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{dayBonus}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{day}</span>
                    </div>
                  )
                })}
              </div>

              {/* Bonus Amount */}
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                marginBottom: 8,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                +{todayBonus} ₽
              </div>

              <p style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 20,
              }}>
                Шанс выигрыша: 50%
              </p>

              {/* Claim Button */}
              <motion.button
                whileTap={{ scale: canClaim ? 0.95 : 1 }}
                onClick={handleClaim}
                disabled={!canClaim || claiming}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: canClaim
                    ? 'linear-gradient(90deg, #B38728, #D4AF37, #FBF5B7, #D4AF37, #B38728)'
                    : 'var(--bg-glass)',
                  backgroundSize: '200% auto',
                  border: canClaim ? 'none' : '1px solid var(--border-default)',
                  borderRadius: 14,
                  color: canClaim ? '#09090b' : 'var(--text-muted)',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: canClaim ? 'pointer' : 'not-allowed',
                  boxShadow: canClaim ? '0 0 30px rgba(212,175,55,0.4)' : 'none',
                }}
              >
                {claiming ? 'Крутим...' : canClaim ? 'Испытать удачу!' : `Через ${cooldownRemaining || '24ч'}`}
              </motion.button>

              {/* Tip */}
              <p style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 16,
              }}>
                Заходите каждый день для увеличения бонуса!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
