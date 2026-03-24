import { memo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
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

/* Animated counting number */
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => formatMoney(Math.round(v)))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value, motionVal])

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsub
  }, [rounded])

  return <span ref={ref}>{formatMoney(0)}</span>
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 18 }}
    >
      {/* ─── Three-column grid: Balance | Cashback | Club ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems: 'end',
          gap: 20,
          padding: '14px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Column 1: Balance (the star) */}
        <div>
          <GoldText variant="liquid" size="3xl" weight={700}>
            <AnimatedNumber value={totalBalance} />
          </GoldText>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.25)',
              marginTop: 2,
            }}
          >
            {bonusBalance > 0
              ? `${formatMoney(balance)} + ${formatMoney(bonusBalance)} бонусов`
              : 'на счёте'
            }
          </div>
        </div>

        {/* Column 2: Cashback */}
        <div style={{ textAlign: 'center', paddingBottom: 2 }}>
          <GoldText variant="static" size="lg" weight={700}>
            {cashback}%
          </GoldText>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.22)',
              marginTop: 1,
            }}
          >
            кэшбэк
          </div>
        </div>

        {/* Column 3: Club */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            haptic('light')
            onOpenLounge()
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '0 0 2px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--gold-400)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              justifyContent: 'center',
            }}
          >
            Клуб
            <ArrowUpRight size={15} strokeWidth={2.2} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.22)',
              marginTop: 1,
            }}
          >
            привилегии
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
})
