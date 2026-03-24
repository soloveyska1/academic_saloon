import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ShieldPlus, AlertCircle } from 'lucide-react'
import { Reveal } from '../ui/StaggerReveal'

interface StreakFreezeCardProps {
  streak: number
  bonusBalance: number
  hasFreezeActive?: boolean
  freezeCost?: number
  onPurchaseFreeze: () => Promise<boolean>
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void
}

export const StreakFreezeCard = memo(function StreakFreezeCard({
  streak,
  bonusBalance,
  hasFreezeActive = false,
  freezeCost = 100,
  onPurchaseFreeze,
  haptic,
}: StreakFreezeCardProps) {
  const [purchasing, setPurchasing] = useState(false)
  const [justPurchased, setJustPurchased] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canAfford = bonusBalance >= freezeCost
  const isActive = hasFreezeActive || justPurchased

  const handlePurchase = useCallback(async () => {
    if (purchasing || isActive || !canAfford) return
    setPurchasing(true)
    setError(null)
    haptic('medium')

    try {
      const success = await onPurchaseFreeze()
      if (success) {
        haptic('success')
        setJustPurchased(true)
      } else {
        haptic('error')
        setError('Не удалось активировать')
      }
    } catch {
      haptic('error')
      setError('Ошибка, попробуйте позже')
    } finally {
      setPurchasing(false)
    }
  }, [purchasing, isActive, canAfford, onPurchaseFreeze, haptic])

  // Only show for streaks worth protecting
  if (streak < 3) return null

  return (
    <Reveal animation="fade" delay={0.1}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: isActive
            ? 'var(--gold-glass-subtle)'
            : 'rgba(255,255,255,0.025)',
          border: isActive
            ? '1px solid rgba(212,175,55,0.15)'
            : '1px solid var(--border-default)',
          boxShadow: isActive ? '0 0 20px -8px rgba(212,175,55,0.10)' : 'none',
          transition: 'all 0.3s var(--ease-out)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: isActive
                ? 'rgba(212,175,55,0.12)'
                : 'rgba(255,255,255,0.04)',
              border: isActive
                ? '1px solid rgba(212,175,55,0.18)'
                : '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isActive ? (
              <ShieldCheck size={15} strokeWidth={2} color="var(--gold-400)" />
            ) : (
              <ShieldPlus size={15} strokeWidth={2} color="var(--text-muted)" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: isActive ? 'var(--gold-300)' : 'var(--text-primary)',
              lineHeight: 1.3,
            }}>
              {isActive ? 'Заморозка активна' : 'Заморозить серию'}
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.3,
            }}>
              {isActive
                ? `Серия в ${streak} дн. защищена на 1 день`
                : `Пропустите день без потери ${streak} дн. серии`}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.div
              key="active"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 8,
                background: 'rgba(212,175,55,0.08)',
              }}
            >
              <ShieldCheck size={11} strokeWidth={2.5} color="var(--gold-400)" />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--gold-400)',
                letterSpacing: '0.04em',
              }}>
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
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: canAfford
                  ? 'var(--gold-glass-medium)'
                  : 'rgba(255,255,255,0.04)',
                color: canAfford
                  ? 'var(--gold-300)'
                  : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 700,
                cursor: canAfford ? 'pointer' : 'not-allowed',
                opacity: purchasing ? 0.6 : 1,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              {canAfford ? `${freezeCost} ₽` : 'Мало бонусов'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--error-text)',
            }}
          >
            <AlertCircle size={12} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
})
