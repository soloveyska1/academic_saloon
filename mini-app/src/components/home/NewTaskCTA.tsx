import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock } from 'lucide-react'

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const PROOF_ITEMS = [
  { icon: Star, text: '4.8 · 2 400+' },
  { icon: Shield, text: '82%+ оригинал' },
  { icon: Clock, text: '3 правки' },
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
          padding: '28px 20px 24px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 16,
          background: 'rgba(12, 12, 10, 0.85)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid rgba(201, 162, 39, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Subtle ambient glow — top-right only */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,162,39,0.04) 0%, transparent 70%)',
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
              marginBottom: 14,
            }}
          >
            Академический Салон
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px, 7vw, 34px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 10,
            }}
          >
            Учись спокойно.{'\n'}Мы сделаем.
          </h1>

          {/* Subhead */}
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: 16,
              maxWidth: 300,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 15+ видов работ.{' '}
            <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>
              От 990 ₽
            </span>
          </p>

          {/* Proof strip — compact inline badges */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 20,
            }}
          >
            {PROOF_ITEMS.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(201, 162, 39, 0.05)',
                  }}
                >
                  <Icon
                    size={11}
                    color="var(--gold-400)"
                    strokeWidth={2.2}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.text}
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
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              height: 52,
              padding: '0 20px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--gold-600) 0%, var(--gold-400) 50%, var(--gold-300) 100%)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(201, 162, 39, 0.15)',
              color: 'var(--text-on-gold)',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              appearance: 'none' as const,
            }}
          >
            Рассчитать стоимость
            <ArrowRight size={17} strokeWidth={2.5} />
          </motion.button>

          {/* Micro-reassurance */}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: 'var(--text-muted)',
              fontWeight: 500,
              textAlign: 'center' as const,
              opacity: 0.7,
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
        borderRadius: 'var(--radius-md)',
        marginBottom: 12,
        background: 'rgba(12, 12, 10, 0.85)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid rgba(201, 162, 39, 0.06)',
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
              fontFamily: 'var(--font-display)',
              fontSize: 17,
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
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--gold-600), var(--gold-400))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.5} />
        </div>
      </motion.button>
    </motion.section>
  )
})
