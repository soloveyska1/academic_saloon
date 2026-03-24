import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock } from 'lucide-react'
import { GoldText, GoldBadge, LiquidGoldButton } from '../ui/GoldText'
import { Reveal } from '../ui/StaggerReveal'

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
  embedded?: boolean
}

const PROOF_ITEMS = [
  { icon: Star, text: '4.8 · 2 400+', color: 'var(--gold-400)' },
  { icon: Shield, text: '82%+ оригинал', color: 'var(--gold-400)' },
  { icon: Clock, text: '3 правки', color: 'var(--gold-400)' },
] as const

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  haptic,
  variant = 'repeat-order',
  embedded = false,
}: NewTaskCTAProps) {
  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  // ── First-order hero variant ──
  if (variant === 'first-order') {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          marginBottom: 20,
          overflow: 'hidden',
          borderRadius: 12,
        }}
      >
        {/* Full-bleed gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(155deg, #1a150a 0%, #0f0f10 40%, #0a0a0b 100%)',
          }}
        />

        {/* Large decorative gold orb - top right */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -100,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 40%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Secondary orb - bottom left */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -80,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top gold accent line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.25) 50%, transparent 90%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '36px 24px 28px',
          }}
        >
          {/* Eyebrow badge */}
          <Reveal animation="spring" delay={0.1}>
            <div style={{ marginBottom: 20 }}>
              <GoldBadge>Академический Салон</GoldBadge>
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal animation="spring" delay={0.15}>
            <div style={{ marginBottom: 12 }}>
              <GoldText
                variant="shimmer"
                size="3xl"
                weight={700}
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                }}
              >
                Работы под ключ.
                <br />
                Точно в срок.
              </GoldText>
            </div>
          </Reveal>

          {/* Subhead */}
          <Reveal animation="spring" delay={0.2}>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
                marginBottom: 24,
                maxWidth: 320,
              }}
            >
              Курсовые, дипломы, рефераты и ещё 15+ форматов.{' '}
              <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}>
                От 990 ₽
              </span>
            </p>
          </Reveal>

          {/* Proof pills */}
          <Reveal animation="spring" delay={0.25}>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 28,
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
                      gap: 5,
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon size={12} color={p.color} strokeWidth={2.2} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
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
          </Reveal>

          {/* CTA button */}
          <Reveal animation="spring" delay={0.3}>
            <LiquidGoldButton
              onClick={handleClick}
              icon={<ArrowRight size={18} />}
            >
              Рассчитать стоимость
            </LiquidGoldButton>
          </Reveal>

          {/* Micro-reassurance */}
          <Reveal animation="spring" delay={0.4}>
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textAlign: 'center' as const,
                opacity: 0.6,
              }}
            >
              Бесплатный расчёт · без предоплаты · ответ за 5 минут
            </div>
          </Reveal>
        </div>
      </div>
    )
  }

  // ── Embedded variant (transparent, no background) ──
  if (embedded) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          padding: 0,
          marginBottom: 0,
          background: 'transparent',
        }}
      >
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
            appearance: 'none' as const,
            textAlign: 'left' as const,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.50)',
                marginBottom: 6,
              }}
            >
              Новый заказ
            </div>
            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Оформить работу
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              Расчёт за 5 мин, стоимость до оплаты
            </div>
          </div>

          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.82))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 20px -6px rgba(212, 175, 55, 0.25)',
            }}
          >
            <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.5} />
          </div>
        </motion.button>
      </div>
    )
  }

  // ── Returning user: standalone CTA card ──
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: 22,
        borderRadius: 12,
        marginBottom: 0,
        background: 'linear-gradient(155deg, rgba(25,20,10,0.98) 0%, rgba(12,12,13,0.97) 50%, rgba(8,8,10,1) 100%)',
        border: '1px solid rgba(212,175,55,0.12)',
        overflow: 'hidden',
        boxShadow: '0 24px 40px -34px rgba(0, 0, 0, 0.82)',
      }}
    >
      {/* Top gold shine line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.2) 50%, transparent 90%)',
        }}
      />

      {/* Decorative gold orb - top right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -60,
          right: -24,
          width: 170,
          height: 170,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 30%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

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
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          appearance: 'none' as const,
          textAlign: 'left' as const,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.55)',
              marginBottom: 8,
            }}
          >
            НОВАЯ РАБОТА
          </div>
          <div style={{ marginBottom: 10 }}>
            <GoldText
              variant="shimmer"
              size="xl"
              weight={700}
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
              }}
            >
              Оформить новую работу
            </GoldText>
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontWeight: 600,
              lineHeight: 1.45,
              marginBottom: 16,
            }}
          >
            Расчёт за 5 минут, стоимость известна до оплаты.
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['от 990 ₽', '5 минут', 'в чате'].map((item) => (
              <span
                key={item}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '7px 10px',
                  borderRadius: 999,
                  background: item === 'от 990 ₽' ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${item === 'от 990 ₽' ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.06)'}`,
                  fontSize: 10,
                  fontWeight: 700,
                  color: item === 'от 990 ₽' ? 'var(--gold-300)' : 'var(--text-secondary)',
                  letterSpacing: '0.03em',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Gold arrow button */}
        <LiquidGoldButton
          fullWidth={false}
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
          style={{
            width: 48,
            height: 48,
            padding: 0,
            borderRadius: '50%',
            flexShrink: 0,
          }}
        >
          <ArrowRight size={18} strokeWidth={2.5} />
        </LiquidGoldButton>
      </motion.button>
    </motion.section>
  )
})
