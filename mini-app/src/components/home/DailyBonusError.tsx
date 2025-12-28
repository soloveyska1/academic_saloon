import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface DailyBonusErrorProps {
  onRetry: () => void
}

export function DailyBonusError({ onRetry }: DailyBonusErrorProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          zIndex: 100,
        }}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          style={{
            minWidth: 280,
            padding: '16px 20px',
            borderRadius: 20,
            background: 'linear-gradient(145deg, rgba(20, 20, 24, 0.95), rgba(10, 10, 12, 0.98))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Accent Line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)'
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={18} color="#ef4444" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#f2f2f2',
                fontFamily: "'Manrope', sans-serif"
              }}>
                Ошибка загрузки
              </div>
              <div style={{
                fontSize: 12,
                color: '#a1a1aa',
                marginTop: 2
              }}>
                Не удалось обновить бонусы
              </div>
            </div>
          </div>

          {/* Action */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onRetry}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 12,
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} color="#d4af37" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#d4af37' }}>
              Повторить попытку
            </span>
          </motion.button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
