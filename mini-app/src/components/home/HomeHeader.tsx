import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
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

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
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

  return (
    <motion.header
      className={s.header}
      style={{ marginBottom: 16 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: isNewUser ? '22px 20px 18px' : '24px 20px 20px',
          borderRadius: 32,
          background: isNewUser
            ? 'linear-gradient(165deg, rgba(18, 16, 12, 0.96) 0%, rgba(11, 11, 12, 0.98) 58%, rgba(8, 8, 9, 1) 100%)'
            : 'linear-gradient(165deg, rgba(24, 20, 12, 0.98) 0%, rgba(14, 13, 14, 0.97) 44%, rgba(8, 8, 10, 1) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.10)',
          boxShadow: '0 34px 64px -42px rgba(0, 0, 0, 0.88)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -82,
            right: -44,
            width: 210,
            height: 210,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.04) 34%, transparent 74%)',
            pointerEvents: 'none',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 24%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: hasSummary ? 18 : 0,
            }}
          >
            {!isNewUser && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 22,
                  top: 28,
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 118,
                  lineHeight: 0.82,
                  color: 'rgba(212,175,55,0.035)',
                  letterSpacing: '-0.09em',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {(firstName && firstName.trim().length > 0 ? firstName : 'S').charAt(0)}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div
                className={s.avatarContainer}
                onClick={onSecretTap}
                style={{ width: 72, height: 72, flexShrink: 0 }}
              >
                <div
                  className={s.avatar}
                  style={{
                    position: 'relative',
                    background: 'var(--bg-elevated)',
                    width: 66,
                    height: 66,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-elevated)',
                      zIndex: 1,
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--gold-400)',
                        fontWeight: 700,
                        fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                        fontSize: '22px',
                        lineHeight: 1,
                        textTransform: 'uppercase',
                      }}
                    >
                      {(firstName && firstName.trim().length > 0 ? firstName : 'A').charAt(0)}
                    </span>
                  </div>

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

              <div className={s.userInfo} style={{ marginLeft: 16, minWidth: 0, gap: 6 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(212, 175, 55, 0.72)',
                  }}
                >
                  {isNewUser ? 'Личный кабинет' : 'Личный салон'}
                </div>

                <div
                  className={s.userName}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: isNewUser ? 32 : 38,
                    lineHeight: 0.9,
                    letterSpacing: '-0.055em',
                    textTransform: 'none',
                  }}
                >
                  {firstName}
                </div>

                {!isNewUser && activityLine && (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      alignSelf: 'flex-start',
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.72)',
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
                        boxShadow: '0 0 12px rgba(212,175,55,0.4)',
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
                whileTap={{ scale: 0.97 }}
                onClick={onOpenLounge}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  padding: '12px 14px',
                  background: 'rgba(18, 16, 12, 0.72)',
                  border: '1px solid rgba(212, 175, 55, 0.14)',
                  borderRadius: 20,
                  color: 'var(--gold-300)',
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  backdropFilter: 'blur(16px) saturate(150%)',
                  boxShadow: '0 16px 28px -24px rgba(0, 0, 0, 0.78)',
                }}
              >
                Клуб
                <ArrowUpRight size={14} strokeWidth={2.1} />
              </motion.button>
            )}
          </div>

          {hasSummary && summary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
                gap: 10,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  padding: '16px 16px 14px',
                  borderRadius: 22,
                  background: 'linear-gradient(180deg, rgba(212,175,55,0.11) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(212,175,55,0.12)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.34)',
                    marginBottom: 8,
                  }}
                >
                  На счёте
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 34,
                    fontWeight: 700,
                    lineHeight: 0.94,
                    letterSpacing: '-0.06em',
                    color: 'var(--gold-200)',
                    marginBottom: 6,
                    wordBreak: 'break-word',
                  }}
                >
                  {formatMoney(summary.balance)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'rgba(255,255,255,0.56)',
                  }}
                >
                  Доступно для оплаты новых заказов
                </div>
              </div>

              <div
                style={{
                  minWidth: 0,
                  padding: '16px 16px 14px',
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.34)',
                    marginBottom: 10,
                  }}
                >
                  Кэшбэк
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    lineHeight: 0.98,
                    letterSpacing: '-0.05em',
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  {summary.cashback}%
                </div>

                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'rgba(255,255,255,0.56)',
                  }}
                >
                  На новые заказы
                </div>
              </div>
            </div>
          )}
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
