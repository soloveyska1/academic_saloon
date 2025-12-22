import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, ChevronRight } from 'lucide-react'
import { URGENT_OPTIONS } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT HUB SHEET — Bottom sheet with 2 urgent options
//  Solves: duplicate "Urgent" entries (TipsCarousel + Panic Button)
//  Now: single "Срочно" button opens this sheet with 2 options
// ═══════════════════════════════════════════════════════════════════════════

interface UrgentHubSheetProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (route: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

export const UrgentHubSheet = memo(function UrgentHubSheet({ isOpen, onClose, onNavigate, haptic }: UrgentHubSheetProps) {
  const handleOptionClick = (route: string) => {
    haptic('medium')
    onClose()
    onNavigate(route)
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
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 1000,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(180deg, rgba(22,22,26,0.98) 0%, rgba(14,14,16,0.99) 100%)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              zIndex: 1001,
              border: '1px solid rgba(212,175,55,0.15)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
                margin: '0 auto 16px',
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(145deg, rgba(239,68,68,0.2), rgba(185,28,28,0.15))',
                    border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={22} color="#f87171" strokeWidth={1.5} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    Срочная помощь
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    Выберите способ
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="rgba(255,255,255,0.6)" />
              </motion.button>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {URGENT_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOptionClick(option.route)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '18px 16px',
                    background:
                      option.variant === 'primary'
                        ? 'linear-gradient(145deg, rgba(185,28,28,0.2), rgba(127,29,29,0.15))'
                        : 'linear-gradient(145deg, rgba(30,30,34,0.95), rgba(22,22,26,0.95))',
                    border:
                      option.variant === 'primary'
                        ? '1px solid rgba(239,68,68,0.35)'
                        : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background:
                        option.variant === 'primary'
                          ? 'linear-gradient(145deg, #991b1b, #7f1d1d)'
                          : 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <option.icon
                      size={22}
                      color={option.variant === 'primary' ? '#fca5a5' : 'rgba(255,255,255,0.7)'}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: option.variant === 'primary' ? '#f87171' : '#fff',
                        marginBottom: 3,
                      }}
                    >
                      {option.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {option.subtitle}
                    </div>
                  </div>

                  {/* Badge */}
                  {option.badge && (
                    <div
                      style={{
                        padding: '6px 10px',
                        background:
                          option.variant === 'primary'
                            ? 'rgba(185,28,28,0.3)'
                            : 'rgba(212,175,55,0.15)',
                        border:
                          option.variant === 'primary'
                            ? '1px solid rgba(239,68,68,0.3)'
                            : '1px solid rgba(212,175,55,0.3)',
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: option.variant === 'primary' ? '#f87171' : 'var(--gold-400)',
                        }}
                      >
                        {option.badge}
                      </span>
                    </div>
                  )}

                  <ChevronRight
                    size={18}
                    color={option.variant === 'primary' ? '#f87171' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={1.5}
                  />
                </motion.button>
              ))}
            </div>

            {/* Footer hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--gold-400)',
                  boxShadow: '0 0 8px rgba(212,175,55,0.5)',
                }}
              />
              <span style={{ fontSize: 11, color: 'rgba(212,175,55,0.8)', fontWeight: 500 }}>
                Менеджер ответит в течение 5 минут
              </span>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  return prevProps.isOpen === nextProps.isOpen
})
