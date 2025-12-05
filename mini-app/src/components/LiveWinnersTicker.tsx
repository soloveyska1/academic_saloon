import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  ХАКЕРЫ TICKER — Fake Social Proof (Russian)
//  Format: [ИМЯ] :: [ДЕЙСТВИЕ] :: [АКТИВ]
// ═══════════════════════════════════════════════════════════════════════════

interface Hacker {
  name: string
  action: string
  asset: string
}

const FAKE_HACKERS: Hacker[] = [
  { name: 'АЛЕКСЕЙ М.', action: 'ВЗЛОМАЛ', asset: 'ДИПЛОМ' },
  { name: 'ЕЛЕНА К.', action: 'ПОЛУЧИЛА', asset: '-500₽' },
  { name: 'ДМИТРИЙ В.', action: 'ВЗЛОМАЛ', asset: 'КУРСОВАЯ' },
  { name: 'МАРИЯ С.', action: 'ЗАБРАЛА', asset: '-500₽' },
  { name: 'КИРИЛЛ Р.', action: 'АКТИВИРОВАЛ', asset: 'ЭССЕ' },
  { name: 'АННА П.', action: 'ПОЛУЧИЛА', asset: '-200₽' },
  { name: 'АРТЁМ Н.', action: 'ВЗЛОМАЛ', asset: 'КОНСУЛЬТАЦИЯ' },
  { name: 'ОЛЬГА Т.', action: 'ЗАБРАЛА', asset: '-500₽' },
  { name: 'ИВАН К.', action: 'АКТИВИРОВАЛ', asset: '-200₽' },
  { name: 'ЮЛИЯ М.', action: 'ПОЛУЧИЛА', asset: 'ЭССЕ' },
]

export const LiveWinnersTicker = memo(() => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FAKE_HACKERS.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  const hacker = FAKE_HACKERS[index]

  return (
    <div
      style={{
        height: 30,
        flexShrink: 0,
        background: '#050505',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.03), transparent)',
          animation: 'tickerScroll 3s linear infinite',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 9,
            fontFamily: 'var(--font-hack, "JetBrains Mono", monospace)',
            letterSpacing: '0.12em',
          }}
        >
          {/* Pulse indicator */}
          <Zap
            size={10}
            fill="#D4AF37"
            color="#D4AF37"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.6))',
            }}
          />

          {/* Name */}
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {hacker.name}
          </span>

          {/* Separator */}
          <span style={{ color: 'rgba(212, 175, 55, 0.4)' }}>::</span>

          {/* Action */}
          <span style={{ color: '#D4AF37', fontWeight: 700 }}>
            {hacker.action}
          </span>

          {/* Separator */}
          <span style={{ color: 'rgba(212, 175, 55, 0.4)' }}>::</span>

          {/* Asset */}
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              textShadow: '0 0 8px rgba(212, 175, 55, 0.5)',
            }}
          >
            {hacker.asset}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
})

LiveWinnersTicker.displayName = 'LiveWinnersTicker'
