import { useState, memo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Ultra-minimal single-line header
//  Premium "old money" design:
//  - Just name + Club button
//  - No greeting, no avatar clutter
//  - Quiet, understated luxury
// ═══════════════════════════════════════════════════════════════════════════

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean }
    daily_bonus_streak: number
    orders_count?: number
    has_active_orders?: boolean
  }
  userPhoto?: string
  onSecretTap: () => void
}

export const HomeHeader = memo(function HomeHeader({ user, userPhoto, onSecretTap }: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'Гость'
  const isVIP = user.rank.is_max

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 4,
      }}
    >
      {/* Left: Avatar + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Compact avatar */}
        <div
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: '50%',
            overflow: 'hidden',
            border: isVIP ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {userPhoto && !avatarError ? (
            <img
              src={userPhoto}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isVIP ? 'var(--gold-400)' : 'var(--text-secondary)',
                }}
              >
                {firstName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name only */}
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: isVIP ? 'var(--gold-400)' : 'var(--text-main)',
            letterSpacing: '0.01em',
          }}
        >
          {firstName}
        </span>
      </div>

      {/* Right: Club button */}
      <button
        type="button"
        onClick={onSecretTap}
        style={{
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--gold-400)',
            opacity: 0.9,
          }}
        >
          Клуб
        </span>
      </button>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return prevProps.userPhoto === nextProps.userPhoto &&
    prevProps.user.fullname === nextProps.user.fullname &&
    prevProps.user.rank.is_max === nextProps.user.rank.is_max
})
