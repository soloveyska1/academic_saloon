import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TESTIMONIALS — Social proof that sells.
//  Real-feeling reviews from students. Auto-rotating carousel.
//  Stars + university + work type = believability.
// ═══════════════════════════════════════════════════════════════════════════

interface Testimonial {
  name: string
  university: string
  workType: string
  stars: number
  text: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Алина М.',
    university: 'ВШЭ',
    workType: 'Курсовая',
    stars: 5,
    text: 'Сделали курсовую за 4 дня. Проверила сама — уникальность 82%. Преподаватель принял с первого раза.',
  },
  {
    name: 'Дмитрий К.',
    university: 'МГУ',
    workType: 'Дипломная',
    stars: 5,
    text: 'Боялся доверять, но рискнул — и не пожалел. Работа на высшем уровне, защитил на отлично. Спасибо огромное!',
  },
  {
    name: 'Екатерина В.',
    university: 'РУДН',
    workType: 'Эссе',
    stars: 5,
    text: 'Заказывала эссе срочно, за 24 часа. Всё было готово вовремя. Качество превзошло ожидания, вернусь снова.',
  },
  {
    name: 'Максим Р.',
    university: 'РАНХИГС',
    workType: 'Отчёт по практике',
    stars: 5,
    text: 'Третий раз заказываю здесь. Менеджер всегда на связи, все доработки бесплатно. Лучший сервис для студентов.',
  },
  {
    name: 'Софья Л.',
    university: 'СПбГУ',
    workType: 'Реферат',
    stars: 5,
    text: 'Очень удобный сервис — написала требования, оплатила после согласования. Реферат пришёл раньше дедлайна.',
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={11} fill="var(--gold-400)" color="var(--gold-400)" strokeWidth={0} />
      ))}
    </div>
  )
}

export const TestimonialsSection = memo(function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const scrollRef = useRef<HTMLDivElement>(null)

  const resetAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
  }, [])

  useEffect(() => {
    resetAutoplay()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [resetAutoplay])

  // Scroll to active card
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const card = el.children[activeIndex] as HTMLElement
    if (!card) return
    el.scrollTo({
      left: card.offsetLeft - 20,
      behavior: 'smooth',
    })
  }, [activeIndex])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
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
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Отзывы клиентов
          </span>
        </div>

        {/* Aggregate rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <StarRating count={5} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--gold-400)',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            4.9
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
          const isActive = i === activeIndex
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              onClick={() => { setActiveIndex(i); resetAutoplay() }}
              style={{
                minWidth: 270,
                maxWidth: 300,
                padding: '20px',
                borderRadius: 18,
                background: isActive
                  ? 'var(--gold-glass-subtle)'
                  : 'var(--bg-card)',
                border: `1px solid ${isActive ? 'var(--border-gold)' : 'var(--border-subtle)'}`,
                scrollSnapAlign: 'start',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'border-color 0.3s, background 0.3s',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              {/* Stars */}
              <div style={{ marginBottom: 12 }}>
                <StarRating count={t.stars} />
              </div>

              {/* Quote text */}
              <p
                style={{
                  fontSize: 13,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              width: i === activeIndex ? 16 : 4,
              background: i === activeIndex
                ? 'var(--gold-400)'
                : 'var(--surface-active)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => { setActiveIndex(i); resetAutoplay() }}
            style={{
              height: 4,
              borderRadius: 2,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </motion.div>
  )
})
