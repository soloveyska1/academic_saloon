import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { QUICK_ACTIONS } from './constants'

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        marginBottom: 18,
      }}
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleClick(action)}
          style={{
            minWidth: 0,
            padding: '16px 14px 14px',
            minHeight: 118,
            borderRadius: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            cursor: 'pointer',
            background: action.id === 'urgent'
              ? 'linear-gradient(160deg, rgba(34, 27, 14, 0.96) 0%, rgba(18, 16, 12, 0.92) 100%)'
              : 'linear-gradient(160deg, rgba(18, 18, 17, 0.9) 0%, rgba(11, 11, 12, 0.92) 100%)',
            border: `1px solid ${action.id === 'urgent' ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)'}`,
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            textAlign: 'left',
            boxShadow: '0 22px 34px -30px rgba(0, 0, 0, 0.75)',
          }}
        >
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: action.id === 'urgent' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${action.id === 'urgent' ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.06)'}`,
              flexShrink: 0,
            }}>
              <action.icon size={17} color={action.id === 'urgent' ? 'var(--gold-300)' : 'var(--gold-400)'} strokeWidth={2} />
            </div>

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: action.id === 'urgent' ? 'var(--gold-300)' : 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              <ArrowUpRight size={14} strokeWidth={2.2} />
            </div>
          </div>

          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              marginBottom: 6,
            }}>
              {action.title}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              lineHeight: 1.35,
            }}>
              {action.subtitle}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
})
