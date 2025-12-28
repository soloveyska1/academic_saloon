import { memo } from 'react'
import { motion } from 'framer-motion'
import { QUICK_ACTIONS } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS ROW — CSS Grid layout (3 equal columns)
//  Premium "old money" design:
//  - Unified gold accent for all cards
//  - Subtle glass morphism
//  - No horizontal scroll — clean grid
// ═══════════════════════════════════════════════════════════════════════════

interface QuickActionsRowProps {
  onNavigate: (route: string) => void
  onOpenModal: (modal: 'cashback' | 'guarantees') => void
  onOpenUrgentSheet: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

export const QuickActionsRow = memo(function QuickActionsRow({
  onNavigate,
  onOpenModal,
  onOpenUrgentSheet,
  haptic,
}: QuickActionsRowProps) {
  const handleClick = (action: typeof QUICK_ACTIONS[0]) => {
    haptic('light')

    if (action.action === 'navigate' && action.route) {
      onNavigate(action.route)
    } else if (action.action === 'modal' && action.modal) {
      if (action.modal === 'cashback' || action.modal === 'guarantees') {
        onOpenModal(action.modal)
      }
    } else if (action.action === 'sheet' && action.modal === 'urgent') {
      onOpenUrgentSheet()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.3 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 16,
      }}
    >
      {QUICK_ACTIONS.map((action, index) => (
        <motion.button
          key={action.id}
          type="button"
          onClick={() => handleClick(action)}
          aria-label={`${action.title}: ${action.subtitle}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 + index * 0.03 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 8px',
            borderRadius: 12,
            cursor: 'pointer',
            position: 'relative',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Subtle top highlight */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
            }}
          />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Icon */}
            <div style={{ marginBottom: 8 }}>
              <action.icon
                size={22}
                color="var(--gold-400)"
                strokeWidth={1.5}
                aria-hidden="true"
                style={{
                  opacity: 0.9,
                }}
              />
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: 2,
                letterSpacing: '0.01em',
              }}
            >
              {action.title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {action.subtitle}
            </div>
          </div>
        </motion.button>
      ))}
    </motion.div>
  )
})
