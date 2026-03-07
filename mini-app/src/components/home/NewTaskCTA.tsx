import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BadgePercent, Clock3, Plus, Rocket, ShieldCheck } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The "Black Card"
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
  variant?: 'first-order' | 'repeat-order'
}

const CTA_CONFIG = {
  'first-order': {
    eyebrow: 'ПЕРВЫЙ ШАГ',
    title: 'Создать первый заказ',
    subtitle: 'Опишите задачу за пару минут. Дальше менеджер поможет с оценкой и деталями.',
    helper: 'Нажмите сюда, чтобы открыть короткую заявку',
    accent: 'Ваш старт',
    icon: Rocket,
    chips: [
      { icon: Clock3, label: '2 минуты на заявку' },
      { icon: ShieldCheck, label: 'Безопасная сделка' },
      { icon: BadgePercent, label: '10% на первый заказ' },
    ],
  },
  'repeat-order': {
    eyebrow: 'ГЛАВНОЕ ДЕЙСТВИЕ',
    title: 'Новый заказ',
    subtitle: 'Откройте новую заявку, если нужна ещё одна работа, срочная задача или доработка.',
    helper: 'Переход к оформлению новой заявки',
    accent: 'Быстрый старт',
    icon: Plus,
    chips: [
      { icon: Clock3, label: 'Быстрый запуск' },
      { icon: ShieldCheck, label: 'Менеджер на связи' },
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        padding: '24px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: 'pointer',
        marginBottom: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.15)',
        isolation: 'isolate',
      }}
    >
      <div className={s.primaryActionGlow} aria-hidden="true" />
      <div className={s.primaryActionShine} aria-hidden="true" />
      <div className={s.primaryActionOrb} aria-hidden="true" />

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        marginBottom: 18,
        background: 'rgba(9, 9, 11, 0.65)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Manrope', sans-serif",
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--gold-100)',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#d4af37',
          boxShadow: '0 0 12px rgba(212,175,55,0.75)',
          flexShrink: 0,
        }} />
        {config.eyebrow}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: 999,
            marginBottom: '12px',
            background: 'rgba(212,175,55,0.14)',
            color: '#f7e7a8',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            fontWeight: 700,
          }}>
            <AccentIcon size={14} strokeWidth={2.2} />
            {config.accent}
          </div>

          <div className={s.goldAccent} style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 'clamp(28px, 7vw, 36px)',
            fontWeight: 800,
            lineHeight: '1.05',
            marginBottom: '10px'
          }}>
            {config.title}
          </div>
          <div style={{
            maxWidth: 440,
            color: '#d4d4d8',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '1.55'
          }}>
            {config.subtitle}
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 18,
          }}>
            {config.chips.map((chip) => {
              const ChipIcon = chip.icon

              return (
                <div
                  key={chip.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#f4f4f5',
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <ChipIcon size={14} color="#d4af37" strokeWidth={2.2} />
                  {chip.label}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{
          width: 56,
          height: 56,
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #f7d25c 0%, #d4af37 45%, #8e6e27 100%)',
          boxShadow: '0 12px 30px rgba(212,175,55,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AccentIcon size={26} color="#09090b" strokeWidth={2.8} />
        </div>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 20,
        paddingTop: 18,
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          color: '#a1a1aa',
          fontFamily: "'Manrope', sans-serif",
          fontSize: '12px',
          fontWeight: 600,
        }}>
          {config.helper}
        </div>

        <div className={s.primaryActionArrow}>
          <ArrowRight size={20} color="#f7e7a8" strokeWidth={2.5} />
        </div>
      </div>
    </motion.button>
  )
})
