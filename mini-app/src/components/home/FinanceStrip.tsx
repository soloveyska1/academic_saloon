import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney } from '../../lib/utils'
import { GoldText } from '../ui/GoldText'

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
  onOpenLounge,
  haptic,
}: FinanceStripProps) {
  const totalBalance = balance + bonusBalance

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      style={{
        marginBottom: 20,
        padding: '14px 0',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Single elegant row: balance · cashback · club */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Balance — the star */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <GoldText variant="liquid" size="xl" weight={700}>
            {formatMoney(totalBalance)}
          </GoldText>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.30)',
              whiteSpace: 'nowrap',
            }}
          >
            на счёте
          </span>
        </div>

        {/* Right side: cashback + club */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Cashback */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {cashback}%
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.30)', marginLeft: 4 }}>
              кэшбэк
            </span>
          </div>

          {/* Divider dot */}
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              flexShrink: 0,
            }}
          />

          {/* Club link */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic('light')
              onOpenLounge()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--gold-400)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Клуб
            <ArrowUpRight size={12} strokeWidth={2.2} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
})
