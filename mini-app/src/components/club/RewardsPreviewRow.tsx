import { memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ShoppingBag } from 'lucide-react'
import { Reward } from '../../types'
import { RewardCard } from './RewardCard'

// ═══════════════════════════════════════════════════════════════════════════════
//  REWARDS PREVIEW ROW - Horizontal scroll of rewards
// ═══════════════════════════════════════════════════════════════════════════════

interface RewardsPreviewRowProps {
  rewards: Reward[]
  userPoints: number
  onViewAll: () => void
  onExchange: (reward: Reward) => void
}

export const RewardsPreviewRow = memo(function RewardsPreviewRow({
  rewards,
  userPoints,
  onViewAll,
  onExchange,
}: RewardsPreviewRowProps) {
  // Show first 5 rewards
  const previewRewards = rewards.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(212, 175, 55, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={18} color="#D4AF37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Магазин наград
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                {rewards.length} наград доступно
              </div>
            </div>
          </div>

          {/* View all button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onViewAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(212, 175, 55, 0.25)',
              background: 'rgba(212, 175, 55, 0.1)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#D4AF37' }}>
              Все награды
            </span>
            <ChevronRight size={16} color="#D4AF37" />
          </motion.button>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '0 16px 16px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {previewRewards.map((reward, idx) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <RewardCard
              reward={reward}
              userPoints={userPoints}
              onExchange={onExchange}
              compact
            />
          </motion.div>
        ))}

        {/* "View more" card */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={onViewAll}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: previewRewards.length * 0.05 }}
          style={{
            width: 100,
            flexShrink: 0,
            borderRadius: 16,
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px dashed rgba(212, 175, 55, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={24} color="#D4AF37" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#D4AF37',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Ещё {rewards.length - previewRewards.length}
          </span>
        </motion.div>
      </div>

      {/* Hide scrollbar */}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </motion.div>
  )
})
