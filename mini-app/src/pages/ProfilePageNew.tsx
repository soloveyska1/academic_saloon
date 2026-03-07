import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  BadgePercent,
  BellRing,
  BookOpen,
  ChevronRight,
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
import { Order, OrderStatus, UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useClub } from '../contexts/ClubContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { QRCodeModal } from '../components/ui/QRCode'
import { useToast } from '../components/ui/Toast'
import { copyTextSafely } from '../utils/clipboard'

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

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatMoney(value: number | null | undefined) {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
}

function formatCompactDate(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'Без даты'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatLongMonth(dateString: string | null | undefined) {
  const date = parseDateSafe(dateString)
  if (!date) return 'недавно'
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
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
  color,
}: {
  value: number
  color: string
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
        background: color,
        boxShadow: `0 0 14px ${color}33`,
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
  title,
  subtitle,
  amount,
  positive,
}: {
  title: string
  subtitle: string
  amount: string
  positive: boolean
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
        background: positive ? 'rgba(74, 222, 128, 0.10)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${positive ? 'rgba(74, 222, 128, 0.18)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Wallet2 size={16} color={positive ? '#86efac' : 'var(--text-muted)'} />
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
        color: positive ? '#86efac' : 'var(--text-main)',
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
}: {
  title: string
  description: string
  expiresAt: string
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
        marginBottom: 10,
      }}>
        {description}
      </div>
      <MetaPill icon={Clock3} label={`до ${formatCompactDate(expiresAt)}`} accent="var(--gold-300)" />
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

  const memberSince = getMemberSince(user)
  const activeOrders = useMemo(
    () => [...user.orders].filter(order => !['completed', 'cancelled', 'rejected'].includes(order.status)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [user.orders]
  )
  const completedOrders = useMemo(
    () => user.orders.filter(order => order.status === 'completed').length,
    [user.orders]
  )
  const actionableOrder = useMemo(
    () => getActionableOrder(user.orders),
    [user.orders]
  )
  const latestTransactions = useMemo(
    () => [...user.transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [user.transactions]
  )
  const activeVouchers = useMemo(
    () => club.activeVouchers.slice(0, 2),
    [club.activeVouchers]
  )

  const inviteLink = botUsername ? `https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}` : ''
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
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Открывай mini app, если тоже нужен академический сервис без хаоса.')}`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl)
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }, [haptic, inviteLink, tg])

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
              Заказы, бонусы, ваучеры, поддержка и ваш следующий шаг без пустых разделов.
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
              God Mode
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
                <MetaPill icon={Crown} label={user.rank.name} accent="var(--gold-300)" />
              </div>

              <div style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                marginBottom: 12,
              }}>
                {user.username ? `@${user.username}` : 'Telegram-клиент'} • с {formatLongMonth(memberSince)}
              </div>

              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                <MetaPill icon={BadgePercent} label={`Скидка ${user.loyalty.discount || user.discount}%`} />
                <MetaPill icon={Wallet2} label={`Кэшбэк ${user.rank.cashback}%`} />
                {club.dailyBonus.status === 'available' && <MetaPill icon={Gift} label="Доступен ежедневный бонус" accent="var(--gold-300)" />}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}>
            <StatCard label="Заказы" value={String(user.orders_count)} accent="var(--gold-300)" />
            <StatCard label="В работе" value={String(activeOrders.length)} accent="#93c5fd" />
            <StatCard label="Готово" value={String(completedOrders)} accent="#86efac" />
            <StatCard label="Рефералы" value={String(user.referrals_count)} accent="#fcd34d" />
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
              hint="Клуб, бонусы и новые обмены"
              onClick={handleOpenRewards}
            />
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Преимущества и прогресс"
            caption="Показываем только то, что реально влияет на ваши условия."
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
                    Ранг {user.rank.name}
                  </div>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                  }}>
                    До следующего ранга осталось {formatMoney(user.rank.spent_to_next)}
                  </div>
                </div>
                <MetaPill icon={Wallet2} label={`Кэшбэк ${user.rank.cashback}%`} accent="var(--gold-300)" />
              </div>
              <ProgressLine value={user.rank.progress} color="linear-gradient(90deg, #d4af37, #f5d061)" />
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
                  {user.loyalty.discount || user.discount}%
                </div>
                <div style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}>
                  До следующего уровня лояльности: {user.loyalty.orders_to_next} заказов.
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
                    Клуб и бонусы
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
                }}>
                  {club.dailyBonus.status === 'available'
                    ? 'Ежедневный бонус уже доступен.'
                    : `Серия ежедневных бонусов: ${club.dailyBonus.streakDay} день.`}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}>
              <StatCard
                label="Бонусный баланс"
                value={formatMoney(user.balance)}
                accent="var(--gold-300)"
                helper={user.bonus_expiry?.has_expiry && user.bonus_expiry.days_left
                  ? `Сгорит через ${user.bonus_expiry.days_left} дн.`
                  : 'Доступен для оплаты и скидок'}
              />
              <StatCard
                label="Реферальный доход"
                value={formatMoney(user.referral_earnings)}
                accent="#93c5fd"
                helper={user.referrals_count > 0 ? `${user.referrals_count} приглашенных` : 'Пока без приглашений'}
              />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Ваучеры и история"
            caption="Показываем активные предложения и последние начисления."
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
                marginBottom: 12,
              }}>
                <div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 4,
                  }}>
                    Последние операции
                  </div>
                  <div style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                  }}>
                    Бонусы, кэшбэк и начисления
                  </div>
                </div>
                <MetaPill icon={Wallet2} label={formatMoney(user.balance)} />
              </div>

              {latestTransactions.length > 0 ? (
                <div>
                  {latestTransactions.map((transaction, index) => (
                    <div key={transaction.id} style={index === latestTransactions.length - 1 ? { borderBottom: 'none' } : undefined}>
                      <TransactionRow
                        title={transaction.reason}
                        subtitle={formatCompactDate(transaction.created_at)}
                        amount={formatMoney(transaction.amount).replace(' ₽', '')}
                        positive={transaction.type === 'credit'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '16px 0 4px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                }}>
                  Здесь появятся начисления и списания, как только начнется история бонусов.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeVouchers.length > 0 ? activeVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  title={voucher.title}
                  description={voucher.description}
                  expiresAt={voucher.expiresAt}
                />
              )) : (
                <div style={{ ...getSurfaceStyle(), padding: '18px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}>
                    <Ticket size={18} color="var(--gold-300)" />
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-main)',
                    }}>
                      Активных ваучеров пока нет
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                    marginBottom: 14,
                  }}>
                    Забирайте награды в клубе и открывайте новые полезные условия для следующих заказов.
                  </div>
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
              )}

              <ActionTile
                icon={Gift}
                label="Клуб привилегий"
                hint="Ежедневный бонус, награды, история и ваши обмены"
                onClick={handleOpenClub}
                accent="var(--gold-300)"
              />
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
              Код {user.referral_code}. Уже приглашено {user.referrals_count}, суммарно начислено {formatMoney(user.referral_earnings)}.
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
              {inviteLink}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}>
              <ActionMiniButton icon={Copy} label="Копировать" onClick={handleCopyReferral} />
              <ActionMiniButton icon={ArrowUpRight} label="Telegram" onClick={handleShareReferral} />
              <ActionMiniButton icon={QrCode} label="QR" onClick={handleOpenQR} />
              <ActionMiniButton icon={Users} label="Подробнее" onClick={handleOpenReferralPage} />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 120 }}>
          <SectionTitle
            title="Помощь и сервис"
            caption="Нужные служебные разделы и документы без лишних настроек ради настроек."
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
              label="Привилегии клуба"
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
              label="История клуба"
              hint="Бонусы, обмены, миссии и вся активность по клубу"
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
            title="Ваша реферальная ссылка"
            subtitle="Покажите QR или дайте другу открыть его с вашего телефона"
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
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        minHeight: 56,
        padding: '10px 12px',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.035)',
        color: 'var(--text-main)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
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
