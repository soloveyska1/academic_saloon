import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Send, Loader2 } from 'lucide-react'

interface FloatingCtaDockProps {
  step: number
  totalSteps: number
  isFastMode: boolean
  canProceed: boolean
  submitting: boolean
  submittingLabel?: string | null
  isRevalidating: boolean
  onNext: () => void
  onSubmit: () => void
  selectedServiceLabel?: string
}

export function FloatingCtaDock({
  step,
  totalSteps,
  isFastMode,
  canProceed,
  submitting,
  submittingLabel,
  isRevalidating,
  onNext,
  onSubmit,
  selectedServiceLabel,
}: FloatingCtaDockProps) {
  return (
    <AnimatePresence>
      {canProceed && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {/* The Floating Dock */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={step === totalSteps ? onSubmit : onNext}
            disabled={!canProceed || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              background: 'rgba(10, 10, 12, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: 50,
              cursor: submitting ? 'wait' : 'pointer',
              pointerEvents: 'auto',
              boxShadow: `
                0 10px 40px -10px rgba(0, 0, 0, 0.6),
                0 0 30px -5px rgba(212, 175, 55, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            {/* Left side: Context info */}
            {!isFastMode && step === 1 && selectedServiceLabel && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingRight: 14,
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4af37, #f5d061)',
                    boxShadow: '0 0 8px rgba(212, 175, 55, 0.5)',
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedServiceLabel}
                </span>
              </motion.div>
            )}

            {/* CTA Text */}
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#d4af37',
                letterSpacing: '0.01em',
              }}
            >
              {submitting
                ? (submittingLabel || (isRevalidating ? 'Проверка...' : 'Отправка...'))
                : step === totalSteps
                  ? (isFastMode ? 'Отправить быстрый запрос' : 'Отправить заявку')
                  : step === 1 && !isFastMode
                    ? 'Перейти к деталям'
                  : step === 2 && !isFastMode
                    ? 'Выбрать сроки'
                  : step === 1 && isFastMode
                    ? 'Перейти к сроку'
                  : 'Продолжить'}
            </span>

            {/* Icon */}
            <motion.div
              animate={submitting ? { rotate: 360 } : { rotate: 0 }}
              transition={submitting ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4af37, #b48e26)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(212, 175, 55, 0.4)',
              }}
            >
              {submitting ? (
                <Loader2 size={18} color="#050505" strokeWidth={2.5} />
              ) : step === totalSteps ? (
                <Send size={16} color="#050505" strokeWidth={2.5} />
              ) : (
                <ChevronRight size={20} color="#050505" strokeWidth={2.5} />
              )}
            </motion.div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
