import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Clock, RotateCcw } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The primary conversion element
//
//  first-order:  Full hero with integrated guarantee trio, premium gold
//  repeat-order: Compact one-line CTA
//
//  Design: cohesive gold card, no clashing colors, guarantees woven in
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
          padding: '28px 22px 22px',
          borderRadius: 28,
          marginBottom: 16,
          overflow: 'hidden',
          border: '1px solid rgba(212,175,55,0.18)',
          isolation: 'isolate',
          textAlign: 'left',
        }}
      >
        <div className={s.primaryActionGlow} aria-hidden="true" />
        <div className={s.primaryActionShine} aria-hidden="true" />
        <div className={s.primaryActionOrb} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ── Eyebrow: serif, premium, no clashing colors ── */}
          <div
            style={{
              fontFamily: "var(--font-serif, 'Cinzel', serif)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.6)',
              marginBottom: 14,
            }}
          >
            Академический Салун
          </div>

          {/* ── Main headline ── */}
          <div
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(30px, 8vw, 38px)',
              fontWeight: 800,
              lineHeight: 1.0,
              marginBottom: 12,
            }}
          >
            Сделаем{'\n'}за тебя
          </div>

          <div
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.45,
              marginBottom: 22,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 10+ видов работ
          </div>

          {/* ── Guarantee trio: inline, subtle, gold-themed ── */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 20,
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
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.12)',
                  }}
                >
                  <Icon size={12} color="rgba(212,175,55,0.7)" strokeWidth={2.2} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.55)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {g.text}
                  </span>
                </div>
              )
            })}
          </div>

          {/* ── Primary CTA ── */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={handleClick}
            className={s.heroPrimaryButton}
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
              borderColor: 'rgba(212,175,55,0.25)',
            }}
          >
            <span>Узнать стоимость</span>
            <div className={s.primaryActionArrow}>
              <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
            </div>
          </motion.button>

          {/* ── Reassurance under CTA ── */}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: 'rgba(255,255,255,0.28)',
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
        borderRadius: 22,
        marginBottom: 16,
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.12)',
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
              marginBottom: 3,
            }}
          >
            Новый заказ
          </div>
          <div style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>
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
