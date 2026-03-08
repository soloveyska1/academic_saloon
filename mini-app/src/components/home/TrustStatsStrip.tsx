import { memo } from 'react'
import { motion } from 'framer-motion'
import { Users, Star, UserCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — 3 social proof metrics in a compact gold row
//  Psychology: specific numbers ("5 800+") beat vague ("thousands")
// ═══════════════════════════════════════════════════════════════════════════

const STATS = [
  { icon: Users, value: '5 800+', label: 'работ сдано', pulse: false },
  { icon: Star, value: '4.9', label: 'оценка', pulse: false },
  { icon: UserCheck, value: '23', label: 'автора онлайн', pulse: true },
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
        padding: '12px 16px',
        borderRadius: 14,
        background: 'rgba(212,175,55,0.04)',
        border: '1px solid rgba(212,175,55,0.12)',
        marginBottom: 16,
      }}
    >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <Icon size={13} color="rgba(212,175,55,0.6)" strokeWidth={2} />
              <span
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#EDEDED',
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
                  top: '20%',
                  height: '60%',
                  width: 1,
                  background: 'rgba(212,175,55,0.15)',
                }}
              />
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
})
