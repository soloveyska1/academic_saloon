import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { QUICK_ACTIONS } from './constants'

interface QuickActionsRowProps {
  onNavigate: (route: string) => void
  onOpenModal: (modal: 'cashback' | 'guarantees') => void
  onOpenUrgentSheet: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
  cashbackPercent?: number
  embedded?: boolean
}

export const QuickActionsRow = memo(function QuickActionsRow({
  onNavigate,
  onOpenModal,
  onOpenUrgentSheet,
  haptic,
  cashbackPercent,
  embedded = false,
}: QuickActionsRowProps) {
  const actions = useMemo(() => {
    return QUICK_ACTIONS.map((action) => {
      if (action.id === 'cashback' && cashbackPercent != null && cashbackPercent > 0) {
        return {
          ...action,
          subtitle: `${cashbackPercent}% на новые заказы`,
        }
      }
      if (action.id === 'urgent') {
        return {
          ...action,
          subtitle: 'оценка за 5 минут',
        }
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
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 12,
        marginBottom: 0,
      }}
    >
      {actions.map((action, index) => {
        const isPrimary = action.id === 'urgent'

        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleClick(action)}
            style={{
              minWidth: 0,
              minHeight: isPrimary ? (embedded ? 118 : 142) : (embedded ? 100 : 118),
              padding: isPrimary ? (embedded ? '14px 14px 13px' : '18px 16px 16px') : (embedded ? '14px 13px' : '16px 15px'),
              borderRadius: embedded ? 20 : 26,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left',
              background: isPrimary
                ? (embedded
                  ? 'linear-gradient(160deg, rgba(212,175,55,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                  : 'linear-gradient(160deg, rgba(34, 28, 14, 0.98) 0%, rgba(16, 16, 16, 0.96) 50%, rgba(9, 9, 10, 1) 100%)')
                : (embedded
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(160deg, rgba(18, 18, 17, 0.92) 0%, rgba(11, 11, 12, 0.95) 100%)'),
              border: `1px solid ${isPrimary ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)'}`,
              backdropFilter: embedded ? 'none' : 'blur(16px) saturate(140%)',
              WebkitBackdropFilter: embedded ? 'none' : 'blur(16px) saturate(140%)',
              boxShadow: embedded ? 'none' : '0 22px 36px -30px rgba(0, 0, 0, 0.82)',
              gridColumn: isPrimary ? '1 / -1' : 'span 1',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {!embedded && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: isPrimary ? -52 : -36,
                  right: isPrimary ? -26 : -20,
                  width: isPrimary ? 160 : 120,
                  height: isPrimary ? 160 : 120,
                  borderRadius: '50%',
                  background: isPrimary
                    ? 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.05) 28%, transparent 72%)'
                    : 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 28%, transparent 72%)',
                  pointerEvents: 'none',
                }}
              />
            )}

            <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div
                style={{
                  width: embedded ? 34 : isPrimary ? 40 : 36,
                  height: embedded ? 34 : isPrimary ? 40 : 36,
                  borderRadius: embedded ? 12 : isPrimary ? 16 : 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isPrimary ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isPrimary ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.06)'}`,
                  flexShrink: 0,
                }}
              >
                <action.icon size={isPrimary ? 18 : 17} color={isPrimary ? 'var(--gold-300)' : 'var(--gold-400)'} strokeWidth={2} />
              </div>

              <div
                style={{
                  width: embedded ? 28 : 30,
                  height: embedded ? 28 : 30,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: isPrimary ? 'var(--gold-300)' : 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: isPrimary ? "var(--font-display, 'Playfair Display', serif)" : "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: isPrimary ? (embedded ? 23 : 28) : (embedded ? 15 : 17),
                  fontWeight: 700,
                  lineHeight: isPrimary ? (embedded ? 1.02 : 0.98) : 1.15,
                  letterSpacing: isPrimary ? '-0.04em' : '-0.02em',
                  color: 'var(--text-primary)',
                  marginBottom: 6,
                }}
              >
                {action.title}
              </div>

              <div
                style={{
                  fontSize: embedded ? 11 : isPrimary ? 13 : 12,
                  fontWeight: 500,
                  lineHeight: embedded ? 1.35 : 1.45,
                  color: 'var(--text-secondary)',
                  maxWidth: isPrimary ? 260 : undefined,
                }}
              >
                {action.subtitle}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
})
