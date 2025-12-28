import { memo, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion'
import { X, Zap, ChevronRight, Clock, Camera } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../ui/GestureGuard'
import { useModalRegistration } from '../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — Premium Bottom Sheet with Robust Gesture Handling
// ═══════════════════════════════════════════════════════════════════════════
//
//  Улучшения v2:
//  1. Интеграция с GestureGuard для блокировки скролла
//  2. Унифицированные пороги drag-to-close
//  3. Регистрация в NavigationContext
//  4. Защита от случайного закрытия
//  5. Haptic feedback
// ═══════════════════════════════════════════════════════════════════════════

// Unified drag configuration (same as PremiumSheet)
const DRAG_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 400,
  dragElastic: 0.08,
} as const

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 35)
    }
  } catch (e) {
    // Ignore haptic errors
  }
}

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
  haptic = triggerHaptic
}: UrgentHubSheetProps) {
  const dragControls = useDragControls()

  // Интеграция с GestureGuard и NavigationContext
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen, 'urgent-hub-sheet')

  const handleOptionClick = useCallback((type: 'urgent' | 'photo') => {
    haptic('medium')
    onClose()

    // Slight delay to allow sheet to close before navigation
    setTimeout(() => {
      if (type === 'urgent') {
        onNavigate('/create-order?urgent=true')
      } else {
        onNavigate('/create-order?mode=photo')
      }
    }, 200)
  }, [haptic, onClose, onNavigate])

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const shouldClose =
      info.offset.y > DRAG_CONFIG.offsetThreshold ||
      info.velocity.y > DRAG_CONFIG.velocityThreshold

    if (shouldClose) {
      haptic('light')
      onClose()
    }
  }, [haptic, onClose])

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    dragControls.start(e)
  }, [dragControls])

  const handleClose = useCallback(() => {
    haptic('light')
    onClose()
  }, [haptic, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              BACKDROP — Dark overlay with blur
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="urgent-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              touchAction: 'none', // Prevent touch events passing through
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════
              SHEET — Main container with drag support
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="urgent-sheet"
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
              maxHeight: '85vh',
              background: '#09090b',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              zIndex: 2001,
              borderTop: '1px solid rgba(212,175,55,0.3)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ═══════════════════════════════════════════════════════════
                DRAG HANDLE — Active Zone (only this has touchAction: none)
                ═══════════════════════════════════════════════════════════ */}
            <div
              onPointerDown={startDrag}
              style={{
                padding: '12px 20px 0',
                cursor: 'grab',
                touchAction: 'none',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.15)',
                  margin: '0 auto 16px',
                }}
              />
            </div>

            {/* ═══════════════════════════════════════════════════════════
                SCROLLABLE CONTENT AREA
                ═══════════════════════════════════════════════════════════ */}
            <div
              data-scroll-container="true"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Explicitly allow vertical scrolling
                padding: '0 20px',
                paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
              }}
            >
              {/* ═══════════════════════════════════════════════════════════
                  HEADER — Title and close button
                  ═══════════════════════════════════════════════════════════ */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                }}
              >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'linear-gradient(145deg, rgba(24,24,27,1), rgba(9,9,11,1))',
                    border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <Zap size={24} color="#fca5a5" strokeWidth={1.5} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#f2f2f2',
                      fontFamily: "'Manrope', sans-serif",
                      lineHeight: 1.2,
                    }}
                  >
                    Срочная помощь
                  </div>
                  <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>
                    Выберите способ заказа
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="rgba(255,255,255,0.5)" />
              </motion.button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                OPTIONS — Action buttons
                ═══════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Option 1: Urgent 24h */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionClick('urgent')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px',
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(60, 10, 10, 0.4) 0%, rgba(20, 5, 5, 0.4) 100%)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Clock size={22} color="#fca5a5" />
                </div>

                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fca5a5', marginBottom: 3 }}>
                    Срочный заказ
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(252, 165, 165, 0.6)' }}>
                    Выполним за 24 часа
                  </div>
                </div>

                <div style={{
                  padding: '5px 9px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5' }}>
                    24ч
                  </span>
                </div>

                <ChevronRight size={18} color="rgba(239,68,68,0.4)" />
              </motion.button>

              {/* Option 2: Photo 5 min */}
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionClick('photo')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Camera size={22} color="#e5e5e5" />
                </div>

                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f2f2', marginBottom: 3 }}>
                    Скинуть фото
                  </div>
                  <div style={{ fontSize: 13, color: '#a1a1aa' }}>
                    Оценим за 5 минут
                  </div>
                </div>

                <div style={{
                  padding: '5px 9px',
                  borderRadius: 8,
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d' }}>
                    5 мин
                  </span>
                </div>

                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
              </motion.button>

            </div>

              {/* ═══════════════════════════════════════════════════════════
                  FOOTER — Status indicator
                  ═══════════════════════════════════════════════════════════ */}
              <div style={{
                marginTop: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: 0.7,
              }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                }} />
                <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 500 }}>
                  Менеджеры онлайн
                </span>
              </div>

            </div>
            {/* End of scrollable content area */}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen
})

export default UrgentHubSheet
