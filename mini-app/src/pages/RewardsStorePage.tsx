import { useState, useCallback, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ShoppingBag, Check, Sparkles, AlertCircle, Ticket } from 'lucide-react'
import { Reward, RewardCategory, Voucher } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { useClub } from '../contexts/ClubContext'

import {
  RewardCard,
  RewardsFilterTabs,
  AVAILABLE_REWARDS,
} from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  REWARDS STORE PAGE - Обмен баллов на награды (с реальной логикой)
// ═══════════════════════════════════════════════════════════════════════════════

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
      <motion.div
        key={pointsBalance}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
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
      </motion.div>
    </motion.div>
  )
})

// Success modal
const ExchangeSuccessModal = memo(function ExchangeSuccessModal({
  reward,
  voucher,
  onClose,
  onViewVouchers,
}: {
  reward: Reward
  voucher?: Voucher
  onClose: () => void
  onViewVouchers: () => void
}) {
  const expiresAt = voucher ? new Date(voucher.expiresAt) : null
  const expiresFormatted = expiresAt?.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 340,
          padding: 28,
          borderRadius: 24,
          background: 'linear-gradient(145deg, #18181c 0%, #121215 100%)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Premium accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: '24px 24px 0 0',
            background: 'linear-gradient(90deg, #BF953F 0%, #FCF6BA 50%, #D4AF37 100%)',
          }}
        />

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <Check size={40} color="#22c55e" strokeWidth={3} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            Награда получена!
          </div>

          <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.6)', marginBottom: 24 }}>
            «{reward.title}» добавлен в ваши ваучеры
          </div>
        </motion.div>

        {/* Voucher info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: 16,
            borderRadius: 14,
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(212, 175, 55, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ticket size={22} color="#D4AF37" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                Действует до
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37' }}>
                {expiresFormatted || `${reward.constraints.validDays} дней`}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onViewVouchers}
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
              Посмотреть ваучеры
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>
              Продолжить покупки
            </span>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
})

// Error toast
const ErrorToast = memo(function ErrorToast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      style={{
        position: 'fixed',
        bottom: 100,
        left: 20,
        right: 20,
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <AlertCircle size={20} color="#ef4444" />
      <span style={{ fontSize: 14, color: '#ef4444', flex: 1 }}>
        {message}
      </span>
    </motion.div>
  )
})

function RewardsStorePage() {
  const navigate = useNavigate()
  const club = useClub()

  // State
  const [activeTab, setActiveTab] = useState<RewardCategory | 'all'>('all')
  const [exchangedReward, setExchangedReward] = useState<Reward | null>(null)
  const [lastVoucher, setLastVoucher] = useState<Voucher | undefined>()
  const [error, setError] = useState<string | null>(null)

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
    // Проверка баланса
    if (club.points < reward.costPoints) {
      setError(`Недостаточно баллов. Нужно: ${reward.costPoints}, у вас: ${club.points}`)
      setTimeout(() => setError(null), 3000)
      return
    }

    // Пробуем обменять
    const result = club.redeemReward(reward)

    if (!result.success) {
      // Haptic feedback - error
      try {
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred('error')
      } catch {}

      setError(result.message)
      setTimeout(() => setError(null), 3000)
      return
    }

    // Haptic feedback - success
    try {
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success')
    } catch {}

    // Показываем модалку успеха
    setLastVoucher(result.voucher)
    setExchangedReward(reward)
  }, [club])

  const handleCloseSuccess = useCallback(() => {
    setExchangedReward(null)
    setLastVoucher(undefined)
  }, [])

  const handleViewVouchers = useCallback(() => {
    setExchangedReward(null)
    setLastVoucher(undefined)
    navigate('/club/vouchers')
  }, [navigate])

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
        <StoreHeader onBack={handleBack} pointsBalance={club.points} />

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
                  userPoints={club.points}
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
            voucher={lastVoucher}
            onClose={handleCloseSuccess}
            onViewVouchers={handleViewVouchers}
          />
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <ErrorToast message={error} onClose={() => setError(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default RewardsStorePage
