import { motion } from 'framer-motion'
import { Plus, ArrowUpRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — Primary action button
//  Premium minimalist design with gold accent
// ═══════════════════════════════════════════════════════════════════════════

interface NewTaskCTAProps {
  onClick: () => void
}

export function NewTaskCTA({ onClick }: NewTaskCTAProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-label="Создать новую задачу с персональным менеджером"
      style={{
        position: 'relative',
        width: '100%',
        padding: '18px 22px',
        borderRadius: 16,
        border: '1px solid rgba(212,175,55,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(145deg, rgba(22,22,25,0.98), rgba(16,16,18,0.98))',
        boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)',
        marginBottom: 16,
      }}
    >
      {/* Subtle gold accent line at top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 20,
          right: 20,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
        }}
      />

      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Новая задача
          <ArrowUpRight size={14} color="rgba(212,175,55,0.6)" strokeWidth={2} aria-hidden="true" />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          Персональный менеджер
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #D4AF37, #b48e26)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(212,175,55,0.3)',
        }}
      >
        <Plus size={22} color="#0a0a0a" strokeWidth={2.5} />
      </div>
    </motion.button>
  )
}
