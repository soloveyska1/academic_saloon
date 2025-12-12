import { useState, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown, Check, Lock, ChevronRight, Gem, Medal } from 'lucide-react'
import { ClubLevelId } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { CLUB_LEVELS } from '../components/club'

// ═══════════════════════════════════════════════════════════════════════════════
//  PRIVILEGES PAGE - Full list of privileges by level
// ═══════════════════════════════════════════════════════════════════════════════

// Current user level (mock)
const CURRENT_LEVEL: ClubLevelId = 'silver'
const CURRENT_XP = 350

const getLevelIcon = (levelId: string, size: number = 20) => {
  switch (levelId) {
    case 'platinum':
      return <Gem size={size} />
    case 'gold':
      return <Crown size={size} />
    default:
      return <Medal size={size} />
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

// Header
const PrivilegesHeader = memo(function PrivilegesHeader({ onBack }: { onBack: () => void }) {
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
              Привилегии
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Преимущества вашего уровня
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// Level card
interface LevelCardProps {
  levelId: string
  currentLevelId: string
  currentXp: number
}

const LevelCard = memo(function LevelCard({ levelId, currentLevelId, currentXp }: LevelCardProps) {
  const level = CLUB_LEVELS[levelId]
  const isCurrentLevel = levelId === currentLevelId
  const levelOrder = ['silver', 'gold', 'platinum']
  const currentIdx = levelOrder.indexOf(currentLevelId)
  const thisIdx = levelOrder.indexOf(levelId)
  const isUnlocked = thisIdx <= currentIdx
  const isNextLevel = thisIdx === currentIdx + 1

  const progressToThis = isNextLevel && level.minXp > 0
    ? Math.min(100, (currentXp / level.minXp) * 100)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: thisIdx * 0.1 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: isCurrentLevel
          ? `linear-gradient(135deg, ${level.accentColor}15 0%, rgba(18,18,21,0.95) 50%)`
          : 'rgba(18, 18, 21, 0.95)',
        border: isCurrentLevel
          ? `1px solid ${level.accentColor}40`
          : '1px solid rgba(255, 255, 255, 0.06)',
        opacity: isUnlocked ? 1 : 0.6,
      }}
    >
      {/* Top accent */}
      {isCurrentLevel && (
        <div style={{ height: 3, background: getLevelGradient(levelId) }} />
      )}

      <div style={{ padding: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {/* Level icon */}
          <motion.div
            animate={isCurrentLevel ? {
              boxShadow: [
                `0 0 15px ${level.accentColor}30`,
                `0 0 25px ${level.accentColor}50`,
                `0 0 15px ${level.accentColor}30`,
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: isUnlocked
                ? getLevelGradient(levelId)
                : 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isUnlocked ? (levelId === 'silver' ? '#333' : '#1a1a1d') : 'rgba(255,255,255,0.3)',
            }}
          >
            {isUnlocked ? getLevelIcon(levelId, 22) : <Lock size={20} />}
          </motion.div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                {level.emoji} {level.name}
              </span>
              {isCurrentLevel && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `${level.accentColor}30`,
                    color: level.accentColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Текущий
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
              {level.minXp > 0 ? `От ${level.minXp} XP` : 'Начальный уровень'}
            </div>
          </div>
        </div>

        {/* Progress to this level */}
        {progressToThis !== null && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
                Прогресс
              </span>
              <span style={{ fontSize: 12, color: level.accentColor, fontWeight: 500 }}>
                {currentXp} / {level.minXp} XP
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToThis}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: getLevelGradient(levelId),
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        )}

        {/* Perks list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {level.perks.map((perk, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: thisIdx * 0.1 + idx * 0.03 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: isUnlocked
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: isUnlocked
                    ? `${level.accentColor}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isUnlocked ? (
                  <Check size={12} color={level.accentColor} strokeWidth={3} />
                ) : (
                  <Lock size={10} color="rgba(255,255,255,0.3)" />
                )}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: isUnlocked ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                }}
              >
                {perk}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
})

function PrivilegesPage() {
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/club')
  }, [navigate])

  const levels = ['silver', 'gold', 'platinum']

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
        <PrivilegesHeader onBack={handleBack} />

        {/* Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 16,
            borderRadius: 14,
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
            Повышайте уровень, набирая XP за активность в клубе и оплаченные заказы.
            Чем выше уровень — тем больше привилегий!
          </div>
        </motion.div>

        {/* Levels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {levels.map(levelId => (
            <LevelCard
              key={levelId}
              levelId={levelId}
              currentLevelId={CURRENT_LEVEL}
              currentXp={CURRENT_XP}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PrivilegesPage
