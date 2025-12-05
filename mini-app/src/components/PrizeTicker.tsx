import { memo } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  АКТИВЫ TICKER — Compact Asset List (FORCED DARK)
//  NO PROBABILITIES - Use rarity badges instead
//  Shows only 3-4 items, compact vertical stack
// ═══════════════════════════════════════════════════════════════════════════

export type AssetRarity = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

export interface Asset {
  id: string
  name: string           // Russian name
  value: string          // Value display
  rarity: AssetRarity    // Rarity badge
  icon: LucideIcon
}

interface PrizeTickerProps {
  assets: Asset[]
  activeId: string | null
}

const RARITY_CONFIG: Record<AssetRarity, { label: string; class: string }> = {
  mythic: { label: 'МИФИЧЕСКИЙ', class: 'badge-mythic' },
  legendary: { label: 'ЛЕГЕНДАРНЫЙ', class: 'badge-legendary' },
  epic: { label: 'ЭПИЧЕСКИЙ', class: 'badge-epic' },
  rare: { label: 'РЕДКИЙ', class: 'badge-rare' },
  common: { label: 'ОБЫЧНЫЙ', class: 'badge-common' },
}

export const PrizeTicker = memo(({ assets, activeId }: PrizeTickerProps) => {
  // Show only first 4 assets to keep compact
  const visibleAssets = assets.slice(0, 4)

  return (
    <div
      style={{
        flex: '0 0 auto',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 6,
          borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-hack, monospace)',
            color: '#D4AF37',
            letterSpacing: '0.2em',
          }}
        >
          ДОСТУПНЫЕ АКТИВЫ
        </span>
        <span
          style={{
            fontSize: 8,
            fontFamily: 'var(--font-hack, monospace)',
            color: '#444',
            letterSpacing: '0.1em',
          }}
        >
          LIVE
        </span>
      </div>

      {/* Asset List */}
      {visibleAssets.map((asset, index) => {
        const isActive = activeId === asset.id
        const isPassed = activeId !== null &&
          assets.findIndex(a => a.id === activeId) > index
        const rarity = RARITY_CONFIG[asset.rarity]
        const Icon = asset.icon

        return (
          <motion.div
            key={asset.id}
            animate={{
              scale: isActive ? 1.02 : 1,
              opacity: isPassed ? 0.3 : 1,
            }}
            transition={{ duration: 0.12 }}
            className={isActive ? 'asset-glow-active' : ''}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: isActive
                ? 'rgba(212, 175, 55, 0.08)'
                : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${isActive ? '#D4AF37' : 'rgba(255,255,255,0.04)'}`,
              overflow: 'hidden',
            }}
          >
            {/* Active glow bar */}
            {isActive && (
              <motion.div
                layoutId="assetGlow"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: '#D4AF37',
                  boxShadow: '0 0 12px #D4AF37',
                }}
              />
            )}

            {/* Icon */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: isActive
                  ? 'linear-gradient(135deg, #D4AF37, #8b6914)'
                  : '#111115',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: isActive
                  ? '0 0 15px rgba(212, 175, 55, 0.4)'
                  : 'none',
              }}
            >
              <Icon
                size={16}
                color={isActive ? '#050505' : '#555'}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
            </div>

            {/* Name & Value */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-elite, Georgia, serif)',
                  fontWeight: 600,
                  color: isActive ? '#fff' : '#888',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {asset.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'var(--font-hack, monospace)',
                  fontWeight: 700,
                  color: isActive ? '#D4AF37' : '#555',
                  textShadow: isActive
                    ? '0 0 10px rgba(212, 175, 55, 0.5)'
                    : 'none',
                }}
              >
                {asset.value}
              </div>
            </div>

            {/* Rarity Badge */}
            <div
              className={rarity.class}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 7,
                fontFamily: 'var(--font-hack, monospace)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
              }}
            >
              {rarity.label}
            </div>
          </motion.div>
        )
      })}

      {/* More indicator if there are hidden assets */}
      {assets.length > 4 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 8,
            color: '#444',
            fontFamily: 'var(--font-hack, monospace)',
            letterSpacing: '0.1em',
            padding: '4px 0',
          }}
        >
          +{assets.length - 4} СКРЫТЫХ АКТИВОВ
        </div>
      )}
    </div>
  )
})

PrizeTicker.displayName = 'PrizeTicker'
