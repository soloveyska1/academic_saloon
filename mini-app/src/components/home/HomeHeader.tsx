import { useState, memo, useMemo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowUpRight, Crown, Sparkles } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { GoldText } from '../ui/GoldText'
// formatMoney from utils includes ₽; we use formatNum locally for separate ₽ styling

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

/* ─── Stagger children helper ─── */
const stagger = {
  container: { animate: { transition: { staggerChildren: 0.08 } } },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  },
}

/* ─── Format number without ₽ for separate styling ─── */
function formatNum(v: number): string {
  return Math.max(0, Math.round(v)).toLocaleString('ru-RU')
}

/* ─── Animated counting number ─── */
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => formatNum(Math.round(v)))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.4,
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

  return <span ref={ref}>{formatNum(0)}</span>
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

/* ─── Floating sparkle dots around balance ─── */
function BalanceSparkles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 40 - 20,
        size: 2 + Math.random() * 2,
        delay: Math.random() * 3,
        duration: 2.5 + Math.random() * 2,
      })),
    [],
  )

  return (
    <>
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
            y: [dot.y, dot.y - 8, dot.y],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background: 'rgba(252,246,186,0.7)',
            transform: `translate(${dot.x}px, ${dot.y}px)`,
            pointerEvents: 'none',
            boxShadow: '0 0 4px rgba(252,246,186,0.4)',
          }}
        />
      ))}
    </>
  )
}

/* ─── Animated border gradient for card ─── */
function AnimatedCardBorder() {
  return (
    <motion.div
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 20,
        padding: 1,
        background:
          'linear-gradient(135deg, rgba(191,149,63,0.30), rgba(252,246,186,0.10), rgba(212,175,55,0.25), rgba(179,135,40,0.08), rgba(251,245,183,0.18), rgba(191,149,63,0.30))',
        backgroundSize: '300% 300%',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ─── Shimmer sweep for buttons ─── */
function ShimmerOverlay() {
  return (
    <motion.div
      animate={{ x: ['-120%', '220%'] }}
      transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '35%',
        height: '100%',
        background:
          'linear-gradient(90deg, transparent 0%, rgba(252,246,186,0.15) 50%, transparent 100%)',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  )
}

/* ─── Decorative divider dots ─── */
function DiamondDivider() {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: '4px 0 2px',
      }}
    >
      <div
        style={{
          width: 32,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15))',
        }}
      />
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: 1,
          transform: 'rotate(45deg)',
          background: 'rgba(212,175,55,0.25)',
          boxShadow: '0 0 6px rgba(212,175,55,0.15)',
        }}
      />
      <div
        style={{
          width: 32,
          height: 1,
          background: 'linear-gradient(90deg, rgba(212,175,55,0.15), transparent)',
        }}
      />
    </motion.div>
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
      duration: 8,
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

  const AVATAR_SIZE = 80

  return (
    <header className={s.header} style={{ marginBottom: showFinance ? 8 : 12 }}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger.container}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* ═══ Avatar — centered, interactive ═══ */}
        <motion.div
          variants={stagger.item}
          whileTap={{ scale: 0.92 }}
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          {/* Deep layered ambient glow */}
          <motion.div
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -28,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 45%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          {/* Second glow layer — wider, softer */}
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{
              position: 'absolute',
              inset: -44,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(252,246,186,0.06) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          {/* Spinning ring */}
          <motion.div
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background: ringGradient,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
              filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.30))',
            }}
          />
          {/* Avatar image / fallback */}
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
                'inset 0 2px 8px rgba(0,0,0,0.6), 0 6px 24px rgba(0,0,0,0.5)',
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
        </motion.div>

        {/* ═══ Greeting + Name ═══ */}
        <motion.div
          variants={stagger.item}
          style={{ textAlign: 'center', marginBottom: showFinance ? 2 : 0 }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 4,
              letterSpacing: '0.05em',
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
              fontSize: 28,
              filter: 'drop-shadow(0 2px 6px rgba(212,175,55,0.18))',
            }}
          >
            {firstName}
          </GoldText>
        </motion.div>

        {/* ═══ Decorative diamond divider ═══ */}
        {showFinance && (
          <motion.div variants={stagger.item} style={{ marginBottom: 16, marginTop: 4 }}>
            <DiamondDivider />
          </motion.div>
        )}

        {/* ═══ Finance card ═══ */}
        {showFinance && (
          <motion.div
            variants={stagger.item}
            style={{
              width: '100%',
              maxWidth: 340,
              position: 'relative',
              borderRadius: 20,
              padding: 1,
            }}
          >
            {/* Animated gradient border */}
            <AnimatedCardBorder />

            {/* Inner card body */}
            <div
              style={{
                borderRadius: 19,
                background:
                  'linear-gradient(165deg, rgba(24,22,19,0.98) 0%, rgba(14,13,12,0.99) 40%, rgba(20,18,15,0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '24px 20px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top glow accent line */}
              <motion.div
                animate={{ opacity: [0.15, 0.30, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '75%',
                  height: 1,
                  background:
                    'linear-gradient(90deg, transparent, rgba(252,246,186,0.30), transparent)',
                }}
              />

              {/* Ambient radials in corners */}
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  left: -40,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(252,246,186,0.03) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Balance — hero */}
              <div style={{ textAlign: 'center', marginBottom: 18, position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {/* Breathing glow */}
                  <motion.div
                    animate={{ opacity: [0.1, 0.35, 0.1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 180,
                      height: 56,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, rgba(252,246,186,0.04) 35%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Floating sparkle particles */}
                  <BalanceSparkles />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <GoldText
                      variant="liquid"
                      size="3xl"
                      weight={700}
                      style={{
                        filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.12))',
                        fontSize: 38,
                        lineHeight: 1.1,
                      }}
                    >
                      <AnimatedNumber value={balance} />
                      <span style={{ fontSize: 24, marginLeft: 3, opacity: 0.6 }}>₽</span>
                    </GoldText>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.20)',
                    marginTop: 6,
                    letterSpacing: '0.02em',
                  }}
                >
                  {bonusBalance > 0
                    ? `из них ${formatNum(bonusBalance)} ₽ бонусов`
                    : 'Личный счёт'}
                </motion.div>
              </div>

              {/* Separator — animated gold gradient */}
              <div style={{ position: 'relative', height: 1, marginBottom: 16 }}>
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
                      'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.25) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    borderRadius: 1,
                  }}
                />
                {/* Glow under separator */}
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: '25%',
                    width: '50%',
                    height: 5,
                    background:
                      'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, transparent 80%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Bottom row: Rank + Cashback | Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                {/* Left: rank + cashback */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    flex: '1 1 auto',
                  }}
                >
                  {user.rank.name && (
                    <>
                      <motion.div
                        animate={{ rotate: [0, -6, 6, 0] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          repeatDelay: 4,
                        }}
                        style={{ display: 'flex', flexShrink: 0 }}
                      >
                        <Crown
                          size={13}
                          strokeWidth={2}
                          style={{
                            color: 'rgba(212,175,55,0.60)',
                            filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.25))',
                          }}
                        />
                      </motion.div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'rgba(245,240,225,0.50)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {user.rank.name}
                      </span>
                      <span
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: '50%',
                          background: 'rgba(212,175,55,0.20)',
                          flexShrink: 0,
                        }}
                      />
                    </>
                  )}
                  <GoldText
                    variant="static"
                    size="sm"
                    weight={700}
                    style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                  >
                    {cashback}% возврат
                  </GoldText>
                </div>

                {/* Right: status button with shimmer */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => onOpenLounge()}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background:
                      'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(191,149,63,0.05) 100%)',
                    border: '1px solid rgba(212,175,55,0.16)',
                    borderRadius: 12,
                    padding: '6px 12px 6px 10px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxShadow:
                      '0 2px 10px rgba(0,0,0,0.20), 0 0 20px rgba(212,175,55,0.04), inset 0 1px 0 rgba(252,246,186,0.06)',
                  }}
                >
                  <ShimmerOverlay />
                  <Sparkles
                    size={10}
                    strokeWidth={2}
                    style={{
                      color: 'var(--gold-400)',
                      opacity: 0.6,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--gold-400)',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    Статус
                  </span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      display: 'flex',
                      color: 'var(--gold-400)',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <ArrowUpRight size={11} strokeWidth={2.5} />
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
