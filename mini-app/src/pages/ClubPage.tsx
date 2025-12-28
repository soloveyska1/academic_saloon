import { useState, useMemo, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown } from 'lucide-react'
import { UserData, Mission, Reward } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { useClub } from '../contexts/ClubContext'

import {
  MembershipCard,
  MissionsList,
  RewardsPreviewRow,
  ClubFooter,
  ClubRulesSheet,
  AVAILABLE_REWARDS,
} from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB PAGE - Premium Privileges Hub (Клубные баллы)
//  Features:
//  - Membership card with level progress
//  - Missions for earning club points
//  - Rewards preview (exchange points for vouchers)
//  - Quick access to vouchers, rules, history
//  NOTE: Daily bonus (₽) is ONLY on HomePage - this page uses separate club points
// ═══════════════════════════════════════════════════════════════════════════════

interface ClubPageProps {
  user: UserData | null
}

// Club Header component
const ClubHeader = memo(function ClubHeader({ onBack }: { onBack: () => void }) {
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
            <Crown size={20} color="#D4AF37" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Клуб привилегий
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Ваши награды и бонусы
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

function ClubPage({ user }: ClubPageProps) {
  const navigate = useNavigate()
  const club = useClub()

  // UI State
  const [showRules, setShowRules] = useState(false)

  // User name
  const userName = user?.fullname?.split(' ')[0] || 'Участник'

  // Map club state to UserClubState format for MembershipCard
  const clubStateForCard = useMemo(() => ({
    xp: club.xp,
    levelId: club.level,
    streakDays: club.dailyBonus.streakDay,
    lastClaimAt: null,
    pointsBalance: club.points,
    activeMissions: club.missions,
    activeVouchers: club.activeVouchers,
  }), [club.xp, club.level, club.dailyBonus.streakDay, club.points, club.missions, club.activeVouchers])

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleViewPrivileges = useCallback(() => {
    navigate('/club/privileges')
  }, [navigate])

  const handleViewRewards = useCallback(() => {
    navigate('/club/rewards')
  }, [navigate])

  const handleVouchersClick = useCallback(() => {
    navigate('/club/vouchers')
  }, [navigate])

  const handleHistoryClick = useCallback(() => {
    navigate('/club/history')
  }, [navigate])

  const handleExchangeReward = useCallback((reward: Reward) => {
    navigate('/club/rewards')
  }, [navigate])

  const handleMissionClick = useCallback((mission: Mission) => {
    // Try to complete the mission if it's completable
    if (mission.status === 'pending') {
      const result = club.completeMission(mission.id)
      if (result.success) {
        try {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        } catch {}
      }
    }

    // Navigate if there's a deep link
    if (mission.deepLinkTarget) {
      navigate(mission.deepLinkTarget)
    }
  }, [navigate, club])

  // Active vouchers count
  const activeVouchersCount = club.activeVouchers.length

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      {/* Premium background - full width */}
      <div className="page-background">
        <PremiumBackground />
      </div>

      {/* Content with padding */}
      <div className="page-content">
        {/* Header */}
        <ClubHeader onBack={handleBack} />

        {/* Membership Card */}
        <div style={{ marginBottom: 16 }}>
          <MembershipCard
            userName={userName}
            clubState={clubStateForCard}
            onViewPrivileges={handleViewPrivileges}
          />
        </div>

        {/* Missions */}
        <div style={{ marginBottom: 16 }}>
          <MissionsList
            missions={club.missions}
            onMissionClick={handleMissionClick}
          />
        </div>

        {/* Rewards Preview */}
        <div style={{ marginBottom: 16 }}>
          <RewardsPreviewRow
            rewards={AVAILABLE_REWARDS}
            userPoints={club.points}
            onViewAll={handleViewRewards}
            onExchange={handleExchangeReward}
          />
        </div>

        {/* Footer Links */}
        <ClubFooter
          activeVouchersCount={activeVouchersCount}
          onVouchersClick={handleVouchersClick}
          onRulesClick={() => setShowRules(true)}
          onHistoryClick={handleHistoryClick}
        />
      </div>

      {/* Club Rules Sheet */}
      <ClubRulesSheet
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  )
}

export default ClubPage
