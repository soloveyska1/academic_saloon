import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Wallet, TrendingUp } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { formatMoney } from '../../lib/utils'

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
  summary,
  userPhoto,
  onSecretTap,
  onOpenLounge,
  isNewUser,
}: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'Гость'
  const ordersCount = user.orders_count ?? 0
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)

  const activityLine = useMemo(() => {
    if (!summary || isNewUser) return null

    if (summary.activeOrders > 0) {
      return `${summary.activeOrders} ${summary.activeOrders === 1 ? 'заказ в работе' : summary.activeOrders < 5 ? 'заказа в работе' : 'заказов в работе'}`
    }

    if (ordersCount > 0) {
      return `${ordersCount} ${ordersCount === 1 ? 'заказ оформлен' : ordersCount < 5 ? 'заказа оформлено' : 'заказов оформлено'}`
    }

    return null
  }, [summary, isNewUser, ordersCount])
  const hasSummary = Boolean(summary && !isNewUser)

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return 'Добрый день'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Доброй ночи'
  }, [])

  // Adaptive balance font size based on digit count
  const balanceFontSize = useMemo(() => {
    if (!summary) return 24
    const formatted = formatMoney(summary.balance)
    const len = formatted.length
    if (len > 10) return 18
    if (len > 7) return 20
    return 24
  }, [summary])

  return (
    <motion.header
      className={s.header}
      style={{ marginBottom: 20 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ─── Top row: Avatar + Name + Club button ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: hasSummary ? 16 : 0,
        }}
      >
        {/* Avatar with gold ring */}
        <div
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: 'conic-gradient(from 45deg, rgba(212,175,55,0.6), rgba(245,225,160,0.4), rgba(212,175,55,0.6))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
            }}
          />
          <div
            style={{
              width: 48,
              height: 48,
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
                fontSize: 20,
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

        {/* Name + activity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 1,
              lineHeight: 1.3,
            }}
          >
            {isNewUser ? 'Добро пожаловать' : greeting}
          </div>

          <div
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 24,
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

          {!isNewUser && activityLine && (
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'rgba(255,255,255,0.56)',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'rgba(212,175,55,0.95)',
                  boxShadow: '0 0 10px rgba(212,175,55,0.4)',
                  flexShrink: 0,
                }}
              />
              {activityLine}
            </div>
          )}
        </div>

        {/* Club button — compact */}
        {!isNewUser && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onOpenLounge}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
              padding: '8px 12px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.16)',
              borderRadius: 12,
              color: 'var(--gold-300)',
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Клуб
            <ArrowUpRight size={12} strokeWidth={2.2} />
          </motion.button>
        )}
      </div>

      {/* ─── Finance summary cards ─── */}
      {hasSummary && summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: 8,
          }}
        >
          {/* Balance card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '14px 14px 12px',
              borderRadius: 12,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.03) 60%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(212,175,55,0.14)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                opacity: 0.5,
              }}
            >
              <Wallet size={14} color="var(--gold-400)" strokeWidth={1.8} />
            </div>

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.38)',
                marginBottom: 8,
              }}
            >
              На счёте
            </div>
            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: balanceFontSize,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.04em',
                color: 'var(--gold-200)',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {formatMoney(summary.balance)}
            </div>
            <div
              style={{
                fontSize: 10,
                lineHeight: 1.3,
                color: 'rgba(255,255,255,0.42)',
              }}
            >
              Доступно для оплаты
            </div>
          </motion.div>

          {/* Cashback card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '14px 14px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                opacity: 0.4,
              }}
            >
              <TrendingUp size={14} color="var(--text-secondary)" strokeWidth={1.8} />
            </div>

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.38)',
                marginBottom: 8,
              }}
            >
              Кэшбэк
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {summary.cashback}%
            </div>

            <div
              style={{
                fontSize: 10,
                lineHeight: 1.3,
                color: 'rgba(255,255,255,0.42)',
              }}
            >
              На новые заказы
            </div>
          </motion.div>
        </div>
      )}
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
