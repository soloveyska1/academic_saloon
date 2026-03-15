import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Fixed thumb-zone conversion bar.
//  Premium gold gradient button. Micro-reassurance text.
//  Clean separation from content above.
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
        padding: '12px 20px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(180deg, rgba(9,9,11,0) 0%, rgba(9,9,11,0.95) 25%, #09090b 100%)',
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
          padding: '17px 24px',
          borderRadius: 16,
          background: 'linear-gradient(180deg, #E8C84A 0%, #C9A436 100%)',
          border: 'none',
          boxShadow: '0 4px 24px rgba(201,164,54,0.30), inset 0 1px 0 rgba(255,255,255,0.15)',
          cursor: 'pointer',
          appearance: 'none',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: '#09090b',
          letterSpacing: '0.01em',
        }}
      >
        <span>Рассчитать стоимость</span>
        <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
      </motion.button>

      {/* Micro reassurance below button */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 8,
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.20)',
          letterSpacing: '0.01em',
        }}
      >
        Бесплатно · Без обязательств · Ответ за 5 мин
      </div>
    </motion.div>
  )
})
