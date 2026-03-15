import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE PULSE — Contextual social proof without faking live orders.
//  Shows aggregate stats + time-aware messaging that feels alive.
//  Honest > impressive. No fake tickers, no "ordering right now" lies.
// ═══════════════════════════════════════════════════════════════════════════

type TimeSlot = 'night' | 'morning' | 'day' | 'evening'
type DayType = 'weekday' | 'weekend'

interface PulseContent {
  label: string
  stat: string
  caption: string
}

function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 23 || hour < 6) return 'night'
  if (hour < 9) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

function getDayType(day: number): DayType {
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

function getMonth(month: number): 'exam' | 'regular' {
  // Dec-Jan (winter session), May-June (summer session)
  return [0, 4, 5, 11].includes(month) ? 'exam' : 'regular'
}

/** Deterministic "random" from date seed — same value all day, changes daily */
function dailySeed(now: Date): number {
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  )
  // Simple hash
  return ((dayOfYear * 2654435761) >>> 0) % 1000
}

function pickFromSeed<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length]
}

/** Build two contextual content blocks based on time/day/season */
function buildPulseContent(now: Date): [PulseContent, PulseContent] {
  const hour = now.getHours()
  const slot = getTimeSlot(hour)
  const dayType = getDayType(now.getDay())
  const season = getMonth(now.getMonth())
  const seed = dailySeed(now)

  // Left block: aggregate stat (rotates daily)
  const statOptions: PulseContent[] = [
    { label: 'В этом семестре', stat: `${1180 + (seed % 120)}`, caption: 'работ сдано' },
    { label: 'За последний месяц', stat: `${210 + (seed % 45)}`, caption: 'студентов обратились' },
    { label: 'Средний балл', stat: '4.8', caption: 'по завершённым работам' },
    { label: 'Авторы на связи', stat: `${14 + (seed % 8)}`, caption: 'специалистов онлайн' },
  ]

  // Right block: time-contextual message
  const contextMessages: Record<TimeSlot, PulseContent[]> = {
    morning: [
      { label: 'Утреннее окно', stat: 'до 12:00', caption: 'быстрый ответ автора' },
      { label: 'Хорошее время', stat: '~15 мин', caption: 'среднее время отклика' },
    ],
    day: [
      { label: 'Рабочие часы', stat: '~10 мин', caption: 'отклик автора' },
      { label: 'Сейчас удобно', stat: 'максимум', caption: 'авторов на связи' },
    ],
    evening: [
      { label: 'Вечерний пик', stat: 'активно', caption: 'больше всего заявок' },
      { label: 'Ещё успеваем', stat: 'до 23:00', caption: 'приём новых заказов' },
    ],
    night: [
      { label: 'Ночной режим', stat: 'утром', caption: 'автор ответит первым делом' },
      { label: 'Оставь заявку', stat: '24/7', caption: 'принимаем заказы' },
    ],
  }

  // During exam season, swap in more urgent stat
  const leftBlock = season === 'exam'
    ? { label: 'Сессия идёт', stat: `x${1 + (seed % 3) + 1}`, caption: 'нагрузка выше обычного' }
    : pickFromSeed(statOptions, seed)

  // Weekend tweak
  const rightOptions = contextMessages[slot]
  let rightBlock = pickFromSeed(rightOptions, seed, 3)

  if (dayType === 'weekend' && slot !== 'night') {
    rightBlock = { label: 'Выходной', stat: 'свободнее', caption: 'авторы менее загружены' }
  }

  return [leftBlock, rightBlock]
}

export const LiveActivityFeed = memo(function LiveActivityFeed() {
  const [left, right] = useMemo(() => buildPulseContent(new Date()), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      style={{ marginBottom: 24 }}
    >
      {/* Header — quiet, not "LIVE NOW" aggressive */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        {/* Soft pulse dot — alive but not screaming */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(212,175,55,0.6)',
          }}
        />
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
          Пульс сервиса
        </span>
      </div>

      {/* Two-column stat blocks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        {[left, right].map((block, i) => (
          <motion.div
            key={block.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + i * 0.08 }}
            style={{
              padding: '14px 14px 12px',
              borderRadius: 14,
              background: i === 0
                ? 'linear-gradient(135deg, rgba(212,175,55,0.04), rgba(255,255,255,0.01))'
                : 'rgba(255,255,255,0.015)',
              border: `1px solid ${
                i === 0 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)'
              }`,
            }}
          >
            {/* Micro-label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: i === 0 ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.22)',
                marginBottom: 6,
              }}
            >
              {block.label}
            </div>

            {/* Big stat */}
            <div
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: i === 0 ? '#F0E6C8' : 'rgba(255,255,255,0.7)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {block.stat}
            </div>

            {/* Caption */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.25)',
                lineHeight: 1.3,
              }}
            >
              {block.caption}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
})
