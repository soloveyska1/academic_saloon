import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useAdmin } from '../contexts/AdminContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { SkeletonProfileHeader, SkeletonStatsGrid, SkeletonCard } from '../components/ui/Skeleton'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { QRCodeModal } from '../components/ui/QRCode'
import { TransactionsModal } from '../components/modals/TransactionsModal'
import { OfferModal } from '../components/modals/OfferModal'
import { useToast } from '../components/ui/Toast'
import { copyTextSafely } from '../utils/clipboard'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'
import {
  fetchConfig,
  DEFAULT_EXECUTOR_INFO_URL,
  DEFAULT_PRIVACY_POLICY_URL,
} from '../api/userApi'

import { ProfileHero } from '../components/profile/ProfileHero'
import { StatusCard } from '../components/profile/StatusCard'
import { ProfileQuickActions } from '../components/profile/ProfileQuickActions'
import { ActionableOrderBanner } from '../components/profile/ActionableOrderBanner'
import { BonusWallet } from '../components/profile/BonusWallet'
import { ReferralCard } from '../components/profile/ReferralCard'
import { ProfileFooter } from '../components/profile/ProfileFooter'
import { getActionableOrder, getPrimaryOrderPath, toSafeNumber } from '../components/profile/profileHelpers'

interface Props {
  user: UserData | null
}

export function ProfilePageNew({ user }: Props) {
  const navigate = useNavigate()
  const { tg, haptic, hapticSuccess, hapticError, botUsername, user: tgUser } = useTelegram()
  const { isAdmin } = useAdmin()
  const { showToast } = useToast()
  const [showQR, setShowQR] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showOffer, setShowOffer] = useState(false)
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(DEFAULT_PRIVACY_POLICY_URL)
  const [executorInfoUrl, setExecutorInfoUrl] = useState(DEFAULT_EXECUTOR_INFO_URL)

  /* ═══════ Computed ═══════ */

  const actionableOrder = useMemo(
    () => (user ? getActionableOrder(user.orders) : null),
    [user],
  )

  const inviteLink = user ? buildReferralLink(botUsername, user.telegram_id) : ''
  const bonusBalance = toSafeNumber(user?.balance)

  useEffect(() => {
    let alive = true
    fetchConfig()
      .then((config) => {
        if (!alive) return
        if (config.privacy_policy_url) setPrivacyPolicyUrl(config.privacy_policy_url)
        if (config.executor_info_url) setExecutorInfoUrl(config.executor_info_url)
      })
      .catch(() => {
        // Keep canonical defaults
      })
    return () => { alive = false }
  }, [])

  /* ═══════ Handlers ═══════ */

  const handleCreateOrder = useCallback(() => {
    haptic('medium')
    navigate('/create-order')
  }, [haptic, navigate])

  const handleOpenOrders = useCallback(() => {
    haptic('light')
    navigate('/orders')
  }, [haptic, navigate])

  const handleOpenSupport = useCallback(() => {
    haptic('medium')
    navigate('/support?view=chat')
  }, [haptic, navigate])

  const handleOpenTransactions = useCallback(() => {
    haptic('light')
    setShowTransactions(true)
  }, [haptic])

  const handleOpenClub = useCallback(() => {
    haptic('medium')
    navigate('/club')
  }, [haptic, navigate])

  const handleOpenOffer = useCallback(() => {
    haptic('light')
    setShowOffer(true)
  }, [haptic])

  const openExternalUrl = useCallback((url: string) => {
    try {
      const webApp = tg as (typeof tg & { openLink?: (href: string) => void }) | undefined
      if (webApp?.openLink) {
        webApp.openLink(url)
        return
      }
    } catch {
      // Fallback below
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [tg])

  const handleOpenPrivacyPolicy = useCallback(() => {
    haptic('light')
    openExternalUrl(privacyPolicyUrl)
  }, [haptic, openExternalUrl, privacyPolicyUrl])

  const handleOpenExecutorInfo = useCallback(() => {
    haptic('light')
    openExternalUrl(executorInfoUrl)
  }, [executorInfoUrl, haptic, openExternalUrl])

  const handleOpenActionableOrder = useCallback(() => {
    if (!actionableOrder) {
      handleCreateOrder()
      return
    }
    haptic('medium')
    navigate(getPrimaryOrderPath(actionableOrder))
  }, [actionableOrder, handleCreateOrder, haptic, navigate])

  const handleCopyReferral = useCallback(async () => {
    if (!inviteLink) return
    const copied = await copyTextSafely(inviteLink)
    if (copied) {
      hapticSuccess()
      showToast({
        type: 'success',
        title: 'Ссылка скопирована',
        message: 'Можно отправить её другу прямо сейчас',
      })
    } else {
      hapticError()
      showToast({
        type: 'error',
        title: 'Не удалось скопировать ссылку',
        message: 'Попробуйте еще раз',
      })
    }
  }, [hapticError, hapticSuccess, inviteLink, showToast])

  const handleShareReferral = useCallback(() => {
    if (!inviteLink || !user) return
    haptic('medium')
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(buildReferralShareText(user.referral_code))}`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }, [haptic, inviteLink, tg, user])

  const handleOpenQR = useCallback(() => {
    if (!inviteLink) return
    haptic('light')
    setShowQR(true)
  }, [haptic, inviteLink])

  const handleAdminAccess = useCallback(() => {
    hapticSuccess()
    navigate('/admin')
  }, [hapticSuccess, navigate])

  /* ═══════ Guard ═══════ */

  if (!user) return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background"><PremiumBackground /></div>
      <div className="page-content" style={{ padding: '20px 20px 120px' }}>
        <SkeletonProfileHeader />
        <div style={{ marginBottom: 16 }}><SkeletonStatsGrid /></div>
        <div style={{ marginBottom: 16 }}><SkeletonCard /></div>
        <SkeletonCard />
      </div>
    </div>
  )

  /* ═══════ Render ═══════ */

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background">
        <PremiumBackground />
      </div>

      <div className="page-content">
        {/* 1. Hero — avatar + name + rank badge */}
        <ProfileHero
          user={user}
          userPhoto={tgUser?.photo_url}
          isAdmin={isAdmin}
          onAdminAccess={handleAdminAccess}
        />

        {/* 2. Actionable Order Banner (conditional) */}
        {actionableOrder && (
          <ActionableOrderBanner
            order={actionableOrder}
            onClick={handleOpenActionableOrder}
          />
        )}

        {/* 3. Quick Actions Row */}
        <ProfileQuickActions
          ordersCount={user.orders_count}
          onOpenOrders={handleOpenOrders}
          onOpenSupport={handleOpenSupport}
          onOpenClub={handleOpenClub}
        />

        {/* 4. Status & Membership */}
        <StatusCard user={user} />

        {/* 4.5. Theme Toggle */}
        <div style={{ marginBottom: 16 }}>
          <ThemeToggle variant="card" />
        </div>

        {/* 5. Bonus Wallet */}
        <BonusWallet
          user={user}
          onOpenTransactions={handleOpenTransactions}
        />

        {/* 6. Referral Program */}
        <ReferralCard
          referralCode={user.referral_code}
          referralsCount={user.referrals_count}
          referralEarnings={user.referral_earnings}
          referralPercent={user.referral_percent}
          referralRefsToNext={user.referral_refs_to_next}
          inviteLink={inviteLink}
          onCopy={handleCopyReferral}
          onShare={handleShareReferral}
          onOpenQR={handleOpenQR}
          onOpenProgram={handleOpenClub}
        />

        {/* 7. Footer */}
        <ProfileFooter
          onOpenSupport={handleOpenSupport}
          onOpenOffer={handleOpenOffer}
          onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
          onOpenExecutorInfo={handleOpenExecutorInfo}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        <TransactionsModal
          isOpen={showTransactions}
          onClose={() => setShowTransactions(false)}
          transactions={user.transactions}
          balance={bonusBalance}
          onViewAll={() => {
            setShowTransactions(false)
            navigate('/club')
          }}
        />

        <OfferModal
          isOpen={showOffer}
          onClose={() => setShowOffer(false)}
        />

        {showQR && inviteLink && (
          <QRCodeModal
            isOpen={true}
            onClose={() => setShowQR(false)}
            value={inviteLink}
            displayValue={user.referral_code}
            title="Ваша реферальная ссылка"
            subtitle="Покажите QR или дайте другу открыть его с вашего телефона"
            shareText={buildReferralShareText(user.referral_code)}
            downloadFileName={`academic-saloon-${user.referral_code}`}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfilePageNew
