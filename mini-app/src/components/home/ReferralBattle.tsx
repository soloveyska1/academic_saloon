import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, Users, TrendingUp, Medal, Award, Trophy } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { Reveal } from '../ui/StaggerReveal'

interface ReferralBattleProps {
  userReferrals: number
  userPosition?: number
  haptic?: (type: 'light' | 'medium' | 'heavy') => void
}

// Simulated leaderboard (would come from API in production)
const LEADERBOARD = [
  { name: 'Анна М.', refs: 12, reward: '2000₽' },
  { name: 'Дмитрий К.', refs: 9, reward: '1000₽' },
  { name: 'Мария С.', refs: 7, reward: '500₽' },
  { name: 'Алексей П.', refs: 5, reward: '' },
  { name: 'Екатерина В.', refs: 3, reward: '' },
]

const MEDAL_ICONS: LucideIcon[] = [Crown, Medal, Award]
const MEDAL_COLORS = ['var(--gold-400)', 'var(--text-secondary)', 'rgba(180,130,70,0.7)']

export const ReferralBattle = memo(function ReferralBattle({
  userReferrals,
}: ReferralBattleProps) {
  const userRank = useMemo(() => {
    const sorted = [...LEADERBOARD].sort((a, b) => b.refs - a.refs)
    // Find where user would rank (user beats those with fewer refs)
    let pos = sorted.length + 1
    for (let i = 0; i < sorted.length; i++) {
      if (userReferrals >= sorted[i].refs) {
        pos = i + 1
        break
      }
    }
    return pos
  }, [userReferrals])

  const daysLeft = useMemo(() => {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  return (
    <Reveal animation="slide" direction="up">
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(27,22,12,0.94) 0%, rgba(12,12,12,0.98) 50%, rgba(9,9,10,1) 100%)',
        border: '1px solid rgba(212,175,55,0.12)',
        padding: '18px 16px',
        position: 'relative',
        boxShadow: 'var(--card-shadow)',
      }}>
        {/* Glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={13} strokeWidth={2} color="rgba(212,175,55,0.55)" />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.55)',
              }}>
                Реферальный баттл
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-default)',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>
                {daysLeft} дн. до конца
              </span>
            </div>
          </div>

          {/* Your position */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--gold-glass-subtle)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--gold-glass-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--gold-300)',
            }}>
              {userRank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-200)' }}>
                Ваша позиция
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                {userReferrals} {userReferrals === 1 ? 'реферал' : userReferrals >= 2 && userReferrals <= 4 ? 'реферала' : 'рефералов'}
              </div>
            </div>
            <TrendingUp size={14} strokeWidth={2} color="var(--gold-400)" />
          </div>

          {/* Leaderboard */}
          <div style={{ display: 'grid', gap: 4 }}>
            {LEADERBOARD.slice(0, 3).map((user, i) => {
              const MedalIcon = MEDAL_ICONS[i] || Medal
              const medalColor = MEDAL_COLORS[i] || 'var(--text-muted)'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: i === 0 ? 'rgba(212,175,55,0.04)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 22,
                    display: 'flex',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <MedalIcon size={15} strokeWidth={2} color={medalColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? 'var(--gold-200)' : 'var(--text-primary)',
                    }}>
                      {user.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={10} strokeWidth={2} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {user.refs}
                    </span>
                  </div>
                  {user.reward && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--gold-300)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--gold-glass-subtle)',
                    }}>
                      {user.reward}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Prize info */}
          <div style={{
            marginTop: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Trophy size={12} strokeWidth={2} color="rgba(212,175,55,0.4)" />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.4,
            }}>
              Топ-3 за месяц: 2000₽, 1000₽ и 500₽ бонусов
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  )
})
