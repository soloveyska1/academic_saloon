import { memo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  SALOON FOOTER — Quiet confidence.
//  Brand mark + establishment year. Minimal but premium.
// ═══════════════════════════════════════════════════════════════════════════

export const SaloonFooter = memo(function SaloonFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      style={{ textAlign: 'center', padding: '28px 0 16px' }}
    >
      {/* Decorative divider */}
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 1,
          margin: '0 auto 16px',
          background: 'linear-gradient(90deg, transparent, var(--border-gold), transparent)',
        }}
      />

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11,
          fontFamily: "'Manrope', sans-serif",
          color: 'var(--gold-400)',
          letterSpacing: '0.10em',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}>
          АКАДЕМИЧЕСКИЙ САЛОН
        </span>
        <span style={{
          fontSize: 7,
          color: 'var(--gold-400)',
        }}>&#x2726;</span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.10em',
          fontWeight: 600,
        }}>
          с 2020
        </span>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
        }}
      >
        Качество · Конфиденциальность · Результат
      </div>
    </motion.footer>
  )
})
