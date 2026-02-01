import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import { CheckCircle, Zap, Crown } from 'lucide-react'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGE SCANNER — Visual Benefit List with staggered animation
// ═══════════════════════════════════════════════════════════════════════════

interface PrivilegeScannerProps {
  rank: RankData
  isLocked: boolean
}

// Variants для staggered анимации (более эффективно чем delay на каждом элементе)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

function PrivilegeScannerComponent({ rank, isLocked }: PrivilegeScannerProps) {
  // Мемоизация benefits
  const benefits = useMemo(() => [
    { label: 'Кешбэк на все заказы', value: `${rank.cashback}%`, highlight: true },
    { label: 'Доступ к закрытому клубу', value: 'Active', icon: CheckCircle },
    { label: 'Приоритет поддержки', value: rank.cashback >= 7 ? 'High' : 'Standard', icon: Zap },
    { label: 'Персональный менеджер', value: rank.cashback >= 10 ? 'VIP' : '—', icon: Crown },
  ], [rank.cashback])

  const statusDotStyle = useMemo(() => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: isLocked ? '#52525b' : '#22c55e',
    boxShadow: isLocked ? 'none' : '0 0 10px #22c55e',
  }), [isLocked])

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#52525b',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 16,
        paddingLeft: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={statusDotStyle} />
        СКАНИРОВАНИЕ ПРИВИЛЕГИЙ
      </div>

      {/* Benefits List */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gap: 10 }}
      >
        {benefits.map((benefit) => {
          const BenefitIcon = benefit.icon
          return (
            <m.div
              key={benefit.label}
              variants={itemVariants}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 14,
              }}
            >
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>
                {benefit.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {BenefitIcon && (
                  <BenefitIcon
                    size={14}
                    color={isLocked ? '#52525b' : benefit.highlight ? rank.color : '#71717a'}
                  />
                )}
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isLocked ? '#52525b' : benefit.highlight ? rank.color : '#e4e4e7',
                }}>
                  {benefit.value}
                </span>
              </div>
            </m.div>
          )
        })}
      </m.div>
    </div>
  )
}

export const PrivilegeScanner = memo(PrivilegeScannerComponent)
