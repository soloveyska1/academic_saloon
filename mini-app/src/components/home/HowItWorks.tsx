import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'
import { useThemeValue } from '../../contexts/ThemeContext'

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
  const theme = useThemeValue()
  const isDark = theme === 'dark'

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
          color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(120,113,108,0.6)',
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
                    background: isDark
                      ? 'rgba(212,175,55,0.06)'
                      : 'rgba(158,122,26,0.07)',
                    border: isDark
                      ? '1px solid rgba(212,175,55,0.12)'
                      : '1px solid rgba(158,122,26,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Icon
                    size={18}
                    color={isDark ? 'rgba(212,175,55,0.65)' : 'rgba(158,122,26,0.7)'}
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
                      background: isDark
                        ? 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)'
                        : 'linear-gradient(135deg, #9e7a1a 0%, #7d5c12 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontWeight: 800,
                      color: isDark ? '#09090b' : '#FFFFFF',
                      boxShadow: isDark
                        ? '0 2px 6px rgba(0,0,0,0.3)'
                        : '0 2px 6px rgba(120,85,40,0.09)',
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
                      background: isDark
                        ? 'linear-gradient(180deg, rgba(212,175,55,0.15), rgba(212,175,55,0.04))'
                        : 'linear-gradient(180deg, rgba(158,122,26,0.18), rgba(158,122,26,0.04))',
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
                    color: isDark ? '#F0F0F0' : '#1C1917',
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
                    color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(87,83,78,0.75)',
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
