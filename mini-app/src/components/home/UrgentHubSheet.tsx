import { memo, useCallback } from 'react'
import { m } from 'framer-motion'
import { ArrowRight, Camera, Shield, Zap } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../modals/shared'

interface UrgentHubSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

function UrgentActionCard({
  icon: Icon,
  title,
  description,
  badge,
  actionLabel,
  accent,
  onClick,
}: {
  icon: typeof Zap
  title: string
  description: string
  badge: string
  actionLabel: string
  accent: string
  onClick: () => void
}) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 16,
        borderRadius: 18,
        background: `
          radial-gradient(circle at top right, ${accent}18, transparent 34%),
          linear-gradient(180deg, rgba(18,18,21,0.96), rgba(11,11,16,0.96))
        `,
        border: `1px solid ${accent}22`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 12,
        textAlign: 'left',
        boxShadow: `0 18px 34px -30px ${accent}66`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: `${accent}18`,
            border: `1px solid ${accent}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} color={accent} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {title}
            </div>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11,
                fontWeight: 700,
                color: accent,
                flexShrink: 0,
              }}
            >
              {badge}
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {actionLabel}
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <ArrowRight size={16} color={accent} />
        </div>
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
  const handleOptionClick = useCallback((route: string) => {
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
      accentColor="#ef4444"
    >
      <div style={{ padding: '0 20px 20px' }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ paddingTop: 4, marginBottom: 18 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: '#f87171',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            <Zap size={12} />
            Срочно
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
            Быстрый вход для срочных задач
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Выберите удобный сценарий: сразу открыть срочную заявку или быстро прислать фото задания на оценку.
          </div>
        </m.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <UrgentActionCard
            icon={Zap}
            title="Срочная заявка"
            description="Для задач, где уже понятны формат, тема и дедлайн. Откроется полный маршрут оформления, но сразу в срочном режиме."
            badge="от 24 ч"
            actionLabel="Открыть срочный маршрут"
            accent="#f59e0b"
            onClick={() => handleOptionClick('/create-order?urgent=true')}
          />

          <UrgentActionCard
            icon={Camera}
            title="Фото задания"
            description="Если проще прислать фото, скрин или методичку. Подойдёт, когда нужно быстро оценить объём и стоимость без длинного заполнения."
            badge="5 минут"
            actionLabel="Отправить на быструю оценку"
            accent="#d4af37"
            onClick={() => handleOptionClick('/create-order?type=photo_task&urgent=true&mode=fast')}
          />
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <Shield size={16} color="#d4af37" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Срочный режим сразу подставляет ближайший срок и ускоряет оценку. Гарантии, поддержка и сопровождение остаются теми же, что и в обычной заявке.
          </div>
        </div>
      </div>
    </ModalWrapper>
  )
}, (prevProps, nextProps) => prevProps.isOpen === nextProps.isOpen)

export default UrgentHubSheet
