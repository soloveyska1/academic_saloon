import { memo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, ChevronRight, Check } from 'lucide-react'

interface OrderStatsCardProps {
  activeOrders: number
  completedOrders: number
  onClick: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

// Glass card styles
const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--bg-card)',
  backdropFilter: 'blur(12px) saturate(130%)',
  WebkitBackdropFilter: 'blur(12px) saturate(130%)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
}

export const OrderStatsCard = memo(function OrderStatsCard({
  activeOrders,
  completedOrders,
  onClick,
  haptic,
}: OrderStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptic('light'); onClick() }}
      className="card-padding card-radius"
      style={{
        ...glassStyle,
        cursor: 'pointer',
        border: '1px solid rgba(212,175,55,0.2)',
        background: 'linear-gradient(145deg, rgba(25,25,28,0.95) 0%, rgba(18,18,20,0.98) 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 40px rgba(212,175,55,0.05)',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'relative', zIndex: 1 }}>
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
          <div
            aria-hidden="true"
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Briefcase size={20} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
            </div>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.7)',
                letterSpacing: '0.1em',
              }}>МОИ ЗАКАЗЫ</div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 3,
                fontStyle: 'italic',
              }}>Статус выполнения</div>
            </div>
          </div>
          <ChevronRight size={18} color="rgba(212,175,55,0.4)" strokeWidth={1.5} />
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Active */}
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: activeOrders > 0
              ? 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
              : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: `1px solid ${activeOrders > 0 ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 38,
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              background: activeOrders > 0
                ? 'linear-gradient(180deg, #f5d485, #D4AF37)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 6,
            }}>
              {activeOrders}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: activeOrders > 0 ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {activeOrders > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#D4AF37',
                    boxShadow: '0 0 8px rgba(212,175,55,0.6)',
                  }}
                />
              )}
              Активных
            </div>
          </div>

          {/* Completed */}
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: 'linear-gradient(145deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
            border: '1px solid rgba(34,197,94,0.2)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 38,
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              background: 'linear-gradient(180deg, rgba(74,222,128,0.9), rgba(34,197,94,0.8))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 6,
            }}>
              {completedOrders}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(34,197,94,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              <Check size={12} strokeWidth={2.5} />
              Выполнено
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
