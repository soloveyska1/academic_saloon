import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import { CheckCircle, Zap, Crown, Gift } from 'lucide-react'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGE SCANNER — Список привилегий уровня
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
      {/* Header */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#52525b',
        marginBottom: 10,
        paddingLeft: 2,
      }}>
        Привилегии уровня
      </div>

      {/* Benefits List */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
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
                padding: '13px 14px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon
                  size={15}
                  color={isLocked ? '#3f3f46' : benefit.highlight ? rank.color : '#52525b'}
                />
                <span style={{ fontSize: 13, color: isLocked ? '#3f3f46' : '#a1a1aa' }}>
                  {benefit.label}
                </span>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: isLocked
                  ? '#3f3f46'
                  : benefit.highlight
                    ? rank.color
                    : valueAvailable ? '#e4e4e7' : '#52525b',
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
