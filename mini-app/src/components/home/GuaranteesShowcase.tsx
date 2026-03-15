import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff, Banknote } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Fear-eliminating section.
//  Each card addresses a specific objection a student has.
//  Premium design: glass cards with gold accent borders.
//  Copy: question (objection) → answer (guarantee).
// ═══════════════════════════════════════════════════════════════════════════

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Уникальность гарантирована',
    description: 'Проверяем каждую работу по Антиплагиат. Минимум 70% — по договору.',
    accent: 'rgba(212,175,55,0.12)',
  },
  {
    icon: RefreshCcw,
    title: '3 доработки бесплатно',
    description: 'Не устраивает результат — доработаем без дополнительной оплаты.',
    accent: 'rgba(212,175,55,0.10)',
  },
  {
    icon: Banknote,
    title: 'Оплата после согласования',
    description: 'Сначала обсудим детали и стоимость. Никаких скрытых платежей.',
    accent: 'rgba(212,175,55,0.08)',
  },
  {
    icon: EyeOff,
    title: 'Полная конфиденциальность',
    description: 'Ваши данные под защитой. Никто не узнает, что вы обращались.',
    accent: 'rgba(212,175,55,0.06)',
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
      initial={{ opacity: 0, y: 10 }}
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
        <ShieldCheck size={13} color="rgba(212,175,55,0.5)" strokeWidth={2} />
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.30)',
          }}
        >
          Железные гарантии
        </span>
      </div>

      {/* Grid of guarantee cards — 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
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
                padding: '18px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
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
                  background: `linear-gradient(90deg, transparent, ${g.accent.replace('0.', '0.2')}, transparent)`,
                }}
              />

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: g.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Icon size={17} color="rgba(212,175,55,0.7)" strokeWidth={1.8} />
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#F0F0F0',
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
                  color: 'rgba(255,255,255,0.38)',
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
          color: 'rgba(212,175,55,0.45)',
          letterSpacing: '0.02em',
        }}
      >
        Подробнее о гарантиях →
      </motion.button>
    </motion.div>
  )
})
