/**
 * OrderDetailPage V8.0 — Premium Concierge Redesign
 *
 * Этап 1: AppBar + HeroSummary + базовая структура
 *
 * Ключевые принципы:
 * - Mobile first (320-430px)
 * - State-driven UI
 * - Единая система токенов
 * - Минимум blur/shadow для производительности
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  MoreHorizontal,
  Copy,
  MessageCircle,
  HelpCircle,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Flame,
  Download,
  ChevronRight,
} from 'lucide-react'
import { Order, OrderStatus } from '../types'
import { fetchOrderDetail, fetchPaymentInfo, PaymentInfo } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useWebSocketContext } from '../hooks/useWebSocket'
import { useToast } from '../components/ui/Toast'

// ═══════════════════════════════════════════════════════════════════════════════
//                              DESIGN SYSTEM V8
// ═══════════════════════════════════════════════════════════════════════════════

const DS = {
  colors: {
    // Gold
    gold: '#D4AF37',
    goldLight: '#F5E6A3',
    goldDark: '#B38728',
    // Semantic
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    // Neutral
    white: '#ffffff',
    textPrimary: '#EDEDED',
    textSecondary: 'rgba(255,255,255,0.65)',
    textMuted: 'rgba(255,255,255,0.4)',
    // Surfaces
    bgVoid: '#050507',
    bgSurface: '#0c0c10',
    bgElevated: '#121218',
    bgCard: 'rgba(18, 18, 22, 0.95)',
    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',
    borderGold: 'rgba(212,175,55,0.25)',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },
  fontSize: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
    '2xl': 18,
    '3xl': 20,
    '4xl': 24,
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  step: number
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: { label: 'Черновик', color: '#6b7280', bgColor: 'rgba(107,114,128,0.15)', icon: Clock, step: 0 },
  pending: { label: 'На оценке', color: DS.colors.warning, bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_estimation: { label: 'На оценке', color: DS.colors.warning, bgColor: 'rgba(245,158,11,0.15)', icon: Clock, step: 1 },
  waiting_payment: { label: 'Ожидает оплаты', color: DS.colors.gold, bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, step: 2 },
  confirmed: { label: 'Ожидает оплаты', color: DS.colors.gold, bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, step: 2 },
  verification_pending: { label: 'Проверка оплаты', color: DS.colors.cyan, bgColor: 'rgba(6,182,212,0.15)', icon: Loader2, step: 2 },
  paid: { label: 'В работе', color: DS.colors.info, bgColor: 'rgba(59,130,246,0.15)', icon: Loader2, step: 3 },
  paid_full: { label: 'В работе', color: DS.colors.info, bgColor: 'rgba(59,130,246,0.15)', icon: Loader2, step: 3 },
  in_progress: { label: 'В работе', color: DS.colors.info, bgColor: 'rgba(59,130,246,0.15)', icon: Loader2, step: 3 },
  revision: { label: 'На доработке', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', icon: Clock, step: 3 },
  review: { label: 'На проверке', color: DS.colors.purple, bgColor: 'rgba(139,92,246,0.15)', icon: Clock, step: 4 },
  completed: { label: 'Выполнен', color: DS.colors.success, bgColor: 'rgba(34,197,94,0.15)', icon: CheckCircle2, step: 5 },
  cancelled: { label: 'Отменён', color: DS.colors.error, bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: -1 },
  rejected: { label: 'Отклонён', color: DS.colors.error, bgColor: 'rgba(239,68,68,0.15)', icon: XCircle, step: -1 },
}

const WORK_TYPE_LABELS: Record<string, string> = {
  masters: 'Магистерская',
  diploma: 'Дипломная',
  coursework: 'Курсовая',
  essay: 'Эссе',
  report: 'Реферат',
  control: 'Контрольная',
  presentation: 'Презентация',
  practice: 'Практика',
  other: 'Работа',
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const formatPrice = (amount: number | undefined | null): string => {
  if (!amount || typeof amount !== 'number') return '0'
  return amount.toLocaleString('ru-RU')
}

// Countdown hook
interface CountdownResult {
  hours: number
  minutes: number
  seconds: number
  totalHours: number
  urgency: 'safe' | 'warning' | 'critical' | 'expired'
  formatted: string
  progress: number // 0-100
}

function usePaymentCountdown(deadline: string | null, hoursLimit = 24): CountdownResult | null {
  const [result, setResult] = useState<CountdownResult | null>(null)

  useEffect(() => {
    if (!deadline) return

    const calculate = (): CountdownResult | null => {
      // Парсим дедлайн оплаты (24 часа от создания заказа или конкретная дата)
      const target = new Date(deadline)
      if (isNaN(target.getTime())) return null

      // Добавляем 24 часа к дедлайну если это дата создания
      const paymentDeadline = new Date(target.getTime() + hoursLimit * 60 * 60 * 1000)
      const diff = paymentDeadline.getTime() - Date.now()

      if (diff <= 0) {
        return {
          hours: 0, minutes: 0, seconds: 0,
          totalHours: 0, urgency: 'expired',
          formatted: 'Истёк', progress: 0
        }
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      const totalHours = hours

      let urgency: CountdownResult['urgency'] = 'safe'
      if (totalHours < 2) urgency = 'critical'
      else if (totalHours < 6) urgency = 'warning'

      const progress = Math.max(0, Math.min(100, (diff / (hoursLimit * 60 * 60 * 1000)) * 100))

      const formatted = hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`

      return { hours, minutes, seconds, totalHours, urgency, formatted, progress }
    }

    setResult(calculate())
    const interval = setInterval(() => setResult(calculate()), 1000)
    return () => clearInterval(interval)
  }, [deadline, hoursLimit])

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              ORDER APP BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderAppBarProps {
  order: Order
  onBack: () => void
  onCopyOrderId: () => void
  onContactManager: () => void
  onOpenFAQ: () => void
}

const OrderAppBar = memo(function OrderAppBar({
  order,
  onBack,
  onCopyOrderId,
  onContactManager,
  onOpenFAQ,
}: OrderAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const workTypeLabel = order.work_type_label || WORK_TYPE_LABELS[order.work_type] || 'Заказ'

  const menuItems = [
    { icon: Copy, label: 'Скопировать номер', onClick: () => { onCopyOrderId(); setMenuOpen(false) } },
    { icon: MessageCircle, label: 'Написать менеджеру', onClick: () => { onContactManager(); setMenuOpen(false) } },
    { icon: HelpCircle, label: 'FAQ / Помощь', onClick: () => { onOpenFAQ(); setMenuOpen(false) } },
  ]

  return (
    <>
      {/* Main AppBar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DS.space.md,
          padding: `${DS.space.lg}px ${DS.space.lg}px`,
          background: DS.colors.bgCard,
          borderBottom: `1px solid ${DS.colors.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Back Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: DS.radius.md,
            background: DS.colors.bgElevated,
            border: `1px solid ${DS.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color={DS.colors.textSecondary} />
        </motion.button>

        {/* Title + Order Number */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
            <span
              style={{
                fontSize: DS.fontSize.xl,
                fontWeight: 700,
                color: DS.colors.textPrimary,
                fontFamily: 'var(--font-serif)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {workTypeLabel}
            </span>
            {/* Order ID Chip */}
            <div
              style={{
                padding: `${DS.space.xs}px ${DS.space.sm}px`,
                borderRadius: DS.radius.sm,
                background: 'rgba(212,175,55,0.12)',
                border: `1px solid ${DS.colors.borderGold}`,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: DS.fontSize.sm,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: DS.colors.gold,
                }}
              >
                #{order.id}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMenuOpen(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: DS.radius.md,
            background: DS.colors.bgElevated,
            border: `1px solid ${DS.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <MoreHorizontal size={20} color={DS.colors.textSecondary} />
        </motion.button>
      </div>

      {/* Status Pill - Below AppBar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: `${DS.space.md}px ${DS.space.lg}px`,
          background: `linear-gradient(180deg, ${DS.colors.bgCard} 0%, transparent 100%)`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: DS.space.sm,
            padding: `${DS.space.sm}px ${DS.space.lg}px`,
            borderRadius: DS.radius.full,
            background: statusConfig.bgColor,
            border: `1px solid ${statusConfig.color}40`,
          }}
        >
          <StatusIcon
            size={14}
            color={statusConfig.color}
            className={order.status === 'verification_pending' || order.status === 'in_progress' ? 'animate-spin' : ''}
          />
          <span
            style={{
              fontSize: DS.fontSize.sm,
              fontWeight: 600,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 200,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 70,
                right: DS.space.lg,
                background: DS.colors.bgElevated,
                borderRadius: DS.radius.lg,
                border: `1px solid ${DS.colors.borderLight}`,
                overflow: 'hidden',
                minWidth: 200,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
            >
              {menuItems.map((item, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onClick}
                  style={{
                    width: '100%',
                    padding: `${DS.space.lg}px ${DS.space.xl}px`,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < menuItems.length - 1 ? `1px solid ${DS.colors.border}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: DS.space.md,
                    cursor: 'pointer',
                    color: DS.colors.textPrimary,
                    fontSize: DS.fontSize.base,
                  }}
                >
                  <item.icon size={18} color={DS.colors.textSecondary} />
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              HERO SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

interface HeroSummaryProps {
  order: Order
  countdown: CountdownResult | null
}

const HeroSummary = memo(function HeroSummary({ order, countdown }: HeroSummaryProps) {
  const isAwaitingPayment = ['waiting_payment', 'confirmed'].includes(order.status)
  const statusConfig = STATUS_CONFIG[order.status]

  // Urgency colors for countdown
  const urgencyColors = {
    safe: DS.colors.success,
    warning: DS.colors.warning,
    critical: DS.colors.error,
    expired: DS.colors.error,
  }

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px ${DS.space.lg}px`,
        padding: DS.space.xl,
        borderRadius: DS.radius.xl,
        background: DS.colors.bgCard,
        border: `1px solid ${DS.colors.border}`,
      }}
    >
      {/* Order Description */}
      <div style={{ marginBottom: DS.space.lg }}>
        <p
          style={{
            fontSize: DS.fontSize.base,
            color: DS.colors.textPrimary,
            margin: 0,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {order.topic || order.subject || 'Описание заказа'}
        </p>
      </div>

      {/* Quick Info Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: DS.space.sm, marginBottom: DS.space.lg }}>
        {order.subject && (
          <div
            style={{
              padding: `${DS.space.xs}px ${DS.space.md}px`,
              borderRadius: DS.radius.sm,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <span style={{ fontSize: DS.fontSize.xs, color: DS.colors.info }}>
              {order.subject}
            </span>
          </div>
        )}
        {order.deadline && (
          <div
            style={{
              padding: `${DS.space.xs}px ${DS.space.md}px`,
              borderRadius: DS.radius.sm,
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <span style={{ fontSize: DS.fontSize.xs, color: DS.colors.purple }}>
              Сдать: {order.deadline}
            </span>
          </div>
        )}
      </div>

      {/* Payment Countdown Block - Only for awaiting_payment status */}
      {isAwaitingPayment && countdown && (
        <div
          style={{
            padding: DS.space.lg,
            borderRadius: DS.radius.lg,
            background: `linear-gradient(135deg, ${urgencyColors[countdown.urgency]}15, ${urgencyColors[countdown.urgency]}05)`,
            border: `1px solid ${urgencyColors[countdown.urgency]}30`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DS.space.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
              {countdown.urgency === 'critical' ? (
                <Flame size={16} color={urgencyColors[countdown.urgency]} />
              ) : countdown.urgency === 'warning' ? (
                <AlertTriangle size={16} color={urgencyColors[countdown.urgency]} />
              ) : (
                <Clock size={16} color={urgencyColors[countdown.urgency]} />
              )}
              <span style={{ fontSize: DS.fontSize.sm, color: DS.colors.textSecondary }}>
                Оплатить до
              </span>
            </div>
            <span
              style={{
                fontSize: DS.fontSize['2xl'],
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: urgencyColors[countdown.urgency],
              }}
            >
              {countdown.formatted}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${countdown.progress}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                borderRadius: 2,
                background: `linear-gradient(90deg, ${urgencyColors[countdown.urgency]}, ${urgencyColors[countdown.urgency]}80)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Price Display */}
      {order.final_price && order.final_price > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: DS.space.lg,
            paddingTop: DS.space.lg,
            borderTop: `1px solid ${DS.colors.border}`,
          }}
        >
          <span style={{ fontSize: DS.fontSize.base, color: DS.colors.textSecondary }}>
            Стоимость заказа
          </span>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: DS.fontSize['3xl'],
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: DS.colors.gold,
              }}
            >
              {formatPrice(order.final_price)} ₽
            </span>
            {order.paid_amount !== undefined && order.paid_amount > 0 && order.paid_amount < order.final_price && (
              <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.success }}>
                Оплачено: {formatPrice(order.paid_amount)} ₽
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              STICKY ACTION BAR
// ═══════════════════════════════════════════════════════════════════════════════

type ActionBarVariant = 'payment' | 'verification' | 'work' | 'review' | 'completed' | 'cancelled'

interface StickyActionBarProps {
  order: Order
  paymentScheme: 'full' | 'half'
  onPaymentClick: () => void
  onContactManager: () => void
  onDownloadFiles: () => void
}

const StickyActionBar = memo(function StickyActionBar({
  order,
  paymentScheme,
  onPaymentClick,
  onContactManager,
  onDownloadFiles,
}: StickyActionBarProps) {
  // Determine variant based on order status
  const getVariant = (): ActionBarVariant => {
    if (['cancelled', 'rejected'].includes(order.status)) return 'cancelled'
    if (['waiting_payment', 'confirmed'].includes(order.status)) return 'payment'
    if (order.status === 'verification_pending') return 'verification'
    if (['paid', 'paid_full', 'in_progress', 'revision'].includes(order.status)) return 'work'
    if (order.status === 'review') return 'review'
    if (order.status === 'completed') return 'completed'
    return 'work'
  }

  const variant = getVariant()

  // Calculate amount to pay today
  const calculateTodayAmount = (): number => {
    if (!order.final_price) return 0
    const remaining = order.final_price - (order.paid_amount || 0)
    if (remaining <= 0) return 0

    if (paymentScheme === 'half' && (order.paid_amount || 0) === 0) {
      return Math.ceil(order.final_price / 2)
    }
    return remaining
  }

  const todayAmount = calculateTodayAmount()

  // Config for each variant
  const variantConfig: Record<ActionBarVariant, {
    showAmount: boolean
    buttonText: string
    buttonIcon: typeof CreditCard
    buttonColor: string
    buttonBg: string
    disabled: boolean
    onClick: () => void
  }> = {
    payment: {
      showAmount: true,
      buttonText: 'Перейти к оплате',
      buttonIcon: ChevronRight,
      buttonColor: '#0a0a0c',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: false,
      onClick: onPaymentClick,
    },
    verification: {
      showAmount: false,
      buttonText: 'Проверяем оплату...',
      buttonIcon: Loader2,
      buttonColor: DS.colors.cyan,
      buttonBg: 'rgba(6,182,212,0.15)',
      disabled: true,
      onClick: () => {},
    },
    work: {
      showAmount: false,
      buttonText: 'Написать менеджеру',
      buttonIcon: MessageCircle,
      buttonColor: DS.colors.textPrimary,
      buttonBg: DS.colors.bgElevated,
      disabled: false,
      onClick: onContactManager,
    },
    review: {
      showAmount: false,
      buttonText: 'Проверить работу',
      buttonIcon: CheckCircle2,
      buttonColor: '#0a0a0c',
      buttonBg: `linear-gradient(135deg, ${DS.colors.purple}, #7c3aed)`,
      disabled: false,
      onClick: onContactManager, // TODO: scroll to review section
    },
    completed: {
      showAmount: false,
      buttonText: 'Скачать файлы',
      buttonIcon: Download,
      buttonColor: '#0a0a0c',
      buttonBg: `linear-gradient(135deg, #4ade80, ${DS.colors.success})`,
      disabled: !order.files_url,
      onClick: onDownloadFiles,
    },
    cancelled: {
      showAmount: false,
      buttonText: 'Заказ отменён',
      buttonIcon: XCircle,
      buttonColor: DS.colors.error,
      buttonBg: 'rgba(239,68,68,0.15)',
      disabled: true,
      onClick: () => {},
    },
  }

  const config = variantConfig[variant]
  const ButtonIcon = config.buttonIcon

  // Don't show for cancelled/rejected
  if (variant === 'cancelled') return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        // Safe area padding for iOS
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
        paddingTop: DS.space.lg,
        paddingLeft: DS.space.lg,
        paddingRight: DS.space.lg,
        background: 'linear-gradient(180deg, transparent 0%, rgba(5,5,7,0.95) 20%, rgba(5,5,7,0.99) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: DS.space.lg,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Left: Amount to pay */}
        {config.showAmount && todayAmount > 0 && (
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted, marginBottom: 2 }}>
              К оплате сегодня
            </div>
            <div
              style={{
                fontSize: DS.fontSize['2xl'],
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: DS.colors.gold,
              }}
            >
              {formatPrice(todayAmount)} ₽
            </div>
          </div>
        )}

        {/* Right: Action Button */}
        <motion.button
          whileTap={config.disabled ? undefined : { scale: 0.97 }}
          onClick={config.onClick}
          disabled={config.disabled}
          style={{
            flex: config.showAmount ? '1 1 auto' : '1 1 100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: DS.space.sm,
            padding: `${DS.space.lg}px ${DS.space.xl}px`,
            borderRadius: DS.radius.lg,
            background: config.buttonBg,
            border: variant === 'work' ? `1px solid ${DS.colors.borderLight}` : 'none',
            color: config.buttonColor,
            fontSize: DS.fontSize.lg,
            fontWeight: 700,
            cursor: config.disabled ? 'not-allowed' : 'pointer',
            opacity: config.disabled ? 0.6 : 1,
            minHeight: 52,
            boxShadow: variant === 'payment' ? '0 8px 24px -4px rgba(212,175,55,0.4)' : 'none',
          }}
        >
          <ButtonIcon
            size={20}
            className={variant === 'verification' ? 'animate-spin' : ''}
          />
          {config.buttonText}
        </motion.button>
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOADING & ERROR STATES
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: DS.space.lg,
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={36} color={DS.colors.gold} />
      </motion.div>
      <span style={{ fontSize: DS.fontSize.base, color: DS.colors.textSecondary }}>
        Загружаем заказ...
      </span>
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: DS.space['2xl'],
        gap: DS.space.xl,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: DS.radius.xl,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <XCircle size={40} color={DS.colors.error} />
      </div>
      <p
        style={{
          fontSize: DS.fontSize['2xl'],
          fontWeight: 600,
          color: DS.colors.textPrimary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        {message}
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        style={{
          padding: `${DS.space.lg}px ${DS.space['2xl']}px`,
          borderRadius: DS.radius.md,
          background: DS.colors.bgElevated,
          border: `1px solid ${DS.colors.border}`,
          color: DS.colors.textSecondary,
          fontSize: DS.fontSize.base,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Назад к заказам
      </motion.button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OrderDetailPageV8() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { showToast } = useToast()
  const { addMessageHandler } = useWebSocketContext()

  // State
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)

  // Parse order ID
  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  // Countdown for payment
  const countdown = usePaymentCountdown(order?.created_at || null)

  // Load order data
  const loadOrder = useCallback(async () => {
    if (!isValidOrderId) {
      setError('Некорректный ID заказа')
      setLoading(false)
      return
    }

    setError(null)
    try {
      const data = await fetchOrderDetail(orderId)
      setOrder(data)

      // Load payment info if needed
      if (
        data.final_price &&
        data.final_price > 0 &&
        (data.paid_amount || 0) < data.final_price &&
        ['confirmed', 'waiting_payment', 'paid'].includes(data.status)
      ) {
        try {
          const payment = await fetchPaymentInfo(orderId)
          setPaymentInfo(payment)
        } catch (err) {
          console.error('[OrderDetailV8] Failed to load payment info:', err)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [orderId, isValidOrderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  // WebSocket updates
  useEffect(() => {
    if (!isValidOrderId) return
    const unsubscribe = addMessageHandler((message) => {
      if (message.type === 'order_update' || message.type === 'refresh') {
        loadOrder()
      }
    })
    return unsubscribe
  }, [orderId, isValidOrderId, addMessageHandler, loadOrder])

  // Handlers
  const handleBack = useCallback(() => {
    haptic?.('light')
    navigate('/orders')
  }, [haptic, navigate])

  const handleCopyOrderId = useCallback(() => {
    if (!order) return
    navigator.clipboard.writeText(`#${order.id}`)
    haptic?.('light')
    showToast({ type: 'success', title: 'Скопировано', message: `Номер заказа #${order.id}` })
  }, [order, haptic, showToast])

  const handleContactManager = useCallback(() => {
    haptic?.('light')
    // TODO: Open chat
    showToast({ type: 'info', title: 'Чат', message: 'Открываем чат с менеджером...' })
  }, [haptic, showToast])

  const handleOpenFAQ = useCallback(() => {
    haptic?.('light')
    navigate('/support')
  }, [haptic, navigate])

  const handlePaymentClick = useCallback(() => {
    haptic?.('medium')
    setPaymentSheetOpen(true)
  }, [haptic])

  const handleDownloadFiles = useCallback(() => {
    if (!order?.files_url) return
    haptic?.('medium')
    window.open(order.files_url, '_blank', 'noopener,noreferrer')
    showToast({ type: 'success', title: 'Открываем файлы', message: 'Загрузка началась' })
  }, [order, haptic, showToast])

  // Render
  if (loading) {
    return (
      <div className="premium-club-page">
        <LoadingState />
      </div>
    )
  }

  if (!order || error) {
    return (
      <div className="premium-club-page">
        <ErrorState message={error || 'Заказ не найден'} onBack={handleBack} />
      </div>
    )
  }

  return (
    <div className="premium-club-page" style={{ paddingBottom: 100 }}>
      {/* AppBar */}
      <OrderAppBar
        order={order}
        onBack={handleBack}
        onCopyOrderId={handleCopyOrderId}
        onContactManager={handleContactManager}
        onOpenFAQ={handleOpenFAQ}
      />

      {/* Hero Summary */}
      <HeroSummary order={order} countdown={countdown} />

      {/* Placeholder for PaymentSheet and other components */}
      <div
        style={{
          margin: `0 ${DS.space.lg}px`,
          padding: DS.space.xl,
          borderRadius: DS.radius.lg,
          background: DS.colors.bgCard,
          border: `1px dashed ${DS.colors.border}`,
          textAlign: 'center',
        }}
      >
        <p style={{ color: DS.colors.textMuted, fontSize: DS.fontSize.sm, margin: 0 }}>
          Этап 2 завершён<br />
          Далее: PaymentSheet, Files, Manager...
        </p>
        {paymentSheetOpen && (
          <div style={{ marginTop: DS.space.lg }}>
            <p style={{ color: DS.colors.gold, fontSize: DS.fontSize.sm }}>
              PaymentSheet будет здесь (Этап 3)
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaymentSheetOpen(false)}
              style={{
                marginTop: DS.space.md,
                padding: `${DS.space.sm}px ${DS.space.lg}px`,
                borderRadius: DS.radius.sm,
                background: DS.colors.bgElevated,
                border: `1px solid ${DS.colors.border}`,
                color: DS.colors.textSecondary,
                fontSize: DS.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </motion.button>
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      <StickyActionBar
        order={order}
        paymentScheme={paymentScheme}
        onPaymentClick={handlePaymentClick}
        onContactManager={handleContactManager}
        onDownloadFiles={handleDownloadFiles}
      />
    </div>
  )
}

export default OrderDetailPageV8
