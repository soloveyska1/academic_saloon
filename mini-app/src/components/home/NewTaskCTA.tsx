import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'
import { GoldText, LiquidGoldButton } from '../ui/GoldText'
import { Reveal } from '../ui/StaggerReveal'

interface NewTaskCTAProps {
  onClick: () => void
  onUrgent?: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
  embedded?: boolean
}

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  onUrgent,
  haptic,
  variant = 'repeat-order',
  embedded = false,
}: NewTaskCTAProps) {
  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }
  const handleUrgent = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptic?.('medium')
    onUrgent?.()
  }

  // ═══ First-order hero — elegant, restrained, luxurious ═══
  if (variant === 'first-order') {
    return (
      <Reveal animation="spring" delay={0.1}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            marginBottom: 20,
            overflow: 'hidden',
            borderRadius: 12,
            background: 'linear-gradient(155deg, rgba(22,18,10,0.98) 0%, rgba(10,10,11,0.99) 100%)',
            border: '1px solid rgba(212,175,55,0.10)',
          }}
        >
          {/* Subtle gold ambient glow — top right only */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -80,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top gold accent line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.20), transparent)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: '32px 20px 24px' }}>
            {/* Eyebrow — small, quiet */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.45)',
                marginBottom: 16,
              }}
            >
              Академический Салон
            </div>

            {/* Headline — two lines, elegant serif, not screaming */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 'clamp(24px, 6.5vw, 32px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                }}
              >
                Работы под ключ.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 'clamp(24px, 6.5vw, 32px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                }}
              >
                <GoldText
                  variant="liquid"
                  weight={700}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                  }}
                >
                  Точно в срок.
                </GoldText>
              </div>
            </div>

            {/* Subhead — compact */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                marginBottom: 24,
                maxWidth: 300,
              }}
            >
              Курсовые, дипломы, рефераты — от{' '}
              <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}>990 ₽</span>.
              {' '}Расчёт за 5 минут.
            </div>

            {/* CTA button */}
            <LiquidGoldButton onClick={handleClick} icon={<ArrowRight size={18} />}>
              Рассчитать стоимость
            </LiquidGoldButton>

            {/* Micro-reassurance */}
            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textAlign: 'center',
                opacity: 0.5,
              }}
            >
              Бесплатно · без предоплаты · в чате
            </div>
          </div>
        </div>
      </Reveal>
    )
  }

  // ═══ Embedded variant — transparent, minimal ═══
  if (embedded) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.50)',
              marginBottom: 6,
            }}
          >
            Новый заказ
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Оформить работу
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
            Расчёт за 5 мин · от 990 ₽
          </div>
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.95), rgba(245,225,160,0.80))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 8px 20px -8px rgba(212,175,55,0.3)',
          }}
        >
          <ArrowRight size={18} color="#050505" strokeWidth={2.5} />
        </div>
      </motion.button>
    )
  }

  // ═══ Returning user — standalone CTA card with integrated urgent option ═══
  return (
    <Reveal animation="spring" delay={0.15}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 12,
          background: 'linear-gradient(155deg, rgba(22,18,10,0.97) 0%, rgba(10,10,11,0.99) 100%)',
          border: '1px solid rgba(212,175,55,0.10)',
          boxShadow: '0 16px 32px -24px rgba(0,0,0,0.7)',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gold glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -50,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Main CTA area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '20px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.50)',
                marginBottom: 6,
              }}
            >
              Новая работа
            </div>
            <GoldText
              variant="liquid"
              size="lg"
              weight={700}
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                display: 'block',
                marginBottom: 6,
              }}
            >
              Оформить заказ
            </GoldText>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              От 990 ₽ · расчёт за 5 минут
            </div>
          </div>

          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.95), rgba(245,225,160,0.80))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 12px 24px -12px rgba(212,175,55,0.35)',
            }}
          >
            <ArrowRight size={18} color="#050505" strokeWidth={2.5} />
          </div>
        </div>

        {/* Urgent chip — inline at bottom */}
        {onUrgent && (
          <div style={{
            padding: '0 20px 16px',
            position: 'relative',
            zIndex: 1,
          }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleUrgent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.14)',
                cursor: 'pointer',
                appearance: 'none' as const,
              }}
            >
              <Zap size={12} strokeWidth={2.2} style={{ color: 'var(--gold-400)' }} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--gold-300)',
              }}>
                Срочный
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
                · оценка за 5 мин
              </span>
            </motion.button>
          </div>
        )}
      </motion.div>
    </Reveal>
  )
})
