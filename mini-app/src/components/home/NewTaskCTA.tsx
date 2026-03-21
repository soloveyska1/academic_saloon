import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock } from 'lucide-react'

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const PROOF_ITEMS = [
  { icon: Star, label: '4.8 · 2 400+ оценок' },
  { icon: Shield, label: '82%+ уникальности' },
  { icon: Clock, label: '3 правки бесплатно' },
] as const

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  haptic,
  variant = 'repeat-order',
}: NewTaskCTAProps) {
  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  if (variant === 'first-order') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          padding: '32px 20px 24px',
          borderRadius: 24,
          marginBottom: 24,
          background: 'var(--surface-base, rgba(12,12,10,0.95))',
          border: '1px solid rgba(201, 162, 39, 0.10)',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle top-right gold ambient */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 70%)',
            filter: 'blur(24px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-muted)',
              marginBottom: 16,
            }}
          >
            Академический Салон · с 2020 года
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(28px, 7vw, 36px)',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 12,
            }}
          >
            Учись спокойно.{'\n'}Мы сделаем.
          </h1>

          {/* Subhead with price anchor */}
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: 20,
              maxWidth: 300,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 15+ видов работ.{' '}
            <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>
              От 990 ₽.
            </span>
          </p>

          {/* Proof strip — compact, one line each */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            {PROOF_ITEMS.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(201, 162, 39, 0.06)',
                    border: '1px solid rgba(201, 162, 39, 0.08)',
                  }}
                >
                  <Icon
                    size={12}
                    color="var(--gold-400)"
                    strokeWidth={2.2}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Primary CTA */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              minHeight: 52,
              padding: '12px 14px 12px 20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--gold-500) 0%, var(--gold-400) 50%, var(--gold-300) 100%)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(201, 162, 39, 0.2)',
              color: 'var(--text-on-gold)',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textAlign: 'left' as const,
              cursor: 'pointer',
              appearance: 'none' as const,
            }}
          >
            <span>Рассчитать стоимость</span>
            <ArrowRight size={18} strokeWidth={2.5} />
          </motion.button>

          {/* Micro-reassurance */}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontWeight: 500,
              textAlign: 'center' as const,
              letterSpacing: '0.01em',
            }}
          >
            Бесплатно · без предоплаты · ответ за 5 мин
          </div>
        </div>
      </motion.section>
    )
  }

  // ── Returning user: compact CTA ──
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        background: 'var(--surface-base, rgba(12,12,10,0.95))',
        border: '1px solid rgba(201, 162, 39, 0.08)',
        boxShadow: '0 4px 12px -4px rgba(0, 0, 0, 0.3)',
      }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          appearance: 'none' as const,
          textAlign: 'left' as const,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Новый заказ · <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold-400)' }}>от 990 ₽</span>
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            Бесплатный расчёт · от 1 дня
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--gold-500), var(--gold-400))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(201, 162, 39, 0.15)',
          }}
        >
          <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.5} />
        </div>
      </motion.button>
    </motion.section>
  )
})
