import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Copy, Crown, QrCode, Send, Sparkles, Gift, Award, Flame, Users, Star, Zap } from 'lucide-react'
import { PromoCodeSection } from '../ui/PromoCodeSection'
import { Reveal } from '../ui/StaggerReveal'
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

/* ─── Achievement badge component ─── */
function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = achievement.icon
  const unlocked = achievement.unlocked
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        opacity: unlocked ? 1 : 0.3,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: unlocked
            ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(183,142,38,0.08))'
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${unlocked ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: unlocked ? '0 0 12px rgba(212,175,55,0.10)' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Icon
          size={18}
          strokeWidth={1.8}
          style={{
            color: unlocked ? 'var(--gold-400)' : 'rgba(255,255,255,0.20)',
          }}
        />
        {/* Progress ring for locked */}
        {!unlocked && achievement.progress !== undefined && achievement.progress > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: 'rgba(212,175,55,0.15)',
            }}
          >
            <div
              style={{
                width: `${achievement.progress * 100}%`,
                height: '100%',
                background: 'rgba(212,175,55,0.6)',
                borderRadius: 1,
              }}
            />
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: unlocked ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          maxWidth: 60,
          lineHeight: 1.2,
        }}
      >
        {achievement.label}
      </span>
    </div>
  )
}

/* ─── Squad promo card — links to /squads ─── */
const SquadPromoCard = memo(function SquadPromoCard() {
  const navigate = useNavigate()
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate('/squads')}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 12,
        background: 'rgba(20,18,14,0.95)',
        border: '1px solid rgba(212,175,55,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(183,142,38,0.08))',
          border: '1px solid rgba(212,175,55,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 20,
        }}
      >
        🪑
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Users size={13} color="var(--gold-400)" strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Столики
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(212,175,55,0.12)',
              color: 'var(--gold-300)',
            }}
          >
            Новое
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Соревнуйтесь командой и получайте бонусы
        </span>
      </div>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        ›
      </div>
    </motion.button>
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20, display: 'grid', gap: 6 }}
    >
      {/* ═══ Card A — Rank Progress (next level motivation) ═══ */}
      <Reveal animation="spring" delay={0.2}>
        <div
          className="glass-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 12,
            background:
              'linear-gradient(160deg, rgba(25, 20, 10, 0.98) 0%, rgba(12, 12, 13, 0.97) 50%, rgba(8, 8, 10, 1) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            boxShadow: '0 24px 48px -32px rgba(0,0,0,0.8)',
          }}
        >
          {/* Gold orb top-right */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -80,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 35%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top shine line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.2) 50%, transparent 90%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px' }}>
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {rank.is_max ? (
                  <Sparkles size={14} color="var(--gold-300)" strokeWidth={1.9} />
                ) : (
                  <Crown size={14} color="var(--gold-300)" strokeWidth={1.9} />
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(212, 175, 55, 0.72)',
                  }}
                >
                  {rank.is_max ? 'Максимальный уровень' : 'Следующий уровень'}
                </span>
              </div>

              {rank.is_max && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    color: 'var(--gold-300)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Sparkles size={10} strokeWidth={2} />
                  {rank.name}
                </span>
              )}
            </div>

            {rank.is_max ? (
              /* ─── Max rank: show active perks ─── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  Все привилегии активны
                </div>
                {[
                  `Кешбэк ${rank.cashback}% с каждого заказа`,
                  'Приоритетная поддержка',
                  'Эксклюзивные условия',
                ].map((perk) => (
                  <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 4, height: 4, borderRadius: 2,
                      background: 'var(--gold-400)', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {perk}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* ─── Not max rank: show progress to next ─── */
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  До ранга «{rank.next_rank}»
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 5, borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10,
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, rank.progress)}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
                    style={{
                      height: '100%', borderRadius: 999,
                      background: 'linear-gradient(90deg, rgba(212,175,55,0.9), rgba(245,225,160,0.7))',
                      boxShadow: '0 8px 16px -12px rgba(212,175,55,0.4)',
                    }}
                  />
                </div>

                {/* Bottom row: remaining + next perk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Осталось {formatMoney(rank.spent_to_next)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-300)' }}>
                    {rank.progress}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {/* ═══ Card B — Achievements (collection grid) ═══ */}
      <div
        className="glass-card"
        style={{
          padding: 18,
          borderRadius: 12,
          background: 'rgba(20,18,14,0.95)',
          border: '1px solid rgba(212,175,55,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={14} color="var(--gold-400)" strokeWidth={1.9} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Достижения
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gold-300)',
              letterSpacing: '0.06em',
            }}
          >
            {unlockedCount}/{achievements.length}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 6,
          }}
        >
          {achievements.map(a => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </div>
      </div>

      {/* ═══ Card B2 — Squads / Столики (team competition) ═══ */}
      <SquadPromoCard />

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
