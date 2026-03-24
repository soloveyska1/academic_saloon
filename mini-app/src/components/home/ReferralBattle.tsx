import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, Users, TrendingUp } from 'lucide-react'
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

const MEDAL_ICONS = ['🥇', '🥈', '🥉']

export const ReferralBattle = memo(function ReferralBattle({
  userReferrals,
}: ReferralBattleProps) {
  const userRank = useMemo(() => {
    const sorted = [...LEADERBOARD].sort((a, b) => b.refs - a.refs)
    const pos = sorted.findIndex(u => u.refs <= userReferrals)
    return pos === -1 ? sorted.length + 1 : pos + 1
  }, [userReferrals])

  const daysLeft = useMemo(() => {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
            background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 60%)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown size={14} color="rgba(212,175,55,0.55)" />
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
              border: '1px solid rgba(255,255,255,0.06)',
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
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--gold-glass-subtle)',
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
                Вы — #{userRank}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                {userReferrals} {userReferrals === 1 ? 'реферал' : userReferrals >= 2 && userReferrals <= 4 ? 'реферала' : 'рефералов'}
              </div>
            </div>
            <TrendingUp size={14} color="var(--gold-400)" />
          </div>

          {/* Leaderboard */}
          <div style={{ display: 'grid', gap: 6 }}>
            {LEADERBOARD.slice(0, 3).map((user, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: i === 0 ? 'rgba(212,175,55,0.04)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>
                  {MEDAL_ICONS[i] || `${i + 1}`}
                </span>
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
                  <Users size={10} color="var(--text-muted)" />
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
                    background: 'rgba(212,175,55,0.08)',
                  }}>
                    {user.reward}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Prize info */}
          <div style={{
            marginTop: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.4,
            }}>
              Топ-3 за месяц получают 2000₽, 1000₽ и 500₽ бонусов
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  )
})
