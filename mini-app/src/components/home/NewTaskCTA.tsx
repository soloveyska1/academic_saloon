import { memo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ArrowUpRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — Primary action button
//  Premium minimalist design with gold accent
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
}

export const NewTaskCTA = memo(function NewTaskCTA({ onClick }: NewTaskCTAProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.16 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-label="Создать новую задачу с персональным менеджером"
      style={{
        position: 'relative',
        width: '100%',
        padding: '18px 22px',
        borderRadius: 16,
        border: '1px solid rgba(212,175,55,0.5)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #D4AF37 0%, #b48e26 50%, #D4AF37 100%)',
        boxShadow: '0 8px 24px -8px rgba(212,175,55,0.4), 0 4px 12px rgba(0,0,0,0.2)',
        marginBottom: 16,
      }}
    >
      {/* Shine accent line at top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 20,
          right: 20,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
      />

      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Новая задача
          <ArrowUpRight size={14} color="rgba(0,0,0,0.5)" strokeWidth={2} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', marginTop: 4 }}>
          Персональный менеджер
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={22} color="#1a1a1a" strokeWidth={2.5} />
      </div>
    </motion.button>
  )
})
