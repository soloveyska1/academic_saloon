import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Reveal } from '../ui/StaggerReveal'

interface WorkItem {
  subject: string
  workType: string
  progress: number
  status: 'writing' | 'checking' | 'formatting'
}

const STATUS_LABELS: Record<string, string> = {
  writing: 'Пишем',
  checking: 'Проверяем',
  formatting: 'Оформляем',
}

const ALL_ITEMS: WorkItem[] = [
  { subject: 'Макроэкономика', workType: 'Курсовая', progress: 89, status: 'checking' },
  { subject: 'Гражданское право', workType: 'Дипломная', progress: 45, status: 'writing' },
  { subject: 'Психология личности', workType: 'Реферат', progress: 97, status: 'formatting' },
  { subject: 'Финансовый менеджмент', workType: 'Курсовая', progress: 62, status: 'writing' },
  { subject: 'Теория вероятностей', workType: 'Эссе', progress: 34, status: 'writing' },
  { subject: 'Уголовное право', workType: 'Курсовая', progress: 78, status: 'checking' },
  { subject: 'Маркетинг', workType: 'Презентация', progress: 91, status: 'formatting' },
]

function shuffleForSession(items: WorkItem[]): WorkItem[] {
  const seed = Math.floor(Date.now() / (1000 * 60 * 30))
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3)
}

export const WorkInProgressFeed = memo(function WorkInProgressFeed() {
  const items = useMemo(() => shuffleForSession(ALL_ITEMS), [])
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const shouldReduceMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)

  const startRotation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (!paused) {
        setActiveIndex(prev => (prev + 1) % items.length)
      }
    }, 5000)
  }, [items.length, paused])

  useEffect(() => {
    startRotation()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startRotation])

  // Pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const item = items[activeIndex]

  return (
    <Reveal animation="fade" delay={0.1}>
      <div
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 4px 12px -4px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--gold-400)',
              }} />
              {!shouldReduceMotion && (
                <motion.div
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'var(--gold-400)',
                  }}
                />
              )}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.55)',
            }}>
              Сейчас в работе
            </span>
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {items.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === activeIndex ? 12 : 4,
                  height: 4,
                  borderRadius: 2,
                  background: i === activeIndex ? 'var(--gold-400)' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.3s var(--ease-out)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.workType} — {item.subject}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--gold-glass-subtle)',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--gold-400)',
                }} />
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--gold-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: 3,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, var(--gold-400), rgba(245,225,160,0.7))',
                  opacity: 0.7,
                }}
              />
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginTop: 4,
              textAlign: 'right',
            }}>
              {item.progress}%
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Reveal>
  )
})
