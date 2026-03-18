import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Star, Shield, Clock } from 'lucide-react'
import { useThemeValue } from '../../contexts/ThemeContext'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The Hero. The ONE element that sells.
//  Quiet luxury: warm gold, generous whitespace, zero noise.
//  Copy: benefit-first, fear-eliminating, action-driving.
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const PROOF_POINTS = [
  { icon: Star, text: '4.9 из 5 — оценка клиентов' },
  { icon: Shield, text: 'Каждая работа — с нуля' },
  { icon: Clock, text: '3 раунда правок бесплатно' },
] as const

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  haptic,
  variant = 'repeat-order',
}: NewTaskCTAProps) {
  const theme = useThemeValue()
  const isDark = theme === 'dark'

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
          padding: '36px 24px 28px',
          borderRadius: 24,
          marginBottom: 28,
          overflow: 'hidden',
          isolation: 'isolate',
          textAlign: 'left',
        }}
      >
        <div className={s.primaryActionGlow} aria-hidden="true" />
        <div className={s.primaryActionShine} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Eyebrow — establishment */}
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(212,175,55,0.55)' : 'rgba(158,122,26,0.6)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{
              width: 16,
              height: 1,
              background: isDark
                ? 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)'
                : 'linear-gradient(90deg, rgba(158,122,26,0.5), transparent)',
            }} />
            Академический Салон
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

          {/* Subhead — clarity + scope */}
          <p
            style={{
              color: isDark ? 'rgba(255,255,255,0.48)' : 'rgba(87,83,78,0.75)',
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1.55,
              marginBottom: 28,
              maxWidth: 300,
            }}
          >
            Курсовые, дипломы, рефераты и ещё 15+ видов работ.
            Эксперты с опытом от 5 лет.
          </p>

          {/* Proof points — elegant, not cramped */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
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
                    gap: 10,
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(180,142,38,0.04)',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.05)'
                      : '1px solid rgba(120,85,40,0.08)',
                  }}
                >
                  <Icon
                    size={14}
                    color={isDark ? 'rgba(212,175,55,0.65)' : 'rgba(158,122,26,0.7)'}
                    strokeWidth={2}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(87,83,78,0.8)',
                      letterSpacing: '-0.005em',
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
              <ArrowRight size={18} color={isDark ? '#09090b' : '#09090b'} strokeWidth={2.6} />
            </div>
          </motion.button>

          {/* Micro-reassurance — eliminates last objection */}
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(120,113,108,0.5)',
              fontWeight: 500,
              textAlign: 'center',
              letterSpacing: '0.01em',
            }}
          >
            Без предоплаты · Ответ за 5 минут
          </div>
        </div>
      </motion.section>
    )
  }

  // ── Returning user: compact but premium CTA ──
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
            Новый заказ
          </div>
          <div style={{
            fontSize: 13,
            color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(87,83,78,0.65)',
            fontWeight: 500,
          }}>
            Любой тип работы · от 1 дня · бесплатный расчёт
          </div>
        </div>
        <div className={s.primaryActionArrow} style={{ flexShrink: 0 }}>
          <ArrowRight size={18} color={isDark ? '#09090b' : '#09090b'} strokeWidth={2.6} />
        </div>
      </motion.button>
    </motion.section>
  )
})
