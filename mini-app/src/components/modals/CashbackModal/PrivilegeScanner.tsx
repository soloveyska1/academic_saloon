import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import { CheckCircle, Zap, Crown, Gift } from 'lucide-react'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGE SCANNER — "The Void & The Gold" Edition
// ═══════════════════════════════════════════════════════════════════════════

interface PrivilegeScannerProps {
  rank: RankData
  isLocked: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0 },
}

function PrivilegeScannerComponent({ rank, isLocked }: PrivilegeScannerProps) {
  const benefits = useMemo(() => [
    {
      icon: Gift,
      label: 'Кешбэк на все заказы',
      value: `${rank.cashback}%`,
      highlight: true,
    },
    {
      icon: CheckCircle,
      label: 'Доступ к закрытому клубу',
      value: 'Включён',
      highlight: false,
    },
    {
      icon: Zap,
      label: 'Приоритет поддержки',
      value: rank.cashback >= 7 ? 'Высокий' : 'Обычный',
      highlight: false,
    },
    {
      icon: Crown,
      label: 'Персональный менеджер',
      value: rank.cashback >= 10 ? 'Назначен' : 'Нет',
      highlight: false,
    },
  ], [rank.cashback])

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header — Cinzel serif like home page section titles */}
      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 11,
        fontWeight: 600,
        color: '#3f3f46',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 10,
        paddingLeft: 2,
      }}>
        Привилегии уровня
      </div>

      {/* Benefits List — voidGlass rows */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          const valueAvailable = benefit.value !== 'Нет'
          return (
            <m.div
              key={benefit.label}
              variants={itemVariants}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(9,9,11,0.4)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: 12,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon
                  size={14}
                  color={isLocked ? '#27272a' : benefit.highlight ? '#d4af37' : '#3f3f46'}
                  style={!isLocked && benefit.highlight ? { filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.3))' } : undefined}
                />
                <span style={{ fontSize: 13, color: isLocked ? '#27272a' : '#71717a' }}>
                  {benefit.label}
                </span>
              </div>
              <span style={{
                fontFamily: benefit.highlight ? "'Cinzel', serif" : undefined,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: benefit.highlight ? '0.03em' : undefined,
                color: isLocked
                  ? '#27272a'
                  : benefit.highlight
                    ? '#d4af37'
                    : valueAvailable ? '#a1a1aa' : '#3f3f46',
              }}>
                {benefit.value}
              </span>
            </m.div>
          )
        })}
      </m.div>
    </div>
  )
}

export const PrivilegeScanner = memo(PrivilegeScannerComponent)
