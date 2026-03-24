import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'

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

  return (
    <motion.header
      className={s.header}
      style={{ marginBottom: 20 }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
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
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 2,
            }}
          >
            {isNewUser ? 'Добро пожаловать' : greeting},
          </div>
          <div
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
            {firstName}
          </div>
        </div>

        {/* Right: avatar */}
        <div
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {/* Gold ring */}
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: 'conic-gradient(from 45deg, rgba(212,175,55,0.55), rgba(245,225,160,0.35), rgba(212,175,55,0.55))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))',
            }}
          />
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                color: 'var(--gold-400)',
                fontWeight: 700,
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 18,
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              {(firstName && firstName.trim().length > 0 ? firstName : 'A').charAt(0)}
            </span>

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
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  setAvatarError(true)
                }}
              />
            )}
          </div>
        </div>
      </div>
    </motion.header>
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
