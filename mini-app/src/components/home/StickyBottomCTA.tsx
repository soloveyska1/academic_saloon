import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Fixed thumb-zone conversion bar
//  Research: +55% clicks vs inline CTAs. Always visible.
//  Only rendered for new users.
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
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(9,9,11,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(212,175,55,0.12)',
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
          padding: '16px 20px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 55%, #9c7721 100%)',
          border: '1px solid rgba(255,245,198,0.18)',
          boxShadow: '0 8px 24px rgba(212,175,55,0.3)',
          cursor: 'pointer',
          appearance: 'none',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: '#09090b',
          letterSpacing: '0.01em',
        }}
      >
        <span>Узнать стоимость</span>
        <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
      </motion.button>
    </motion.div>
  )
})
