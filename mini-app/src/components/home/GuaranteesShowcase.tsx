import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff, Banknote } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES — Loss-aversion framing.
//  Unified card style. 2-column grid. No decorative bloat.
// ═══════════════════════════════════════════════════════════════════════════

const GUARANTEES = [
  {
    icon: RefreshCcw,
    title: 'Не примут? Исправим.',
    description: '3 раунда правок включены.',
  },
  {
    icon: ShieldCheck,
    title: 'Не копипаст.',
    description: 'С нуля. От 82% уникальности.',
  },
  {
    icon: Banknote,
    title: 'Деньги не пропадут.',
    description: 'Оплата после согласования.',
  },
  {
    icon: EyeOff,
    title: 'Никто не узнает.',
    description: 'Полная конфиденциальность.',
  },
] as const

export const GuaranteesShowcase = memo(function GuaranteesShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.30 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <ShieldCheck size={12} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Гарантии
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}
      >
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 + i * 0.05 }}
              style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(12, 12, 10, 0.6)',
                backdropFilter: 'blur(16px) saturate(140%)',
                WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(201, 162, 39, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Icon size={16} color="var(--gold-400)" strokeWidth={1.8} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  marginBottom: 4,
                }}
              >
                {g.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
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
