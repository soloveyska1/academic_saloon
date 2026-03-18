import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Gift, Check, Flame } from 'lucide-react'
import {
  fetchDailyBonusInfo,
  claimDailyBonus,
  type DailyBonusInfo,
} from '../../api/userApi'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  DAILY BONUS CARD — 7-day streak calendar with premium gold design
// ═══════════════════════════════════════════════════════════════════════════

interface DailyBonusCardProps {
  dailyAvailable: boolean
  streak: number
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void
  onBonusClaimed: () => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const childVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function DailyBonusCardInner({ dailyAvailable, streak, haptic, onBonusClaimed }: DailyBonusCardProps) {
  const CARD_STYLE: React.CSSProperties = {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid var(--border-gold)',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow)',
  }

  const [info, setInfo] = useState<DailyBonusInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Local state derived from props as fallback until API data loads
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
        if (!cancelled) {
          if (import.meta.env.DEV) {
            console.warn('[DailyBonusCard] Failed to fetch info:', err)
          }
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

        // Update local info to reflect claimed state
        setInfo(prev => prev ? {
          ...prev,
          can_claim: false,
          streak: result.streak,
          cooldown_remaining: formatCooldown(result.next_claim_at),
        } : prev)

        // Notify parent to refresh user data
        onBonusClaimed()

        // Clear claimed animation after delay
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

  // Build 7-day calendar from bonuses array
  const bonuses = info?.bonuses || [10, 15, 20, 25, 30, 40, 50]
  const streakDay = currentStreak % 7 // 0-indexed position in current cycle

  return (
    <div className={s.dailyBonusWrapper}>
      <div className={s.sectionTitle}>ЕЖЕДНЕВНЫЙ БОНУС</div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={CARD_STYLE}
      >
        {/* Ambient glow */}
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

        {/* Streak info */}
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

        {/* 7-day streak calendar */}
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

        {/* Claim button or cooldown */}
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
                  Следующий бонус через {info?.cooldown_remaining || '...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error message */}
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

// ═══════════════════════════════════════════════════════════════════════════
//  DAY CIRCLE — Individual day in the 7-day streak calendar
// ═══════════════════════════════════════════════════════════════════════════

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
      {/* Circle */}
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

      {/* Bonus amount label */}
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

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
