import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Fixed thumb-zone conversion bar
//  Fully opaque bar. 2-stop vertical gold gradient. No border on button.
//  Clean shadow edge for separation. Premium but quiet.
// ═══════════════════════════════════════════════════════════════════════════

interface StickyBottomCTAProps {
  onClick: () => void
}

export const StickyBottomCTA = memo(function StickyBottomCTA({ onClick }: StickyBottomCTAProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 800,
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        background: '#09090b',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04), 0 -20px 40px rgba(0,0,0,0.5)',
      }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '18px 24px',
          borderRadius: 14,
          background: 'linear-gradient(180deg, #E8C84A 0%, #C9A436 100%)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(201,164,54,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          cursor: 'pointer',
          appearance: 'none',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: '#09090b',
          letterSpacing: '0.02em',
        }}
      >
        <span>Узнать стоимость</span>
        <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
      </motion.button>
    </motion.div>
  )
})
