import { memo } from 'react'
import { motion } from 'framer-motion'

interface RankAvatarProps {
  photoUrl?: string
  rankName: string
  rankLevel: number
  isMaxRank: boolean
  size?: number
  onClick?: () => void
}

const RANK_RING_COLORS: Record<number, { from: string; to: string }> = {
  0: { from: 'rgba(180,150,100,0.4)', to: 'rgba(140,110,70,0.3)' },    // Bronze
  1: { from: 'rgba(192,192,192,0.5)', to: 'rgba(160,160,180,0.4)' },   // Silver
  2: { from: 'rgba(212,175,55,0.7)', to: 'rgba(245,225,160,0.5)' },    // Gold
  3: { from: 'rgba(229,228,226,0.7)', to: 'rgba(200,200,210,0.5)' },   // Platinum
  4: { from: 'rgba(212,175,55,0.9)', to: 'rgba(255,215,0,0.7)' },      // Max (Diamond)
}

export const RankAvatar = memo(function RankAvatar({
  photoUrl,
  rankName,
  rankLevel,
  isMaxRank,
  size = 44,
  onClick,
}: RankAvatarProps) {
  const ringColors = RANK_RING_COLORS[Math.min(rankLevel, 4)] || RANK_RING_COLORS[0]
  const ringWidth = 2.5
  const outerSize = size + ringWidth * 2 + 4

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      style={{
        position: 'relative',
        width: outerSize,
        height: outerSize,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {/* Animated ring */}
      <motion.div
        animate={isMaxRank ? {
          boxShadow: [
            `0 0 8px 0 ${ringColors.from}`,
            `0 0 16px 2px ${ringColors.from}`,
            `0 0 8px 0 ${ringColors.from}`,
          ],
        } : undefined}
        transition={isMaxRank ? {
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        } : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          padding: ringWidth,
          background: `linear-gradient(135deg, ${ringColors.from}, ${ringColors.to})`,
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          padding: 2,
          background: 'var(--bg-primary)',
        }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={rankName}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: size * 0.4,
              color: 'var(--text-muted)',
            }}>
              👤
            </div>
          )}
        </div>
      </motion.div>

      {/* Rotating sparkle for max rank */}
      {isMaxRank && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '50%',
            border: '1px dashed rgba(212,175,55,0.2)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Rank badge */}
      {rankLevel >= 2 && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ringColors.from}, ${ringColors.to})`,
          border: '2px solid var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
        }}>
          {rankLevel >= 4 ? '💎' : rankLevel >= 3 ? '✨' : '⭐'}
        </div>
      )}
    </motion.div>
  )
})
