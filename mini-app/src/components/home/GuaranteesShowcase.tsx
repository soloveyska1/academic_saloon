import { memo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Horizontal scrolling guarantee cards
//  Visually DIFFERENT from HowItWorks (scroll vs stack).
//  Wider cards with generous padding. Stronger text hierarchy.
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
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{ marginBottom: 20 }}
    >
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.30)',
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        Гарантии
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          margin: '0 -20px',
          padding: '0 20px 4px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32 + i * 0.06 }}
              style={{
                minWidth: 240,
                maxWidth: 280,
                padding: '20px 20px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                scrollSnapAlign: 'start',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Icon size={18} color="rgba(212,175,55,0.6)" strokeWidth={1.8} />
              </div>
              <div
                style={{
                  fontSize: 14,
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
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.42)',
                  lineHeight: 1.5,
                }}
              >
                {g.description}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer link — actual tappable area */}
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
          color: 'rgba(212,175,55,0.5)',
          letterSpacing: '0.02em',
        }}
      >
        Все гарантии подробно →
      </motion.button>
    </motion.div>
  )
})
