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
    <div className={s.scrollRow} style={{ marginBottom: 20, gap: 10 }}>
      {QUICK_ACTIONS.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleClick(action)}
          style={{
            minWidth: '120px',
            padding: '12px 14px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            background: 'rgba(12, 12, 15, 0.78)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(212,175,55,0.12)',
            border: '1px solid rgba(212,175,55,0.18)',
            flexShrink: 0,
          }}>
            <action.icon size={16} color="#d4af37" strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '12px',
              fontWeight: 700,
              color: '#f4f4f5',
              lineHeight: 1.1,
              marginBottom: 3,
            }}>
              {action.title}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: '#a1a1aa',
              lineHeight: 1.1,
            }}>
              {action.subtitle}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
})
