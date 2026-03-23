import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step timeline with connecting line.
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
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 16,
          paddingLeft: 2,
        }}
      >
        Как это работает
      </div>

      {/* Timeline steps */}
      <div style={{ position: 'relative' }}>
        {/* Connecting line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 19,
            top: 44,
            bottom: 44,
            width: 1,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.3) 0%, rgba(212,175,55,0.08) 100%)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.30 + i * 0.08 }}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 0',
                  position: 'relative',
                }}
              >
                {/* Step circle with number */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: i === 0
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Icon
                    size={17}
                    color={i === 0 ? 'var(--gold-300)' : 'var(--gold-400)'}
                    strokeWidth={1.8}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--gold-400)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: 1.2,
                      }}
                    >
                      {step.title}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      paddingLeft: 28,
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
})
