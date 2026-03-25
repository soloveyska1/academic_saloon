import { useState, memo, useMemo, useEffect, useRef, useCallback, Component, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Crown, Eye, EyeOff, TrendingUp } from 'lucide-react'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'
import { EASE_PREMIUM, TIMING, TAP_SCALE, haptic } from '../../utils/animation'
import { useReducedMotion } from '../../hooks/useDeviceCapability'
import { GoldText } from '../ui/GoldText'
import { getRankByCashback, getNextRank } from '../../lib/ranks'

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean; name?: string; cashback?: number }
    orders_count?: number
    has_active_orders?: boolean
    total_spent?: number
  }
  summary?: {
    balance: number
    bonusBalance: number
    cashback: number
    activeOrders: number
    totalSaved?: number
    hasPendingPayment?: boolean
  }
  userPhoto?: string
  onSecretTap: () => void
  onOpenLounge: () => void
  isNewUser?: boolean
}

/* ─── Typography system: 38 / 15 / 11 ─── */
const TYPE = { hero: 32, support: 14, context: 10 } as const

/* ─── Stagger children ─── */
const stagger = {
  container: { animate: { transition: { staggerChildren: TIMING.stagger } } },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: TIMING.entrance, ease: EASE_PREMIUM as unknown as number[] } },
  },
}

/* ─── Stagger (reduced motion) ─── */
const staggerReduced = {
  container: { animate: { transition: { staggerChildren: 0 } } },
  item: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.01 } },
  },
}

/* ─── Balance history (localStorage) ─── */
const BALANCE_HISTORY_KEY = 'academic_saloon_balance_history'
const MAX_HISTORY = 30
const MS_PER_DAY = 86_400_000

interface BalanceEntry { balance: number; timestamp: number }

function getBalanceHistory(): BalanceEntry[] {
  try {
    const raw = localStorage.getItem(BALANCE_HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function recordBalance(balance: number) {
  const history = getBalanceHistory()
  const now = Date.now()
  const today = Math.floor(now / MS_PER_DAY)
  // One entry per day — replace if same day, otherwise append
  if (history.length > 0) {
    const last = history[history.length - 1]
    if (Math.floor(last.timestamp / MS_PER_DAY) === today) {
      history[history.length - 1] = { balance, timestamp: now }
    } else {
      history.push({ balance, timestamp: now })
    }
  } else {
    history.push({ balance, timestamp: now })
  }
  // Keep last MAX_HISTORY entries
  const trimmed = history.slice(-MAX_HISTORY)
  try {
    localStorage.setItem(BALANCE_HISTORY_KEY, JSON.stringify(trimmed))
  } catch {
    // localStorage may be unavailable in some webviews.
  }
}

function getWeeklyDelta(currentBalance: number): number | null {
  const history = getBalanceHistory()
  if (history.length < 2) return null
  const now = Date.now()
  const targetTs = now - 7 * MS_PER_DAY
  // Find closest entry to ~7 days ago
  let best: BalanceEntry | null = null
  let bestDist = Infinity
  for (const entry of history) {
    const dist = Math.abs(entry.timestamp - targetTs)
    // Only consider entries at least 3 days old to avoid comparing today vs yesterday
    if (now - entry.timestamp > 3 * MS_PER_DAY && dist < bestDist) {
      bestDist = dist
      best = entry
    }
  }
  if (!best) return null
  return currentBalance - best.balance
}

/* ─── useBalanceFraming hook ─── */
function useBalanceFraming(balance: number, ordersCount?: number) {
  // Record balance on change
  useEffect(() => {
    if (balance > 0) recordBalance(balance)
  }, [balance])

  return useMemo(() => {
    const delta = getWeeklyDelta(balance)
    // Estimate orders: use ~350₽ as fallback average order cost
    const avgCost = ordersCount && ordersCount > 0 && balance > 0
      ? Math.max(200, Math.min(800, balance / Math.max(ordersCount, 1)))
      : 350
    const orderEstimate = balance >= avgCost ? Math.floor(balance / avgCost) : 0
    return { delta, orderEstimate }
  }, [balance, ordersCount])
}

/* ─── Format number ─── */
function formatNum(v: number): string {
  return Math.max(0, Math.round(v)).toLocaleString('ru-RU')
}

/* ─── Per-character reveal with haptic drumroll ─── */
function BalanceReveal({ value, reduced }: { value: string; reduced: boolean }) {
  useEffect(() => {
    if (reduced) return
    const chars = value.split('')
    const timers: ReturnType<typeof setTimeout>[] = []
    // Fire haptic on every 3rd character for subtle rhythm
    chars.forEach((_, i) => {
      if (i % 3 === 0 && i > 0) {
        timers.push(setTimeout(() => haptic('light'), i * 30))
      }
    })
    // Final medium tap at the end
    timers.push(setTimeout(() => haptic('medium'), chars.length * 30))
    return () => timers.forEach(clearTimeout)
  }, [reduced, value])

  if (reduced) return <span>{value}</span>

  return (
    <span style={{ display: 'inline-flex' }}>
      {value.split('').map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2, ease: EASE_PREMIUM as unknown as number[] }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}

/* ─── Animated counting number ─── */
function AnimatedNumber({ value, reduced }: { value: number; reduced: boolean }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => formatNum(Math.round(v)))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (reduced) {
      if (ref.current) ref.current.textContent = formatNum(value)
      return
    }
    const controls = animate(motionVal, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value, motionVal, reduced])

  useEffect(() => {
    const unsub = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsub
  }, [rounded])

  return <span ref={ref}>{formatNum(reduced ? value : 0)}</span>
}

/* ─── Time-based greeting ─── */
function useGreeting(isNewUser: boolean) {
  return useMemo(() => {
    if (isNewUser) return 'Добро пожаловать'
    // Payment status is shown on the order card — keep greeting contextual
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Доброе утро'
    if (hour >= 12 && hour < 18) return 'С возвращением'
    if (hour >= 18 && hour < 23) return 'Добрый вечер'
    return 'Мы на связи'
  }, [isNewUser])
}

/* ─── Slow-breathing card border ─── */
function CardBorder({ reduced }: { reduced: boolean }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    padding: 1,
    background:
      'linear-gradient(135deg, rgba(191,149,63,0.20), rgba(252,246,186,0.06), rgba(212,175,55,0.15), rgba(179,135,40,0.05), rgba(251,245,183,0.10), rgba(191,149,63,0.20))',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  }

  if (reduced) return <div style={base} />

  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: TIMING.breathe + 1, ease: 'easeInOut', repeat: Infinity }}
      style={base}
    />
  )
}

/* ─── Decorative divider ─── */
function DiamondDivider({ reduced }: { reduced: boolean }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15))' }} />
      <div style={{ width: 3, height: 3, borderRadius: 1, transform: 'rotate(45deg)', background: 'rgba(212,175,55,0.25)' }} />
      <div style={{ width: 28, height: 1, background: 'linear-gradient(90deg, rgba(212,175,55,0.15), transparent)' }} />
    </div>
  )

  if (reduced) return content

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      {content}
    </motion.div>
  )
}

/* ─── Online status hook ─── */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}

/* ─── Error Boundary ─── */
interface EBProps { children: ReactNode; fallback: ReactNode }
interface EBState { hasError: boolean }

class HeaderErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

/* ─── Static fallback when header crashes ─── */
function HeaderFallback({ firstName }: { firstName: string }) {
  return (
    <header className={s.header} style={{ marginBottom: 12, textAlign: 'center', padding: '16px 0' }}>
      <GoldText variant="static" size="xl" weight={700}>
        {firstName}
      </GoldText>
    </header>
  )
}

/* ─── Main Component ─── */
const HomeHeaderInner = memo(function HomeHeaderInner({
  user,
  userPhoto,
  summary,
  onSecretTap,
  onOpenLounge,
  isNewUser,
}: HomeHeaderProps) {
  const reduced = useReducedMotion()
  const online = useOnline()
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
  const totalSaved = summary?.totalSaved ?? 0
  const showFinance = !isNewUser && summary
  const { delta: weeklyDelta } = useBalanceFraming(balance, user.orders_count)

  // Sticky mini-bar: track when header scrolls out of view
  const headerRef = useRef<HTMLElement>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
  useEffect(() => {
    const el = headerRef.current
    if (!el || !showFinance) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [showFinance])

  const toggleBalance = useCallback(() => {
    setBalanceHidden((h) => {
      const next = !h
      if (h && !next) {
        setHasRevealed(true)
        haptic('medium')
      }
      return next
    })
  }, [])

  // One-shot gold ring on mount
  const ringRotation = useMotionValue(0)
  const [ringDone, setRingDone] = useState(reduced)
  useEffect(() => {
    if (reduced) return
    const controls = animate(ringRotation, 360, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => setRingDone(true),
    })
    return controls.stop
  }, [ringRotation, reduced])

  const ringGradient = useTransform(
    ringRotation,
    (v) => `conic-gradient(from ${v}deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)`,
  )

  const staticRing = 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)'
  const variants = reduced ? staggerReduced : stagger
  const AVATAR_SIZE = 48

  // ── Rank progress calculation ──
  const rankProgress = useMemo(() => {
    const cashbackVal = user.rank.cashback ?? 0
    const isMax = user.rank.is_max
    if (isMax) return { progress: 1, isMax: true, nextRankName: null }
    const currentRank = getRankByCashback(cashbackVal)
    const nextRank = getNextRank(cashbackVal)
    if (!currentRank || !nextRank) return { progress: 0, isMax: false, nextRankName: null }
    const spent = user.total_spent ?? 0
    const rangeStart = currentRank.minSpent
    const rangeEnd = nextRank.minSpent
    const progress = rangeEnd > rangeStart
      ? Math.min(1, Math.max(0, (spent - rangeStart) / (rangeEnd - rangeStart)))
      : 0
    return { progress, isMax: false, nextRankName: nextRank.displayName }
  }, [user.rank.cashback, user.rank.is_max, user.total_spent])
  const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 24

  return (
    <>
    {/* ═══ Sticky mini-balance bar ═══ */}
    <AnimatePresence>
      {showStickyBar && showFinance && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: EASE_PREMIUM as unknown as number[] }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '8px 16px',
            paddingTop: 'max(8px, env(safe-area-inset-top))',
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(16px) saturate(120%)',
            WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            borderBottom: '1px solid rgba(212,175,55,0.08)',
          }}
        >
          <GoldText variant="static" size="sm" weight={700}>
            {firstName}
          </GoldText>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
          <GoldText variant="static" size="sm" weight={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {balanceHidden ? '• • •' : `${formatNum(balance)} ₽`}
          </GoldText>
          {user.rank.name && (
            <>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {user.rank.name}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    <header ref={headerRef} className={s.header} style={{ marginBottom: showFinance ? 14 : 10 }}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={variants.container}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* ═══ Avatar — proper <button> for a11y ═══ */}
        <motion.div variants={variants.item}>
          <motion.button
            type="button"
            aria-label="Профиль"
            whileTap={reduced ? undefined : { scale: TAP_SCALE }}
            onClick={onSecretTap}
            style={{
              position: 'relative',
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              cursor: 'pointer',
              marginBottom: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'block',
              touchAction: 'manipulation',
            }}
          >
            {/* Ambient glow */}
            {!reduced && (
              <motion.div
                animate={{ opacity: [0.15, 0.30, 0.15] }}
                transition={{ duration: TIMING.breathe, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -20,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  filter: 'blur(4px)',
                }}
              />
            )}
            {/* Gold ring — full conic gradient for max rank, SVG progress arc otherwise */}
            {rankProgress.isMax ? (
              <>
                <motion.div
                  style={{
                    position: 'absolute',
                    inset: -2.5,
                    borderRadius: '50%',
                    background: ringDone ? staticRing : ringGradient,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                    filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.20))',
                  }}
                />
                {/* Shimmer overlay for max rank */}
                {!reduced && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      inset: -2.5,
                      borderRadius: '50%',
                      background: 'conic-gradient(from 0deg, transparent 0%, rgba(252,246,186,0.25) 10%, transparent 20%)',
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                      WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            ) : (
              <svg
                viewBox="0 0 52 52"
                style={{
                  position: 'absolute',
                  inset: -2,
                  width: AVATAR_SIZE + 8,
                  height: AVATAR_SIZE + 8,
                  filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.20))',
                }}
              >
                {/* Background track */}
                <circle cx="26" cy="26" r="24" fill="none"
                  stroke="rgba(212,175,55,0.12)" strokeWidth="2" />
                {/* Progress arc */}
                <motion.circle cx="26" cy="26" r="24" fill="none"
                  stroke="var(--gold-400, #d4af37)" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={PROGRESS_CIRCUMFERENCE}
                  initial={{ strokeDashoffset: PROGRESS_CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: PROGRESS_CIRCUMFERENCE * (1 - rankProgress.progress) }}
                  transition={{ duration: reduced ? 0 : 1.2, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : 0.5 }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
            )}
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
          </motion.button>
          {/* Rank progress label — only for non-max rank */}
          {!rankProgress.isMax && rankProgress.nextRankName && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.8, duration: reduced ? 0 : 0.5, ease: EASE_PREMIUM as unknown as number[] }}
              style={{
                marginTop: 4,
                fontSize: 9,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.50)',
                textAlign: 'center',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {Math.round(rankProgress.progress * 100)}% до {rankProgress.nextRankName}
            </motion.div>
          )}
        </motion.div>

        {/* ═══ Greeting + Name ═══ */}
        <motion.div
          variants={variants.item}
          style={{ textAlign: 'center', marginBottom: 0, maxWidth: '100%' }}
        >
          <div
            style={{
              fontSize: TYPE.context,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.25)',
              marginBottom: 1,
              letterSpacing: '0.06em',
            }}
          >
            {greeting}
          </div>
          <GoldText
            variant={reduced ? 'static' : 'liquid'}
            size="xl"
            weight={700}
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              letterSpacing: '-0.01em',
              display: 'block',
              fontSize: 22,
              filter: reduced ? undefined : 'drop-shadow(0 2px 6px rgba(212,175,55,0.15))',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '85vw',
            }}
          >
            {firstName}
          </GoldText>
        </motion.div>

        {/* ═══ Diamond divider — removed to save 16px vertical space ═══ */}

        {/* ═══ Finance card — full-width ═══ */}
        {showFinance && (
          <motion.div
            variants={variants.item}
            style={{
              width: '100%',
              position: 'relative',
              borderRadius: 16,
              padding: 1,
            }}
          >
            <CardBorder reduced={reduced} />

            <div
              style={{
                borderRadius: 15,
                background:
                  'linear-gradient(165deg, rgba(24,22,19,0.98) 0%, rgba(14,13,12,0.99) 40%, rgba(20,18,15,0.98) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '16px 20px 14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(252,246,186,0.18), transparent)',
                }}
              />

              {/* ── Balance section ── */}
              <div style={{ marginBottom: 10, position: 'relative' }}>
                {/* Breathing glow — quiet */}
                {!reduced && (
                  <motion.div
                    animate={{ opacity: [0.06, 0.2, 0.06] }}
                    transition={{ duration: TIMING.breathe - 1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: '30%',
                      left: 0,
                      width: 160,
                      height: 50,
                      borderRadius: '50%',
                      background: 'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Balance row — left-aligned */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={balanceHidden ? 'Показать баланс' : 'Скрыть баланс'}
                  onClick={toggleBalance}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBalance() } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: 44,
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {balanceHidden ? (
                      <motion.div
                        key="hidden"
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.06 }}
                      >
                        <GoldText
                          variant="static"
                          size="3xl"
                          weight={700}
                          style={{ fontSize: TYPE.hero, lineHeight: 1.1, letterSpacing: '3px' }}
                        >
                          {'• • • • •'}
                        </GoldText>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="visible"
                        initial={reduced ? false : (hasRevealed ? { opacity: 1 } : { opacity: 0, scale: 0.97 })}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.15 }}
                      >
                        <GoldText
                          variant={reduced ? 'static' : 'liquid'}
                          size="3xl"
                          weight={700}
                          style={{
                            fontSize: TYPE.hero,
                            lineHeight: 1.1,
                            letterSpacing: '0.04em',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {!online ? (
                            <span style={{ opacity: 0.4 }}>—</span>
                          ) : hasRevealed ? (
                            <BalanceReveal value={formatNum(balance)} reduced={reduced} />
                          ) : (
                            <AnimatedNumber value={balance} reduced={reduced} />
                          )}
                          {online && (
                            <span
                              style={{
                                fontSize: 18,
                                marginLeft: 3,
                                opacity: 0.5,
                                verticalAlign: 'super',
                                lineHeight: 1,
                              }}
                            >
                              ₽
                            </span>
                          )}
                        </GoldText>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Eye toggle — right-aligned, no background */}
                  <motion.div
                    whileTap={reduced ? undefined : { scale: 0.88 }}
                    transition={{ duration: TIMING.micro }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={balanceHidden ? 'off' : 'on'}
                        initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0, scale: 0.8 }}
                        transition={{ duration: reduced ? 0 : 0.1 }}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        {balanceHidden ? (
                          <EyeOff size={16} strokeWidth={1.5} aria-hidden style={{ color: 'rgba(212,175,55,0.40)' }} />
                        ) : (
                          <Eye size={16} strokeWidth={1.5} aria-hidden style={{ color: 'rgba(212,175,55,0.40)' }} />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Subtitle — tight to number */}
                <motion.div
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduced ? 0 : 0.8, duration: reduced ? 0 : 0.5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <span style={{
                    fontSize: TYPE.context,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.30)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>
                    {!online ? 'Нет связи' : bonusBalance > 0 ? 'Бонусный счёт' : 'Личный счёт'}
                  </span>
                </motion.div>

                {/* Metric chips row — always show at least one */}
                {online && !balanceHidden && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduced ? 0 : 1.0, duration: reduced ? 0 : 0.4 }}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 8,
                    }}
                  >
                    {weeklyDelta !== null && weeklyDelta !== 0 && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: weeklyDelta > 0 ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${weeklyDelta > 0 ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: weeklyDelta > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.25)',
                          letterSpacing: '0.02em',
                        }}>
                          {weeklyDelta > 0
                            ? `+${formatNum(Math.abs(weeklyDelta))} за неделю`
                            : `\u2212${formatNum(Math.abs(weeklyDelta))} за неделю`}
                        </span>
                      </div>
                    )}
                    {totalSaved > 0 && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: 'rgba(212,175,55,0.06)',
                        border: '1px solid rgba(212,175,55,0.10)',
                      }}>
                        <TrendingUp size={10} strokeWidth={2} style={{ color: 'rgba(212,175,55,0.50)' }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(212,175,55,0.50)', letterSpacing: '0.02em' }}>
                          Сэкономлено {formatNum(totalSaved)} ₽
                        </span>
                      </div>
                    )}
                    {/* Orders count chip — VIP gold badge for 50+ orders */}
                    {(user.orders_count ?? 0) > 0 && (() => {
                      const count = user.orders_count ?? 0
                      const isVIP = count >= 50
                      return (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: isVIP ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isVIP ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                          {isVIP && <Crown size={10} color="var(--gold-400)" strokeWidth={2.2} />}
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isVIP ? 'var(--gold-300)' : 'var(--text-muted)',
                          }}>
                            {count} {count === 1 ? 'заказ' : count < 5 ? 'заказа' : 'заказов'}
                          </span>
                        </div>
                      )
                    })()}
                  </motion.div>
                )}
              </div>

              {/* ── Bottom: 3-column mini-grid ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 0,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(212,175,55,0.06)',
                }}
              >
                {/* Left: rank */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Crown
                    size={12}
                    strokeWidth={2}
                    aria-hidden
                    style={{ color: 'rgba(212,175,55,0.50)', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {user.rank.name || 'Клуб'}
                  </span>
                </div>

                {/* Center: cashback hero */}
                <GoldText
                  variant="static"
                  size="sm"
                  weight={700}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: 15,
                    textAlign: 'center',
                    padding: '0 16px',
                  }}
                >
                  {cashback}% кешбэк
                </GoldText>

                {/* Right: bonus link — subtle text, not a loud button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button
                    type="button"
                    aria-label="Открыть бонусы"
                    whileTap={reduced ? undefined : { scale: TAP_SCALE }}
                    onClick={() => onOpenLounge()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(212,175,55,0.50)',
                      whiteSpace: 'nowrap',
                    }}>
                      Бонусы
                    </span>
                    <ArrowUpRight
                      size={10}
                      strokeWidth={2.5}
                      aria-hidden
                      style={{ color: 'rgba(212,175,55,0.45)' }}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </header>
    </>
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
    prev.summary?.totalSaved === next.summary?.totalSaved &&
    prev.user.orders_count === next.user.orders_count &&
    prev.isNewUser === next.isNewUser
})

/* ─── Exported with ErrorBoundary wrapper ─── */
export const HomeHeader = memo(function HomeHeaderSafe(props: HomeHeaderProps) {
  const firstName = props.user.fullname?.split(' ')[0] || 'Гость'
  return (
    <HeaderErrorBoundary fallback={<HeaderFallback firstName={firstName} />}>
      <HomeHeaderInner {...props} />
    </HeaderErrorBoundary>
  )
})
