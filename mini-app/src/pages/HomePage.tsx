import { useCallback, useRef, useMemo, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useHomePageState, ModalName } from '../hooks/useHomePageState'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { usePromo } from '../contexts/PromoContext'
import { Confetti } from '../components/ui/Confetti'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { FloatingGoldParticles } from '../components/ui/AdaptiveParticles'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'

// Home Components
import {
  HomeHeader,
  QuickActionsRow,
  NextActionCard,
  NewTaskCTA,
  LastOrderCard,
  QuickReorderCard,
  UrgentHubSheet,
  TrustStatsStrip,
  LiveActivityFeed,
  HowItWorks,
  GuaranteesShowcase,
  TestimonialsSection,
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
} from '../components/home'

// Lazy load modal components
const QRCodeModal = lazy(() => import('../components/ui/QRCode').then(m => ({ default: m.QRCodeModal })))
const CashbackModal = lazy(() => import('../components/modals/CashbackModal').then(m => ({ default: m.CashbackModal })))
const RanksModal = lazy(() => import('../components/modals/RanksModal').then(m => ({ default: m.RanksModal })))
const GuaranteesModal = lazy(() => import('../components/modals/GuaranteesModal').then(m => ({ default: m.GuaranteesModal })))
const TransactionsModal = lazy(() => import('../components/modals/TransactionsModal').then(m => ({ default: m.TransactionsModal })))

interface Props {
  user: UserData | null
}

import s from './HomePage.module.css'

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, tg, botUsername } = useTelegram()
  const admin = useAdmin()
  const { activePromo } = usePromo()
  const capability = useCapability()

  // State management via reducer
  const { state, actions } = useHomePageState()

  // Welcome tour for first-time users
  const [showTour, setShowTour] = useState(() => !hasSeenWelcomeTour())

  // Referral copy state
  const [referralCopied, setReferralCopied] = useState(false)

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

  return (
    <>
    <main
      role="main"
      className={`${s.container} bg-void relative`}
      style={{ paddingBottom: isNewUser ? 160 : 100 }}>
      {/* Premium Background */}
      <div className="page-background fixed inset-0 z-0" aria-hidden="true">
        <PremiumBackground
          variant="gold"
          intensity="medium"
          interactive={capability.tier >= 3}
        />
        <FloatingGoldParticles count={capability.getParticleCount(12)} />
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
          NEW USER FLOW — Conversion-optimized funnel:
          Season → Hero → Stats → Live Activity → How It Works →
          Testimonials → Guarantees → Sticky CTA
          ═══════════════════════════════════════════════════════════════════ */}
        {isNewUser ? (
          <>
            {/* 1. Hero CTA — The promise */}
            <NewTaskCTA onClick={handleNewOrder} variant="first-order" />

            {/* 2. Trust Stats — The proof in numbers */}
            <TrustStatsStrip />

            {/* 3. Live Activity — FOMO first, while attention is high */}
            <LiveActivityFeed />

            {/* 4. How It Works — Eliminate process anxiety */}
            <HowItWorks />

            {/* 5. Testimonials — Social proof from real students */}
            <TestimonialsSection />

            {/* 6. Guarantees — Eliminate risk fears */}
            <GuaranteesShowcase
              onOpenGuaranteesModal={() => { haptic('light'); actions.openModal('guarantees') }}
            />
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             RETURNING USER FLOW — Guru-level personalized experience:
             Bonus urgency → Active order tracker → New order CTA →
             Actions priority → Quick tools → Level progress →
             Referral program → Promo
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* 1. Bonus Expiry Alert — Loss aversion trigger */}
            {user.bonus_expiry && (
              <BonusExpiryAlert
                bonusExpiry={user.bonus_expiry}
                bonusBalance={user.bonus_balance}
                onUseBonus={handleNewOrder}
              />
            )}

            {/* 2. Active Order Dashboard — Uber-style tracking */}
            <ActiveOrderDashboard
              orders={user.orders}
              onNavigate={navigate}
              haptic={haptic}
            />

            {/* 3. New Order CTA — Always accessible */}
            <NewTaskCTA onClick={handleNewOrder} variant="repeat-order" />

            {/* 4. Priority action card — What needs attention NOW */}
            <NextActionCard
              orders={user.orders}
              onNavigate={navigate}
              haptic={haptic}
            />

            {/* 5. Quick reorder — Friction-free repeat purchase */}
            {user.orders.length > 0 && (
              <QuickReorderCard
                lastOrder={user.orders[0]}
                onReorder={handleReorder}
                haptic={haptic}
              />
            )}

            {/* 6. Quick Actions — Tools row */}
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
            />

            {/* 7. Level Progress — Gamification: progress to next rank */}
            {!user.rank.is_max && (
              <LevelProgressCard
                rank={user.rank}
                displayNextRank={user.rank.next_rank}
              />
            )}

            {/* 8. Promo Code Section */}
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

            {/* 9. Referral Program — Full-featured partner card */}
            <ReputationCard
              referralCode={user.referral_code}
              referralsCount={user.referrals_count}
              referralEarnings={user.referral_earnings}
              copied={referralCopied}
              onCopy={handleCopyReferral}
              onShowQR={() => { haptic('light'); actions.openModal('qr') }}
              onTelegramShare={handleTelegramShare}
            />

            {/* 10. Last order card — Quick access */}
            {user.orders.length > 0 && (
              <LastOrderCard
                order={user.orders[0]}
                onClick={() => navigate(`/order/${user.orders[0].id}`)}
              />
            )}
          </>
        )}

        <SaloonFooter />
      </div>

      {/* Sticky bottom CTA for new users */}
      {isNewUser && <StickyBottomCTA onClick={handleNewOrder} />}

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
        />
        <GuaranteesModal
          isOpen={state.modals.guarantees}
          onClose={() => actions.closeModal('guarantees')}
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
        />
      </Suspense>

    </main>

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
