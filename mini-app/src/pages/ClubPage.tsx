import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown } from 'lucide-react'
import { UserData, UserClubState, DailyBonusState, Mission, Reward } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'

import {
  MembershipCard,
  DailyBonusCard,
  MissionsList,
  RewardsPreviewRow,
  ClubFooter,
  ClubRulesSheet,
  CLUB_LEVELS,
  AVAILABLE_REWARDS,
  MOCK_MISSIONS,
} from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB PAGE - Premium Privileges Hub
//  Features:
//  - Membership card with level progress
//  - Daily bonus with 7-day streak
//  - Missions for earning points
//  - Rewards preview
//  - Quick access to vouchers, rules, history
// ═══════════════════════════════════════════════════════════════════════════════

interface ClubPageProps {
  user: UserData | null
}

// Mock data generator for demo
function generateMockClubState(user: UserData | null): UserClubState {
  return {
    xp: 350,
    levelId: 'silver',
    streakDays: 4,
    lastClaimAt: null,
    pointsBalance: 180,
    activeMissions: MOCK_MISSIONS,
    activeVouchers: [],
  }
}

function generateMockBonusState(streakDays: number, claimed: boolean): DailyBonusState {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  return {
    status: claimed ? 'claimed' : 'available',
    nextClaimAt: claimed ? tomorrow.toISOString() : null,
    streakDay: streakDays,
    weekRewards: [10, 15, 20, 25, 30, 40, 50],
  }
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

  // State
  const [clubState, setClubState] = useState<UserClubState>(() => generateMockClubState(user))
  const [bonusState, setBonusState] = useState<DailyBonusState>(() =>
    generateMockBonusState(clubState.streakDays, false)
  )
  const [showRules, setShowRules] = useState(false)
  const [isClaimingBonus, setIsClaimingBonus] = useState(false)

  // User name
  const userName = user?.fullname?.split(' ')[0] || 'Участник'

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleClaimBonus = useCallback(async () => {
    if (isClaimingBonus || bonusState.status !== 'available') return

    setIsClaimingBonus(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update bonus state
    setBonusState(prev => ({
      ...prev,
      status: 'claimed',
      nextClaimAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }))

    // Update club state (add points based on day)
    const dayBonus = [10, 15, 20, 25, 30, 40, 50][bonusState.streakDay - 1] || 10
    setClubState(prev => ({
      ...prev,
      pointsBalance: prev.pointsBalance + dayBonus,
      streakDays: prev.streakDays < 7 ? prev.streakDays + 1 : 1,
    }))

    setIsClaimingBonus(false)
  }, [isClaimingBonus, bonusState])

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
    // Would open confirmation modal in real app
    console.log('Exchange reward:', reward)
    navigate('/club/rewards')
  }, [navigate])

  const handleMissionClick = useCallback((mission: Mission) => {
    if (mission.deepLinkTarget) {
      navigate(mission.deepLinkTarget)
    }
  }, [navigate])

  // Active vouchers count
  const activeVouchersCount = clubState.activeVouchers.filter(v => v.status === 'active').length

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
        <ClubHeader onBack={handleBack} />

        {/* Membership Card */}
        <div style={{ marginBottom: 16 }}>
          <MembershipCard
            userName={userName}
            clubState={clubState}
            onViewPrivileges={handleViewPrivileges}
          />
        </div>

        {/* Daily Bonus */}
        <div style={{ marginBottom: 16 }}>
          <DailyBonusCard
            bonusState={bonusState}
            levelId={clubState.levelId}
            onClaimBonus={handleClaimBonus}
            isLoading={isClaimingBonus}
          />
        </div>

        {/* Missions */}
        <div style={{ marginBottom: 16 }}>
          <MissionsList
            missions={clubState.activeMissions}
            onMissionClick={handleMissionClick}
          />
        </div>

        {/* Rewards Preview */}
        <div style={{ marginBottom: 16 }}>
          <RewardsPreviewRow
            rewards={AVAILABLE_REWARDS}
            userPoints={clubState.pointsBalance}
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
