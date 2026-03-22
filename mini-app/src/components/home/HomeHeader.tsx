import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Coins, Layers3, Wallet } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Refined Premium Edition
//  Quieter, more confident. No unnecessary decoration.
//  Identity on the left, privilege access on the right.
// ═══════════════════════════════════════════════════════════════════════════

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
  const isPremiumClub = user.rank.is_max
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)

  // Contextual greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6) return 'Доброй ночи'
    if (hour < 12) return 'Доброе утро'
    if (hour < 18) return 'Добрый день'
    return 'Добрый вечер'
  }, [])

  const activityLabel = useMemo(() => {
    if (!summary || summary.activeOrders <= 0) return 'Клуб привилегий и персональный сервис'

    const count = summary.activeOrders
    const noun = count === 1 ? 'заказ' : count < 5 ? 'заказа' : 'заказов'
    return `${count} ${noun} под контролем`
  }, [summary])

  const metrics = useMemo(() => {
    if (!summary || isNewUser) return []

    return [
      {
        label: 'На счету',
        value: formatMoney(summary.balance),
        hint: summary.balance > 0 ? 'можно использовать в оплате' : 'пополняется после операций',
        icon: Wallet,
      },
      {
        label: 'Бонусы',
        value: formatMoney(summary.bonusBalance),
        hint: summary.bonusBalance > 0 ? 'спишутся в новом заказе' : 'начислим после оплаты',
        icon: Coins,
      },
      {
        label: 'В работе',
        value: String(summary.activeOrders),
        hint: summary.activeOrders > 0 ? 'отслеживаются в реальном времени' : 'новые заявки появятся здесь',
        icon: Layers3,
      },
    ]
  }, [summary, isNewUser])

  return (
    <motion.header
      className={s.header}
      style={{ marginBottom: 18 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: isNewUser ? '20px 20px 18px' : '22px 20px 20px',
          borderRadius: 28,
          background: isNewUser
            ? 'linear-gradient(160deg, rgba(18, 16, 12, 0.96) 0%, rgba(11, 11, 12, 0.98) 60%, rgba(8, 8, 9, 1) 100%)'
            : 'linear-gradient(160deg, rgba(27, 22, 12, 0.98) 0%, rgba(13, 13, 14, 0.96) 42%, rgba(9, 9, 11, 1) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.12)',
          boxShadow: '0 28px 60px -38px rgba(0, 0, 0, 0.78)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -78,
            right: -42,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, rgba(212, 175, 55, 0.05) 28%, transparent 72%)',
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
              marginBottom: isNewUser ? 0 : 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div
                className={s.avatarContainer}
                onClick={onSecretTap}
                style={{ width: 62, height: 62, flexShrink: 0 }}
              >
                <div className={s.avatar} style={{ position: 'relative', background: 'var(--bg-elevated)', width: 58, height: 58 }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-elevated)',
                    zIndex: 1
                  }}>
                    <span style={{
                      color: 'var(--gold-400)',
                      fontWeight: 700,
                      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                      fontSize: '22px',
                      lineHeight: 1,
                      textTransform: 'uppercase'
                    }}>
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
                        borderRadius: '50%'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        setAvatarError(true)
                      }}
                    />
                  )}
                </div>
              </div>

              <div className={s.userInfo} style={{ marginLeft: 16, minWidth: 0, gap: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(212, 175, 55, 0.72)',
                  }}
                >
                  {isNewUser ? greeting : 'Личный салон'}
                </div>
                <div
                  className={s.userName}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: isNewUser ? 28 : 32,
                    lineHeight: 0.98,
                    letterSpacing: '-0.04em',
                    textTransform: 'none',
                  }}
                >
                  {isNewUser ? `${greeting}, ${firstName}` : firstName}
                </div>
                <div className={s.userStatus} style={{ fontSize: 12, gap: 8, flexWrap: 'wrap' }}>
                  <div className={s.statusDot} />
                  {isNewUser
                    ? 'АКАДЕМИЧЕСКИЙ САЛОН'
                    : `${isPremiumClub ? 'ПРЕМИУМ КЛУБ' : 'КЛУБ ПРИВИЛЕГИЙ'} · ${activityLabel}${summary ? ` · ${summary.cashback}% кэшбэк` : ''}`}
                </div>
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
                  border: '1px solid rgba(212, 175, 55, 0.16)',
                  borderRadius: 18,
                  color: 'var(--gold-300)',
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  backdropFilter: 'blur(16px) saturate(150%)',
                  boxShadow: '0 16px 32px -26px rgba(0, 0, 0, 0.72)',
                }}
              >
                Привилегии
                <ArrowUpRight size={14} strokeWidth={2.1} />
              </motion.button>
            )}
          </div>

          {!isNewUser && metrics.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              {metrics.map((metric) => {
                const Icon = metric.icon

                return (
                  <div
                    key={metric.label}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 18,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(14,12,10,0.5) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.08)',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        marginBottom: 10,
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.10)',
                      }}
                    >
                      <Icon size={15} color="var(--gold-300)" strokeWidth={1.8} />
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginBottom: 6,
                      }}
                    >
                      {metric.label}
                    </div>

                    <div
                      style={{
                        fontSize: metric.label === 'В работе' ? 24 : 16,
                        fontWeight: 700,
                        lineHeight: 1.05,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em',
                        marginBottom: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {metric.value}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.35,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {metric.hint}
                    </div>
                  </div>
                )
              })}
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
    prev.summary?.balance === next.summary?.balance &&
    prev.summary?.bonusBalance === next.summary?.bonusBalance &&
    prev.summary?.cashback === next.summary?.cashback &&
    prev.summary?.activeOrders === next.summary?.activeOrders &&
    prev.isNewUser === next.isNewUser
})
