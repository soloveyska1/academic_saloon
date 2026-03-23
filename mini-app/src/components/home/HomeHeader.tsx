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
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: hasSummary ? 24 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {/* Avatar — larger, with premium ring */}
          <div
            onClick={onSecretTap}
            style={{
              position: 'relative',
              width: 56,
              height: 56,
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
                background: 'conic-gradient(from 45deg, rgba(212,175,55,0.6), rgba(245,225,160,0.4), rgba(212,175,55,0.6))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
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
                  fontSize: 24,
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

          {/* Name block */}
          <div style={{ marginLeft: 14, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 2,
                lineHeight: 1.3,
              }}
            >
              {isNewUser ? 'Добро пожаловать' : greeting}
            </div>

            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
              }}
            >
              {firstName}
            </div>

            {!isNewUser && activityLine && (
              <div
                style={{
                  marginTop: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255,255,255,0.56)',
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
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
        </div>

        {!isNewUser && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onOpenLounge}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              padding: '10px 14px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.16)',
              borderRadius: 12,
              color: 'var(--gold-300)',
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Клуб
            <ArrowUpRight size={14} strokeWidth={2.1} />
          </motion.button>
        )}
      </div>

      {/* ─── Finance summary cards ─── */}
      {hasSummary && summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {/* Balance card — hero card with gradient */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '18px 16px 16px',
              borderRadius: 12,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 60%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(212,175,55,0.15)',
            }}
          >
            {/* Decorative icon */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(212,175,55,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={16} color="var(--gold-400)" strokeWidth={1.8} />
            </div>

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.40)',
                marginBottom: 10,
              }}
            >
              На счёте
            </div>
            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.05em',
                color: 'var(--gold-200)',
                marginBottom: 6,
                wordBreak: 'break-word',
              }}
            >
              {formatMoney(summary.balance)}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              Доступно для оплаты
            </div>
          </motion.div>

          {/* Cashback card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '18px 16px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Decorative icon */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={16} color="var(--text-secondary)" strokeWidth={1.8} />
            </div>

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.40)',
                marginBottom: 10,
              }}
            >
              Кэшбэк
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              {summary.cashback}%
            </div>

            <div
              style={{
                fontSize: 11,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.48)',
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
