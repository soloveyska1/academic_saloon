import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Flame, X, Check, ChevronRight } from 'lucide-react'
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

  // Current day index (0-6)
  // If can claim: streak % 7 (e.g. 0 days streak -> 0 index)
  // If claimed today: (streak - 1) % 7 (e.g. 1 day streak -> 0 index)
  const activeDayIndex = canClaim ? (streak % 7) : ((streak - 1) % 7)
  const currentBonusAmount = bonuses[activeDayIndex] || 10

  const handleClaim = async () => {
    if (!canClaim || claiming) return
    setClaiming(true)
    try {
      const claimResult = await onClaim()
      // Artificial delay for animation
      await new Promise(r => setTimeout(r, 1500))
      setResult(claimResult)
    } catch {
      setClaiming(false)
    }
  }

  // Week days for display
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
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #121214 0%, #09090b 100%)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: 32,
          padding: 32,
          textAlign: 'center',
          maxWidth: 380,
          width: '100%',
          position: 'relative',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: -50,
          left: -50,
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -50,
          right: -50,
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '50%',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="claim-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header Icon */}
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <motion.div
                  animate={{
                    boxShadow: ['0 0 20px rgba(212,175,55,0.2)', '0 0 40px rgba(212,175,55,0.5)', '0 0 20px rgba(212,175,55,0.2)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, #d4af37 0%, #b38728 100%)',
                    opacity: 0.2
                  }}
                />
                <motion.div
                  animate={claiming ? { rotate: 360 } : { y: [-5, 5, -5] }}
                  transition={claiming ? { duration: 1, repeat: Infinity, ease: 'linear' } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Gift size={48} color="#d4af37" strokeWidth={1.5} />
                </motion.div>
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
                  const dayLabel = weekDays[index % 7]
                  // State Logic:
                  // Passed: index < activeDayIndex (or if !canClaim and index == active)
                  // Active: index == activeDayIndex && canClaim
                  // Locked: index > activeDayIndex

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
                        height: 48, // Taller boxes
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

                        {state === 'active' && (
                          <motion.div
                            layoutId="active-glow"
                            style={{
                              position: 'absolute',
                              inset: -2,
                              border: '2px solid #d4af37',
                              borderRadius: 13,
                              opacity: 0.5
                            }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
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

              {/* Main Reward Display */}
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
                <div style={{ fontSize: 13, color: '#22c55e', marginTop: 4 }}>
                  Шанс выигрыша: 100%
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClaim}
                disabled={!canClaim || claiming}
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
                {claiming ? (
                  <>Крутим...</>
                ) : canClaim ? (
                  <>Испытать удачу <ChevronRight size={18} /></>
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
              key="success-state"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ paddingTop: 20, paddingBottom: 20 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ type: 'spring', delay: 0.2 }}
                style={{
                  width: 100,
                  height: 100,
                  margin: '0 auto 24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 50px rgba(34,197,94,0.4)'
                }}
              >
                <Check size={50} color="#fff" strokeWidth={4} />
              </motion.div>

              <h2 style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#fff',
                marginBottom: 8,
                fontFamily: "'Cinzel', serif"
              }}>
                Отлично!
              </h2>

              <div style={{ fontSize: 15, color: '#d4d4d8', marginBottom: 32 }}>
                Вы получили ежедневный бонус
              </div>

              <div style={{
                fontSize: 56,
                fontWeight: 800,
                color: '#22c55e',
                marginBottom: 40,
                textShadow: '0 0 30px rgba(34,197,94,0.3)'
              }}>
                +{result.bonus} ₽
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
                Супер
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
