import React, { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE WINNERS TICKER — Fake Social Proof for Urgency
//  Creates artificial excitement and FOMO
// ═══════════════════════════════════════════════════════════════════════════

interface Winner {
  name: string
  prize: string
  action: string
}

const FAKE_WINNERS: Winner[] = [
  { name: 'Alex M.', prize: 'DIPLOMA LIBERTY', action: 'ВЗЛОМАЛ' },
  { name: 'Elena K.', prize: 'SMART START -500₽', action: 'ПОЛУЧИЛА' },
  { name: 'Dmitry V.', prize: 'ACADEMIC RELIEF', action: 'ВЗЛОМАЛ' },
  { name: 'Sarah J.', prize: 'STRATEGY PACK', action: 'ЗАБРАЛА' },
  { name: 'Kirill R.', prize: 'SMART START -500₽', action: 'ПОЛУЧИЛ' },
  { name: 'User_773', prize: 'THESIS START', action: 'АКТИВИРОВАЛ' },
  { name: 'Maria P.', prize: 'SMART START -500₽', action: 'ПОЛУЧИЛА' },
  { name: 'Anton S.', prize: 'STRATEGY PACK', action: 'ЗАБРАЛ' },
]

export const LiveWinnersTicker = memo(() => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FAKE_WINNERS.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const winner = FAKE_WINNERS[index]

  return (
    <div className="winners-ticker" style={{ padding: '6px 0' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: '#D4AF37',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          <Zap
            size={10}
            fill="#D4AF37"
            color="#D4AF37"
            style={{ animation: 'pulse 1s ease-in-out infinite' }}
          />
          <span style={{ opacity: 0.7 }}>{winner.name}</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{winner.action}:</span>
          <span
            style={{
              color: '#fff',
              textShadow: '0 0 5px rgba(212, 175, 55, 0.5)',
            }}
          >
            {winner.prize}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
})

LiveWinnersTicker.displayName = 'LiveWinnersTicker'
