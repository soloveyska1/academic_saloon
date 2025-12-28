import { memo, useCallback } from 'react'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { X, Shield, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../ui/GestureGuard'
import { useModalRegistration } from '../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB RULES SHEET - Bottom sheet with club terms
//  Enhanced with GestureGuard integration and drag-to-close
// ═══════════════════════════════════════════════════════════════════════════════

// Unified drag configuration
const DRAG_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 400,
  dragElastic: 0.08,
} as const

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : 20)
    }
  } catch (e) {}
}

interface ClubRulesSheetProps {
  isOpen: boolean
  onClose: () => void
}

const rules = [
  {
    icon: <CheckCircle2 size={18} color="#22c55e" />,
    title: 'Начисление баллов',
    text: 'Баллы начисляются за ежедневный check-in, выполнение заданий и оформление заказов. Баллы не являются деньгами и не подлежат выводу.',
  },
  {
    icon: <Shield size={18} color="#D4AF37" />,
    title: 'Уровни членства',
    text: 'Уровень повышается за набор XP. XP начисляется за активность в клубе и оплаченные заказы. Чем выше уровень — тем больше привилегий.',
  },
  {
    icon: <Info size={18} color="#3B82F6" />,
    title: 'Награды и ваучеры',
    text: 'Награды обмениваются на баллы. Каждый ваучер имеет срок действия и условия применения. Скидочные ваучеры не суммируются между собой.',
  },
  {
    icon: <AlertTriangle size={18} color="#F59E0B" />,
    title: 'Ограничения скидок',
    text: 'Скидки могут иметь минимальный порог заказа, ограниченный срок действия и не применяются к срочным заказам. Максимальная скидка по ваучеру — 10%.',
  },
]

export const ClubRulesSheet = memo(function ClubRulesSheet({
  isOpen,
  onClose,
}: ClubRulesSheetProps) {
  const dragControls = useDragControls()

  // GestureGuard integration
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen, 'club-rules-sheet')

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const shouldClose =
      info.offset.y > DRAG_CONFIG.offsetThreshold ||
      info.velocity.y > DRAG_CONFIG.velocityThreshold

    if (shouldClose) {
      triggerHaptic('light')
      onClose()
    }
  }, [onClose])

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    dragControls.start(e)
  }, [dragControls])

  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="club-rules-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              touchAction: 'none',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="club-rules-sheet"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={DRAG_CONFIG.dragElastic}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '90vh',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              background: '#121215',
              zIndex: 2001,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
              borderTop: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            {/* Drag Handle */}
            <div
              onPointerDown={startDrag}
              style={{
                padding: '12px 0',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>

            {/* Header */}
            <div
              onPointerDown={startDrag}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 20px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'grab',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(212, 175, 55, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={20} color="#D4AF37" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
                  Правила клуба
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="rgba(255, 255, 255, 0.6)" />
              </motion.button>
            </div>

            {/* Content - Scrollable */}
            <div
              data-scroll-container="true"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: 20,
                paddingBottom: 'max(60px, calc(20px + env(safe-area-inset-bottom)))',
              }}
            >
              {rules.map((rule, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {rule.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 6,
                      }}
                    >
                      {rule.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'rgba(255, 255, 255, 0.6)',
                        lineHeight: 1.5,
                      }}
                    >
                      {rule.text}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Footer note */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 14,
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.5,
                  }}
                >
                  Условия клуба могут изменяться. Накопленные баллы и ваучеры сохраняются при изменении условий.
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
