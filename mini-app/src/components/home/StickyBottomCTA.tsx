import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Fixed thumb-zone conversion bar
//  Research: +55% clicks vs inline CTAs. Always visible.
//  Only rendered for new users.
//  Premium: deeper glass, richer gold gradient, layered shadows
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
        padding: '14px 16px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(180deg, rgba(9,9,11,0.85) 0%, rgba(9,9,11,0.96) 100%)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderTop: '1px solid rgba(212,175,55,0.15)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
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
          padding: '17px 20px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 40%, #b8962e 70%, #9c7721 100%)',
          border: '1px solid rgba(255,245,198,0.25)',
          boxShadow:
            '0 8px 28px rgba(212,175,55,0.35), 0 2px 8px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
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
