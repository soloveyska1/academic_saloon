import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, CheckSquare, Award, Zap, Clock, MessageCircle,
  Palette, PieChart, Presentation, Percent, Tag, RefreshCw
} from 'lucide-react'
import { Reward } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  REWARD CARD - Individual reward in store
// ═══════════════════════════════════════════════════════════════════════════════

interface RewardCardProps {
  reward: Reward
  userPoints: number
  onExchange: (reward: Reward) => void
  compact?: boolean
}

const getIcon = (iconName: string, size: number = 20) => {
  const color = '#D4AF37'
  switch (iconName) {
    case 'FileText':
      return <FileText size={size} color={color} />
    case 'CheckSquare':
      return <CheckSquare size={size} color={color} />
    case 'Award':
      return <Award size={size} color={color} />
    case 'Zap':
      return <Zap size={size} color={color} />
    case 'Clock':
      return <Clock size={size} color={color} />
    case 'MessageCircle':
      return <MessageCircle size={size} color={color} />
    case 'Palette':
      return <Palette size={size} color={color} />
    case 'PieChart':
      return <PieChart size={size} color={color} />
    case 'Presentation':
      return <Presentation size={size} color={color} />
    case 'Percent':
      return <Percent size={size} color={color} />
    case 'Tag':
      return <Tag size={size} color={color} />
    case 'RefreshCw':
      return <RefreshCw size={size} color={color} />
    default:
      return <Award size={size} color={color} />
  }
}

const getCategoryLabel = (category: string): { label: string; color: string } => {
  switch (category) {
    case 'free':
      return { label: '0₽', color: '#22c55e' }
    case 'speed':
      return { label: 'Ускорение', color: '#8B5CF6' }
    case 'design':
      return { label: 'Оформление', color: '#EC4899' }
    case 'discount':
      return { label: 'Скидки', color: '#F59E0B' }
    default:
      return { label: 'Награда', color: '#D4AF37' }
  }
}

function formatConstraints(reward: Reward): string {
  const parts: string[] = []

  if (reward.constraints.minOrderAmount) {
    parts.push(`от ${reward.constraints.minOrderAmount}₽`)
  }
  if (reward.constraints.validDays) {
    parts.push(`${reward.constraints.validDays} дней`)
  }
  if (reward.constraints.stackable === false) {
    parts.push('не суммируется')
  }

  return parts.join(' • ')
}

export const RewardCard = memo(function RewardCard({
  reward,
  userPoints,
  onExchange,
  compact = false,
}: RewardCardProps) {
  const canAfford = userPoints >= reward.costPoints
  const category = getCategoryLabel(reward.category)

  const handleExchange = () => {
    if (!canAfford) return

    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
    } catch {}

    onExchange(reward)
  }

  if (compact) {
    // Compact card for preview row
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={handleExchange}
        style={{
          width: 140,
          flexShrink: 0,
          borderRadius: 16,
          overflow: 'hidden',
          background: 'rgba(18, 18, 21, 0.95)',
          border: `1px solid ${canAfford ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
          cursor: canAfford ? 'pointer' : 'default',
          opacity: canAfford ? 1 : 0.5,
        }}
      >
        <div style={{ padding: 14 }}>
          {/* Icon */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            {getIcon(reward.icon, 18)}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {reward.title}
          </div>

          {/* Cost */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37' }}>
            {reward.costPoints} баллов
          </div>
        </div>
      </motion.div>
    )
  }

  // Full card for store
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getIcon(reward.icon)}
          </div>

          {/* Title & Category */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div
                style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: `${category.color}20`,
                  fontSize: 10,
                  fontWeight: 600,
                  color: category.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {category.label}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {reward.title}
            </div>
          </div>

          {/* Cost */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37' }}>
              {reward.costPoints}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' }}>
              баллов
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 12 }}>
          {reward.description}
        </div>

        {/* Constraints */}
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.4)',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            marginBottom: 12,
          }}
        >
          {formatConstraints(reward)}
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: canAfford ? 0.98 : 1 }}
          onClick={handleExchange}
          disabled={!canAfford}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: 'none',
            background: canAfford
              ? 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)'
              : 'rgba(255, 255, 255, 0.1)',
            cursor: canAfford ? 'pointer' : 'not-allowed',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: canAfford ? '#1a1a1d' : 'rgba(255, 255, 255, 0.4)',
            }}
          >
            {canAfford ? 'Обменять' : `Нужно ещё ${reward.costPoints - userPoints} баллов`}
          </span>
        </motion.button>
      </div>
    </motion.div>
  )
})
