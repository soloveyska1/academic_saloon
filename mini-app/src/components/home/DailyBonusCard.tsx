import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Gift, Check, Flame } from 'lucide-react'
import {
  fetchDailyBonusInfo,
  claimDailyBonus,
  type DailyBonusInfo,
} from '../../api/userApi'
import s from '../../pages/HomePage.module.css'

interface DailyBonusCardProps {
  dailyAvailable: boolean
  streak: number
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void
  onBonusClaimed: () => void
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
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  }

  const compactCardStyle: React.CSSProperties = {
    background: embedded
      ? 'rgba(255,255,255,0.03)'
      : 'linear-gradient(160deg, rgba(27, 22, 12, 0.94) 0%, rgba(12, 12, 12, 0.98) 46%, rgba(9, 9, 10, 1) 100%)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    border: embedded ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(212, 175, 55, 0.12)',
    borderRadius: embedded ? 22 : 24,
    padding: embedded ? 16 : 18,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: embedded ? 'none' : '0 24px 40px -34px rgba(0, 0, 0, 0.78)',
  }

  const [info, setInfo] = useState<DailyBonusInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canClaim = info ? info.can_claim : dailyAvailable
  const currentStreak = info ? info.streak : streak

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
        } : prev)

        onBonusClaimed()
        setTimeout(() => setClaimedAmount(null), 3000)
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={compactCardStyle}
      >
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
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(212, 175, 55, 0.72)',
                  marginBottom: 8,
                }}
              >
                Ежедневный бонус
              </div>

              <AnimatePresence mode="wait">
                {claimedAmount !== null ? (
                  <motion.div
                    key="compact-claimed"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display, 'Playfair Display', serif)",
                        fontSize: 28,
                        lineHeight: 0.95,
                        letterSpacing: '-0.05em',
                        color: 'var(--gold-300)',
                        marginBottom: 6,
                      }}
                    >
                      +{claimedAmount} ₽
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      Бонус уже зачислен. Новое начисление откроется по следующему таймеру.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="compact-default"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display, 'Playfair Display', serif)",
                          fontSize: 30,
                          lineHeight: 0.95,
                          letterSpacing: '-0.05em',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {Math.max(0, currentStreak)}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {currentStreak === 1 ? 'день подряд' : 'дня подряд'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {canClaim
                        ? `Сегодня можно забрать ещё ${nextClaimBonus} ₽ и продолжить серию.`
                        : `Следующее начисление откроется через ${cooldownText}.`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ flexShrink: 0 }}>
              {canClaim ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleClaim}
                  disabled={claiming}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: 'none',
                    background: claiming ? 'rgba(212,175,55,0.16)' : 'var(--gold-metallic)',
                    color: claiming ? 'var(--gold-200)' : 'var(--text-on-gold)',
                    cursor: claiming ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    boxShadow: claiming ? 'none' : '0 16px 26px -22px rgba(212,175,55,0.72)',
                    opacity: claiming ? 0.7 : 1,
                  }}
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
                      Забрать
                    </>
                  )}
                </motion.button>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 12px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Clock size={15} color="var(--gold-300)" />
                  {cooldownText}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {bonuses.map((bonus, index) => {
              const isClaimed = index < streakDay
              const isCurrent = index === streakDay && canClaim
              const isLocked = index > streakDay || (index === streakDay && !canClaim && !isClaimed)

              return (
                <div
                  key={`${bonus}-${index}`}
                  style={{
                    padding: '10px 6px 8px',
                    borderRadius: 16,
                    textAlign: 'center',
                    background: isClaimed
                      ? 'linear-gradient(180deg, rgba(212,175,55,0.96) 0%, rgba(180,141,36,0.88) 100%)'
                      : isCurrent
                        ? 'rgba(212,175,55,0.10)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isClaimed ? 'rgba(212,175,55,0.28)' : isCurrent ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: isCurrent ? '0 16px 24px -24px rgba(212,175,55,0.5)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isClaimed ? 'var(--text-on-gold)' : isCurrent ? 'var(--gold-200)' : 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isClaimed ? 'var(--text-on-gold)' : isLocked ? 'var(--text-secondary)' : 'var(--text-primary)',
                      lineHeight: 1.15,
                    }}
                  >
                    +{bonus}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--error-text)',
                lineHeight: 1.35,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </motion.div>
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
                gap: 6,
                marginBottom: 16,
              }}
            >
              <Flame size={16} color="var(--gold-400)" style={{ flexShrink: 0 }} />
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
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    marginLeft: 4,
                  }}>
                    &middot; {nextMilestone.day} дн. = +{nextMilestone.bonus} ₽
                  </span>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={childVariants}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 6,
            marginBottom: 20,
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
                  fontWeight: 800,
                  color: 'var(--gold-400)',
                  letterSpacing: '-0.02em',
                }}>
                  +{claimedAmount} ₽
                </div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
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
                  borderRadius: 16,
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
                    Забрать бонус
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
                fontWeight: 500,
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
        {bonus}₽
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
