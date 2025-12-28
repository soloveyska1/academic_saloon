import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useScrollLock } from './ui/GestureGuard'
import { useModalRegistration } from '../contexts/NavigationContext'

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

interface Prize {
  id: string
  label: string
  sublabel: string
  color: string
  textColor: string
  icon: string
}

interface PrizeModalProps {
  prize: Prize
  onClose: () => void
}

export const PrizeModal = memo(function PrizeModal({ prize, onClose }: PrizeModalProps) {
  // GestureGuard integration
  useScrollLock(true)
  useModalRegistration(true, 'prize-modal')

  const handleClose = useCallback(() => {
    triggerHaptic('medium')
    onClose()
  }, [onClose])

  const handleBackdropClick = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        touchAction: 'none',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          padding: '40px 32px 32px',
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(25,25,30,0.98) 0%, rgba(15,15,18,0.99) 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.2)',
          textAlign: 'center',
          overflow: 'hidden',
          zIndex: 2001,
        }}
      >
        {/* Иконка приза */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
          style={{
            fontSize: 64,
            marginBottom: 20,
            filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.4))',
          }}
        >
          {prize.icon}
        </motion.div>

        {/* Заголовок */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#D4AF37',
            marginBottom: 12,
            textShadow: '0 0 20px rgba(212,175,55,0.4)',
          }}
        >
          Поздравляем!
        </motion.h2>

        {/* Название приза */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ marginBottom: 8 }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {prize.label}
          </span>
        </motion.div>

        {/* Подзаголовок */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          {prize.sublabel}
        </motion.p>

        {/* Кнопка */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '16px 32px',
            fontSize: 16,
            fontWeight: 600,
            color: '#0a0a0c',
            background: 'linear-gradient(135deg, #D4AF37, #f5d485)',
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(212,175,55,0.3)',
          }}
        >
          Забрать
        </motion.button>

        {/* Декоративные частицы */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          borderRadius: 24,
        }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                background: '#D4AF37',
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: '0 0 8px #D4AF37',
              }}
              animate={{
                y: [0, -100],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
})
