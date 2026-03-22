import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST STATS STRIP — 3 metrics with count-up.
//  Compact horizontal strip, unified with design system.
// ═══════════════════════════════════════════════════════════════════════════

interface StatConfig {
  value: number
  suffix: string
  prefix: string
  label: string
  decimals: number
}

const STATS: StatConfig[] = [
  { value: 2400, suffix: '+', prefix: '', label: 'работ', decimals: 0 },
  { value: 4.8, suffix: '', prefix: '★ ', label: 'рейтинг', decimals: 1 },
  { value: 98, suffix: '%', prefix: '', label: 'в срок', decimals: 0 },
]

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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.10 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '20px 0',
        marginBottom: 8,
      }}
    >
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
            position: 'relative',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {stat.prefix}
            <AnimatedCounter target={stat.value} decimals={stat.decimals} />
            {stat.suffix}
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            {stat.label}
          </span>

          {/* Subtle divider */}
          {i < STATS.length - 1 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 0,
                top: '10%',
                height: '80%',
                width: 1,
                background: 'rgba(255, 255, 255, 0.06)',
              }}
            />
          )}
        </div>
      ))}
    </motion.div>
  )
})
