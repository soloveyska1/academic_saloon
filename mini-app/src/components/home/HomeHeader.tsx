import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
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

  const controlItems = useMemo(() => {
    if (!summary || isNewUser) return []

    return [
      {
        label: 'На счёте',
        value: formatMoney(summary.balance),
        accent: true,
      },
      {
        label: summary.activeOrders > 0 ? 'В работе' : 'Оформлено',
        value: summary.activeOrders > 0
          ? `${summary.activeOrders} ${summary.activeOrders === 1 ? 'заказ' : summary.activeOrders < 5 ? 'заказа' : 'заказов'}`
          : `${ordersCount} ${ordersCount === 1 ? 'заказ' : ordersCount < 5 ? 'заказа' : 'заказов'}`,
        accent: false,
      },
    ]
  }, [summary, isNewUser, ordersCount])

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
          padding: isNewUser ? '22px 20px 18px' : '22px 20px 18px',
          borderRadius: 30,
          background: isNewUser
            ? 'linear-gradient(160deg, rgba(18, 16, 12, 0.96) 0%, rgba(11, 11, 12, 0.98) 58%, rgba(8, 8, 9, 1) 100%)'
            : 'linear-gradient(160deg, rgba(30, 24, 13, 0.98) 0%, rgba(15, 15, 16, 0.97) 46%, rgba(8, 8, 10, 1) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.11)',
          boxShadow: '0 34px 70px -42px rgba(0, 0, 0, 0.86)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -96,
            right: -58,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 30%, transparent 74%)',
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
              gap: 14,
              marginBottom: !isNewUser && controlItems.length > 0 ? 18 : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div
                className={s.avatarContainer}
                onClick={onSecretTap}
                style={{ width: 68, height: 68, flexShrink: 0 }}
              >
                <div
                  className={s.avatar}
                  style={{
                    position: 'relative',
                    background: 'var(--bg-elevated)',
                    width: 62,
                    height: 62,
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
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
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
                    fontSize: isNewUser ? 30 : 34,
                    lineHeight: 0.95,
                    letterSpacing: '-0.05em',
                    textTransform: 'none',
                  }}
                >
                  {firstName}
                </div>

                {!isNewUser && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {user.rank.is_max && (
                      <div
                        style={{
                          padding: '7px 11px',
                          borderRadius: 999,
                          background: 'rgba(212,175,55,0.08)',
                          border: '1px solid rgba(212,175,55,0.14)',
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                          color: 'var(--gold-300)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Премиум-клуб
                      </div>
                    )}

                    {!user.rank.is_max && summary && summary.cashback > 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          lineHeight: 1.35,
                          color: 'rgba(255,255,255,0.58)',
                        }}
                      >
                        Кэшбэк {summary.cashback}%
                      </div>
                    )}
                  </div>
                )}

                {!isNewUser && activityLine && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.4,
                      color: 'rgba(255,255,255,0.54)',
                    }}
                  >
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
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  borderRadius: 18,
                  color: 'var(--gold-300)',
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  backdropFilter: 'blur(16px) saturate(150%)',
                  boxShadow: '0 16px 32px -24px rgba(0, 0, 0, 0.76)',
                }}
              >
                Клуб
                <ArrowUpRight size={14} strokeWidth={2.1} />
              </motion.button>
            )}
          </div>

          {!isNewUser && controlItems.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 0,
                borderRadius: 22,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {controlItems.map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    minWidth: 0,
                    padding: '14px 16px',
                    borderLeft: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    background: item.accent
                      ? 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'transparent',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.56)',
                      marginBottom: 7,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '-0.03em',
                      color: item.accent ? 'var(--gold-300)' : 'var(--text-primary)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
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
