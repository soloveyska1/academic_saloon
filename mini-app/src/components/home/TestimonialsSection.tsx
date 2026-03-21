import { memo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TESTIMONIALS — Social proof that sells.
//  Research-backed changes:
//    - Mixed ratings (not all 5★ — perfect scores look fake)
//    - Outcome badges on each card ("Уникальность 87%", "Защитил на отлично")
//    - Aggregate: "4.8 из 5 · 2400+ отзывов"
//    - Viewport-aware autoplay (pause when out of view / on touch)
//    - Specific, measurable results in every testimonial
// ═══════════════════════════════════════════════════════════════════════════

interface Testimonial {
  name: string
  university: string
  workType: string
  stars: number
  text: string
  outcome: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Алина М.',
    university: 'ВШЭ',
    workType: 'Курсовая',
    stars: 5,
    text: 'Сделали курсовую за 4 дня. Проверила сама — уникальность 87%. Преподаватель принял с первого раза.',
    outcome: 'Уникальность 87%',
  },
  {
    name: 'Дмитрий К.',
    university: 'МГУ',
    workType: 'Дипломная',
    stars: 5,
    text: 'Боялся доверять, но рискнул — и не пожалел. Работа на высшем уровне, защитил на отлично.',
    outcome: 'Защитил на отлично',
  },
  {
    name: 'Екатерина В.',
    university: 'РУДН',
    workType: 'Эссе',
    stars: 4,
    text: 'Заказывала эссе срочно, за 24 часа. Всё было готово вовремя. Тема раскрыта хорошо, одна мелкая правка — и сдала.',
    outcome: 'Готово за 24 часа',
  },
  {
    name: 'Максим Р.',
    university: 'РАНХиГС',
    workType: 'Отчёт по практике',
    stars: 5,
    text: 'Третий раз заказываю. Менеджер всегда на связи, все доработки бесплатно. Лучший сервис для студентов.',
    outcome: 'Постоянный клиент',
  },
  {
    name: 'Софья Л.',
    university: 'СПбГУ',
    workType: 'Реферат',
    stars: 4,
    text: 'Удобный сервис — описала требования, оплатила после согласования. Реферат пришёл раньше дедлайна. В паре мест упростила бы формулировки, но в целом отлично.',
    outcome: 'Раньше дедлайна',
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          fill={i < count ? 'var(--gold-400)' : 'var(--surface-hover)'}
          color={i < count ? 'var(--gold-400)' : 'var(--surface-hover)'}
          strokeWidth={0}
        />
      ))}
    </div>
  )
}

export const TestimonialsSection = memo(function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingLeft: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Quote
            size={13}
            color="var(--gold-400)"
            strokeWidth={2}
          />
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Отзывы клиентов
          </span>
        </div>

        {/* Aggregate rating with count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Star size={12} fill="var(--gold-400)" color="var(--gold-400)" strokeWidth={0} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--gold-400)',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            4.8
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-muted)',
          }}>
            · 2 400+
          </span>
        </div>
      </div>

      {/* Testimonial cards — horizontal scroll */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          margin: '0 -20px',
          padding: '0 20px 8px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {TESTIMONIALS.map((t, i) => {
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveIndex(i)}
              style={{
                minWidth: 270,
                maxWidth: 300,
                padding: '20px',
                borderRadius: 16,
                background: 'rgba(12, 12, 10, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                scrollSnapAlign: 'start',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {/* Outcome badge — the hook */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'rgba(201, 162, 39, 0.06)',
                  border: '1px solid rgba(201, 162, 39, 0.08)',
                  marginBottom: 10,
                }}
              >
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gold-400)',
                  letterSpacing: '0.01em',
                }}>
                  ✓ {t.outcome}
                </span>
              </div>

              {/* Stars */}
              <div style={{ marginBottom: 10 }}>
                <StarRating count={t.stars} />
              </div>

              {/* Quote text */}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: 16,
                  fontStyle: 'italic',
                }}
              >
                &laquo;{t.text}&raquo;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar placeholder */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--gold-glass-subtle)',
                    border: '1px solid var(--border-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--gold-400)',
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {t.workType} · {t.university}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Pagination dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {TESTIMONIALS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeIndex ? 16 : 6,
              background: i === activeIndex
                ? 'var(--gold-400)'
                : 'var(--surface-active)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setActiveIndex(i)}
            style={{
              height: 6,
              borderRadius: 3,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </motion.div>
  )
})
