import { memo } from 'react'
import { motion } from 'framer-motion'
import { Crown, ChevronRight, Sparkles } from 'lucide-react'
import { ProfileUser, MembershipLevel } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMBERSHIP CARD - Shows membership level and perks
// ═══════════════════════════════════════════════════════════════════════════════

interface MembershipCardProps {
  user: ProfileUser
  cashbackPercent: number
  discountPercent: number
  progress: number  // 0-100 progress to next level
  onViewPrivileges: () => void
}

const LEVEL_CONFIG: Record<MembershipLevel, {
  label: string
  color: string
  gradient: string
  perks: string[]
}> = {
  standard: {
    label: 'Резидент',
    color: '#A0A0A0',
    gradient: 'linear-gradient(135deg, #A0A0A0 0%, #D0D0D0 50%, #A0A0A0 100%)',
    perks: ['Базовый кэшбэк', 'Доступ к акциям'],
  },
  silver: {
    label: 'Партнёр',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #A0A0A0 0%, #E0E0E0 50%, #B0B0B0 100%)',
    perks: ['Повышенный кэшбэк', 'Приоритетная оценка'],
  },
  gold: {
    label: 'VIP-Клиент',
    color: '#D4AF37',
    gradient: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #D4AF37 100%)',
    perks: ['Максимальный кэшбэк', 'Персональный менеджер', 'Скидки на опции'],
  },
  premium: {
    label: 'Премиум',
    color: '#B9F2FF',
    gradient: 'linear-gradient(135deg, #E5E4E2 0%, #B9F2FF 50%, #E5E4E2 100%)',
    perks: ['VIP поддержка', 'Эксклюзивные бонусы', 'Приоритет в очереди'],
  },
  max: {
    label: 'Легенда',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 30%, #FFD700 60%, #FBF5B7 100%)',
    perks: ['Все привилегии', 'Персональные условия', 'Ранний доступ'],
  },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

export const MembershipCard = memo(function MembershipCard({
  user,
  cashbackPercent,
  discountPercent,
  progress,
  onViewPrivileges,
}: MembershipCardProps) {
  const config = LEVEL_CONFIG[user.membershipLevel]
  const isMaxLevel = user.membershipLevel === 'max'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: `1px solid ${config.color}30`,
      }}
    >
      {/* Top gradient bar */}
      <div style={{ height: 4, background: config.gradient }} />

      <div style={{ padding: 20 }}>
        {/* Level badge and icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <motion.div
            animate={isMaxLevel ? {
              boxShadow: [
                `0 0 20px ${config.color}30`,
                `0 0 35px ${config.color}50`,
                `0 0 20px ${config.color}30`,
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: config.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crown size={22} color={user.membershipLevel === 'standard' ? '#333' : '#1a1a1d'} />
          </motion.div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {config.label}
              </span>
              {isMaxLevel && <Sparkles size={16} color={config.color} />}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
              Участник с {formatDate(user.memberSince)}
              {user.agentSince && ` • Агент с ${formatDate(user.agentSince)}`}
            </div>
          </div>
        </div>

        {/* Perks chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {/* Cashback chip */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
              Кэшбэк {cashbackPercent}%
            </span>
          </div>

          {/* Discount chip */}
          {discountPercent > 0 && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>
                Скидка {discountPercent}%
              </span>
            </div>
          )}

          {/* Perk chip */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: `${config.color}15`,
              border: `1px solid ${config.color}30`,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: config.color }}>
              {config.perks[0]}
            </span>
          </div>
        </div>

        {/* Progress bar (if not max level) */}
        {!isMaxLevel && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                До следующего уровня
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: config.color }}>
                {progress}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: config.gradient,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onViewPrivileges}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: `1px solid ${config.color}40`,
            background: `${config.color}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: config.color }}>
            Мои привилегии
          </span>
          <ChevronRight size={18} color={config.color} />
        </motion.button>
      </div>
    </motion.div>
  )
})
