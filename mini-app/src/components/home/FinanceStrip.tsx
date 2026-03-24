import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney } from '../../lib/utils'

interface FinanceStripProps {
  balance: number
  bonusBalance: number
  cashback: number
  activeOrders: number
  onOpenLounge: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

export const FinanceStrip = memo(function FinanceStrip({
  balance,
  bonusBalance,
  cashback,
  activeOrders,
  onOpenLounge,
  haptic,
}: FinanceStripProps) {
  const items = useMemo(() => {
    const result: Array<{ label: string; value: string; accent?: boolean }> = []

    result.push({
      label: 'Баланс',
      value: formatMoney(balance),
      accent: true,
    })

    result.push({
      label: 'Кэшбэк',
      value: `${cashback}%`,
    })

    if (bonusBalance > 0) {
      result.push({
        label: 'Бонусы',
        value: formatMoney(bonusBalance),
      })
    }

    if (activeOrders > 0) {
      result.push({
        label: 'В работе',
        value: String(activeOrders),
      })
    }

    return result
  }, [balance, bonusBalance, cashback, activeOrders])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      style={{ marginBottom: 16 }}
    >
      {/* Horizontal scrollable strip */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 2,
        }}
      >
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              flexShrink: 0,
              padding: '12px 16px',
              borderRadius: 12,
              background: item.accent
                ? 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 100%)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${item.accent ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.06)'}`,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.38)',
                marginBottom: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: item.accent ? 'var(--gold-200)' : 'var(--text-primary)',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}

        {/* Club button at the end */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => { haptic('light'); onOpenLounge() }}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.14)',
            color: 'var(--gold-300)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          Клуб
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </motion.button>
      </div>
    </motion.div>
  )
})
