import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { Zap, Clock, Camera, ChevronRight } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../modals/shared'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — Compact bottom sheet for urgent actions
// ═══════════════════════════════════════════════════════════════════════════
//  Uses shared ModalWrapper for consistent behavior across all modals.
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px -8px rgba(239,68,68,0.3)',
            }}
          >
            <Zap size={26} color="#fca5a5" strokeWidth={1.5} />
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f2', marginBottom: 6 }}
          >
            Срочная помощь
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 13, color: '#71717a' }}
          >
            Выберите подходящий вариант
          </m.div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Option 1: Urgent 24h */}
          <m.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionClick('/create-order?urgent=true')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 16px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
              border: '1px solid rgba(239,68,68,0.18)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Clock size={22} color="#fca5a5" strokeWidth={1.5} />
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fca5a5', marginBottom: 3 }}>
                Срочный заказ
              </div>
              <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.4 }}>
                Выполним работу за 24 часа с гарантией качества
              </div>
            </div>

            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.12)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5' }}>24ч</span>
            </div>

            <ChevronRight size={16} color="rgba(239,68,68,0.3)" style={{ flexShrink: 0 }} />
          </m.button>

          {/* Option 2: Photo estimate */}
          <m.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOptionClick('/create-order?mode=photo')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 16px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Camera size={22} color="#e4e4e7" strokeWidth={1.5} />
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e4e4e7', marginBottom: 3 }}>
                Скинуть фото задания
              </div>
              <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.4 }}>
                Сфотографируйте задание — оценим стоимость за 5 минут
              </div>
            </div>

            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(212,175,55,0.1)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d' }}>5 мин</span>
            </div>

            <ChevronRight size={16} color="rgba(255,255,255,0.15)" style={{ flexShrink: 0 }} />
          </m.button>
        </div>

        {/* Footer */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 20,
            textAlign: 'center',
            padding: '14px',
            borderRadius: 14,
            background: 'rgba(34,197,94,0.04)',
            border: '1px solid rgba(34,197,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: '#71717a' }}>
            Менеджеры <span style={{ color: '#4ade80', fontWeight: 600 }}>онлайн</span> — ответим моментально
          </span>
        </m.div>
      </div>
    </ModalWrapper>
  )
}, (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen)

export default UrgentHubSheet
