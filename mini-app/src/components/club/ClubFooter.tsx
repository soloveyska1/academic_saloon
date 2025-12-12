import { memo } from 'react'
import { motion } from 'framer-motion'
import { Ticket, FileText, History, ChevronRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB FOOTER - Quick links to vouchers, rules, history
// ═══════════════════════════════════════════════════════════════════════════════

interface ClubFooterProps {
  activeVouchersCount: number
  onVouchersClick: () => void
  onRulesClick: () => void
  onHistoryClick: () => void
}

export const ClubFooter = memo(function ClubFooter({
  activeVouchersCount,
  onVouchersClick,
  onRulesClick,
  onHistoryClick,
}: ClubFooterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 16,
      }}
    >
      {/* Vouchers button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onVouchersClick}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: 14,
          border: '1px solid rgba(212, 175, 55, 0.2)',
          background: 'rgba(212, 175, 55, 0.08)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ticket size={18} color="#D4AF37" />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
            Мои ваучеры
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeVouchersCount > 0 && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: '#D4AF37',
                fontSize: 11,
                fontWeight: 700,
                color: '#1a1a1d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeVouchersCount}
            </span>
          )}
          <ChevronRight size={16} color="rgba(255, 255, 255, 0.4)" />
        </div>
      </motion.button>

      {/* Rules button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onRulesClick}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <FileText size={18} color="rgba(255, 255, 255, 0.5)" />
      </motion.button>

      {/* History button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onHistoryClick}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <History size={18} color="rgba(255, 255, 255, 0.5)" />
      </motion.button>
    </motion.div>
  )
})
