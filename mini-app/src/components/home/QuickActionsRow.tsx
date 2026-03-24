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

  // ── Embedded variant: vertical list ──
  if (embedded) {
    return (
      <div style={{ display: 'grid', gap: 0 }}>
        {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleClick(action)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '36px minmax(0, 1fr) 28px',
                alignItems: 'center',
                gap: 12,
                padding: '13px 0',
                border: 'none',
                borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--gold-400)',
                }}
              >
                <action.icon size={17} strokeWidth={2} />
              </div>

              {/* Title + subtitle */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: 'var(--text-primary)',
                    marginBottom: 3,
                  }}
                >
                  {action.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {action.subtitle}
                </div>
              </div>

              {/* Arrow circle */}
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
                  color: 'var(--text-muted)',
                }}
              >
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </div>
            </motion.button>
        ))}
      </div>
    )
  }

  // ── Non-embedded: unified gold horizontal cards ──
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleClick(action)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
            appearance: 'none' as const,
            textAlign: 'left' as const,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--gold-glass-subtle)',
              border: '1px solid rgba(212,175,55,0.12)',
              flexShrink: 0,
            }}
          >
            <action.icon
              size={15}
              strokeWidth={2}
              style={{ color: 'var(--gold-400)' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
            }}>
              {action.title}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.3,
            }}>
              {action.subtitle}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
})
