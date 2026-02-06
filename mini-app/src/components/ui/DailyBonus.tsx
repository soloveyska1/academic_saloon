import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Flame, Check, ChevronRight } from 'lucide-react'
import { DailyBonusClaimResult } from '../../api/userApi'
import { CenteredModalWrapper } from '../modals/shared'

interface Props {
  isOpen: boolean
  streak: number
  canClaim: boolean
  bonuses: number[]
  cooldownRemaining?: string | null
  onClaim: () => Promise<DailyBonusClaimResult>
  onClose: () => void
}

export function DailyBonusModal({ isOpen, streak, canClaim, bonuses, cooldownRemaining, onClaim, onClose }: Props) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<DailyBonusClaimResult | null>(null)

  // Calculate dynamic week days based on today
  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const today = new Date()
  const todayDayIndex = today.getDay() // 0 = Sunday, ...

  // Active day calculation
  const activeDayIndex = canClaim ? (streak % 7) : ((streak - 1) % 7)
  const currentBonusAmount = bonuses[activeDayIndex] || 10

  const getDayLabel = (index: number) => {
    const offset = index - activeDayIndex
    let dayIndex = (todayDayIndex + offset) % 7
    if (dayIndex < 0) dayIndex += 7
    return weekDays[dayIndex]
  }

  const handleClaim = async () => {
    if (!canClaim || isClaiming) return
    setIsClaiming(true)
    try {
      const result = await onClaim()
      setClaimResult(result)
    } catch (e) {
      console.error("Claim failed", e)
      setIsClaiming(false)
    }
  }

  return (
    <CenteredModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="daily-bonus-modal"
      title="Ежедневный бонус"
      accentColor="#d4af37"
      hideCloseButton
    >
      <div style={{
        padding: 32,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: -50,
          left: -50,
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <AnimatePresence mode="wait">
          {!claimResult ? (
            <motion.div
              key="claim-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Main Icon */}
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #d4af37 0%, #b38728 100%)',
                  opacity: 0.2,
                  boxShadow: '0 0 30px rgba(212,175,55,0.3)'
                }} />
                <Gift size={48} color="#d4af37" strokeWidth={1.5} />
              </div>

              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 8,
                fontFamily: "'Cinzel', serif",
                letterSpacing: '0.02em'
              }}>
                Ежедневный бонус
              </h2>

              {/* Streak Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 100,
                marginBottom: 32
              }}>
                <Flame size={14} color="#ef4444" fill="#ef4444" />
                <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>
                  Серия: {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
                </span>
              </div>

              {/* Calendar Strip */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 4,
                marginBottom: 32
              }}>
                {bonuses.map((amount, index) => {
                  const dayLabel = getDayLabel(index)
                  let state: 'passed' | 'active' | 'locked' = 'locked'

                  if (canClaim) {
                    if (index < activeDayIndex) state = 'passed'
                    else if (index === activeDayIndex) state = 'active'
                  } else {
                    if (index <= activeDayIndex) state = 'passed'
                  }

                  return (
                    <div key={index} style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <div style={{
                        width: 40,
                        height: 48,
                        borderRadius: 12,
                        background: state === 'active'
                          ? 'rgba(212,175,55,0.1)'
                          : state === 'passed'
                            ? 'linear-gradient(135deg, #d4af37 0%, #b38728 100%)'
                            : 'rgba(255,255,255,0.03)',
                        border: state === 'active'
                          ? '1px solid #d4af37'
                          : '1px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: state === 'active' ? '0 0 15px rgba(212,175,55,0.2)' : 'none'
                      }}>
                        {state === 'passed' && <Check size={16} color="#09090b" strokeWidth={3} />}
                        {state === 'active' && <span style={{ fontSize: 13, fontWeight: 700, color: '#d4af37' }}>{amount}</span>}
                        {state === 'locked' && <span style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>{amount}</span>}
                      </div>
                      <span style={{
                        fontSize: 10,
                        color: state === 'active' ? '#d4af37' : '#71717a',
                        fontWeight: state === 'active' ? 600 : 400
                      }}>
                        {dayLabel}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Reward Info */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 4 }}>Награда сегодня</div>
                <div style={{
                  fontSize: 48,
                  fontWeight: 800,
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #d4af37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 10px 20px rgba(0,0,0,0.5)'
                }}>
                  +{currentBonusAmount} ₽
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={!canClaim || isClaiming}
                style={{
                  width: '100%',
                  height: 56,
                  background: canClaim
                    ? 'linear-gradient(90deg, #d4af37 0%, #fcd34d 50%, #d4af37 100%)'
                    : 'rgba(255,255,255,0.05)',
                  backgroundSize: '200% auto',
                  border: 'none',
                  borderRadius: 16,
                  color: canClaim ? '#09090b' : '#52525b',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: canClaim ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: canClaim ? '0 10px 25px rgba(212,175,55,0.25)' : 'none',
                }}
                animate={canClaim ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                {isClaiming ? (
                  <>Забираем...</>
                ) : canClaim ? (
                  <>Забрать бонус <ChevronRight size={18} /></>
                ) : (
                  <>Доступно через {cooldownRemaining || '24ч'}</>
                )}
              </motion.button>

              {!canClaim && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#52525b' }}>
                  Приходите завтра, чтобы продолжить серию
                </div>
              )}

            </motion.div>
          ) : (
            <motion.div
              key="success-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ paddingTop: 20, paddingBottom: 20 }}
            >
              <div style={{
                width: 100,
                height: 100,
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 50px rgba(34,197,94,0.4)',
                border: '4px solid rgba(255,255,255,0.2)'
              }}
              >
                <Check size={50} color="#fff" strokeWidth={4} />
              </div>

              <h2 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 8,
                fontFamily: "'Cinzel', serif"
              }}>
                Получено!
              </h2>

              <div style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#22c55e',
                marginBottom: 40,
                textShadow: '0 0 30px rgba(34,197,94,0.3)'
              }}>
                +{claimResult.bonus} ₽
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                style={{
                  width: '100%',
                  height: 56,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Отлично
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CenteredModalWrapper>
  )
}
