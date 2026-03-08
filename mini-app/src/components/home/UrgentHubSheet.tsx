import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { ArrowRight, Camera, Shield, Zap } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../modals/shared'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — Quiet Luxury Redesign
//  Gold monochrome, no red accents. Urgency communicated via copy, not color.
// ═══════════════════════════════════════════════════════════════════════════

interface UrgentHubSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

function ActionOption({
  icon: Icon,
  title,
  description,
  tag,
  onClick,
}: {
  icon: typeof Zap
  title: string
  description: string
  tag: string
  onClick: () => void
}) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 18,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: 'rgba(212,175,55,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color="rgba(212,175,55,0.55)" strokeWidth={1.5} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 5,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
            {title}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(212,175,55,0.6)',
            padding: '2px 7px', borderRadius: 6,
            background: 'rgba(212,175,55,0.06)',
          }}>
            {tag}
          </span>
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.42)',
        }}>
          {description}
        </div>
      </div>

      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'rgba(212,175,55,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 4,
      }}>
        <ArrowRight size={14} color="rgba(212,175,55,0.50)" />
      </div>
    </m.button>
  )
}

export const UrgentHubSheet = memo(function UrgentHubSheet({
  isOpen,
  onClose,
  onNavigate,
  haptic = triggerHaptic,
}: UrgentHubSheetProps) {
  const handleOption = useCallback((route: string) => {
    haptic('medium')
    onClose()
    setTimeout(() => onNavigate(route), 180)
  }, [haptic, onClose, onNavigate])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="urgent-hub"
      title="Срочный запрос"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '0 20px 20px' }}>

        {/* Hero */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 28px' }}
        >
          {/* Icon */}
          <m.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1px solid rgba(212,175,55,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 20px 48px -12px rgba(212,175,55,0.18)',
            }}
          >
            <Zap size={30} color="rgba(212,175,55,0.65)" strokeWidth={1.4} />
          </m.div>

          <div style={{
            fontSize: 26, fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.02em', marginBottom: 10,
            fontFamily: "'Manrope', sans-serif",
            color: '#E8D5A3',
          }}>
            Срочный заказ
          </div>
          <div style={{
            fontSize: 14, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.42)', fontWeight: 500,
            maxWidth: 260, margin: '0 auto',
          }}>
            Выберите удобный способ — заполнить заявку или просто прислать фото
          </div>
        </m.div>

        {/* Divider */}
        <div aria-hidden="true" style={{
          height: 1, marginBottom: 20,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
        }} />

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ActionOption
              icon={Zap}
              title="Срочная заявка"
              description="Формат, тема и дедлайн уже понятны — заполните заявку в ускоренном режиме."
              tag="от 24 ч"
              onClick={() => handleOption('/create-order?urgent=true')}
            />
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <ActionOption
              icon={Camera}
              title="Фото задания"
              description="Пришлите фото или скрин — оценим объём и стоимость без заполнения формы."
              tag="5 мин"
              onClick={() => handleOption('/create-order?type=photo_task&urgent=true&mode=fast')}
            />
          </m.div>
        </div>

        {/* Trust note */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: 'rgba(212,175,55,0.03)',
            border: '1px solid rgba(212,175,55,0.06)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}
        >
          <Shield size={15} color="rgba(212,175,55,0.45)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.38)' }}>
            Все гарантии и сопровождение действуют так же, как в обычном заказе
          </div>
        </m.div>

      </div>
    </ModalWrapper>
  )
}, (prev, next) => prev.isOpen === next.isOpen)

export default UrgentHubSheet
