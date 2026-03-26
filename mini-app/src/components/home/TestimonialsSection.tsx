import { memo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Star, ShieldCheck, BookOpen, GraduationCap, PenTool, FileText, Calculator, Presentation } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Data ───

interface Testimonial {
  workType: string
  icon: LucideIcon
  text: string
  outcome: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    workType: 'Курсовая',
    icon: BookOpen,
    text: 'Сделали за 4 дня. Уникальность 87%. Преподаватель принял с первого раза.',
    outcome: 'Уникальность 87%',
  },
  {
    workType: 'Дипломная',
    icon: GraduationCap,
    text: 'Работа на высшем уровне. Защитил на отлично. Рекомендую.',
    outcome: 'Защитил на отлично',
  },
  {
    workType: 'Эссе',
    icon: PenTool,
    text: 'Заказывала срочно, за 24 часа. Всё готово вовремя. Одна правка — и сдала.',
    outcome: 'Готово за 24ч',
  },
  {
    workType: 'Реферат',
    icon: FileText,
    text: 'Оформили по ГОСТу за 2 дня. Преподаватель доволен, приняли без замечаний.',
    outcome: 'По ГОСТу',
  },
  {
    workType: 'Контрольная',
    icon: Calculator,
    text: 'Решили 15 задач по матанализу. Все правильно, проверяла сама.',
    outcome: '15 задач',
  },
  {
    workType: 'Презентация',
    icon: Presentation,
    text: '30 слайдов с дизайном за 3 дня. Выступил на отлично, преподаватель хвалил.',
    outcome: '30 слайдов',
  },
]

const EASE = [0.16, 1, 0.3, 1] as unknown as number[]
const CARD_WIDTH = 280
const CARD_GAP = 12

// ─── Component ───

export const TestimonialsSection = memo(function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const constraintsRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 50
    const velocityThreshold = 300
    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      setActiveIndex(prev => Math.min(prev + 1, TESTIMONIALS.length - 1))
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      setActiveIndex(prev => Math.max(prev - 1, 0))
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingLeft: 2,
        }}
      >
        <Star size={12} color="var(--gold-400)" strokeWidth={2} fill="var(--gold-400)" />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Отзывы
        </span>
      </div>

      {/* Carousel container */}
      <div ref={constraintsRef} style={{ overflow: 'hidden', margin: '0 -20px', padding: '0 20px' }}>
        <motion.div
          drag="x"
          dragConstraints={{ left: -(TESTIMONIALS.length - 1) * (CARD_WIDTH + CARD_GAP), right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          animate={{ x: -activeIndex * (CARD_WIDTH + CARD_GAP) }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            display: 'flex',
            gap: CARD_GAP,
            cursor: 'grab',
          }}
        >
          {TESTIMONIALS.map((t, i) => {
            const TypeIcon = t.icon
            return (
              <motion.div
                key={t.workType}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: EASE }}
                style={{
                  width: CARD_WIDTH,
                  flexShrink: 0,
                  padding: 20,
                  borderRadius: 16,
                  background: '#0E0D0C',
                  border: '1px solid rgba(212,175,55,0.08)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top shine line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                  background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.10) 50%, transparent 90%)',
                  pointerEvents: 'none',
                }} />

                {/* Outcome badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 8, marginBottom: 12,
                  background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.10)',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--gold-400)',
                  }}>
                    ✓ {t.outcome}
                  </span>
                </div>

                {/* Quote text */}
                <p style={{
                  fontSize: 14, fontWeight: 500, lineHeight: 1.6,
                  color: 'var(--text-secondary)', marginBottom: 14,
                }}>
                  {t.text}
                </p>

                {/* Bottom row: work type pill + verified badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20,
                    background: 'rgba(212,175,55,0.05)',
                  }}>
                    <TypeIcon size={12} strokeWidth={1.8} color="var(--gold-400)" />
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: 'rgba(212,175,55,0.65)',
                    }}>
                      {t.workType}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={12} color="rgba(212,175,55,0.40)" strokeWidth={1.8} />
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.30)',
                    }}>
                      Проверенный
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14,
      }}>
        {TESTIMONIALS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeIndex ? 18 : 6,
              background: i === activeIndex ? 'var(--gold-400, #D4AF37)' : 'rgba(255,255,255,0.12)',
            }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{
              height: 6, borderRadius: 3,
              cursor: 'pointer',
            }}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
    </motion.div>
  )
})
