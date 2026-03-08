import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Clock, RotateCcw } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The ONE star element on the page
//  Everything else is deliberately quiet so this stands out.
//  Static gold text. No animated shimmer. No floating orbs.
//  Generous padding. Tight letter-spacing at display sizes.
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const GUARANTEES = [
  { icon: ShieldCheck, text: 'Антиплагиат от 70%' },
  { icon: Clock, text: 'Сдадим точно в срок' },
  { icon: RotateCcw, text: '3 правки бесплатно' },
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          width: '100%',
          padding: '32px 24px 24px',
          borderRadius: 24,
          marginBottom: 24,
          overflow: 'hidden',
          isolation: 'isolate',
          textAlign: 'left',
        }}
      >
        <div className={s.primaryActionGlow} aria-hidden="true" />
        <div className={s.primaryActionShine} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.5)',
              marginBottom: 16,
            }}
          >
            Академический Салун
          </div>

          {/* Headline — static warm gold, no animation */}
          <div
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(34px, 9vw, 44px)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Сделаем{'\n'}за тебя
          </div>

          <div
            style={{
              color: 'rgba(255,255,255,0.50)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 10+ видов работ
          </div>

          {/* Guarantee pills — more space, less cramped */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 24,
            }}
          >
            {GUARANTEES.map((g) => {
              const Icon = g.icon
              return (
                <div
                  key={g.text}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon size={12} color="rgba(212,175,55,0.6)" strokeWidth={2.2} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {g.text}
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
            <span>Узнать стоимость</span>
            <div className={s.primaryActionArrow}>
              <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
            </div>
          </motion.button>

          {/* Reassurance */}
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Оплата только после согласования деталей
          </div>
        </div>
      </motion.section>
    )
  }

  // ── Returning user: compact CTA ──
  return (
    <motion.section
      className={`${s.voidGlass} ${s.primaryActionCard} ${s.returningOrderActionCard}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: '18px 18px 18px 20px',
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
          gap: 12,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
        }}
      >
        <div>
          <div
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: 3,
            }}
          >
            Новый заказ
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
            Любая работа · от 1 дня
          </div>
        </div>
        <div className={s.primaryActionArrow} style={{ flexShrink: 0 }}>
          <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
        </div>
      </motion.button>
    </motion.section>
  )
})
