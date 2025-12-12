import { memo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Shield, Sparkles } from 'lucide-react'
import { ProfileUser, MembershipLevel } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE HEADER - Premium avatar, name, membership badge
//  Hidden admin access: long press on avatar for 3 seconds
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfileHeaderProps {
  user: ProfileUser
  isAdmin?: boolean
  onAdminAccess?: () => void
}

const LEVEL_CONFIG: Record<MembershipLevel, { label: string; color: string; gradient: string }> = {
  standard: {
    label: 'Резидент',
    color: '#9CA3AF',
    gradient: 'conic-gradient(from 0deg, #9CA3AF, #6B7280, #9CA3AF)',
  },
  silver: {
    label: 'Партнёр',
    color: '#C0C0C0',
    gradient: 'conic-gradient(from 0deg, #E5E5E5, #A0A0A0, #C0C0C0, #E5E5E5)',
  },
  gold: {
    label: 'VIP-Клиент',
    color: '#D4AF37',
    gradient: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
  },
  premium: {
    label: 'Премиум',
    color: '#B9F2FF',
    gradient: 'conic-gradient(from 0deg, #67E8F9, #B9F2FF, #22D3EE, #B9F2FF, #67E8F9)',
  },
  max: {
    label: 'Легенда',
    color: '#FFD700',
    gradient: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #FFD700, #B38728, #FBF5B7, #BF953F)',
  },
}

export const ProfileHeader = memo(function ProfileHeader({
  user,
  isAdmin = false,
  onAdminAccess,
}: ProfileHeaderProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [longPressProgress, setLongPressProgress] = useState(0)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const config = LEVEL_CONFIG[user.membershipLevel]
  const firstName = user.name.split(' ')[0]

  // Format member since date
  const memberSinceDate = new Date(user.memberSince)
  const memberSinceFormatted = memberSinceDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  // Long press handling for hidden admin access
  const handlePressStart = useCallback(() => {
    if (!isAdmin || !onAdminAccess) return

    setIsLongPressing(true)
    setLongPressProgress(0)

    // Progress animation
    let progress = 0
    progressInterval.current = setInterval(() => {
      progress += 3.33 // 100% in 3 seconds (30 intervals * 100ms = 3000ms)
      setLongPressProgress(Math.min(progress, 100))
    }, 100)

    // Trigger admin access after 3 seconds
    longPressTimer.current = setTimeout(() => {
      try {
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success')
      } catch {}
      onAdminAccess()
      handlePressEnd()
    }, 3000)
  }, [isAdmin, onAdminAccess])

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    setIsLongPressing(false)
    setLongPressProgress(0)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: '24px 0 20px',
      }}
    >
      {/* Main content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar with animated ring */}
        <div
          style={{
            position: 'relative',
            cursor: isAdmin ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          {/* Long press progress indicator */}
          <AnimatePresence>
            {isLongPressing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  background: `conic-gradient(from 0deg, #22c55e ${longPressProgress}%, transparent ${longPressProgress}%)`,
                  opacity: 0.6,
                }}
              />
            )}
          </AnimatePresence>

          {/* Spinning premium ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              background: config.gradient,
              filter: user.membershipLevel === 'max' ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'none',
            }}
          />

          {/* Avatar container */}
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #14141a 0%, #0a0a0c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Emoji avatar or first letter */}
            <span style={{
              fontSize: user.avatar && user.avatar.length <= 2 ? 28 : 24,
              fontWeight: 700,
              color: config.color,
            }}>
              {user.avatar || firstName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Premium sparkle for max level */}
          {user.membershipLevel === 'max' && (
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.5)',
              }}
            >
              <Sparkles size={10} color="#1a1a1d" />
            </motion.div>
          )}
        </div>

        {/* User info */}
        <div style={{ flex: 1 }}>
          {/* Name */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 6,
              letterSpacing: '-0.01em',
            }}
          >
            {firstName}
          </motion.div>

          {/* Badges row */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            {/* Level badge */}
            <div
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                background: `linear-gradient(135deg, ${config.color}20 0%, ${config.color}10 100%)`,
                border: `1px solid ${config.color}30`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {user.membershipLevel === 'gold' || user.membershipLevel === 'premium' || user.membershipLevel === 'max' ? (
                <Sparkles size={11} color={config.color} />
              ) : null}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: config.color,
                  letterSpacing: '0.02em',
                }}
              >
                {config.label}
              </span>
            </div>

            {/* Agent badge */}
            {user.role === 'agent' && (
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA' }}>
                  Агент
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Member since info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={16} color="#D4AF37" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
              Клиент с
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 1 }}>
              {memberSinceFormatted}
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
      </motion.div>
    </motion.div>
  )
})
