import { memo } from 'react'
import { Star, ShieldCheck } from 'lucide-react'
import { StaggerReveal } from '../ui/StaggerReveal'
import { TiltCard } from '../ui/TiltCard'

interface Testimonial {
  workType: string
  stars: number
  text: string
  outcome: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    workType: 'Курсовая',
    stars: 5,
    text: 'Сделали за 4 дня. Уникальность 87%. Преподаватель принял с первого раза.',
    outcome: 'Уникальность 87%',
  },
  {
    workType: 'Дипломная',
    stars: 5,
    text: 'Работа на высшем уровне. Защитил на отлично. Рекомендую.',
    outcome: 'Защитил на отлично',
  },
  {
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
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <Star size={12} color="var(--gold-400)" strokeWidth={2} fill="var(--gold-400)" />
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

      {/* Testimonial cards */}
      <StaggerReveal
        direction="up"
        animation="spring"
        staggerDelay={0.06}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {TESTIMONIALS.map((t) => (
          <TiltCard key={t.workType} tiltMaxAngle={3}>
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

              {/* Verified order badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck
                  size={13}
                  color="var(--gold-400)"
                  strokeWidth={1.8}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  Проверенный заказ · {t.workType}
                </span>
              </div>
            </div>
          </TiltCard>
        ))}
      </StaggerReveal>
    </div>
  )
})
