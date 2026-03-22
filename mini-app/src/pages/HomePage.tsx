import { useCallback, useRef, useMemo, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useHomePageState, ModalName } from '../hooks/useHomePageState'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { usePromo } from '../contexts/PromoContext'
import { Confetti } from '../components/ui/Confetti'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
// FloatingGoldParticles removed — visual noise
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
  LevelProgressCard,
  ReputationCard,
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

export function HomePage({ user, onRefresh }: Props) {
  const navigate = useNavigate()
  const { haptic, tg, botUsername } = useTelegram()
  const admin = useAdmin()
  const { activePromo } = usePromo()
  const capability = useCapability()

  const { containerRef, PullIndicator } = usePullToRefresh({
    onRefresh: async () => { if (onRefresh) await onRefresh() },
    disabled: !onRefresh,
  })

  // State management via reducer
  const { state, actions } = useHomePageState()

  // Welcome tour for first-time users
  const [showTour, setShowTour] = useState(() => !hasSeenWelcomeTour())

  // Referral copy state
  const [referralCopied, setReferralCopied] = useState(false)

  // Ref for hero CTA — StickyBottomCTA shows when hero exits viewport
  const heroCTARef = useRef<HTMLElement>(null)

  // Secret admin activation (5 quick taps on logo badge)
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

  // Memoized calculations
  const activeOrders = useMemo(
    () => user?.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length ?? 0,
    [user?.orders]
  )

  const handleNewOrder = useCallback(() => {
    haptic('heavy')
    navigate('/create-order')
  }, [haptic, navigate])

  const handleNewOrderWithType = useCallback((workType: string) => {
    haptic('heavy')
    navigate('/create-order', {
      state: { prefill: { work_type: workType } },
    })
  }, [haptic, navigate])

  const handleOpenLounge = useCallback(() => {
    haptic('light')
    navigate('/club')
  }, [haptic, navigate])

  const handleReorder = useCallback((orderId: number) => {
    const order = user?.orders.find(o => o.id === orderId)
    if (!order) return
    navigate('/create-order', {
      state: {
        prefill: {
          work_type: order.work_type,
          subject: order.subject,
          topic: order.subject,
        },
      },
    })
  }, [user?.orders, navigate])

  const handleCopyReferral = useCallback(() => {
    if (!user) return
    haptic('light')
    navigator.clipboard?.writeText(user.referral_code).catch(() => {})
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 2000)
  }, [user, haptic])

  const handleTelegramShare = useCallback(() => {
    if (!user) return
    haptic('medium')
    const shareText = buildReferralShareText(user.referral_code)
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(buildReferralLink(botUsername, user.telegram_id))}&text=${encodeURIComponent(shareText)}`
    window.open(shareUrl, '_blank')
  }, [user, haptic, botUsername])

  if (!user) return null

  // User type detection for progressive disclosure
  const isNewUser = user.orders_count === 0 || admin.simulateNewUser
  const userPhoto = tg?.initDataUnsafe?.user?.photo_url
  const inviteLink = buildReferralLink(botUsername, user.telegram_id)

  // Three returning-user sub-states for personalized flow
  const returningUserState = useMemo(() => {
    if (isNewUser) return 'new' as const
    const hasActive = activeOrders > 0
    if (hasActive) return 'active' as const

    // Check if last order was completed recently (within 7 days)
    const lastOrder = user.orders[0]
    if (lastOrder?.status === 'completed' && lastOrder.completed_at) {
      const completedDate = new Date(lastOrder.completed_at)
      const daysSince = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 7) return 'just-completed' as const
    }
    return 'idle' as const
  }, [isNewUser, activeOrders, user.orders])

  return (
    <>
    <main
      ref={containerRef as unknown as React.RefObject<HTMLElement>}
      role="main"
      data-scroll-container="true"
      className={`${s.container} bg-void relative`}
      style={{ paddingBottom: isNewUser ? 160 : 100, overflowY: 'auto', height: '100vh' }}>
      <PullIndicator />
      {/* Premium Background */}
      <div className="page-background fixed inset-0 z-0" aria-hidden="true">
        <PremiumBackground
          variant="gold"
          intensity="subtle"
          interactive={false}
        />
      </div>

      {/* Content */}
      <div className="relative z-[1]">

        {/* ═══════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════ */}
        <HomeHeader
          user={{
            fullname: user.fullname,
            rank: { is_max: user.rank.is_max },
            orders_count: user.orders_count,
            has_active_orders: activeOrders > 0,
          }}
          userPhoto={userPhoto}
          onSecretTap={handleSecretTap}
          onOpenLounge={handleOpenLounge}
          isNewUser={isNewUser}
        />

        {/* ═══════════════════════════════════════════════════════════════════
          CONTEXTUAL SEASON BANNER — Both flows
          Shows during exam periods (Dec-Jan, May-Jun). Urgency without being pushy.
          ═══════════════════════════════════════════════════════════════════ */}
        <ExamSeasonBanner />

        {/* ═══════════════════════════════════════════════════════════════════
          NEW USER FLOW — Full conversion funnel:
          Hero → LiveActivity → TrustStats → HowItWorks →
          Testimonials → Guarantees → PricingAnchor → FAQ → Footer
          + StickyBottomCTA (fixed, appears after hero exits viewport)
          ═══════════════════════════════════════════════════════════════════ */}
        {isNewUser ? (
          <>
            {/* 1. Hero CTA — The promise + price anchor */}
            <div ref={heroCTARef as React.RefObject<HTMLDivElement>}>
              <NewTaskCTA onClick={handleNewOrder} variant="first-order" />
            </div>

            {/* 2. Live Activity Feed — Real-time social proof */}
            <LiveActivityFeed />

            {/* 3. Trust Stats — Proof in numbers */}
            <TrustStatsStrip />

            {/* 4. How It Works — Eliminate process anxiety */}
            <HowItWorks />

            {/* 5. Testimonials — Social proof with outcomes */}
            <TestimonialsSection />

            {/* 6. Guarantees — Loss-aversion framing */}
            <GuaranteesShowcase />

            {/* 7. Pricing Anchor — Price comparison that sells */}
            <PricingAnchor
              onNavigateToOrder={handleNewOrderWithType}
              haptic={haptic}
            />

            {/* 8. FAQ — Objection handler */}
            <FAQSection />
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             RETURNING USER FLOW — Three sub-states:
             A) Active orders  → tracker-first, action-oriented
             B) Just completed → celebration + quick reorder prominent
             C) Idle returning → win-back + quick reorder
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* ── BONUS ALERT — Shows in all returning states ── */}
            {user.bonus_expiry && (
              <BonusExpiryAlert
                bonusExpiry={user.bonus_expiry}
                bonusBalance={user.bonus_balance}
                onUseBonus={handleNewOrder}
              />
            )}

            {/* Daily Bonus — Engagement hook */}
            <DailyBonusCard
              dailyAvailable={user.daily_luck_available ?? false}
              streak={user.daily_bonus_streak || 0}
              haptic={haptic}
              onBonusClaimed={() => {}}
            />

            {/* ── STATE A: ACTIVE ORDERS — Tracker-first, minimal noise ── */}
            {returningUserState === 'active' && (
              <>
                <ActiveOrderDashboard
                  orders={user.orders}
                  onNavigate={navigate}
                  haptic={haptic}
                />
                <NewTaskCTA onClick={handleNewOrder} variant="repeat-order" />
              </>
            )}

            {/* ── STATE B: JUST COMPLETED — Celebrate + next order ── */}
            {returningUserState === 'just-completed' && (
              <>
                {user.orders.length > 0 && (
                  <QuickReorderCard
                    lastOrder={user.orders[0]}
                    onReorder={handleReorder}
                    haptic={haptic}
                  />
                )}
                <NewTaskCTA onClick={handleNewOrder} variant="repeat-order" />
              </>
            )}

            {/* ── STATE C: IDLE RETURNING — Win-back hook ── */}
            {returningUserState === 'idle' && (
              <>
                <NewTaskCTA onClick={handleNewOrder} variant="repeat-order" />
                {user.orders.length > 0 && (
                  <QuickReorderCard
                    lastOrder={user.orders[0]}
                    onReorder={handleReorder}
                    haptic={haptic}
                  />
                )}
              </>
            )}

            {/* ── SHARED: Quick tools, gamification, promo, referral ── */}
            <QuickActionsRow
              onNavigate={navigate}
              onOpenModal={(modal: ModalName) => {
                if (modal === 'cashback') actions.openModal('cashback')
                else if (modal === 'guarantees') actions.openModal('guarantees')
              }}
              onOpenUrgentSheet={() => {
                haptic('medium')
                actions.openModal('urgentSheet')
              }}
              haptic={haptic}
              cashbackPercent={user.rank.cashback}
            />

            <LevelProgressCard
              rank={user.rank}
              displayNextRank={user.rank.next_rank}
            />

            {/* Promo Code Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-4"
            >
              <PromoCodeSection
                variant="full"
                collapsible={true}
                defaultExpanded={!!activePromo}
              />
            </motion.div>

            {/* Referral Program */}
            <ReputationCard
              referralCode={user.referral_code}
              referralsCount={user.referrals_count}
              referralEarnings={user.referral_earnings}
              copied={referralCopied}
              onCopy={handleCopyReferral}
              onShowQR={() => { haptic('light'); actions.openModal('qr') }}
              onTelegramShare={handleTelegramShare}
            />

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

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS — Lazy loaded, always rendered for exit animations
          ═══════════════════════════════════════════════════════════════════ */}
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

      {/* Sticky Bottom CTA — New users only, appears after hero exits viewport */}
      {isNewUser && (
        <StickyBottomCTA
          onClick={handleNewOrder}
          heroRef={heroCTARef as React.RefObject<HTMLElement>}
        />
      )}

      {/* Welcome tour — only for new users, shown once */}
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
