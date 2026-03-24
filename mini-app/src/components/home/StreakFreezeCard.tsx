import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Snowflake, Shield, Check } from 'lucide-react'

interface StreakFreezeCardProps {
  streak: number
  bonusBalance: number
  hasFreezeActive?: boolean
  onPurchaseFreeze: () => Promise<boolean>
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void
}

const FREEZE_COST = 100

export const StreakFreezeCard = memo(function StreakFreezeCard({
  streak,
  bonusBalance,
  hasFreezeActive = false,
  onPurchaseFreeze,
  haptic,
}: StreakFreezeCardProps) {
  const [purchasing, setPurchasing] = useState(false)
  const [justPurchased, setJustPurchased] = useState(false)
  const canAfford = bonusBalance >= FREEZE_COST
  const isActive = hasFreezeActive || justPurchased

  const handlePurchase = useCallback(async () => {
    if (purchasing || isActive || !canAfford) return
    setPurchasing(true)
    haptic('medium')

    try {
      const success = await onPurchaseFreeze()
      if (success) {
        haptic('success')
        setJustPurchased(true)
      } else {
        haptic('error')
      }
    } catch {
      haptic('error')
    } finally {
      setPurchasing(false)
    }
  }, [purchasing, isActive, canAfford, onPurchaseFreeze, haptic])

  if (streak < 3) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        background: isActive
          ? 'rgba(147, 197, 253, 0.06)'
          : 'rgba(255,255,255,0.025)',
        border: isActive
          ? '1px solid rgba(147, 197, 253, 0.15)'
          : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: isActive
              ? 'rgba(147, 197, 253, 0.12)'
              : 'rgba(147, 197, 253, 0.06)',
            border: '1px solid rgba(147, 197, 253, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isActive ? (
            <Shield size={15} color="rgba(147, 197, 253, 0.8)" />
          ) : (
            <Snowflake size={15} color="rgba(147, 197, 253, 0.6)" />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: isActive ? 'rgba(147, 197, 253, 0.9)' : 'var(--text-primary)',
            marginBottom: 1,
          }}>
            {isActive ? 'Заморозка активна' : 'Заморозка серии'}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}>
            {isActive
              ? 'Пропустите 1 день без потери серии'
              : `Защитите серию из ${streak} дней`}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="active"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(147, 197, 253, 0.08)',
            }}
          >
            <Check size={12} color="rgba(147, 197, 253, 0.8)" strokeWidth={3} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147, 197, 253, 0.8)' }}>
              Активна
            </span>
          </motion.div>
        ) : (
          <motion.button
            key="buy"
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handlePurchase}
            disabled={purchasing || !canAfford}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: canAfford
                ? 'rgba(147, 197, 253, 0.12)'
                : 'rgba(255,255,255,0.04)',
              color: canAfford
                ? 'rgba(147, 197, 253, 0.9)'
                : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 700,
              cursor: canAfford ? 'pointer' : 'not-allowed',
              opacity: purchasing ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Snowflake size={11} />
            {FREEZE_COST} ₽
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
