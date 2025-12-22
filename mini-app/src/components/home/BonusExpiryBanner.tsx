import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Flame, ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  BONUS EXPIRY BANNER — Sticky urgency banner when bonus is about to expire
//  Shows FOMO-driven warning to encourage spending before expiry
// ═══════════════════════════════════════════════════════════════════════════

interface BonusExpiryBannerProps {
  daysLeft: number
  balance: number
  onCreateOrder: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

function getExpiryMessage(days: number): { emoji: string; text: string; urgency: 'critical' | 'warning' } {
  if (days === 0) {
    return { emoji: '🔥', text: 'Сгорает СЕГОДНЯ!', urgency: 'critical' }
  }
  if (days === 1) {
    return { emoji: '🔥', text: 'Сгорит завтра!', urgency: 'critical' }
  }
  if (days === 2) {
    return { emoji: '⚠️', text: 'Сгорит через 2 дня', urgency: 'critical' }
  }
  if (days <= 5) {
    return { emoji: '⏰', text: `Сгорит через ${days} дня`, urgency: 'warning' }
  }
  return { emoji: '⏰', text: `Сгорит через ${days} дней`, urgency: 'warning' }
}

export const BonusExpiryBanner = memo(function BonusExpiryBanner({
  daysLeft,
  balance,
  onCreateOrder,
  haptic,
}: BonusExpiryBannerProps) {
  // Only show if balance > 0 and days <= 7
  if (balance <= 0 || daysLeft > 7) return null

  const { emoji, text, urgency } = getExpiryMessage(daysLeft)
  const isCritical = urgency === 'critical'

  const handleClick = () => {
    haptic?.('medium')
    onCreateOrder()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClick}
        style={{
          position: 'relative',
          marginBottom: 16,
          padding: '14px 16px',
          borderRadius: 14,
          cursor: 'pointer',
          background: isCritical
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(234, 88, 12, 0.08) 100%)',
          border: isCritical
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(249, 115, 22, 0.3)',
          boxShadow: isCritical
            ? '0 4px 20px rgba(239, 68, 68, 0.15)'
            : '0 4px 20px rgba(249, 115, 22, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Animated background pulse for critical */}
        {isCritical && (
          <motion.div
            animate={{
              opacity: [0.1, 0.2, 0.1],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2), transparent)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left side - Warning content */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Pulsing icon */}
              <motion.div
                animate={isCritical ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isCritical
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(249, 115, 22, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCritical ? (
                  <Flame size={20} color="#f87171" strokeWidth={2} />
                ) : (
                  <AlertTriangle size={20} color="#fb923c" strokeWidth={2} />
                )}
              </motion.div>

              {/* Text content */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{emoji}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isCritical ? '#f87171' : '#fb923c',
                    }}
                  >
                    {text}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Бонус{' '}
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: isCritical ? '#fca5a5' : '#fdba74',
                    }}
                  >
                    {balance.toLocaleString('ru-RU')}₽
                  </span>{' '}
                  пропадёт
                </div>
              </div>
            </div>

            {/* Right side - CTA */}
            <motion.div
              whileHover={{ x: 3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                background: isCritical
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(249, 115, 22, 0.15)',
                borderRadius: 8,
                border: isCritical
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid rgba(249, 115, 22, 0.25)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isCritical ? '#fca5a5' : '#fdba74',
                }}
              >
                Использовать
              </span>
              <ArrowRight
                size={14}
                color={isCritical ? '#fca5a5' : '#fdba74'}
                strokeWidth={2}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
})
