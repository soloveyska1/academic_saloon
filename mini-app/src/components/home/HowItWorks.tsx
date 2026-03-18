import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step anxiety reducer.
//  Removes the "what happens next?" fear.
//  Vertical timeline with elegant connectors.
//  Copy: action-oriented, clear, reassuring.
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    icon: MessageSquareText,
    step: '01',
    title: 'Опишите задачу',
    description: 'Укажите тип работы, предмет и требования. Ответим за 5 минут.',
  },
  {
    icon: CreditCard,
    step: '02',
    title: 'Согласуйте условия',
    description: 'Мы рассчитаем стоимость и сроки. Оплата — только после вашего согласия.',
  },
  {
    icon: FileCheck,
    step: '03',
    title: 'Получите работу',
    description: 'Эксперт выполнит в срок. Работа пишется с нуля. 3 правки включены.',
  },
] as const

export const HowItWorks = memo(function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26 }}
      style={{ marginBottom: 28 }}
    >
      {/* Section header */}
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 18,
          paddingLeft: 2,
        }}
      >
        Как это работает
      </div>

      {/* Steps timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isLast = i === STEPS.length - 1

          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.30 + i * 0.08 }}
              style={{
                display: 'flex',
                gap: 16,
                position: 'relative',
              }}
            >
              {/* Timeline column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 40,
                  flexShrink: 0,
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'var(--gold-glass-subtle)',
                    border: '1px solid var(--border-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Icon
                    size={18}
                    color="var(--gold-400)"
                    strokeWidth={1.8}
                  />
                  {/* Step number badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--gold-metallic)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 800,
                      color: 'var(--text-on-gold)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    style={{
                      width: 1,
                      flex: 1,
                      minHeight: 16,
                      background: 'linear-gradient(180deg, var(--border-gold), transparent)',
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24, paddingTop: 2 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                    marginBottom: 4,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
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
