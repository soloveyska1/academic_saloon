import { memo, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Crown, QrCode, Send, Gift, Award, Flame, Users, Star, Zap } from 'lucide-react'
import { PromoCodeSection } from '../ui/PromoCodeSection'
import { formatMoney } from '../../lib/utils'

interface Rank {
  name: string
  emoji: string
  cashback: number
  progress: number
  next_rank: string | null
  spent_to_next: number
  is_max: boolean
}

interface LoungeVaultProps {
  rank: Rank
  bonusBalance?: number
  referralCode: string
  referralsCount: number
  referralEarnings: number
  ordersCount: number
  totalSpent: number
  dailyStreak: number
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare: () => void
}

/* ─── Achievement / Milestone definitions ─── */
interface Achievement {
  id: string
  icon: typeof Award
  label: string
  description: string
  unlocked: boolean
  progress?: number // 0-1
}

function useAchievements(
  ordersCount: number,
  totalSpent: number,
  referralsCount: number,
  dailyStreak: number,
  isMaxRank: boolean,
): Achievement[] {
  return useMemo(() => [
    {
      id: 'first',
      icon: Star,
      label: 'Дебют',
      description: 'Первый заказ',
      unlocked: ordersCount >= 1,
      progress: Math.min(1, ordersCount / 1),
    },
    {
      id: 'five',
      icon: Zap,
      label: 'Завсегдатай',
      description: '5 заказов',
      unlocked: ordersCount >= 5,
      progress: Math.min(1, ordersCount / 5),
    },
    {
      id: 'referrer',
      icon: Users,
      label: 'Амбассадор',
      description: 'Пригласить друга',
      unlocked: referralsCount >= 1,
      progress: Math.min(1, referralsCount / 1),
    },
    {
      id: 'streak',
      icon: Flame,
      label: 'Марафонец',
      description: 'Серия 7 дней',
      unlocked: dailyStreak >= 7,
      progress: Math.min(1, dailyStreak / 7),
    },
    {
      id: 'whale',
      icon: Crown,
      label: 'Патрон',
      description: 'Потрачено 10K₽',
      unlocked: totalSpent >= 10000,
      progress: Math.min(1, totalSpent / 10000),
    },
    {
      id: 'max',
      icon: Award,
      label: 'Легенда',
      description: 'Высший ранг',
      unlocked: isMaxRank,
      progress: isMaxRank ? 1 : 0,
    },
  ], [ordersCount, totalSpent, referralsCount, dailyStreak, isMaxRank])
}

/* ─── Formatters for locked progress ─── */
function formatProgress(progress: number | undefined, description: string): string {
  if (progress === undefined) return ''
  // Extract numbers from description to show "X/Y" style
  const match = description.match(/(\d+)/)
  if (match) {
    const target = parseInt(match[1], 10)
    const current = Math.round(progress * target)
    return `${current}/${target}`
  }
  return `${Math.round(progress * 100)}%`
}

/* ─── Premium Achievement badge component ─── */
const AchievementBadge = memo(function AchievementBadge({
  achievement,
  index,
}: {
  achievement: Achievement
  index: number
}) {
  const Icon = achievement.icon
  const unlocked = achievement.unlocked
  const [showTooltip, setShowTooltip] = useState(false)

  const handleTap = useCallback(() => {
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.16 + index * 0.06,
        type: 'spring',
        stiffness: 160,
        damping: 22,
      }}
      whileTap={{ scale: 0.95 }}
      onClick={handleTap}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        position: 'relative',
        padding: '10px 4px 8px',
        borderRadius: 10,
        background: unlocked
          ? 'rgba(212,175,55,0.04)'
          : 'rgba(255,255,255,0.01)',
        border: `1px solid ${unlocked ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.03)'}`,
      }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 6,
              padding: '5px 10px',
              borderRadius: 6,
              background: 'rgba(30,27,20,0.97)',
              border: '1px solid rgba(212,175,55,0.18)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
              zIndex: 20,
              fontSize: 11,
              fontWeight: 600,
              color: unlocked ? 'var(--gold-300)' : 'var(--text-secondary)',
            }}
          >
            {achievement.description}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon container */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: unlocked
            ? 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(183,142,38,0.10))'
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${unlocked ? 'rgba(212,175,55,0.28)' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: unlocked
            ? '0 0 16px rgba(212,175,55,0.12), 0 2px 8px rgba(0,0,0,0.2)'
            : 'none',
        }}
      >
        {/* Animated glow ring for unlocked (SVG) */}
        {unlocked && (
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            <motion.circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="rgba(212,175,55,0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
              transition={{
                pathLength: { delay: 0.3 + index * 0.06, duration: 0.8, ease: 'easeOut' },
                opacity: { delay: 0.3 + index * 0.06, duration: 1.2, ease: 'easeOut' },
              }}
            />
          </svg>
        )}

        {/* Gold shimmer sweep for unlocked */}
        {unlocked && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              delay: 0.5 + index * 0.06,
              duration: 0.7,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
              pointerEvents: 'none',
            }}
          />
        )}

        <Icon
          size={22}
          strokeWidth={1.7}
          style={{
            color: unlocked ? 'var(--gold-400)' : 'rgba(255,255,255,0.15)',
            filter: unlocked ? 'drop-shadow(0 1px 3px rgba(212,175,55,0.3))' : 'none',
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Progress bar at bottom for locked */}
        {!unlocked && achievement.progress !== undefined && achievement.progress > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'rgba(212,175,55,0.10)',
              borderRadius: '0 0 2px 2px',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress * 100}%` }}
              transition={{
                delay: 0.3 + index * 0.06,
                type: 'spring',
                stiffness: 100,
                damping: 20,
              }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.7))',
                borderRadius: '0 0 2px 2px',
              }}
            />
          </div>
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: unlocked ? 11 : 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: unlocked ? 'var(--gold-300)' : 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          maxWidth: 80,
          lineHeight: 1.2,
        }}
      >
        {achievement.label}
      </span>

      {/* Description or progress */}
      {unlocked ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 80,
          }}
        >
          {achievement.description}
        </span>
      ) : (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.35)',
            textAlign: 'center',
            letterSpacing: '0.04em',
          }}
        >
          {formatProgress(achievement.progress, achievement.description)}
        </span>
      )}
    </motion.div>
  )
})

export const LoungeVault = memo(function LoungeVault({
  rank,
  // bonusBalance no longer displayed (shown in HomeHeader)
  referralCode,
  referralsCount,
  referralEarnings,
  ordersCount,
  totalSpent,
  dailyStreak,
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
}: LoungeVaultProps) {
  const achievements = useAchievements(ordersCount, totalSpent, referralsCount, dailyStreak, rank.is_max)
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const overallProgress = unlockedCount / achievements.length
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20, display: 'grid', gap: 6 }}
    >
      {/* ═══ Card B — Achievements (premium collection grid) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{
          padding: 20,
          borderRadius: 12,
          background: 'rgba(20,18,14,0.95)',
          border: '1px solid rgba(212,175,55,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gold orb top-right */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Top shine line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold-400)',
            }}
          >
            ДОСТИЖЕНИЯ
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ color: 'var(--gold-300)' }}>{unlockedCount}</span>
            <span style={{ color: 'var(--text-muted)' }}> из </span>
            <span style={{ color: 'var(--gold-300)' }}>{achievements.length}</span>
          </span>
        </motion.div>

        {/* Overall progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            width: '100%',
            height: 3,
            borderRadius: 2,
            background: 'rgba(212,175,55,0.08)',
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress * 100}%` }}
            transition={{
              delay: 0.25,
              type: 'spring',
              stiffness: 80,
              damping: 18,
            }}
            style={{
              height: '100%',
              borderRadius: 2,
              background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.8))',
            }}
          />
        </motion.div>

        {/* 3-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {achievements.map((a, i) => (
            <AchievementBadge key={a.id} achievement={a} index={i} />
          ))}
        </div>
      </motion.div>

      {/* ═══ Card C — Referral (LIGHT visual weight) ═══ */}
      <div
        className="glass-card"
        style={{
          padding: 16,
          borderRadius: 12,
          background: 'rgba(20,18,14,0.95)',
          border: '1px solid rgba(212,175,55,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Gift size={14} color="var(--gold-400)" strokeWidth={1.9} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Приглашения
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.35,
                color: 'var(--text-secondary)',
              }}
            >
              Рекомендуйте Салон — получайте привилегии
              {(referralsCount > 0 || referralEarnings > 0) && (
                <span style={{ color: 'var(--gold-300)', marginLeft: 6, fontSize: 11 }}>
                  {referralsCount > 0 && `${referralsCount} ${referralsCount === 1 ? 'друг' : referralsCount < 5 ? 'друга' : 'друзей'}`}
                  {referralsCount > 0 && referralEarnings > 0 && ' · '}
                  {referralEarnings > 0 && `${formatMoney(referralEarnings)} заработано`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Referral code + action buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {/* Code button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onCopy}
            style={{
              minWidth: 0,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid rgba(212,175,55,0.14)',
              background: 'rgba(212,175,55,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--gold-300)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {referralCode}
            </span>
            {copied ? (
              <Check size={14} color="var(--success-text)" strokeWidth={2} />
            ) : (
              <Copy size={14} color="var(--text-secondary)" strokeWidth={2} />
            )}
          </motion.button>

          {/* Share button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onTelegramShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <Send size={15} strokeWidth={1.8} />
          </motion.button>

          {/* QR button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onShowQR}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <QrCode size={16} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* PromoCode section — collapsible, separated */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: 10,
          }}
        >
          <PromoCodeSection variant="full" collapsible defaultExpanded={false} />
        </div>
      </div>
    </motion.section>
  )
})
