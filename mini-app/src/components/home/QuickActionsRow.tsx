import { memo } from 'react'
import { motion } from 'framer-motion'
import { QUICK_ACTIONS } from './constants'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS ROW — Elite Edition
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
    <div className={s.scrollRow} style={{
      marginBottom: 24,
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 4, // Space for scrollbar if visible/touch
      marginRight: -20, // Negative margin to pull to edge...
      paddingRight: 20 // ...and padding to keep content visible
    }}>
      {QUICK_ACTIONS.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleClick(action)}
          className={s.voidGlass}
          style={{
            minWidth: '100px',
            flex: 1,
            padding: '16px 12px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{
            marginBottom: '10px',
            filter: "drop-shadow(0 0 8px rgba(212,175,55,0.3))"
          }}>
            <action.icon size={24} color="#d4af37" strokeWidth={1.5} />
          </div>
          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '12px',
            fontWeight: 600,
            color: '#f2f2f2',
            marginBottom: '2px'
          }}>
            {action.title}
          </div>
          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: '#a1a1aa',
            lineHeight: '1.2'
          }}>
            {action.subtitle}
          </div>
        </motion.button>
      ))}
    </div>
  )
})
