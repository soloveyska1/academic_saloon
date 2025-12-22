import { memo } from 'react'
import { motion } from 'framer-motion'
import { QUICK_ACTIONS } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS ROW — Horizontal scroll carousel
//  Features:
//  - Single "Срочно" entry that opens UrgentHubSheet
//  - Premium dark glass cards with gold accents
//  - Monochrome luxury style
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
    <div
      style={{
        margin: '0 -20px 20px',
        padding: '8px 20px',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`.quick-actions-scroll::-webkit-scrollbar { display: none; }`}</style>
      <motion.div
        className="quick-actions-scroll"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'flex',
          gap: 12,
          paddingBottom: 8,
        }}
      >
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            type="button"
            onClick={() => handleClick(action)}
            aria-label={`${action.title}: ${action.subtitle}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06 }}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            style={{
              flexShrink: 0,
              width: 100,
              padding: '16px 12px',
              borderRadius: 16,
              cursor: 'pointer',
              position: 'relative',
              // Dark glass background with subtle gradient
              background:
                action.id === 'urgent'
                  ? 'linear-gradient(145deg, rgba(185,28,28,0.2) 0%, rgba(127,29,29,0.15) 100%)'
                  : 'linear-gradient(145deg, rgba(28,28,32,0.95) 0%, rgba(18,18,20,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              // Border color based on type
              border:
                action.id === 'urgent'
                  ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(212,175,55,0.15)',
              // Minimal shadow
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.5)',
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
                left: 0,
                right: 0,
                height: '1px',
                background:
                  action.id === 'urgent'
                    ? 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
              }}
            />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Icon */}
              <motion.div
                whileHover={{ y: -2, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{ marginBottom: 10, display: 'inline-block' }}
              >
                <action.icon
                  size={24}
                  color={action.id === 'urgent' ? '#f87171' : '#D4AF37'}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  style={{
                    filter:
                      action.id === 'urgent'
                        ? 'drop-shadow(0 2px 8px rgba(239,68,68,0.4))'
                        : 'drop-shadow(0 2px 8px rgba(212,175,55,0.3))',
                  }}
                />
              </motion.div>

              {/* Title */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: action.id === 'urgent' ? '#f87171' : '#fff',
                  marginBottom: 3,
                  letterSpacing: '0.01em',
                }}
              >
                {action.title}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 10,
                  color: action.id === 'urgent' ? 'rgba(248,113,113,0.7)' : 'rgba(212,175,55,0.7)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {action.subtitle}
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
})
