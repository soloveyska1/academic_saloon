import { memo } from 'react'
import { motion } from 'framer-motion'

export const SaloonFooter = memo(function SaloonFooter() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      style={{ textAlign: 'center', padding: '20px 0 12px' }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3))',
        }} />
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-serif, 'Playfair Display', serif)",
          color: 'rgba(212,175,55,0.5)',
          letterSpacing: '0.15em',
          fontWeight: 500,
        }}>
          САЛУН
        </span>
        <span style={{ fontSize: 8, color: 'rgba(212,175,55,0.4)' }}>&#x2726;</span>
        <span style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.08em',
        }}>
          EST. 2024
        </span>
        <div style={{
          width: 24,
          height: 1,
          background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)',
        }} />
      </div>
    </motion.div>
  )
})
