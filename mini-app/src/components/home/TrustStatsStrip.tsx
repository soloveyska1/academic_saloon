import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — Impressive metrics with count-up animation.
//  Numbers that build confidence: completed orders, rating, response time.
//  Rating 4.8 (not 4.9/5.0 — research: imperfect scores more believable).
//  No borders, no cards. Just powerful data floating on void.
// ═══════════════════════════════════════════════════════════════════════════

interface StatConfig {
  value: number
  suffix: string
  prefix: string
  label: string
  decimals: number
}

const STATS: StatConfig[] = [
  { value: 2400, suffix: '+', prefix: '', label: 'работ сдано', decimals: 0 },
  { value: 4.8, suffix: '', prefix: '★ ', label: 'оценка клиентов', decimals: 1 },
  { value: 98, suffix: '%', prefix: '', label: 'сдано в срок', decimals: 0 },
]

/** Animated counter that counts up from 0 to target */
function AnimatedCounter({ target, decimals, duration = 1.6 }: {
  target: number
  decimals: number
  duration?: number
}) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const frameRef = useRef<number>()

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / (duration * 1000), 1)

      // Ease out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    const timer = setTimeout(() => {
      frameRef.current = requestAnimationFrame(animate)
    }, 400)

    return () => {
      clearTimeout(timer)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration])

  return <>{decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString('ru-RU')}</>
}

export const TrustStatsStrip = memo(function TrustStatsStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        padding: '24px 0',
        marginBottom: 8,
        position: 'relative',
      }}
    >
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 + i * 0.08 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Number */}
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--gold-200)',
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {stat.prefix}
            <AnimatedCounter target={stat.value} decimals={stat.decimals} />
            {stat.suffix}
          </div>

          {/* Label */}
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {stat.label}
          </span>

          {/* Divider between stats */}
          {i < STATS.length - 1 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 0,
                top: '15%',
                height: '70%',
                width: 1,
                background: 'linear-gradient(180deg, transparent, var(--border-gold), transparent)',
              }}
            />
          )}
        </motion.div>
      ))}
    </motion.div>
  )
})
