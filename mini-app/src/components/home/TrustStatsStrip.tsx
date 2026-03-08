import { memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Layers, Headphones } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — 3 key selling metrics in a premium gold row
//  No fake team/rating data. Focus on speed, variety, availability.
// ═══════════════════════════════════════════════════════════════════════════

const STATS = [
  { icon: Clock, value: 'от 1 дня', label: 'срок', pulse: false },
  { icon: Layers, value: '10+', label: 'видов работ', pulse: false },
  { icon: Headphones, value: '24/7', label: 'на связи', pulse: true },
] as const

export const TrustStatsStrip = memo(function TrustStatsStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 4px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)',
        border: '1px solid rgba(212,175,55,0.14)',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top highlight line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
        }}
      />

      {STATS.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 + i * 0.04 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Icon size={13} color="rgba(212,175,55,0.65)" strokeWidth={2.2} />
              <span
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#EDEDED',
                  letterSpacing: '0.01em',
                }}
              >
                {stat.value}
              </span>
              {stat.pulse && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                    animation: 'pulse 2s infinite',
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {stat.label}
            </span>

            {/* Gold divider (except last) */}
            {i < STATS.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '15%',
                  height: '70%',
                  width: 1,
                  background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.2), transparent)',
                }}
              />
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
})
