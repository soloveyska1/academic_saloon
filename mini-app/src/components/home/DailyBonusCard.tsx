import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Gift, Check, Flame } from 'lucide-react'
import {
  fetchDailyBonusInfo,
  claimDailyBonus,
  type DailyBonusInfo,
} from '../../api/userApi'
import { useCapability } from '../../contexts/DeviceCapabilityContext'
import { ScratchCard } from '../ui/ScratchCard'
import { Confetti } from '../ui/Confetti'
import { Reveal } from '../ui/StaggerReveal'
import s from '../../pages/HomePage.module.css'

interface DailyBonusCardProps {
  dailyAvailable: boolean
  streak: number
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void
  onBonusClaimed: (claimedAmount?: number) => void
  variant?: 'full' | 'compact'
  embedded?: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const childVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function DailyBonusCardInner({
  dailyAvailable,
  streak,
  haptic,
  onBonusClaimed,
  variant = 'full',
  embedded = false,
}: DailyBonusCardProps) {
  const fullCardStyle: React.CSSProperties = {
    background: 'rgba(12, 12, 10, 0.6)',
    backdropFilter: 'blur(16px) saturate(120%)',
    WebkitBackdropFilter: 'blur(16px) saturate(120%)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  }

  const compactCardStyle: React.CSSProperties = {
    background: embedded
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(160deg, rgba(27, 22, 12, 0.94) 0%, rgba(12, 12, 12, 0.98) 46%, rgba(9, 9, 10, 1) 100%)',
    backdropFilter: 'blur(16px) saturate(120%)',
    WebkitBackdropFilter: 'blur(16px) saturate(120%)',
    border: embedded ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(212,175,55,0.12)',
    borderRadius: 12,
    padding: embedded ? 16 : 18,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: embedded ? 'none' : '0 24px 40px -34px rgba(0, 0, 0, 0.78)',
  }

  const capability = useCapability()
  const [info, setInfo] = useState<DailyBonusInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showScratchCard, setShowScratchCard] = useState(false)
  const [showGoldConfetti, setShowGoldConfetti] = useState(false)
  const claimedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (claimedTimerRef.current) {
        clearTimeout(claimedTimerRef.current)
        claimedTimerRef.current = null
      }
    }
  }, [])

  const canClaim = info ? info.can_claim : dailyAvailable
  const currentStreak = info ? info.streak : streak
  const freezeCount = info?.streak_freeze_count ?? 0
  const freezeActive = info?.streak_freeze_active ?? false
  const freezePending = info?.streak_freeze_pending ?? false

  // Flame color based on streak length
  const flameStyle: React.CSSProperties = currentStreak >= 30
    ? { flexShrink: 0, filter: 'hue-rotate(200deg) saturate(1.5)' }
    : currentStreak >= 14
      ? { flexShrink: 0, color: '#e05a1a' }
      : currentStreak >= 7
        ? { flexShrink: 0, color: '#d97706' }
        : { flexShrink: 0 }

  const streakFreezeIndicator = freezeCount > 0 ? (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        marginLeft: 'auto',
        padding: '2px 8px',
        borderRadius: 999,
        background: 'rgba(147, 197, 253, 0.08)',
        border: '1px solid rgba(147, 197, 253, 0.12)',
      }}
      title={freezePending ? 'Один пропуск уже покрыт защитой серии' : 'Один пропуск будет защищён автоматически'}
    >
      <span style={{ fontSize: 10 }}>❄️</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(147, 197, 253, 0.6)', letterSpacing: '0.02em' }}>
        {freezePending
          ? 'Пропуск сохранён'
          : freezeActive
            ? `Защита ×${freezeCount}`
            : `В запасе ×${freezeCount}`}
      </span>
    </div>
  ) : null

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchDailyBonusInfo()
        if (!cancelled) {
          setInfo(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled && import.meta.env.DEV) {
          console.warn('[DailyBonusCard] Failed to fetch info:', err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const handleClaim = useCallback(async () => {
    if (claiming || !canClaim) return

    setClaiming(true)
    setError(null)
    haptic('medium')

    try {
      const result = await claimDailyBonus()

      if (result.success) {
        haptic('success')
        setClaimedAmount(result.bonus)

        setInfo(prev => prev ? {
          ...prev,
          can_claim: false,
          streak: result.streak,
          cooldown_remaining: formatCooldown(result.next_claim_at),
          streak_freeze_count: result.streak_freeze_count,
          streak_freeze_active: result.streak_freeze_active,
          streak_freeze_pending: result.streak_freeze_pending,
        } : prev)

        onBonusClaimed(result.bonus)
        if (claimedTimerRef.current) clearTimeout(claimedTimerRef.current)
        claimedTimerRef.current = setTimeout(() => setClaimedAmount(null), 3000)
      } else {
        haptic('error')
        setError(result.message || 'Не удалось получить бонус')
      }
    } catch (err) {
      haptic('error')
      setError(err instanceof Error ? err.message : 'Ошибка при получении бонуса')
    } finally {
      setClaiming(false)
    }
  }, [claiming, canClaim, haptic, onBonusClaimed])

  const bonuses = info?.bonuses || [10, 15, 20, 25, 30, 40, 50]
  const streakDay = currentStreak % 7
  const nextClaimBonus = info?.next_bonus ?? bonuses[Math.min(streakDay, bonuses.length - 1)] ?? 0
  const cooldownText = info?.cooldown_remaining || '...'

  if (variant === 'compact') {
    const DAY_SIZE = 32
    const barProgress = streakDay > 1 ? ((streakDay - 1) / 6) * 100 : 0

    const claimBtnStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 14px',
      borderRadius: 10,
      border: 'none',
      background: claiming ? 'var(--gold-glass-medium)' : 'var(--gold-metallic)',
      color: claiming ? 'var(--gold-200)' : 'var(--text-on-gold)',
      cursor: claiming ? 'not-allowed' : 'pointer',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.02em',
      boxShadow: claiming ? 'none' : 'var(--glow-gold)',
      opacity: claiming ? 0.7 : 1,
    }

    const claimHandler = capability.tier === 3
      ? () => setShowScratchCard(true)
      : handleClaim
    const claimLabel = capability.tier === 3 ? 'Открыть приз' : 'Получить'

    return (
      <Reveal direction="up" animation="slide">
        <Confetti
          active={showGoldConfetti}
          colors={['#d4af37', '#f5d061', '#b38728', '#FCF6BA', '#fff']}
          intensity="medium"
          onComplete={() => setShowGoldConfetti(false)}
        />

        <AnimatePresence>
          {showScratchCard && (
            <ScratchCard
              prize={`Ежедневный бонус — день ${streakDay + 1}`}
              prizeAmount={nextClaimBonus}
              onReveal={() => {
                handleClaim()
                setShowGoldConfetti(true)
              }}
              onClose={() => setShowScratchCard(false)}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={compactCardStyle}
        >
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -58,
              right: -36,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.05) 32%, transparent 74%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* ── Header: eyebrow + streak/claimed + action ── */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.55)',
                  marginBottom: 8,
                }}>
                  Ежедневный бонус
                </div>

                <AnimatePresence mode="wait">
                  {claimedAmount !== null ? (
                    <motion.div
                      key="compact-claimed"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}
                    >
                      <span style={{
                        fontFamily: "var(--font-display, 'Playfair Display', serif)",
                        fontSize: 26,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        color: 'var(--gold-300)',
                      }}>
                        +{claimedAmount} ₽
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                        зачислено
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="compact-default"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Flame size={18} color="var(--gold-400)" style={flameStyle} />
                      <span style={{
                        fontFamily: "var(--font-display, 'Playfair Display', serif)",
                        fontSize: 26,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        color: 'var(--gold-200)',
                      }}>
                        {Math.max(0, currentStreak)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {currentStreak === 1 ? 'день' : currentStreak >= 2 && currentStreak <= 4 ? 'дня' : 'дней'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action: unified claim button or timer */}
              <div style={{ flexShrink: 0 }}>
                {canClaim ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={claimHandler}
                    disabled={claiming}
                    style={claimBtnStyle}
                  >
                    {claiming ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                          style={{ display: 'inline-flex' }}
                        >
                          <Gift size={15} />
                        </motion.span>
                        Получаем
                      </>
                    ) : (
                      <>
                        <Gift size={15} />
                        {claimLabel}
                      </>
                    )}
                  </motion.button>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    <Clock size={14} color="var(--gold-300)" />
                    {cooldownText}
                  </div>
                )}
              </div>
            </div>

            {/* ── Connected circular progress track ── */}
            <div style={{ position: 'relative', paddingBottom: 2 }}>
              {/* Background connecting bar */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: DAY_SIZE / 2 - 1,
                  left: DAY_SIZE / 2,
                  right: DAY_SIZE / 2,
                  height: 2,
                  borderRadius: 1,
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                {/* Gold filled portion */}
                {barProgress > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${barProgress}%`,
                    borderRadius: 1,
                    background: 'var(--gold-400)',
                    opacity: 0.5,
                    transition: 'width 0.5s var(--ease-out)',
                  }} />
                )}
              </div>

              {/* Day circles */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1,
              }}>
                {bonuses.map((bonus, index) => {
                  const isClaimed = index < streakDay
                  const isCurrent = index === streakDay && canClaim

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {/* Circle with optional pulse ring */}
                      <div style={{ position: 'relative' }}>
                        {isCurrent && (
                          <motion.div
                            animate={{
                              boxShadow: [
                                '0 0 0 0 rgba(212,175,55,0.35)',
                                '0 0 0 6px rgba(212,175,55,0)',
                              ],
                            }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                            style={{
                              position: 'absolute',
                              inset: -1,
                              borderRadius: '50%',
                            }}
                          />
                        )}
                        <div style={{
                          width: DAY_SIZE,
                          height: DAY_SIZE,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isClaimed
                            ? 'var(--gold-metallic)'
                            : isCurrent
                              ? 'var(--gold-glass-subtle)'
                              : 'var(--bg-surface)',
                          border: isClaimed
                            ? 'none'
                            : isCurrent
                              ? '2px solid var(--gold-400)'
                              : '1px solid var(--border-strong)',
                          boxShadow: isClaimed ? 'var(--glow-gold)' : 'none',
                          transition: 'all 0.3s var(--ease-out)',
                        }}>
                          {isClaimed ? (
                            <Check size={14} color="var(--text-on-gold)" strokeWidth={3} />
                          ) : (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isCurrent ? 'var(--gold-300)' : 'var(--text-muted)',
                              lineHeight: 1,
                            }}>
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bonus amount */}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isClaimed
                          ? 'var(--gold-400)'
                          : isCurrent
                            ? 'var(--gold-200)'
                            : 'var(--text-muted)',
                        opacity: isClaimed ? 0.7 : 1,
                        lineHeight: 1,
                      }}>
                        +{bonus} ₽
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--error-text)',
                lineHeight: 1.35,
              }}>
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </Reveal>
    )
  }

  return (
    <div className={s.dailyBonusWrapper}>
      <div className={s.sectionTitle}>ЕЖЕДНЕВНЫЙ БОНУС</div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={fullCardStyle}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--gold-glass-subtle) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <AnimatePresence mode="wait">
          {currentStreak > 0 && (
            <motion.div
              key="streak"
              variants={childVariants}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Flame size={16} color={currentStreak >= 30 ? 'var(--gold-400)' : currentStreak >= 14 ? '#e05a1a' : currentStreak >= 7 ? '#d97706' : 'var(--gold-400)'} style={flameStyle} />
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--gold-200)',
              }}>
                Серия: {currentStreak} дн.
              </span>
              {info?.streak_milestones && info.streak_milestones.length > 0 && (() => {
                const nextMilestone = info.streak_milestones.find(m => m.day > currentStreak)
                if (!nextMilestone) return null
                return (
                  <span style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginLeft: 4,
                  }}>
                    &middot; {nextMilestone.day} дн. = +{nextMilestone.bonus} ₽
                  </span>
                )
              })()}
              {streakFreezeIndicator}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={childVariants}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {bonuses.map((bonus, index) => {
            const isClaimed = index < streakDay
            const isCurrent = index === streakDay && canClaim
            const isFuture = index > streakDay || (index === streakDay && !canClaim && !isClaimed)

            return (
              <DayCircle
                key={index}
                day={index + 1}
                bonus={bonus}
                isClaimed={isClaimed}
                isCurrent={isCurrent}
                isFuture={isFuture && !isClaimed}
                loading={loading}
              />
            )
          })}
        </motion.div>

        <motion.div variants={childVariants}>
          <AnimatePresence mode="wait">
            {claimedAmount !== null ? (
              <motion.div
                key="claimed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  textAlign: 'center',
                  padding: '14px 0',
                }}
              >
                <div style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--gold-400)',
                  letterSpacing: '-0.02em',
                }}>
                  +{claimedAmount} ₽
                </div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}>
                  Бонус зачислен на баланс
                </div>
              </motion.div>
            ) : canClaim ? (
              <motion.button
                key="claim-btn"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClaim}
                disabled={claiming}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: claiming ? 'not-allowed' : 'pointer',
                  background: claiming
                    ? 'var(--gold-glass-medium)'
                    : 'var(--gold-metallic)',
                  color: claiming
                    ? 'var(--gold-200)'
                    : 'var(--text-on-gold)',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: claiming
                    ? 'none'
                    : 'var(--glow-gold)',
                  transition: 'box-shadow 0.2s ease',
                  opacity: claiming ? 0.7 : 1,
                }}
              >
                {claiming ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      style={{ display: 'inline-flex' }}
                    >
                      <Gift size={18} />
                    </motion.span>
                    Получаем...
                  </span>
                ) : (
                  <>
                    <Gift size={18} />
                    Получить бонус
                    {info?.next_bonus ? ` ${info.next_bonus} ₽` : ''}
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="cooldown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 0',
                }}
              >
                <Clock size={16} color="var(--text-muted)" />
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}>
                  Следующий бонус через {cooldownText}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: 8,
                fontFamily: "'Manrope', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--error-text)',
                textAlign: 'center',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

interface DayCircleProps {
  day: number
  bonus: number
  isClaimed: boolean
  isCurrent: boolean
  isFuture: boolean
  loading: boolean
}

const DayCircle = memo(function DayCircle({ day, bonus, isClaimed, isCurrent, isFuture, loading }: DayCircleProps) {
  const size = isCurrent ? 44 : 40

  if (loading) {
    return (
      <div style={{
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--bg-glass)',
          border: '1px solid var(--surface-hover)',
        }} />
        <div style={{
          width: 20,
          height: 8,
          borderRadius: 4,
          background: 'var(--bg-glass)',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      flex: '1 1 0',
      minWidth: 0,
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          ...(isClaimed ? {
            background: 'var(--gold-metallic)',
            boxShadow: 'var(--glow-gold)',
          } : isCurrent ? {
            background: 'var(--gold-glass-subtle)',
            border: '2px solid var(--gold-400)',
            boxShadow: 'var(--glow-gold)',
          } : {
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-strong)',
          }),
        }}
      >
        {isClaimed ? (
          <Check size={18} color="var(--text-on-gold)" strokeWidth={3} />
        ) : (
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: isCurrent ? 14 : 12,
            fontWeight: isCurrent ? 700 : 600,
            color: isCurrent
              ? 'var(--gold-400)'
              : (isFuture
                ? 'var(--text-muted)'
                : 'var(--gold-200)'),
            lineHeight: 1,
          }}>
            {day}
          </span>
        )}
      </motion.div>

      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: 10,
        fontWeight: 600,
        color: isClaimed
          ? 'var(--gold-glass-strong)'
          : (isCurrent
            ? 'var(--gold-200)'
            : 'var(--text-muted)'),
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        {bonus} ₽
      </span>
    </div>
  )
})

function formatCooldown(nextClaimAt: string | null): string | null {
  if (!nextClaimAt) return null

  try {
    const target = new Date(nextClaimAt).getTime()
    const now = Date.now()
    const diff = target - now

    if (diff <= 0) return null

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours} ч ${minutes} мин`
    }
    return `${minutes} мин`
  } catch {
    return null
  }
}

export const DailyBonusCard = memo(DailyBonusCardInner)
