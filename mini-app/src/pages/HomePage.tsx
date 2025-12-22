import { useEffect, useCallback, useRef, useMemo, lazy, Suspense, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, Crown, Sparkles, Flame, Gem, Target, Medal, Zap
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchDailyBonusInfo, claimDailyBonus } from '../api/userApi'
import { useHomePageState } from '../hooks/useHomePageState'
import { PromoCodeSection } from '../components/ui/PromoCodeSection'
import { usePromo } from '../contexts/PromoContext'
import { Confetti } from '../components/ui/Confetti'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { FloatingGoldParticles } from '../components/ui/AdaptiveParticles'

// New Home Components
import {
  HomeHeader,
  QuickActionsRow,
  NextActionCard,
  NewTaskCTA,
  LastOrderCard,
  BenefitsCard,
  UrgentHubSheet,
  OrderStatsCard,
  SaloonFooter,
  DailyBonusButton,
  CompactAchievements,
  ReputationCard,
  LevelProgressCard,
  EmptyStateOnboarding,
  DailyBonusError,
  ModalLoadingFallback,
} from '../components/home'

// Lazy load heavy modal components (reduces initial bundle by ~45KB)
const QRCodeModal = lazy(() => import('../components/ui/QRCode').then(m => ({ default: m.QRCodeModal })))
const DailyBonusModal = lazy(() => import('../components/ui/DailyBonus').then(m => ({ default: m.DailyBonusModal })))
const CashbackModal = lazy(() => import('../components/ui/HomeModals').then(m => ({ default: m.CashbackModal })))
const GuaranteesModal = lazy(() => import('../components/ui/HomeModals').then(m => ({ default: m.GuaranteesModal })))
const TransactionsModal = lazy(() => import('../components/ui/HomeModals').then(m => ({ default: m.TransactionsModal })))
const RanksModal = lazy(() => import('../components/ui/HomeModals').then(m => ({ default: m.RanksModal })))
const WelcomePromoModal = lazy(() => import('../components/ui/WelcomePromoModal').then(m => ({ default: m.WelcomePromoModal })))

interface Props {
  user: UserData | null
}


// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, tg } = useTelegram()
  const admin = useAdmin()
  const { activePromo } = usePromo()
  const capability = useCapability()

  // State management via reducer
  const { state, actions } = useHomePageState()

  // Fetch daily bonus info
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3

    const loadDailyBonus = async () => {
      actions.setDailyBonusLoading(true)
      try {
        const info = await fetchDailyBonusInfo()
        actions.setDailyBonusInfo(info)
        actions.setDailyBonusError(false)
      } catch {
        retryCount++
        if (retryCount < maxRetries) {
          setTimeout(loadDailyBonus, 1000 * retryCount)
        } else {
          actions.setDailyBonusError(true)
        }
      } finally {
        actions.setDailyBonusLoading(false)
      }
    }

    loadDailyBonus()
  }, [actions])

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

  // Daily bonus data
  const canClaimBonus = state.dailyBonus.info?.can_claim ?? false
  const dailyStreak = state.dailyBonus.info?.streak ?? 1

  // Welcome promo modal for new users
  const WELCOME_MODAL_SHOWN_KEY = 'academic_saloon_welcome_shown'
  useEffect(() => {
    if (!user) return

    const isNewUser = user.orders_count === 0
    const isSimulatingNewUser = admin.simulateNewUser
    const shouldShow = isNewUser || isSimulatingNewUser
    const alreadyShown = localStorage.getItem(WELCOME_MODAL_SHOWN_KEY) === 'true'

    if (alreadyShown && !isSimulatingNewUser) return

    if (shouldShow) {
      const timer = setTimeout(() => {
        actions.openModal('welcome')
        if (!isSimulatingNewUser) {
          localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, 'true')
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [user, admin.simulateNewUser, actions])

  // Memoized calculations
  const activeOrders = useMemo(
    () => user?.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length ?? 0,
    [user?.orders]
  )

  const completedOrders = useMemo(
    () => user?.orders.filter(o => o.status === 'completed').length ?? 0,
    [user?.orders]
  )

  // Achievement badges
  const achievements = useMemo(() => user ? [
    { icon: Star, label: 'Первый шаг', unlocked: user.orders_count >= 1, description: 'Первый заказ' },
    { icon: Medal, label: 'Постоянный', unlocked: user.orders_count >= 5, description: '5 заказов' },
    { icon: Crown, label: 'VIP статус', unlocked: user.rank.level >= 3, description: 'VIP уровень' },
    { icon: Zap, label: 'Молниеносный', unlocked: user.orders_count >= 1, description: 'Быстрый заказ' },
    { icon: Gem, label: 'Щедрая душа', unlocked: user.total_spent >= 10000, description: '10 000₽ потрачено' },
    { icon: Target, label: 'Рефералы', unlocked: user.referrals_count >= 3, description: '3+ приглашённых' },
    { icon: Flame, label: 'Джекпот', unlocked: false, description: 'Выигрыш в рулетке', glow: true },
    { icon: Sparkles, label: 'Легенда', unlocked: user.rank.level >= 4, description: 'Макс. уровень', glow: true },
  ] : [], [user])

  // Display rank name mapping
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Головорез': 'VIP-Клиент',
    'Легенда Запада': 'Премиум',
  }

  if (!user) return null

  const displayNextRank = user.rank.next_rank ? (rankNameMap[user.rank.next_rank] || user.rank.next_rank) : null
  const userPhoto = tg?.initDataUnsafe?.user?.photo_url

  const handleNewOrder = useCallback(() => {
    haptic('heavy')
    navigate('/create-order')
  }, [haptic, navigate])

  const copyReferralCode = useCallback(() => {
    navigator.clipboard.writeText(user.referral_code)
    actions.setCopied(true)
    hapticSuccess()
    setTimeout(() => actions.setCopied(false), 2000)
  }, [user.referral_code, actions, hapticSuccess])

  const retryDailyBonus = useCallback(() => {
    actions.setDailyBonusError(false)
    actions.setDailyBonusLoading(true)
    fetchDailyBonusInfo()
      .then(info => {
        actions.setDailyBonusInfo(info)
        actions.setDailyBonusError(false)
      })
      .catch(() => actions.setDailyBonusError(true))
      .finally(() => actions.setDailyBonusLoading(false))
  }, [actions])

  return (
    <main
      role="main"
      className="spacing-mobile center-large no-overflow-x"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        position: 'relative',
      }}>
      {/* Premium Background */}
      <div aria-hidden="true">
        <PremiumBackground
        variant="gold"
        intensity="subtle"
        interactive={capability.tier >= 3}
      />
      </div>
      <div aria-hidden="true">
        <FloatingGoldParticles count={capability.getParticleCount(8)} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — New compact component
          ═══════════════════════════════════════════════════════════════════ */}
      <HomeHeader
        user={{
          fullname: user.fullname,
          rank: { is_max: user.rank.is_max },
          daily_bonus_streak: user.daily_bonus_streak,
        }}
        userPhoto={userPhoto}
        onSecretTap={handleSecretTap}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK ACTIONS — Replaces TipsCarousel + Panic Button
          Single "Срочно" entry that opens UrgentHubSheet
          ═══════════════════════════════════════════════════════════════════ */}
      <QuickActionsRow
        onNavigate={navigate}
        onOpenModal={(modal) => {
          if (modal === 'cashback') actions.openModal('cashback')
          else if (modal === 'guarantees') actions.openModal('guarantees')
        }}
        onOpenUrgentSheet={() => {
          haptic('medium')
          actions.openModal('urgentSheet')
        }}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          NEXT ACTION CARD — Dynamic priority-based actions
          Shows payment needed, files needed, revision, etc.
          ═══════════════════════════════════════════════════════════════════ */}
      <NextActionCard
        orders={user.orders}
        onNavigate={navigate}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          BENEFITS CARD — Combined Balance + Level (Bento Grid)
          ═══════════════════════════════════════════════════════════════════ */}
      <BenefitsCard
        balance={user.balance}
        rank={user.rank}
        onBalanceClick={() => actions.openModal('transactions')}
        onRankClick={() => actions.openModal('ranks')}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          NEW TASK CTA — Primary action button
          ═══════════════════════════════════════════════════════════════════ */}
      <NewTaskCTA onClick={handleNewOrder} />

      {/* ═══════════════════════════════════════════════════════════════════
          LAST ORDER CARD — Quick access to recent order
          OR EMPTY STATE — For new users with 0 orders
          ═══════════════════════════════════════════════════════════════════ */}
      {user.orders.length > 0 ? (
        <LastOrderCard
          order={user.orders[0]}
          onClick={() => navigate(`/order/${user.orders[0].id}`)}
        />
      ) : (
        <EmptyStateOnboarding onCreateOrder={handleNewOrder} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{ marginBottom: 16 }}
      >
        <PromoCodeSection
          variant="full"
          collapsible={true}
          defaultExpanded={!!activePromo}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACHIEVEMENTS — Compact Single Line
          ═══════════════════════════════════════════════════════════════════ */}
      <CompactAchievements
        achievements={achievements}
        onViewAll={() => navigate('/achievements')}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION (Referral) — Premium Gold Card
          ═══════════════════════════════════════════════════════════════════ */}
      <ReputationCard
        referralCode={user.referral_code}
        referralsCount={user.referrals_count}
        copied={state.copied}
        onCopy={copyReferralCode}
        onShowQR={() => {
          actions.openModal('qr')
          haptic('light')
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL
          ═══════════════════════════════════════════════════════════════════ */}
      <LevelProgressCard rank={user.rank} displayNextRank={displayNextRank} />

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS — My Orders Dashboard
          ═══════════════════════════════════════════════════════════════════ */}
      <OrderStatsCard
        activeOrders={activeOrders}
        completedOrders={completedOrders}
        onClick={() => navigate('/orders')}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          ELEGANT FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <SaloonFooter />

      {/* ═══════════════════════════════════════════════════════════════════
          DAILY BONUS FLOATING BUTTON OR ERROR
          ═══════════════════════════════════════════════════════════════════ */}
      <DailyBonusButton
        visible={canClaimBonus && !state.dailyBonus.error && !state.dailyBonus.loading}
        onClick={() => { actions.openModal('dailyBonus'); haptic('medium') }}
      />

      {/* Show error UI when daily bonus fails to load */}
      {state.dailyBonus.error && !state.dailyBonus.loading && (
        <DailyBonusError onRetry={retryDailyBonus} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          URGENT HUB SHEET — Bottom sheet with 2 urgent options
          Fixes the duplicate "Urgent" issue
          ═══════════════════════════════════════════════════════════════════ */}
      <UrgentHubSheet
        isOpen={state.modals.urgentSheet}
        onClose={() => actions.closeModal('urgentSheet')}
        onNavigate={navigate}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS — Lazy loaded
          ═══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<ModalLoadingFallback />}>
        <AnimatePresence>
          {state.modals.qr && (
            <QRCodeModal value={user.referral_code} onClose={() => actions.closeModal('qr')} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.modals.dailyBonus && state.dailyBonus.info && (
            <DailyBonusModal
              streak={dailyStreak}
              canClaim={canClaimBonus}
              bonuses={state.dailyBonus.info.bonuses}
              cooldownRemaining={state.dailyBonus.info.cooldown_remaining}
              onClaim={async () => {
                const result = await claimDailyBonus()
                if (result.won) {
                  actions.setConfetti(true)
                }
                actions.updateDailyBonusAfterClaim('24ч')
                return result
              }}
              onClose={() => actions.closeModal('dailyBonus')}
            />
          )}
        </AnimatePresence>

        <Confetti
          active={state.showConfetti}
          onComplete={() => actions.setConfetti(false)}
          intensity={capability.tier === 3 ? 'medium' : 'low'}
        />

        {state.modals.cashback && (
          <CashbackModal
            isOpen={state.modals.cashback}
            onClose={() => actions.closeModal('cashback')}
            user={user}
          />
        )}
        {state.modals.guarantees && (
          <GuaranteesModal
            isOpen={state.modals.guarantees}
            onClose={() => actions.closeModal('guarantees')}
          />
        )}
        {state.modals.transactions && (
          <TransactionsModal
            isOpen={state.modals.transactions}
            onClose={() => actions.closeModal('transactions')}
            transactions={user.transactions}
            balance={user.balance}
            onViewAll={() => navigate('/profile')}
          />
        )}
        {state.modals.ranks && (
          <RanksModal
            isOpen={state.modals.ranks}
            onClose={() => actions.closeModal('ranks')}
            user={user}
          />
        )}
        {state.modals.welcome && (
          <WelcomePromoModal
            isOpen={state.modals.welcome}
            onClose={() => actions.closeModal('welcome')}
            promoCode="WELCOME10"
            discount={10}
            onApplyPromo={() => navigate('/create-order')}
          />
        )}
      </Suspense>
    </main>
  )
}
