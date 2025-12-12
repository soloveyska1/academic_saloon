import { memo, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { ProfileUser, MembershipLevel } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE HEADER - Avatar, name, membership badge
//  Admin access: long press on avatar for 3 seconds
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfileHeaderProps {
  user: ProfileUser
  onSettingsClick: () => void
  onAdminAccess?: () => void  // Only for admin role
}

const LEVEL_LABELS: Record<MembershipLevel, string> = {
  standard: 'Резидент',
  silver: 'Партнёр',
  gold: 'VIP-Клиент',
  premium: 'Премиум',
  max: 'Легенда',
}

const LEVEL_COLORS: Record<MembershipLevel, string> = {
  standard: '#A0A0A0',
  silver: '#C0C0C0',
  gold: '#D4AF37',
  premium: '#B9F2FF',
  max: '#FFD700',
}

export const ProfileHeader = memo(function ProfileHeader({
  user,
  onSettingsClick,
  onAdminAccess,
}: ProfileHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)

  const levelLabel = LEVEL_LABELS[user.membershipLevel]
  const levelColor = LEVEL_COLORS[user.membershipLevel]

  // Long press handling for admin access
  const handlePressStart = useCallback(() => {
    if (user.role !== 'admin' || !onAdminAccess) return

    setIsLongPressing(true)
    longPressTimer.current = setTimeout(() => {
      try {
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success')
      } catch {}
      onAdminAccess()
      setIsLongPressing(false)
    }, 3000)
  }, [user.role, onAdminAccess])

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPressing(false)
  }, [])

  const firstName = user.name.split(' ')[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar with spinning ring */}
        <div
          style={{ position: 'relative', cursor: user.role === 'admin' ? 'pointer' : 'default' }}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          {/* Long press progress ring */}
          {isLongPressing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '2px solid rgba(0, 255, 0, 0.5)',
                borderTopColor: '#0f0',
                animation: 'spin 1s linear infinite',
              }}
            />
          )}

          {/* Spinning gold ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background: user.membershipLevel === 'max'
                ? 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)'
                : `conic-gradient(from 0deg, ${levelColor}, ${levelColor}88, ${levelColor})`,
            }}
          />

          {/* Avatar container */}
          <div
            style={{
              position: 'relative',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#0a0a0c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {user.avatar && !avatarError ? (
              <img
                src={user.avatar}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 700, color: levelColor }}>
                {firstName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Name and level */}
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 4,
            }}
          >
            {firstName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Level badge */}
            <div
              style={{
                padding: '3px 10px',
                borderRadius: 6,
                background: `${levelColor}20`,
                border: `1px solid ${levelColor}40`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: levelColor,
                }}
              >
                {levelLabel}
              </span>
            </div>

            {/* Agent badge */}
            {user.role === 'agent' && (
              <div
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: '#8B5CF6' }}>
                  Агент
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onSettingsClick}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Settings size={20} color="rgba(255, 255, 255, 0.6)" />
      </motion.button>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
})
