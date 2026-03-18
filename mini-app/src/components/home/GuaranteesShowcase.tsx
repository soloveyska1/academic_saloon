import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff, Banknote } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Fear-eliminating section.
//  Research-backed: loss-aversion framing converts better.
//  Each card title is what the student WON'T lose/risk.
//  "Не потеряете деньги" > "Оплата по согласию"
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteeItem {
  icon: typeof ShieldCheck
  title: string
  description: string
}

const GUARANTEES: GuaranteeItem[] = [
  {
    icon: RefreshCcw,
    title: 'Не примут? Исправим.',
    description: 'Три раунда доработок включены. Правки — пока преподаватель не примет.',
  },
  {
    icon: ShieldCheck,
    title: 'Не копипаст.',
    description: 'Каждая работа с нуля. Проверяем сами — от 82% уникальности по Antiplagiat.',
  },
  {
    icon: Banknote,
    title: 'Не потеряете деньги.',
    description: 'Оплата только после согласования объёма, сроков и стоимости. Гарантия возврата.',
  },
  {
    icon: EyeOff,
    title: 'Не узнает никто.',
    description: 'Полная конфиденциальность. Данные не передаются. О заказе знаете только вы.',
  },
]

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
      transition={{ delay: 0.30 }}
      style={{ marginBottom: 20 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          paddingLeft: 2,
        }}
      >
        <ShieldCheck
          size={13}
          color="var(--gold-400)"
          strokeWidth={2}
        />
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Наши гарантии
        </span>
      </div>

      {/* Grid of guarantee cards — 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 + i * 0.06 }}
              style={{
                padding: 20,
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '15%',
                  right: '15%',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
                }}
              />

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--gold-glass-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Icon
                  size={17}
                  color="var(--gold-400)"
                  strokeWidth={1.8}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                  marginBottom: 6,
                }}
              >
                {g.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {g.description}
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
          marginTop: 14,
          padding: '10px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--gold-400)',
          letterSpacing: '0.02em',
        }}
      >
        Все гарантии подробно →
      </motion.button>
    </motion.div>
  )
})
