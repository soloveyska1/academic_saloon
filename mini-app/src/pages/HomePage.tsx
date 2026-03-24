import { useCallback, useRef, useMemo, useState, useEffect, lazy, Suspense, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

// Home Components
import {
  DailyBonusCard,
  HomeHeader,
  QuickActionsRow,
  NewTaskCTA,
  QuickReorderCard,
  UrgentHubSheet,
  TrustStatsStrip,
  HowItWorks,
  GuaranteesShowcase,
  TestimonialsSection,
  LiveActivityFeed,
  StickyBottomCTA,
  WelcomeTour,
  hasSeenWelcomeTour,
  SaloonFooter,
  ModalLoadingFallback,
  ExamSeasonBanner,
  BonusExpiryAlert,
  ActiveOrderDashboard,
  LoungeVault,
  PricingAnchor,
  FAQSection,
} from '../components/home'

// Lazy load modal components
const QRCodeModal = lazy(() => import('../components/ui/QRCode').then(m => ({ default: m.QRCodeModal })))
const CashbackModal = lazy(() => import('../components/modals/CashbackModal').then(m => ({ default: m.CashbackModal })))
const RanksModal = lazy(() => import('../components/modals/RanksModal').then(m => ({ default: m.RanksModal })))
const GuaranteesModal = lazy(() => import('../components/modals/GuaranteesModal').then(m => ({ default: m.GuaranteesModal })))
const TransactionsModal = lazy(() => import('../components/modals/TransactionsModal').then(m => ({ default: m.TransactionsModal })))

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
  const [showTour, setShowTour] = useState(() => !hasSeenWelcomeTour())
  const [referralCopied, setReferralCopied] = useState(false)
  const heroCTARef = useRef<HTMLElement>(null)

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

  // Prefetch CreateOrderPage on first hover/focus
  const prefetchedRef = useRef(false)
  const prefetchCreateOrder = useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    import('../pages/CreateOrderPage').catch(() => {})
  }, [])

  // View Transition wrapper — progressive enhancement
  const navWithTransition = useCallback((path: string, opts?: { state?: unknown }) => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => navigate(path, opts))
    } else {
      navigate(path, opts)
    }
  }, [navigate])

  const handleNewOrder = useCallback(() => {
    haptic('heavy')
    navWithTransition('/create-order')
  }, [haptic, navWithTransition])

  const handleNewOrderWithType = useCallback((workType: string) => {
    haptic('heavy')
    navWithTransition('/create-order', {
      state: { prefill: { work_type: workType } },
    })
  }, [haptic, navWithTransition])

  const handleOpenLounge = useCallback(() => {
    haptic('light')
    navWithTransition('/club')
  }, [haptic, navWithTransition])

  const handleReorder = useCallback((orderId: number) => {
    const order = user?.orders.find(o => o.id === orderId)
    if (!order) return
    navWithTransition('/create-order', {
      state: {
        prefill: {
          work_type: order.work_type,
          subject: order.subject,
          topic: order.subject,
        },
      },
    })
  }, [user?.orders, navWithTransition])

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
  }, [user?.transactions])

  const handleOpenModal = useCallback((modal: ModalName) => {
    if (modal === 'cashback') actions.openModal('cashback')
    else if (modal === 'guarantees') actions.openModal('guarantees')
  }, [actions])

  const handleOpenUrgentSheet = useCallback(() => {
    haptic('medium')
    actions.openModal('urgentSheet')
  }, [haptic, actions])

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

  const shouldShowDailyBonus = Boolean(user?.daily_luck_available || (user?.daily_bonus_streak ?? 0) > 0)
  const shouldShowExamBanner = isNewUser || returningUserState === 'idle'

  /* ─── Loading skeleton ─── */
  if (!user) return (
    <main className={`${s.container} bg-void relative`} style={{ height: '100dvh', paddingTop: 'max(var(--page-padding-top), env(safe-area-inset-top))' }}>
      <div className="relative z-[1]" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--surface-hover)', opacity: 0.5 }} />
            <div style={{ width: 140, height: 24, borderRadius: 8, background: 'var(--surface-hover)' }} />
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-hover)' }} />
        </div>
        <div style={{ height: 56, borderRadius: 12, background: 'var(--surface-hover)', opacity: 0.4 }} />
        <div style={{ height: 180, borderRadius: 12, background: 'var(--surface-hover)', opacity: 0.3 }} />
        <div style={{ height: 100, borderRadius: 12, background: 'var(--surface-hover)', opacity: 0.2 }} />
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
          }}
          summary={{
            balance: user.balance,
            bonusBalance: user.bonus_balance + optimisticBonusAdd,
            cashback: user.rank.cashback,
            activeOrders,
            totalSaved,
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

            {shouldShowExamBanner && <ExamSeasonBanner />}
            <LiveActivityFeed />
            <TrustStatsStrip />
            <HowItWorks />
            <TestimonialsSection />
            <GuaranteesShowcase />
            <PricingAnchor onNavigateToOrder={handleNewOrderWithType} haptic={haptic} />
            <FAQSection />
            <StickyBottomCTA onClick={handleNewOrder} />
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

            {/* ── Quick reorder (just-completed or idle with history) ── */}
            {(returningUserState === 'just-completed' || returningUserState === 'idle') &&
              user.orders.length > 0 && (
              <Section>
                <QuickReorderCard
                  lastOrder={user.orders[0]}
                  onReorder={handleReorder}
                  haptic={haptic}
                  embedded={false}
                />
              </Section>
            )}

            {/* ─── New order CTA ─── */}
            <Section>
              <div onMouseEnter={prefetchCreateOrder} onFocus={prefetchCreateOrder}>
                <NewTaskCTA onClick={handleNewOrder} variant="repeat-order" />
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

            {/* ─── Daily bonus ─── */}
            {shouldShowDailyBonus && (
              <Section>
                <DailyBonusCard
                  variant="compact"
                  dailyAvailable={user.daily_luck_available ?? false}
                  streak={user.daily_bonus_streak || 0}
                  haptic={haptic}
                  onBonusClaimed={handleBonusClaimed}
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
              copied={referralCopied}
              onCopy={handleCopyReferral}
              onShowQR={() => { haptic('light'); actions.openModal('qr') }}
              onTelegramShare={handleTelegramShare}
            />

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

      <Suspense fallback={<ModalLoadingFallback />}>
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
    </main>

      <AnimatePresence>
        {isNewUser && showTour && (
          <WelcomeTour
            onComplete={() => {
              setShowTour(false)
              navigate('/create-order', { state: { firstOrder: true } })
            }}
            haptic={haptic}
          />
        )}
      </AnimatePresence>
    </>
  )
}
