import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE ACTIVITY FEED — Social proof in real-time.
//  Quiet, elegant ticker. Creates FOMO without being aggressive.
//  Minimal chrome — content floats on void.
// ═══════════════════════════════════════════════════════════════════════════

const WORK_TYPES = [
  'Курсовая', 'Дипломная', 'Реферат', 'Контрольная', 'Эссе',
  'Отчёт по практике', 'Диссертация', 'Презентация', 'Доклад', 'Лабораторная',
] as const

const SUBJECTS = [
  'Экономика', 'Менеджмент', 'Право', 'Маркетинг', 'Финансы',
  'Психология', 'Педагогика', 'Социология', 'Информатика', 'Бухучёт',
  'Логистика', 'Философия', 'Политология', 'Медицина', 'Культурология',
] as const

const TIMESTAMPS = [
  'только что', '1 мин назад', '3 мин назад', '5 мин назад',
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateFeedItem() {
  return {
    type: pick(WORK_TYPES),
    subject: pick(SUBJECTS),
    time: pick(TIMESTAMPS),
    id: Math.random(),
  }
}

export const LiveActivityFeed = memo(function LiveActivityFeed() {
  const [items, setItems] = useState(() => [
    generateFeedItem(),
    generateFeedItem(),
    generateFeedItem(),
  ])
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const cycle = useCallback(() => {
    setItems(prev => {
      const next = [...prev]
      next.pop()
      next.unshift(generateFeedItem())
      return next
    })
  }, [])

  useEffect(() => {
    const initial = setTimeout(() => {
      cycle()
      intervalRef.current = setInterval(cycle, 4500)
    }, 3000)

    return () => {
      clearTimeout(initial)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [cycle])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      style={{ marginBottom: 24 }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        {/* Live indicator */}
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(212,175,55,0.7)',
              animation: 'pulse 2.5s infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              border: '1px solid rgba(212,175,55,0.2)',
              animation: 'pulse 2.5s infinite 0.5s',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
          }}
        >
          Заказывают прямо сейчас
        </span>
      </div>

      {/* Feed items */}
      <div style={{ minHeight: 114, overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1 - i * 0.25, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                marginBottom: 4,
                borderRadius: 14,
                background: i === 0
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.03), rgba(255,255,255,0.015))'
                  : 'transparent',
                border: i === 0
                  ? '1px solid rgba(212,175,55,0.06)'
                  : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                {/* Type indicator dot */}
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: i === 0 ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.15)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.60)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.type}
                  <span style={{ color: 'rgba(255,255,255,0.10)', margin: '0 8px', fontWeight: 400 }}>·</span>
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                    {item.subject}
                  </span>
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.16)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginLeft: 10,
                }}
              >
                {item.time}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})
