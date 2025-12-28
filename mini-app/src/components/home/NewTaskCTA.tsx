import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — Primary action button
//  Premium "old money" design:
//  - Dark background with subtle gold border
//  - Gold text accent
//  - Elegant, understated luxury
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      aria-label="Оформить заказ"
      style={{
        position: 'relative',
        width: '100%',
        padding: '18px 20px',
        borderRadius: 14,
        border: '1px solid rgba(212,175,55,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(145deg, rgba(28,28,32,0.98) 0%, rgba(18,18,20,0.99) 100%)',
        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.4)',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Subtle top highlight */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
        }}
      />

      <div style={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--gold-400)',
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.03em',
            marginBottom: 4,
          }}
        >
          Оформить заказ
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          Персональный менеджер · Гарантия сдачи
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ArrowRight size={20} color="var(--gold-400)" strokeWidth={1.5} />
      </div>
    </motion.button>
  )
})
