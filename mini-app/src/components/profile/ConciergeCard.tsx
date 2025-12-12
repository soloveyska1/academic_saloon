import { memo } from 'react'
import { motion } from 'framer-motion'
import { Headphones, ChevronRight, Clock, MessageCircle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  CONCIERGE CARD - Personal support access (for premium users)
// ═══════════════════════════════════════════════════════════════════════════════

interface ConciergeCardProps {
  isPremium: boolean
  managerName?: string
  responseTime?: string  // e.g., "< 1 час"
  onContact: () => void
}

export const ConciergeCard = memo(function ConciergeCard({
  isPremium,
  managerName,
  responseTime = '< 2 часов',
  onContact,
}: ConciergeCardProps) {
  if (!isPremium) {
    // Show upgrade CTA for non-premium users
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 18, 21, 0.95) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
        }}
      >
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Headphones size={22} color="#D4AF37" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                Персональный менеджер
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                Доступно с уровня VIP-Клиент
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
      }}
    >
      {/* Premium accent bar */}
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, #BF953F 0%, #FCF6BA 50%, #D4AF37 100%)',
        }}
      />

      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 15px rgba(212, 175, 55, 0.2)',
                '0 0 25px rgba(212, 175, 55, 0.4)',
                '0 0 15px rgba(212, 175, 55, 0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #D4AF37 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Headphones size={22} color="#1a1a1d" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              Ваш консьерж
            </div>
            {managerName && (
              <div style={{ fontSize: 13, color: '#D4AF37', marginTop: 2 }}>
                {managerName}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Clock size={12} color="rgba(255, 255, 255, 0.5)" />
              <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                Время ответа
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
              {responseTime}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MessageCircle size={12} color="rgba(255, 255, 255, 0.5)" />
              <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)' }}>
                Статус
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
              Онлайн
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContact}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #BF953F 0%, #D4AF37 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <MessageCircle size={18} color="#1a1a1d" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1d' }}>
            Написать консьержу
          </span>
          <ChevronRight size={16} color="#1a1a1d" />
        </motion.button>
      </div>
    </motion.div>
  )
})
