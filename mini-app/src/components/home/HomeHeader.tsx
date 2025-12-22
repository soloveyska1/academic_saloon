import { useState, memo } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Premium compact header
//  Features:
//  - Avatar with subtle gold border (NO spinning - premium = restraint)
//  - Greeting with user name
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

  // Time-based base greeting
  let timeGreeting: string
  if (hour >= 5 && hour < 12) timeGreeting = 'Доброе утро'
  else if (hour >= 12 && hour < 17) timeGreeting = 'Добрый день'
  else if (hour >= 17 && hour < 22) timeGreeting = 'Добрый вечер'
  else timeGreeting = 'Доброй ночи'

  // VIP users get special greetings
  if (ctx.isVIP) {
    if (hour >= 22 || hour < 5) return 'Поздняя ночь, VIP на связи'
    if (day === 1) return 'Продуктивной недели, легенда'
    if (day === 5) return 'Отличных выходных, легенда'
    return `${timeGreeting}, легенда`
  }

  // 7-day streak special greeting
  if (ctx.streak >= 7) {
    return 'Ты на огне! Неделя подряд'
  }

  // First-time user welcome
  if (ctx.ordersCount === 0) {
    return 'Добро пожаловать в Салон'
  }

  // Has active orders - encouraging greeting
  if (ctx.hasActiveOrders) {
    if (hour >= 5 && hour < 12) return 'Утро продуктивности!'
    if (hour >= 22 || hour < 5) return 'Работаем даже ночью'
    return 'Работа кипит'
  }

  // Weekend special
  if (day === 0 || day === 6) {
    return 'Отличных выходных'
  }

  // Monday motivation
  if (day === 1 && hour < 12) {
    return 'Продуктивной недели'
  }

  // Friday celebration
  if (day === 5 && hour >= 17) {
    return 'Пятница, наконец!'
  }

  // Default time-based greeting
  return timeGreeting
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
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* User Avatar - Static premium border, NO spinning */}
        <div style={{ position: 'relative' }}>
          {/* Subtle VIP glow for max rank - STATIC, no animation */}
          {user.rank.is_max && (
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 40%, rgba(212,175,55,0.15) 0%, transparent 70%)',
                filter: 'blur(2px)',
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Static gold border - premium = restraint, no spinning */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8932E 100%)',
              opacity: 0.7,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 48,
              height: 48,
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
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  fontSize: 18,
                  color: '#D4AF37',
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
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              marginBottom: 4,
              fontWeight: 400,
            }}
          >
            {greeting}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.01em',
              color: user.rank.is_max ? '#D4AF37' : 'var(--text-main)',
            }}
          >
            {user.fullname?.split(' ')[0] || 'Гость'}
          </div>
        </div>
      </div>

      {/* Compact Club Badge - flat, minimal, NO shimmer */}
      <motion.button
        onClick={onSecretTap}
        whileTap={{ scale: 0.96 }}
        style={{
          padding: '9px 14px',
          background: 'rgba(212, 175, 55, 0.08)',
          borderRadius: 10,
          border: '1px solid rgba(212, 175, 55, 0.2)',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'rgba(212, 175, 55, 0.85)',
            textTransform: 'uppercase',
          }}
        >
          КЛУБ
        </span>
      </motion.button>
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
