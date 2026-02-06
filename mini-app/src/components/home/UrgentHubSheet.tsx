import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { Zap, Camera, ArrowRight, Shield, Sparkles } from 'lucide-react'
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
      <div style={{ padding: '0 20px 16px' }}>

        {/* Visible header */}
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px -4px rgba(239,68,68,0.4)',
            flexShrink: 0,
          }}>
            <Zap size={22} color="#fff" strokeWidth={2} fill="rgba(255,255,255,0.2)" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f5', lineHeight: 1.2 }}>
              Срочная помощь
            </div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>
              Приступим в ближайший час
            </div>
          </div>
        </m.div>

        {/* Option 1: Urgent order */}
        <m.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionClick('/create-order?urgent=true')}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 18,
            background: 'linear-gradient(145deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Sparkles size={22} color="#fca5a5" strokeWidth={1.5} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 3 }}>
              Срочный заказ
            </div>
            <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.4 }}>
              Укажите тему, предмет и дедлайн — подберём автора
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
            flexShrink: 0,
          }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', whiteSpace: 'nowrap' }}>от 24ч</span>
            </div>
            <ArrowRight size={16} color="rgba(252,165,165,0.4)" />
          </div>
        </m.button>

        {/* Option 2: Photo estimate */}
        <m.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOptionClick('/create-order?type=photo_task&urgent=true')}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 18,
            background: 'linear-gradient(145deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Camera size={22} color="#fcd34d" strokeWidth={1.5} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 3 }}>
              Скинуть фото задания
            </div>
            <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.4 }}>
              Оценим стоимость за 5 минут
            </div>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
            flexShrink: 0,
          }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.15)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d', whiteSpace: 'nowrap' }}>5 мин</span>
            </div>
            <ArrowRight size={16} color="rgba(212,175,55,0.3)" />
          </div>
        </m.button>

        {/* Trust indicators */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(34,197,94,0.05)',
            border: '1px solid rgba(34,197,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={14} color="#4ade80" />
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>Гарантия качества</span>
          </div>
          <div style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(34,197,94,0.05)',
            border: '1px solid rgba(34,197,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>Онлайн 24/7</span>
          </div>
        </m.div>
      </div>
    </ModalWrapper>
  )
}, (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen)

export default UrgentHubSheet
