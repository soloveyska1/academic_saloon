import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Clock, Gift } from 'lucide-react'
import { BonusExpiryInfo } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  BONUS EXPIRY ALERT — Loss aversion trigger.
//  "Ваши 500₽ сгорают через 3 дня" — creates urgency to use bonus balance.
//  Psychologically proven: people hate losing what they already have.
//  Shows only when bonus_expiry.has_expiry && days_left <= 7.
// ═══════════════════════════════════════════════════════════════════════════

interface BonusExpiryAlertProps {
  bonusExpiry: BonusExpiryInfo
  bonusBalance: number
  onUseBonus: () => void
}

export const BonusExpiryAlert = memo(function BonusExpiryAlert({
  bonusExpiry,
  bonusBalance,
  onUseBonus,
}: BonusExpiryAlertProps) {
  const config = useMemo(() => {
    if (!bonusExpiry.has_expiry || !bonusExpiry.days_left) return null

    const days = bonusExpiry.days_left
    const amount = bonusExpiry.burn_amount ?? bonusBalance

    if (days > 7 || amount <= 0) return null

    if (days <= 1) {
      return {
        urgency: 'critical' as const,
        icon: Flame,
        title: 'Бонусы сгорают сегодня!',
        subtitle: `${Math.round(amount).toLocaleString('ru-RU')} ₽ исчезнут навсегда`,
        gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.06) 100%)',
        border: 'rgba(239,68,68,0.30)',
        iconColor: 'var(--error-text)',
        textColor: '#fca5a5',
        pulse: true,
      }
    }
    if (days <= 3) {
      return {
        urgency: 'high' as const,
        icon: Clock,
        title: `Бонусы сгорят через ${days} ${days === 1 ? 'день' : days <= 4 ? 'дня' : 'дней'}`,
        subtitle: `${Math.round(amount).toLocaleString('ru-RU')} ₽ — используйте в заказе`,
        gradient: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.05) 100%)',
        border: 'rgba(251,191,36,0.25)',
        iconColor: '#fbbf24',
        textColor: '#fde68a',
        pulse: false,
      }
    }
    return {
      urgency: 'medium' as const,
      icon: Gift,
      title: `Используйте ${Math.round(amount).toLocaleString('ru-RU')} ₽ бонусов`,
      subtitle: `Истекают через ${days} дней`,
      gradient: 'linear-gradient(135deg, var(--gold-glass-subtle) 0%, var(--bg-card) 100%)',
      border: 'var(--border-gold)',
      iconColor: 'var(--gold-400)',
      textColor: 'var(--gold-200)',
      pulse: false,
    }
  }, [bonusExpiry, bonusBalance])

  if (!config) return null

  const Icon = config.icon

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.98 }}
      onClick={onUseBonus}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 16px',
        marginBottom: 12,
        borderRadius: 16,
        background: config.gradient,
        border: `1px solid ${config.border}`,
        cursor: 'pointer',
        appearance: 'none',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pulse glow for critical urgency */}
      {config.pulse && (
        <motion.div
          animate={{ opacity: [0.03, 0.12, 0.03] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(239,68,68,0.15), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${config.iconColor}15`,
          border: `1px solid ${config.iconColor}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon
          size={18}
          color={config.iconColor}
          strokeWidth={2}
          fill={config.urgency === 'critical' ? `${config.iconColor}30` : 'none'}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: config.textColor,
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {config.title}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-muted)',
            lineHeight: 1.3,
          }}
        >
          {config.subtitle}
        </div>
      </div>

      {/* Arrow */}
      <div
        style={{
          fontSize: 14,
          color: config.iconColor,
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        →
      </div>
    </motion.button>
  )
})
