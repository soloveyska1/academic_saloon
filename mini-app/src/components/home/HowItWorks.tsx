import { memo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CreditCard, FileCheck } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  HOW IT WORKS — 3-step selling flow
//  Uses a secondary surface (subtle card), NOT the same as hero.
//  Wider connecting line. Solid gold step badges. Larger icon boxes.
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.20 }}
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        padding: '20px 20px 18px',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.30)',
          marginBottom: 22,
        }}
      >
        Как это работает
      </div>

      <div style={{ display: 'grid', gap: 20, position: 'relative' }}>
        {/* Connecting line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 21,
            top: 44,
            bottom: 22,
            width: 2,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.05) 100%)',
            borderRadius: 1,
          }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26 + i * 0.08 }}
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
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color="rgba(212,175,55,0.6)" strokeWidth={1.8} />
                {/* Step badge — solid gold, readable */}
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#09090b',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              <div style={{ paddingTop: 4 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    marginBottom: 3,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.38)',
                    lineHeight: 1.4,
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
