import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Specific risk-reversal guarantees
//  ONLY promises the operator CAN actually deliver.
//  No grade guarantees (grades depend on the professor, not us).
//  No "автор" references — solo operation.
// ═══════════════════════════════════════════════════════════════════════════

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Антиплагиат ниже обещанного?',
    description: 'Бесплатно доработаем до нужного процента',
  },
  {
    icon: RefreshCcw,
    title: 'Не устраивает результат?',
    description: '3 раунда бесплатных доработок',
  },
  {
    icon: EyeOff,
    title: 'Полная конфиденциальность',
    description: 'Никто не узнает, что вы обращались к нам',
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
          fontFamily: "var(--font-serif, 'Cinzel', serif)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(212,175,55,0.45)',
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
                gap: 14,
                padding: '16px 18px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                border: '1px solid rgba(212,175,55,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top highlight */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '15%',
                  right: '15%',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
                }}
              />

              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <Icon size={17} color="rgba(212,175,55,0.75)" strokeWidth={2} />
              </div>
              <div style={{ paddingTop: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#EDEDED',
                    lineHeight: 1.3,
                    marginBottom: 3,
                  }}
                >
                  {g.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.35,
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
          marginTop: 12,
          padding: '8px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(212,175,55,0.55)',
          letterSpacing: '0.02em',
        }}
      >
        Все гарантии подробно →
      </motion.button>
    </motion.div>
  )
})
