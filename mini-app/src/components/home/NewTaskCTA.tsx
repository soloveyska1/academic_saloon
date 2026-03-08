import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The primary conversion element
//
//  Two variants:
//  • first-order  — Hero mode: big headline, value proposition, trust stat
//  • repeat-order — Compact mode: direct CTA for returning users
//
//  Psychology: outcome-first headline, single action, zero friction
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

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
          padding: '28px 22px 24px',
          borderRadius: 28,
          marginBottom: 16,
          overflow: 'hidden',
          border: '1px solid rgba(212,175,55,0.16)',
          isolation: 'isolate',
          textAlign: 'left',
        }}
      >
        <div className={s.primaryActionGlow} aria-hidden="true" />
        <div className={s.primaryActionShine} aria-hidden="true" />
        <div className={s.primaryActionOrb} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Stat line — ambient social proof */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 999,
              marginBottom: 16,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              fontSize: 11,
              fontWeight: 700,
              color: '#4ade80',
              letterSpacing: '0.02em',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px rgba(74,222,128,0.6)',
              }}
            />
            Принимаем заказы
          </div>

          {/* Main headline — outcome-first, not process-first */}
          <div
            className={s.goldAccent}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(28px, 7vw, 36px)',
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: 10,
              maxWidth: 320,
            }}
          >
            Сделаем за тебя
          </div>

          <div
            style={{
              color: '#a1a1aa',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: 20,
              maxWidth: 300,
            }}
          >
            Курсовые, дипломы, рефераты и любые учебные задачи — с гарантией результата
          </div>

          {/* Primary CTA */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={handleClick}
            className={s.heroPrimaryButton}
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.06) 100%)',
              borderColor: 'rgba(212,175,55,0.3)',
            }}
          >
            <span>Оформить заказ</span>
            <div className={s.primaryActionArrow}>
              <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
            </div>
          </motion.button>
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
          <div
            style={{
              fontSize: 13,
              color: '#71717a',
              fontWeight: 500,
            }}
          >
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
