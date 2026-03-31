import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY BOTTOM CTA — Stays visible above the 64px navbar as users scroll.
//  Gradient fade blends content into the dark background.
// ═══════════════════════════════════════════════════════════════════════════

interface StickyBottomCTAProps {
  onClick: () => void
}

export const StickyBottomCTA = memo(function StickyBottomCTA({ onClick }: StickyBottomCTAProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      style={{
        position: 'sticky',
        bottom: 84,
        zIndex: 40,
        padding: '0 4px',
        pointerEvents: 'none',
      }}
    >
      {/* Gradient fade from transparent to page background */}
      <div
        style={{
          position: 'absolute',
          top: -32,
          left: 0,
          right: 0,
          height: 32,
          background: 'linear-gradient(to bottom, transparent, #0A0A0A)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          background: '#0A0A0A',
          paddingTop: 8,
          paddingBottom: 12,
          pointerEvents: 'auto',
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
            gap: 8,
            width: '100%',
            height: 52,
            padding: '0 20px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--gold-600) 0%, var(--gold-400) 50%, var(--gold-300) 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(201, 162, 39, 0.12)',
            color: 'var(--text-on-gold)',
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            appearance: 'none' as const,
          }}
        >
          Оформить заказ
          <ArrowRight size={17} strokeWidth={2.5} />
        </motion.button>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textAlign: 'center' as const,
            opacity: 0.6,
          }}
        >
          Бесплатно · без предоплаты · ответ за 5 мин
        </div>
      </div>
    </motion.div>
  )
})
