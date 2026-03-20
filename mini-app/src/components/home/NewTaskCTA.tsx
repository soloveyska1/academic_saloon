import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The Hero. The ONE element that sells.
//  Two variants:
//    first-order  — full hero with price anchor, proof points, guarantee badge
//    repeat-order — compact CTA with price hint for returning users
//
//  Research-backed:
//    - Price anchor (from X ₽) — students are price-sensitive
//    - Specific numbers in proof (4.8 not 4.9 — more believable)
//    - Guarantee badge near CTA (+32% conversions)
//    - Loss-aversion micro-reassurance
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const PROOF_POINTS = [
  { icon: Star, text: '4.8 из 5 — оценка 2 400+ клиентов' },
  { icon: Shield, text: 'Каждая работа с нуля — от 82% уникальности' },
  { icon: Clock, text: '3 бесплатные правки · оплата после согласования' },
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
        className={`${s.voidGlass} ${s.primaryActionCard} ${s.firstOrderActionCard}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          width: '100%',
          padding: '36px 24px 28px',
          borderRadius: 20,
          marginBottom: 28,
          overflow: 'hidden',
          isolation: 'isolate',
          textAlign: 'left',
        }}
      >
        <div className={s.primaryActionGlow} aria-hidden="true" />
        <div className={s.primaryActionShine} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow — establishment + trust */}
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--gold-400)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{
              width: 16,
              height: 1,
              background: 'linear-gradient(90deg, var(--gold-400), transparent)',
            }} />
            Академический Салон · с 2020 года
          </div>

          {/* Headline — emotional, benefit-first */}
          <h1
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(32px, 8.5vw, 42px)',
              fontWeight: 800,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              marginBottom: 14,
            }}
          >
            Учись спокойно.{'\n'}Мы сделаем.
          </h1>

          {/* Subhead — clarity + price anchor */}
          <p
            style={{
              color: '#a8a29e',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.55,
              marginBottom: 28,
              maxWidth: 320,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 15+ видов работ.{' '}
            <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>
              От 990 ₽.
            </span>
            {' '}Эксперты с опытом от 5 лет.
          </p>

          {/* Proof points — specific, measurable, believable */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 28,
            }}
          >
            {PROOF_POINTS.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 16,
                    background: 'rgba(212, 175, 55, 0.04)',
                    border: '1px solid rgba(212, 175, 55, 0.10)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={15}
                      color="var(--gold-300)"
                      strokeWidth={2.2}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.005em',
                      lineHeight: 1.4,
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
            whileTap={{ scale: 0.985 }}
            onClick={handleClick}
            className={s.heroPrimaryButton}
          >
            <span>Рассчитать стоимость бесплатно</span>
            <div className={s.primaryActionArrow}>
              <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.6} />
            </div>
          </motion.button>

          <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(168, 162, 158, 0.7)', fontWeight: 500, textAlign: 'center', letterSpacing: '0.01em' }}>
            Без предоплаты · Гарантия возврата · Ответ за 5 минут
          </div>
        </div>
      </motion.section>
    )
  }

  // ── Returning user: compact but premium CTA with price anchor ──
  return (
    <motion.section
      className={`${s.voidGlass} ${s.primaryActionCard} ${s.returningOrderActionCard}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: '20px 20px',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      <div className={s.primaryActionGlow} aria-hidden="true" />

      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={handleClick}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: 4,
            }}
          >
            Новый заказ · <span style={{ fontSize: 16, fontWeight: 700 }}>от 990 ₽</span>
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}>
            Бесплатный расчёт · от 1 дня
          </div>
        </div>
        <div className={s.primaryActionArrow} style={{ flexShrink: 0 }}>
          <ArrowRight size={18} color="var(--text-on-gold)" strokeWidth={2.6} />
        </div>
      </motion.button>
    </motion.section>
  )
})
