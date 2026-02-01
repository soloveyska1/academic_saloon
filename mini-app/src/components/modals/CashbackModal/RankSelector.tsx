import { memo, useMemo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { RANKS, type RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  RANK SELECTOR — Horizontal timeline for rank selection
// ═══════════════════════════════════════════════════════════════════════════

interface RankSelectorProps {
  activeIndex: number
  currentUserIndex: number
  onSelect: (index: number) => void
}

// Константные стили
const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 32,
  position: 'relative',
  padding: '0 10px',
}

const lineStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 20,
  right: 20,
  height: 2,
  background: 'rgba(255,255,255,0.1)',
  zIndex: 0,
  transform: 'translateY(-50%)',
}

function RankSelectorComponent({ activeIndex, currentUserIndex, onSelect }: RankSelectorProps) {
  return (
    <div style={containerStyle}>
      {/* Connecting Line */}
      <div style={lineStyle} />

      {RANKS.map((rank, i) => (
        <RankNode
          key={rank.id}
          rank={rank}
          index={i}
          isActive={i === activeIndex}
          isUnlocked={i <= currentUserIndex}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RANK NODE — Individual selectable rank item
// ═══════════════════════════════════════════════════════════════════════════

interface RankNodeProps {
  rank: RankData
  index: number
  isActive: boolean
  isUnlocked: boolean
  onSelect: (index: number) => void
}

const RankNode = memo(function RankNode({
  rank,
  index,
  isActive,
  isUnlocked,
  onSelect,
}: RankNodeProps) {
  const Icon = rank.icon

  const handleClick = useCallback(() => {
    onSelect(index)
  }, [onSelect, index])

  const nodeStyle = useMemo<React.CSSProperties>(() => ({
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isActive ? rank.color : isUnlocked ? 'rgba(255,255,255,0.2)' : '#18181b',
    border: `1px solid ${isActive ? rank.color : isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)'}`,
    boxShadow: isActive ? `0 0 15px ${rank.color}60` : 'none',
    transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
  }), [isActive, isUnlocked, rank.color])

  return (
    <m.div
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      animate={{
        scale: isActive ? 1.2 : 1,
        y: isActive ? -4 : 0,
      }}
      style={{
        position: 'relative',
        zIndex: 1,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={nodeStyle}>
        <Icon size={18} color={isActive ? '#000' : isUnlocked ? '#fff' : '#52525b'} />
      </div>

      {/* Active Label */}
      <AnimatePresence>
        {isActive && (
          <m.div
            layoutId="rankActiveLabel"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{
              position: 'absolute',
              top: 52,
              fontSize: 10,
              fontWeight: 700,
              color: rank.color,
              whiteSpace: 'nowrap',
            }}
          >
            {rank.displayName}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
})

export const RankSelector = memo(RankSelectorComponent)
