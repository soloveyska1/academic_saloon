import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { QUICK_ACTIONS } from './constants'
import { StaggerGrid } from '../ui/StaggerReveal'
import { MagneticButton } from '../ui/MagneticButton'

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

  // ── Embedded variant: vertical list ──
  if (embedded) {
    return (
      <div style={{ display: 'grid', gap: 0 }}>
        {actions.map((action, index) => {
          const isPrimary = action.id === 'urgent'
          return (
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
                  background: isPrimary ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isPrimary ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.06)'}`,
                  color: isPrimary ? 'var(--gold-300)' : 'var(--gold-400)',
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
                    color: isPrimary ? 'var(--gold-300)' : 'var(--text-primary)',
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
                  color: isPrimary ? 'var(--gold-300)' : 'var(--text-muted)',
                }}
              >
                <ArrowUpRight size={14} strokeWidth={2.2} />
              </div>
            </motion.button>
          )
        })}
      </div>
    )
  }

  // ── Non-embedded: grid with MagneticButton + StaggerGrid ──
  return (
    <StaggerGrid columns={2} gap={10} animation="spring">
      {actions.map((action) => {
        const isPrimary = action.id === 'urgent'

        return (
          <MagneticButton
            key={action.id}
            magneticStrength={0.3}
            onClick={() => handleClick(action)}
            style={{
              padding: 16,
              borderRadius: 12,
              textAlign: 'left' as const,
              minHeight: 100,
              gridColumn: isPrimary ? '1 / -1' : undefined,
              background: isPrimary
                ? 'linear-gradient(160deg, rgba(34,28,14,0.98) 0%, rgba(16,16,16,0.96) 50%, rgba(9,9,10,1) 100%)'
                : 'linear-gradient(160deg, rgba(18,18,17,0.92) 0%, rgba(11,11,12,0.95) 100%)',
              border: `1px solid ${isPrimary ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)'}`,
              overflow: 'hidden',
            }}
          >
            {isPrimary ? (
              /* Primary (Срочный заказ): horizontal layout with icon+text and arrow */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Icon container */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(212,175,55,0.12)',
                      border: '1px solid rgba(212,175,55,0.16)',
                      flexShrink: 0,
                    }}
                  >
                    <action.icon size={17} color="var(--gold-300)" strokeWidth={2} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: 'var(--text-primary)',
                        marginBottom: 2,
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
                </div>

                {/* ArrowUpRight */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--gold-300)',
                    flexShrink: 0,
                  }}
                >
                  <ArrowUpRight size={14} strokeWidth={2.2} />
                </div>
              </div>
            ) : (
              /* Non-primary cards: vertical layout */
              <div style={{ width: '100%' }}>
                {/* Icon container */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 12,
                  }}
                >
                  <action.icon size={17} color="var(--gold-400)" strokeWidth={2} />
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  {action.title}
                </div>

                {/* Subtitle */}
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
            )}
          </MagneticButton>
        )
      })}
    </StaggerGrid>
  )
})
