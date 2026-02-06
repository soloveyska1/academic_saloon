import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { Zap, Camera, ArrowRight, Shield } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../modals/shared'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET
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
      <div style={{ padding: '0 20px 8px' }}>

        {/* Hero: big urgent CTA */}
        <m.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionClick('/create-order?urgent=true')}
          style={{
            width: '100%',
            padding: '24px 20px',
            borderRadius: 20,
            background: 'linear-gradient(145deg, #1a0808 0%, #2a0a0a 50%, #140505 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 8px 32px -8px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Top row: icon + badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={24} color="#fca5a5" strokeWidth={1.5} />
              </div>
              <div style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>от 24 часов</span>
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fca5a5', marginBottom: 6 }}>
              Срочный заказ
            </div>
            <div style={{ fontSize: 13, color: 'rgba(252,165,165,0.5)', lineHeight: 1.5, marginBottom: 20 }}>
              Укажите тему, предмет и дедлайн — подберём автора и приступим к выполнению в ближайший час
            </div>

            {/* Action row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fca5a5' }}>
                Оформить заказ
              </span>
              <ArrowRight size={18} color="#fca5a5" />
            </div>
          </div>
        </m.button>

        {/* Photo option — compact */}
        <m.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionClick('/create-order?mode=photo')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Camera size={20} color="#fcd34d" strokeWidth={1.5} />
          </div>

          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', marginBottom: 2 }}>
              Скинуть фото задания
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>
              Оценим стоимость за 5 минут
            </div>
          </div>

          <ArrowRight size={16} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
        </m.button>

        {/* Trust indicators */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <div style={{
            flex: 1,
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={14} color="#22c55e" />
            <span style={{ fontSize: 11, color: '#71717a' }}>Гарантия качества</span>
          </div>
          <div style={{
            flex: 1,
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
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
            <span style={{ fontSize: 11, color: '#71717a' }}>Онлайн 24/7</span>
          </div>
        </m.div>
      </div>
    </ModalWrapper>
  )
}, (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen)

export default UrgentHubSheet
