import { memo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Crown, Percent, Star } from 'lucide-react'

// Glass card style
const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--bg-card)',
  backdropFilter: 'blur(12px) saturate(130%)',
  WebkitBackdropFilter: 'blur(12px) saturate(130%)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
}

interface Rank {
  name: string
  emoji: string
  level: number
  cashback: number
  bonus: string | null
  progress: number
  next_rank: string | null
  spent_to_next: number
  is_max: boolean
}

interface LevelProgressCardProps {
  rank: Rank
  displayNextRank: string | null
  onNavigate?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAX RANK CARD — Crown achievement instead of empty space
// ═══════════════════════════════════════════════════════════════════════════
function MaxRankCard({ rank }: { rank: Rank }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      className="card-padding card-radius"
      style={{
        ...glassStyle,
        marginBottom: 16,
        border: '1px solid var(--border-gold-strong)',
        background: 'linear-gradient(145deg, var(--gold-glass-subtle), var(--bg-card) 40%)',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header with crown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--gold-glass-strong)',
            border: '1px solid var(--border-gold-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--glow-gold)',
          }}>
            <Crown size={22} color="var(--gold-400)" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-muted)',
              marginBottom: 2,
            }}>
              Максимальный уровень
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {rank.emoji} {rank.name}
            </div>
          </div>
        </div>

        {/* Benefits grid */}
        <div style={{ display: 'flex', gap: 10 }}>
          {rank.cashback > 0 && (
            <div style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Percent size={14} color="var(--gold-400)" strokeWidth={2} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {rank.cashback}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>кэшбэк</div>
              </div>
            </div>
          )}
          {rank.bonus && (
            <div style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Star size={14} color="var(--gold-400)" strokeWidth={2} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                {rank.bonus}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export const LevelProgressCard = memo(function LevelProgressCard({
  rank,
  displayNextRank,
}: LevelProgressCardProps) {
  // Max rank: show achievement card with benefits
  if (rank.is_max || !displayNextRank) {
    return <MaxRankCard rank={rank} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      className="card-padding card-radius"
      style={{ ...glassStyle, marginBottom: 16 }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--gold-glass-medium)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-gold)',
            }}
          >
            <TrendingUp size={22} color="var(--gold-400)" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}
            >
              Следующий уровень
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginTop: 2,
              }}
            >
              {displayNextRank}
            </div>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 16,
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {rank.progress}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={rank.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Прогресс до следующего уровня ${displayNextRank}: ${rank.progress}%`}
          style={{
            height: 10,
            background: 'var(--bg-glass)',
            borderRadius: 100,
            overflow: 'hidden',
            marginBottom: 12,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(rank.progress, 3)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="progress-shimmer"
            aria-hidden="true"
            style={{
              height: '100%',
              borderRadius: 100,
              boxShadow: 'var(--glow-gold)',
            }}
          />
        </div>
        <div
          style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}
        >
          Осталось{' '}
          <span
            style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}
          >
            {rank.spent_to_next.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>
    </motion.div>
  )
})
