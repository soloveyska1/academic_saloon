import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareText,
  CreditCard,
  FileCheck,
  Zap,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE ONBOARDING — New user conversion section
//
//  1. Live Activity Feed — auto-cycling ticker showing "live" orders
//  2. How It Works — 3-step visual flow (compact, selling, premium)
//
//  Psychology: social proof (others are ordering NOW) → simplicity
//  (only 3 steps) → action (CTA is above this, already visible)
// ═══════════════════════════════════════════════════════════════════════════

// ── Live Activity Feed Data ──
// Randomized pool of work types + subjects for the ticker
const WORK_TYPES = [
  'Курсовая',
  'Дипломная',
  'Реферат',
  'Контрольная',
  'Эссе',
  'Отчёт по практике',
  'Диссертация',
  'Презентация',
  'Доклад',
  'Лабораторная',
] as const

const SUBJECTS = [
  'Экономика',
  'Менеджмент',
  'Право',
  'Маркетинг',
  'Финансы',
  'Психология',
  'Педагогика',
  'Социология',
  'Информатика',
  'Бухучёт',
  'Логистика',
  'Философия',
  'Политология',
  'Медицина',
  'Культурология',
] as const

const TIMESTAMPS = [
  'только что',
  '1 мин назад',
  '2 мин назад',
  '3 мин назад',
  '5 мин назад',
] as const

function generateFeedItem() {
  const type = WORK_TYPES[Math.floor(Math.random() * WORK_TYPES.length)]
  const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)]
  const time = TIMESTAMPS[Math.floor(Math.random() * TIMESTAMPS.length)]
  return { type, subject, time, id: Math.random() }
}

// ── How It Works Steps ──
const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Опишите задачу',
    detail: 'Тема, сроки, требования',
  },
  {
    icon: CreditCard,
    title: 'Согласуйте цену',
    detail: 'Оплата после обсуждения',
  },
  {
    icon: FileCheck,
    title: 'Получите работу',
    detail: 'С проверкой и правками',
  },
] as const

// ═══════════════════════════════════════════════════════════════════════════
//  LIVE ACTIVITY FEED — Auto-cycling ticker
// ═══════════════════════════════════════════════════════════════════════════

const LiveActivityFeed = memo(function LiveActivityFeed() {
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
    // First cycle after a short delay, then every 4s
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
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Zap
                  size={12}
                  color="rgba(212,175,55,0.5)"
                  strokeWidth={2.2}
                  style={{ flexShrink: 0 }}
                />
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
                  <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 5px' }}>·</span>
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                    {item.subject}
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

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step compact flow
// ═══════════════════════════════════════════════════════════════════════════

const HowItWorks = memo(function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 14,
        }}
      >
        Как это работает
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.34 + i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {/* Step number + icon */}
              <div
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="rgba(212,175,55,0.7)" strokeWidth={2} />
                {/* Step number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.2)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'rgba(212,175,55,0.9)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              {/* Text */}
              <div style={{ paddingTop: 2 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.2,
                    marginBottom: 2,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.35)',
                    lineHeight: 1.3,
                  }}
                >
                  {step.detail}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const EmptyStateOnboarding = memo(function EmptyStateOnboarding() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <LiveActivityFeed />
      <HowItWorks />
    </div>
  )
})
