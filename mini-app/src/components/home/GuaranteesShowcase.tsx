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

export const GuaranteesShowcase = memo(function GuaranteesShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
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
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: 0.34 + i * 0.06 }}
              style={{
                padding: 20,
                borderRadius: 16,
                background: 'rgba(12, 12, 10, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
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
                  borderRadius: 12,
                  background: 'rgba(201, 162, 39, 0.06)',
                  border: '1px solid rgba(201, 162, 39, 0.08)',
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
                  fontFamily: "'Manrope', sans-serif",
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

    </motion.div>
  )
})
