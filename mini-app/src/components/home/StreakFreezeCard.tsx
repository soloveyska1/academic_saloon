import { memo, useState, useCallback, useEffect, useRef } from 'react'
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
const MAX_FREEZES = 3
const MIN_STREAK = 3

export const StreakFreezeCard = memo(function StreakFreezeCard({
  streak,
  bonusBalance,
  freezeCount = 0,
  haptic,
  onBalanceChanged,
}: StreakFreezeCardProps) {
  const [purchasing, setPurchasing] = useState(false)
  const [localFreezeCount, setLocalFreezeCount] = useState(freezeCount)
  const [localBonusBalance, setLocalBonusBalance] = useState(bonusBalance)
  const [error, setError] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current)
        errorTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setLocalFreezeCount(freezeCount)
  }, [freezeCount])

  useEffect(() => {
    setLocalBonusBalance(bonusBalance)
  }, [bonusBalance])

  const displayCount = localFreezeCount
  const canAfford = localBonusBalance >= FREEZE_COST
  const hasFreeze = displayCount > 0
  const isUnlocked = streak >= MIN_STREAK
  const canBuyMore = isUnlocked && displayCount < MAX_FREEZES
  const canPurchase = canBuyMore && canAfford && !purchasing

  const title = hasFreeze
    ? isUnlocked
      ? `Серия под защитой${displayCount > 1 ? ` ×${displayCount}` : ''}`
      : `Защита в запасе${displayCount > 1 ? ` ×${displayCount}` : ''}`
    : 'Защитить серию'

  const subtitle = hasFreeze
    ? isUnlocked
      ? 'Один пропуск закроется автоматически без сброса серии'
      : `Серия пока ниже ${MIN_STREAK} дней, защита сработает позже`
    : `${FREEZE_COST} ₽ бонусами за 1 защищённый пропуск`

  const handlePurchase = useCallback(async () => {
    if (!canPurchase) return
    setPurchasing(true)
    setError(null)
    haptic('medium')

    try {
      const result = await buyStreakFreeze()
      if (result.success) {
        haptic('success')
        setLocalFreezeCount(result.freeze_count)
        setLocalBonusBalance(result.bonus_balance)
        onBalanceChanged?.()
      } else {
        haptic('error')
        setError(result.message)
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      haptic('error')
      setError(err instanceof Error ? err.message : 'Не удалось активировать защиту серии')
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setError(null), 3000)
    } finally {
      setPurchasing(false)
    }
  }, [canPurchase, haptic, onBalanceChanged])

  // Show the card while the streak is worth protecting or if the user already owns freezes.
  if (!hasFreeze && streak < MIN_STREAK) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: hasFreeze ? 'rgba(212,175,55,0.04)' : 'transparent',
        border: hasFreeze ? '1px solid rgba(212,175,55,0.10)' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: hasFreeze ? 'var(--gold-300)' : 'var(--text-primary)',
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-muted)',
          lineHeight: 1.3,
        }}>
          {subtitle}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: hasFreeze ? 'var(--gold-300)' : 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {displayCount}/{MAX_FREEZES}
          </span>
          {!isUnlocked && hasFreeze && (
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>
              Активируется с {MIN_STREAK}-го дня
            </span>
          )}
          {isUnlocked && !canAfford && canBuyMore && (
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>
              Нужно ещё {Math.max(FREEZE_COST - Math.floor(localBonusBalance), 0)} ₽
            </span>
          )}
          {displayCount >= MAX_FREEZES && (
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--gold-300)' }}>
              Лимит достигнут
            </span>
          )}
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

      {canBuyMore && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handlePurchase}
          disabled={!canPurchase}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: 'none',
            background: canPurchase ? 'var(--gold-glass-medium)' : 'rgba(255,255,255,0.04)',
            color: canPurchase ? 'var(--gold-300)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            cursor: canPurchase ? 'pointer' : 'not-allowed',
            opacity: purchasing ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {purchasing ? '...' : `${FREEZE_COST} ₽`}
        </motion.button>
      )}
    </div>
  )
})
