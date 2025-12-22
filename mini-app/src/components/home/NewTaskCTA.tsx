import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — THE Primary action button (2x larger, unmissable)
//  Premium minimalist design with gold accent
//  This is THE main conversion point — make it impossible to miss
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const NewTaskCTA = memo(function NewTaskCTA({ onClick, haptic }: NewTaskCTAProps) {
  const shouldReduceMotion = useReducedMotion()

  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      aria-label="Создать новую задачу с персональным менеджером"
      style={{
        position: 'relative',
        width: '100%',
        padding: '22px 24px',
        borderRadius: 16,
        border: '1px solid rgba(212,175,55,0.5)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #D4AF37 0%, #c9a430 50%, #D4AF37 100%)',
        boxShadow: '0 8px 32px -8px rgba(212,175,55,0.45), 0 4px 16px rgba(0,0,0,0.2)',
        marginBottom: 24,
        overflow: 'hidden',
      }}
    >
      {/* Animated shimmer effect */}
      {!shouldReduceMotion && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Shine accent line at top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 24,
          right: 24,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        }}
      />

      <div style={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Новая задача
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 500, lineHeight: 1.4 }}>
          <span>Персональный менеджер</span>
          <span style={{ display: 'block', marginTop: 1 }}>Гарантия сдачи</span>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={24} color="#1a1a1a" strokeWidth={2.5} />
      </div>
    </motion.button>
  )
})
