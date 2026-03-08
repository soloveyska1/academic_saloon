import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step compact selling flow
//  Psychology: simplicity (only 3 steps) reduces perceived complexity
//  Visual: premium gold-accented step cards with connecting line
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
        borderRadius: 22,
        background: 'linear-gradient(145deg, rgba(212,175,55,0.04) 0%, rgba(9,9,11,0.6) 100%)',
        border: '1px solid rgba(212,175,55,0.08)',
        padding: '18px 18px 16px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Top highlight */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
        }}
      />

      <div
        style={{
          fontFamily: "var(--font-serif, 'Cinzel', serif)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(212,175,55,0.45)',
          marginBottom: 18,
        }}
      >
        Как это работает
      </div>

      <div style={{ display: 'grid', gap: 18, position: 'relative' }}>
        {/* Connecting line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 19,
            top: 40,
            bottom: 20,
            width: 1,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)',
          }}
        />

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
                gap: 14,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 100%)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 0 20px rgba(212,175,55,0.06)',
                }}
              >
                <Icon size={16} color="rgba(212,175,55,0.75)" strokeWidth={2} />
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 17,
                    height: 17,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0.15) 100%)',
                    border: '1px solid rgba(212,175,55,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'rgba(252,246,186,0.95)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              <div style={{ paddingTop: 3 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.88)',
                    lineHeight: 1.2,
                    marginBottom: 3,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.38)',
                    lineHeight: 1.35,
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
