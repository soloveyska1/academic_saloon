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

  return (
    <header className={s.header} style={{ marginBottom: 16 }}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Avatar — left, small, clean */}
        <div
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -1.5,
              borderRadius: '50%',
              background: 'conic-gradient(from 45deg, rgba(212,175,55,0.5), rgba(245,225,160,0.3), rgba(212,175,55,0.5))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), black calc(100% - 1.5px))',
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
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
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              {firstName.charAt(0).toUpperCase()}
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
                onError={() => setAvatarError(true)}
              />
            )}
          </div>
        </div>

        {/* Greeting + name — one line, baseline aligned */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
            >
              {isNewUser ? 'Привет,' : `${greeting},`}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {firstName}
            </span>
          </div>
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
