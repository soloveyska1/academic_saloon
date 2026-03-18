import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Gift, Check, Flame } from 'lucide-react'
import {
  fetchDailyBonusInfo,
  claimDailyBonus,
  type DailyBonusInfo,
} from '../../api/userApi'
import { useThemeValue } from '../../contexts/ThemeContext'
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
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  const GOLD = isDark ? '#d4af37' : '#9e7a1a'
  const GOLD_LIGHT = isDark ? '#E8D5A3' : '#7d5c12'
  const GOLD_DIM = isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(158, 122, 26, 0.3)'

  const CARD_STYLE: React.CSSProperties = {
    background: isDark ? 'rgba(20, 20, 23, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: isDark
      ? '1px solid rgba(212, 175, 55, 0.15)'
      : '1px solid rgba(120, 85, 40, 0.10)',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: isDark ? 'none' : '0 2px 12px rgba(120, 85, 40, 0.06)',
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
            background: isDark
              ? 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(180, 142, 38, 0.08) 0%, transparent 70%)',
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
              <Flame size={16} color={GOLD} style={{ flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: GOLD_LIGHT,
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
                    color: isDark ? 'rgba(228, 213, 163, 0.4)' : 'rgba(120, 85, 40, 0.45)',
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
                  fontSize: 24,
                  fontWeight: 800,
                  color: GOLD,
                  letterSpacing: '-0.02em',
                }}>
                  +{claimedAmount} ₽
                </div>
                <div style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isDark ? 'rgba(228, 213, 163, 0.6)' : 'rgba(120, 85, 40, 0.55)',
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
                  borderRadius: 14,
                  border: 'none',
                  cursor: claiming ? 'not-allowed' : 'pointer',
                  background: claiming
                    ? (isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(158, 122, 26, 0.12)')
                    : isDark
                      ? 'linear-gradient(135deg, #d4af37 0%, #C9A436 50%, #B8942F 100%)'
                      : 'linear-gradient(135deg, #b8942f 0%, #9e7a1a 50%, #8a6b15 100%)',
                  color: claiming
                    ? GOLD_LIGHT
                    : isDark ? '#09090b' : '#FFFFFF',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: claiming
                    ? 'none'
                    : isDark
                      ? '0 4px 16px rgba(212, 175, 55, 0.25)'
                      : '0 4px 16px rgba(120, 85, 40, 0.18)',
                  transition: 'box-shadow 0.2s ease',
                  opacity: claiming ? 0.7 : 1,
                }}
              >
                {claiming ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
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
                <Clock size={16} color={isDark ? 'rgba(228, 213, 163, 0.45)' : 'rgba(120, 85, 40, 0.4)'} />
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: isDark ? 'rgba(228, 213, 163, 0.5)' : 'rgba(120, 85, 40, 0.5)',
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
                color: '#f87171',
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
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  const GOLD = isDark ? '#d4af37' : '#9e7a1a'
  const GOLD_LIGHT = isDark ? '#E8D5A3' : '#7d5c12'
  const GOLD_DIM = isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(158, 122, 26, 0.3)'

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
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(120, 85, 40, 0.04)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.06)'
            : '1px solid rgba(120, 85, 40, 0.06)',
        }} />
        <div style={{
          width: 20,
          height: 8,
          borderRadius: 4,
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(120, 85, 40, 0.04)',
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
        transition={{ delay: day * 0.04, duration: 0.3 }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          ...(isClaimed ? {
            background: isDark
              ? 'linear-gradient(135deg, #d4af37 0%, #C9A436 100%)'
              : 'linear-gradient(135deg, #b8942f 0%, #9e7a1a 100%)',
            boxShadow: isDark
              ? '0 2px 8px rgba(212, 175, 55, 0.3)'
              : '0 2px 8px rgba(120, 85, 40, 0.18)',
          } : isCurrent ? {
            background: isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(180, 142, 38, 0.08)',
            border: `2px solid ${GOLD}`,
            boxShadow: isDark
              ? '0 0 12px rgba(212, 175, 55, 0.25), 0 0 24px rgba(212, 175, 55, 0.1)'
              : '0 0 12px rgba(158, 122, 26, 0.15), 0 0 24px rgba(158, 122, 26, 0.06)',
          } : {
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(120, 85, 40, 0.04)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(120, 85, 40, 0.08)',
          }),
        }}
      >
        {/* Pulsing glow for current day */}
        {isCurrent && (
          <motion.div
            animate={{
              boxShadow: isDark
                ? [
                    '0 0 8px rgba(212, 175, 55, 0.2)',
                    '0 0 20px rgba(212, 175, 55, 0.4)',
                    '0 0 8px rgba(212, 175, 55, 0.2)',
                  ]
                : [
                    '0 0 8px rgba(158, 122, 26, 0.12)',
                    '0 0 20px rgba(158, 122, 26, 0.25)',
                    '0 0 8px rgba(158, 122, 26, 0.12)',
                  ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        )}

        {isClaimed ? (
          <Check size={18} color={isDark ? '#09090b' : '#FFFFFF'} strokeWidth={3} />
        ) : (
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: isCurrent ? 14 : 12,
            fontWeight: isCurrent ? 700 : 600,
            color: isCurrent
              ? GOLD
              : (isFuture
                ? (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(120, 113, 108, 0.5)')
                : GOLD_LIGHT),
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
          ? GOLD_DIM
          : (isCurrent
            ? GOLD_LIGHT
            : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(120, 113, 108, 0.5)')),
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
