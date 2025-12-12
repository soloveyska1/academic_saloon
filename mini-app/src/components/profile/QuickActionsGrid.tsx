import { memo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Gift, Crown, MessageCircle, FileText, Share2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS GRID - Fast access to common actions
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  onClick: () => void
}

interface QuickActionsGridProps {
  onNewOrder: () => void
  onBonuses: () => void
  onPrivileges: () => void
  onSupport: () => void
  onMyOrders: () => void
  onInviteFriend: () => void
}

export const QuickActionsGrid = memo(function QuickActionsGrid({
  onNewOrder,
  onBonuses,
  onPrivileges,
  onSupport,
  onMyOrders,
  onInviteFriend,
}: QuickActionsGridProps) {
  const actions: QuickAction[] = [
    {
      id: 'new-order',
      label: 'Новый заказ',
      icon: <Plus size={20} />,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      onClick: onNewOrder,
    },
    {
      id: 'bonuses',
      label: 'Бонусы',
      icon: <Gift size={20} />,
      color: '#D4AF37',
      bgColor: 'rgba(212, 175, 55, 0.15)',
      onClick: onBonuses,
    },
    {
      id: 'privileges',
      label: 'Привилегии',
      icon: <Crown size={20} />,
      color: '#B9F2FF',
      bgColor: 'rgba(185, 242, 255, 0.15)',
      onClick: onPrivileges,
    },
    {
      id: 'support',
      label: 'Поддержка',
      icon: <MessageCircle size={20} />,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      onClick: onSupport,
    },
    {
      id: 'orders',
      label: 'Мои заказы',
      icon: <FileText size={20} />,
      color: '#A78BFA',
      bgColor: 'rgba(167, 139, 250, 0.15)',
      onClick: onMyOrders,
    },
    {
      id: 'invite',
      label: 'Пригласить',
      icon: <Share2 size={20} />,
      color: '#F472B6',
      bgColor: 'rgba(244, 114, 182, 0.15)',
      onClick: onInviteFriend,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Section title */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
          Быстрые действия
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {actions.map((action, idx) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '16px 8px',
              borderRadius: 14,
              border: 'none',
              background: 'rgba(18, 18, 21, 0.95)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: action.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: action.color,
              }}
            >
              {action.icon}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
})
