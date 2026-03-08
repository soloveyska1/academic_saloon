import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, Lock } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Specific risk-reversal guarantees
//  Psychology: specific promises ("Вернём 100%") beat generic
//  ("гарантия качества"). Fear elimination without naming the fear.
// ═══════════════════════════════════════════════════════════════════════════

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Оценка ниже заявленной?',
    description: 'Вернём 100% стоимости без вопросов',
  },
  {
    icon: RefreshCcw,
    title: 'Не устраивает результат?',
    description: '3 раунда бесплатных доработок',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    description: 'Данные только между вами и автором',
  },
] as const

interface GuaranteesShowcaseProps {
  onOpenGuaranteesModal: () => void
}

export const GuaranteesShowcase = memo(function GuaranteesShowcase({
  onOpenGuaranteesModal,
}: GuaranteesShowcaseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      style={{ marginBottom: 16 }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        Гарантии
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.36 + i * 0.06 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="rgba(212,175,55,0.7)" strokeWidth={2} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#EDEDED',
                    lineHeight: 1.3,
                    marginBottom: 2,
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.3,
                  }}
                >
                  {g.description}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer link */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onOpenGuaranteesModal}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 10,
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(212,175,55,0.6)',
        }}
      >
        Все гарантии подробно →
      </motion.button>
    </motion.div>
  )
})
