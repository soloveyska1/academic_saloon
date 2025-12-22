import { useEffect, useCallback, useRef, useMemo, lazy, Suspense, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, ChevronRight, TrendingUp, Gift, QrCode,
  Star, Crown, Briefcase, Sparkles, Flame, Gem, Target, Medal, Zap
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
//  GLASS CARD STYLES
// ═══════════════════════════════════════════════════════════════════════════

// Note: borderRadius and padding are now responsive via CSS classes
const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--bg-card)',
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  border: '1px solid var(--card-border)',
  boxShadow: 'var(--card-shadow)',
}

const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  border: '1px solid var(--border-gold)',
  boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

// Inner shine effect component for cards - memoized
const CardInnerShine = memo(function CardInnerShine() {
  return (
    <div
      aria-hidden="true"
      style={{
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
      pointerEvents: 'none',
      borderRadius: 'inherit',
    }} />
  )
})

// Modal loading fallback
const ModalLoadingFallback = memo(function ModalLoadingFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div
                aria-hidden="true"
                style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '2px solid transparent',
        borderTopColor: 'rgba(212,175,55,0.8)',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  COMPACT ACHIEVEMENTS ROW
// ═══════════════════════════════════════════════════════════════════════════

function CompactAchievements({ achievements, onViewAll }: {
  achievements: { icon: typeof Star; label: string; unlocked: boolean; glow?: boolean; description?: string }[]
  onViewAll: () => void
}) {
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const lastUnlocked = [...achievements].reverse().find(a => a.unlocked)
  const nextToUnlock = achievements.find(a => !a.unlocked)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onViewAll}
      role="button"
      tabIndex={0}
      aria-label={`Достижения: разблокировано ${unlockedCount} из ${achievements.length}. Нажмите для просмотра всех достижений`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewAll() }}}
      style={{
        ...glassStyle,
        marginBottom: 16,
        cursor: 'pointer',
        padding: '16px 18px',
      }}
    >
      <CardInnerShine />
      <div
                aria-hidden="true"
                style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Achievement icons stack */}
          <div
                aria-hidden="true"
                style={{ position: 'relative', width: 52, height: 44 }}>
            {/* Last unlocked (main) */}
            <motion.div
              animate={lastUnlocked?.glow ? {
                boxShadow: [
                  '0 0 12px rgba(212,175,55,0.3)',
                  '0 0 20px rgba(212,175,55,0.5)',
                  '0 0 12px rgba(212,175,55,0.3)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: lastUnlocked
                  ? 'linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.15) 100%)'
                  : 'rgba(40,40,40,0.5)',
                border: lastUnlocked
                  ? '1.5px solid rgba(212,175,55,0.6)'
                  : '1px solid rgba(80,80,80,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {lastUnlocked ? (
                <lastUnlocked.icon size={22} color="#D4AF37" strokeWidth={2} fill="rgba(212,175,55,0.2)"  aria-hidden="true"/>
              ) : (
                <Star size={22} color="rgba(100,100,100,0.5)" strokeWidth={1.5} />
              )}
            </motion.div>
            {/* Next to unlock (preview) */}
            {nextToUnlock && (
              <motion.div
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: 'rgba(40,40,40,0.8)',
                  border: '1px dashed rgba(212,175,55,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                }}
              >
                <nextToUnlock.icon size={12} color="rgba(212,175,55,0.5)" strokeWidth={1.5}  aria-hidden="true"/>
              </motion.div>
            )}
          </div>
          <div>
            <div
                aria-hidden="true"
                style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}>ДОСТИЖЕНИЯ</div>
            <div
                aria-hidden="true"
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
              {lastUnlocked ? lastUnlocked.label : 'Начните путь'}
            </div>
            {nextToUnlock && (
              <div
                aria-hidden="true"
                style={{ fontSize: 10, color: 'rgba(212,175,55,0.6)', marginTop: 2 }}>
                Далее: {nextToUnlock.label}
              </div>
            )}
          </div>
        </div>
        <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress dots */}
          <div
                aria-hidden="true"
                style={{ display: 'flex', gap: 4 }}>
            {achievements.map((a, i) => (
              <motion.div
                key={i}
                animate={!a.unlocked && i === unlockedCount ? {
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.8, 0.4],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: a.unlocked ? 'var(--gold-metallic)' : 'rgba(80,80,80,0.4)',
                  boxShadow: a.unlocked ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
                  border: !a.unlocked && i === unlockedCount ? '1px solid rgba(212,175,55,0.4)' : 'none',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
            {unlockedCount}/{achievements.length}
          </span>
          <ChevronRight size={18} color="var(--text-muted)" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  )
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

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    actions.setCopied(true)
    hapticSuccess()
    setTimeout(() => actions.setCopied(false), 2000)
  }

  return (
    <main
      role="main"
      className="spacing-mobile center-large"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        position: 'relative',
        overflow: 'hidden',
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
          ═══════════════════════════════════════════════════════════════════ */}
      {user.orders.length > 0 && (
        <LastOrderCard
          order={user.orders[0]}
          onClick={() => navigate(`/order/${user.orders[0].id}`)}
        />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        whileHover={{ scale: 1.005 }}
        className="card-padding card-radius"
        style={{ ...glassGoldStyle, marginBottom: 16, transition: 'transform 0.2s ease-out' }}
      >
        <div
                aria-hidden="true"
                style={{ position: 'relative', zIndex: 1 }}>
          <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Star size={14} color="var(--gold-400)" fill="var(--gold-400)" strokeWidth={1.5} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.1em',
            }}>РЕПУТАЦИЯ</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Пригласите партнёра и получайте{' '}
            <span style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}>5% роялти</span>{' '}
            с каждого заказа.
          </p>
          <div
                aria-hidden="true"
                style={{ display: 'flex', gap: 10 }}>
            <motion.button
              onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
              whileTap={{ scale: 0.97 }}
              aria-label={state.copied ? "Реферальный код скопирован" : `Скопировать реферальный код ${user.referral_code}`}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {user.referral_code}
              </code>
              {state.copied ? (
                <Check size={18} color="var(--success-text)" strokeWidth={2} />
              ) : (
                <Copy size={18} color="var(--text-muted)" strokeWidth={1.5} />
              )}
            </motion.button>
            <motion.button
              onClick={(e) => { e.stopPropagation(); actions.openModal('qr'); haptic('light') }}
              whileTap={{ scale: 0.95 }}
              aria-label="Показать QR-код реферальной ссылки"
              style={{
                width: 52,
                height: 52,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px -5px rgba(212,175,55,0.2)',
              }}
            >
              <QrCode size={22} color="var(--gold-400)" strokeWidth={1.5} />
            </motion.button>
          </div>
          {user.referrals_count > 0 && (
            <div
                aria-hidden="true"
                style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--success-glass)',
              border: '1px solid var(--success-border)',
              borderRadius: 100,
            }}>
              <span style={{ fontSize: 10, color: 'var(--success-text)', fontWeight: 600 }}>
                Приглашено: {user.referrals_count}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL
          ═══════════════════════════════════════════════════════════════════ */}
      {displayNextRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card-padding card-radius"
          style={{ ...glassStyle, marginBottom: 16 }}
        >
          <div
                aria-hidden="true"
                style={{ position: 'relative', zIndex: 1 }}>
            <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div
                aria-hidden="true"
                style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px -5px rgba(212,175,55,0.2)',
              }}>
                <TrendingUp size={22} color="var(--gold-400)" strokeWidth={1.5} />
              </div>
              <div
                aria-hidden="true"
                style={{ flex: 1 }}>
                <div
                aria-hidden="true"
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Следующий уровень</div>
                <div
                aria-hidden="true"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-serif)',
                  background: 'var(--gold-text-shine)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginTop: 2,
                }}>{displayNextRank}</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 16,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{user.rank.progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={user.rank.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Прогресс до следующего уровня ${displayNextRank}: ${user.rank.progress}%`}
              style={{
              height: 10,
              background: 'var(--bg-glass)',
              borderRadius: 100,
              overflow: 'hidden',
              marginBottom: 12,
              border: '1px solid var(--border-subtle)',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-shimmer"
                aria-hidden="true"
                style={{
                  height: '100%',
                  borderRadius: 100,
                  boxShadow: '0 0 15px rgba(212,175,55,0.5)',
                }}
              />
            </div>
            <div
                aria-hidden="true"
                style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Осталось{' '}
              <span style={{
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS — My Orders Dashboard
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptic('light'); navigate('/orders') }}
        className="card-padding card-radius"
        style={{
          ...glassStyle,
          cursor: 'pointer',
          border: '1px solid rgba(212,175,55,0.2)',
          background: 'linear-gradient(145deg, rgba(25,25,28,0.95) 0%, rgba(18,18,20,0.98) 100%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 40px rgba(212,175,55,0.05)',
        }}
      >
        <CardInnerShine />
        <div
                aria-hidden="true"
                style={{ position: 'relative', zIndex: 1 }}>
          <div
                aria-hidden="true"
                style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Briefcase size={20} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
              </div>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(212,175,55,0.7)',
                  letterSpacing: '0.1em',
                }}>МОИ ЗАКАЗЫ</div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 3,
                  fontStyle: 'italic',
                }}>Статус выполнения</div>
              </div>
            </div>
            <ChevronRight size={18} color="rgba(212,175,55,0.4)" strokeWidth={1.5} />
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Active */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: activeOrders > 0
                ? 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                : 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              border: `1px solid ${activeOrders > 0 ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 38,
                fontWeight: 800,
                fontFamily: 'var(--font-serif)',
                background: activeOrders > 0
                  ? 'linear-gradient(180deg, #f5d485, #D4AF37)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 6,
              }}>
                {activeOrders}
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: activeOrders > 0 ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {activeOrders > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    aria-hidden="true", opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#D4AF37',
                      boxShadow: '0 0 8px rgba(212,175,55,0.6)',
                    }}
                  />
                )}
                Активных
              </div>
            </div>

            {/* Completed */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: 'linear-gradient(145deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
              border: '1px solid rgba(34,197,94,0.2)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 38,
                fontWeight: 800,
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(180deg, rgba(74,222,128,0.9), rgba(34,197,94,0.8))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 6,
              }}>
                {completedOrders}
              </div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(34,197,94,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                <Check size={12} strokeWidth={2.5} />
                Выполнено
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ELEGANT FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ textAlign: 'center', padding: '20px 0 12px' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3))',
          }} />
          <span style={{
            fontSize: 10,
            fontFamily: "var(--font-serif, 'Playfair Display', serif)",
            color: 'rgba(212,175,55,0.5)',
            letterSpacing: '0.15em',
            fontWeight: 500,
          }}>
            САЛУН
          </span>
          <span style={{ fontSize: 8, color: 'rgba(212,175,55,0.4)' }}>&#x2726;</span>
          <span style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em',
          }}>
            EST. 2024
          </span>
          <div style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)',
          }} />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          DAILY BONUS FLOATING BUTTON
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {canClaimBonus && !state.dailyBonus.error && !state.dailyBonus.loading && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 1, type: 'spring' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { actions.openModal('dailyBonus'); haptic('medium') }}
            aria-label="Получить ежедневный бонус"
            style={{
              position: 'fixed',
              bottom: 110,
              right: 20,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--gold-metallic)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(212,175,55,0.6), 0 10px 30px -10px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}
          >
            <Gift size={26} color="#09090b" strokeWidth={2} />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              aria-hidden="true" }}
              transition={{ duration: 1.5, repeat: Infinity }}
              title="Ежедневный бонус доступен!"
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(239,68,68,0.5)',
                border: '2px solid var(--bg-main)',
              }}
            >
              <Flame size={12} color="#fff" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

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
