import { useState, memo, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Crown, Eye, EyeOff } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { GoldText } from '../ui/GoldText'

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

/* ─── Typography system: 38 / 15 / 11 ─── */
const TYPE = { hero: 38, support: 15, context: 11 } as const

/* ─── Stagger children ─── */
const stagger = {
  container: { animate: { transition: { staggerChildren: 0.08 } } },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  },
}

/* ─── Format number without ₽ ─── */
function formatNum(v: number): string {
  return Math.max(0, Math.round(v)).toLocaleString('ru-RU')
}

/* ─── Per-character reveal animation ─── */
function BalanceReveal({ value }: { value: string }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      {value.split('').map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}

/* ─── Animated counting number (initial entrance only) ─── */
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
function useGreeting(isNewUser: boolean) {
  return useMemo(() => {
    if (isNewUser) return 'Добро пожаловать'
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return 'С возвращением'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Салун не спит'
  }, [isNewUser])
}

/* ─── Slow-breathing card border ─── */
function CardBorder() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 20,
        padding: 1,
        background:
          'linear-gradient(135deg, rgba(191,149,63,0.20), rgba(252,246,186,0.06), rgba(212,175,55,0.15), rgba(179,135,40,0.05), rgba(251,245,183,0.10), rgba(191,149,63,0.20))',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ─── Decorative divider ─── */
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
      }}
    >
      <div
        style={{
          width: 28,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15))',
        }}
      />
      <div
        style={{
          width: 3,
          height: 3,
          borderRadius: 1,
          transform: 'rotate(45deg)',
          background: 'rgba(212,175,55,0.25)',
        }}
      />
      <div
        style={{
          width: 28,
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
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [hasRevealed, setHasRevealed] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'Гость'
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)
  const greeting = useGreeting(!!isNewUser)

  const balance = summary?.balance ?? 0
  const bonusBalance = summary?.bonusBalance ?? 0
  const cashback = summary?.cashback ?? 0
  const showFinance = !isNewUser && summary

  const toggleBalance = useCallback(() => {
    setBalanceHidden((h) => {
      const next = !h
      if (h && !next) {
        // Revealing — trigger per-char animation + haptic
        setHasRevealed(true)
        try { navigator.vibrate?.(8) } catch { /* noop */ }
      }
      return next
    })
  }, [])

  // One-shot gold ring on mount
  const ringRotation = useMotionValue(0)
  const [ringDone, setRingDone] = useState(false)
  useEffect(() => {
    const controls = animate(ringRotation, 360, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => setRingDone(true),
    })
    return controls.stop
  }, [ringRotation])

  const ringGradient = useTransform(
    ringRotation,
    (v) =>
      `conic-gradient(from ${v}deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)`,
  )

  const AVATAR_SIZE = 64

  return (
    <header className={s.header} style={{ marginBottom: showFinance ? 8 : 12 }}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger.container}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* ═══ Avatar ═══ */}
        <motion.div
          variants={stagger.item}
          whileTap={{ scale: 0.92 }}
          onClick={onSecretTap}
          style={{
            position: 'relative',
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          {/* Ambient glow */}
          <motion.div
            animate={{ opacity: [0.15, 0.30, 0.15] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -20,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
              filter: 'blur(4px)',
            }}
          />
          {/* Gold ring */}
          <motion.div
            style={{
              position: 'absolute',
              inset: -2.5,
              borderRadius: '50%',
              background: ringDone
                ? 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)'
                : ringGradient,
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              WebkitMask:
                'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.20))',
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
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.4)',
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
        </motion.div>

        {/* ═══ Greeting (minimal) + Name (hero) ═══ */}
        <motion.div
          variants={stagger.item}
          style={{ textAlign: 'center', marginBottom: showFinance ? 4 : 0 }}
        >
          <div
            style={{
              fontSize: TYPE.context,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 2,
              letterSpacing: '0.06em',
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
              filter: 'drop-shadow(0 2px 6px rgba(212,175,55,0.15))',
            }}
          >
            {firstName}
          </GoldText>
        </motion.div>

        {/* ═══ Diamond divider ═══ */}
        {showFinance && (
          <motion.div variants={stagger.item} style={{ margin: '6px 0 28px' }}>
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
            <CardBorder />

            <div
              style={{
                borderRadius: 19,
                background:
                  'linear-gradient(165deg, rgba(24,22,19,0.98) 0%, rgba(14,13,12,0.99) 40%, rgba(20,18,15,0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '24px 24px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: 1,
                  background:
                    'linear-gradient(90deg, transparent, rgba(252,246,186,0.18), transparent)',
                }}
              />

              {/* ── Balance ── */}
              <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative' }}>
                {/* Breathing glow — quiet */}
                <motion.div
                  animate={{ opacity: [0.06, 0.2, 0.06] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 140,
                    height: 44,
                    transform: 'translate(-50%, -55%)',
                    borderRadius: '50%',
                    background:
                      'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Balance row: number + eye */}
                <div
                  onClick={toggleBalance}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 14,
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: 48,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {balanceHidden ? (
                      <motion.div
                        key="hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.06 }}
                      >
                        <GoldText
                          variant="static"
                          size="3xl"
                          weight={700}
                          style={{
                            fontSize: TYPE.hero,
                            lineHeight: 1.1,
                            letterSpacing: '3px',
                          }}
                        >
                          {'• • • • •'}
                        </GoldText>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="visible"
                        initial={hasRevealed ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <GoldText
                          variant="liquid"
                          size="3xl"
                          weight={700}
                          style={{
                            fontSize: TYPE.hero,
                            lineHeight: 1.1,
                            letterSpacing: '0.04em',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {hasRevealed ? (
                            <BalanceReveal value={formatNum(balance)} />
                          ) : (
                            <AnimatedNumber value={balance} />
                          )}
                          <span
                            style={{
                              fontSize: 22,
                              marginLeft: 3,
                              opacity: 0.5,
                              verticalAlign: 'super',
                              lineHeight: 1,
                            }}
                          >
                            ₽
                          </span>
                        </GoldText>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Eye — 44px tap zone */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      touchAction: 'manipulation',
                    }}
                  >
                    {balanceHidden ? (
                      <EyeOff
                        size={16}
                        strokeWidth={1.5}
                        style={{ color: 'rgba(212,175,55,0.40)' }}
                      />
                    ) : (
                      <Eye
                        size={16}
                        strokeWidth={1.5}
                        style={{ color: 'rgba(212,175,55,0.40)' }}
                      />
                    )}
                  </motion.button>
                </div>

                {/* Subtitle — category label */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  style={{
                    fontSize: TYPE.context,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.30)',
                    marginTop: 8,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {bonusBalance > 0 ? 'Бонусный счёт' : 'Личный счёт'}
                </motion.div>
              </div>

              {/* ── Bottom row ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                {/* Left: rank + cashback — two levels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  {user.rank.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Crown
                        size={10}
                        strokeWidth={2}
                        style={{
                          color: 'rgba(212,175,55,0.45)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.35)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.18em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user.rank.name}
                      </span>
                    </div>
                  )}
                  <GoldText
                    variant="static"
                    size="sm"
                    weight={700}
                    style={{ whiteSpace: 'nowrap', fontSize: TYPE.support }}
                  >
                    {cashback}% кешбэк
                  </GoldText>
                </div>

                {/* Right: bonus button — no shimmer, radius 8 */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onOpenLounge()}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.20)',
                    borderRadius: 8,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      fontSize: TYPE.context,
                      fontWeight: 700,
                      color: 'var(--gold-400)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Бонусы
                  </span>
                  <ArrowUpRight
                    size={TYPE.context}
                    strokeWidth={2.5}
                    style={{ color: 'var(--gold-400)' }}
                  />
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
