import { memo } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — Primary action button
//  Premium minimalist design - NO shimmer, NO flashy effects
//  Clean like Apple Pay button, not Ali Express
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const NewTaskCTA = memo(function NewTaskCTA({ onClick, haptic }: NewTaskCTAProps) {
  const handleClick = () => {
    haptic?.('heavy')
    onClick()
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      aria-label="Создать новую задачу с персональным менеджером"
      style={{
        position: 'relative',
        width: '100%',
        padding: '20px 22px',
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Simplified gradient - subtle depth only
        background: 'linear-gradient(180deg, #D4AF37 0%, #C4A030 100%)',
        // Neutral shadows - no gold glow
        boxShadow: '0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)',
        marginBottom: 24,
      }}
    >
      {/* NO shimmer animation - premium design is static */}
      {/* NO shine accent line - clean and confident */}

      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1a1a1a',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.01em',
            marginBottom: 3,
          }}
        >
          Новая задача
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', fontWeight: 500 }}>
          Персональный менеджер • Гарантия сдачи
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={22} color="#1a1a1a" strokeWidth={2.5} />
      </div>
    </motion.button>
  )
})
