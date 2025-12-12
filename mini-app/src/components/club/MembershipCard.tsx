import { memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Crown, Gem, Medal } from 'lucide-react'
import { ClubLevel, UserClubState } from '../../types'
import { CLUB_LEVELS } from './clubData'

// ═══════════════════════════════════════════════════════════════════════════════
//  MEMBERSHIP CARD - Shows user level, progress, and active privileges
// ═══════════════════════════════════════════════════════════════════════════════

interface MembershipCardProps {
  userName: string
  clubState: UserClubState
  onViewPrivileges: () => void
}

const getLevelIcon = (levelId: string) => {
  switch (levelId) {
    case 'platinum':
      return <Gem size={18} />
    case 'gold':
      return <Crown size={18} />
    default:
      return <Medal size={18} />
  }
}

const getLevelGradient = (levelId: string): string => {
  switch (levelId) {
    case 'platinum':
      return 'linear-gradient(135deg, #E5E4E2 0%, #B9F2FF 30%, #E5E4E2 60%, #B9F2FF 100%)'
    case 'gold':
      return 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 30%, #D4AF37 60%, #B38728 100%)'
    default:
      return 'linear-gradient(135deg, #A0A0A0 0%, #D0D0D0 30%, #B0B0B0 60%, #808080 100%)'
  }
}

export const MembershipCard = memo(function MembershipCard({
  userName,
  clubState,
  onViewPrivileges,
}: MembershipCardProps) {
  const currentLevel = CLUB_LEVELS[clubState.levelId]
  const nextLevel = currentLevel.nextLevelXp
    ? Object.values(CLUB_LEVELS).find(l => l.minXp === currentLevel.nextLevelXp)
    : null

  const progressPercent = currentLevel.nextLevelXp
    ? ((clubState.xp - currentLevel.minXp) / (currentLevel.nextLevelXp - currentLevel.minXp)) * 100
    : 100

  const xpToNext = currentLevel.nextLevelXp ? currentLevel.nextLevelXp - clubState.xp : 0

  // Active privileges chips (first 3)
  const activePerks = currentLevel.perks.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(18, 18, 21, 0.95)',
        border: `1px solid ${currentLevel.accentColor}33`,
        boxShadow: `0 0 40px -10px ${currentLevel.accentColor}40`,
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 4,
          background: getLevelGradient(clubState.levelId),
        }}
      />

      <div style={{ padding: 20 }}>
        {/* Header: Level badge + User name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {/* Level badge */}
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${currentLevel.accentColor}30`,
                `0 0 30px ${currentLevel.accentColor}50`,
                `0 0 20px ${currentLevel.accentColor}30`,
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: getLevelGradient(clubState.levelId),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: clubState.levelId === 'silver' ? '#333' : '#1a1a1d',
            }}
          >
            {getLevelIcon(clubState.levelId)}
          </motion.div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, letterSpacing: '0.05em' }}>
              УЧАСТНИК КЛУБА
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
              {userName}
            </div>
          </div>

          {/* Level name */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: `${currentLevel.accentColor}20`,
              border: `1px solid ${currentLevel.accentColor}40`,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: currentLevel.accentColor }}>
              {currentLevel.emoji} {currentLevel.name}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {currentLevel.nextLevelXp && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                До {nextLevel?.name || 'следующего уровня'}
              </span>
              <span style={{ fontSize: 12, color: currentLevel.accentColor, fontWeight: 500 }}>
                {clubState.xp} / {currentLevel.nextLevelXp} XP
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: getLevelGradient(clubState.levelId),
                  borderRadius: 3,
                }}
              />
            </div>
            {nextLevel && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                Ещё {xpToNext} XP — откроется: {nextLevel.perks[nextLevel.perks.length - 1]}
              </div>
            )}
          </div>
        )}

        {/* Active privileges chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: '0.03em' }}>
            ВАШИ ПРИВИЛЕГИИ СЕГОДНЯ
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {activePerks.map((perk, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {perk}
              </div>
            ))}
            {currentLevel.perks.length > 3 && (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: `${currentLevel.accentColor}15`,
                  border: `1px solid ${currentLevel.accentColor}30`,
                  fontSize: 12,
                  color: currentLevel.accentColor,
                }}
              >
                +{currentLevel.perks.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* CTA: All privileges */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onViewPrivileges}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${currentLevel.accentColor}40`,
            background: `${currentLevel.accentColor}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: currentLevel.accentColor }}>
            Все привилегии
          </span>
          <ChevronRight size={18} color={currentLevel.accentColor} />
        </motion.button>
      </div>

      {/* Points balance badge */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#D4AF37' }}>
          {clubState.pointsBalance} баллов
        </span>
      </div>
    </motion.div>
  )
})
