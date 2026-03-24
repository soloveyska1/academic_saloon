import { memo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowUpRight, Crown } from 'lucide-react'
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

  // Subscribe to rounded value changes and update DOM directly
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        marginBottom: 18,
        padding: '16px 14px',
        borderRadius: 14,
        background: 'linear-gradient(165deg, rgba(16,15,12,0.90) 0%, rgba(10,10,11,0.95) 50%, rgba(6,6,8,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 40px -16px rgba(0,0,0,0.6)',
      }}
    >
      {/* Subtle shimmer sweep */}
      <motion.div
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 6 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.03), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Gold accent line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Balance row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.22)',
                marginBottom: 4,
              }}
            >
              Баланс
            </div>
            <GoldText variant="liquid" size="2xl" weight={700}>
              <AnimatedNumber value={totalBalance} />
            </GoldText>
          </div>

          {/* Bonus sub-balance if exists */}
          {bonusBalance > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.08)',
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.40)',
                  marginBottom: 2,
                }}
              >
                Бонусы
              </div>
              <GoldText variant="static" size="sm" weight={700}>
                +{formatMoney(bonusBalance)}
              </GoldText>
            </motion.div>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
            marginBottom: 12,
          }}
        />

        {/* Bottom row: cashback + club */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Cashback indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                %
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.22)',
                  marginBottom: 1,
                }}
              >
                Кэшбэк
              </div>
              <GoldText variant="static" size="sm" weight={700}>
                {cashback}%
              </GoldText>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              background: 'rgba(255,255,255,0.05)',
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
              gap: 8,
              background: 'none',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown
                size={12}
                strokeWidth={2}
                style={{ color: 'var(--gold-400)' }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.22)',
                  marginBottom: 1,
                }}
              >
                Клуб
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--gold-400)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                Открыть
                <ArrowUpRight size={10} strokeWidth={2.5} />
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
})
