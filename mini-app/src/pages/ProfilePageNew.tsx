import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useAdmin } from '../contexts/AdminContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { QRCodeModal } from '../components/ui/QRCode'
import { TransactionsModal } from '../components/modals/TransactionsModal'
import { useToast } from '../components/ui/Toast'
import { copyTextSafely } from '../utils/clipboard'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'

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

  /* ═══════ Computed ═══════ */

  const actionableOrder = useMemo(
    () => (user ? getActionableOrder(user.orders) : null),
    [user?.orders],
  )

  const inviteLink = user ? buildReferralLink(botUsername, user.telegram_id) : ''
  const bonusBalance = toSafeNumber(user?.balance)

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

  if (!user) return null

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
        <ProfileFooter onOpenSupport={handleOpenSupport} />
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
