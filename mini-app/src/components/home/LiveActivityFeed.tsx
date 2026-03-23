import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE ACTIVITY FEED — Compact social proof ticker.
//  Deterministic daily shuffle. Unified card style.
// ═══════════════════════════════════════════════════════════════════════════

interface ActivityEvent {
  name: string
  action: string
  workType: string
  timeAgo: string
}

const ALL_EVENTS: ActivityEvent[] = [
  { name: 'Мария', action: 'оформила заказ', workType: 'курсовая', timeAgo: '2 мин' },
  { name: 'Алексей', action: 'получил работу', workType: 'дипломная', timeAgo: '5 мин' },
  { name: 'Екатерина', action: 'оформила заказ', workType: 'реферат', timeAgo: '8 мин' },
  { name: 'Дмитрий', action: 'оставил отзыв ★4.9', workType: 'курсовая', timeAgo: '12 мин' },
  { name: 'Анна', action: 'получила работу', workType: 'эссе', timeAgo: '15 мин' },
  { name: 'Иван', action: 'оформил заказ', workType: 'отчёт по практике', timeAgo: '18 мин' },
  { name: 'Софья', action: 'оформила заказ', workType: 'контрольная', timeAgo: '23 мин' },
  { name: 'Артём', action: 'получил работу', workType: 'курсовая', timeAgo: '27 мин' },
  { name: 'Ольга', action: 'оставила отзыв ★5.0', workType: 'дипломная', timeAgo: '31 мин' },
  { name: 'Никита', action: 'оформил заказ', workType: 'реферат', timeAgo: '35 мин' },
]

function shuffleForDay(events: ActivityEvent[]): ActivityEvent[] {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const shuffled = [...events]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 6)
}

export const LiveActivityFeed = memo(function LiveActivityFeed() {
  const events = useMemo(() => shuffleForDay(ALL_EVENTS), [])
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const shouldReduceMotion = useReducedMotion()

  const startRotation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % events.length)
    }, 4000)
  }, [events.length])

  useEffect(() => {
    startRotation()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startRotation])

  const event = events[activeIndex]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        marginBottom: 8,
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(12, 12, 10, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        minHeight: 36,
      }}
    >
      {/* Live dot */}
      <div style={{ position: 'relative', flexShrink: 0, width: 6, height: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success-text)' }} />
        {!shouldReduceMotion && (
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-text)' }}
          />
        )}
      </div>

      {/* Event text */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {event.name} {event.action} — <span style={{ fontWeight: 600, color: 'var(--gold-400)' }}>{event.workType}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.7 }}>
        {event.timeAgo}
      </span>
    </motion.div>
  )
})
