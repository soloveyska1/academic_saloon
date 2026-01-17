import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  UserData,
  ProfileUser,
  Wallet,
  ProfileTransaction,
  ProfileSettings,
  Voucher,
  AgentStats,
  AgentEarning,
  MembershipLevel,
} from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useClub } from '../contexts/ClubContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import {
  ProfileHeader,
  SegmentedTabs,
  MembershipCard,
  BenefitsSummary,
  QuickActionsGrid,
  ConciergeCard,
  WalletHeader,
  TransactionList,
  TransactionDetailsSheet,
  ProfileVoucherList,
  AgentDashboard,
  ReferralTools,
  EarningsHistory,
  SettingsList,
  RulesSheet,
} from '../components/profile'
import { QRCodeModal } from '../components/ui/QRCode'

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW PROFILE PAGE - Premium tabbed interface
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  user: UserData | null
}

// Map UserData ranks to MembershipLevel
const RANK_TO_MEMBERSHIP: Record<string, MembershipLevel> = {
  'Салага': 'standard',
  'Ковбой': 'silver',
  'Головорез': 'gold',
  'Легенда Запада': 'premium',
  'default': 'standard',
}

// Transform UserData to ProfileUser
function transformToProfileUser(user: UserData): ProfileUser {
  const memberSince = user.orders.length > 0
    ? user.orders[user.orders.length - 1].created_at
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: user.id,
    telegramId: user.telegram_id,
    name: user.fullname,
    username: user.username,
    role: 'client', // Will be overridden if agent
    memberSince,
    membershipLevel: RANK_TO_MEMBERSHIP[user.rank.name] || 'standard',
    avatar: user.rank.emoji,
  }
}

// Transform UserData to Wallet
function transformToWallet(user: UserData): Wallet {
  // Расчёт суммы экономии за счёт кэшбэка
  const savedLast30Days = Math.round((user.total_spent * user.rank.cashback) / 100)

  return {
    balance: user.balance,
    bonusBalance: user.bonus_balance,
    cashbackPercent: user.rank.cashback,
    discountPercent: user.discount,
    savedLast30Days,
    breakdown: {
      bonuses: user.bonus_balance,
      cashback: Math.round(user.total_spent * 0.03), // Estimated
      referralEarnings: 0, // Would come from backend
    },
  }
}

// Transform transactions
function transformTransactions(user: UserData): ProfileTransaction[] {
  return user.transactions.map(t => ({
    id: t.id,
    type: t.type,
    category: t.reason.includes('реферал') ? 'referral'
      : t.reason.includes('кэшбэк') ? 'cashback'
      : t.reason.includes('бонус') || t.reason.includes('акци') ? 'bonus'
      : t.reason.includes('коррект') ? 'adjustment'
      : 'bonus',
    title: t.reason,
    subtitle: t.description || undefined,
    amount: t.amount,
    date: t.created_at,
  }))
}

// Default settings
const DEFAULT_SETTINGS: ProfileSettings = {
  notifications: {
    orderUpdates: true,
    promotions: true,
    reminders: true,
  },
  preferences: {},
  privacy: {
    showOnlineStatus: true,
  },
}

// Пустой массив для истории заработка (детальные данные недоступны через API)
const AGENT_EARNINGS: AgentEarning[] = []

export function ProfilePageNew({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, botUsername, user: tgUser } = useTelegram()
  const club = useClub()

  // Tab state - define tabs based on user role
  const isAgent = user ? user.referrals_count > 0 : false
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'overview', label: 'Обзор' },
      { id: 'wallet', label: 'Кошелёк' },
      { id: 'vouchers', label: 'Ваучеры' },
    ]
    if (isAgent) {
      baseTabs.push({ id: 'agent', label: 'Агент' })
    }
    baseTabs.push({ id: 'settings', label: 'Настройки' })
    return baseTabs
  }, [isAgent])

  const [activeTab, setActiveTab] = useState('overview')
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS)

  // Sheets and modals state
  const [selectedTransaction, setSelectedTransaction] = useState<ProfileTransaction | null>(null)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showQR, setShowQR] = useState(false)

  // Transform user data
  const profileUser = useMemo(() => user ? transformToProfileUser(user) : null, [user])
  const avatarUrl = tgUser?.photo_url
  const wallet = useMemo(() => user ? transformToWallet(user) : null, [user])
  const transactions = useMemo(() => user ? transformTransactions(user) : [], [user])

  // Handlers
  const handleTabChange = useCallback((tabId: string) => {
    haptic('light')
    setActiveTab(tabId)
  }, [haptic])

  const handleAdminAccess = useCallback(() => {
    hapticSuccess()
    navigate('/god')
  }, [hapticSuccess, navigate])

  const handleViewPrivileges = useCallback(() => {
    haptic('medium')
    navigate('/club/privileges')
  }, [haptic, navigate])

  const handleNewOrder = useCallback(() => {
    haptic('medium')
    navigate('/create-order')
  }, [haptic, navigate])

  const handleBonuses = useCallback(() => {
    haptic('medium')
    navigate('/club')
  }, [haptic, navigate])

  const handlePrivileges = useCallback(() => {
    haptic('medium')
    navigate('/club/privileges')
  }, [haptic, navigate])

  const handleSupport = useCallback(() => {
    haptic('medium')
    navigate('/support')
  }, [haptic, navigate])

  const handleMyOrders = useCallback(() => {
    haptic('medium')
    navigate('/')
  }, [haptic, navigate])

  const handleInviteFriend = useCallback(() => {
    haptic('medium')
    if (user && botUsername) {
      const inviteLink = `https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}`
      navigator.clipboard.writeText(inviteLink)
      hapticSuccess()
    }
  }, [haptic, hapticSuccess, user, botUsername])

  const handleContactConcierge = useCallback(() => {
    haptic('medium')
    navigate('/support')
  }, [haptic, navigate])

  const handleHowItWorks = useCallback(() => {
    haptic('light')
    setShowRules(true)
  }, [haptic])

  const handleTransactionClick = useCallback((transaction: ProfileTransaction) => {
    haptic('light')
    setSelectedTransaction(transaction)
    setShowTransactionDetails(true)
  }, [haptic])

  const handleViewOrder = useCallback((orderId: number) => {
    setShowTransactionDetails(false)
    navigate(`/order/${orderId}`)
  }, [navigate])

  const handleVoucherClick = useCallback((voucher: Voucher) => {
    haptic('light')
    // Would show voucher details sheet
  }, [haptic])

  const handleGoToClub = useCallback(() => {
    haptic('medium')
    navigate('/club/rewards')
  }, [haptic, navigate])

  const handleShareReferral = useCallback((platform: 'telegram' | 'copy' | 'qr') => {
    haptic('medium')
    if (!user || !botUsername) return

    const inviteLink = `https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}`

    if (platform === 'copy') {
      navigator.clipboard.writeText(inviteLink)
      hapticSuccess()
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Присоединяйся!')}`, '_blank')
    } else if (platform === 'qr') {
      setShowQR(true)
    }
  }, [haptic, hapticSuccess, user, botUsername])

  const handleToggleSetting = useCallback((section: keyof ProfileSettings, key: string, value: boolean) => {
    haptic('light')
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }, [haptic])

  const handleNavigateSetting = useCallback((target: 'rules' | 'faq' | 'support' | 'terms' | 'privacy') => {
    haptic('medium')
    if (target === 'rules') {
      setShowRules(true)
    } else if (target === 'support') {
      navigate('/support')
    } else if (target === 'faq') {
      navigate('/support')
    }
    // terms and privacy would open external links
  }, [haptic, navigate])

  if (!user || !profileUser || !wallet) {
    return null
  }

  // Check if user is admin
  const isAdmin = user.telegram_id === 872379852

  // Calculate membership progress
  const membershipProgress = Math.min(100, user.rank.progress)

  // Agent data (расчёт на основе referrals_count)
  const agentStats: AgentStats = {
    invitedCount: user.referrals_count,
    activeCount: Math.floor(user.referrals_count * 0.7), // ~70% активных
    ordersCount: Math.floor(user.referrals_count * 2), // ~2 заказа на реферала
    earnedAmount: user.referrals_count * 100, // 100₽ за реферала
    commissionRate: 5, // 5% комиссия
  }

  const referralLink = botUsername ? `https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}` : ''

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      {/* Premium background - full width */}
      <div className="page-background">
        <PremiumBackground />
      </div>

      {/* Content with padding */}
      <div className="page-content">
        {/* Header */}
        <ProfileHeader
          user={profileUser}
          isAdmin={isAdmin}
          onAdminAccess={handleAdminAccess}
          avatarUrl={avatarUrl}
        />

        {/* Tabs */}
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* Tab content */}
        <div style={{ paddingBottom: 120 }}>
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <MembershipCard
                  user={profileUser}
                  cashbackPercent={user.rank.cashback}
                  discountPercent={user.discount}
                  progress={membershipProgress}
                  onViewPrivileges={handleViewPrivileges}
                />

                <BenefitsSummary
                  balance={wallet.balance}
                  bonusBalance={wallet.bonusBalance}
                  cashbackPercent={wallet.cashbackPercent}
                  discountPercent={wallet.discountPercent}
                  savedLast30Days={wallet.savedLast30Days}
                  onHowItWorks={handleHowItWorks}
                />

                <QuickActionsGrid
                  onNewOrder={handleNewOrder}
                  onBonuses={handleBonuses}
                  onPrivileges={handlePrivileges}
                  onSupport={handleSupport}
                  onMyOrders={handleMyOrders}
                  onInviteFriend={handleInviteFriend}
                />

                <ConciergeCard
                  isPremium={profileUser.membershipLevel === 'gold' || profileUser.membershipLevel === 'premium' || profileUser.membershipLevel === 'max'}
                  managerName="Александр"
                  responseTime="< 1 часа"
                  onContact={handleContactConcierge}
                />
              </motion.div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <WalletHeader
                  balance={wallet.balance}
                  bonusBalance={wallet.bonusBalance}
                  breakdown={wallet.breakdown}
                />

                <TransactionList
                  transactions={transactions}
                  onTransactionClick={handleTransactionClick}
                />
              </motion.div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <motion.div
                key="vouchers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProfileVoucherList
                  vouchers={club.vouchers}
                  onVoucherClick={handleVoucherClick}
                  onGoToClub={handleGoToClub}
                />
              </motion.div>
            )}

            {/* Agent Tab */}
            {activeTab === 'agent' && isAgent && (
              <motion.div
                key="agent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <AgentDashboard
                  stats={agentStats}
                  agentSince={profileUser.memberSince}
                />

                <ReferralTools
                  referralCode={user.referral_code}
                  referralLink={referralLink}
                  onShare={handleShareReferral}
                />

                <EarningsHistory
                  earnings={AGENT_EARNINGS}
                  onViewOrder={handleViewOrder}
                />
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SettingsList
                  settings={settings}
                  onToggle={handleToggleSetting}
                  onNavigate={handleNavigateSetting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Transaction Details Sheet */}
      <TransactionDetailsSheet
        transaction={selectedTransaction}
        isOpen={showTransactionDetails}
        onClose={() => setShowTransactionDetails(false)}
        onViewOrder={handleViewOrder}
      />

      {/* Rules Sheet */}
      <RulesSheet
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <QRCodeModal
            onClose={() => setShowQR(false)}
            value={referralLink}
            title="Ваша реферальная ссылка"
            subtitle="Дайте отсканировать этот код другу"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfilePageNew
