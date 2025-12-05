import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  PRIZE TICKER — Asset List with Scanning Animation
//  Hacker-style prize display with scanning effect
// ═══════════════════════════════════════════════════════════════════════════

export interface PrizeTier {
  id: string
  name: string
  desc: string
  val: string
  chance: string
  icon: LucideIcon
}

interface PrizeTickerProps {
  tiers: PrizeTier[]
  highlightedId: string | null
}

export const PrizeTicker = memo(({ tiers, highlightedId }: PrizeTickerProps) => {
  const { isDark } = useTheme()

  return (
    <div style={{ padding: '0 20px', paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '0 4px',
          marginBottom: 16,
          opacity: 0.5,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: '#D4AF37',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
        >
          Available Assets
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: isDark ? '#666' : '#999',
          }}
        >
          LIVE ENCRYPTION
        </span>
      </div>

      {/* Prize List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tiers.map((tier) => {
          const isActive = highlightedId === tier.id
          const isPassed = highlightedId !== null &&
            tiers.findIndex(t => t.id === highlightedId) > tiers.findIndex(t => t.id === tier.id)

          return (
            <motion.div
              key={tier.id}
              animate={{
                scale: isActive ? 1.02 : isPassed ? 0.98 : 1,
                opacity: isPassed ? 0.4 : 1,
              }}
              transition={{ duration: 0.15 }}
              className={`asset-card ${isActive ? 'highlighted' : ''} ${isPassed ? 'passed' : ''}`}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${isActive ? '#D4AF37' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'}`,
                background: isActive
                  ? 'rgba(212, 175, 55, 0.05)'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(255, 255, 255, 0.8)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Active Glow Line */}
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: '#D4AF37',
                    boxShadow: '0 0 10px #D4AF37',
                  }}
                />
              )}

              {/* Shimmer Effect */}
              {isActive && (
                <div
                  className="shimmer-effect"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                    transform: 'skewX(-20deg)',
                    animation: 'shimmer 1s infinite',
                  }}
                />
              )}

              {/* Left: Icon & Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 10 }}>
                <div
                  className="asset-icon"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? '#D4AF37' : isDark ? '#141417' : '#f0ede8',
                    color: isActive ? '#000' : isDark ? '#444' : '#999',
                    boxShadow: isActive ? '0 0 20px rgba(212, 175, 55, 0.4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <tier.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-serif)',
                      letterSpacing: '0.1em',
                      color: isActive ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#666' : '#888'),
                    }}
                  >
                    {tier.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      marginTop: 2,
                      color: isActive ? '#D4AF37' : (isDark ? '#444' : '#aaa'),
                    }}
                  >
                    {tier.desc}
                  </span>
                </div>
              </div>

              {/* Right: Value */}
              <div style={{ textAlign: 'right', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: isActive ? '#D4AF37' : (isDark ? '#444' : '#888'),
                    textShadow: isActive ? '0 0 10px rgba(212, 175, 55, 0.5)' : 'none',
                  }}
                >
                  {tier.val}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: isDark ? '#666' : '#999',
                      marginTop: 4,
                    }}
                  >
                    CHANCE: {tier.chance}
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
})

PrizeTicker.displayName = 'PrizeTicker'
