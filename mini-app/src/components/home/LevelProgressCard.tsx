import { memo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

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
  level: number
  progress: number
  next_rank: string | null
  spent_to_next: number
}

interface LevelProgressCardProps {
  rank: Rank
  displayNextRank: string | null
  onNavigate?: () => void
}

export const LevelProgressCard = memo(function LevelProgressCard({
  rank,
  displayNextRank,
}: LevelProgressCardProps) {
  if (!displayNextRank) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-padding card-radius"
      style={{ ...glassStyle, marginBottom: 16 }}
    >
      <div aria-hidden="true" style={{ position: 'relative', zIndex: 1 }}>
        <div
          aria-hidden="true"
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px -5px rgba(212,175,55,0.2)',
            }}
          >
            <TrendingUp size={22} color="var(--gold-400)" strokeWidth={1.5} />
          </div>
          <div aria-hidden="true" style={{ flex: 1 }}>
            <div
              aria-hidden="true"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}
            >
              Следующий уровень
            </div>
            <div
              aria-hidden="true"
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
              boxShadow: '0 0 15px rgba(212,175,55,0.5)',
            }}
          />
        </div>
        <div
          aria-hidden="true"
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
