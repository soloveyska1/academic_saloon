import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { GoldAvatar } from '../ui/GoldText'
import { useCapability } from '../../contexts/DeviceCapabilityContext'
import { KineticText } from '../ui/KineticText'

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

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 28 }

export const HomeHeader = memo(function HomeHeader({
  user,
  userPhoto,
  onSecretTap,
  isNewUser,
}: HomeHeaderProps) {
  const capability = useCapability()
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

  const initial = firstName.charAt(0).toUpperCase()

  return (
    <header className={s.header} style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Left: greeting + name */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, ...springTransition }}
            style={{
              fontFamily: "'Manrope', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 2,
            }}
          >
            {isNewUser ? 'Добро пожаловать' : greeting},
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...springTransition }}
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {capability.tier === 3 ? (
              <KineticText
                animation="typewriter"
                variant="white"
                delay={0.2}
                staggerDelay={0.03}
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {firstName}
              </KineticText>
            ) : (
              firstName
            )}
          </motion.div>
        </div>

        {/* Right: avatar with gold ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, ...springTransition }}
          onClick={onSecretTap}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <GoldAvatar initials={initial} size={44} />

          {/* Photo overlay on top of GoldAvatar if available */}
          {shouldShowAvatar && (
            <img
              src={avatarSrc}
              alt={firstName}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 38,
                height: 38,
                objectFit: 'cover',
                borderRadius: '50%',
                zIndex: 2,
              }}
              onError={() => setAvatarError(true)}
            />
          )}
        </motion.div>
      </div>
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
