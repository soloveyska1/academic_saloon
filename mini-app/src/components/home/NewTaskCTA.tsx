import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clock3,
  MessageCircleMore,
  Plus,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import s from '../../pages/HomePage.module.css'

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const CTA_CONFIG = {
  'first-order': {
    eyebrow: 'ПЕРВЫЙ СЦЕНАРИЙ',
    title: 'Первый заказ',
    subtitle: 'Опишите предмет, тему и срок. Остальное менеджер спокойно соберёт с вами уже после заявки.',
    ctaLabel: 'Открыть первую заявку',
    note: 'Без оплаты до согласования цены и деталей.',
    icon: Rocket,
    proofs: [
      { icon: Clock3, label: '3 поля без перегруза' },
      { icon: MessageCircleMore, label: 'Ответ в чате после отправки' },
      { icon: ShieldCheck, label: 'Файлы можно дослать позже' },
    ],
  },
  'repeat-order': {
    eyebrow: 'ГЛАВНОЕ ДЕЙСТВИЕ',
    title: 'Новый заказ',
    subtitle: 'Откройте ещё одну заявку, если нужна новая работа, срочная задача или доработка.',
    ctaLabel: 'Открыть новую заявку',
    note: 'Короткая форма, дальше всё сопровождает менеджер.',
    icon: Plus,
    proofs: [
      { icon: Clock3, label: 'Запуск за пару минут' },
      { icon: MessageCircleMore, label: 'Живой менеджер на связи' },
      { icon: ShieldCheck, label: 'Подходит и для срочных задач' },
    ],
  },
} as const

export const NewTaskCTA = memo(function NewTaskCTA({
  onClick,
  haptic,
  variant = 'repeat-order',
}: NewTaskCTAProps) {
  const config = CTA_CONFIG[variant]
  const AccentIcon = config.icon

  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  return (
    <motion.button
      className={`${s.voidGlass} ${s.primaryActionCard} ${variant === 'first-order' ? s.firstOrderActionCard : s.returningOrderActionCard}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        padding: '26px 22px 22px',
        borderRadius: '28px',
        cursor: 'pointer',
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

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          marginBottom: 18,
        }}
      >
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

        <div className={s.heroActionIcon}>
          <AccentIcon size={20} color="#09090b" strokeWidth={2.7} />
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

        <div className={s.heroProofRail}>
          {config.proofs.map((proof) => {
            const ProofIcon = proof.icon

            return (
              <div key={proof.label} className={s.heroProofItem}>
                <ProofIcon size={15} color="#d4af37" strokeWidth={2.2} />
                <span>{proof.label}</span>
              </div>
            )
          })}
        </div>

        <div className={s.heroPrimaryButton}>
          <span>{config.ctaLabel}</span>
          <div className={s.primaryActionArrow}>
            <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
          </div>
        </div>

        <div className={s.heroFootnote}>{config.note}</div>
      </div>
    </motion.button>
  )
})
