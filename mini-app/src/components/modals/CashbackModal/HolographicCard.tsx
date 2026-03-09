import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS CARD — Quiet Luxury (no holographic shimmer)
//  Static premium card, warm gold palette, clean typography.
// ═══════════════════════════════════════════════════════════════════════════

interface HolographicCardProps {
  rank: RankData
  isLocked: boolean
  onClick?: () => void
}

function HolographicCardComponent({ rank, isLocked, onClick }: HolographicCardProps) {
  const Icon = rank.icon

  const cardStyle = useMemo(() => ({
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '2/1',
    maxHeight: 170,
    borderRadius: 20,
    background: 'linear-gradient(145deg, rgba(22,22,26,1) 0%, rgba(14,14,18,1) 100%)',
    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.18)'}`,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : undefined,
    boxShadow: isLocked
      ? '0 8px 24px -8px rgba(0,0,0,0.4)'
      : '0 16px 40px -16px rgba(212,175,55,0.15)',
  }), [isLocked, onClick])

  return (
    <m.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
    >
      {/* Subtle top highlight — no animation */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 1,
        background: isLocked
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
        zIndex: 1,
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', padding: '16px 20px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: 7, borderRadius: 11,
              background: isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(212,175,55,0.08)',
              border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.12)'}`,
            }}>
              <Icon size={18} color={isLocked ? '#52525b' : 'rgba(212,175,55,0.60)'} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: isLocked ? '#52525b' : 'rgba(255,255,255,0.65)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {rank.displayName}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: isLocked ? '#3f3f46' : 'rgba(212,175,55,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 2,
            }}>
              Кэшбэк
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800,
              color: isLocked ? '#52525b' : '#E8D5A3',
            }}>
              {rank.cashback}%
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: '#3f3f46', textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 5,
          }}>
            АКАДЕМИЧЕСКИЙ САЛОН
          </div>
          <div style={{
            fontSize: 13,
            color: isLocked ? '#3f3f46' : 'rgba(255,255,255,0.30)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em',
          }}>
            •••• •••• •••• {isLocked ? '••••' : '8888'}
          </div>
        </div>
      </div>
    </m.div>
  )
}

export const HolographicCard = memo(HolographicCardComponent)
