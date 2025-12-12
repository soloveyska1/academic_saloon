/**
 * OrderDetailPage V8.0 — Premium Concierge Redesign
 *
 * Полностью переработанный экран детальной карточки заказа
 * для Telegram Mini App академического сервиса.
 *
 * Компоненты:
 * - OrderAppBar: навигация + меню действий + статус-пилюля
 * - HeroSummary: описание заказа, инфо-чипы, countdown оплаты
 * - StickyActionBar: фиксированная CTA-кнопка внизу экрана
 * - PaymentSheet: bottom-sheet с выбором плана и реквизитами
 * - ConfirmPaymentModal: чеклист подтверждения + upload скриншота
 * - TrustSection: чипы гарантий с expand-деталями
 * - VerificationPendingBanner: анимированный баннер проверки
 * - FilesSection: список файлов с download
 * - SupportCard: карточка поддержки (Семён)
 * - GuaranteesRow: grid гарантий (возврат, правки, сроки)
 * - OrderTimeline: визуальная история заказа
 *
 * Ключевые принципы:
 * - Mobile first (320-430px viewport)
 * - State-driven UI на основе OrderStatus
 * - Единая дизайн-система (DS tokens)
 * - Минимум blur/shadow для производительности в WebView
 * - Safe-area insets для iOS
 * - Haptic feedback интеграция
 *
 * @version 8.0.0
 * @route /order-v8/:id
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
  X,
  Zap,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Star,
  Shield,
  ShieldCheck,
  Timer,
  Upload,
  FileImage,
  Trash2,
  Info,
  ChevronDown,
  FileText,
  File,
  Image,
  FileArchive,
  User,
  Send,
  Award,
  RotateCcw,
  CalendarCheck,
  Banknote,
  Circle,
  Package,
  FileCheck,
  Sparkles,
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

// Format deadline to Russian
const formatDeadlineRu = (deadline: string): string => {
  if (!deadline) return ''

  const lower = deadline.toLowerCase().trim()

  // Handle common English words
  if (lower === 'today' || lower === 'сегодня') return 'Сегодня'
  if (lower === 'tomorrow' || lower === 'завтра') return 'Завтра'
  if (lower === 'yesterday' || lower === 'вчера') return 'Вчера'

  // Try to parse as date
  const date = new Date(deadline)
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    })
  }

  // Return as-is if can't parse
  return deadline
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
              Сдать: {formatDeadlineRu(order.deadline)}
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
//                              PAYMENT SHEET
// ═══════════════════════════════════════════════════════════════════════════════

type PaymentMethod = 'card' | 'sbp'

interface PaymentSheetProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  paymentInfo: PaymentInfo | null
  paymentScheme: 'full' | 'half'
  setPaymentScheme: (scheme: 'full' | 'half') => void
  onConfirmPayment: () => void
}

const PaymentSheet = memo(function PaymentSheet({
  isOpen,
  onClose,
  order,
  paymentInfo,
  paymentScheme,
  setPaymentScheme,
  onConfirmPayment,
}: PaymentSheetProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [cardNumberVisible, setCardNumberVisible] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { showToast } = useToast()
  const { haptic } = useTelegram()

  // Calculate amounts
  const fullAmount = order.final_price || 0
  const halfAmount = Math.ceil(fullAmount / 2)
  const remainingAfterHalf = fullAmount - halfAmount
  const todayAmount = paymentScheme === 'full' ? fullAmount : halfAmount

  // Card info from paymentInfo
  const cardNumber = paymentInfo?.card_number || '2200 0000 0000 0000'
  const cardHolder = paymentInfo?.card_holder || 'ПОЛУЧАТЕЛЬ'
  const maskedCard = cardNumber.replace(/(\d{4})\s*(\d{4})\s*(\d{4})\s*(\d{4})/, '$1 •••• •••• $4')

  // Copy handler
  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    haptic?.('light')
    setCopiedField(field)
    showToast({ type: 'success', title: 'Скопировано' })
    setTimeout(() => setCopiedField(null), 2000)
  }, [haptic, showToast])

  // Copy all for card
  const handleCopyAll = useCallback(() => {
    const allText = `Карта: ${cardNumber}\nПолучатель: ${cardHolder}\nСумма: ${todayAmount} ₽\nКомментарий: Заказ #${order.id}`
    navigator.clipboard.writeText(allText)
    haptic?.('medium')
    setCopiedField('all')
    showToast({ type: 'success', title: 'Все данные скопированы' })
    setTimeout(() => setCopiedField(null), 2000)
  }, [cardNumber, cardHolder, todayAmount, order.id, haptic, showToast])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              background: DS.colors.bgSurface,
              borderRadius: `${DS.radius['2xl']}px ${DS.radius['2xl']}px 0 0`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${DS.space.xl}px ${DS.space.lg}px`,
                borderBottom: `1px solid ${DS.colors.border}`,
              }}
            >
              <div>
                <h2 style={{
                  fontSize: DS.fontSize['2xl'],
                  fontWeight: 700,
                  color: DS.colors.textPrimary,
                  margin: 0,
                  fontFamily: 'var(--font-serif)',
                }}>
                  Оплата
                </h2>
                <p style={{
                  fontSize: DS.fontSize.sm,
                  color: DS.colors.textMuted,
                  margin: 0,
                  marginTop: 2,
                }}>
                  Заказ #{order.id}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: DS.radius.md,
                  background: DS.colors.bgElevated,
                  border: `1px solid ${DS.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color={DS.colors.textSecondary} />
              </motion.button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: DS.space.lg }}>

              {/* Step A: Payment Plan Selection */}
              <div style={{ marginBottom: DS.space['2xl'] }}>
                <div style={{
                  fontSize: DS.fontSize.xs,
                  fontWeight: 600,
                  color: DS.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: DS.space.md,
                }}>
                  Шаг 1 · План оплаты
                </div>

                {/* Full Payment Card */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentScheme('full')}
                  style={{
                    width: '100%',
                    padding: DS.space.lg,
                    borderRadius: DS.radius.lg,
                    background: paymentScheme === 'full'
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                      : DS.colors.bgElevated,
                    border: `2px solid ${paymentScheme === 'full' ? DS.colors.gold : DS.colors.border}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: DS.space.md,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        border: `2px solid ${paymentScheme === 'full' ? DS.colors.gold : DS.colors.textMuted}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {paymentScheme === 'full' && (
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            background: DS.colors.gold,
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: DS.fontSize.base, fontWeight: 600, color: DS.colors.textPrimary }}>
                          100% Полная оплата
                        </div>
                        <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted, marginTop: 2 }}>
                          Рекомендуем · Приоритет в работе
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: DS.fontSize.lg,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: paymentScheme === 'full' ? DS.colors.gold : DS.colors.textSecondary,
                    }}>
                      {formatPrice(fullAmount)} ₽
                    </div>
                  </div>
                  {paymentScheme === 'full' && (
                    <div style={{
                      display: 'flex',
                      gap: DS.space.sm,
                      marginTop: DS.space.md,
                      paddingTop: DS.space.md,
                      borderTop: `1px solid ${DS.colors.borderGold}`,
                    }}>
                      <div style={{
                        padding: `${DS.space.xs}px ${DS.space.sm}px`,
                        borderRadius: DS.radius.sm,
                        background: 'rgba(34,197,94,0.15)',
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.success,
                      }}>
                        <Zap size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Быстрый старт
                      </div>
                      <div style={{
                        padding: `${DS.space.xs}px ${DS.space.sm}px`,
                        borderRadius: DS.radius.sm,
                        background: 'rgba(212,175,55,0.15)',
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.gold,
                      }}>
                        <Star size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Приоритет
                      </div>
                    </div>
                  )}
                </motion.button>

                {/* Half Payment Card */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentScheme('half')}
                  style={{
                    width: '100%',
                    padding: DS.space.lg,
                    borderRadius: DS.radius.lg,
                    background: paymentScheme === 'half'
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))'
                      : DS.colors.bgElevated,
                    border: `2px solid ${paymentScheme === 'half' ? DS.colors.info : DS.colors.border}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        border: `2px solid ${paymentScheme === 'half' ? DS.colors.info : DS.colors.textMuted}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {paymentScheme === 'half' && (
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            background: DS.colors.info,
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: DS.fontSize.base, fontWeight: 600, color: DS.colors.textPrimary }}>
                          50% Предоплата
                        </div>
                        <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted, marginTop: 2 }}>
                          Остаток {formatPrice(remainingAfterHalf)} ₽ после готовности
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: DS.fontSize.lg,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: paymentScheme === 'half' ? DS.colors.info : DS.colors.textSecondary,
                    }}>
                      {formatPrice(halfAmount)} ₽
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Step B: Payment Method */}
              <div style={{ marginBottom: DS.space['2xl'] }}>
                <div style={{
                  fontSize: DS.fontSize.xs,
                  fontWeight: 600,
                  color: DS.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: DS.space.md,
                }}>
                  Шаг 2 · Способ оплаты
                </div>

                {/* Segmented Control */}
                <div style={{
                  display: 'flex',
                  gap: DS.space.xs,
                  padding: DS.space.xs,
                  background: DS.colors.bgElevated,
                  borderRadius: DS.radius.md,
                }}>
                  {(['card', 'sbp'] as PaymentMethod[]).map((method) => (
                    <motion.button
                      key={method}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        padding: `${DS.space.md}px ${DS.space.lg}px`,
                        borderRadius: DS.radius.sm,
                        background: paymentMethod === method ? DS.colors.bgCard : 'transparent',
                        border: paymentMethod === method ? `1px solid ${DS.colors.borderLight}` : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: DS.space.sm,
                      }}
                    >
                      {method === 'card' ? (
                        <CreditCard size={16} color={paymentMethod === method ? DS.colors.textPrimary : DS.colors.textMuted} />
                      ) : (
                        <Smartphone size={16} color={paymentMethod === method ? DS.colors.textPrimary : DS.colors.textMuted} />
                      )}
                      <span style={{
                        fontSize: DS.fontSize.base,
                        fontWeight: 600,
                        color: paymentMethod === method ? DS.colors.textPrimary : DS.colors.textMuted,
                      }}>
                        {method === 'card' ? 'Карта' : 'СБП'}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Step C: Payment Details */}
              <div style={{ marginBottom: DS.space['2xl'] }}>
                <div style={{
                  fontSize: DS.fontSize.xs,
                  fontWeight: 600,
                  color: DS.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: DS.space.md,
                }}>
                  Шаг 3 · Реквизиты
                </div>

                {paymentMethod === 'card' ? (
                  <div style={{
                    padding: DS.space.lg,
                    borderRadius: DS.radius.lg,
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.border}`,
                  }}>
                    {/* Card Number */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Номер карты
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.lg,
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                          color: DS.colors.textPrimary,
                          letterSpacing: '0.05em',
                        }}>
                          {cardNumberVisible ? cardNumber : maskedCard}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setCardNumberVisible(!cardNumberVisible)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: DS.radius.sm,
                            background: DS.colors.bgCard,
                            border: `1px solid ${DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {cardNumberVisible ? (
                            <EyeOff size={16} color={DS.colors.textSecondary} />
                          ) : (
                            <Eye size={16} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(cardNumber, 'card')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: DS.radius.sm,
                            background: copiedField === 'card' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'card' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'card' ? (
                            <Check size={16} color={DS.colors.white} />
                          ) : (
                            <Copy size={16} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Card Holder */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Получатель
                      </div>
                      <div style={{
                        fontSize: DS.fontSize.base,
                        color: DS.colors.textPrimary,
                      }}>
                        {cardHolder}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Сумма
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.xl,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: DS.colors.gold,
                        }}>
                          {formatPrice(todayAmount)} ₽
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(todayAmount.toString(), 'amount')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: DS.radius.sm,
                            background: copiedField === 'amount' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'amount' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'amount' ? (
                            <Check size={16} color={DS.colors.white} />
                          ) : (
                            <Copy size={16} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Comment */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Комментарий к переводу
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.base,
                          color: DS.colors.textPrimary,
                        }}>
                          Заказ #{order.id}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(`Заказ #${order.id}`, 'comment')}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: DS.radius.sm,
                            background: copiedField === 'comment' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'comment' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'comment' ? (
                            <Check size={16} color={DS.colors.white} />
                          ) : (
                            <Copy size={16} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Copy All Button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyAll}
                      style={{
                        width: '100%',
                        padding: `${DS.space.md}px ${DS.space.lg}px`,
                        borderRadius: DS.radius.md,
                        background: copiedField === 'all' ? DS.colors.success : 'transparent',
                        border: `1px solid ${copiedField === 'all' ? DS.colors.success : DS.colors.borderLight}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: DS.space.sm,
                      }}
                    >
                      {copiedField === 'all' ? (
                        <Check size={16} color={DS.colors.white} />
                      ) : (
                        <Copy size={16} color={DS.colors.textSecondary} />
                      )}
                      <span style={{
                        fontSize: DS.fontSize.sm,
                        fontWeight: 600,
                        color: copiedField === 'all' ? DS.colors.white : DS.colors.textSecondary,
                      }}>
                        Скопировать всё
                      </span>
                    </motion.button>
                  </div>
                ) : (
                  /* SBP Method - Phone Number */
                  <div style={{
                    padding: DS.space.lg,
                    borderRadius: DS.radius.lg,
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.border}`,
                  }}>
                    {/* SBP Icon */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: DS.space.lg,
                    }}>
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: DS.radius.lg,
                        background: 'linear-gradient(135deg, #7B3FE4, #4F46E5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Smartphone size={32} color={DS.colors.white} />
                      </div>
                    </div>

                    <p style={{
                      fontSize: DS.fontSize.sm,
                      color: DS.colors.textSecondary,
                      marginBottom: DS.space.lg,
                      textAlign: 'center',
                    }}>
                      Переведите по номеру телефона через СБП
                    </p>

                    {/* Phone Number */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Номер телефона
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.xl,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: DS.colors.textPrimary,
                          letterSpacing: '0.02em',
                        }}>
                          +7 (919) 673-91-20
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy('+79196739120', 'sbp_phone')}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: DS.radius.md,
                            background: copiedField === 'sbp_phone' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'sbp_phone' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'sbp_phone' ? (
                            <Check size={18} color={DS.colors.white} />
                          ) : (
                            <Copy size={18} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Банк получателя
                      </div>
                      <div style={{
                        fontSize: DS.fontSize.base,
                        color: DS.colors.textPrimary,
                      }}>
                        Сбербанк · Т-Банк
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ marginBottom: DS.space.lg }}>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Сумма
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.xl,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: DS.colors.gold,
                        }}>
                          {formatPrice(todayAmount)} ₽
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(todayAmount.toString(), 'sbp_amount')}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: DS.radius.md,
                            background: copiedField === 'sbp_amount' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'sbp_amount' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'sbp_amount' ? (
                            <Check size={18} color={DS.colors.white} />
                          ) : (
                            <Copy size={18} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <div style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginBottom: DS.space.xs,
                      }}>
                        Комментарий к переводу
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                        <div style={{
                          flex: 1,
                          fontSize: DS.fontSize.base,
                          color: DS.colors.textPrimary,
                        }}>
                          Заказ #{order.id}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopy(`Заказ #${order.id}`, 'sbp_comment')}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: DS.radius.md,
                            background: copiedField === 'sbp_comment' ? DS.colors.success : DS.colors.bgCard,
                            border: `1px solid ${copiedField === 'sbp_comment' ? DS.colors.success : DS.colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedField === 'sbp_comment' ? (
                            <Check size={18} color={DS.colors.white} />
                          ) : (
                            <Copy size={18} color={DS.colors.textSecondary} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with CTA */}
            <div style={{
              padding: DS.space.lg,
              paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
              borderTop: `1px solid ${DS.colors.border}`,
              background: DS.colors.bgSurface,
            }}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onConfirmPayment}
                style={{
                  width: '100%',
                  padding: `${DS.space.lg}px ${DS.space.xl}px`,
                  borderRadius: DS.radius.lg,
                  background: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: DS.space.sm,
                  boxShadow: '0 8px 24px -4px rgba(212,175,55,0.4)',
                }}
              >
                <CheckCircle2 size={20} color="#0a0a0c" />
                <span style={{
                  fontSize: DS.fontSize.lg,
                  fontWeight: 700,
                  color: '#0a0a0c',
                }}>
                  Я оплатил(а)
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONFIRM PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfirmPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  paymentAmount: number
  onSubmit: () => void
}

interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

const ConfirmPaymentModal = memo(function ConfirmPaymentModal({
  isOpen,
  onClose,
  order,
  paymentAmount,
  onSubmit,
}: ConfirmPaymentModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'amount', label: `Сумма перевода: ${formatPrice(paymentAmount)} ₽`, checked: false },
    { id: 'details', label: 'Реквизиты указаны верно', checked: false },
    { id: 'comment', label: `Комментарий к переводу: Заказ #${order.id}`, checked: false },
  ])
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { haptic } = useTelegram()
  const { showToast } = useToast()

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setChecklist([
        { id: 'amount', label: `Сумма перевода: ${formatPrice(paymentAmount)} ₽`, checked: false },
        { id: 'details', label: 'Реквизиты указаны верно', checked: false },
        { id: 'comment', label: `Комментарий к переводу: Заказ #${order.id}`, checked: false },
      ])
      setScreenshot(null)
      setScreenshotPreview(null)
      setIsSubmitting(false)
    }
  }, [isOpen, paymentAmount, order.id])

  const allChecked = checklist.every((item) => item.checked)

  const toggleItem = (id: string) => {
    haptic?.('light')
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast({ type: 'error', title: 'Файл слишком большой', message: 'Максимум 10 МБ' })
        return
      }
      haptic?.('light')
      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => setScreenshotPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeScreenshot = () => {
    haptic?.('light')
    setScreenshot(null)
    setScreenshotPreview(null)
  }

  const handleSubmit = async () => {
    if (!allChecked) {
      haptic?.('warning')
      showToast({ type: 'warning', title: 'Подтвердите все пункты' })
      return
    }

    haptic?.('medium')
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    onSubmit()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: DS.space.lg,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              maxHeight: '85vh',
              background: DS.colors.bgSurface,
              borderRadius: DS.radius['2xl'],
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DS.space.xl,
                borderBottom: `1px solid ${DS.colors.border}`,
              }}
            >
              <div>
                <h2 style={{
                  fontSize: DS.fontSize['2xl'],
                  fontWeight: 700,
                  color: DS.colors.textPrimary,
                  margin: 0,
                  fontFamily: 'var(--font-serif)',
                }}>
                  Подтверждение
                </h2>
                <p style={{
                  fontSize: DS.fontSize.sm,
                  color: DS.colors.textMuted,
                  margin: 0,
                  marginTop: 4,
                }}>
                  Проверьте данные перед отправкой
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: DS.radius.md,
                  background: DS.colors.bgElevated,
                  border: `1px solid ${DS.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color={DS.colors.textSecondary} />
              </motion.button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: DS.space.xl }}>
              {/* Checklist */}
              <div style={{ marginBottom: DS.space['2xl'] }}>
                <div style={{
                  fontSize: DS.fontSize.xs,
                  fontWeight: 600,
                  color: DS.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: DS.space.md,
                }}>
                  Чеклист подтверждения
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space.sm }}>
                  {checklist.map((item) => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        width: '100%',
                        padding: DS.space.lg,
                        borderRadius: DS.radius.md,
                        background: item.checked
                          ? 'rgba(34,197,94,0.1)'
                          : DS.colors.bgElevated,
                        border: `1px solid ${item.checked ? DS.colors.success + '40' : DS.colors.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: DS.space.md,
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: DS.radius.sm,
                          background: item.checked ? DS.colors.success : 'transparent',
                          border: `2px solid ${item.checked ? DS.colors.success : DS.colors.textMuted}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {item.checked && <Check size={14} color={DS.colors.white} />}
                      </div>
                      <span
                        style={{
                          fontSize: DS.fontSize.base,
                          color: item.checked ? DS.colors.textPrimary : DS.colors.textSecondary,
                          flex: 1,
                        }}
                      >
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload (Optional) */}
              <div>
                <div style={{
                  fontSize: DS.fontSize.xs,
                  fontWeight: 600,
                  color: DS.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: DS.space.sm,
                }}>
                  Скриншот оплаты (опционально)
                </div>
                <p style={{
                  fontSize: DS.fontSize.sm,
                  color: DS.colors.textMuted,
                  marginBottom: DS.space.md,
                }}>
                  Прикрепите для ускорения проверки
                </p>

                {screenshotPreview ? (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: DS.radius.lg,
                      overflow: 'hidden',
                      border: `1px solid ${DS.colors.border}`,
                    }}
                  >
                    <img
                      src={screenshotPreview}
                      alt="Скриншот оплаты"
                      style={{
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'cover',
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={removeScreenshot}
                      style={{
                        position: 'absolute',
                        top: DS.space.sm,
                        right: DS.space.sm,
                        width: 32,
                        height: 32,
                        borderRadius: DS.radius.sm,
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} color={DS.colors.error} />
                    </motion.button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: DS.space.sm,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: DS.space.sm,
                      }}>
                        <FileImage size={14} color={DS.colors.success} />
                        <span style={{
                          fontSize: DS.fontSize.xs,
                          color: DS.colors.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {screenshot?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: DS.space.xl,
                      borderRadius: DS.radius.lg,
                      background: DS.colors.bgElevated,
                      border: `2px dashed ${DS.colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <Upload size={24} color={DS.colors.textMuted} />
                    <span style={{
                      fontSize: DS.fontSize.sm,
                      color: DS.colors.textMuted,
                      marginTop: DS.space.sm,
                    }}>
                      Нажмите для загрузки
                    </span>
                    <span style={{
                      fontSize: DS.fontSize.xs,
                      color: DS.colors.textMuted,
                      marginTop: DS.space.xs,
                    }}>
                      PNG, JPG до 10 МБ
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: DS.space.xl,
                paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
                borderTop: `1px solid ${DS.colors.border}`,
                background: DS.colors.bgSurface,
              }}
            >
              {/* Info note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: DS.space.sm,
                  padding: DS.space.md,
                  borderRadius: DS.radius.md,
                  background: 'rgba(6,182,212,0.1)',
                  border: `1px solid rgba(6,182,212,0.2)`,
                  marginBottom: DS.space.lg,
                }}
              >
                <Timer size={16} color={DS.colors.cyan} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{
                  fontSize: DS.fontSize.sm,
                  color: DS.colors.textSecondary,
                  lineHeight: 1.4,
                }}>
                  После отправки проверка займёт <strong style={{ color: DS.colors.cyan }}>5-15 минут</strong>
                </span>
              </div>

              {/* Submit Button */}
              <motion.button
                whileTap={allChecked && !isSubmitting ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={!allChecked || isSubmitting}
                style={{
                  width: '100%',
                  padding: `${DS.space.lg}px ${DS.space.xl}px`,
                  borderRadius: DS.radius.lg,
                  background: allChecked
                    ? `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`
                    : DS.colors.bgElevated,
                  border: allChecked ? 'none' : `1px solid ${DS.colors.border}`,
                  cursor: allChecked && !isSubmitting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: DS.space.sm,
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: allChecked ? '0 8px 24px -4px rgba(212,175,55,0.4)' : 'none',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} color="#0a0a0c" className="animate-spin" />
                    <span style={{
                      fontSize: DS.fontSize.lg,
                      fontWeight: 700,
                      color: '#0a0a0c',
                    }}>
                      Отправка...
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} color={allChecked ? '#0a0a0c' : DS.colors.textMuted} />
                    <span style={{
                      fontSize: DS.fontSize.lg,
                      fontWeight: 700,
                      color: allChecked ? '#0a0a0c' : DS.colors.textMuted,
                    }}>
                      Отправить на проверку
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              TRUST SECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface TrustChip {
  id: string
  icon: typeof Shield
  label: string
  color: string
  bgColor: string
  details: string
}

const TRUST_CHIPS: TrustChip[] = [
  {
    id: 'secure',
    icon: Shield,
    label: 'Безопасно',
    color: DS.colors.success,
    bgColor: 'rgba(34,197,94,0.12)',
    details: 'Все платежи защищены. Мы не храним данные ваших карт и работаем только с проверенными платёжными системами.',
  },
  {
    id: 'protected',
    icon: ShieldCheck,
    label: 'Гарантия',
    color: DS.colors.info,
    bgColor: 'rgba(59,130,246,0.12)',
    details: 'Возврат средств гарантирован, если работа не соответствует требованиям. Мы работаем по договору.',
  },
  {
    id: 'fast',
    icon: Timer,
    label: '5-15 мин',
    color: DS.colors.purple,
    bgColor: 'rgba(139,92,246,0.12)',
    details: 'Среднее время проверки оплаты — от 5 до 15 минут. После подтверждения работа сразу берётся в исполнение.',
  },
]

interface TrustSectionProps {
  isPaymentFlow?: boolean
}

const TrustSection = memo(function TrustSection({ isPaymentFlow = true }: TrustSectionProps) {
  const [expandedChip, setExpandedChip] = useState<string | null>(null)
  const { haptic } = useTelegram()

  const handleChipClick = (id: string) => {
    haptic?.('light')
    setExpandedChip(expandedChip === id ? null : id)
  }

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Chips Row */}
      <div
        style={{
          display: 'flex',
          gap: DS.space.sm,
          flexWrap: 'wrap',
        }}
      >
        {TRUST_CHIPS.map((chip) => {
          const ChipIcon = chip.icon
          const isExpanded = expandedChip === chip.id

          return (
            <motion.button
              key={chip.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChipClick(chip.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: DS.space.sm,
                padding: `${DS.space.sm}px ${DS.space.md}px`,
                borderRadius: DS.radius.full,
                background: chip.bgColor,
                border: `1px solid ${chip.color}30`,
                cursor: 'pointer',
              }}
            >
              <ChipIcon size={14} color={chip.color} />
              <span
                style={{
                  fontSize: DS.fontSize.sm,
                  fontWeight: 600,
                  color: chip.color,
                }}
              >
                {chip.label}
              </span>
              <ChevronDown
                size={12}
                color={chip.color}
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </motion.button>
          )
        })}
      </div>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expandedChip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {TRUST_CHIPS.filter((c) => c.id === expandedChip).map((chip) => (
              <div
                key={chip.id}
                style={{
                  marginTop: DS.space.md,
                  padding: DS.space.lg,
                  borderRadius: DS.radius.lg,
                  background: chip.bgColor,
                  border: `1px solid ${chip.color}25`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: DS.space.md,
                  }}
                >
                  <Info size={16} color={chip.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p
                    style={{
                      fontSize: DS.fontSize.sm,
                      color: DS.colors.textSecondary,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {chip.details}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              VERIFICATION PENDING BANNER
// ═══════════════════════════════════════════════════════════════════════════════

interface VerificationPendingBannerProps {
  estimatedMinutes?: number
}

const VerificationPendingBanner = memo(function VerificationPendingBanner({
  estimatedMinutes = 15,
}: VerificationPendingBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
        padding: DS.space.lg,
        borderRadius: DS.radius.xl,
        background: `linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))`,
        border: `1px solid rgba(6,182,212,0.25)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: DS.radius.lg,
            background: 'rgba(6,182,212,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Loader2 size={24} color={DS.colors.cyan} className="animate-spin" />
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: DS.fontSize.lg,
              fontWeight: 700,
              color: DS.colors.textPrimary,
              margin: 0,
            }}
          >
            Проверяем оплату
          </h3>
          <p
            style={{
              fontSize: DS.fontSize.sm,
              color: DS.colors.textSecondary,
              margin: 0,
              marginTop: 2,
            }}
          >
            Обычно это занимает {estimatedMinutes} минут
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: DS.space.sm,
          marginTop: DS.space.lg,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: DS.colors.cyan,
            }}
          />
        ))}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              FILES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderFile {
  id: string
  name: string
  size: number
  type: 'pdf' | 'doc' | 'docx' | 'image' | 'archive' | 'other'
  url?: string
  uploadedAt?: string
}

// Utility functions for files
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getFileIcon = (type: OrderFile['type']) => {
  switch (type) {
    case 'pdf':
    case 'doc':
    case 'docx':
      return FileText
    case 'image':
      return Image
    case 'archive':
      return FileArchive
    default:
      return File
  }
}

const getFileColor = (type: OrderFile['type']): string => {
  switch (type) {
    case 'pdf':
      return DS.colors.error
    case 'doc':
    case 'docx':
      return DS.colors.info
    case 'image':
      return DS.colors.purple
    case 'archive':
      return DS.colors.warning
    default:
      return DS.colors.textMuted
  }
}

interface FilesSectionProps {
  order: Order
  onDownloadFile: (file: OrderFile) => void
  onDownloadAll: () => void
}

const FilesSection = memo(function FilesSection({
  order,
  onDownloadFile,
  onDownloadAll,
}: FilesSectionProps) {
  const { haptic } = useTelegram()

  // Parse files from order (mock data structure)
  const files: OrderFile[] = order.files_url
    ? [
        {
          id: '1',
          name: 'Готовая_работа.docx',
          size: 245760,
          type: 'docx',
          url: order.files_url,
        },
      ]
    : []

  // Check if files are available based on status
  const filesAvailable = ['completed', 'review', 'paid', 'paid_full', 'in_progress'].includes(order.status)
  const hasFiles = files.length > 0

  if (!filesAvailable && !hasFiles) return null

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: DS.space.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
          <FileText size={18} color={DS.colors.gold} />
          <span
            style={{
              fontSize: DS.fontSize.lg,
              fontWeight: 700,
              color: DS.colors.textPrimary,
            }}
          >
            Файлы
          </span>
          {hasFiles && (
            <span
              style={{
                padding: `${DS.space.xs}px ${DS.space.sm}px`,
                borderRadius: DS.radius.sm,
                background: 'rgba(212,175,55,0.15)',
                fontSize: DS.fontSize.xs,
                fontWeight: 600,
                color: DS.colors.gold,
              }}
            >
              {files.length}
            </span>
          )}
        </div>

        {hasFiles && files.length > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptic?.('light')
              onDownloadAll()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: DS.space.xs,
              padding: `${DS.space.sm}px ${DS.space.md}px`,
              borderRadius: DS.radius.md,
              background: 'transparent',
              border: `1px solid ${DS.colors.borderGold}`,
              cursor: 'pointer',
            }}
          >
            <Download size={14} color={DS.colors.gold} />
            <span style={{ fontSize: DS.fontSize.sm, color: DS.colors.gold }}>
              Скачать всё
            </span>
          </motion.button>
        )}
      </div>

      {/* Files List */}
      <div
        style={{
          padding: DS.space.lg,
          borderRadius: DS.radius.xl,
          background: DS.colors.bgCard,
          border: `1px solid ${DS.colors.border}`,
        }}
      >
        {hasFiles ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space.sm }}>
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type)
              const fileColor = getFileColor(file.type)

              return (
                <motion.button
                  key={file.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic?.('light')
                    onDownloadFile(file)
                  }}
                  style={{
                    width: '100%',
                    padding: DS.space.md,
                    borderRadius: DS.radius.lg,
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: DS.space.md,
                    textAlign: 'left',
                  }}
                >
                  {/* File Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: DS.radius.md,
                      background: `${fileColor}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileIcon size={22} color={fileColor} />
                  </div>

                  {/* File Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: DS.fontSize.base,
                        fontWeight: 600,
                        color: DS.colors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </div>
                    <div
                      style={{
                        fontSize: DS.fontSize.xs,
                        color: DS.colors.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {formatFileSize(file.size)}
                    </div>
                  </div>

                  {/* Download Icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: DS.radius.sm,
                      background: 'rgba(212,175,55,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Download size={18} color={DS.colors.gold} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: DS.space.xl,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: DS.radius.lg,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: DS.space.md,
              }}
            >
              <FileText size={28} color={DS.colors.textMuted} />
            </div>
            <p
              style={{
                fontSize: DS.fontSize.base,
                color: DS.colors.textSecondary,
                margin: 0,
                marginBottom: DS.space.xs,
              }}
            >
              Файлы появятся здесь
            </p>
            <p
              style={{
                fontSize: DS.fontSize.sm,
                color: DS.colors.textMuted,
                margin: 0,
              }}
            >
              После выполнения работы
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              SUPPORT CARD
// ═══════════════════════════════════════════════════════════════════════════════

// Support contact configuration
const SUPPORT_CONFIG = {
  name: 'Семён',
  role: 'Основатель · Поддержка',
  telegramUsername: 'acadsaloninfo',
  responseTime: '~10 мин',
}

interface SupportCardProps {
  onOpenChat: () => void
}

const SupportCard = memo(function SupportCard({ onOpenChat }: SupportCardProps) {
  const { haptic } = useTelegram()

  const handleTelegramClick = () => {
    haptic?.('medium')
    // Open Telegram link
    window.open(`https://t.me/${SUPPORT_CONFIG.telegramUsername}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DS.space.sm,
          marginBottom: DS.space.md,
        }}
      >
        <MessageCircle size={18} color={DS.colors.gold} />
        <span
          style={{
            fontSize: DS.fontSize.lg,
            fontWeight: 700,
            color: DS.colors.textPrimary,
          }}
        >
          Поддержка
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          padding: DS.space.lg,
          borderRadius: DS.radius.xl,
          background: DS.colors.bgCard,
          border: `1px solid ${DS.colors.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: DS.space.lg }}>
          {/* Avatar */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: DS.radius.lg,
              background: `linear-gradient(135deg, ${DS.colors.gold}30, ${DS.colors.goldDark}20)`,
              border: `2px solid ${DS.colors.borderGold}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: DS.fontSize['2xl'],
                fontWeight: 700,
                color: DS.colors.gold,
                fontFamily: 'var(--font-serif)',
              }}
            >
              С
            </span>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: DS.fontSize.lg,
                fontWeight: 700,
                color: DS.colors.textPrimary,
                marginBottom: 2,
              }}
            >
              {SUPPORT_CONFIG.name}
            </div>
            <div
              style={{
                fontSize: DS.fontSize.sm,
                color: DS.colors.textSecondary,
                marginBottom: DS.space.sm,
              }}
            >
              {SUPPORT_CONFIG.role}
            </div>

            {/* Stats Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.xs }}>
              <Clock size={12} color={DS.colors.success} />
              <span style={{ fontSize: DS.fontSize.xs, color: DS.colors.textSecondary }}>
                Ответ {SUPPORT_CONFIG.responseTime}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: DS.space.sm, marginTop: DS.space.lg }}>
          {/* In-app chat button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic?.('medium')
              onOpenChat()
            }}
            style={{
              flex: 1,
              padding: `${DS.space.md}px ${DS.space.lg}px`,
              borderRadius: DS.radius.lg,
              background: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DS.space.sm,
              boxShadow: '0 4px 12px rgba(212,175,55,0.3)',
            }}
          >
            <MessageCircle size={18} color="#0a0a0c" />
            <span
              style={{
                fontSize: DS.fontSize.base,
                fontWeight: 600,
                color: '#0a0a0c',
              }}
            >
              Написать
            </span>
          </motion.button>

          {/* Telegram button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleTelegramClick}
            style={{
              padding: `${DS.space.md}px ${DS.space.lg}px`,
              borderRadius: DS.radius.lg,
              background: DS.colors.bgElevated,
              border: `1px solid ${DS.colors.borderLight}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DS.space.sm,
            }}
          >
            <Send size={18} color={DS.colors.info} />
            <span
              style={{
                fontSize: DS.fontSize.sm,
                color: DS.colors.textSecondary,
              }}
            >
              @{SUPPORT_CONFIG.telegramUsername}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              GUARANTEES ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface Guarantee {
  id: string
  icon: typeof Shield
  title: string
  description: string
  color: string
}

const GUARANTEES: Guarantee[] = [
  {
    id: 'refund',
    icon: Banknote,
    title: 'Возврат',
    description: 'Полный возврат, если работа не соответствует требованиям',
    color: DS.colors.success,
  },
  {
    id: 'revisions',
    icon: RotateCcw,
    title: 'Правки',
    description: 'Бесплатные доработки до полного соответствия ТЗ',
    color: DS.colors.info,
  },
  {
    id: 'deadline',
    icon: CalendarCheck,
    title: 'Сроки',
    description: 'Гарантируем выполнение точно в указанный срок',
    color: DS.colors.purple,
  },
]

const GuaranteesRow = memo(function GuaranteesRow() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { haptic } = useTelegram()

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DS.space.sm,
          marginBottom: DS.space.md,
        }}
      >
        <Award size={18} color={DS.colors.gold} />
        <span
          style={{
            fontSize: DS.fontSize.lg,
            fontWeight: 700,
            color: DS.colors.textPrimary,
          }}
        >
          Гарантии
        </span>
      </div>

      {/* Guarantees Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: DS.space.sm,
        }}
      >
        {GUARANTEES.map((g) => {
          const Icon = g.icon
          const isExpanded = expandedId === g.id

          return (
            <motion.button
              key={g.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptic?.('light')
                setExpandedId(isExpanded ? null : g.id)
              }}
              style={{
                padding: DS.space.md,
                borderRadius: DS.radius.lg,
                background: isExpanded ? `${g.color}15` : DS.colors.bgCard,
                border: `1px solid ${isExpanded ? `${g.color}40` : DS.colors.border}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: DS.space.xs,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: DS.radius.md,
                  background: `${g.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} color={g.color} />
              </div>
              <span
                style={{
                  fontSize: DS.fontSize.sm,
                  fontWeight: 600,
                  color: DS.colors.textPrimary,
                }}
              >
                {g.title}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Expanded Description */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {GUARANTEES.filter((g) => g.id === expandedId).map((g) => (
              <div
                key={g.id}
                style={{
                  marginTop: DS.space.md,
                  padding: DS.space.lg,
                  borderRadius: DS.radius.lg,
                  background: `${g.color}10`,
                  border: `1px solid ${g.color}25`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: DS.space.md }}>
                  <Info size={16} color={g.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p
                    style={{
                      fontSize: DS.fontSize.sm,
                      color: DS.colors.textSecondary,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {g.description}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              ORDER TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

interface TimelineStep {
  id: string
  label: string
  icon: typeof Circle
  status: 'completed' | 'current' | 'upcoming'
  date?: string
  description?: string
}

const getTimelineSteps = (order: Order): TimelineStep[] => {
  const statusStep = STATUS_CONFIG[order.status]?.step || 0

  const steps: TimelineStep[] = [
    {
      id: 'created',
      label: 'Заказ создан',
      icon: Package,
      status: statusStep >= 0 ? 'completed' : 'upcoming',
      date: order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : undefined,
    },
    {
      id: 'estimated',
      label: 'Оценка',
      icon: Sparkles,
      status: statusStep >= 1 ? (statusStep === 1 ? 'current' : 'completed') : 'upcoming',
      description: statusStep === 1 ? 'Рассчитываем стоимость' : undefined,
    },
    {
      id: 'payment',
      label: 'Оплата',
      icon: CreditCard,
      status: statusStep >= 2 ? (statusStep === 2 ? 'current' : 'completed') : 'upcoming',
      description: statusStep === 2 ? 'Ожидаем оплату' : undefined,
    },
    {
      id: 'work',
      label: 'В работе',
      icon: Loader2,
      status: statusStep >= 3 ? (statusStep === 3 ? 'current' : 'completed') : 'upcoming',
      description: statusStep === 3 ? 'Выполняем заказ' : undefined,
    },
    {
      id: 'review',
      label: 'Проверка',
      icon: FileCheck,
      status: statusStep >= 4 ? (statusStep === 4 ? 'current' : 'completed') : 'upcoming',
      description: statusStep === 4 ? 'Проверьте работу' : undefined,
    },
    {
      id: 'completed',
      label: 'Готово',
      icon: CheckCircle2,
      status: statusStep >= 5 ? 'completed' : 'upcoming',
      date: order.status === 'completed' ? 'Завершён' : undefined,
    },
  ]

  // Handle cancelled/rejected
  if (['cancelled', 'rejected'].includes(order.status)) {
    return steps.map((step) => ({
      ...step,
      status: step.status === 'completed' ? 'completed' : 'upcoming' as const,
    }))
  }

  return steps
}

interface OrderTimelineProps {
  order: Order
}

const OrderTimeline = memo(function OrderTimeline({ order }: OrderTimelineProps) {
  const steps = getTimelineSteps(order)
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)

  return (
    <div
      style={{
        margin: `0 ${DS.space.lg}px`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DS.space.sm,
          marginBottom: DS.space.md,
        }}
      >
        <Clock size={18} color={DS.colors.gold} />
        <span
          style={{
            fontSize: DS.fontSize.lg,
            fontWeight: 700,
            color: DS.colors.textPrimary,
          }}
        >
          Ход выполнения
        </span>
      </div>

      {/* Timeline Card */}
      <div
        style={{
          padding: DS.space.lg,
          borderRadius: DS.radius.xl,
          background: DS.colors.bgCard,
          border: `1px solid ${DS.colors.border}`,
        }}
      >
        {/* Cancelled Banner */}
        {isCancelled && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: DS.space.sm,
              padding: DS.space.md,
              marginBottom: DS.space.lg,
              borderRadius: DS.radius.md,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <XCircle size={16} color={DS.colors.error} />
            <span style={{ fontSize: DS.fontSize.sm, color: DS.colors.error, fontWeight: 600 }}>
              Заказ {order.status === 'cancelled' ? 'отменён' : 'отклонён'}
            </span>
          </div>
        )}

        {/* Steps */}
        <div style={{ position: 'relative' }}>
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isLast = index === steps.length - 1

            // Colors based on status
            const getColors = () => {
              switch (step.status) {
                case 'completed':
                  return {
                    bg: DS.colors.success,
                    border: DS.colors.success,
                    text: DS.colors.textPrimary,
                    line: DS.colors.success,
                  }
                case 'current':
                  return {
                    bg: DS.colors.gold,
                    border: DS.colors.gold,
                    text: DS.colors.textPrimary,
                    line: DS.colors.border,
                  }
                default:
                  return {
                    bg: 'transparent',
                    border: DS.colors.textMuted,
                    text: DS.colors.textMuted,
                    line: DS.colors.border,
                  }
              }
            }

            const colors = getColors()

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  gap: DS.space.md,
                  position: 'relative',
                  paddingBottom: isLast ? 0 : DS.space.lg,
                }}
              >
                {/* Vertical Line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 15,
                      top: 32,
                      width: 2,
                      height: 'calc(100% - 32px)',
                      background: colors.line,
                    }}
                  />
                )}

                {/* Icon Circle */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: DS.radius.full,
                    background: step.status === 'upcoming' ? DS.colors.bgElevated : colors.bg,
                    border: `2px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  {step.status === 'completed' ? (
                    <Check size={16} color={DS.colors.white} />
                  ) : step.status === 'current' ? (
                    <StepIcon
                      size={16}
                      color="#0a0a0c"
                      className={step.icon === Loader2 ? 'animate-spin' : ''}
                    />
                  ) : (
                    <Circle size={12} color={colors.border} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: DS.space.sm,
                    }}
                  >
                    <span
                      style={{
                        fontSize: DS.fontSize.base,
                        fontWeight: step.status === 'current' ? 700 : 500,
                        color: colors.text,
                      }}
                    >
                      {step.label}
                    </span>
                    {step.date && (
                      <span
                        style={{
                          fontSize: DS.fontSize.xs,
                          color: DS.colors.textMuted,
                        }}
                      >
                        {step.date}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p
                      style={{
                        fontSize: DS.fontSize.sm,
                        color: DS.colors.textSecondary,
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

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

  const handleOpenConfirmModal = useCallback(() => {
    haptic?.('medium')
    setPaymentSheetOpen(false)
    setConfirmModalOpen(true)
  }, [haptic])

  // Submit payment confirmation
  const handleSubmitPaymentConfirmation = useCallback(() => {
    haptic?.('success')
    setConfirmModalOpen(false)

    // Optimistically update order status to verification_pending
    if (order) {
      setOrder((prev) =>
        prev ? { ...prev, status: 'verification_pending' as OrderStatus } : prev
      )
    }

    showToast({
      type: 'success',
      title: 'Отправлено на проверку',
      message: 'Мы уведомим вас о результате',
    })
  }, [haptic, order, showToast])

  // Calculate today's payment amount
  const calculateTodayAmount = useCallback((): number => {
    if (!order?.final_price) return 0
    const remaining = order.final_price - (order.paid_amount || 0)
    if (remaining <= 0) return 0

    if (paymentScheme === 'half' && (order.paid_amount || 0) === 0) {
      return Math.ceil(order.final_price / 2)
    }
    return remaining
  }, [order, paymentScheme])

  const todayAmount = calculateTodayAmount()

  // Determine if we're in payment flow
  const isPaymentFlow = ['waiting_payment', 'confirmed'].includes(order?.status || '')
  const isVerificationPending = order?.status === 'verification_pending'

  // Open in-app chat handler
  const handleOpenChat = useCallback(() => {
    haptic?.('medium')
    // Navigate to support page or open chat modal
    navigate('/support')
  }, [haptic, navigate])

  // File handlers
  const handleDownloadFile = useCallback((file: OrderFile) => {
    if (!file.url) return
    haptic?.('light')
    window.open(file.url, '_blank', 'noopener,noreferrer')
    showToast({ type: 'success', title: 'Загрузка начата', message: file.name })
  }, [haptic, showToast])

  const handleDownloadAllFiles = useCallback(() => {
    if (!order?.files_url) return
    haptic?.('medium')
    window.open(order.files_url, '_blank', 'noopener,noreferrer')
    showToast({ type: 'success', title: 'Загрузка всех файлов' })
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

      {/* Verification Pending Banner */}
      {isVerificationPending && <VerificationPendingBanner />}

      {/* Trust Section - показываем для платёжного flow */}
      {(isPaymentFlow || isVerificationPending) && <TrustSection isPaymentFlow={isPaymentFlow} />}

      {/* Files Section */}
      <FilesSection
        order={order}
        onDownloadFile={handleDownloadFile}
        onDownloadAll={handleDownloadAllFiles}
      />

      {/* Support Card */}
      <SupportCard onOpenChat={handleOpenChat} />

      {/* Guarantees Row */}
      <GuaranteesRow />

      {/* Order Timeline */}
      <OrderTimeline order={order} />

      {/* Payment Sheet */}
      <PaymentSheet
        isOpen={paymentSheetOpen}
        onClose={() => setPaymentSheetOpen(false)}
        order={order}
        paymentInfo={paymentInfo}
        paymentScheme={paymentScheme}
        setPaymentScheme={setPaymentScheme}
        onConfirmPayment={handleOpenConfirmModal}
      />

      {/* Sticky Action Bar */}
      <StickyActionBar
        order={order}
        paymentScheme={paymentScheme}
        onPaymentClick={handlePaymentClick}
        onContactManager={handleContactManager}
        onDownloadFiles={handleDownloadFiles}
      />

      {/* Confirm Payment Modal */}
      <ConfirmPaymentModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        order={order}
        paymentAmount={todayAmount}
        onSubmit={handleSubmitPaymentConfirmation}
      />
    </div>
  )
}

export default OrderDetailPageV8
