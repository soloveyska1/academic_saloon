import { memo, useMemo } from 'react'
import { m } from 'framer-motion'
import { CheckCircle, Zap, Crown, Gift } from 'lucide-react'
import type { RankData } from '../../../lib/ranks'

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGE LIST — Quiet Luxury (no Cinzel, clean rows)
// ═══════════════════════════════════════════════════════════════════════════

interface PrivilegeScannerProps {
  rank: RankData
  isLocked: boolean
}

function PrivilegeScannerComponent({ rank, isLocked }: PrivilegeScannerProps) {
  const benefits = useMemo(() => [
    {
      icon: Gift,
      label: 'Кэшбэк на все заказы',
      value: `${rank.cashback}%`,
      highlight: true,
    },
    {
      icon: CheckCircle,
      label: 'Раздел привилегий',
      value: 'Доступен',
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
      label: 'Персональные условия',
      value: rank.cashback >= 10 ? 'Доступны' : 'Базовые',
      highlight: false,
    },
  ], [rank.cashback])

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header — Manrope small-caps (matches home page) */}
      <div style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
        paddingLeft: 2,
      }}>
        Привилегии уровня
      </div>

      {/* Benefits */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, staggerChildren: 0.05 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          return (
            <div
              key={benefit.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                background: benefit.highlight && !isLocked
                  ? 'rgba(212,175,55,0.03)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${benefit.highlight && !isLocked
                  ? 'rgba(212,175,55,0.06)'
                  : 'rgba(255,255,255,0.03)'}`,
                borderRadius: 12,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 10, minWidth: 0, flex: 1,
              }}>
                <Icon
                  size={14}
                  color={isLocked
                    ? 'rgba(255,255,255,0.12)'
                    : benefit.highlight
                      ? 'rgba(212,175,55,0.55)'
                      : 'rgba(255,255,255,0.25)'}
                />
                <span style={{
                  fontSize: 13,
                  color: isLocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
                }}>
                  {benefit.label}
                </span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 600,
                flexShrink: 0,
                color: isLocked
                  ? 'rgba(255,255,255,0.10)'
                  : benefit.highlight
                    ? '#E8D5A3'
                    : 'rgba(255,255,255,0.42)',
              }}>
                {benefit.value}
              </span>
            </div>
          )
        })}
      </m.div>
    </div>
  )
}

export const PrivilegeScanner = memo(PrivilegeScannerComponent)
