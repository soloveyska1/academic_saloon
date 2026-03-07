import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgePercent,
  BellRing,
  BookOpen,
  CircleHelp,
  Clock3,
  Copy,
  CreditCard,
  Crown,
  Gift,
  GraduationCap,
  LifeBuoy,
  LucideIcon,
  Medal,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet2,
} from 'lucide-react'
import { Order, OrderStatus, Transaction, UserData, Voucher } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useClub } from '../contexts/ClubContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { QRCodeModal } from '../components/ui/QRCode'
import { useToast } from '../components/ui/Toast'
import { copyTextSafely } from '../utils/clipboard'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'
import { getDisplayName } from '../lib/ranks'

interface Props {
  user: UserData | null
}

interface OrderActionMeta {
  label: string
  title: string
  description: string
  button: string
  color: string
  icon: LucideIcon
}

const ACTIONABLE_ORDER_META: Record<string, OrderActionMeta> = {
  confirmed: {
    label: 'Главное действие',
    title: 'Завершить оплату',
    description: 'После оплаты команда сразу запускает заказ в работу.',
    button: 'Оплатить',
    color: '#d4af37',
    icon: CreditCard,
  },
  waiting_payment: {
    label: 'Главное действие',
    title: 'Завершить оплату',
    description: 'После оплаты команда сразу запускает заказ в работу.',
    button: 'Оплатить',
    color: '#d4af37',
    icon: CreditCard,
  },
  review: {
    label: 'Главное действие',
    title: 'Проверить готовую работу',
    description: 'Откройте заказ, чтобы посмотреть результат и закрыть следующий шаг.',
    button: 'Проверить',
    color: '#4ade80',
    icon: ShieldCheck,
  },
  revision: {
    label: 'Главное действие',
    title: 'Посмотреть правки',
    description: 'Откройте заказ и подтвердите следующий шаг по доработке.',
    button: 'Открыть',
    color: '#fb923c',
    icon: Sparkles,
  },
}

const CLUB_LEVEL_LABELS = {
  silver: 'Стартовый уровень',
  gold: 'Усиленный уровень',
  platinum: 'Максимальный уровень',
} as const

const TRANSACTION_REASON_LABELS: Record<string, string> = {
  order_created: 'Бонус за новый заказ',
  referral_bonus: 'Реферальный бонус',
  admin_adjustment: 'Корректировка баланса',
  order_discount: 'Оплата бонусами',
  compensation: 'Компенсация',
  order_cashback: 'Кешбэк за заказ',
  bonus_expired: 'Сгорание бонусов',
  daily_luck: 'Ежедневный бонус',
  coupon: 'Купон',
  promo_code: 'Промокод',
  order_refund: 'Возврат бонусов',
  welcome_bonus: 'Приветственный бонус',
  achievement: 'Награда',
}

const TRANSACTION_REASON_HINTS: Record<string, string> = {
  order_created: 'Начисление за новую заявку',
  referral_bonus: 'Бонус за приглашение',
  admin_adjustment: 'Ручная корректировка',
  order_discount: 'Списано в оплату заказа',
  compensation: 'Начисление от команды',
  order_cashback: 'Начисление после заказа',
  bonus_expired: 'Неиспользованный остаток',
  daily_luck: 'Ежедневная награда',
  coupon: 'Активация купона',
  promo_code: 'Активация промокода',
  order_refund: 'Возврат после отмены',
  welcome_bonus: 'Стартовое начисление',
  achievement: 'Награда за активность',
}

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}

function toSafeNumber(value: number | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number | null | undefined) {
  return `${Math.max(0, Math.round(toSafeNumber(value))).toLocaleString('ru-RU')} ₽`
}

function formatCompactDate(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'Без даты'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatMemberSince(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'недавно'
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function formatExpiryHint(daysLeft: number | null | undefined) {
  const days = toSafeNumber(daysLeft)
  if (days <= 0) return 'сгорают сегодня'
  if (days === 1) return 'сгорают завтра'
  if (days < 5) return `сгорают через ${days} дня`
  return `сгорают через ${days} дней`
}

function getProfileRankName(rankName: string | null | undefined) {
  const mapped = getDisplayName(rankName || '')
  if (!mapped || mapped.trim() === '') return 'Статус клиента'
  return mapped === 'Премиум' ? 'Премиум клуб' : mapped
}

function getClubLevelLabel(level: string | null | undefined) {
  if (!level) return 'Уровень привилегий'
  return CLUB_LEVEL_LABELS[level as keyof typeof CLUB_LEVEL_LABELS] || 'Уровень привилегий'
}

function getMemberSince(user: UserData) {
  const oldestOrder = [...user.orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
  if (oldestOrder) return oldestOrder.created_at
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
}

function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDeadline(deadline: string | null | undefined) {
  const days = getDaysUntilDeadline(deadline)
  if (days === null) return 'Без срока'
  if (days <= 0) return 'Срок прошел'
  if (days === 1) return '1 день'
  if (days < 5) return `${days} дня`
  if (days < 21) return `${days} дней`
  return formatCompactDate(deadline)
}

function getOrderDisplayTitle(order: Order) {
  return order.topic?.trim() || order.subject?.trim() || order.work_type_label || `Заказ #${order.id}`
}

function getRemainingAmount(order: Order) {
  return Math.max((order.final_price || order.price || 0) - (order.paid_amount || 0), 0)
}

function getPrimaryOrderPath(order: Order) {
  if (order.status === 'confirmed' || order.status === 'waiting_payment') {
    return `/order/${order.id}?action=pay`
  }
  return `/order/${order.id}`
}

function getActionableOrder(orders: Order[]) {
  const priorityMap: Record<OrderStatus, number> = {
    confirmed: 1,
    waiting_payment: 1,
    review: 2,
    revision: 3,
    pending: 4,
    waiting_estimation: 4,
    verification_pending: 5,
    paid: 6,
    paid_full: 6,
    in_progress: 6,
    completed: 9,
    cancelled: 10,
    rejected: 10,
    draft: 11,
  }

  return [...orders]
    .filter(order => Boolean(ACTIONABLE_ORDER_META[order.status]))
    .sort((a, b) => {
      const aPriority = priorityMap[a.status]
      const bPriority = priorityMap[b.status]
      if (aPriority !== bPriority) return aPriority - bPriority

      const aDeadline = getDaysUntilDeadline(a.deadline) ?? 999
      const bDeadline = getDaysUntilDeadline(b.deadline) ?? 999
      return aDeadline - bDeadline
    })[0] || null
}

function getSurfaceStyle(active = false) {
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: 24,
    background: `
      radial-gradient(circle at top right, rgba(212, 175, 55, ${active ? '0.12' : '0.08'}), transparent 36%),
      linear-gradient(180deg, rgba(19, 18, 24, 0.97), rgba(10, 10, 16, 0.96))
    `,
    border: `1px solid ${active ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255, 255, 255, 0.06)'}`,
    boxShadow: active ? '0 22px 50px -36px rgba(212, 175, 55, 0.25)' : '0 20px 42px -36px rgba(0, 0, 0, 0.82)',
  }
}

function getTransactionPresentation(transaction: Transaction) {
  if (transaction.type === 'debit') {
    return {
      icon: CreditCard,
      iconColor: '#fbbf24',
      iconBackground: 'rgba(251, 191, 36, 0.12)',
      iconBorder: 'rgba(251, 191, 36, 0.22)',
      amountColor: '#fbbf24',
      title: transaction.description?.trim() || TRANSACTION_REASON_LABELS[transaction.reason] || 'Списание бонусов',
      subtitle: `${formatCompactDate(transaction.created_at)} • ${TRANSACTION_REASON_HINTS[transaction.reason] || 'Списание'}`,
    }
  }

  const creditVisuals: Record<string, { icon: LucideIcon; color: string; background: string; border: string }> = {
    daily_luck: {
      icon: Gift,
      color: '#fcd34d',
      background: 'rgba(252, 211, 77, 0.12)',
      border: 'rgba(252, 211, 77, 0.22)',
    },
    order_cashback: {
      icon: Wallet2,
      color: '#93c5fd',
      background: 'rgba(147, 197, 253, 0.12)',
      border: 'rgba(147, 197, 253, 0.20)',
    },
    referral_bonus: {
      icon: Users,
      color: '#c4b5fd',
      background: 'rgba(196, 181, 253, 0.12)',
      border: 'rgba(196, 181, 253, 0.20)',
    },
    compensation: {
      icon: Sparkles,
      color: '#f9a8d4',
      background: 'rgba(249, 168, 212, 0.12)',
      border: 'rgba(249, 168, 212, 0.20)',
    },
    welcome_bonus: {
      icon: Gift,
      color: '#86efac',
      background: 'rgba(134, 239, 172, 0.12)',
      border: 'rgba(134, 239, 172, 0.20)',
    },
  }

  const visual = creditVisuals[transaction.reason] || {
    icon: Wallet2,
    color: '#86efac',
    background: 'rgba(134, 239, 172, 0.12)',
    border: 'rgba(134, 239, 172, 0.20)',
  }

  return {
    icon: visual.icon,
    iconColor: visual.color,
    iconBackground: visual.background,
    iconBorder: visual.border,
    amountColor: visual.color,
    title: transaction.description?.trim() || TRANSACTION_REASON_LABELS[transaction.reason] || 'Начисление бонусов',
    subtitle: `${formatCompactDate(transaction.created_at)} • ${TRANSACTION_REASON_HINTS[transaction.reason] || 'Начисление'}`,
  }
}

function SectionTitle({
  title,
  caption,
}: {
  title: string
  caption?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: caption ? 4 : 0,
      }}>
        {title}
      </div>
      {caption && (
        <div style={{
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-muted)',
        }}>
          {caption}
        </div>
      )}
    </div>
  )
}

function MetaPill({
  icon: Icon,
  label,
  accent,
}: {
  icon: LucideIcon
  label: string
  accent?: string
}) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 10px',
      borderRadius: 999,
      background: accent ? 'rgba(212, 175, 55, 0.10)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255,255,255,0.05)'}`,
      color: accent || 'var(--text-muted)',
      fontSize: 11.5,
      fontWeight: 700,
      lineHeight: 1,
    }}>
      <Icon size={12} />
      {label}
    </span>
  )
}

function ProgressLine({
  value,
  fill,
  glowColor,
}: {
  value: number
  fill: string
  glowColor?: string
}) {
  return (
    <div style={{
      height: 6,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.07)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, value))}%`,
        height: '100%',
        borderRadius: 999,
        background: fill,
        boxShadow: glowColor ? `0 0 14px ${glowColor}` : undefined,
      }} />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  helper,
}: {
  label: string
  value: string
  accent: string
  helper?: string
}) {
  return (
    <div style={{
      padding: '14px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.05)',
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.44)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        color: accent,
        marginBottom: helper ? 4 : 0,
      }}>
        {value}
      </div>
      {helper && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.45,
        }}>
          {helper}
        </div>
      )}
    </div>
  )
}

function ActionTile({
  icon: Icon,
  label,
  hint,
  onClick,
  accent,
}: {
  icon: LucideIcon
  label: string
  hint: string
  onClick: () => void
  accent?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...getSurfaceStyle(Boolean(accent)),
        width: '100%',
        padding: '16px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        background: accent ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${accent ? 'rgba(212, 175, 55, 0.18)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Icon size={18} color={accent || 'var(--text-main)'} />
      </div>

      <div style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12.5,
        lineHeight: 1.5,
        color: 'var(--text-secondary)',
      }}>
        {hint}
      </div>
    </motion.button>
  )
}

function TransactionRow({
  icon: Icon,
  title,
  subtitle,
  amount,
  positive,
  iconColor,
  iconBackground,
  iconBorder,
  amountColor,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  amount: string
  positive: boolean
  iconColor: string
  iconBackground: string
  iconBorder: string
  amountColor: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        background: iconBackground,
        border: `1px solid ${iconBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={iconColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
      </div>

      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: amountColor,
        flexShrink: 0,
      }}>
        {positive ? '+' : '-'}{amount}
      </div>
    </div>
  )
}

function VoucherCard({
  title,
  description,
  expiresAt,
  applyRules,
}: {
  title: string
  description: string
  expiresAt: string
  applyRules?: string
}) {
  return (
    <div style={{
      padding: '14px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <Ticket size={15} color="var(--gold-300)" />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--gold-300)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Активный ваучер
        </span>
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12.5,
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
        marginBottom: 8,
      }}>
        {description}
      </div>
      {applyRules && (
        <div style={{
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}>
          {applyRules}
        </div>
      )}
      <MetaPill icon={Clock3} label={`действует до ${formatCompactDate(expiresAt)}`} accent="var(--gold-300)" />
    </div>
  )
}

export function ProfilePageNew({ user }: Props) {
  const navigate = useNavigate()
  const { tg, haptic, hapticSuccess, hapticError, botUsername, user: tgUser } = useTelegram()
  const { showToast } = useToast()
  const club = useClub()
  const [showQR, setShowQR] = useState(false)

  if (!user) {
    return null
  }

  const memberSince = user.created_at || getMemberSince(user)
  const ordersCount = toSafeNumber(user.orders_count)
  const referralsCount = toSafeNumber(user.referrals_count)
  const referralEarnings = toSafeNumber(user.referral_earnings)
  const bonusBalance = toSafeNumber(user.balance)
  const cashbackPercent = toSafeNumber(user.rank.cashback)
  const loyaltyDiscount = toSafeNumber(user.loyalty.discount || user.discount)
  const displayRankName = getProfileRankName(user.rank.name)
  const clubLevelLabel = getClubLevelLabel(club.level)
  const activeOrders = useMemo(
    () => [...user.orders].filter(order => !['completed', 'cancelled', 'rejected'].includes(order.status)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [user.orders]
  )
  const actionableOrder = useMemo(
    () => getActionableOrder(user.orders),
    [user.orders]
  )
  const actionRequiredCount = useMemo(
    () => user.orders.filter(order => Boolean(ACTIONABLE_ORDER_META[order.status])).length,
    [user.orders]
  )
  const latestTransactions = useMemo(
    () => [...user.transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4),
    [user.transactions]
  )
  const activeVouchers = useMemo(
    () => club.activeVouchers.slice(0, 3),
    [club.activeVouchers]
  )

  const inviteLink = buildReferralLink(botUsername, user.telegram_id)
  const isAdmin = user.telegram_id === 872379852
  const mainActionMeta = actionableOrder ? ACTIONABLE_ORDER_META[actionableOrder.status] : null

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
    navigate('/support')
  }, [haptic, navigate])

  const handleOpenRewards = useCallback(() => {
    haptic('medium')
    navigate('/club/rewards')
  }, [haptic, navigate])

  const handleOpenVouchers = useCallback(() => {
    haptic('light')
    navigate('/club/vouchers')
  }, [haptic, navigate])

  const handleOpenPrivileges = useCallback(() => {
    haptic('light')
    navigate('/club/privileges')
  }, [haptic, navigate])

  const handleOpenClub = useCallback(() => {
    haptic('medium')
    navigate('/club')
  }, [haptic, navigate])

  const handleOpenReferralPage = useCallback(() => {
    haptic('light')
    navigate('/referral')
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
      return
    }

    hapticError()
    showToast({
      type: 'error',
      title: 'Не удалось скопировать ссылку',
      message: 'Попробуйте еще раз',
    })
  }, [hapticError, hapticSuccess, inviteLink, showToast])

  const handleShareReferral = useCallback(() => {
    if (!inviteLink) return

    haptic('medium')
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(buildReferralShareText(user.referral_code))}`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }, [haptic, inviteLink, tg, user.referral_code])

  const handleOpenQR = useCallback(() => {
    if (!inviteLink) return
    haptic('light')
    setShowQR(true)
  }, [haptic, inviteLink])

  const handleAdminAccess = useCallback(() => {
    hapticSuccess()
    navigate('/god')
  }, [hapticSuccess, navigate])

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background">
        <PremiumBackground />
      </div>

      <div className="page-content">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(212,175,55,0.72)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Профиль
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.05,
              fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Все важное под рукой
            </h1>
            <div style={{
              marginTop: 8,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              maxWidth: 360,
            }}>
              Заказы, бонусы, ваучеры, поддержка и все полезные действия в одном месте.
            </div>
          </div>

          {isAdmin && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleAdminAccess}
              style={{
                height: 42,
                padding: '0 14px',
                borderRadius: 14,
                border: '1px solid rgba(212,175,55,0.2)',
                background: 'rgba(212,175,55,0.10)',
                color: 'var(--gold-300)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Админ
            </motion.button>
          )}
        </motion.div>

        <motion.section
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...getSurfaceStyle(true),
            padding: '20px',
            marginBottom: 18,
          }}
        >
          <div style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            marginBottom: 18,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              overflow: 'hidden',
              flexShrink: 0,
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {tgUser?.photo_url ? (
                <img
                  src={tgUser.photo_url}
                  alt={user.fullname}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 28 }}>{user.rank.emoji || '✨'}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 6,
              }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  lineHeight: 1.15,
                }}>
                  {user.fullname}
                </div>
                <MetaPill icon={Crown} label={displayRankName} accent="var(--gold-300)" />
              </div>

              <div style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}>
                {user.username ? `@${user.username}` : 'Telegram-клиент'} • с {formatMemberSince(memberSince)}
              </div>

              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                <MetaPill icon={BadgePercent} label={`Скидка ${loyaltyDiscount}%`} />
                <MetaPill icon={Wallet2} label={`Кэшбэк ${cashbackPercent}%`} />
                {club.dailyBonus.status === 'available' && <MetaPill icon={Gift} label="Доступен ежедневный бонус" accent="var(--gold-300)" />}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}>
            <StatCard label="Заказы" value={String(ordersCount)} accent="var(--gold-300)" helper="Всего оформлено" />
            <StatCard label="Активно" value={String(activeOrders.length)} accent="#93c5fd" helper="Открытые заказы" />
            <StatCard label="Ваш шаг" value={String(actionRequiredCount)} accent="#86efac" helper="Нуждается в действии" />
            <StatCard label="Бонусы" value={formatMoney(bonusBalance)} accent="#fcd34d" helper="Можно списать в оплату" />
          </div>
        </motion.section>

        <motion.button
          type="button"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleOpenActionableOrder}
          style={{
            ...getSurfaceStyle(true),
            width: '100%',
            padding: '18px',
            marginBottom: 18,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {mainActionMeta ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(212, 175, 55, 0.14)',
                border: '1px solid rgba(212, 175, 55, 0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <mainActionMeta.icon size={22} color={mainActionMeta.color} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: mainActionMeta.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  {mainActionMeta.label}
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: 4,
                }}>
                  {mainActionMeta.title}
                </div>
                <div style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}>
                  {getOrderDisplayTitle(actionableOrder!)} • {mainActionMeta.description}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <MetaPill icon={Clock3} label={formatDeadline(actionableOrder?.deadline)} accent={mainActionMeta.color} />
                  {['confirmed', 'waiting_payment'].includes(actionableOrder!.status) && (
                    <MetaPill icon={Wallet2} label={formatMoney(getRemainingAmount(actionableOrder!))} accent={mainActionMeta.color} />
                  )}
                </div>
              </div>

              <div style={{
                height: 42,
                padding: '0 16px',
                borderRadius: 14,
                background: 'var(--gold-metallic)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#090909',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                marginLeft: 'auto',
              }}>
                {mainActionMeta.button}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(212, 175, 55, 0.14)',
                border: '1px solid rgba(212, 175, 55, 0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Rocket size={22} color="var(--gold-300)" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  Главное действие
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: 4,
                }}>
                  {user.orders_count === 0 ? 'Создать первый заказ' : 'Открыть новый заказ'}
                </div>
                <div style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}>
                  {user.orders_count === 0
                    ? 'Заполните заявку, и дальше мы сами проведем вас по цене, срокам и всем следующим шагам.'
                    : 'Если нужна следующая работа, срочная задача или доработка, начните новую заявку отсюда.'}
                </div>
              </div>

              <div style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'var(--gold-metallic)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: 'auto',
              }}>
                <ArrowUpRight size={18} color="#090909" />
              </div>
            </div>
          )}
        </motion.button>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Быстрый доступ"
            caption="Только реальные действия, которыми вы пользуетесь чаще всего."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}>
            <ActionTile
              icon={BookOpen}
              label="Мои заказы"
              hint={`${user.orders_count} заказов и все статусы`}
              onClick={handleOpenOrders}
              accent="var(--gold-300)"
            />
            <ActionTile
              icon={LifeBuoy}
              label="Поддержка"
              hint="Связаться с командой по текущим задачам"
              onClick={handleOpenSupport}
            />
            <ActionTile
              icon={Ticket}
              label="Ваучеры"
              hint={`${club.activeVouchers.length} активных сейчас`}
              onClick={handleOpenVouchers}
            />
            <ActionTile
              icon={Gift}
              label="Награды"
              hint="Баллы, ваучеры и доступные привилегии"
              onClick={handleOpenRewards}
            />
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Условия и привилегии"
            caption="Здесь собраны все условия, которые реально влияют на цену, бонусы и приоритет."
          />
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background: 'rgba(212, 175, 55, 0.10)',
                  border: '1px solid rgba(212, 175, 55, 0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Medal size={18} color="var(--gold-300)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 2,
                  }}>
                    Статус клиента: {displayRankName}
                  </div>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                  }}>
                    {user.rank.is_max
                      ? 'Максимальные условия уже активны.'
                      : `До следующего статуса осталось ${formatMoney(user.rank.spent_to_next)}`}
                  </div>
                </div>
                <MetaPill icon={Wallet2} label={`Кэшбэк ${cashbackPercent}%`} accent="var(--gold-300)" />
              </div>
              <ProgressLine
                value={user.rank.progress}
                fill="linear-gradient(90deg, #d4af37, #f5d061)"
                glowColor="rgba(212, 175, 55, 0.35)"
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}>
              <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <BadgePercent size={18} color="#86efac" />
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}>
                    Персональная скидка
                  </div>
                </div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#86efac',
                    marginBottom: 6,
                  }}>
                  {loyaltyDiscount}%
                </div>
                <div style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}>
                  {user.loyalty.orders_to_next > 0
                    ? `До следующего уровня лояльности: ${user.loyalty.orders_to_next} заказов.`
                    : 'Максимальная скидка уже активна.'}
                </div>
              </div>

              <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}>
                  <Gift size={18} color="#fcd34d" />
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}>
                    Баллы привилегий
                  </div>
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#fcd34d',
                  marginBottom: 6,
                }}>
                  {club.points}
                </div>
                <div style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                }}>
                  {club.dailyBonus.status === 'available'
                    ? `Баллы привилегий • ${clubLevelLabel.toLowerCase()}, ежедневный бонус уже доступен.`
                    : `Баллы привилегий • ${clubLevelLabel.toLowerCase()}, серия бонусов: ${club.dailyBonus.streakDay} день.`}
                </div>
                <ProgressLine
                  value={club.levelProgress}
                  fill="linear-gradient(90deg, #93c5fd, #c4b5fd)"
                  glowColor="rgba(147, 197, 253, 0.28)"
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}>
              <StatCard
                label="Бонусный баланс"
                value={formatMoney(bonusBalance)}
                accent="var(--gold-300)"
                helper={user.bonus_expiry?.has_expiry && user.bonus_expiry.days_left !== undefined
                  ? `${formatExpiryHint(user.bonus_expiry.days_left)}`
                  : 'Доступен для оплаты и скидок'}
              />
              <StatCard
                label="Реферальные бонусы"
                value={formatMoney(referralEarnings)}
                accent="#93c5fd"
                helper={referralsCount > 0 ? `${referralsCount} приглашено` : 'Пока без приглашений'}
              />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Бонусы и ваучеры"
            caption="Сколько бонусов доступно сейчас, что начислялось недавно и какие ваучеры можно применить к новому заказу."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 4,
                  }}>
                    Бонусный баланс
                  </div>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>
                    Эти бонусы можно использовать при оплате заказов и скидках.
                  </div>
                </div>
                <MetaPill icon={Wallet2} label={formatMoney(bonusBalance)} accent="var(--gold-300)" />
              </div>

              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}>
                <MetaPill
                  icon={BadgePercent}
                  label={`Кэшбэк ${cashbackPercent}%`}
                />
                {user.bonus_expiry?.has_expiry && user.bonus_expiry.days_left !== undefined && (
                  <MetaPill
                    icon={Clock3}
                    label={formatExpiryHint(user.bonus_expiry.days_left)}
                    accent="var(--gold-300)"
                  />
                )}
              </div>

              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.44)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 10,
              }}>
                Последние операции
              </div>

              {latestTransactions.length > 0 ? (
                <div>
                  {latestTransactions.map((transaction, index) => {
                    const presentation = getTransactionPresentation(transaction)
                    return (
                      <div key={transaction.id} style={index === latestTransactions.length - 1 ? { borderBottom: 'none' } : undefined}>
                        <TransactionRow
                          icon={presentation.icon}
                          iconColor={presentation.iconColor}
                          iconBackground={presentation.iconBackground}
                          iconBorder={presentation.iconBorder}
                          title={presentation.title}
                          subtitle={presentation.subtitle}
                          amount={formatMoney(transaction.amount).replace(' ₽', '')}
                          positive={transaction.type === 'credit'}
                          amountColor={presentation.amountColor}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '16px 0 4px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}>
                  История начислений появится здесь после первого бонуса, кешбэка или списания в оплату.
                </div>
              )}
            </div>

            <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 4,
                  }}>
                    Активные ваучеры
                  </div>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>
                    Их можно применить в новой заявке, если условия ваучера подходят.
                  </div>
                </div>
                <MetaPill icon={Ticket} label={`${club.activeVouchers.length} доступно`} accent="var(--gold-300)" />
              </div>

              {activeVouchers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {activeVouchers.map((voucher: Voucher) => (
                    <VoucherCard
                      key={voucher.id}
                      title={voucher.title}
                      description={voucher.description}
                      expiresAt={voucher.expiresAt}
                      applyRules={voucher.applyRules}
                    />
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '14px 0 16px',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}>
                  Пока нет активных ваучеров. Получайте их в разделе привилегий и применяйте при следующем заказе.
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
              }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleOpenVouchers}
                  style={{
                    minHeight: 42,
                    padding: '0 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Все ваучеры
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleOpenRewards}
                  style={{
                    minHeight: 42,
                    padding: '0 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(212,175,55,0.18)',
                    background: 'rgba(212,175,55,0.10)',
                    color: 'var(--gold-300)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Открыть награды
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Реферальная программа"
            caption="Отсюда можно сразу скопировать ссылку, отправить её в Telegram или показать QR."
          />
          <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}>
              <Users size={18} color="var(--gold-300)" />
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-main)',
              }}>
                Приглашайте друзей и получайте бонусы
              </div>
            </div>

            <div style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              marginBottom: 14,
            }}>
              Код {user.referral_code}. Уже приглашено {referralsCount}, суммарно начислено {formatMoney(referralEarnings)}.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}>
              <StatCard
                label="Приглашено"
                value={String(referralsCount)}
                accent="var(--gold-300)"
                helper="Люди, которые пришли по вашей ссылке"
              />
              <StatCard
                label="Начислено"
                value={formatMoney(referralEarnings)}
                accent="#93c5fd"
                helper="Бонусы за приглашения"
              />
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              lineHeight: 1.55,
              marginBottom: 14,
              wordBreak: 'break-all',
            }}>
              {inviteLink || 'Ссылка появится, когда мини-приложение получит конфигурацию бота.'}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}>
              <ActionMiniButton icon={Copy} label="Копировать" onClick={handleCopyReferral} disabled={!inviteLink} />
              <ActionMiniButton icon={ArrowUpRight} label="Поделиться" onClick={handleShareReferral} disabled={!inviteLink} />
              <ActionMiniButton icon={QrCode} label="QR-код" onClick={handleOpenQR} disabled={!inviteLink} />
              <ActionMiniButton icon={Users} label="О программе" onClick={handleOpenReferralPage} />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 120 }}>
          <SectionTitle
            title="Поддержка и сервис"
            caption="Все важные служебные разделы: помощь, привилегии и история активности."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}>
            <ActionTile
              icon={LifeBuoy}
              label="Написать в поддержку"
              hint="По оплате, срокам, правкам и любым вопросам по заказам"
              onClick={handleOpenSupport}
            />
            <ActionTile
              icon={GraduationCap}
              label="Привилегии"
              hint="Посмотреть уровни, условия и доступные преимущества"
              onClick={handleOpenPrivileges}
            />
            <ActionTile
              icon={BellRing}
              label="Ежедневный бонус"
              hint={club.dailyBonus.status === 'available' ? 'Бонус уже можно забрать' : 'Проверить текущую серию и награды'}
              onClick={handleOpenClub}
              accent={club.dailyBonus.status === 'available' ? 'var(--gold-300)' : undefined}
            />
            <ActionTile
              icon={CircleHelp}
              label="История привилегий"
              hint="Бонусы, обмены, ваучеры и вся активность по привилегиям"
              onClick={() => {
                haptic('light')
                navigate('/club/history')
              }}
            />
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showQR && inviteLink && (
          <QRCodeModal
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

function ActionMiniButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 56,
        padding: '10px 12px',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.035)',
        color: 'var(--text-main)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon size={16} color="var(--gold-300)" />
      <span style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: 'var(--text-secondary)',
      }}>
        {label}
      </span>
    </motion.button>
  )
}

export default ProfilePageNew
