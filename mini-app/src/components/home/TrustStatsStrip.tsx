import { memo, useState, useEffect, useRef } from 'react'
import { GoldText } from '../ui/GoldText'
import { Reveal } from '../ui/StaggerReveal'

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

function AnimatedCounter({
  target,
  decimals,
  duration = 1.6,
}: {
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

  return (
    <>
      {decimals > 0
        ? value.toFixed(decimals)
        : Math.floor(value).toLocaleString('ru-RU')}
    </>
  )
}

export const TrustStatsStrip = memo(function TrustStatsStrip() {
  return (
    <Reveal animation="spring" delay={0.12}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 20,
          padding: '18px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <GoldText variant="static" size="xl" weight={700}>
              {stat.prefix}
              <AnimatedCounter target={stat.value} decimals={stat.decimals} />
              {stat.suffix}
            </GoldText>

            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </Reveal>
  )
})
