import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { QUICK_ACTIONS } from './constants'
import { useThemeValue } from '../../contexts/ThemeContext'
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
  const theme = useThemeValue()
  const isDark = theme === 'dark'

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
    <div className={s.scrollRow} style={{ marginBottom: 20, gap: 10 }}>
      {actions.map((action, index) => (
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
            background: isDark ? 'rgba(12, 12, 15, 0.78)' : 'rgba(255, 255, 255, 0.88)',
            border: isDark
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(120,85,40,0.10)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: isDark ? 'none' : '0 1px 6px rgba(120, 85, 40, 0.06)',
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(180,142,38,0.08)',
            border: isDark
              ? '1px solid rgba(212,175,55,0.18)'
              : '1px solid rgba(158,122,26,0.14)',
            flexShrink: 0,
          }}>
            <action.icon size={16} color={isDark ? '#d4af37' : '#9e7a1a'} strokeWidth={2} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '12px',
              fontWeight: 700,
              color: isDark ? '#f4f4f5' : '#1C1917',
              lineHeight: 1.1,
              marginBottom: 3,
            }}>
              {action.title}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#a1a1aa' : 'rgba(87, 83, 78, 0.75)',
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
