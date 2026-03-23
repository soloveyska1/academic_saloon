import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock, Sparkles } from 'lucide-react'

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

  if (variant === 'first-order') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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

        {/* Large decorative gold orb — top right */}
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

        {/* Secondary orb — bottom left */}
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

        {/* Top shine line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.25) 30%, rgba(212,175,55,0.25) 70%, transparent 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '36px 24px 28px',
          }}
        >
          {/* Eyebrow with sparkle */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.14)',
              marginBottom: 20,
            }}
          >
            <Sparkles size={12} color="var(--gold-400)" strokeWidth={2} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--gold-300)',
              }}
            >
              Академический Салон
            </span>
          </motion.div>

          {/* Headline — big and bold */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="shimmer-text"
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 'clamp(32px, 8.5vw, 42px)',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              marginBottom: 12,
            }}
          >
            Работы под ключ.
            <br />
            Точно в срок.
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45 }}
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
          </motion.p>

          {/* Proof strip — refined pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
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
          </motion.div>

          {/* Primary CTA — gold gradient button */}
          <motion.button
            type="button"
            className="shine-sweep"
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            onClick={handleClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              height: 56,
              padding: '0 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--gold-600) 0%, var(--gold-400) 50%, var(--gold-300) 100%)',
              border: 'none',
              boxShadow: '0 12px 32px -8px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
              color: 'var(--text-on-gold)',
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              appearance: 'none' as const,
            }}
          >
            Рассчитать стоимость
            <ArrowRight size={18} strokeWidth={2.5} />
          </motion.button>

          {/* Micro-reassurance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontWeight: 600,
              textAlign: 'center' as const,
              letterSpacing: '0.02em',
            }}
          >
            Бесплатный расчёт · без предоплаты · ответ за 5 минут
          </motion.div>
        </div>
      </motion.section>
    )
  }

  if (embedded) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
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
            className="shine-sweep"
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
      </motion.section>
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
        background: 'linear-gradient(160deg, rgba(26, 20, 11, 0.96) 0%, rgba(14, 14, 15, 0.96) 46%, rgba(8, 8, 10, 1) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.10)',
        overflow: 'hidden',
        boxShadow: '0 24px 40px -34px rgba(0, 0, 0, 0.82)',
      }}
    >
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
              color: 'rgba(212, 175, 55, 0.72)',
              marginBottom: 8,
            }}
          >
            Новая работа
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 0.94,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              marginBottom: 10,
            }}
          >
            Оформить новый заказ
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            fontWeight: 600,
            lineHeight: 1.45,
            marginBottom: 16,
          }}>
            Расчёт за 5 минут, стоимость известна до оплаты.
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['от 990 ₽', '5 минут', 'в чате'].map((item) => (
              <span
                key={item}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '7px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.82))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 16px 28px -18px rgba(212, 175, 55, 0.4)',
          }}
        >
          <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.5} />
        </div>
      </motion.button>
    </motion.section>
  )
})
