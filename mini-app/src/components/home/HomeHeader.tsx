import { useState, memo, useMemo, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { GoldText } from '../ui/GoldText'

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean }
    orders_count?: number
    has_active_orders?: boolean
  }
  summary?: {
    balance: number
    bonusBalance: number
    cashback: number
    activeOrders: number
  }
  userPhoto?: string
  onSecretTap: () => void
  onOpenLounge: () => void
  isNewUser?: boolean
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }

export const HomeHeader = memo(function HomeHeader({
  user,
  userPhoto,
  onSecretTap,
  isNewUser,
}: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'Гость'
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return 'Добрый день'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Доброй ночи'
  }, [])

  // Spinning gold ring
  const ringRotation = useMotionValue(0)
  useEffect(() => {
    const controls = animate(ringRotation, 360, {
      duration: 10,
      ease: 'linear',
      repeat: Infinity,
    })
    return controls.stop
  }, [ringRotation])

  const ringGradient = useTransform(
    ringRotation,
    (v) => `conic-gradient(from ${v}deg, rgba(191,149,63,0.6), rgba(252,246,186,0.3), rgba(212,175,55,0.6), rgba(179,135,40,0.3), rgba(251,245,183,0.4), rgba(191,149,63,0.6))`
  )

  return (
    <header className={s.header} style={{ marginBottom: 6 }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Avatar with spinning gold ring */}
        <div
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: 46,
            height: 46,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {/* Spinning ring */}
          <motion.div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: ringGradient,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
            }}
          />

          {/* Soft glow */}
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.08) 30%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a1816, #0e0d0c)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            <GoldText variant="static" size="lg" weight={700}>
              {firstName.charAt(0).toUpperCase()}
            </GoldText>

            {shouldShowAvatar && (
              <img
                src={avatarSrc}
                alt={firstName}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                  borderRadius: '50%',
                }}
                onError={() => setAvatarError(true)}
              />
            )}
          </div>
        </div>

        {/* Greeting + Name */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.30)',
                marginBottom: 2,
              }}
            >
              {isNewUser ? 'Добро пожаловать' : greeting}
            </div>
            <GoldText
              variant="liquid"
              size="xl"
              weight={700}
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                letterSpacing: '-0.02em',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {firstName}
            </GoldText>
          </motion.div>
        </div>
      </motion.div>
    </header>
  )
}, (prev: Readonly<HomeHeaderProps>, next: Readonly<HomeHeaderProps>) => {
  return prev.userPhoto === next.userPhoto &&
    prev.user.fullname === next.user.fullname &&
    prev.user.rank.is_max === next.user.rank.is_max &&
    prev.summary?.bonusBalance === next.summary?.bonusBalance &&
    prev.summary?.cashback === next.summary?.cashback &&
    prev.summary?.activeOrders === next.summary?.activeOrders &&
    prev.user.orders_count === next.user.orders_count &&
    prev.isNewUser === next.isNewUser
})
