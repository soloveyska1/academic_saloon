import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { Zap, Camera, ArrowRight, Shield } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../modals/shared'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — "The Void & The Gold" Premium Edition
// ═══════════════════════════════════════════════════════════════════════════

interface UrgentHubSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const UrgentHubSheet = memo(function UrgentHubSheet({
  isOpen,
  onClose,
  onNavigate,
  haptic = triggerHaptic,
}: UrgentHubSheetProps) {
  const handleOptionClick = useCallback((route: string) => {
    haptic('medium')
    onClose()
    setTimeout(() => onNavigate(route), 200)
  }, [haptic, onClose, onNavigate])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="urgent-hub"
      title="Срочная помощь"
      accentColor="#ef4444"
    >
      <div style={{ padding: '0 20px 20px' }}>

        {/* ── Section label (Cinzel serif, like home page section titles) ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.03 }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 12,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          Срочная помощь
          <div style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(90deg, rgba(82,82,91,0.3), transparent)',
          }} />
        </m.div>

        {/* ── Option cards (voidGlass material) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {/* Urgent order */}
          <m.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionClick('/create-order?urgent=true')}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Premium top highlight */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
            }} />

            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.15))',
            }}>
              <Zap size={20} color="#d4af37" strokeWidth={1.5} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 3 }}>
                Срочный заказ
              </div>
              <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
                Укажите тему и дедлайн — подберём автора
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
              flexShrink: 0,
            }}>
              <div style={{
                padding: '3px 10px',
                borderRadius: 8,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 10, fontWeight: 600, color: '#d4af37',
                  letterSpacing: '0.05em',
                }}>от 24ч</span>
              </div>
              <ArrowRight size={16} color="rgba(212,175,55,0.3)" />
            </div>
          </m.button>

          {/* Photo estimate */}
          <m.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionClick('/create-order?type=photo_task&urgent=true')}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
            }} />

            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.15))',
            }}>
              <Camera size={20} color="#d4af37" strokeWidth={1.5} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 3 }}>
                Скинуть фото задания
              </div>
              <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
                Оценим стоимость за 5 минут
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
              flexShrink: 0,
            }}>
              <div style={{
                padding: '3px 10px',
                borderRadius: 8,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.15)',
              }}>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 10, fontWeight: 600, color: '#d4af37',
                  letterSpacing: '0.05em',
                }}>5 мин</span>
              </div>
              <ArrowRight size={16} color="rgba(212,175,55,0.3)" />
            </div>
          </m.button>
        </div>

        {/* ── Trust indicators ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
          style={{ display: 'flex', gap: 10 }}
        >
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.03)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={13} color="#d4af37" style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.3))' }} />
            <span style={{ fontSize: 11, color: '#71717a', letterSpacing: '0.02em' }}>Гарантия качества</span>
          </div>
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.03)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#71717a', letterSpacing: '0.02em' }}>Онлайн 24/7</span>
          </div>
        </m.div>
      </div>
    </ModalWrapper>
  )
}, (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen)

export default UrgentHubSheet
