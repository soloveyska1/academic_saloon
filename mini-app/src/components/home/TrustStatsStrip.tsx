import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useThemeValue } from '../../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — Impressive metrics with count-up animation.
//  Numbers that build confidence: completed orders, rating, response time.
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
  { value: 4.9, suffix: '', prefix: '', label: 'средняя оценка', decimals: 1 },
  { value: 98, suffix: '%', prefix: '', label: 'вовремя', decimals: 0 },
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

    // Delay start slightly for stagger effect
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
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
        padding: '24px 0',
        marginBottom: 8,
        position: 'relative',
      }}
    >
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 + i * 0.08 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Number — the star of the show */}
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: isDark ? '#F0E6C8' : '#7d5c12',
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
              color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(120,113,108,0.6)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {stat.label}
          </span>

          {/* Divider between stats — subtle vertical line */}
          {i < STATS.length - 1 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 0,
                top: '15%',
                height: '70%',
                width: 1,
                background: isDark
                  ? 'linear-gradient(180deg, transparent, rgba(212,175,55,0.12), transparent)'
                  : 'linear-gradient(180deg, transparent, rgba(158,122,26,0.15), transparent)',
              }}
            />
          )}
        </motion.div>
      ))}
    </motion.div>
  )
})
