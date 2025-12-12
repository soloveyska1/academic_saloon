import { useState, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingBag, Check, Sparkles } from 'lucide-react'
import { Reward, RewardCategory, UserClubState, Voucher } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'

import {
  RewardCard,
  RewardsFilterTabs,
  AVAILABLE_REWARDS,
} from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  REWARDS STORE PAGE - Exchange points for rewards
// ═══════════════════════════════════════════════════════════════════════════════

interface RewardsStorePageProps {
  user?: { pointsBalance: number } | null
}

// Header component
const StoreHeader = memo(function StoreHeader({
  onBack,
  pointsBalance,
}: {
  onBack: () => void
  pointsBalance: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="rgba(255, 255, 255, 0.7)" />
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={20} color="#D4AF37" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Магазин наград
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Обменяйте баллы на привилегии
            </div>
          </div>
        </div>
      </div>

      {/* Points balance */}
      <div
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37' }}>
          {pointsBalance} баллов
        </span>
      </div>
    </motion.div>
  )
})

// Success modal
const ExchangeSuccessModal = memo(function ExchangeSuccessModal({
  reward,
  onClose,
}: {
  reward: Reward
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          padding: 24,
          borderRadius: 24,
          background: '#121215',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          textAlign: 'center',
        }}
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Check size={36} color="#22c55e" strokeWidth={3} />
        </motion.div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Награда получена!
        </div>

        <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 20 }}>
          {reward.title} добавлен в ваши ваучеры
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
            Срок действия
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {reward.constraints.validDays} дней
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5D061 50%, #B48E26 100%)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1d' }}>
            Отлично!
          </span>
        </motion.button>
      </motion.div>
    </motion.div>
  )
})

function RewardsStorePage({ user }: RewardsStorePageProps) {
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<RewardCategory | 'all'>('all')
  const [pointsBalance, setPointsBalance] = useState(180)
  const [exchangedReward, setExchangedReward] = useState<Reward | null>(null)

  // Filter rewards by category
  const filteredRewards = useMemo(() => {
    if (activeTab === 'all') return AVAILABLE_REWARDS
    return AVAILABLE_REWARDS.filter(r => r.category === activeTab)
  }, [activeTab])

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: AVAILABLE_REWARDS.length }
    AVAILABLE_REWARDS.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1
    })
    return counts
  }, [])

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/club')
  }, [navigate])

  const handleExchange = useCallback((reward: Reward) => {
    if (pointsBalance < reward.costPoints) return

    // Haptic feedback
    try {
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success')
    } catch {}

    // Deduct points
    setPointsBalance(prev => prev - reward.costPoints)

    // Show success modal
    setExchangedReward(reward)
  }, [pointsBalance])

  const handleCloseSuccess = useCallback(() => {
    setExchangedReward(null)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0a0a0c',
      }}
    >
      {/* Premium background */}
      <PremiumBackground />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingBottom: 120,
        }}
      >
        {/* Header */}
        <StoreHeader onBack={handleBack} pointsBalance={pointsBalance} />

        {/* Filter tabs */}
        <div style={{ marginBottom: 20 }}>
          <RewardsFilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={categoryCounts}
          />
        </div>

        {/* Rewards grid */}
        <motion.div
          layout
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredRewards.map((reward, idx) => (
              <motion.div
                key={reward.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.03 }}
              >
                <RewardCard
                  reward={reward}
                  userPoints={pointsBalance}
                  onExchange={handleExchange}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredRewards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Sparkles size={28} color="rgba(255, 255, 255, 0.3)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
              Нет наград в этой категории
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>
              Попробуйте другую категорию
            </div>
          </motion.div>
        )}
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {exchangedReward && (
          <ExchangeSuccessModal
            reward={exchangedReward}
            onClose={handleCloseSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default RewardsStorePage
