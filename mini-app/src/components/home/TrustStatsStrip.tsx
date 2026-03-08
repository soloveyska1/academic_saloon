import { memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Layers, Headphones } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — Borderless floating metrics
//  NO card background. NO border. Just content on the void.
//  This creates visual differentiation from the hero card above.
// ═══════════════════════════════════════════════════════════════════════════

const STATS = [
  { icon: Clock, value: 'от 1 дня', label: 'срок', showPulse: false },
  { icon: Layers, value: '10+', label: 'видов работ', showPulse: false },
  { icon: Headphones, value: '24/7', label: 'на связи', showPulse: true },
] as const

export const TrustStatsStrip = memo(function TrustStatsStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '20px 0',
        marginBottom: 8,
      }}
    >
      {STATS.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 + i * 0.05 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Icon size={13} color="rgba(212,175,55,0.55)" strokeWidth={2.2} />
              <span
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#F0E6C8',
                  letterSpacing: '-0.01em',
                }}
              >
                {stat.value}
              </span>
              {stat.showPulse && (
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.7)',
                    boxShadow: '0 0 6px rgba(212,175,55,0.35)',
                    animation: 'pulse 2.5s infinite',
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {stat.label}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
})
