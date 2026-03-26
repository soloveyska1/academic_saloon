import { useCallback, useRef, useMemo, useState, useEffect, lazy, Suspense, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useAdaptiveDarkMode } from '../hooks/useAdaptiveDarkMode'
import { useHomePageState, ModalName } from '../hooks/useHomePageState'
import { Confetti } from '../components/ui/Confetti'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'
import { claimDailyBonus } from '../api/userApi'

// Home Components
import {
  DailyBonusCard,
  HomeHeader,
  QuickActionsRow,
  NewTaskCTA,
  UrgentHubSheet,
  TestimonialsSection,
  WhyTrustUs,
  // StickyBottomCTA removed — hero CTA is always visible for new users
  // WelcomeTour removed — content already on HomePage
  SaloonFooter,
  ExamSeasonBanner,
  BonusExpiryAlert,
  ActiveOrderDashboard,
  LoungeVault,
  PricingAnchor,
  FAQSection,
  // New features
  SpinWheel,
  StreakFreezeCard,
  SeasonalBanner,
  SmartReorderCard,
} from '../components/home'

const loadQRCodeModal = () => import('../components/ui/QRCode').then(m => ({ default: m.QRCodeModal }))
const loadCashbackModal = () => import('../components/modals/CashbackModal').then(m => ({ default: m.CashbackModal }))
const loadRanksModal = () => import('../components/modals/RanksModal').then(m => ({ default: m.RanksModal }))
const loadGuaranteesModal = () => import('../components/modals/GuaranteesModal').then(m => ({ default: m.GuaranteesModal }))
const loadTransactionsModal = () => import('../components/modals/TransactionsModal').then(m => ({ default: m.TransactionsModal }))

// Lazy load modal components
const QRCodeModal = lazy(loadQRCodeModal)
const CashbackModal = lazy(loadCashbackModal)
const RanksModal = lazy(loadRanksModal)
const GuaranteesModal = lazy(loadGuaranteesModal)
const TransactionsModal = lazy(loadTransactionsModal)

const HOME_MODAL_PRELOADERS: Array<() => Promise<unknown>> = [
  loadQRCodeModal,
  loadCashbackModal,
  loadRanksModal,
  loadGuaranteesModal,
  loadTransactionsModal,
]

interface Props {
  user: UserData | null
  onRefresh?: () => Promise<void>
}

import s from './HomePage.module.css'

/* ─── Section wrapper for visual grouping ─── */
function Section({ children, gap = 0 }: { children: ReactNode; gap?: number }) {
  return (
    <div style={{ marginBottom: 16, display: 'grid', gap }}>
      {children}
    </div>
  )
}

export function HomePage({ user, onRefresh }: Props) {
  useAdaptiveDarkMode()
  const navigate = useNavigate()
  const { haptic, tg, botUsername } = useTelegram()
  const admin = useAdmin()
  const capability = useCapability()

  const { containerRef, PullIndicator } = usePullToRefresh({
    onRefresh: async () => { if (onRefresh) await onRefresh() },
    disabled: !onRefresh,
  })

  const { state, actions } = useHomePageState()
  // WelcomeTour removed — no longer needed
  const [referralCopied, setReferralCopied] = useState(false)
  const heroCTARef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const idleWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }
    let cancelled = false
    const run = () => {
      if (cancelled) return
      void Promise.allSettled(HOME_MODAL_PRELOADERS.map(loader => loader()))
    }

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(run, { timeout: 900 })
      return () => {
        cancelled = true
        idleWindow.cancelIdleCallback?.(idleId)
      }
    }

    const timeoutId = globalThis.setTimeout(run, 160)
    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [])

  // Secret admin activation (5 quick taps)
  const tapCountRef = useRef(0)
  const lastTapTimeRef = useRef(0)

  const handleSecretTap = useCallback(() => {
    if (!admin.isAdmin) return
    const now = Date.now()
    if (now - lastTapTimeRef.current > 500) {
      tapCountRef.current = 1
    } else {
      tapCountRef.current += 1
      if (tapCountRef.current >= 5) {
        haptic('heavy')
        openAdminPanel()
        tapCountRef.current = 0
      }
    }
    lastTapTimeRef.current = now
  }, [admin.isAdmin, haptic])

  const activeOrders = useMemo(
    () => user?.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length ?? 0,
    [user?.orders]
  )

  const hasPendingPayment = useMemo(
    () => user?.orders.some(o => o.status === 'waiting_payment') ?? false,
    [user?.orders]
  )

  // Prefetch CreateOrderPage on first hover/focus
  const prefetchedRef = useRef(false)
  const prefetchCreateOrder = useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    import('../pages/CreateOrderPage').catch(() => {})
  }, [])

  const navigateWithoutFlash = useCallback((path: string, opts?: { state?: unknown }) => {
    requestAnimationFrame(() => navigate(path, opts))
  }, [navigate])

  const handleNewOrder = useCallback(() => {
    haptic('heavy')
    navigateWithoutFlash('/create-order')
  }, [haptic, navigateWithoutFlash])

  const handleNewOrderWithType = useCallback((workType: string) => {
    haptic('heavy')
    navigateWithoutFlash('/create-order', {
      state: { prefill: { work_type: workType } },
    })
  }, [haptic, navigateWithoutFlash])

  const handleOpenLounge = useCallback(() => {
    haptic('light')
    navigateWithoutFlash('/club')
  }, [haptic, navigateWithoutFlash])

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }, [])

  const handleCopyReferral = useCallback(() => {
    if (!user) return
    haptic('light')
    navigator.clipboard?.writeText(user.referral_code).then(() => {
      setReferralCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setReferralCopied(false), 2000)
    }).catch(() => {})
  }, [user, haptic])

  const handleTelegramShare = useCallback(() => {
    if (!user) return
    haptic('medium')
    const shareText = buildReferralShareText(user.referral_code)
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(buildReferralLink(botUsername, user.telegram_id))}&text=${encodeURIComponent(shareText)}`
    window.open(shareUrl, '_blank')
  }, [user, haptic, botUsername])

  // Optimistic balance state for instant UI updates
  const [optimisticBonusAdd, setOptimisticBonusAdd] = useState(0)

  const handleBonusClaimed = useCallback((claimedAmount?: number) => {
    // Optimistic: update UI instantly, then refetch in background
    if (claimedAmount && claimedAmount > 0) {
      setOptimisticBonusAdd(prev => prev + claimedAmount)
    }
    if (onRefresh) {
      void onRefresh().then(() => setOptimisticBonusAdd(0))
    }
  }, [onRefresh])

  // Calculate total savings from cashback transactions
  const totalSaved = useMemo(() => {
    if (!user) return 0
    return user.transactions
      .filter(t => t.type === 'credit' && (t.reason.includes('cashback') || t.reason.includes('кешбэк') || t.reason.includes('реферал') || t.reason.includes('promo')))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }, [user])

  const handleOpenModal = useCallback((modal: ModalName) => {
    if (modal === 'cashback') actions.openModal('cashback')
    else if (modal === 'guarantees') actions.openModal('guarantees')
  }, [actions])

  const handleOpenUrgentSheet = useCallback(() => {
    haptic('medium')
    actions.openModal('urgentSheet')
  }, [haptic, actions])

  // Smart reorder with optional subject override
  const handleSmartReorder = useCallback((workType: string, subject?: string) => {
    navigateWithoutFlash('/create-order', {
      state: {
        prefill: {
          work_type: workType,
          subject: subject || undefined,
          topic: subject || undefined,
        },
      },
    })
  }, [navigateWithoutFlash])

  // Spin wheel handler
  const handleSpinWheel = useCallback(async () => {
    const result = await claimDailyBonus()
    if (result.success) {
      handleBonusClaimed(result.bonus)
      return { bonus: result.bonus, streak: result.streak }
    }
    throw new Error(result.message || 'Failed')
  }, [handleBonusClaimed])

  // User state detection
  const isNewUser = !user || user.orders_count === 0 || admin.simulateNewUser
  const userPhoto = tg?.initDataUnsafe?.user?.photo_url
  const inviteLink = buildReferralLink(botUsername, user?.telegram_id)

  const returningUserState = useMemo(() => {
    if (!user || isNewUser) return 'new' as const
    if (activeOrders > 0) return 'active' as const
    const lastOrder = user.orders[0]
    if (lastOrder?.status === 'completed' && lastOrder.completed_at) {
      const daysSince = (Date.now() - new Date(lastOrder.completed_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 7) return 'just-completed' as const
    }
    return 'idle' as const
  }, [isNewUser, activeOrders, user])

  const shouldShowDailyBonus = Boolean(
    user?.daily_luck_available ||
    (user?.daily_bonus_streak ?? 0) > 0 ||
    (user?.streak_freeze_count ?? 0) > 0
  )
  const shouldShowExamBanner = isNewUser || returningUserState === 'idle'

  /* ─── Gold shimmer skeleton ─── */
  const goldSkeletonStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, rgba(212,175,55,0.04) 25%, rgba(212,175,55,0.08) 50%, rgba(212,175,55,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'gold-skeleton 1.5s ease infinite',
  }

  if (!user) return (
    <main className={`${s.container} bg-void relative`} style={{ height: '100dvh', paddingTop: 'max(var(--page-padding-top), env(safe-area-inset-top))', background: '#0A0A0A' }}>
      <style>{`@keyframes gold-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="relative z-[1]" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header: avatar + name + balance card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 100, height: 14, borderRadius: 4, ...goldSkeletonStyle }} />
            <div style={{ width: 140, height: 24, borderRadius: 8, ...goldSkeletonStyle }} />
          </div>
          <div style={{ width: 48, height: 48, borderRadius: '50%', ...goldSkeletonStyle }} />
        </div>
        {/* Balance card */}
        <div style={{ height: 120, borderRadius: 12, ...goldSkeletonStyle }} />
        {/* Order card */}
        <div style={{ height: 80, borderRadius: 12, ...goldSkeletonStyle }} />
        {/* CTA */}
        <div style={{ height: 52, borderRadius: 12, ...goldSkeletonStyle }} />
        {/* Daily bonus */}
        <div style={{ height: 80, borderRadius: 12, ...goldSkeletonStyle }} />
      </div>
    </main>
  )

  return (
    <>
    <main
      ref={containerRef as unknown as React.RefObject<HTMLElement>}
      role="main"
      data-scroll-container="true"
      className={`${s.container} bg-void relative`}
      style={{
        paddingBottom: 'var(--page-padding-bottom)',
        overflowY: 'auto',
        overflowX: 'clip',
        width: '100%',
        maxWidth: '100%',
        height: '100dvh',
        paddingTop: 'max(var(--page-padding-top), env(safe-area-inset-top))',
      }}>
      <PullIndicator />

      {/* Breathing gold orb — fades on scroll */}
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed',
          top: -120,
          right: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="page-background fixed inset-0 z-0" aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div className="relative z-[1]">

        {/* ═══ HEADER — Greeting + Avatar + Finance (unified) ═══ */}
        <HomeHeader
          user={{
            fullname: user.fullname,
            rank: { is_max: user.rank.is_max, name: user.rank.name, cashback: user.rank.cashback },
            orders_count: user.orders_count,
            has_active_orders: activeOrders > 0,
            total_spent: user.total_spent,
          }}
          summary={{
            balance: user.balance,
            bonusBalance: user.bonus_balance + optimisticBonusAdd,
            cashback: user.rank.cashback,
            activeOrders,
            totalSaved,
            hasPendingPayment,
          }}
          userPhoto={userPhoto}
          onSecretTap={handleSecretTap}
          onOpenLounge={handleOpenLounge}
          isNewUser={isNewUser}
        />

        {/* ═══════════════════════════════════════════════════════
            NEW USER FLOW
            ═══════════════════════════════════════════════════════ */}
        {isNewUser ? (
          <>
            <div ref={heroCTARef as React.RefObject<HTMLDivElement>} onMouseEnter={prefetchCreateOrder} onFocus={prefetchCreateOrder}>
              <NewTaskCTA onClick={handleNewOrder} variant="first-order" />
            </div>

            {/* ─── Seasonal banner ─── */}
            <Section>
              <SeasonalBanner onAction={handleNewOrder} />
            </Section>

            {shouldShowExamBanner && <ExamSeasonBanner />}
            <WhyTrustUs />
            <TestimonialsSection />

            {/* Repeat CTA after social proof */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginBottom: 24, textAlign: 'center' }}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleNewOrder}
                style={{
                  width: '100%', padding: '16px 24px', borderRadius: 12,
                  border: '1px solid rgba(212,175,55,0.15)',
                  background: 'rgba(212,175,55,0.06)', color: 'var(--gold-400)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Рассчитать мою работу
                <ArrowRight size={16} strokeWidth={2} />
              </motion.button>
            </motion.div>

            <PricingAnchor onNavigateToOrder={handleNewOrderWithType} haptic={haptic} />
            <FAQSection />
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════
             RETURNING USER FLOW
             ═══════════════════════════════════════════════════════ */
          <>
            {/* ── Active orders → order tracker first ── */}
            {returningUserState === 'active' && (
              <ActiveOrderDashboard
                orders={user.orders}
                onNavigate={navigate}
                haptic={haptic}
              />
            )}

            {/* ── Smart reorder (just-completed or idle with history) ── */}
            {(returningUserState === 'just-completed' || returningUserState === 'idle') &&
              user.orders.length > 0 && (
              <Section>
                <SmartReorderCard
                  lastOrder={user.orders[0]}
                  onReorder={handleSmartReorder}
                  haptic={haptic}
                  cashbackPercent={user.rank.cashback}
                />
              </Section>
            )}

            {/* ─── New order CTA (context-aware) ─── */}
            <Section>
              <div onMouseEnter={prefetchCreateOrder} onFocus={prefetchCreateOrder}>
                <NewTaskCTA onClick={handleNewOrder} onUrgent={handleOpenUrgentSheet} variant="repeat-order" />
              </div>
            </Section>

            {/* ─── Quick actions row ─── */}
            <Section>
              <QuickActionsRow
                onNavigate={navigate}
                onOpenModal={handleOpenModal}
                onOpenUrgentSheet={handleOpenUrgentSheet}
                haptic={haptic}
                cashbackPercent={user.rank.cashback}
              />
            </Section>

            {/* ─── Daily bonus + Streak Freeze ─── */}
            {shouldShowDailyBonus && (
              <Section gap={8}>
                <DailyBonusCard
                  variant="compact"
                  dailyAvailable={user.daily_luck_available ?? false}
                  streak={user.daily_bonus_streak || 0}
                  haptic={haptic}
                  onBonusClaimed={handleBonusClaimed}
                />
                <StreakFreezeCard
                  streak={user.daily_bonus_streak || 0}
                  bonusBalance={user.bonus_balance + optimisticBonusAdd}
                  freezeCount={user.streak_freeze_count || 0}
                  haptic={haptic}
                  onBalanceChanged={onRefresh}
                />
              </Section>
            )}

            {/* ─── Bonus expiry alert ─── */}
            {user.bonus_expiry && (
              <Section>
                <BonusExpiryAlert
                  bonusExpiry={user.bonus_expiry}
                  bonusBalance={user.bonus_balance}
                  onUseBonus={handleNewOrder}
                />
              </Section>
            )}

            {/* ─── Club & Referrals ─── */}
            <LoungeVault
              rank={user.rank}
              bonusBalance={user.bonus_balance + optimisticBonusAdd}
              referralCode={user.referral_code}
              referralsCount={user.referrals_count}
              referralEarnings={user.referral_earnings}
              ordersCount={user.orders_count}
              totalSpent={user.total_spent}
              dailyStreak={user.daily_bonus_streak || 0}
              orders={user.orders}
              copied={referralCopied}
              onCopy={handleCopyReferral}
              onShowQR={() => { haptic('light'); actions.openModal('qr') }}
              onTelegramShare={handleTelegramShare}
            />

            {/* ─── Seasonal banner ─── */}
            <Section>
              <SeasonalBanner onAction={handleNewOrder} />
            </Section>

            {shouldShowExamBanner && <ExamSeasonBanner />}
          </>
        )}

        <SaloonFooter />
      </div>

      <UrgentHubSheet
        isOpen={state.modals.urgentSheet}
        onClose={() => actions.closeModal('urgentSheet')}
        onNavigate={navigate}
        haptic={haptic}
      />

      <Suspense fallback={null}>
        <QRCodeModal
          isOpen={state.modals.qr}
          value={inviteLink}
          displayValue={user.referral_code}
          onClose={() => actions.closeModal('qr')}
          shareText={buildReferralShareText(user.referral_code)}
          downloadFileName={`academic-saloon-${user.referral_code}`}
        />

        <Confetti
          active={state.showConfetti}
          onComplete={() => actions.setConfetti(false)}
          intensity={capability.tier === 3 ? 'medium' : 'low'}
        />

        <CashbackModal
          isOpen={state.modals.cashback}
          onClose={() => actions.closeModal('cashback')}
          user={user}
          onCreateOrder={handleNewOrder}
        />
        <GuaranteesModal
          isOpen={state.modals.guarantees}
          onClose={() => actions.closeModal('guarantees')}
          onCreateOrder={handleNewOrder}
        />
        <TransactionsModal
          isOpen={state.modals.transactions}
          onClose={() => actions.closeModal('transactions')}
          transactions={user.transactions}
          balance={user.balance}
          onViewAll={() => navigate('/profile')}
        />
        <RanksModal
          isOpen={state.modals.ranks}
          onClose={() => actions.closeModal('ranks')}
          user={user}
          onCreateOrder={handleNewOrder}
        />
      </Suspense>

      {/* Spin Wheel modal */}
      <SpinWheel
        isOpen={state.modals.spinWheel}
        onClose={() => actions.closeModal('spinWheel')}
        onSpin={handleSpinWheel}
        haptic={haptic}
        streakDay={(user.daily_bonus_streak || 0) % 7}
      />
    </main>

    </>
  )
}
