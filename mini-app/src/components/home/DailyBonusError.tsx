import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RotateCw } from 'lucide-react'

interface DailyBonusErrorProps {
  onRetry: () => void
}

export function DailyBonusError({ onRetry }: DailyBonusErrorProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'fixed',
          bottom: 110,
          right: 20,
          zIndex: 100,
        }}
      >
        {/* Error Badge */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            minWidth: 200,
            padding: '12px 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.95) 0%, rgba(220,38,38,0.9) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(239,68,68,0.6)',
            boxShadow: '0 8px 32px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Error message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <AlertCircle size={20} color="#fff" strokeWidth={2} />
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 2,
              }}>
                Ошибка загрузки
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.8)',
              }}>
                Не удалось загрузить бонус
              </div>
            </div>
          </div>

          {/* Retry button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RotateCw size={14} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
            }}>
              Повторить
            </span>
          </motion.button>
        </motion.div>

        {/* Pulsing error indicator dot */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fca5a5, #ef4444)',
            border: '2px solid #fff',
            boxShadow: '0 0 20px rgba(239,68,68,0.6)',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
