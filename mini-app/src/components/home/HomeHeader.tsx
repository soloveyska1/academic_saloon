import { useState, memo, useMemo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowUpRight, Crown } from 'lucide-react'
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

/* ─── Time-based greeting ─── */
function useGreeting(isNewUser: boolean, rankName?: string) {
  return useMemo(() => {
    if (isNewUser) return 'Добро пожаловать в Салун'
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return rankName ? 'С возвращением' : 'Добрый день'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Салун не спит'
  }, [isNewUser, rankName])
}

/* ─── Shimmer overlay for buttons ─── */
function ShimmerOverlay() {
  return (
    <motion.div
      animate={{ x: ['-120%', '220%'] }}
      transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent 0%, rgba(252,246,186,0.12) 50%, transparent 100%)',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  )
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

  // Spinning gold ring for avatar
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
    (v) =>
      `conic-gradient(from ${v}deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)`,
  )

  const AVATAR_SIZE = 76

  return (
    <header className={s.header} style={{ marginBottom: showFinance ? 8 : 12 }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* ═══ Avatar — centered hero ═══ */}
        <div
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          {/* Deep ambient glow — layered */}
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -24,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.04) 50%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          {/* Spinning ring — full gold, thicker */}
          <motion.div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background: ringGradient,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.25))',
            }}
          />
          {/* Avatar circle */}
          <div
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #1a1816, #0e0d0c)',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                'inset 0 2px 6px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <GoldText variant="static" size="xl" weight={700}>
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

        {/* ═══ Greeting + Name — centered ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: showFinance ? 26 : 0 }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 4,
              letterSpacing: '0.04em',
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
              letterSpacing: '-0.01em',
              display: 'block',
              fontSize: 26,
              filter: 'drop-shadow(0 1px 3px rgba(212,175,55,0.15))',
            }}
          >
            {firstName}
          </GoldText>
        </motion.div>

        {/* ═══ Finance card ═══ */}
        {showFinance && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%',
              position: 'relative',
              borderRadius: 22,
              padding: 1,
              /* Gradient border via wrapper */
              background:
                'linear-gradient(135deg, rgba(191,149,63,0.25) 0%, rgba(212,175,55,0.08) 30%, rgba(179,135,40,0.15) 60%, rgba(252,246,186,0.12) 100%)',
            }}
          >
            {/* Inner card */}
            <div
              style={{
                borderRadius: 21,
                background:
                  'linear-gradient(165deg, rgba(22,20,18,0.97) 0%, rgba(14,13,12,0.98) 40%, rgba(18,16,14,0.97) 100%)',
                padding: '26px 24px 22px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top glow accent — wider, softer */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '70%',
                  height: 1,
                  background:
                    'linear-gradient(90deg, transparent, rgba(252,246,186,0.20), transparent)',
                }}
              />

              {/* Corner glow — top-left subtle radial */}
              <div
                style={{
                  position: 'absolute',
                  top: -30,
                  left: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Corner glow — bottom-right */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(212,175,55,0.03) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Balance — centered hero */}
              <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {/* Breathing glow — bigger, richer */}
                  <motion.div
                    animate={{ opacity: [0.15, 0.45, 0.15] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 200,
                      height: 60,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, rgba(252,246,186,0.03) 40%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <GoldText
                      variant="liquid"
                      size="3xl"
                      weight={700}
                      style={{
                        filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.12))',
                        fontSize: 44,
                      }}
                    >
                      <AnimatedNumber value={balance} />
                    </GoldText>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.25)',
                    marginTop: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  {bonusBalance > 0
                    ? `из них ${formatMoney(bonusBalance)} бонусов`
                    : 'Личный счёт'}
                </motion.div>
              </div>

              {/* Separator — animated gold gradient line */}
              <div style={{ position: 'relative', height: 1, marginBottom: 18 }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 1,
                  }}
                />
                <motion.div
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.22) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    borderRadius: 1,
                  }}
                />
              </div>

              {/* Bottom row: Rank + Cashback | Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {/* Left: rank + cashback */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {user.rank.name && (
                    <>
                      <motion.div
                        animate={{ rotate: [0, -8, 8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
                        style={{ display: 'flex', flexShrink: 0 }}
                      >
                        <Crown
                          size={14}
                          strokeWidth={2}
                          style={{
                            color: 'rgba(212,175,55,0.55)',
                            filter: 'drop-shadow(0 0 3px rgba(212,175,55,0.2))',
                          }}
                        />
                      </motion.div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'rgba(245,240,225,0.55)',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {user.rank.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.10)',
                          flexShrink: 0,
                        }}
                      >
                        ·
                      </span>
                    </>
                  )}
                  <GoldText variant="static" size="md" weight={700} style={{ whiteSpace: 'nowrap' }}>
                    {cashback}% возврат
                  </GoldText>
                </div>

                {/* Right: status link — pill button with shimmer */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onOpenLounge()}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background:
                      'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(191,149,63,0.04) 100%)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    borderRadius: 12,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(252,246,186,0.04)',
                  }}
                >
                  <ShimmerOverlay />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--gold-400)',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    Ваш статус
                  </span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'flex', color: 'var(--gold-400)', position: 'relative', zIndex: 1 }}
                  >
                    <ArrowUpRight size={12} strokeWidth={2.5} />
                  </motion.span>
                </motion.button>
              </div>
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
