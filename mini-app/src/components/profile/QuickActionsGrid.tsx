import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Gift, Crown, MessageCircle, FileText, Share2, Check, Sparkles } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS GRID - Premium fast access to common actions
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickActionsGridProps {
  onNewOrder: () => void
  onBonuses: () => void
  onPrivileges: () => void
  onSupport: () => void
  onMyOrders: () => void
  onInviteFriend: () => void
}

interface ActionButtonProps {
  id: string
  label: string
  icon: React.ReactNode
  successIcon?: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  onClick: () => void
  index: number
  showSuccess?: boolean
  isPrimary?: boolean
}

const ActionButton = memo(function ActionButton({
  id,
  label,
  icon,
  successIcon,
  color,
  bgColor,
  borderColor,
  onClick,
  index,
  showSuccess,
  isPrimary,
}: ActionButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.04 }}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '18px 8px 14px',
        borderRadius: 16,
        border: `1px solid ${borderColor}`,
        background: isPrimary
          ? `linear-gradient(145deg, ${bgColor} 0%, rgba(18, 18, 21, 0.98) 100%)`
          : 'rgba(18, 18, 21, 0.95)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle shine effect for primary */}
      {isPrimary && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
          }}
        />
      )}

      {/* Icon container */}
      <motion.div
        animate={showSuccess ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3 }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: showSuccess ? 'rgba(34, 197, 94, 0.2)' : bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: showSuccess ? '#22c55e' : color,
          transition: 'all 0.2s ease',
          boxShadow: isPrimary ? `0 4px 12px ${color}20` : 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {showSuccess && successIcon ? (
            <motion.div
              key="success"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {successIcon}
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {icon}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: showSuccess ? '#22c55e' : 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          lineHeight: 1.2,
          letterSpacing: '0.01em',
          transition: 'color 0.2s ease',
        }}
      >
        {showSuccess ? 'Скопировано!' : label}
      </span>
    </motion.button>
  )
})

export const QuickActionsGrid = memo(function QuickActionsGrid({
  onNewOrder,
  onBonuses,
  onPrivileges,
  onSupport,
  onMyOrders,
  onInviteFriend,
}: QuickActionsGridProps) {
  const [copiedState, setCopiedState] = useState(false)

  const handleInvite = useCallback(() => {
    onInviteFriend()
    setCopiedState(true)
    setTimeout(() => setCopiedState(false), 2000)
  }, [onInviteFriend])

  const actions = [
    {
      id: 'new-order',
      label: 'Новый заказ',
      icon: <Plus size={22} strokeWidth={2.5} />,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.2)',
      onClick: onNewOrder,
      isPrimary: true,
    },
    {
      id: 'bonuses',
      label: 'Клуб',
      icon: <Sparkles size={20} />,
      color: '#D4AF37',
      bgColor: 'rgba(212, 175, 55, 0.12)',
      borderColor: 'rgba(212, 175, 55, 0.15)',
      onClick: onBonuses,
      isPrimary: true,
    },
    {
      id: 'privileges',
      label: 'Привилегии',
      icon: <Crown size={20} />,
      color: '#B9F2FF',
      bgColor: 'rgba(185, 242, 255, 0.1)',
      borderColor: 'rgba(185, 242, 255, 0.12)',
      onClick: onPrivileges,
    },
    {
      id: 'support',
      label: 'Поддержка',
      icon: <MessageCircle size={20} />,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: 'rgba(59, 130, 246, 0.15)',
      onClick: onSupport,
    },
    {
      id: 'orders',
      label: 'Мои заказы',
      icon: <FileText size={20} />,
      color: '#A78BFA',
      bgColor: 'rgba(167, 139, 250, 0.12)',
      borderColor: 'rgba(167, 139, 250, 0.15)',
      onClick: onMyOrders,
    },
    {
      id: 'invite',
      label: 'Пригласить',
      icon: <Share2 size={20} />,
      successIcon: <Check size={22} strokeWidth={3} />,
      color: '#F472B6',
      bgColor: 'rgba(244, 114, 182, 0.12)',
      borderColor: 'rgba(244, 114, 182, 0.15)',
      onClick: handleInvite,
      showSuccess: copiedState,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#fff',
          letterSpacing: '0.01em',
        }}>
          Быстрые действия
        </span>
        <span style={{
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.4)',
        }}>
          6 действий
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
          <ActionButton
            key={action.id}
            {...action}
            index={idx}
          />
        ))}
      </div>
    </motion.div>
  )
})
