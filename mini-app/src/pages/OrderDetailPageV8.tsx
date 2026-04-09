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
 * - SupportCard: карточка поддержки (@academicsaloon)
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

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  MoreHorizontal,
  Copy,
  MessageCircle,
  Paperclip,
  HelpCircle,
  Edit3,
  CheckCheck,
  AlertTriangle,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Check,
  Mic,
  MicOff,
  Smartphone,
  ShieldCheck,
  Timer,
  StopCircle,
  Upload,
  FileImage,
  Trash2,
  FileText,
  File,
  Image,
  FileArchive,
  Archive,
  RotateCcw,
  CalendarCheck,
  Package,
  Globe,
  Snowflake,
} from 'lucide-react'
import { Order, OrderStatus, ChatMessage, OrderDeliveryBatch, OrderRevisionRound } from '../types'
import {
  fetchOrderDetail,
  fetchPaymentInfo,
  PaymentInfo,
  archiveOrder,
  unarchiveOrder,
  pauseOrder,
  resumeOrder,
  confirmPayment,
  uploadChatFile,
  uploadVoiceMessage,
  createOnlinePayment,
  cancelOrder,
  fetchOrderMessages,
  requestRevision,
  confirmWorkCompletion,
} from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useWebSocketContext } from '../hooks/useWebSocket'
import { useModalRegistration } from '../contexts/NavigationContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { useToast } from '../components/ui/Toast'
import { SectionErrorBoundary } from '../components/ui/SectionErrorBoundary'
import { ReviewSection } from '../components/order/ReviewSection'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import {
  canonicalizeOrderStatusAlias,
  formatOrderDeadlineRu,
  getOrderHeadlineSafe,
  getOpenRevisionRound,
  isAwaitingPaymentStatus,
  normalizeOrder,
  ORDER_WORK_TYPE_LABELS,
  parseOrderDateSafe,
} from '../lib/orderView'
import s from './OrderDetailPageV8.module.css'
import ps from '../styles/PremiumPageSystem.module.css'

// ═══════════════════════════════════════════════════════════════════════════════
//                              DESIGN SYSTEM V8
// ═══════════════════════════════════════════════════════════════════════════════

const DS = {
  colors: {
    // Gold
    gold: '#D4AF37',
    goldLight: '#f0d35c',
    goldDark: '#b48e26',
    // Semantic
    success: 'var(--success-text)',
    warning: 'var(--warning-text)',
    error: 'var(--error-text)',
    info: 'var(--info-text)',
    purple: 'var(--accent-purple)',
    cyan: '#06b6d4',
    // Neutral
    white: '#ffffff',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',
    // Surfaces
    bgVoid: 'var(--bg-void)',
    bgSurface: 'var(--bg-surface)',
    bgElevated: 'var(--bg-elevated)',
    bgCard: 'var(--bg-card)',
    // Borders
    border: 'var(--border-strong)',
    borderLight: 'rgba(255,255,255,0.12)',
    borderGold: 'var(--border-gold)',
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
  borderColor: string
  icon: typeof Clock
  step: number
}

// Gold monochrome status palette — quiet luxury, no rainbow
const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft:                { label: 'Черновик',         color: 'var(--text-muted)',       bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Clock,        step: 0 },
  pending:              { label: 'На оценке',        color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-medium)', icon: Clock,        step: 1 },
  waiting_estimation:   { label: 'На оценке',        color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-medium)', icon: Clock,        step: 1 },
  waiting_payment:      { label: 'К оплате',         color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-medium)', borderColor: 'var(--gold-glass-medium)', icon: CreditCard,   step: 2 },
  verification_pending: { label: 'Проверяем перевод', color: 'var(--gold-400)',       bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-subtle)', icon: Clock,        step: 2 },
  paid:                 { label: 'Аванс принят',     color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Package,     step: 3 },
  paid_full:            { label: 'В работе',         color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Package,     step: 3 },
  in_progress:          { label: 'В работе',         color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Package,     step: 3 },
  paused:               { label: 'На паузе',         color: 'var(--gold-400)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-medium)', icon: Snowflake,    step: 3 },
  revision:             { label: 'На доработке',     color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-medium)', icon: Clock,        step: 3 },
  review:               { label: 'На проверке',      color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-medium)', icon: Clock,        step: 4 },
  completed:            { label: 'Выполнен',         color: 'var(--success-text)',     bgColor: 'var(--success-glass)',   borderColor: 'var(--success-border)', icon: CheckCircle2, step: 5 },
  cancelled:            { label: 'Отменён',          color: 'var(--error-text)',       bgColor: 'var(--error-glass)',     borderColor: 'var(--error-border)',  icon: XCircle,      step: -1 },
  rejected:             { label: 'Отклонён',         color: 'var(--error-text)',       bgColor: 'var(--error-glass)',     borderColor: 'var(--error-border)',  icon: XCircle,      step: -1 },
}


// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Strip emoji from labels (API sends "🎩 Магистерская" etc.)
const stripEmoji = (text: string): string =>
  text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()

const formatPrice = (amount: number | undefined | null): string => {
  if (amount == null || typeof amount !== 'number' || !Number.isFinite(amount)) return '0'
  return amount.toLocaleString('ru-RU')
}

const pluralizeRu = (value: number, forms: [string, string, string]): string => {
  const abs = Math.abs(value) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

const getOrderTotalPrice = (order: Pick<Order, 'final_price' | 'price'> | null | undefined): number =>
  Math.max(order?.final_price || order?.price || 0, 0)

const getOrderRemainingAmount = (order: Pick<Order, 'final_price' | 'price' | 'paid_amount'> | null | undefined): number =>
  Math.max(getOrderTotalPrice(order) - (order?.paid_amount || 0), 0)

const hasSecondPaymentDue = (
  order: Pick<Order, 'payment_scheme' | 'final_price' | 'price' | 'paid_amount'> | null | undefined,
): boolean => Boolean(
  order &&
  (order.paid_amount || 0) > 0 &&
  getOrderRemainingAmount(order) > 0,
)

const getClientVisibleStatus = (
  order: Pick<Order, 'status' | 'final_price' | 'price' | 'paid_amount' | 'current_revision_round'> | null | undefined,
): OrderStatus => {
  if (!order) return 'pending'
  const status = (canonicalizeOrderStatusAlias(order.status) ?? order.status) as OrderStatus
  if (getOpenRevisionRound(order)) return 'revision'

  const paidAmount = Math.max(order.paid_amount || 0, 0)
  if (paidAmount <= 0) return status

  const remainingAmount = getOrderRemainingAmount(order)
  if (remainingAmount > 0 && ['waiting_payment', 'verification_pending'].includes(status)) {
    return 'paid'
  }

  if (remainingAmount <= 0 && ['waiting_payment', 'verification_pending', 'paid'].includes(status)) {
    return 'paid_full'
  }

  return status
}

async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Use fallback below.
  }

  let textarea: HTMLTextAreaElement | null = null
  try {
    textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    return copied
  } catch {
    return false
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea)
    }
  }
}

const normalizeOrderForView = (order: Order): Order => normalizeOrder(order)

const getLatestDeliveryForView = (order: Order): OrderDeliveryBatch | null => {
  if (order.latest_delivery) {
    return order.latest_delivery
  }
  if (order.delivery_history && order.delivery_history.length > 0) {
    return order.delivery_history[0]
  }
  if (!order.files_url && !order.delivered_at) {
    return null
  }
  return {
    id: 0,
    status: 'sent',
    version_number: null,
    revision_count_snapshot: order.revision_count || 0,
    manager_comment: null,
    source: null,
    files_url: order.files_url,
    file_count: 0,
    created_at: order.delivered_at || null,
    sent_at: order.delivered_at || null,
  }
}

const getOpenRevisionRoundForView = (order: Order | null | undefined): OrderRevisionRound | null =>
  getOpenRevisionRound(order)

const getRevisionHistoryForView = (order: Order | null | undefined): OrderRevisionRound[] => {
  if (!order?.revision_history) return []
  const currentRoundId = getOpenRevisionRoundForView(order)?.id
  return order.revision_history.filter((round) => round.id !== currentRoundId)
}

const getDeliveryBatchByIdForView = (
  order: Order | null | undefined,
  deliveryBatchId: number | null | undefined,
): OrderDeliveryBatch | null => {
  if (!order || !deliveryBatchId) return null

  const batches = [getLatestDeliveryForView(order), ...(order.delivery_history || [])]
  return batches.find((batch) => batch?.id === deliveryBatchId) || null
}

const formatOrderDateTimeCompact = (value: string | null | undefined): string | null => {
  if (!value) return null
  const parsed = parseOrderDateSafe(value)
  if (!parsed) return null

  return parsed.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRevisionRoundLabel = (round: OrderRevisionRound | null | undefined): string =>
  round?.round_number ? `Правка #${round.round_number}` : 'Правка'

const getRevisionRoundActivityLabel = (round: OrderRevisionRound | null | undefined): string | null =>
  formatOrderDateTimeCompact(round?.last_client_activity_at || round?.requested_at)

function SectionFallbackCard({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div
      className="mx-4 mb-4 p-4 rounded-xl border border-white/[0.08]"
      style={{ background: DS.colors.bgCard }}
    >
      <div className="text-[15px] font-bold text-text-primary mb-2">
        {title}
      </div>
      <div className="text-[12px] leading-[1.6] text-text-secondary">
        {message}
      </div>
    </div>
  )
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
    if (!deadline) {
      setResult(null)
      return
    }

    const calculate = (): CountdownResult | null => {
      // Таймер строим от момента последнего обновления заказа в платёжном статусе.
      const target = parseOrderDateSafe(deadline)
      if (!target) return null

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
        ? `${hours} ч ${minutes.toString().padStart(2, '0')} мин`
        : `${minutes} мин ${seconds.toString().padStart(2, '0')} сек`

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
  onArchive: () => void
  onPause: () => void
  onResume: () => void
  canPause: boolean
  canResume: boolean
}

const OrderAppBar = memo(function OrderAppBar({
  order,
  onBack,
  onCopyOrderId,
  onContactManager,
  onOpenFAQ,
  onArchive,
  onPause,
  onResume,
  canPause,
  canResume,
}: OrderAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menuItems = [
    { icon: Copy, label: 'Скопировать номер', onClick: () => { onCopyOrderId(); setMenuOpen(false) } },
    { icon: MessageCircle, label: 'Написать менеджеру', onClick: () => { onContactManager(); setMenuOpen(false) } },
    ...(canPause ? [{ icon: Snowflake, label: 'Поставить на паузу', onClick: () => { onPause(); setMenuOpen(false) } }] : []),
    ...(canResume ? [{ icon: ChevronRight, label: 'Возобновить заказ', onClick: () => { onResume(); setMenuOpen(false) } }] : []),
    { icon: HelpCircle, label: 'Центр помощи', onClick: () => { onOpenFAQ(); setMenuOpen(false) } },
    { icon: Archive, label: order.is_archived ? 'Из архива' : 'В архив', onClick: () => { onArchive(); setMenuOpen(false) } },
  ]

  return (
    <>
      <div className={s.appBarShell}>
        <div className={s.appBarInner}>
          {/* Back Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'transparent', border: 'none' }}
          >
            <ArrowLeft size={20} color="rgba(255,255,255,0.5)" />
          </motion.button>

          {/* Order number — subdued */}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
              Заказ #{order.id}
            </div>
          </div>

          {/* Menu Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'transparent', border: 'none' }}
          >
            <MoreHorizontal size={20} color="rgba(255,255,255,0.4)" />
          </motion.button>
        </div>
      </div>

      <div className={s.appBarSpacer} />

      {/* Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-[200]"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[70px] right-4 rounded-2xl border border-white/[0.12] overflow-hidden min-w-[200px]"
              style={{
                background: DS.colors.bgElevated,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
            >
              {menuItems.map((item, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onClick}
                  className="w-full px-5 py-4 bg-transparent flex items-center gap-3 cursor-pointer text-text-primary text-[14px]"
                  style={{
                    border: 'none',
                    borderBottom: i < menuItems.length - 1 ? `1px solid ${DS.colors.border}` : 'none',
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
  const visibleStatus = getClientVisibleStatus(order)
  const isAwaitingPayment = isAwaitingPaymentStatus(visibleStatus)
  const paymentExpired = Boolean(isAwaitingPayment && countdown?.urgency === 'expired')
  const statusConfig = STATUS_CONFIG[visibleStatus] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const workTypeRaw = order.work_type_label || ORDER_WORK_TYPE_LABELS[order.work_type] || 'Заказ'
  const workTypeLabel = stripEmoji(workTypeRaw)
  const headline = stripEmoji(getOrderHeadlineSafe(order))
  const rawSubject = order.subject?.trim() || ''
  const subject = stripEmoji(rawSubject)
  const totalPrice = order.final_price || order.price || 0
  const paidAmount = Math.max(order.paid_amount || 0, 0)
  const remainingAmount = Math.max(totalPrice - paidAmount, 0)
  const displayPrice = remainingAmount > 0 && remainingAmount !== totalPrice ? remainingAmount : totalPrice
  const priceLabel = remainingAmount > 0 && remainingAmount !== totalPrice ? 'ОСТАЛОСЬ К ОПЛАТЕ' : 'ВАША ЦЕНА'
  const hasPaymentRecorded = paidAmount > 0
  const hasPartialPayment = hasPaymentRecorded && remainingAmount > 0
  const isFullyPaid = hasPaymentRecorded && remainingAmount <= 0
  const pauseUntil = order.pause_until ? new Date(order.pause_until) : null
  const pauseUntilLabel = pauseUntil && !Number.isNaN(pauseUntil.getTime())
    ? pauseUntil.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null
  const pauseRemainingLabel = pauseUntil && !Number.isNaN(pauseUntil.getTime())
    ? (() => {
        const hoursLeft = Math.max(Math.ceil((pauseUntil.getTime() - Date.now()) / (1000 * 60 * 60)), 0)
        if (hoursLeft <= 0) return 'Завершается'
        if (hoursLeft < 24) return `Осталось ${hoursLeft} ч`
        const daysLeft = Math.ceil(hoursLeft / 24)
        if (daysLeft === 1) return 'Остался 1 день'
        if (daysLeft < 5) return `Осталось ${daysLeft} дня`
        return `Осталось ${daysLeft} дней`
      })()
    : 'Активна'
  const paymentPlanLabel = order.payment_scheme === 'half'
    ? 'Схема 50/50'
    : isFullyPaid
      ? 'Оплачено полностью'
      : 'Оплата зафиксирована'
  const paymentHeadline = hasPartialPayment
    ? order.payment_scheme === 'half'
      ? 'Аванс 50% уже зафиксирован'
      : 'Часть суммы уже оплачена'
    : isFullyPaid
      ? 'Оплата зафиксирована полностью'
      : null

  // Countdown urgency color
  const urgencyColor = countdown?.urgency === 'expired' || countdown?.urgency === 'critical'
    ? 'rgba(239,68,68,0.7)' : 'rgba(212,175,55,0.5)'

  // Dot stepper
  const currentStep = statusConfig.step
  const STAGE_RAIL = ['Оценка', 'Оплата', 'Работа', 'Сдача']
  const currentStageIndex = currentStep <= 1
    ? 0
    : currentStep === 2
      ? 1
      : currentStep === 3
        ? 2
        : 3

  return (
    <div style={{ padding: '0 20px', marginBottom: 16 }}>
      {/* ═══ Single unified invoice card ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          padding: '28px 24px 24px',
          borderRadius: 16,
          background: 'linear-gradient(165deg, rgba(212,175,55,0.04) 0%, rgba(20,20,23,0.6) 35%, rgba(20,20,23,0.6) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Top-edge gold highlight */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 24,
            right: 24,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.15) 30%, rgba(212,175,55,0.2) 50%, rgba(212,175,55,0.15) 70%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ─── Row 1: Status pill + Work type ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 12,
              background: statusConfig.bgColor,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            <StatusIcon
              size={11}
              color={statusConfig.color}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: statusConfig.color,
              }}
            >
              {statusConfig.label}
            </span>
          </motion.div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              padding: '5px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {workTypeLabel}
          </span>
        </div>

        {/* ─── Row 2: Headline ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.02em',
              fontFamily: "var(--font-display, 'Manrope', sans-serif)",
            }}
          >
            {headline}
          </div>
          {subject && subject !== headline && (
            <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
              {subject}
            </div>
          )}
        </motion.div>

        {/* ─── Row 3: Price HERO (payment statuses) ─── */}
        {isAwaitingPayment && displayPrice > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: 24 }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: 'rgba(255,255,255,0.25)',
                marginBottom: 4,
              }}
            >
              {priceLabel}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(36px, 9vw, 44px)',
                fontWeight: 700,
                color: '#E8D5A3',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {formatPrice(displayPrice)}{' '}
              <span style={{ fontSize: '0.75em', color: '#E8D5A3' }}>₽</span>
            </div>
          </motion.div>
        )}

        {/* ─── Row 3 alt: Price for non-payment statuses ─── */}
        {!isAwaitingPayment && totalPrice > 0 && (
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {hasPaymentRecorded ? 'Общая стоимость' : 'Стоимость'}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#E8D5A3',
              }}
            >
              {formatPrice(totalPrice)} ₽
            </span>
          </div>
        )}

        {/* ─── Payment breakdown: always show when any payment was already recorded ─── */}
        {hasPaymentRecorded && totalPrice > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              marginTop: 16,
              padding: '16px 16px 14px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(212,175,55,0.10)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {paymentHeadline && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#E8D5A3',
                      marginBottom: 4,
                      lineHeight: 1.25,
                    }}
                  >
                    {paymentHeadline}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  {hasPartialPayment
                    ? 'Клиент видит и уже внесённый аванс, и остаток к финальной доплате без двусмысленности.'
                    : 'Оплата уже подтверждена, заказ можно отслеживать без неясности по финансам.'}
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: '7px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.72)',
                  whiteSpace: 'nowrap',
                }}
              >
                {paymentPlanLabel}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: hasPartialPayment ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {[
                { label: 'Общая сумма', value: `${formatPrice(totalPrice)} ₽`, accent: false },
                {
                  label: hasPartialPayment && order.payment_scheme === 'half' ? 'Аванс внесён' : 'Оплачено',
                  value: `${formatPrice(paidAmount)} ₽`,
                  accent: true,
                },
                ...(hasPartialPayment
                  ? [{ label: 'Остаток', value: `${formatPrice(remainingAmount)} ₽`, accent: false }]
                  : []),
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '12px 12px 11px',
                    borderRadius: 12,
                    background: item.accent ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.accent ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)'}`,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: item.accent ? '#E8D5A3' : 'rgba(255,255,255,0.86)',
                      fontFamily: "'JetBrains Mono', monospace",
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {visibleStatus === 'paused' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              marginTop: 18,
              padding: '16px 16px 14px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(212,175,55,0.14)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(212,175,55,0.10)',
                  border: '1px solid rgba(212,175,55,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Snowflake size={16} color="#E8D5A3" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#E8D5A3', lineHeight: 1.25 }}>
                  Заказ временно на паузе
                </div>
                <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.45)' }}>
                  {pauseUntilLabel
                    ? `Заморозка активна до ${pauseUntilLabel}. Возобновить заказ можно раньше в любой момент.`
                    : 'Заморозка активна. Возобновить заказ можно раньше в любой момент.'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingTop: 10,
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)' }}>
                До автовозобновления
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>
                {pauseRemainingLabel}
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── Row 4: Countdown timer — premium urgency ─── */}
        {isAwaitingPayment && countdown && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: paymentExpired
                ? 'rgba(239,68,68,0.06)'
                : 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))',
              border: `1px solid ${paymentExpired ? 'rgba(239,68,68,0.15)' : 'rgba(212,175,55,0.10)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div
                animate={!paymentExpired ? {
                  scale: [1, 1.15, 1],
                  opacity: [0.7, 1, 0.7],
                } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Clock size={14} color={urgencyColor} />
              </motion.div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.40)' }}>
                {paymentExpired ? 'Срок оплаты истёк' : 'Осталось на оплату'}
              </span>
              {!paymentExpired && (
                <motion.span
                  animate={{
                    textShadow: [
                      '0 0 0 rgba(212,175,55,0)',
                      '0 0 8px rgba(212,175,55,0.35)',
                      '0 0 0 rgba(212,175,55,0)',
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#E8D5A3',
                    marginLeft: 'auto',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {countdown.formatted}
                </motion.span>
              )}
            </div>
            {/* Progress bar — 4px tall with glow */}
            {!paymentExpired && (
              <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${countdown.progress}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${urgencyColor}, ${urgencyColor}cc)`,
                    boxShadow: `0 0 8px ${urgencyColor}40`,
                  }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Row 5: Deadline + stage rail ─── */}
        {currentStep >= 0 && !['cancelled', 'rejected'].includes(order.status) && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Deadline */}
            {order.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} color="rgba(255,255,255,0.25)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                  Срок: {formatOrderDeadlineRu(order.deadline)}
                </span>
              </div>
            )}

            {/* Stage rail */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 148 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.50)',
                }}
              >
                {STAGE_RAIL[currentStageIndex]}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 3, width: '100%' }}>
                {STAGE_RAIL.map((stage, index) => {
                  const isCompleted = index < currentStageIndex
                  const isCurrent = index === currentStageIndex
                  return (
                    <motion.div
                      key={stage}
                      initial={{ opacity: 0, scaleX: 0.5 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ delay: 0.32 + index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: isCompleted
                          ? 'linear-gradient(90deg, rgba(212,175,55,0.60), rgba(212,175,55,0.40))'
                          : isCurrent
                            ? 'linear-gradient(90deg, #E8D5A3, rgba(212,175,55,0.85))'
                            : 'rgba(255,255,255,0.08)',
                        boxShadow: isCurrent ? '0 0 6px rgba(212,175,55,0.25), 0 0 0 1px rgba(212,175,55,0.15)' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ Trust signals — single inline strip, premium feel ═══ */}
      {isAwaitingPayment && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {[
            { icon: ShieldCheck, text: 'Возврат' },
            { icon: RotateCcw, text: 'Безлимит правок' },
            { icon: CalendarCheck, text: 'Точно в срок' },
          ].map((g, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <g.icon size={13} color="rgba(212,175,55,0.55)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.01em' }}>
                {g.text}
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              STICKY ACTION BAR
// ═══════════════════════════════════════════════════════════════════════════════

type ActionBarVariant = 'payment' | 'verification' | 'work' | 'review' | 'completed' | 'cancelled' | 'revision_in_progress' | 'paused'

interface StickyActionBarProps {
  order: Order
  paymentScheme: 'full' | 'half'
  paymentExpired: boolean
  onPaymentClick: () => void
  onContactManager: () => void
  onDownloadFiles: () => void
  onAcceptWork: () => void
  onRequestRevision: () => void
  onResumeOrder: () => void
}

const StickyActionBar = memo(function StickyActionBar({
  order,
  paymentScheme,
  paymentExpired,
  onPaymentClick,
  onContactManager,
  onDownloadFiles,
  onAcceptWork,
  onRequestRevision,
  onResumeOrder,
}: StickyActionBarProps) {
  const visibleStatus = getClientVisibleStatus(order)
  const remainingAmount = getOrderRemainingAmount(order)
  const needsSecondPayment = hasSecondPaymentDue(order)

  // Determine variant based on order status
  const getVariant = (): ActionBarVariant => {
    if (['cancelled', 'rejected'].includes(visibleStatus)) return 'cancelled'
    if (visibleStatus === 'paused') return 'paused'
    if (needsSecondPayment && ['paid', 'in_progress'].includes(visibleStatus)) return 'payment'
    if (isAwaitingPaymentStatus(visibleStatus)) return 'payment'
    if (visibleStatus === 'verification_pending') return 'verification'
    if (visibleStatus === 'revision') return 'revision_in_progress'
    if (['paid', 'paid_full', 'in_progress'].includes(visibleStatus)) return 'work'
    if (visibleStatus === 'review') return 'review'
    if (visibleStatus === 'completed') return 'completed'
    return 'work'
  }

  const variant = getVariant()

  // Calculate amount to pay today
  const calculateTodayAmount = (): number => {
    if (!order.final_price) return 0
    const remaining = remainingAmount
    if (remaining <= 0) return 0

    if (needsSecondPayment) {
      return remaining
    }

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
    payment: paymentExpired ? {
      showAmount: false,
      buttonText: 'Связаться с поддержкой',
      buttonIcon: MessageCircle,
      buttonColor: DS.colors.textPrimary,
      buttonBg: DS.colors.bgElevated,
      disabled: false,
      onClick: onContactManager,
    } : {
      showAmount: true,
      buttonText: needsSecondPayment ? 'Оплатить остаток' : 'Перейти к оплате',
      buttonIcon: ChevronRight,
      buttonColor: 'var(--text-on-gold)',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: false,
      onClick: onPaymentClick,
    },
    verification: {
      showAmount: false,
      buttonText: 'Подтверждаем перевод',
      buttonIcon: Clock,
      buttonColor: '#E8D5A3',
      buttonBg: 'rgba(212,175,55,0.08)',
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
      buttonText: '__split__', // special marker for split buttons
      buttonIcon: CheckCircle2,
      buttonColor: 'var(--text-on-gold)',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: false,
      onClick: onAcceptWork,
    },
    completed: {
      showAmount: false,
      buttonText: 'Скачать файлы',
      buttonIcon: Download,
      buttonColor: 'var(--text-on-gold)',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: !order.files_url,
      onClick: onDownloadFiles,
    },
    revision_in_progress: {
      showAmount: false,
      buttonText: `На доработке · правка #${(order.revision_count || 0)}`,
      buttonIcon: Edit3,
      buttonColor: '#E8D5A3',
      buttonBg: 'rgba(212,175,55,0.08)',
      disabled: true,
      onClick: () => {},
    },
    paused: {
      showAmount: false,
      buttonText: 'Возобновить заказ',
      buttonIcon: ChevronRight,
      buttonColor: 'var(--text-on-gold)',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: false,
      onClick: onResumeOrder,
    },
    cancelled: {
      showAmount: false,
      buttonText: 'Заказ отменён',
      buttonIcon: XCircle,
      buttonColor: DS.colors.error,
      buttonBg: 'var(--error-glass)',
      disabled: true,
      onClick: () => {},
    },
  }

  const config = variantConfig[variant]
  const ButtonIcon = config.buttonIcon

  const revisionCount = order.revision_count || 0
  const latestDelivery = getLatestDeliveryForView(order)
  const latestDeliveryUrl = latestDelivery?.files_url || order.files_url || null
  const openRevisionRound = getOpenRevisionRoundForView(order)
  const revisionActivityLabel = getRevisionRoundActivityLabel(openRevisionRound)

  // Don't show for cancelled/rejected and statuses without real CTA
  if (['cancelled', 'work'].includes(variant)) return null

  // Review state: split into two buttons (Accept + Request Revision) (Accept + Request Revision)
  if (variant === 'review') {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[90] pt-3 px-4 backdrop-blur-[12px]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 20%, var(--bg-void) 100%)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className={s.floatingBarInner}>
          {latestDelivery && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 10px',
              borderRadius: 10,
              marginBottom: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E8D5A3', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {latestDelivery.version_number ? `Версия ${latestDelivery.version_number}` : 'Последняя выдача'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  {latestDelivery.sent_at || latestDelivery.created_at
                    ? new Date(latestDelivery.sent_at || latestDelivery.created_at || '').toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Файлы уже доступны в заказе'}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onDownloadFiles}
                disabled={!latestDeliveryUrl}
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(212,175,55,0.16)',
                  background: 'rgba(212,175,55,0.08)',
                  color: '#E8D5A3',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: latestDeliveryUrl ? 'pointer' : 'default',
                  opacity: latestDeliveryUrl ? 1 : 0.45,
                }}
              >
                Скачать версию
              </motion.button>
            </div>
          )}

          {/* Revision counter */}
          {revisionCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginBottom: 8,
            }}>
              <Edit3 size={12} color="rgba(212,175,55,0.5)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {`Запросов на правки: ${revisionCount}`}
              </span>
            </div>
          )}

          {/* Half-payment notice */}
          {needsSecondPayment && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, marginBottom: 8,
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.1)',
            }}>
              <AlertTriangle size={13} color="rgba(212,175,55,0.5)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                Для получения полной работы оплатите оставшиеся{' '}
                <strong style={{ color: '#E8D5A3' }}>
                  {formatPrice(remainingAmount)} ₽
                </strong>
              </span>
            </div>
          )}

          {/* Split buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Request Revision */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onRequestRevision}
              style={{
                flex: '0 0 auto',
                height: 50,
                padding: '0 16px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Edit3 size={16} />
              Запросить правки
            </motion.button>

            {/* Accept Work */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={needsSecondPayment ? onPaymentClick : onAcceptWork}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 12,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                background: needsSecondPayment
                  ? `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`
                  : `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
                boxShadow: needsSecondPayment
                  ? '0 8px 28px -4px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 8px 28px -4px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                color: 'var(--text-on-gold)',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {needsSecondPayment ? (
                <>
                  <CreditCard size={18} />
                  Оплатить и получить
                </>
              ) : (
                <>
                  <CheckCheck size={18} />
                  Принять работу
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (variant === 'revision_in_progress') {
    const revisionLabel = openRevisionRound ? getRevisionRoundLabel(openRevisionRound) : `Правка #${Math.max(1, revisionCount)}`

    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[90] pt-3 px-4 backdrop-blur-[12px]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 20%, var(--bg-void) 100%)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className={s.floatingBarInner}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              marginBottom: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#E8D5A3', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {revisionLabel} активна
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.74)', marginTop: 4 }}>
                  {revisionActivityLabel
                    ? `Последняя активность ${revisionActivityLabel}`
                    : 'Комментарий уже отправлен. Можно докинуть материалы в чат заказа.'}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onRequestRevision}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(212,175,55,0.18)',
                  background: 'rgba(212,175,55,0.08)',
                  color: '#E8D5A3',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Комментарий
              </motion.button>
            </div>

            {openRevisionRound?.initial_comment && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.56)',
                }}
              >
                {openRevisionRound.initial_comment}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {latestDelivery?.version_number ? (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.12)',
                    fontSize: 11,
                    color: '#E8D5A3',
                  }}
                >
                  После версии {latestDelivery.version_number}
                </span>
              ) : null}
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.58)',
                }}
              >
                Файлы и голосовые можно дослать в чате
              </span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onContactManager}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #f0d35c, #D4AF37, #b48e26)',
              color: '#121212',
              boxShadow: '0 12px 32px -10px rgba(212,175,55,0.4)',
              border: 'none',
            }}
          >
            <MessageCircle size={18} />
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              Открыть чат и дослать материалы
            </span>
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[90] pt-4 px-4 backdrop-blur-[12px]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
        background: 'linear-gradient(180deg, transparent 0%, var(--bg-void) 20%, var(--bg-void) 100%)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className={s.floatingBarInner} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Left: Amount to pay */}
        {config.showAmount && todayAmount > 0 && (
          <div className="flex-none">
            <div className="text-[11px] text-text-muted mb-0.5">
              К оплате сегодня
            </div>
            <div className="text-[18px] font-bold font-mono text-gold-400">
              {formatPrice(todayAmount)} ₽
            </div>
          </div>
        )}

        {/* Right: Action Button — THE MONEY BUTTON */}
        <motion.button
          whileTap={config.disabled ? undefined : { scale: 0.97 }}
          onClick={config.onClick}
          disabled={config.disabled}
          className="flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold"
          style={{
            flex: config.showAmount ? '1 1 auto' : '1 1 100%',
            height: variant === 'payment' ? 56 : 52,
            padding: variant === 'payment' ? '0 24px' : '0 20px',
            background: variant === 'payment'
              ? 'linear-gradient(135deg, #f5e27a 0%, #D4AF37 40%, #b48e26 100%)'
              : config.buttonBg,
            border: variant === 'work' ? `1px solid ${DS.colors.borderLight}`
              : variant === 'verification' ? '1px solid rgba(212,175,55,0.12)'
              : 'none',
            color: config.buttonColor,
            cursor: config.disabled ? 'default' : 'pointer',
            opacity: config.disabled && variant !== 'verification' ? 0.6 : 1,
            boxShadow: variant === 'payment'
              ? '0 6px 24px -4px rgba(212,175,55,0.50), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1)'
              : ['completed'].includes(variant)
                ? '0 8px 28px -4px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'none',
            fontSize: variant === 'payment' ? 16 : 15,
            fontWeight: 700,
            letterSpacing: variant === 'payment' ? '-0.01em' : undefined,
          }}
        >
          <ButtonIcon size={variant === 'payment' ? 22 : 20} />
          {config.buttonText}
        </motion.button>
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              PAYMENT SHEET
// ═══════════════════════════════════════════════════════════════════════════════

type PaymentMethod = 'card' | 'sbp' | 'online'

interface PaymentSheetProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  paymentInfo: PaymentInfo | null
  paymentMethod: PaymentMethod
  paymentScheme: 'full' | 'half'
  setPaymentMethod: (method: PaymentMethod) => void
  setPaymentScheme: (scheme: 'full' | 'half') => void
  onConfirmPayment: () => void
  onOnlinePayment: () => void
  onlinePaymentLoading: boolean
}

const PaymentSheet = memo(function PaymentSheet({
  isOpen,
  onClose,
  order,
  paymentInfo,
  paymentMethod,
  paymentScheme,
  setPaymentMethod,
  setPaymentScheme,
  onConfirmPayment,
  onOnlinePayment,
  onlinePaymentLoading,
}: PaymentSheetProps) {
  const [cardNumberVisible, setCardNumberVisible] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { showToast } = useToast()
  const { haptic } = useTelegram()
  useModalRegistration(isOpen, 'order-payment-sheet')

  // Calculate amounts
  const fullAmount = getOrderTotalPrice(order)
  const halfAmount = Math.ceil(fullAmount / 2)
  const remainingAfterHalf = fullAmount - halfAmount
  const remainingAmount = Math.max(paymentInfo?.remaining ?? getOrderRemainingAmount(order), 0)
  const isSecondPayment = hasSecondPaymentDue(order)
  const todayAmount = isSecondPayment ? remainingAmount : paymentScheme === 'full' ? fullAmount : halfAmount
  const hasPaymentInfo = Boolean(paymentInfo)
  const paymentMethodCaption = paymentMethod === 'online' ? 'Оплата онлайн' : paymentMethod === 'card' ? 'Реквизиты карты' : 'Реквизиты СБП'
  const todayAmountLabel = isSecondPayment
    ? 'К оплате сейчас'
    : paymentScheme === 'half'
      ? 'Аванс к оплате'
      : 'К оплате сейчас'
  const summaryBadge = isSecondPayment
    ? 'Доплата'
    : paymentScheme === 'half'
      ? 'Аванс 50%'
      : 'Полная сумма'

  // Card info from paymentInfo
  const cardNumber = paymentInfo?.card_number || '2200 0000 0000 0000'
  const cardHolder = paymentInfo?.card_holder || 'ПОЛУЧАТЕЛЬ'
  // Copy handler
  const handleCopy = useCallback(async (text: string, field: string) => {
    const copied = await copyTextSafely(text)
    if (!copied) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Не удалось скопировать' })
      return
    }
    haptic?.('light')
    setCopiedField(field)
    showToast({ type: 'success', title: 'Скопировано' })
    setTimeout(() => setCopiedField(null), 2000)
  }, [haptic, showToast])

  // Copy all for card
  const handleCopyAll = useCallback(async () => {
    const allText = paymentMethod === 'sbp'
      ? `Телефон: ${paymentInfo?.sbp_phone || '—'}\nБанк: ${paymentInfo?.sbp_bank || '—'}\nСумма: ${todayAmount} ₽\nКомментарий: Заказ #${order.id}`
      : `Карта: ${cardNumber}\nПолучатель: ${cardHolder}\nСумма: ${todayAmount} ₽\nКомментарий: Заказ #${order.id}`
    const copied = await copyTextSafely(allText)
    if (!copied) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Не удалось скопировать реквизиты' })
      return
    }
    haptic?.('medium')
    setCopiedField('all')
    showToast({ type: 'success', title: 'Все данные скопированы' })
    setTimeout(() => setCopiedField(null), 2000)
  }, [cardNumber, cardHolder, todayAmount, order.id, paymentInfo?.sbp_bank, paymentInfo?.sbp_phone, paymentMethod, haptic, showToast])

  if (!isOpen) return null

  // Unified field renderer for card/SBP — tap-to-copy on entire row
  const renderField = (label: string, value: string, fieldKey: string, options?: {
    mono?: boolean
    gold?: boolean
    toggleVisibility?: boolean
    isVisible?: boolean
    onToggle?: () => void
    large?: boolean
    last?: boolean
  }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => handleCopy(value, fieldKey)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: options?.last ? 'none' : '1px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left' as const,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: options?.large ? 16 : 14,
            fontWeight: options?.mono ? 600 : 500,
            fontFamily: options?.mono ? "'JetBrains Mono', monospace" : 'inherit',
            color: options?.gold ? '#E8D5A3' : 'rgba(255,255,255,0.85)',
            letterSpacing: options?.mono ? '0.02em' : 'normal',
          }}
        >
          {options?.toggleVisibility && !options.isVisible
            ? value.replace(/(\d{4})\s*(\d{4})\s*(\d{4})\s*(\d{4})/, '$1 •••• •••• $4')
            : value
          }
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {options?.toggleVisibility && (
          <motion.div
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); options.onToggle?.() }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            {options.isVisible
              ? <EyeOff size={14} color="rgba(255,255,255,0.3)" />
              : <Eye size={14} color="rgba(255,255,255,0.3)" />
            }
          </motion.div>
        )}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: copiedField === fieldKey ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
            transition: 'background 0.2s',
          }}
        >
          {copiedField === fieldKey
            ? <Check size={14} color="rgba(212,175,55,0.8)" />
            : <Copy size={14} color="rgba(255,255,255,0.25)" />
          }
        </div>
      </div>
    </motion.button>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[300] flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className={s.sheetShell}
            style={{
              background: DS.colors.bgSurface,
              borderRadius: `${DS.radius['2xl']}px ${DS.radius['2xl']}px 0 0`,
            }}
          >
            {/* ─── Header ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 20px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
                  {isSecondPayment ? 'Доплата' : 'Оплата'}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  Заказ #{order.id}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <X size={18} color="rgba(255,255,255,0.4)" />
              </motion.button>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div className={s.sheetScroll}>

              <div className={s.sheetSection}>
                <div className={s.sheetSummary}>
                  <div>
                    <div className={s.sheetCaption}>{todayAmountLabel}</div>
                    <div className={s.sheetSummaryValue}>{formatPrice(todayAmount)} ₽</div>
                    <div className={s.sheetSummaryText}>
                      {isSecondPayment
                        ? 'Аванс уже внесён. Сейчас оплачивается только остаток.'
                        : paymentScheme === 'half'
                          ? `Остаток ${formatPrice(remainingAfterHalf)} ₽ оплачивается позже.`
                          : 'Сумма переводится одним платежом.'}
                    </div>
                  </div>
                  <div className={s.sheetBadge}>{summaryBadge}</div>
                </div>

                {!isSecondPayment ? (
                  <div className={s.sheetSegment}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPaymentScheme('full')}
                      className={`${s.sheetSegmentButton} ${paymentScheme === 'full' ? s.sheetSegmentButtonActive : ''}`}
                    >
                      <div className={s.sheetSegmentLabel}>Полностью</div>
                      <div className={s.sheetSegmentValue}>{formatPrice(fullAmount)} ₽</div>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPaymentScheme('half')}
                      className={`${s.sheetSegmentButton} ${paymentScheme === 'half' ? s.sheetSegmentButtonActive : ''}`}
                    >
                      <div className={s.sheetSegmentLabel}>50% аванс</div>
                      <div className={s.sheetSegmentValue}>{formatPrice(halfAmount)} ₽</div>
                    </motion.button>
                  </div>
                ) : null}
              </div>

              <div className={s.sheetSection}>
                <div className={s.sheetCaption}>Способ оплаты</div>
                <div className={s.sheetSegment}>
                  {(['online', 'card', 'sbp'] as PaymentMethod[]).map((method) => {
                    const isActive = paymentMethod === method
                    const label = method === 'online' ? 'Онлайн' : method === 'card' ? 'Карта' : 'СБП'
                    const Icon = method === 'online' ? Globe : method === 'card' ? CreditCard : Smartphone
                    return (
                      <motion.button
                        key={method}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPaymentMethod(method)}
                        className={`${s.sheetSegmentButton} ${isActive ? s.sheetSegmentButtonActive : ''}`}
                        style={{
                          paddingTop: 10,
                          paddingBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          textAlign: 'center',
                        }}
                      >
                        <Icon size={14} color={isActive ? '#E8D5A3' : 'rgba(255,255,255,0.3)'} />
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isActive ? '#E8D5A3' : 'rgba(255,255,255,0.35)',
                        }}>
                          {label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <div className={s.sheetSection}>
                <div className={s.sheetCaption}>{paymentMethodCaption}</div>
                {paymentMethod === 'online' ? (
                  <div className={s.sheetPanel} style={{ padding: '18px 18px 17px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <ShieldCheck size={18} color="rgba(212,175,55,0.5)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
                        Оплата через ЮKassa
                      </span>
                    </div>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#E8D5A3',
                      letterSpacing: '-0.02em',
                      marginBottom: 6,
                    }}>
                      {formatPrice(todayAmount)} ₽
                    </div>
                    <div className={s.sheetFootnote}>
                      Откроется защищённая страница оплаты. Данные карты здесь не хранятся.
                    </div>
                  </div>
                ) : paymentMethod === 'card' ? (
                  <div className={s.sheetPanel}>
                    <div className={s.sheetFieldsHeader}>
                      <span className={s.sheetFieldsTitle}>Перевод по карте</span>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopyAll}
                        className={s.sheetSecondaryButton}
                      >
                        {copiedField === 'all'
                          ? <Check size={12} color="rgba(212,175,55,0.8)" />
                          : <Copy size={12} color="rgba(255,255,255,0.28)" />
                        }
                        {copiedField === 'all' ? 'Скопировано' : 'Скопировать всё'}
                      </motion.button>
                    </div>
                    <div className={s.sheetFieldBody}>
                      {renderField('Номер карты', cardNumber, 'card', {
                        mono: true,
                        large: true,
                        toggleVisibility: true,
                        isVisible: cardNumberVisible,
                        onToggle: () => setCardNumberVisible(!cardNumberVisible),
                      })}
                      {renderField('Получатель', cardHolder, 'holder')}
                      {renderField('Сумма', `${formatPrice(todayAmount)} ₽`, 'amount', { mono: true, gold: true, large: true })}
                      {renderField('Комментарий', `Заказ #${order.id}`, 'comment', { last: true })}
                    </div>
                  </div>
                ) : (
                  <div className={s.sheetPanel}>
                    <div className={s.sheetFieldsHeader}>
                      <span className={s.sheetFieldsTitle}>Перевод по СБП</span>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopyAll}
                        className={s.sheetSecondaryButton}
                      >
                        {copiedField === 'all'
                          ? <Check size={12} color="rgba(212,175,55,0.8)" />
                          : <Copy size={12} color="rgba(255,255,255,0.28)" />
                        }
                        {copiedField === 'all' ? 'Скопировано' : 'Скопировать всё'}
                      </motion.button>
                    </div>
                    <div className={s.sheetFieldBody}>
                      {renderField(
                        'Номер телефона',
                        paymentInfo?.sbp_phone
                          ? paymentInfo.sbp_phone.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1$2) $3-$4-$5')
                          : '—',
                        'sbp_phone',
                        { mono: true, large: true }
                      )}
                      {renderField('Банк получателя', paymentInfo?.sbp_bank || '—', 'sbp_bank')}
                      {renderField('Сумма', `${formatPrice(todayAmount)} ₽`, 'sbp_amount', { mono: true, gold: true, large: true })}
                      {renderField('Комментарий', `Заказ #${order.id}`, 'sbp_comment', { last: true })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Footer CTA (always visible) ─── */}
            <div
              style={{
                padding: '16px 20px',
                paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: DS.colors.bgSurface,
              }}
            >
              {!hasPaymentInfo && paymentMethod !== 'online' && (
                <div className={s.sheetFootnote} style={{ textAlign: 'center', marginBottom: 12 }}>
                  Реквизиты загружаются...
                </div>
              )}
              <motion.button
                whileTap={(!hasPaymentInfo && paymentMethod !== 'online') || onlinePaymentLoading ? undefined : { scale: 0.98 }}
                onClick={
                  paymentMethod === 'online'
                    ? (onlinePaymentLoading ? undefined : onOnlinePayment)
                    : (hasPaymentInfo ? onConfirmPayment : undefined)
                }
                disabled={paymentMethod === 'online' ? onlinePaymentLoading : !hasPaymentInfo}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: (paymentMethod === 'online' ? !onlinePaymentLoading : hasPaymentInfo) ? 'pointer' : 'not-allowed',
                  background: (paymentMethod === 'online' ? !onlinePaymentLoading : hasPaymentInfo)
                    ? 'linear-gradient(135deg, #f0d35c, #D4AF37, #b48e26)'
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: (paymentMethod === 'online' ? !onlinePaymentLoading : hasPaymentInfo)
                    ? '0 8px 28px -4px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : 'none',
                }}
              >
                {onlinePaymentLoading ? (
                  <Loader2 size={20} color="rgba(255,255,255,0.4)" className="animate-spin" />
                ) : paymentMethod === 'online' ? (
                  <Globe size={18} color="#121212" />
                ) : (
                  <CheckCircle2 size={18} color={hasPaymentInfo ? '#121212' : 'rgba(255,255,255,0.3)'} />
                )}
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: onlinePaymentLoading
                    ? 'rgba(255,255,255,0.4)'
                    : (paymentMethod === 'online' ? !onlinePaymentLoading : hasPaymentInfo)
                      ? '#121212'
                      : 'rgba(255,255,255,0.3)',
                }}>
                  {onlinePaymentLoading
                    ? 'Создаём платёж...'
                    : paymentMethod === 'online'
                      ? (isSecondPayment ? 'Оплатить остаток' : 'Перейти к оплате')
                      : (isSecondPayment ? 'Подтвердить доплату' : 'Подтвердить перевод')
                  }
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
  onSubmit: (receipt: File | null) => Promise<void>
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
    { id: 'amount', label: `Сумма: ${formatPrice(paymentAmount)} ₽`, checked: false },
    { id: 'details', label: 'Реквизиты верны', checked: false },
    { id: 'comment', label: `Комментарий: Заказ #${order.id}`, checked: false },
  ])
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { haptic } = useTelegram()
  const { showToast } = useToast()
  useModalRegistration(isOpen, 'order-confirm-payment-modal')

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setChecklist([
        { id: 'amount', label: `Сумма: ${formatPrice(paymentAmount)} ₽`, checked: false },
        { id: 'details', label: 'Реквизиты верны', checked: false },
        { id: 'comment', label: `Комментарий: Заказ #${order.id}`, checked: false },
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
      showToast({ type: 'info', title: 'Подтвердите все пункты' })
      return
    }

    haptic?.('medium')
    setIsSubmitting(true)
    try {
      await onSubmit(screenshot)
    } catch (err) {
      haptic?.('error')
      showToast({
        type: 'error',
        title: 'Не удалось отправить подтверждение',
        message: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const checkedCount = checklist.filter(i => i.checked).length
  const totalCount = checklist.length
  const remainingChecks = totalCount - checkedCount
  const submitLabel = allChecked
    ? 'Отправить на проверку'
    : checkedCount === 0
      ? 'Проверьте перевод'
      : `Остался ${remainingChecks} ${pluralizeRu(remainingChecks, ['пункт', 'пункта', 'пунктов'])}`

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[400] flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className={s.sheetShellCompact}
            style={{
              background: DS.colors.bgSurface,
              borderRadius: '24px 24px 0 0',
            }}
          >
            {/* ─── Header ─── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0, letterSpacing: '-0.01em' }}>
                  Подтверждение оплаты
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>
                  {formatPrice(paymentAmount)} ₽ · Заказ #{order.id}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'transparent', border: 'none',
                }}
              >
                <X size={16} color="rgba(255,255,255,0.3)" />
              </motion.button>
            </div>

            {/* ─── Content ─── */}
            <div className={s.sheetScroll}>
              <div className={s.sheetSection}>
                <div className={s.sheetCaption}>
                  Проверьте перед отправкой
                </div>

                <div style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {checklist.map((item, idx) => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'left' as const,
                        background: item.checked ? 'rgba(34,197,94,0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: idx < totalCount - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Rounded-square checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.checked ? 'rgba(34,197,94,0.9)' : 'transparent',
                        border: `1.5px solid ${item.checked ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.18)'}`,
                        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}>
                        {item.checked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <Check size={11} color="#fff" strokeWidth={2.5} />
                          </motion.div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: item.checked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
                        flex: 1,
                        transition: 'color 0.2s',
                      }}>
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className={s.sheetSection}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={s.sheetCaption} style={{ margin: 0 }}>
                    Скриншот оплаты
                  </div>
                  <span className={s.sheetBadge} style={{ padding: '5px 8px', fontSize: 9, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.04em' }}>
                    Необязательно
                  </span>
                </div>

                <div className={s.sheetFootnote}>
                  Если перевод уже виден в банке, можно отправить подтверждение и без файла.
                </div>

                <div>
                  {screenshotPreview ? (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <img
                        src={screenshotPreview}
                        alt="Скриншот"
                        loading="lazy"
                        style={{ width: '100%', maxHeight: 160, objectFit: 'cover' as const }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={removeScreenshot}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(0,0,0,0.7)', border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} color="rgba(239,68,68,0.8)" />
                      </motion.button>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '6px 10px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <FileImage size={11} color="rgba(212,175,55,0.7)" />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {screenshot?.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload size={16} color="rgba(255,255,255,0.2)" />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                          Загрузить скриншот
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 1 }}>
                          PNG, JPG до 10 МБ
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Footer ─── */}
            <div style={{
              padding: '14px 20px',
              paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: DS.colors.bgSurface,
            }}>
              <div className={s.sheetFootnote} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Timer size={13} color="rgba(212,175,55,0.45)" />
                <span>
                  Проверка обычно занимает <strong style={{ color: 'rgba(228,213,163,0.85)', fontWeight: 600 }}>5–15 минут</strong>
                </span>
              </div>

              <motion.button
                whileTap={allChecked && !isSubmitting ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={!allChecked || isSubmitting}
                style={{
                  width: '100%',
                  height: 50,
                  borderRadius: 12,
                  border: allChecked ? 'none' : `1px solid rgba(212,175,55,${0.06 + 0.04 * checkedCount})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  position: 'relative' as const,
                  overflow: 'hidden',
                  cursor: allChecked && !isSubmitting ? 'pointer' : 'not-allowed',
                  background: allChecked
                    ? 'linear-gradient(135deg, #f0d35c, #D4AF37, #b48e26)'
                    : `rgba(212,175,55,${0.03 + 0.02 * checkedCount})`,
                  boxShadow: allChecked
                    ? '0 4px 20px -4px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : 'none',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {/* Progress bar — fills as checks accumulate */}
                {!allChecked && checkedCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 2,
                    width: `${(checkedCount / totalCount) * 100}%`,
                    background: 'linear-gradient(90deg, rgba(212,175,55,0.3), rgba(212,175,55,0.5))',
                    borderRadius: 1,
                    transition: 'width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }} />
                )}
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} color="#121212" className="animate-spin" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#121212' }}>
                      Отправка...
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} color={allChecked ? '#121212' : `rgba(212,175,55,${0.2 + 0.1 * checkedCount})`} />
                    <span style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: allChecked ? '#121212' : `rgba(212,175,55,${0.2 + 0.1 * checkedCount})`,
                      transition: 'color 0.35s',
                    }}>
                      {submitLabel}
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

// TrustSection removed — trust info moved to PaymentSheet context

// ═══════════════════════════════════════════════════════════════════════════════
//                              REVISION REQUEST SHEET
// ═══════════════════════════════════════════════════════════════════════════════

interface RevisionRequestSheetProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  currentRound?: OrderRevisionRound | null
  onOpenChat: () => void
  onSubmit: (payload: { message: string; files: File[]; voiceBlob: Blob | null; voiceDuration: number }) => Promise<void>
}

const RevisionRequestSheet = memo(function RevisionRequestSheet({
  isOpen,
  onClose,
  order,
  currentRound,
  onOpenChat,
  onSubmit,
}: RevisionRequestSheetProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const { haptic } = useTelegram()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  useModalRegistration(isOpen, 'revision-request-sheet')

  const revisionCount = order.revision_count || 0
  const activeRound = currentRound?.status === 'open' ? currentRound : null
  const nextRevisionNumber = activeRound?.round_number || revisionCount + 1

  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setIsSubmitting(false)
      setSelectedFiles([])
      setVoiceBlob(null)
      setVoiceDuration(0)
      setIsRecording(false)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
      audioChunksRef.current = []
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop())
    }
  }, [])

  const resetRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    mediaRecorderRef.current = null
    setIsRecording(false)
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files || [])
    if (incomingFiles.length === 0) return

    const oversizedFile = incomingFiles.find(file => file.size > 20 * 1024 * 1024)
    if (oversizedFile) {
      haptic?.('warning')
      showToast({
        type: 'info',
        title: 'Файл слишком большой',
        message: `${oversizedFile.name} превышает 20 МБ`,
      })
      event.target.value = ''
      return
    }

    setSelectedFiles(prev => [...prev, ...incomingFiles])
    event.target.value = ''
    haptic?.('light')
  }, [haptic, showToast])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index))
    haptic?.('light')
  }, [haptic])

  const startRecording = useCallback(async () => {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setVoiceBlob(null)
      setVoiceDuration(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream?.getTracks().forEach(track => track.stop())
        if (audioChunksRef.current.length > 0) {
          setVoiceBlob(new Blob(audioChunksRef.current, { type: mimeType }))
        }
        resetRecording()
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      haptic?.('medium')

      recordingTimerRef.current = window.setInterval(() => {
        setVoiceDuration(prev => prev + 1)
      }, 1000)
    } catch {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      haptic?.('error')
      showToast({ type: 'error', title: 'Микрофон недоступен', message: 'Разрешите доступ к микрофону и попробуйте снова.' })
    }
  }, [haptic, resetRecording, showToast])

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return
    mediaRecorderRef.current.stop()
    haptic?.('medium')
  }, [isRecording, haptic])

  const cancelRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return
    audioChunksRef.current = []
    mediaRecorderRef.current.stop()
    resetRecording()
    setVoiceBlob(null)
    setVoiceDuration(0)
    haptic?.('light')
  }, [isRecording, haptic, resetRecording])

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleSubmit = async () => {
    const trimmedMessage = message.trim()
    const hasAttachments = selectedFiles.length > 0 || Boolean(voiceBlob)

    if (!trimmedMessage && !activeRound) {
      haptic?.('warning')
      showToast({ type: 'info', title: 'Опишите, что нужно исправить' })
      return
    }

    if (!trimmedMessage && !hasAttachments) {
      haptic?.('warning')
      showToast({ type: 'info', title: 'Добавьте комментарий или материалы' })
      return
    }
    haptic?.('medium')
    setIsSubmitting(true)
    try {
      await onSubmit({
        message: trimmedMessage,
        files: selectedFiles,
        voiceBlob,
        voiceDuration,
      })
      onClose()
    } catch (err) {
      haptic?.('error')
      showToast({
        type: 'error',
        title: 'Ошибка',
        message: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      })
    } finally {
      setIsSubmitting(false)
    }
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
          className="fixed inset-0 bg-black/70 z-[300] flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className={s.sheetShell}
            style={{
              background: DS.colors.bgSurface,
              borderRadius: '24px 24px 0 0',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
                  {activeRound ? 'Дополнить правку' : 'Запрос правок'}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>
                  {`Правка #${nextRevisionNumber}`}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'transparent', border: 'none',
                }}
              >
                <X size={16} color="rgba(255,255,255,0.3)" />
              </motion.button>
            </div>

            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
              {/* Revision summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                marginBottom: 16,
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.14)',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.76)', marginBottom: 2 }}>
                    {activeRound ? 'Правка уже открыта' : 'Безлимитные правки'}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.45 }}>
                    {activeRound
                      ? 'Этот круг правок уже открыт. Добавьте уточнение сюда, а файлы, скриншоты и голосовые можно дослать через чат заказа.'
                      : 'Отправьте замечания одним списком. Доведём работу до нужного результата в рамках исходного ТЗ.'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.9)', whiteSpace: 'nowrap' }}>
                  {activeRound ? 'Открыта' : revisionCount > 0 ? `Уже было: ${revisionCount}` : 'Первая итерация'}
                </div>
              </div>

              {/* Text input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                  Опишите, что нужно исправить
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Например: изменить формулировку в разделе 2, добавить ссылку на источник..."
                  maxLength={5000}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    resize: 'vertical' as const,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 11,
                color: 'rgba(255,255,255,0.2)',
              }}>
                <span>{activeRound ? 'Текст и файлы попадут в текущую правку' : 'Текстовое описание правок ускорит работу'}</span>
                <span>{`${message.trim().length}/5000`}</span>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(212,175,55,0.18)',
                      background: 'rgba(212,175,55,0.08)',
                      color: '#E8D5A3',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Paperclip size={15} />
                    Прикрепить файлы
                  </motion.button>

                  {!isRecording ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        void startRecording()
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.78)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Mic size={15} />
                      Голосовое
                    </motion.button>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(212,175,55,0.18)',
                          background: 'rgba(212,175,55,0.08)',
                          color: '#E8D5A3',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <MicOff size={15} />
                        Идёт запись · {formatDuration(voiceDuration)}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={stopRecording}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(212,175,55,0.18)',
                          background: 'rgba(212,175,55,0.08)',
                          color: '#E8D5A3',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <StopCircle size={15} />
                        Стоп
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={cancelRecording}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                          color: 'rgba(255,255,255,0.58)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={15} />
                        Отмена
                      </motion.button>
                    </>
                  )}
                </div>

                {(selectedFiles.length > 0 || voiceBlob) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: 8,
                      padding: 12,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: file.type.startsWith('image/') ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)',
                              flexShrink: 0,
                            }}
                          >
                            {file.type.startsWith('image/') ? (
                              <Image size={16} color="#E8D5A3" />
                            ) : (
                              <FileText size={16} color="rgba(255,255,255,0.58)" />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                              {(file.size / (1024 * 1024)).toFixed(file.size > 1024 * 1024 ? 1 : 2)} МБ
                            </div>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.48)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    ))}

                    {voiceBlob && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(212,175,55,0.08)',
                              flexShrink: 0,
                            }}
                          >
                            <Mic size={16} color="#E8D5A3" />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                              Голосовое сообщение
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                              {formatDuration(voiceDuration || 0)}
                            </div>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => {
                            setVoiceBlob(null)
                            setVoiceDuration(0)
                            haptic?.('light')
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.48)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeRound && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    haptic?.('light')
                    onClose()
                    onOpenChat()
                  }}
                  style={{
                    width: '100%',
                    height: 44,
                    marginTop: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.72)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <MessageCircle size={16} />
                  Открыть чат и дослать материалы
                </motion.button>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px',
              paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <motion.button
                whileTap={!isSubmitting && message.trim() ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                style={{
                  width: '100%',
                  height: 50,
                  borderRadius: 12,
                  border: message.trim() ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: !isSubmitting && message.trim() ? 'pointer' : 'not-allowed',
                  background: message.trim()
                    ? 'linear-gradient(135deg, #f0d35c, #D4AF37, #b48e26)'
                    : 'rgba(255,255,255,0.04)',
                  boxShadow: message.trim()
                    ? '0 8px 28px -4px rgba(212,175,55,0.4), 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : 'none',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} color="#121212" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#121212' }}>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={17} color={message.trim() ? '#121212' : 'rgba(255,255,255,0.3)'} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: message.trim() ? '#121212' : 'rgba(255,255,255,0.3)' }}>
                      {activeRound ? 'Добавить к правке' : 'Отправить на доработку'}
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
        margin: '0 20px 16px',
        padding: 16,
        borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(212,175,55,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(212,175,55,0.10)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: 'rgba(212,175,55,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={18} color="rgba(212,175,55,0.72)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 3 }}>
            Подтверждаем перевод
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.4)' }}>
            Обычно это занимает до {estimatedMinutes} минут. Как только поступление подтвердим, заказ автоматически перейдёт дальше.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Перевод отправлен', active: true },
          { label: 'Проверка', active: true, current: true },
          { label: 'Старт работы', active: false },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '10px 10px 9px',
              borderRadius: 12,
              background: item.current
                ? 'rgba(212,175,55,0.10)'
                : item.active
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
              border: `1px solid ${item.current
                ? 'rgba(212,175,55,0.16)'
                : item.active
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(255,255,255,0.04)'}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: item.current ? '#E8D5A3' : item.active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)',
                marginBottom: 4,
              }}
            >
              {item.current ? 'Сейчас' : item.active ? 'Готово' : 'Далее'}
            </div>
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.35,
                fontWeight: 600,
                color: item.current ? 'rgba(255,255,255,0.88)' : item.active ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.28)',
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <ShieldCheck size={13} color="rgba(212,175,55,0.45)" />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Статус обновится автоматически
        </span>
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
  type: 'pdf' | 'doc' | 'docx' | 'image' | 'archive' | 'folder' | 'other'
  url?: string
  uploadedAt?: string
}

// Utility functions for files
const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return ''
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
    case 'folder':
      return Package
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
    case 'folder':
      return DS.colors.gold
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
  const [chatFiles, setChatFiles] = useState<ChatMessage[]>([])

  // Fetch files from chat messages (admin-sent files)
  useEffect(() => {
    let cancelled = false
    async function loadChatFiles() {
      try {
        const resp = await fetchOrderMessages(order.id)
        if (!cancelled) {
          const filesFromChat = resp.messages.filter(
            (m) => m.file_url && m.sender_type === 'admin'
          )
          setChatFiles(filesFromChat)
        }
      } catch {
        // silent
      }
    }
    loadChatFiles()
    return () => { cancelled = true }
  }, [order.id, order.status])

  // Build files list: files_url (Yandex.Disk folder) + individual chat files
  const workLabel = order.work_type_label || 'Работа'
  const files: OrderFile[] = []

  // Add Yandex.Disk folder link if exists
  if (order.files_url) {
    files.push({
      id: 'yadisk',
      name: `${workLabel} — файлы`,
      size: 0,
      type: 'folder',
      url: order.files_url,
    })
  }

  // Add individual files from chat
  chatFiles.forEach((msg) => {
    if (msg.file_url) {
      const ext = (msg.file_name || '').split('.').pop()?.toLowerCase() || ''
      const fileType: OrderFile['type'] =
        ['pdf'].includes(ext) ? 'pdf'
        : ['doc', 'docx'].includes(ext) ? 'doc'
        : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image'
        : ['zip', 'rar', '7z', 'tar'].includes(ext) ? 'archive'
        : 'other'

      files.push({
        id: String(msg.id),
        name: msg.file_name || 'Файл',
        size: 0,
        type: fileType,
        url: msg.file_url,
      })
    }
  })

  // Check if files section should be visible
  const filesAvailable = ['completed', 'review', 'revision', 'paid', 'paid_full', 'in_progress'].includes(order.status)
  const hasFiles = files.length > 0

  if (!filesAvailable && !hasFiles) return null

  return (
    <div style={{ padding: '0 20px', marginBottom: 16 }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="rgba(212,175,55,0.5)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            Файлы
          </span>
          {hasFiles && (
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(212,175,55,0.1)',
              fontSize: 11, fontWeight: 600, color: '#E8D5A3',
            }}>
              {files.length}
            </span>
          )}
        </div>

        {hasFiles && files.length > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { haptic?.('light'); onDownloadAll() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent', cursor: 'pointer',
              border: '1px solid rgba(212,175,55,0.15)',
            }}
          >
            <Download size={13} color="rgba(212,175,55,0.6)" />
            <span style={{ fontSize: 12, color: '#E8D5A3' }}>Скачать всё</span>
          </motion.button>
        )}
      </div>

      {hasFiles ? (
        /* File rows */
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type)
            const fileColor = getFileColor(file.type)
            return (
              <motion.button
                key={file.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => { haptic?.('light'); onDownloadFile(file) }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left' as const,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${fileColor}15`, flexShrink: 0,
                }}>
                  <FileIcon size={20} color={fileColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {file.type === 'folder' ? 'Яндекс.Диск' : formatFileSize(file.size)}
                  </div>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: 'rgba(212,175,55,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Download size={16} color="rgba(212,175,55,0.6)" />
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        /* Compact empty state — not a huge centered card */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileText size={18} color="rgba(255,255,255,0.2)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
              Файлы появятся здесь
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
              После выполнения работы
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

interface DeliveryVersionsSectionProps {
  order: Order
  onOpenVersion: (batch: OrderDeliveryBatch | null) => void
}

const DeliveryVersionsSection = memo(function DeliveryVersionsSection({
  order,
  onOpenVersion,
}: DeliveryVersionsSectionProps) {
  const latestDelivery = getLatestDeliveryForView(order)
  const deliveryHistory = (order.delivery_history || []).filter(batch => batch.id !== latestDelivery?.id)

  if (!latestDelivery) return null

  const latestTimestamp = latestDelivery.sent_at || latestDelivery.created_at
  const formattedLatestTimestamp = latestTimestamp
    ? new Date(latestTimestamp).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div style={{ padding: '0 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Package size={16} color="rgba(212,175,55,0.55)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
          Версии работы
        </span>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          padding: 14,
          marginBottom: deliveryHistory.length > 0 ? 10 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
              {latestDelivery.version_number ? `Версия ${latestDelivery.version_number}` : 'Последняя выдача'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
              {formattedLatestTimestamp || 'Дата отправки обновится автоматически'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenVersion(latestDelivery)}
            disabled={!latestDelivery.files_url && !order.files_url}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(212,175,55,0.22)',
              background: 'rgba(212,175,55,0.08)',
              color: '#E8D5A3',
              fontSize: 12,
              fontWeight: 700,
              cursor: latestDelivery.files_url || order.files_url ? 'pointer' : 'default',
              opacity: latestDelivery.files_url || order.files_url ? 1 : 0.45,
            }}
          >
            Открыть
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: latestDelivery.manager_comment ? 10 : 0 }}>
          {(latestDelivery.file_count || 0) > 0 && (
            <span style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.12)',
              fontSize: 11,
              color: '#E8D5A3',
            }}>
              Файлов: {latestDelivery.file_count}
            </span>
          )}
          {(latestDelivery.revision_count_snapshot || 0) > 0 && (
            <span style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.62)',
            }}>
              Правка #{latestDelivery.revision_count_snapshot}
            </span>
          )}
        </div>

        {latestDelivery.manager_comment && (
          <div style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.68)',
          }}>
            {latestDelivery.manager_comment}
          </div>
        )}
      </div>

      {deliveryHistory.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 14,
          padding: 12,
          display: 'grid',
          gap: 8,
        }}>
          {deliveryHistory.slice(0, 4).map((batch) => (
            <button
              key={batch.id}
              type="button"
              onClick={() => onOpenVersion(batch)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.84)' }}>
                  {batch.version_number ? `Версия ${batch.version_number}` : 'Выдача'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                  {(batch.sent_at || batch.created_at)
                    ? new Date(batch.sent_at || batch.created_at || '').toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Дата не указана'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.52)' }}>
                {(batch.file_count || 0) > 0 && <span style={{ fontSize: 11 }}>{batch.file_count} файл(ов)</span>}
                <ChevronRight size={16} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

interface RevisionRoundsSectionProps {
  order: Order
  onRequestRevision: () => void
  onOpenChat: () => void
  onOpenVersion: (batch: OrderDeliveryBatch | null) => void
}

const RevisionRoundsSection = memo(function RevisionRoundsSection({
  order,
  onRequestRevision,
  onOpenChat,
  onOpenVersion,
}: RevisionRoundsSectionProps) {
  const currentRound = getOpenRevisionRoundForView(order)
  const revisionHistory = getRevisionHistoryForView(order)
  const visibleStatus = getClientVisibleStatus(order)

  if (!currentRound && revisionHistory.length === 0 && !['review', 'revision'].includes(visibleStatus)) {
    return null
  }

  return (
    <div style={{ padding: '0 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Edit3 size={16} color="rgba(212,175,55,0.55)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
          Правки
        </span>
      </div>

      {currentRound ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: 14,
            marginBottom: revisionHistory.length > 0 ? 10 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                {getRevisionRoundLabel(currentRound)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                {getRevisionRoundActivityLabel(currentRound)
                  ? `Последняя активность ${getRevisionRoundActivityLabel(currentRound)}`
                  : 'Материалы по правке можно дополнять до следующей версии'}
              </div>
            </div>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.14)',
                fontSize: 11,
                fontWeight: 700,
                color: '#E8D5A3',
                whiteSpace: 'nowrap',
              }}
            >
              Открыта
            </span>
          </div>

          {currentRound.initial_comment && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.68)',
                marginBottom: 10,
              }}
            >
              {currentRound.initial_comment}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={onRequestRevision}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(212,175,55,0.22)',
                background: 'rgba(212,175,55,0.08)',
                color: '#E8D5A3',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Добавить комментарий
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.72)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Открыть чат и дослать файлы
            </button>
          </div>
        </div>
      ) : visibleStatus === 'review' ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: 14,
            marginBottom: revisionHistory.length > 0 ? 10 : 0,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 4 }}>
            Нужны правки?
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            Запросите доработку или откройте чат заказа, если хотите сразу дослать файлы, скриншоты или голосовое сообщение.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={onRequestRevision}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(212,175,55,0.22)',
                background: 'rgba(212,175,55,0.08)',
                color: '#E8D5A3',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Запросить правки
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.72)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Открыть чат
            </button>
          </div>
        </div>
      ) : null}

      {revisionHistory.length > 0 && (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 14,
            padding: 12,
            display: 'grid',
            gap: 8,
          }}
        >
          {revisionHistory.slice(0, 4).map((round, index, list) => {
            const linkedDelivery = getDeliveryBatchByIdForView(order, round.closed_by_delivery_batch_id)

            return (
              <div
                key={round.id || `${round.round_number}-${index}`}
                style={{
                  padding: '10px 0',
                  borderBottom: index === list.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.84)' }}>
                      {getRevisionRoundLabel(round)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                      {formatOrderDateTimeCompact(round.requested_at) || 'Дата запроса обновится автоматически'}
                      {round.closed_at ? ` · закрыта ${formatOrderDateTimeCompact(round.closed_at)}` : ''}
                    </div>
                  </div>

                  {linkedDelivery?.files_url ? (
                    <button
                      type="button"
                      onClick={() => onOpenVersion(linkedDelivery)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(212,175,55,0.16)',
                        background: 'rgba(212,175,55,0.08)',
                        color: '#E8D5A3',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {linkedDelivery.version_number ? `Версия ${linkedDelivery.version_number}` : 'Открыть'}
                    </button>
                  ) : null}
                </div>

                {round.initial_comment && (
                  <div style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.56)', marginTop: 8 }}>
                    {round.initial_comment}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              SUPPORT CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface SupportCardProps {
  onOpenChat: () => void
}

const SupportCard = memo(function SupportCard({ onOpenChat }: SupportCardProps) {
  const { haptic } = useTelegram()

  return (
    <div style={{ padding: '0 20px' }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptic?.('medium'); onOpenChat() }}
        style={{
          width: '100%',
          padding: '15px 18px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.04)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left' as const,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={16} color="rgba(212,175,55,0.6)" />
          </div>
          {/* Text */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>
              Чат по заказу
            </div>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              Ответ обычно за 10 минут
            </div>
          </div>
        </div>
        <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
      </motion.button>
    </div>
  )
})

// GuaranteesRow removed — inline guarantees now in HeroSummary price card
// OrderTimeline removed — compact horizontal stepper now in HeroSummary

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOADING & ERROR STATES
// ═══════════════════════════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={36} color={DS.colors.gold} />
      </motion.div>
      <span className="text-[14px] text-text-secondary">
        Загружаем заказ...
      </span>
    </div>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 gap-5">
      <div className="w-20 h-20 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
        <XCircle size={40} color={DS.colors.error} />
      </div>
      <p className="text-[18px] font-semibold text-text-primary text-center m-0">
        {message}
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="py-4 px-6 rounded-xl cursor-pointer text-text-secondary text-[14px] font-semibold"
        style={{
          background: DS.colors.bgElevated,
          border: `1px solid ${DS.colors.border}`,
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { haptic } = useTelegram()
  const { showToast } = useToast()
  const { addMessageHandler } = useWebSocketContext()
  const safeBack = useSafeBackNavigation('/orders')

  // State
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online')
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [onlinePaymentLoading, setOnlinePaymentLoading] = useState(false)
  const [revisionSheetOpen, setRevisionSheetOpen] = useState(false)
  const [acceptWorkConfirmOpen, setAcceptWorkConfirmOpen] = useState(false)

  // Parse order ID
  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  // Countdown for payment
  const paymentCountdownAnchor = order && isAwaitingPaymentStatus(order.status)
    ? (order.updated_at || order.created_at || null)
    : null
  const countdown = usePaymentCountdown(paymentCountdownAnchor)

  // Load order data
  const loadOrder = useCallback(async () => {
    if (!isValidOrderId) {
      setError('Некорректный ID заказа')
      setLoading(false)
      return
    }

    setError(null)
    try {
      setPaymentInfo(null)
      const data = await fetchOrderDetail(orderId)
      const normalizedOrder = normalizeOrderForView(data)

      if (!normalizedOrder.id) {
        throw new Error('Не удалось прочитать данные заказа')
      }

      setOrder(normalizedOrder)

      // Load payment info if needed
      if (
        normalizedOrder.final_price &&
        normalizedOrder.final_price > 0 &&
        getOrderRemainingAmount(normalizedOrder) > 0 &&
        [isAwaitingPaymentStatus(normalizedOrder.status), ['paid', 'in_progress', 'review'].includes(normalizedOrder.status)].some(Boolean)
      ) {
        try {
          const payment = await fetchPaymentInfo(orderId)
          setPaymentInfo(payment)
        } catch {
          /* silent */
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[OrderDetailPageV8] loadOrder failed', {
          orderId,
          route: `/order/${orderId}`,
          error: err,
        })
      }
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
      if (message.type === 'refresh') {
        loadOrder()
      } else if (message.type === 'order_update' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      } else if (message.type === 'delivery_update' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      } else if (message.type === 'revision_round_opened' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      } else if (message.type === 'revision_round_updated' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      } else if (message.type === 'revision_round_fulfilled' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      } else if (message.type === 'file_delivery' && (message as Record<string, unknown>).order_id === orderId) {
        loadOrder()
      }
    })
    return unsubscribe
  }, [orderId, isValidOrderId, addMessageHandler, loadOrder])

  // Auto-poll during verification_pending or review (every 15s)
  useEffect(() => {
    if (order?.status !== 'verification_pending' && order?.status !== 'review') return
    const interval = setInterval(() => {
      loadOrder()
    }, 15_000)
    return () => clearInterval(interval)
  }, [order?.status, loadOrder])

  useEffect(() => {
    if (!order) return

    if (hasSecondPaymentDue(order)) {
      setPaymentScheme('full')
      return
    }

    if (order.payment_scheme === 'half' && (order.paid_amount || 0) === 0) {
      setPaymentScheme('half')
      return
    }

    setPaymentScheme('full')
  }, [order])

  // Handlers
  const handleBack = useCallback(() => {
    haptic?.('light')
    safeBack()
  }, [haptic, safeBack])

  const handleCopyOrderId = useCallback(async () => {
    if (!order) return
    const copied = await copyTextSafely(`#${order.id}`)
    if (!copied) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Не удалось скопировать номер заказа' })
      return
    }
    haptic?.('light')
    showToast({ type: 'success', title: 'Скопировано', message: `Номер заказа #${order.id}` })
  }, [order, haptic, showToast])

  const handleContactManager = useCallback(() => {
    haptic?.('medium')
    if (order?.id) {
      navigate(`/order/${order.id}/chat`)
    }
  }, [haptic, navigate, order?.id])

  const handleAcceptWork = useCallback(() => {
    haptic?.('light')
    setAcceptWorkConfirmOpen(true)
  }, [haptic])

  const handleConfirmAcceptWork = useCallback(async () => {
    if (!order) return
    haptic?.('medium')
    setAcceptWorkConfirmOpen(false)
    try {
      await confirmWorkCompletion(order.id)
      showToast({ type: 'success', title: 'Работа принята!' })
      loadOrder()
    } catch (err) {
      haptic?.('error')
      showToast({
        type: 'error',
        title: 'Ошибка',
        message: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      })
    }
  }, [order, haptic, showToast, loadOrder])

  const handleRequestRevision = useCallback(() => {
    haptic?.('light')
    setRevisionSheetOpen(true)
  }, [haptic])

  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const canPauseOrder = Boolean(order?.can_pause)
  const canResumeOrder = Boolean(order?.can_resume)

  const handlePauseOrder = useCallback(async () => {
    if (!order?.id || pauseLoading) return
    setPauseLoading(true)
    try {
      const result = await pauseOrder(order.id)
      if (!result.success) throw new Error(result.message)
      haptic?.('success')
      setPauseConfirmOpen(false)
      showToast({
        type: 'success',
        title: 'Заказ на паузе',
        message: result.pause_until
          ? `Заморозка активна до ${new Date(result.pause_until).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
          : 'Заморозка активирована на 7 дней.',
      })
      await loadOrder()
    } catch (err) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Не удалось включить паузу', message: err instanceof Error ? err.message : 'Попробуйте ещё раз' })
    } finally {
      setPauseLoading(false)
    }
  }, [order?.id, pauseLoading, haptic, showToast, loadOrder])

  const handleResumeOrder = useCallback(async () => {
    if (!order?.id || pauseLoading) return
    setPauseLoading(true)
    try {
      const result = await resumeOrder(order.id)
      if (!result.success) throw new Error(result.message)
      haptic?.('success')
      showToast({ type: 'success', title: 'Заказ возобновлён' })
      await loadOrder()
    } catch (err) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Не удалось возобновить заказ', message: err instanceof Error ? err.message : 'Попробуйте ещё раз' })
    } finally {
      setPauseLoading(false)
    }
  }, [order?.id, pauseLoading, haptic, showToast, loadOrder])

  const handleSubmitRevision = useCallback(async ({
    message,
    files,
    voiceBlob,
  }: {
    message: string
    files: File[]
    voiceBlob: Blob | null
    voiceDuration: number
  }) => {
    if (!order) return
    const activeRound = getOpenRevisionRoundForView(order)

    let result: Awaited<ReturnType<typeof requestRevision>> | null = null
    if (message) {
      result = await requestRevision(order.id, message)
      if (!result.success) {
        throw new Error(result.message)
      }
    }

    const uploadFailures: string[] = []

    for (const file of files) {
      try {
        await uploadChatFile(order.id, file)
      } catch {
        uploadFailures.push(file.name)
      }
    }

    if (voiceBlob) {
      try {
        await uploadVoiceMessage(order.id, voiceBlob)
      } catch {
        uploadFailures.push('Голосовое сообщение')
      }
    }

    const hasAttachments = files.length > 0 || Boolean(voiceBlob)
    const title = result
      ? activeRound
        ? 'Правка обновлена'
        : 'Правки отправлены'
      : 'Материалы отправлены'

    const successMessage = result
      ? activeRound
        ? `${getRevisionRoundLabel(activeRound)} дополнена`
        : `Правка #${result.revision_count}`
      : 'Файлы и голосовые уже в текущем круге правок'

    if (uploadFailures.length > 0) {
      showToast({
        type: 'info',
        title,
        message: `${successMessage}. Не удалось загрузить: ${uploadFailures.join(', ')}`,
      })
    } else {
      showToast({
        type: 'success',
        title,
        message: hasAttachments && !message
          ? 'Материалы уже у менеджера'
          : successMessage,
      })
    }

    await loadOrder()
  }, [order, showToast, loadOrder])

  const handleOpenFAQ = useCallback(() => {
    haptic?.('light')
    navigate('/support?view=faq')
  }, [haptic, navigate])

  const handlePaymentClick = useCallback(() => {
    const openPayment = async () => {
      if (!order) return

      haptic?.('medium')

      if (!paymentInfo) {
        try {
          const freshPaymentInfo = await fetchPaymentInfo(order.id)
          setPaymentInfo(freshPaymentInfo)
          setPaymentSheetOpen(true)
          return
        } catch {
          haptic?.('error')
          showToast({
            type: 'error',
            title: 'Не удалось загрузить реквизиты',
            message: 'Попробуйте открыть оплату ещё раз через несколько секунд.',
          })
          return
        }
      }

      setPaymentSheetOpen(true)
    }

    void openPayment()
  }, [order, paymentInfo, haptic, showToast])

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

  // Online payment via YooKassa
  const handleOnlinePayment = useCallback(async () => {
    if (!order || onlinePaymentLoading) return
    haptic?.('medium')
    setOnlinePaymentLoading(true)

    try {
      const result = await createOnlinePayment(order.id, paymentScheme)
      if (!result.success || !result.payment_url) {
        throw new Error(result.error || 'Не удалось создать платёж')
      }

      // Open YooKassa payment page
      window.open(result.payment_url, '_blank', 'noopener,noreferrer')

      haptic?.('success')
      showToast({
        type: 'success',
        title: 'Платёж создан',
        message: 'Откроется страница оплаты. После оплаты статус обновится автоматически.',
      })
      setPaymentSheetOpen(false)
    } catch (err) {
      haptic?.('error')
      showToast({
        type: 'error',
        title: 'Ошибка оплаты',
        message: err instanceof Error ? err.message : 'Попробуйте ещё раз',
      })
    } finally {
      setOnlinePaymentLoading(false)
    }
  }, [order, paymentScheme, onlinePaymentLoading, haptic, showToast])

  // Submit payment confirmation
  const handleSubmitPaymentConfirmation = useCallback(async (receipt: File | null) => {
    if (!order) {
      throw new Error('Заказ не найден')
    }

    const result = await confirmPayment(order.id, paymentMethod, paymentScheme)
    if (!result.success) {
      throw new Error(result.message || 'Не удалось отправить подтверждение')
    }

    let receiptAttached = false
    let receiptUploadFailed = false

    if (receipt) {
      try {
        await uploadChatFile(order.id, receipt)
        receiptAttached = true
      } catch {
        receiptUploadFailed = true
      }
    }

    haptic?.('success')
    setConfirmModalOpen(false)
    setPaymentSheetOpen(false)

    // Reload order from server instead of optimistic update to avoid render crashes
    try {
      await loadOrder()
    } catch {
      // Fallback: apply minimal safe status update
      setOrder((prev) =>
        prev
          ? normalizeOrderForView({
              ...prev,
              status: (result.new_status || 'verification_pending') as OrderStatus,
            } as Order)
          : prev
      )
    }

    if (receiptUploadFailed) {
      showToast({
        type: 'info',
        title: 'Подтверждение отправлено',
        message: 'Статус обновили, но скриншот не прикрепился. Его можно дослать в чат заказа.',
      })
      return
    }

    showToast({
      type: 'success',
      title: 'Отправлено на проверку',
      message: receiptAttached ? 'Подтверждение и скриншот переданы менеджеру.' : 'Мы уведомим вас о результате.',
    })
  }, [order, paymentMethod, paymentScheme, haptic, showToast, loadOrder])

  // Calculate today's payment amount
  const calculateTodayAmount = useCallback((): number => {
    if (!order?.final_price) return 0
    const remaining = getOrderRemainingAmount(order)
    if (remaining <= 0) return 0

    if (hasSecondPaymentDue(order)) {
      return remaining
    }

    if (paymentScheme === 'half' && (order.paid_amount || 0) === 0) {
      return Math.ceil(order.final_price / 2)
    }
    return remaining
  }, [order, paymentScheme])

  const todayAmount = calculateTodayAmount()
  const clientVisibleStatus = order ? getClientVisibleStatus(order) : null

  // Determine if we're in payment flow
  const isPaymentFlow = Boolean(
    order &&
    getOrderRemainingAmount(order) > 0 &&
    [
      isAwaitingPaymentStatus(clientVisibleStatus || order.status),
      ['paid', 'in_progress', 'review'].includes(clientVisibleStatus || order.status),
    ].some(Boolean),
  )
  const isVerificationPending = clientVisibleStatus === 'verification_pending'
  const requestedAction = searchParams.get('action')

  useEffect(() => {
    if (!order || requestedAction !== 'pay') return

    if (!isPaymentFlow) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('action')
      setSearchParams(nextParams, { replace: true })
      return
    }

    if (!paymentInfo) return

    setPaymentSheetOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('action')
    setSearchParams(nextParams, { replace: true })
  }, [order, requestedAction, isPaymentFlow, paymentInfo, searchParams, setSearchParams])

  // Open in-app chat handler for this specific order
  const handleOpenChat = useCallback(() => {
    haptic?.('medium')
    if (order?.id) {
      navigate(`/order/${order.id}/chat`)
    }
  }, [haptic, navigate, order?.id])

  // Cancel handler
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const CANCELABLE_STATUSES = ['draft', 'pending', 'waiting_payment', 'waiting_estimation']
  const canCancelOrder = order ? CANCELABLE_STATUSES.includes(order.status) : false

  const handleCancelOrder = useCallback(async () => {
    if (!order?.id) return
    setCancelLoading(true)
    try {
      const result = await cancelOrder(order.id)
      if (result.success) {
        haptic?.('success')
        showToast({ type: 'success', title: 'Заказ отменён' })
        setCancelConfirmOpen(false)
        await loadOrder()
      } else {
        throw new Error(result.message)
      }
    } catch (err) {
      haptic?.('error')
      showToast({ type: 'error', title: 'Ошибка', message: err instanceof Error ? err.message : 'Не удалось отменить заказ' })
    } finally {
      setCancelLoading(false)
    }
  }, [order?.id, haptic, showToast, loadOrder])

  // Archive handler
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)

  const handleArchive = useCallback(async () => {
    if (!order?.id) return
    haptic?.('medium')
    try {
      if (order.is_archived) {
        await unarchiveOrder(order.id)
        setOrder(prev => prev ? normalizeOrderForView({ ...prev, is_archived: false }) : prev)
        showToast({ type: 'success', title: 'Восстановлено', message: 'Заказ убран из архива' })
      } else {
        await archiveOrder(order.id)
        setOrder(prev => prev ? normalizeOrderForView({ ...prev, is_archived: true }) : prev)
        showToast({ type: 'success', title: 'Архивировано', message: 'Заказ перемещён в архив' })
      }
    } catch {
      showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось изменить статус архива' })
    }
  }, [order?.id, order?.is_archived, haptic, showToast])

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

  const handleOpenDeliveryVersion = useCallback((batch: OrderDeliveryBatch | null) => {
    const targetUrl = batch?.files_url || order?.files_url
    if (!targetUrl) return
    haptic?.('medium')
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
    showToast({
      type: 'success',
      title: batch?.version_number ? `Открываем версию ${batch.version_number}` : 'Открываем файлы',
      message: 'Папка с файлами уже открывается',
    })
  }, [order?.files_url, haptic, showToast])

  // Render
  if (loading) {
    return (
      <div className={`premium-club-page ${s.page} saloon-page-shell saloon-page-shell--workflow`}>
        <div className="page-background" aria-hidden="true">
          <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
        </div>
        <div className={`${s.pageContent} saloon-page-content saloon-page-content--detail`}>
          <LoadingState />
        </div>
      </div>
    )
  }

  if (!order || error) {
    return (
      <div className={`premium-club-page ${s.page} saloon-page-shell saloon-page-shell--workflow`}>
        <div className="page-background" aria-hidden="true">
          <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
        </div>
        <div className={`${s.pageContent} saloon-page-content saloon-page-content--detail`}>
          <ErrorState message={error || 'Заказ не найден'} onBack={handleBack} />
        </div>
      </div>
    )
  }

  const sectionResetKey = `${order.id}:${order.status}:${order.updated_at || order.created_at || 'static'}`
  const sectionContext = {
    orderId: order.id,
    status: order.status,
    route: `/order/${order.id}`,
  }
  const detailVisibleStatus = (clientVisibleStatus ?? getClientVisibleStatus(order)) as OrderStatus
  const visibleStatusConfig = STATUS_CONFIG[detailVisibleStatus]
  const totalPrice = getOrderTotalPrice(order)
  const remainingAmount = getOrderRemainingAmount(order)
  const latestDelivery = getLatestDeliveryForView(order)
  const latestVersionNumber = latestDelivery?.version_number ?? null
  const latestDeliveryDate = latestDelivery?.sent_at
    ? new Date(latestDelivery.sent_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null
  const openRevisionRound = getOpenRevisionRoundForView(order)
  const revisionHistory = getRevisionHistoryForView(order)
  const workTypeLabel = stripEmoji(order.work_type_label || ORDER_WORK_TYPE_LABELS[order.work_type] || '')
  const headline = getOrderHeadlineSafe(order)

  return (
    <div
      className={`premium-club-page ${s.page} saloon-page-shell saloon-page-shell--workflow`}
    >
      <div className="page-background" aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>
      <div className={`${s.pageContent} saloon-page-content saloon-page-content--detail`}>
      {/* ─── App Bar ─── */}
      <SectionErrorBoundary
        sectionName="order-app-bar"
        resetKey={sectionResetKey}
        context={sectionContext}
        fallback={<SectionFallbackCard title={`Заказ #${order.id}`} message="Шапка заказа временно недоступна. Остальные действия ниже работают." />}
      >
        <OrderAppBar
          order={order}
          onBack={handleBack}
          onCopyOrderId={handleCopyOrderId}
          onContactManager={handleContactManager}
          onOpenFAQ={handleOpenFAQ}
          onArchive={() => {
            if (order.is_archived) {
              handleArchive()
            } else {
              setArchiveConfirmOpen(true)
            }
          }}
          onPause={() => {
            haptic?.('light')
            setPauseConfirmOpen(true)
          }}
          onResume={handleResumeOrder}
          canPause={canPauseOrder}
          canResume={canResumeOrder}
        />
      </SectionErrorBoundary>

      <div className={`${s.contentColumn} ${ps.sectionStack}`}>
        <section className={`${ps.hero} ${ps.heroWorkflow} ${s.detailPrelude}`}>
          <div className={ps.heroGrid}>
            <div className={ps.heroCopy}>
              <div className={ps.chipRow}>
                <span className={`${ps.chip} ${ps.chipStrong}`}>{visibleStatusConfig.label}</span>
                {latestVersionNumber ? <span className={ps.chip}>Версия {latestVersionNumber}</span> : null}
                {openRevisionRound ? <span className={ps.chip}>{getRevisionRoundLabel(openRevisionRound)}</span> : null}
                {!openRevisionRound && order.revision_count ? <span className={ps.chip}>{order.revision_count} правок</span> : null}
              </div>

              <h1 className={ps.heroTitle} style={{ fontSize: 'clamp(30px, 5vw, 40px)' }}>
                {headline}
              </h1>
              {workTypeLabel ? <p className={ps.heroSubtitle}>{workTypeLabel}</p> : null}

              <div className={ps.heroMetrics}>
                <div className={`${ps.metric} ${ps.metricStrong}`}>
                  <div className={ps.metricLabel}>Срок</div>
                  <div className={`${ps.metricValue} ${ps.metricValueAccent}`}>{formatOrderDeadlineRu(order.deadline)}</div>
                  <div className={ps.metricHint}>Текущая дата сдачи</div>
                </div>
                <div className={ps.metric}>
                  <div className={ps.metricLabel}>Стоимость</div>
                  <div className={ps.metricValue}>{formatPrice(totalPrice)} ₽</div>
                  <div className={ps.metricHint}>Общая сумма заказа</div>
                </div>
                <div className={ps.metric}>
                  <div className={ps.metricLabel}>Оплачено</div>
                  <div className={ps.metricValue}>{formatPrice(order.paid_amount || 0)} ₽</div>
                  <div className={ps.metricHint}>Подтверждённые платежи</div>
                </div>
                <div className={ps.metric}>
                  <div className={ps.metricLabel}>Осталось</div>
                  <div className={ps.metricValue}>{formatPrice(remainingAmount)} ₽</div>
                  <div className={ps.metricHint}>До полного расчёта</div>
                </div>
              </div>
            </div>

            <div className={ps.heroAside}>
              <div className={`${ps.surface} ${ps.surfaceUtility}`}>
                <div className={ps.sectionHeading}>
                  <div className={ps.sectionHeadingCopy}>
                    <h2 className={ps.sectionTitle}>Версия и материалы</h2>
                    <p className={ps.sectionSubtitle}>{latestDeliveryDate ? latestDeliveryDate : 'Без отправленной версии'}</p>
                  </div>
                </div>
                <div className={ps.sectionStack}>
                  <div className={s.heroAsideRow}>
                    <span className={s.heroAsideLabel}>Файлы</span>
                    <span className={s.heroAsideValue}>{latestDelivery?.file_count || 0}</span>
                  </div>
                  <div className={s.heroAsideRow}>
                    <span className={s.heroAsideLabel}>Последняя версия</span>
                    <span className={s.heroAsideValue}>{latestVersionNumber ? `v${latestVersionNumber}` : '—'}</span>
                  </div>
                  <div className={s.heroAsideRow}>
                    <span className={s.heroAsideLabel}>Статус</span>
                    <span className={s.heroAsideValue}>{visibleStatusConfig.label}</span>
                  </div>
                  {(openRevisionRound || order.revision_count || revisionHistory.length > 0) && (
                    <div className={s.heroAsideRow}>
                      <span className={s.heroAsideLabel}>{openRevisionRound ? 'Открытая правка' : 'Кругов правок'}</span>
                      <span className={s.heroAsideValue}>
                        {openRevisionRound ? `#${openRevisionRound.round_number}` : Math.max(order.revision_count || 0, revisionHistory.length)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Hero (order info + price + stepper + inline guarantees) ─── */}
        <SectionErrorBoundary
          sectionName="order-hero"
          resetKey={sectionResetKey}
          context={sectionContext}
          fallback={<SectionFallbackCard title="Карточка заказа" message="Основные детали временно не отрисовались. Попробуйте открыть заказ ещё раз через пару секунд." />}
        >
          <HeroSummary order={order} countdown={countdown} />
        </SectionErrorBoundary>

        {/* ─── Verification Pending Banner ─── */}
        {isVerificationPending && (
          <SectionErrorBoundary
            sectionName="order-verification-banner"
            resetKey={sectionResetKey}
            context={sectionContext}
            fallback={null}
          >
            <VerificationPendingBanner />
          </SectionErrorBoundary>
        )}

        {/* ─── Files ─── */}
        <SectionErrorBoundary
          sectionName="order-files"
          resetKey={sectionResetKey}
          context={sectionContext}
          fallback={null}
        >
          <FilesSection
            order={order}
            onDownloadFile={handleDownloadFile}
            onDownloadAll={handleDownloadAllFiles}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary
          sectionName="order-delivery-versions"
          resetKey={sectionResetKey}
          context={sectionContext}
          fallback={null}
        >
          <DeliveryVersionsSection
            order={order}
            onOpenVersion={handleOpenDeliveryVersion}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary
          sectionName="order-revision-rounds"
          resetKey={sectionResetKey}
          context={sectionContext}
          fallback={null}
        >
          <RevisionRoundsSection
            order={order}
            onRequestRevision={handleRequestRevision}
            onOpenChat={handleContactManager}
            onOpenVersion={handleOpenDeliveryVersion}
          />
        </SectionErrorBoundary>

        {/* ─── Review (completed only) ─── */}
        {order.status === 'completed' && !order.review_submitted && (
          <SectionErrorBoundary
            sectionName="order-review"
            resetKey={sectionResetKey}
            context={sectionContext}
            fallback={null}
          >
            <ReviewSection
              orderId={order.id}
              haptic={haptic ?? (() => {})}
              onReviewSubmitted={loadOrder}
            />
          </SectionErrorBoundary>
        )}
      </div>

      <div className={s.utilityFooter}>
        {/* ─── Support (compact) ─── */}
        <SectionErrorBoundary
          sectionName="order-support"
          resetKey={sectionResetKey}
          context={sectionContext}
          fallback={null}
        >
          <SupportCard onOpenChat={handleOpenChat} />
        </SectionErrorBoundary>

        {/* ─── Cancel (subtle text) ─── */}
        {canCancelOrder && (
          <div className={s.cancelRow}>
            <button
              type="button"
              onClick={() => { haptic?.('light'); setCancelConfirmOpen(true) }}
              className={s.cancelButton}
            >
              Отменить заказ
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-5"
            onClick={() => !cancelLoading && setCancelConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-xl p-5 text-center"
              style={{
                background: DS.colors.bgCard,
                border: `1px solid ${DS.colors.borderLight}`,
              }}
            >
              <div className="w-12 h-12 rounded-[12px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle size={24} color={DS.colors.error} strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mb-2">
                Отменить заказ?
              </h3>
              <p className="text-[12px] text-text-muted leading-[1.5] mb-6">
                Заказ #{order?.id} будет отменён. Это действие нельзя отменить.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCancelConfirmOpen(false)}
                  disabled={cancelLoading}
                  className="flex-1 py-3 px-4 rounded-2xl text-text-secondary text-[14px] font-semibold cursor-pointer"
                  style={{
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.borderLight}`,
                  }}
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="flex-1 py-3 px-4 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-500 text-[14px] font-bold flex items-center justify-center gap-1.5"
                  style={{
                    cursor: cancelLoading ? 'wait' : 'pointer',
                    opacity: cancelLoading ? 0.7 : 1,
                  }}
                >
                  {cancelLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Отменить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Confirmation Modal */}
      <AnimatePresence>
        {pauseConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-5"
            onClick={() => !pauseLoading && setPauseConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[340px] rounded-xl p-5 text-center"
              style={{
                background: DS.colors.bgCard,
                border: `1px solid ${DS.colors.borderLight}`,
              }}
            >
              <div className="w-12 h-12 rounded-[12px] bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
                <Snowflake size={24} color="#d4af37" strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mb-2">
                Поставить заказ на паузу?
              </h3>
              <p className="text-[12px] text-text-muted leading-[1.5] mb-6">
                Заморозка активируется на 7 дней. Заказ можно будет возобновить раньше в карточке заказа.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseConfirmOpen(false)}
                  disabled={pauseLoading}
                  className="flex-1 py-3 px-4 rounded-2xl text-text-secondary text-[14px] font-semibold cursor-pointer"
                  style={{
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.borderLight}`,
                  }}
                >
                  Не сейчас
                </button>
                <button
                  type="button"
                  onClick={handlePauseOrder}
                  disabled={pauseLoading}
                  className="flex-1 py-3 px-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37, #b38728)',
                    color: '#121212',
                    cursor: pauseLoading ? 'wait' : 'pointer',
                    opacity: pauseLoading ? 0.7 : 1,
                    border: 'none',
                  }}
                >
                  {pauseLoading ? <Loader2 size={16} className="animate-spin" /> : <Snowflake size={16} />}
                  Пауза 7 дней
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-5"
            onClick={() => !archiveLoading && setArchiveConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-xl p-5 text-center"
              style={{
                background: DS.colors.bgCard,
                border: `1px solid ${DS.colors.borderLight}`,
              }}
            >
              <div className="w-12 h-12 rounded-[12px] bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
                <Archive size={24} color="#d4af37" strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary mb-2">
                Архивировать заказ?
              </h3>
              <p className="text-[12px] text-text-muted leading-[1.5] mb-6">
                Заказ будет перемещён в архив. Вы сможете найти его в разделе «Архив».
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveConfirmOpen(false)}
                  disabled={archiveLoading}
                  className="flex-1 py-3 px-4 rounded-2xl text-text-secondary text-[14px] font-semibold cursor-pointer"
                  style={{
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.borderLight}`,
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setArchiveLoading(true)
                    await handleArchive()
                    setArchiveLoading(false)
                    setArchiveConfirmOpen(false)
                  }}
                  disabled={archiveLoading}
                  className="flex-1 py-3 px-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #d4af37, #b38728)',
                    color: '#121212',
                    cursor: archiveLoading ? 'wait' : 'pointer',
                    opacity: archiveLoading ? 0.7 : 1,
                    border: 'none',
                  }}
                >
                  {archiveLoading ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                  Архивировать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Sheet */}
      <SectionErrorBoundary
        sectionName="order-payment-sheet"
        resetKey={sectionResetKey}
        context={sectionContext}
        fallback={null}
      >
        <PaymentSheet
          isOpen={paymentSheetOpen}
          onClose={() => setPaymentSheetOpen(false)}
          order={order}
          paymentInfo={paymentInfo}
          paymentMethod={paymentMethod}
          paymentScheme={paymentScheme}
          setPaymentMethod={setPaymentMethod}
          setPaymentScheme={setPaymentScheme}
          onConfirmPayment={handleOpenConfirmModal}
          onOnlinePayment={handleOnlinePayment}
          onlinePaymentLoading={onlinePaymentLoading}
        />
      </SectionErrorBoundary>

      {/* Sticky Action Bar */}
      <SectionErrorBoundary
        sectionName="order-sticky-action"
        resetKey={sectionResetKey}
        context={sectionContext}
        fallback={null}
      >
        <StickyActionBar
          order={order}
          paymentScheme={paymentScheme}
          paymentExpired={Boolean(countdown && countdown.urgency === 'expired')}
          onPaymentClick={handlePaymentClick}
          onContactManager={handleContactManager}
          onDownloadFiles={handleDownloadFiles}
          onAcceptWork={handleAcceptWork}
          onRequestRevision={handleRequestRevision}
          onResumeOrder={handleResumeOrder}
        />
      </SectionErrorBoundary>

      {/* Revision Request Sheet */}
      <RevisionRequestSheet
        isOpen={revisionSheetOpen}
        onClose={() => setRevisionSheetOpen(false)}
        order={order}
        currentRound={openRevisionRound}
        onOpenChat={handleContactManager}
        onSubmit={handleSubmitRevision}
      />

      {/* Accept Work Confirmation */}
      <AnimatePresence>
        {acceptWorkConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAcceptWorkConfirmOpen(false)}
            className="fixed inset-0 bg-black/70 z-[400] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 340,
                borderRadius: 12,
                background: DS.colors.bgSurface,
                padding: 24,
                textAlign: 'center' as const,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
                background: 'rgba(212,175,55,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCheck size={24} color="rgba(212,175,55,0.8)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 8px' }}>
                Принять работу?
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: '0 0 20px' }}>
                Вы подтверждаете, что работа выполнена. После подтверждения заказ будет завершён.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAcceptWorkConfirmOpen(false)}
                  style={{
                    flex: 1, height: 44, borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Назад
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmAcceptWork}
                  style={{
                    flex: 1, height: 44, borderRadius: 12, border: 'none',
                    background: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
                    boxShadow: '0 4px 12px -2px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                    color: 'var(--text-on-gold)',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Принять
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Payment Modal */}
      <SectionErrorBoundary
        sectionName="order-confirm-modal"
        resetKey={sectionResetKey}
        context={sectionContext}
        fallback={null}
      >
        <ConfirmPaymentModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          order={order}
          paymentAmount={todayAmount}
          onSubmit={handleSubmitPaymentConfirmation}
        />
      </SectionErrorBoundary>
      </div>
    </div>
  )
}

export default OrderDetailPageV8
