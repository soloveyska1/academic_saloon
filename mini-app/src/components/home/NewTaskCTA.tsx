import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Plus } from 'lucide-react'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  NEW TASK CTA — The "Black Card"
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
      className={s.voidGlass}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        padding: '24px',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: 'pointer',
        marginBottom: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.15)'
      }}
    >
      {/* Shiny animated border via pseudo-element simulation or inner shadow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: '#d4af37',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}>
            Priority Access
          </div>
          <div className={s.goldAccent} style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '24px',
            fontWeight: 800,
            lineHeight: '1.2',
            marginBottom: '4px'
          }}>
            NEW ORDER
          </div>
          <div style={{
            color: '#71717a',
            fontSize: '13px',
            fontWeight: 500
          }}>
            Guaranteed A+ Result
          </div>
        </div>

        <div style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #d4af37 0%, #b48e26 100%)',
          boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Plus size={24} color="#09090b" strokeWidth={3} />
        </div>
      </div>
    </motion.button>
  )
})
