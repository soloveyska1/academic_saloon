import { memo } from 'react'
import { Star, Quote } from 'lucide-react'
import { StaggerReveal } from '../ui/StaggerReveal'
import { TiltCard } from '../ui/TiltCard'

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
    text: 'Сделали за 4 дня. Уникальность 87%. Преподаватель принял с первого раза.',
    outcome: 'Уникальность 87%',
  },
  {
    name: 'Дмитрий К.',
    university: 'МГУ',
    workType: 'Дипломная',
    stars: 5,
    text: 'Работа на высшем уровне. Защитил на отлично. Рекомендую.',
    outcome: 'Защитил на отлично',
  },
  {
    name: 'Екатерина В.',
    university: 'РУДН',
    workType: 'Эссе',
    stars: 4,
    text: 'Заказывала срочно, за 24 часа. Всё готово вовремя. Одна правка — и сдала.',
    outcome: 'Готово за 24ч',
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={10}
          fill={i < count ? 'var(--gold-400)' : 'rgba(255,255,255,0.06)'}
          color={i < count ? 'var(--gold-400)' : 'rgba(255,255,255,0.06)'}
          strokeWidth={0}
        />
      ))}
    </div>
  )
}

export const TestimonialsSection = memo(function TestimonialsSection() {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Quote size={12} color="var(--gold-400)" strokeWidth={2} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Отзывы
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star
            size={11}
            fill="var(--gold-400)"
            color="var(--gold-400)"
            strokeWidth={0}
          />
          <span
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-400)' }}
          >
            4.8
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            · 2 400+
          </span>
        </div>
      </div>

      {/* Testimonial cards */}
      <StaggerReveal
        direction="up"
        animation="spring"
        staggerDelay={0.06}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {TESTIMONIALS.map((t) => (
          <TiltCard key={t.name} tiltMaxAngle={3}>
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Top row: outcome badge + stars */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold-400)',
                    padding: '3px 8px',
                    borderRadius: 8,
                    background: 'rgba(201,162,39,0.05)',
                  }}
                >
                  ✓ {t.outcome}
                </span>
                <StarRating count={t.stars} />
              </div>

              {/* Quote */}
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.55,
                  marginBottom: 8,
                }}
              >
                «{t.text}»
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(201,162,39,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold-400)',
                  }}
                >
                  {t.name.charAt(0)}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.name} · {t.workType} · {t.university}
                </span>
              </div>
            </div>
          </TiltCard>
        ))}
      </StaggerReveal>
    </div>
  )
})
