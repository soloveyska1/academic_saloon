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
  // In fast mode, always show the dock (disabled state when can't proceed)
  const alwaysShow = isFastMode
  const isVisible = canProceed || alwaysShow

  return (
    <AnimatePresence>
      {isVisible && (
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
            whileTap={canProceed ? { scale: 0.97 } : undefined}
            onClick={step === totalSteps ? onSubmit : onNext}
            disabled={!canProceed || submitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 24px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px) saturate(120%)',
              WebkitBackdropFilter: 'blur(16px) saturate(120%)',
              border: `1px solid ${canProceed ? 'var(--gold-glass-strong)' : 'var(--border-strong)'}`,
              borderRadius: 12,
              cursor: !canProceed ? 'default' : submitting ? 'wait' : 'pointer',
              pointerEvents: 'auto',
              opacity: canProceed ? 1 : 0.5,
              transition: 'opacity 0.3s ease, border-color 0.3s ease',
              boxShadow: canProceed ? `
                0 10px 40px -10px rgba(0, 0, 0, 0.6),
                0 0 30px -5px var(--gold-glass-medium),
                inset 0 1px 0 var(--border-default)
              ` : '0 4px 20px -8px rgba(0, 0, 0, 0.4)',
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
                  paddingRight: 16,
                  borderRight: '1px solid var(--surface-active)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--gold-metallic)',
                    boxShadow: '0 0 8px var(--gold-glass-strong)',
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
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
                color: 'var(--gold-400)',
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
                background: 'var(--gold-metallic)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-gold)',
              }}
            >
              {submitting ? (
                <Loader2 size={18} color="var(--text-on-gold)" strokeWidth={2.5} />
              ) : step === totalSteps ? (
                <Send size={16} color="var(--text-on-gold)" strokeWidth={2.5} />
              ) : (
                <ChevronRight size={20} color="var(--text-on-gold)" strokeWidth={2.5} />
              )}
            </motion.div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
