import { useState, memo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Premium minimalist header
//  Features:
//  - Avatar with static gold ring (subtle VIP glow for max rank)
//  - Simple time-based greetings (no gamification)
//  - Compact "Club" button (secret admin access)
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

interface GreetingContext {
  isVIP: boolean
  streak: number
  ordersCount: number
  hasActiveOrders: boolean
}

function getSmartGreeting(ctx: GreetingContext): string {
  const hour = new Date().getHours()
  const day = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.

  // First-time user welcome
  if (ctx.ordersCount === 0) {
    return 'Добро пожаловать'
  }

  // Monday motivation (before noon)
  if (day === 1 && hour < 12) {
    return 'Продуктивной недели'
  }

  // Friday/Weekend
  if (day === 5 && hour >= 17) {
    return 'Отличных выходных'
  }
  if (day === 0 || day === 6) {
    return 'Отличных выходных'
  }

  // Simple time-based greeting (same for everyone, including VIP)
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

export const HomeHeader = memo(function HomeHeader({ user, userPhoto, onSecretTap }: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)

  // Smart greeting based on context
  const greeting = getSmartGreeting({
    isVIP: user.rank.is_max,
    streak: user.daily_bonus_streak,
    ordersCount: user.orders_count ?? 0,
    hasActiveOrders: user.has_active_orders ?? false,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--gap-xl)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-md)' }}>
        {/* User Avatar with static gold ring */}
        <div style={{ position: 'relative' }}>
          {/* VIP Glow - Static subtle halo (no animation) */}
          {user.rank.is_max && (
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
                filter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Static gold ring - no spinning (premium = restraint) */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #FCF6BA 50%, #BF953F 100%)',
              opacity: 0.8,
            }}
          />
          <div
            className="avatar-responsive"
            style={{
              position: 'relative',
              width: 'clamp(44px, 11vw, 56px)',
              height: 'clamp(44px, 11vw, 56px)',
              borderRadius: '50%',
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {userPhoto && !avatarError ? (
              <img
                src={userPhoto}
                alt="User avatar"
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 'var(--text-lg)',
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {user.fullname?.charAt(0) || 'U'}
              </span>
            )}
          </div>
        </div>

        {/* Greeting + Name */}
        <div>
          <div
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.02em',
              background: user.rank.is_max
                ? 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)'
                : 'var(--text-main)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: user.rank.is_max ? 'transparent' : 'var(--text-main)',
              // No drop-shadow - luxury typography is crisp
              marginBottom: 2,
            }}
          >
            {user.fullname?.split(' ')[0] || 'Гость'}
          </div>
          <div
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {greeting}
          </div>
        </div>
      </div>

      {/* Club Badge - clean, no shimmer */}
      <div
        onClick={onSecretTap}
        style={{
          padding: 'var(--space-responsive-sm) var(--space-responsive-md)',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-responsive-sm)',
          border: '1px solid rgba(212,175,55,0.3)',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-xs)',
            letterSpacing: '0.05em',
            color: '#D4AF37',
          }}
        >
          Клуб
        </span>
      </div>
    </motion.div>
  )
}, (prevProps, nextProps) => {
  return prevProps.userPhoto === nextProps.userPhoto &&
    prevProps.user.fullname === nextProps.user.fullname &&
    prevProps.user.rank.is_max === nextProps.user.rank.is_max &&
    prevProps.user.daily_bonus_streak === nextProps.user.daily_bonus_streak &&
    prevProps.user.orders_count === nextProps.user.orders_count &&
    prevProps.user.has_active_orders === nextProps.user.has_active_orders
})
