import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, EyeOff, Banknote } from 'lucide-react'
import { useThemeValue } from '../../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES SHOWCASE — Fear-eliminating section.
//  Each card addresses a specific objection a student has.
//  Premium design: glass cards with gold accent borders.
//  Copy: question (objection) → answer (guarantee).
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteeItem {
  icon: typeof ShieldCheck
  title: string
  description: string
  accentDark: string
  accentLight: string
  accentLineDark: string
  accentLineLight: string
}

const GUARANTEES: GuaranteeItem[] = [
  {
    icon: RefreshCcw,
    title: 'Бесплатные правки',
    description: 'Три раунда доработок включены в стоимость. Дополнительные — по договорённости.',
    accentDark: 'rgba(212,175,55,0.12)',
    accentLight: 'rgba(180,142,38,0.10)',
    accentLineDark: 'rgba(212,175,55,0.24)',
    accentLineLight: 'rgba(180,142,38,0.22)',
  },
  {
    icon: ShieldCheck,
    title: 'Высокая уникальность',
    description: 'Каждая работа пишется с нуля. Рекомендуем проверить самостоятельно — так система не «запомнит» текст раньше времени.',
    accentDark: 'rgba(212,175,55,0.10)',
    accentLight: 'rgba(180,142,38,0.08)',
    accentLineDark: 'rgba(212,175,55,0.20)',
    accentLineLight: 'rgba(180,142,38,0.18)',
  },
  {
    icon: Banknote,
    title: 'Оплата по согласию',
    description: 'Сначала обсудим объём, сроки и стоимость. Вы платите только после полного согласования.',
    accentDark: 'rgba(212,175,55,0.08)',
    accentLight: 'rgba(180,142,38,0.06)',
    accentLineDark: 'rgba(212,175,55,0.16)',
    accentLineLight: 'rgba(180,142,38,0.14)',
  },
  {
    icon: EyeOff,
    title: 'Полная анонимность',
    description: 'Ваши данные не передаются третьим лицам. О вашем обращении никто не узнает.',
    accentDark: 'rgba(212,175,55,0.06)',
    accentLight: 'rgba(180,142,38,0.05)',
    accentLineDark: 'rgba(212,175,55,0.12)',
    accentLineLight: 'rgba(180,142,38,0.10)',
  },
]

interface GuaranteesShowcaseProps {
  onOpenGuaranteesModal: () => void
}

export const GuaranteesShowcase = memo(function GuaranteesShowcase({
  onOpenGuaranteesModal,
}: GuaranteesShowcaseProps) {
  const theme = useThemeValue()
  const isDark = theme === 'dark'

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
        <ShieldCheck
          size={13}
          color={isDark ? 'rgba(212,175,55,0.5)' : 'rgba(158,122,26,0.55)'}
          strokeWidth={2}
        />
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(120,113,108,0.55)',
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
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.90)',
                border: isDark
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(120,85,40,0.08)',
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
                  background: `linear-gradient(90deg, transparent, ${isDark ? g.accentLineDark : g.accentLineLight}, transparent)`,
                }}
              />

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isDark ? g.accentDark : g.accentLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Icon
                  size={17}
                  color={isDark ? 'rgba(212,175,55,0.7)' : 'rgba(158,122,26,0.70)'}
                  strokeWidth={1.8}
                />
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isDark ? '#F0F0F0' : 'rgba(28,25,23,0.90)',
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
                  color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(87,83,78,0.70)',
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
          color: isDark ? 'rgba(212,175,55,0.45)' : 'rgba(158,122,26,0.50)',
          letterSpacing: '0.02em',
        }}
      >
        Подробнее о гарантиях →
      </motion.button>
    </motion.div>
  )
})
