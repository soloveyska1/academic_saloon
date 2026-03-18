import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { QUICK_ACTIONS } from './constants'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS ROW — Elite Edition
//  Now accepts user-specific data to show real values instead of static text
// ═══════════════════════════════════════════════════════════════════════════

interface QuickActionsRowProps {
  onNavigate: (route: string) => void
  onOpenModal: (modal: 'cashback' | 'guarantees') => void
  onOpenUrgentSheet: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
  cashbackPercent?: number
}

export const QuickActionsRow = memo(function QuickActionsRow({
  onNavigate,
  onOpenModal,
  onOpenUrgentSheet,
  haptic,
  cashbackPercent,
}: QuickActionsRowProps) {
  // Override static subtitles with real user data
  const actions = useMemo(() => {
    return QUICK_ACTIONS.map(action => {
      if (action.id === 'cashback' && cashbackPercent != null && cashbackPercent > 0) {
        return { ...action, subtitle: `ваш ${cashbackPercent}%` }
      }
      return action
    })
  }, [cashbackPercent])

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
    <div className={s.scrollRow} style={{ marginBottom: 20, gap: 12 }}>
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleClick(action)}
          style={{
            minWidth: '120px',
            padding: '12px 16px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--gold-glass-subtle)',
            border: '1px solid var(--border-gold)',
            flexShrink: 0,
          }}>
            <action.icon size={16} color="var(--gold-400)" strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              marginBottom: 3,
            }}>
              {action.title}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
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
