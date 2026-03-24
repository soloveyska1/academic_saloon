import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ShieldPlus } from 'lucide-react'
import { buyStreakFreeze } from '../../api/userApi'

interface StreakFreezeCardProps {
  streak: number
  bonusBalance: number
  freezeCount?: number
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void
  onBalanceChanged?: () => void
}

const FREEZE_COST = 100

export const StreakFreezeCard = memo(function StreakFreezeCard({
  streak,
  bonusBalance,
  freezeCount = 0,
  haptic,
  onBalanceChanged,
}: StreakFreezeCardProps) {
  const [purchasing, setPurchasing] = useState(false)
  const [localFreezeCount, setLocalFreezeCount] = useState(freezeCount)
  const [error, setError] = useState<string | null>(null)

  const canAfford = bonusBalance >= FREEZE_COST
  const hasFreeze = localFreezeCount > 0 || freezeCount > 0
  const displayCount = Math.max(localFreezeCount, freezeCount)

  const handlePurchase = useCallback(async () => {
    if (purchasing || !canAfford) return
    setPurchasing(true)
    setError(null)
    haptic('medium')

    try {
      const result = await buyStreakFreeze()
      if (result.success) {
        haptic('success')
        setLocalFreezeCount(result.freeze_count)
        onBalanceChanged?.()
      } else {
        haptic('error')
        setError(result.message)
        setTimeout(() => setError(null), 3000)
      }
    } catch {
      // Silently fail on network errors — feature is not critical
      haptic('light')
    } finally {
      setPurchasing(false)
    }
  }, [purchasing, canAfford, haptic, onBalanceChanged])

  // Only show for streaks worth protecting
  if (streak < 3) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: hasFreeze
          ? 'rgba(212,175,55,0.04)'
          : 'transparent',
        border: hasFreeze
          ? '1px solid rgba(212,175,55,0.10)'
          : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: hasFreeze ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {hasFreeze ? (
          <ShieldCheck size={13} strokeWidth={2.2} color="var(--gold-400)" />
        ) : (
          <ShieldPlus size={13} strokeWidth={2} color="var(--text-muted)" />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: hasFreeze ? 'var(--gold-300)' : 'var(--text-primary)',
          lineHeight: 1.3,
        }}>
          {hasFreeze
            ? `Заморозка${displayCount > 1 ? ` ×${displayCount}` : ''}`
            : 'Защитить серию'
          }
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-muted)',
          lineHeight: 1.3,
        }}>
          {hasFreeze
            ? 'Пропустите день без потери серии'
            : `${FREEZE_COST}₽ бонусов — 1 пропуск`
          }
        </div>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 9, fontWeight: 600, color: 'var(--error-text)', marginTop: 2 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action */}
      {!hasFreeze && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handlePurchase}
          disabled={purchasing || !canAfford}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: 'none',
            background: canAfford ? 'var(--gold-glass-medium)' : 'rgba(255,255,255,0.04)',
            color: canAfford ? 'var(--gold-300)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            opacity: purchasing ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {purchasing ? '...' : `${FREEZE_COST}₽`}
        </motion.button>
      )}
    </div>
  )
})
