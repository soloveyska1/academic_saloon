import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step anxiety reducer.
//  Unified card style with design system tokens.
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Опишите задачу',
    description: 'Тип работы, предмет и требования. Ответим за 5 минут.',
  },
  {
    icon: CreditCard,
    title: 'Согласуйте условия',
    description: 'Рассчитаем стоимость и сроки. Оплата — после вашего согласия.',
  },
  {
    icon: FileCheck,
    title: 'Получите работу',
    description: 'Эксперт выполнит в срок. С нуля. 3 правки включены.',
  },
] as const

export const HowItWorks = memo(function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        Как это работает
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30 + i * 0.06 }}
              style={{
                display: 'flex',
                gap: 14,
                padding: 16,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(12, 12, 10, 0.6)',
                backdropFilter: 'blur(16px) saturate(140%)',
                WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              {/* Step number + icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(201, 162, 39, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <Icon size={18} color="var(--gold-400)" strokeWidth={1.8} />
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--gold-metallic)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'var(--text-on-gold)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    marginBottom: 3,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {s.description}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
})
