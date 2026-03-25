import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Clock, Gift } from 'lucide-react'
import { BonusExpiryInfo } from '../../types'
import { Reveal } from '../ui/StaggerReveal'

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
  embedded?: boolean
}

export const BonusExpiryAlert = memo(function BonusExpiryAlert({
  bonusExpiry,
  bonusBalance,
  onUseBonus,
  embedded = false,
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
        title: 'Бонусы истекают сегодня',
        subtitle: `${Math.round(amount).toLocaleString('ru-RU')} ₽ будут недоступны`,
        gradient: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(12,12,10,0.6) 100%)',
        border: 'rgba(239,68,68,0.20)',
        iconBg: 'rgba(239,68,68,0.08)',
        iconBorder: 'rgba(239,68,68,0.12)',
        iconColor: 'var(--error-text)',
        textColor: 'var(--error-text)',
        pulse: true,
      }
    }
    if (days <= 3) {
      return {
        urgency: 'high' as const,
        icon: Clock,
        title: `Бонусы истекают через ${days} ${days === 1 ? 'день' : days <= 4 ? 'дня' : 'дней'}`,
        subtitle: `${Math.round(amount).toLocaleString('ru-RU')} ₽ — используйте в заказе`,
        gradient: 'linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(12,12,10,0.6) 100%)',
        border: 'rgba(201,162,39,0.12)',
        iconBg: 'rgba(201,162,39,0.06)',
        iconBorder: 'rgba(201,162,39,0.08)',
        iconColor: 'var(--gold-400)',
        textColor: 'var(--gold-400)',
        pulse: false,
      }
    }
    return {
      urgency: 'medium' as const,
      icon: Gift,
      title: `Используйте ${Math.round(amount).toLocaleString('ru-RU')} ₽ бонусов`,
      subtitle: `Истекают через ${days} ${days === 1 ? 'день' : days <= 4 ? 'дня' : 'дней'}`,
      gradient: 'linear-gradient(135deg, rgba(201,162,39,0.06) 0%, rgba(12,12,10,0.6) 100%)',
      border: 'rgba(212,175,55,0.12)',
      iconBg: 'rgba(212,175,55,0.06)',
      iconBorder: 'rgba(212,175,55,0.12)',
      iconColor: 'var(--gold-400)',
      textColor: 'var(--text-primary)',
      pulse: false,
    }
  }, [bonusExpiry, bonusBalance])

  if (!config) return null

  const Icon = config.icon

  return (
    <Reveal animation="slide">
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.97 }}
      onClick={onUseBonus}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: embedded ? '13px 14px' : '14px 16px',
        marginBottom: embedded ? 0 : 14,
        borderRadius: 12,
        background: config.gradient,
        border: `1px solid ${config.border}`,
        cursor: 'pointer',
        appearance: 'none',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: embedded ? 'none' : '0 18px 30px -26px rgba(0, 0, 0, 0.72)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -38,
          right: -18,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: config.urgency === 'critical'
            ? 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 72%)'
            : 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: embedded ? 12 : 14,
          background: config.iconBg,
          border: `1px solid ${config.iconBorder}`,
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
          fill="none"
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
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
            fontWeight: 600,
            color: 'var(--text-muted)',
            lineHeight: 1.3,
          }}
        >
          {config.subtitle}
        </div>
      </div>

      <div
        style={{
          padding: '8px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.04)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: config.iconColor,
          flexShrink: 0,
        }}
      >
        Открыть
      </div>
    </motion.button>
    </Reveal>
  )
})
