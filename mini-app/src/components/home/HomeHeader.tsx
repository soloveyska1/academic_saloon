import { useState, memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Premium compact header
//  Features:
//  - Avatar with spinning gold ring (VIP glow for max rank)
//  - Greeting with user name
//  - Streak chip
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
  const shouldReduceMotion = useReducedMotion()

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
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* User Avatar with Spinning Gold Ring + VIP Glow */}
        <div style={{ position: 'relative' }}>
          {/* VIP Glow Effect for Max Rank */}
          {user.rank.is_max && !shouldReduceMotion && (
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)',
                filter: 'blur(4px)',
              }}
            />
          )}
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background:
                'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
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
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 18,
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
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.02em',
              background: user.rank.is_max
                ? 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)'
                : 'var(--text-main)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: user.rank.is_max ? 'transparent' : 'var(--text-main)',
              filter: user.rank.is_max ? 'drop-shadow(0 0 8px rgba(212,175,55,0.3))' : 'none',
              marginBottom: 2,
            }}
          >
            {user.fullname?.split(' ')[0] || 'Гость'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {greeting}
          </div>
        </div>
      </div>

      {/* Compact Club Badge with shimmer */}
      <motion.div
        onClick={onSecretTap}
        whileTap={{ scale: 0.97 }}
        className="border-shimmer"
        style={{
          position: 'relative',
          padding: '8px 14px',
          background: 'linear-gradient(145deg, rgba(20,18,14,0.98), rgba(12,11,8,0.98))',
          borderRadius: 8,
          border: '1px solid rgba(212,175,55,0.5)',
          cursor: 'default',
          userSelect: 'none',
          boxShadow: '0 0 12px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.03)',
        }}
      >
        <span className="gold-shimmer"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          КЛУБ
        </span>
      </motion.div>
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
