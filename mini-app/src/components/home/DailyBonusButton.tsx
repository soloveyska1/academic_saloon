import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Flame } from 'lucide-react'

interface DailyBonusButtonProps {
  visible: boolean
  onClick: () => void
}

export const DailyBonusButton = memo(function DailyBonusButton({
  visible,
  onClick,
}: DailyBonusButtonProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ delay: 1, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          aria-label="Получить ежедневный бонус"
          style={{
            position: 'fixed',
            bottom: 110,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--gold-metallic)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.6), 0 10px 30px -10px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <Gift size={26} color="#09090b" strokeWidth={2} aria-hidden="true" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            aria-hidden="true"
            title="Ежедневный бонус доступен!"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239,68,68,0.5)',
              border: '2px solid var(--bg-main)',
            }}
          >
            <Flame size={12} color="#fff" />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
})
