import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE ACTIVITY FEED — Auto-cycling ticker showing "live" orders
//  Psychology: consensus bias + FOMO + social proof
//  Shows semi-anonymous entries: WorkType · Subject · University
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
  'только что', '1 мин назад', '2 мин назад', '3 мин назад', '5 мин назад',
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

function randomHourlyCount() {
  return Math.floor(Math.random() * 11) + 8 // 8–18
}

export const LiveActivityFeed = memo(function LiveActivityFeed() {
  const [items, setItems] = useState(() => [
    generateFeedItem(),
    generateFeedItem(),
    generateFeedItem(),
  ])
  const [hourlyCount, setHourlyCount] = useState(randomHourlyCount)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const counterRef = useRef<ReturnType<typeof setInterval>>()

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

    counterRef.current = setInterval(() => {
      setHourlyCount(randomHourlyCount())
    }, 30000)

    return () => {
      clearTimeout(initial)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (counterRef.current) clearInterval(counterRef.current)
    }
  }, [cycle])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px 8px',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px rgba(34,197,94,0.6)',
            animation: 'pulse 2s infinite',
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Заказывают сейчас
          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'rgba(212,175,55,0.5)' }}>{hourlyCount} за последний час</span>
        </span>
      </div>

      {/* Feed items */}
      <div style={{ padding: '0 16px 12px', minHeight: 108 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1 - i * 0.25, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom:
                  i < items.length - 1
                    ? '1px solid rgba(255,255,255,0.04)'
                    : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <Zap size={12} color="rgba(212,175,55,0.5)" strokeWidth={2.2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.type}
                  <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                    {item.subject}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                  <span style={{ fontWeight: 600, color: 'rgba(212,175,55,0.45)' }}>
                    {item.university}
                  </span>
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.2)',
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
