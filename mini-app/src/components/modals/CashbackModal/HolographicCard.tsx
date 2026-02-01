import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  HOLOGRAPHIC CARD — Premium "Black Card" Effect
// ═══════════════════════════════════════════════════════════════════════════

interface HolographicCardProps {
  rank: RankData
  isLocked: boolean
  onClick?: () => void
}

// Мемоизированные стили
const cardGradient = 'linear-gradient(135deg, rgba(20, 20, 23, 1) 0%, rgba(30, 30, 35, 1) 100%)'

function HolographicCardComponent({ rank, isLocked, onClick }: HolographicCardProps) {
  const Icon = rank.icon

  // Мемоизация стилей
  const cardStyle = useMemo(() => ({
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '1.6/1',
    borderRadius: 24,
    background: cardGradient,
    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.3)'}`,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : undefined,
    boxShadow: isLocked
      ? '0 10px 30px -10px rgba(0,0,0,0.5)'
      : `0 20px 50px -20px ${rank.color}40`,
  }), [isLocked, rank.color, onClick])

  const iconContainerStyle = useMemo(() => ({
    padding: 8,
    borderRadius: 12,
    background: isLocked ? 'rgba(255,255,255,0.05)' : `${rank.color}20`,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.1)' : rank.color + '40'}`,
  }), [isLocked, rank.color])

  return (
    <m.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={cardStyle}
    >
      {/* Holographic Foil Effect - GPU-accelerated */}
      {!isLocked && (
        <m.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(115deg, transparent 30%, ${rank.color}30 50%, transparent 70%)`,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        height: '100%',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Top Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconContainerStyle}>
              <Icon size={20} color={isLocked ? '#71717a' : rank.color} />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: isLocked ? '#71717a' : '#fff',
              letterSpacing: '0.05em',
            }}>
              {rank.displayName.toUpperCase()}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10,
              color: isLocked ? '#52525b' : rank.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              CASHBACK
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: isLocked ? '#71717a' : '#fff',
              textShadow: isLocked ? 'none' : `0 0 20px ${rank.color}60`,
            }}>
              {rank.cashback}%
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div>
          <div style={{
            fontSize: 11,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 6,
          }}>
            ACADEMIC SALOON
          </div>
          <div style={{
            fontSize: 14,
            color: isLocked ? '#71717a' : '#e4e4e7',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}>
            •••• •••• •••• {isLocked ? 'LOCKED' : '8888'}
          </div>
        </div>
      </div>
    </m.div>
  )
}

export const HolographicCard = memo(HolographicCardComponent)
