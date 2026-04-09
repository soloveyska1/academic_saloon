import { useCallback, useRef, useMemo, useState, useEffect, lazy, Suspense, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useAdaptiveDarkMode } from '../hooks/useAdaptiveDarkMode'
import { useReducedMotion } from '../hooks/useDeviceCapability'
import { useHomePageState, ModalName } from '../hooks/useHomePageState'
import { Confetti } from '../components/ui/Confetti'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { useNavigation } from '../contexts/NavigationContext'
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
  HomePageSkeleton,
  ModalLoadingFallback,
  // New features
  SpinWheel,
  StreakFreezeCard,
  SeasonalBanner,
  SmartReorderCard,
  // Removed: LiveActivityFeed, PriceCalculator, SessionCountdown, GuaranteeCertificate, LiveAuthorsCounter
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

type LazyHomeModalKey = 'qr' | 'cashback' | 'guarantees' | 'transactions' | 'ranks'

interface Props {
  user: UserData | null
  onRefresh?: () => Promise<void>
}

import s from './HomePage.module.css'

function isExamSeasonWindow(date = new Date()) {
  const month = date.getMonth()
  const day = date.getDate()

  if (month === 11 && day >= 15) return true
  if (month === 0) return true
  if (month === 4) return true
  if (month === 5) return true

  return false
}

function hasSeasonalBanner(date = new Date()) {
  const month = date.getMonth() + 1
  const day = date.getDate()

  if ((month === 12 && day >= 15) || (month === 1 && day <= 15)) return true
  if ((month === 1 && day > 15) || (month === 2 && day <= 15)) return true
  if (month >= 5 && month <= 6) return true
  if (month === 9) return true
  if (month >= 10 && month <= 11) return true
  if (month >= 7 && month <= 8) return true
  if (month >= 3 && month <= 4) return true

  return false
}

function Section({
  children,
  tone = 'default',
  gap = 'normal',
}: {
  children: ReactNode
  tone?: 'default' | 'hero' | 'compact'
  gap?: 'normal' | 'tight'
}) {
  const className = [
    s.section,
    tone === 'hero' ? s.sectionHero : '',
    tone === 'compact' ? s.sectionCompact : '',
    gap === 'tight' ? s.sectionTight : '',
  ].filter(Boolean).join(' ')

  return (
    <section className={className}>{children}</section>
  )
}

export function HomePage({ user, onRefresh }: Props) {
  useAdaptiveDarkMode()
  const navigate = useNavigate()
  const { haptic, tg, botUsername } = useTelegram()
  const admin = useAdmin()
  const capability = useCapability()
  const { setShowBonusBadge } = useNavigation()
  const shouldReduceMotion = useReducedMotion()

  const { containerRef, PullIndicator } = usePullToRefresh({
    onRefresh: async () => { if (onRefresh) await onRefresh() },
    disabled: !onRefresh,
  })

  const { state, actions } = useHomePageState()
  // WelcomeTour removed — no longer needed
  const [referralCopied, setReferralCopied] = useState(false)
  const [mountedHomeModals, setMountedHomeModals] = useState<Record<LazyHomeModalKey, boolean>>({
    qr: false,
    cashback: false,
    guarantees: false,
    transactions: false,
    ranks: false,
  })
  const heroCTARef = useRef<HTMLDivElement | null>(null)

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
    setShowBonusBadge(false) // Clear nav badge immediately
    if (onRefresh) {
      void onRefresh().finally(() => setOptimisticBonusAdd(0))
      return
    }
    setOptimisticBonusAdd(0)
  }, [onRefresh, setShowBonusBadge])

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
  const showExamBanner = shouldShowExamBanner && isExamSeasonWindow()
  const showSeasonalBanner = !showExamBanner && hasSeasonalBanner()

  // Sync bonus badge dot on navigation Бонусы tab
  useEffect(() => {
    setShowBonusBadge(Boolean(user?.daily_luck_available))
  }, [user?.daily_luck_available, setShowBonusBadge])

  useEffect(() => {
    setMountedHomeModals((prev) => {
      let changed = false
      const next = { ...prev }

      ;(['qr', 'cashback', 'guarantees', 'transactions', 'ranks'] as const).forEach((key) => {
        if (state.modals[key] && !prev[key]) {
          next[key] = true
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [state.modals])

  if (!user) {
    return (
      <main className={`${s.container} ${shouldReduceMotion ? s.containerReducedMotion : ''} bg-void relative`}>
        <div className={s.backgroundLayer} aria-hidden="true">
          <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
        </div>
        <div className={s.loadingShell}>
          <HomePageSkeleton />
        </div>
      </main>
    )
  }

  return (
    <>
    <main
      ref={containerRef as unknown as React.RefObject<HTMLElement>}
      role="main"
      data-scroll-container="true"
      className={`${s.container} ${shouldReduceMotion ? s.containerReducedMotion : ''} bg-void relative`}>
      <PullIndicator />

      {shouldReduceMotion ? (
        <div aria-hidden="true" className={s.backdropOrb} />
      ) : (
        <motion.div
          aria-hidden="true"
          className={s.backdropOrb}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className={s.backgroundLayer} aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div className={s.pageContent}>

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
            <Section tone="hero">
              <div ref={heroCTARef} onMouseEnter={prefetchCreateOrder} onFocus={prefetchCreateOrder}>
                <NewTaskCTA onClick={handleNewOrder} variant="first-order" />
              </div>
            </Section>

            {(showSeasonalBanner || showExamBanner) && (
              <Section tone="compact">
                {showExamBanner ? <ExamSeasonBanner /> : <SeasonalBanner onAction={handleNewOrder} />}
              </Section>
            )}

            <div className={s.featureBand}>
              <WhyTrustUs />
              <TestimonialsSection />
            </div>

            <div className={s.supportBand}>
              <PricingAnchor onNavigateToOrder={handleNewOrderWithType} haptic={haptic} />
              <FAQSection />
            </div>
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
            <Section tone="hero">
              <div onMouseEnter={prefetchCreateOrder} onFocus={prefetchCreateOrder}>
                <NewTaskCTA onClick={handleNewOrder} onUrgent={handleOpenUrgentSheet} variant="repeat-order" />
              </div>
            </Section>

            <div className={s.utilityBand}>
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
                <Section gap="tight">
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
            </div>

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
              achievements={user.achievements}
              ordersCount={user.orders_count}
              totalSpent={user.total_spent}
              dailyStreak={user.daily_bonus_streak || 0}
              orders={user.orders}
              copied={referralCopied}
              onCopy={handleCopyReferral}
              onShowQR={() => { haptic('light'); actions.openModal('qr') }}
              onTelegramShare={handleTelegramShare}
            />

            {(showSeasonalBanner || showExamBanner) && (
              <Section tone="compact">
                {showExamBanner ? <ExamSeasonBanner /> : <SeasonalBanner onAction={handleNewOrder} />}
              </Section>
            )}
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

      <Confetti
        active={state.showConfetti}
        onComplete={() => actions.setConfetti(false)}
        intensity={capability.tier === 3 ? 'medium' : 'low'}
      />

      {mountedHomeModals.qr && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <QRCodeModal
            isOpen={state.modals.qr}
            value={inviteLink}
            displayValue={user.referral_code}
            onClose={() => actions.closeModal('qr')}
            shareText={buildReferralShareText(user.referral_code)}
            downloadFileName={`academic-saloon-${user.referral_code}`}
          />
        </Suspense>
      )}

      {mountedHomeModals.cashback && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CashbackModal
            isOpen={state.modals.cashback}
            onClose={() => actions.closeModal('cashback')}
            user={user}
            onCreateOrder={handleNewOrder}
          />
        </Suspense>
      )}

      {mountedHomeModals.guarantees && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <GuaranteesModal
            isOpen={state.modals.guarantees}
            onClose={() => actions.closeModal('guarantees')}
            onCreateOrder={handleNewOrder}
          />
        </Suspense>
      )}

      {mountedHomeModals.transactions && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <TransactionsModal
            isOpen={state.modals.transactions}
            onClose={() => actions.closeModal('transactions')}
            transactions={user.transactions}
            balance={user.balance}
            onViewAll={() => navigate('/profile')}
          />
        </Suspense>
      )}

      {mountedHomeModals.ranks && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <RanksModal
            isOpen={state.modals.ranks}
            onClose={() => actions.closeModal('ranks')}
            user={user}
            onCreateOrder={handleNewOrder}
          />
        </Suspense>
      )}

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
