import { memo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Users } from 'lucide-react'

/**
 * LiveAuthorsCounter — "Прямо сейчас над заказами работают X авторов"
 *
 * Displays a rotating author count that subtly changes every ~8 seconds,
 * simulating a live counter. The number oscillates within a realistic range
 * (seeded by time-of-day to feel natural — more during evening hours).
 *
 * Creates urgency + social proof: "real people are working RIGHT NOW."
 */

function getAuthorCount(): number {
  const hour = new Date().getHours()
  // More authors "working" during peak student hours (18–23, 10–14)
  const base = (hour >= 18 && hour <= 23) ? 34
    : (hour >= 10 && hour <= 14) ? 28
    : (hour >= 0 && hour <= 6) ? 12
    : 22
  // Small random jitter
  return base + Math.floor(Math.random() * 7) - 3
}

function pluralAuthors(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'авторов'
  if (last === 1) return 'автор'
  if (last >= 2 && last <= 4) return 'автора'
  return 'авторов'
}

export const LiveAuthorsCounter = memo(function LiveAuthorsCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [count, setCount] = useState(() => getAuthorCount())

  useEffect(() => {
    const id = setInterval(() => setCount(getAuthorCount()), 8_000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        marginBottom: 16,
        borderRadius: 12,
        background: 'rgba(212,175,55,0.03)',
        border: '1px solid rgba(212,175,55,0.08)',
      }}
    >
      {/* Pulsing icon */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Users size={16} strokeWidth={1.8} color="var(--gold-400, #D4AF37)" />
        <motion.div
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: -2,
            borderRadius: '50%',
            background: 'var(--gold-400, #D4AF37)',
          }}
        />
      </div>

      {/* Text with animated number */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary, rgba(255,255,255,0.65))',
        lineHeight: 1.4,
      }}>
        Прямо сейчас работают{' '}
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'inline-block',
              fontWeight: 800,
              color: 'var(--gold-400, #D4AF37)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
        {' '}{pluralAuthors(count)}
      </div>
    </motion.div>
  )
})
