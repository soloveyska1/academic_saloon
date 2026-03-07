import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const CTA_CONFIG = {
  'first-order': {
    eyebrow: 'ОСНОВНОЙ СЦЕНАРИЙ',
    title: 'Оформить первый заказ',
    subtitle: 'Полная заявка: сначала формат работы, затем детали и срок.',
    ctaLabel: 'Перейти к полной заявке',
    note: 'После отправки мы подтвердим детали, стоимость и дальнейшие шаги.',
  },
  'repeat-order': {
    eyebrow: 'ГЛАВНОЕ ДЕЙСТВИЕ',
    title: 'Оформить заказ',
    subtitle: 'Основной путь для новой работы, срочной задачи или доработки.',
    ctaLabel: 'Открыть полную заявку',
    note: 'После отправки заявки менеджер подтвердит детали и дальнейшие шаги.',
  },
} as const

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  haptic,
  variant = 'repeat-order',
}: NewTaskCTAProps) {
  const config = CTA_CONFIG[variant]

  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  return (
    <motion.section
      className={`${s.voidGlass} ${s.primaryActionCard} ${variant === 'first-order' ? s.firstOrderActionCard : s.returningOrderActionCard}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: '26px 22px 22px',
        borderRadius: '28px',
        marginBottom: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.16)',
        isolation: 'isolate',
        textAlign: 'left',
      }}
    >
      <div className={s.primaryActionGlow} aria-hidden="true" />
      <div className={s.primaryActionShine} aria-hidden="true" />
      <div className={s.primaryActionOrb} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1, marginBottom: 18 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(9, 9, 11, 0.58)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--gold-100)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#d4af37',
              boxShadow: '0 0 12px rgba(212,175,55,0.72)',
              flexShrink: 0,
            }}
          />
          {config.eyebrow}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          className={s.goldAccent}
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 'clamp(30px, 7vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.02,
            marginBottom: 12,
            maxWidth: 420,
          }}
        >
          {config.title}
        </div>

        <div
          style={{
            maxWidth: 470,
            color: '#d4d4d8',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '15px',
            fontWeight: 500,
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {config.subtitle}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={handleClick}
          className={s.heroPrimaryButton}
        >
          <span>{config.ctaLabel}</span>
          <div className={s.primaryActionArrow}>
            <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
          </div>
        </motion.button>

        <div className={s.heroFootnote}>{config.note}</div>
      </div>
    </motion.section>
  )
})
