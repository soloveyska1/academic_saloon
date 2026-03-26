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
            marginBottom: 24,
            overflow: 'hidden',
            borderRadius: 12,
            background: 'linear-gradient(155deg, rgba(22,18,10,0.98) 0%, rgba(14,13,10,0.99) 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
            boxShadow: '0 4px 24px -8px rgba(0,0,0,0.6), 0 1px 0 rgba(212,175,55,0.04) inset',
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

          <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 32px' }}>
            {/* Eyebrow — small, quiet */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.65)',
                marginBottom: 16,
              }}
            >
              Первый заказ
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
                  Работы под ключ.
                </GoldText>
              </div>
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
                Точно в срок.
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
              Курсовые, дипломные, научные работы.
              {' '}Индивидуально, без шаблонов.
            </div>

            {/* CTA button */}
            <div style={{ position: 'relative' }}>
              {/* Breathing gold glow behind CTA */}
              <motion.div
                aria-hidden="true"
                animate={{ opacity: [0, 0.12, 0], scale: [0.97, 1.02, 0.97] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: -6, borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(191,149,63,0.15))',
                  filter: 'blur(12px)', pointerEvents: 'none',
                }}
              />
              <LiquidGoldButton onClick={handleClick} icon={<ArrowRight size={18} />}>
                Узнать стоимость
              </LiquidGoldButton>
            </div>

            {/* Micro-reassurance */}
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: 'rgba(212,175,55,0.50)',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Бесплатный расчёт за 2 минуты
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
            Расчёт за 2 мин · от 990 ₽
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

  // ═══ Returning user — premium unified CTA ═══
  return (
    <Reveal animation="spring" delay={0.15}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 12,
          background: 'linear-gradient(160deg, rgba(27,22,12,0.95) 0%, rgba(16,14,10,0.98) 50%, rgba(12,11,9,1) 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
          boxShadow: 'var(--card-shadow), inset 0 1px 0 rgba(212,175,55,0.06)',
          cursor: 'pointer',
          textAlign: 'left',
          overflow: 'hidden',
        }}
      >
        {/* Top gold accent line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
          }}
        />

        {/* Ambient glow — top right */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Main CTA content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '20px 20px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 'var(--ls-caps)',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.60)',
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
              Узнать стоимость
            </GoldText>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              От 990 ₽ · расчёт за 2 минуты
            </div>
          </div>

          {/* Directional hint — subtle chevron, not a separate button */}
          <ArrowRight
            size={20}
            strokeWidth={2}
            style={{
              color: 'var(--gold-400)',
              opacity: 0.4,
              flexShrink: 0,
            }}
          />
        </div>

        {/* Urgent option — proper secondary row with divider */}
        {onUrgent && (
          <>
            <div
              aria-hidden="true"
              style={{
                margin: '0 20px',
                height: 1,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.06), rgba(212,175,55,0.10), rgba(212,175,55,0.06))',
              }}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleUrgent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left' as const,
                appearance: 'none' as const,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--gold-glass-subtle)',
                  border: '1px solid rgba(212,175,55,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={14} strokeWidth={2.2} color="var(--gold-400)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-300)' }}>
                  Срочный заказ
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 6 }}>
                  за 24ч
                </span>
              </div>
              <ArrowRight size={14} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </motion.button>
          </>
        )}
      </motion.div>
    </Reveal>
  )
})
