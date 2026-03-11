import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useModalRegistration } from '../../contexts/NavigationContext'

interface PromoWarningModalProps {
  isOpen: boolean
  reason: string | null
  onContinue: () => void
  onCancel: () => void
  isDark: boolean
}

export function PromoWarningModal({ isOpen, reason, onContinue, onCancel, isDark }: PromoWarningModalProps) {
  useModalRegistration(isOpen, 'create-order-promo-warning')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark
                ? 'linear-gradient(145deg, #1f1f25 0%, #18181c 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
              borderRadius: 28,
              padding: '32px 28px',
              maxWidth: 380,
              width: '100%',
              border: '2px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '3px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AlertCircle size={36} color="#ef4444" strokeWidth={2.5} />
            </div>

            <h3 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24,
              fontWeight: 700,
              color: isDark ? '#f2f2f2' : '#18181b',
              textAlign: 'center',
              marginBottom: 14,
            }}>
              Промокод недействителен
            </h3>

            <p style={{
              fontSize: 15,
              color: isDark ? '#a1a1aa' : '#52525b',
              textAlign: 'center',
              lineHeight: 1.7,
              marginBottom: 28,
            }}>
              {reason || 'Промокод больше не действителен.'}
              {' '}Вы можете создать заказ без скидки или вернуться и ввести другой промокод.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#050505',
                  background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                Создать без скидки
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: isDark ? '#d4af37' : '#b8962e',
                  background: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.12)',
                  border: `1.5px solid ${isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.3)'}`,
                  borderRadius: 16,
                  cursor: 'pointer',
                }}
              >
                Ввести другой промокод
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
