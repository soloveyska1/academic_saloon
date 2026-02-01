import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { RANKS, type RankData, getRankIndexByCashback } from '../../../lib/ranks'
import { LuxuryCard } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  RANK TIMELINE — Vertical progress timeline
// ═══════════════════════════════════════════════════════════════════════════

interface RankTimelineProps {
  userCashback: number
}

// Staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
}

function RankTimelineComponent({ userCashback }: RankTimelineProps) {
  const currentRankIndex = getRankIndexByCashback(userCashback)

  return (
    <div style={{ position: 'relative', paddingLeft: 32, marginBottom: 28 }}>
      {/* Vertical gradient line */}
      <m.div
        initial={{ height: 0 }}
        animate={{ height: 'calc(100% - 48px)' }}
        transition={{ duration: 0.8, delay: 0.3 }}
        style={{
          position: 'absolute',
          left: 13,
          top: 24,
          width: 3,
          background: 'linear-gradient(180deg, #D4AF37 0%, rgba(212,175,55,0.2) 100%)',
          borderRadius: 2,
        }}
      />

      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {RANKS.map((rank, index) => (
          <RankTimelineItem
            key={rank.id}
            rank={rank}
            index={index}
            isActive={rank.cashback === userCashback}
            isPassed={currentRankIndex > index}
            isLast={index === RANKS.length - 1}
          />
        ))}
      </m.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RANK TIMELINE ITEM
// ═══════════════════════════════════════════════════════════════════════════

interface RankTimelineItemProps {
  rank: RankData
  index: number
  isActive: boolean
  isPassed: boolean
  isLast: boolean
}

const RankTimelineItem = memo(function RankTimelineItem({
  rank,
  isActive,
  isPassed,
  isLast,
}: RankTimelineItemProps) {
  const Icon = rank.icon

  const nodeStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: isPassed || isActive
      ? 'linear-gradient(135deg, #D4AF37, #B38728)'
      : 'rgba(60,60,60,0.6)',
    border: `3px solid ${isPassed || isActive ? '#D4AF37' : 'rgba(80,80,80,0.5)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }), [isActive, isPassed])

  const iconContainerStyle = useMemo<React.CSSProperties>(() => ({
    width: 52,
    height: 52,
    borderRadius: 16,
    background: isPassed || isActive ? rank.gradient : 'rgba(60,60,60,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isActive ? `0 8px 24px -6px ${rank.color}60` : 'none',
    position: 'relative',
    overflow: 'hidden',
  }), [isActive, isPassed, rank.gradient, rank.color])

  return (
    <m.div
      variants={itemVariants}
      style={{
        position: 'relative',
        marginBottom: isLast ? 0 : 20,
        paddingLeft: 32,
      }}
    >
      {/* Timeline node */}
      <m.div
        animate={isActive ? {
          boxShadow: [
            '0 0 15px rgba(212,175,55,0.4)',
            '0 0 30px rgba(212,175,55,0.7)',
            '0 0 15px rgba(212,175,55,0.4)',
          ],
          scale: [1, 1.1, 1],
        } : undefined}
        transition={{ duration: 2, repeat: Infinity }}
        style={nodeStyle}
      >
        {(isPassed || isActive) && (
          <CheckCircle size={14} color="#09090b" strokeWidth={3} />
        )}
      </m.div>

      {/* Card */}
      <LuxuryCard
        gradient={isActive
          ? `linear-gradient(135deg, ${rank.color}18 0%, ${rank.color}06 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
        }
        borderColor={isActive ? `${rank.color}45` : 'rgba(255,255,255,0.06)'}
        glowColor={isActive ? rank.color : undefined}
        isActive={isActive}
        style={{ padding: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Icon */}
          <m.div
            animate={isActive ? { rotate: [0, 5, -5, 0] } : undefined}
            transition={{ duration: 3, repeat: Infinity }}
            style={iconContainerStyle}
          >
            {/* Shine effect */}
            {(isPassed || isActive) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                borderRadius: '16px 16px 50% 50%',
              }} />
            )}
            <Icon
              size={26}
              color={isPassed ? '#fff' : isActive ? '#fff' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isPassed || isActive ? 2 : 1.5}
              style={{ position: 'relative', zIndex: 1 }}
            />
          </m.div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: isActive ? rank.color : isPassed ? '#22c55e' : 'rgba(255,255,255,0.4)',
              marginBottom: 4,
              textShadow: isActive ? `0 0 16px ${rank.color}40` : 'none',
            }}>
              {rank.displayName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Кешбэк {rank.cashback}% • от {rank.minSpent.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {/* Current badge */}
          {isActive && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              style={{
                padding: '6px 12px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.15))',
                borderRadius: 100,
                border: '1px solid rgba(212,175,55,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#D4AF37',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}>
                ВЫ ЗДЕСЬ
              </span>
            </m.div>
          )}
        </div>
      </LuxuryCard>
    </m.div>
  )
})

export const RankTimeline = memo(RankTimelineComponent)
