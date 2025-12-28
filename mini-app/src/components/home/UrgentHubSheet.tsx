import { memo } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, Zap, ChevronRight, Clock, Camera } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — Bottom sheet with 2 urgent options
//  Full Redesign: Elite Gold Theme, Swipe-to-close, Premium Animations
// ═══════════════════════════════════════════════════════════════════════════

interface UrgentHubSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

export const UrgentHubSheet = memo(function UrgentHubSheet({ isOpen, onClose, onNavigate, haptic }: UrgentHubSheetProps) {

  const handleOptionClick = (type: 'urgent' | 'photo') => {
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
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)', // Darker backdrop
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 1000,
            }}
          />

          {/* Sheet */}
          <motion.div
            drag="y"
            dragControls={undefined}
            dragConstraints={{ top: 0 }}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)', // Premium Deep Dark
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: '12px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
              zIndex: 1001,
              borderTop: '1px solid rgba(212,175,55,0.2)', // Top gold border
              boxShadow: '0 -10px 50px rgba(0,0,0,0.8)',
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
                margin: '0 auto 20px',
              }}
            />

            {/* Header */}
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
                    background: 'linear-gradient(145deg, rgba(39,39,42,0.6), rgba(24,24,27,0.8))',
                    border: '1px solid rgba(239,68,68,0.2)', // Subtle red tint for urgency
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
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
                      lineHeight: 1.2
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
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
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

            {/* Options Panel */}
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
                  padding: '20px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(80, 20, 20, 0.4) 0%, rgba(40, 10, 10, 0.4) 100%)', // Red tint glassy
                  border: '1px solid rgba(239,68,68,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Icon Container */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(145deg, #7f1d1d, #450a0a)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={24} color="#fca5a5" />
                </div>

                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fca5a5', marginBottom: 4 }}>
                    Срочный заказ
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(252, 165, 165, 0.7)' }}>
                    Выполним за 24 часа
                  </div>
                </div>

                {/* Badge */}
                <div style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                    24ч
                  </span>
                </div>

                <ChevronRight size={18} color="rgba(239,68,68,0.5)" />
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
                  padding: '20px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(30,30,35,0.6) 0%, rgba(20,20,22,0.6) 100%)', // Dark glassy
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                {/* Icon Container */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Camera size={24} color="#e5e5e5" />
                </div>

                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f2f2f2', marginBottom: 4 }}>
                    Скинь фото
                  </div>
                  <div style={{ fontSize: 13, color: '#a1a1aa' }}>
                    Оценим за 5 минут
                  </div>
                </div>

                {/* Badge */}
                <div style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.25)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fcd34d' }}>
                    5 мин
                  </span>
                </div>

                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </motion.button>

            </div>

            {/* Footer hint */}
            <div style={{
              marginTop: 20,
              padding: '12px 16px',
              background: 'linear-gradient(90deg, rgba(212,175,55,0.05) 0%, transparent 100%)',
              borderLeft: '2px solid #d4af37',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 10px #d4af37'
              }} />
              <span style={{ fontSize: 12, color: '#d4af37', fontWeight: 600 }}>
                Менеджеры на связи (Online)
              </span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen
})
