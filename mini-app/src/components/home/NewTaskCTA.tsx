import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus, Sparkles } from 'lucide-react'

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
        padding: '28px 28px',
        borderRadius: 20,
        border: '2px solid rgba(212,175,55,0.6)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #D4AF37 0%, #c9a430 40%, #b48e26 70%, #D4AF37 100%)',
        boxShadow: '0 12px 40px -12px rgba(212,175,55,0.5), 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
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
            fontSize: 20,
            fontWeight: 800,
            color: '#1a1a1a',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <Sparkles size={18} color="rgba(0,0,0,0.6)" strokeWidth={2} aria-hidden="true" />
          Новая задача
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', fontWeight: 500 }}>
          Персональный менеджер • Гарантия сдачи
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.18)',
          border: '2px solid rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}
      >
        <Plus size={28} color="#1a1a1a" strokeWidth={2.5} />
      </div>
    </motion.button>
  )
})
