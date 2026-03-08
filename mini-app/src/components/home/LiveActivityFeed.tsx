import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE ACTIVITY FEED — Quiet social proof ticker
//  NO card border. Minimal container. Content floats on void.
//  Uses em-dash separator instead of dots (more editorial).
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

const UNIVERSITIES = [
  'МГУ', 'РУДН', 'ВШЭ', 'СПбГУ', 'МГИМО', 'МГТУ', 'РЭУ',
  'РАНХИГС', 'МИРЭА', 'КФУ', 'УрФУ', 'НГУ', 'ТГУ', 'ДВФУ',
] as const

const TIMESTAMPS = [
  'только что', '1 мин', '2 мин', '5 мин', '8 мин',
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateFeedItem() {
  return {
    type: pick(WORK_TYPES),
    subject: pick(SUBJECTS),
    university: pick(UNIVERSITIES),
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
      intervalRef.current = setInterval(cycle, 4000)
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
      transition={{ delay: 0.15 }}
      style={{
        marginBottom: 20,
        paddingTop: 4,
      }}
    >
      {/* Header — minimal, no card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'rgba(212,175,55,0.7)',
            boxShadow: '0 0 6px rgba(212,175,55,0.35)',
            animation: 'pulse 2.5s infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.30)',
          }}
        >
          Заказывают сейчас
        </span>
      </div>

      {/* Feed items — no container, floating on void */}
      <div style={{ minHeight: 114 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1 - i * 0.2, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                marginBottom: 4,
                borderRadius: 12,
                background: i === 0 ? 'rgba(255,255,255,0.02)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <Zap size={12} color="rgba(212,175,55,0.45)" strokeWidth={2.2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.65)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.type}
                  <span style={{ color: 'rgba(255,255,255,0.12)', margin: '0 6px' }}>/</span>
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                    {item.subject}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.12)', margin: '0 6px' }}>/</span>
                  <span style={{ fontWeight: 600, color: 'rgba(212,175,55,0.5)' }}>
                    {item.university}
                  </span>
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.18)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginLeft: 8,
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
