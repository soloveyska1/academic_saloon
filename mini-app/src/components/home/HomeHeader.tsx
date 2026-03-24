import { useState, memo, useMemo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { GoldText } from '../ui/GoldText'
import { formatMoney } from '../../lib/utils'

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean; name?: string; cashback?: number }
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

/* ─── Animated counting number ─── */
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => formatMoney(Math.round(v)))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value, motionVal])

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsub
  }, [rounded])

  return <span ref={ref}>{formatMoney(0)}</span>
}

/* ─── Time-based greeting with personality ─── */
function useGreeting(isNewUser: boolean, rankName?: string) {
  return useMemo(() => {
    if (isNewUser) return 'Добро пожаловать в Салун'

    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return 'Доброе утро'
    }
    if (hour >= 12 && hour < 18) {
      return rankName ? 'С возвращением' : 'Добрый день'
    }
    if (hour >= 18 && hour < 23) {
      return 'Добрый вечер'
    }
    return 'Салун не спит'
  }, [isNewUser, rankName])
}

export const HomeHeader = memo(function HomeHeader({
  user,
  userPhoto,
  summary,
  onSecretTap,
  onOpenLounge,
  isNewUser,
}: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'Гость'
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)
  const greeting = useGreeting(!!isNewUser, user.rank.name)

  const balance = summary?.balance ?? 0
  const bonusBalance = summary?.bonusBalance ?? 0
  const cashback = summary?.cashback ?? 0
  const showFinance = !isNewUser && summary

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
    <header className={s.header} style={{ marginBottom: showFinance ? 18 : 12 }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
      >
        {/* ═══ Row 1: Avatar + Greeting + Name ═══ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: showFinance ? 20 : 0,
          }}
        >
          {/* Avatar with animated spinning ring */}
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
            <motion.div
              animate={{ opacity: [0.2, 0.45, 0.2] }}
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
                width: 48,
                height: 48,
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
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{ minWidth: 0, flex: 1 }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.30)',
                marginBottom: 2,
              }}
            >
              {greeting}
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

        {/* ═══ Row 2: Finance strip (returning users only) ═══ */}
        {showFinance && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Balance — hero element */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* Breathing glow behind balance */}
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '30%',
                    width: 120,
                    height: 40,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <GoldText variant="liquid" size="3xl" weight={700}>
                    <AnimatedNumber value={balance} />
                  </GoldText>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.22)',
                  marginTop: 3,
                }}
              >
                {bonusBalance > 0
                  ? `из них ${formatMoney(bonusBalance)} бонусов`
                  : 'Личный счёт'}
              </div>
            </div>

            {/* Separator — animated gold gradient */}
            <div style={{ position: 'relative', height: 1, marginBottom: 14 }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.04)',
                }}
              />
              <motion.div
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.20) 50%, transparent 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>

            {/* Bottom row: Rank+Cashback | Club */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Left: rank + cashback */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {user.rank.name && (
                  <>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'rgba(245,240,225,0.70)',
                      }}
                    >
                      {user.rank.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.18)',
                      }}
                    >
                      ·
                    </span>
                  </>
                )}
                <GoldText variant="static" size="md" weight={700}>
                  {cashback}% возврат
                </GoldText>
              </div>

              {/* Right: club link */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpenLounge()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--gold-400)',
                  }}
                >
                  Ваш статус
                </span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex', color: 'var(--gold-400)' }}
                >
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </header>
  )
}, (prev: Readonly<HomeHeaderProps>, next: Readonly<HomeHeaderProps>) => {
  return prev.userPhoto === next.userPhoto &&
    prev.user.fullname === next.user.fullname &&
    prev.user.rank.is_max === next.user.rank.is_max &&
    prev.user.rank.name === next.user.rank.name &&
    prev.summary?.balance === next.summary?.balance &&
    prev.summary?.bonusBalance === next.summary?.bonusBalance &&
    prev.summary?.cashback === next.summary?.cashback &&
    prev.summary?.activeOrders === next.summary?.activeOrders &&
    prev.user.orders_count === next.user.orders_count &&
    prev.isNewUser === next.isNewUser
})
