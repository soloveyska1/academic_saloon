import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step compact selling flow
//  Psychology: simplicity (only 3 steps) reduces perceived complexity
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Опишите задачу',
    detail: 'Тема, объём, сроки — за 2 минуты',
  },
  {
    icon: CreditCard,
    title: 'Узнайте стоимость',
    detail: 'Цена — сразу, оплата — после согласования',
  },
  {
    icon: FileCheck,
    title: 'Получите работу',
    detail: 'Антиплагиат, правки, сопровождение до сдачи',
  },
] as const

export const HowItWorks = memo(function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 14,
        }}
      >
        Как это работает
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.34 + i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="rgba(212,175,55,0.7)" strokeWidth={2} />
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.2)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'rgba(212,175,55,0.9)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              <div style={{ paddingTop: 2 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.2,
                    marginBottom: 2,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.35)',
                    lineHeight: 1.3,
                  }}
                >
                  {step.detail}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
})
