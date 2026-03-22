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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  Download,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  ShieldCheck,
  Timer,
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
} from 'lucide-react'
import { Order, OrderStatus } from '../types'
import {
  fetchOrderDetail,
  fetchPaymentInfo,
  PaymentInfo,
  archiveOrder,
  unarchiveOrder,
  confirmPayment,
  uploadChatFile,
  createOnlinePayment,
  cancelOrder,
} from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useWebSocketContext } from '../hooks/useWebSocket'
import { useModalRegistration } from '../contexts/NavigationContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { useToast } from '../components/ui/Toast'
import { SectionErrorBoundary } from '../components/ui/SectionErrorBoundary'
import { ReviewSection } from '../components/order/ReviewSection'
import {
  formatOrderDeadlineRu,
  getOrderHeadlineSafe,
  normalizeOrder,
  ORDER_WORK_TYPE_LABELS,
  parseOrderDateSafe,
} from '../lib/orderView'
// homeStyles removed — all styles inline for quiet luxury consistency

// ═══════════════════════════════════════════════════════════════════════════════
//                              DESIGN SYSTEM V8
// ═══════════════════════════════════════════════════════════════════════════════

const DS = {
  colors: {
    // Gold
    gold: 'var(--gold-400)',
    goldLight: 'var(--gold-150)',
    goldDark: 'var(--gold-500)',
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
  confirmed:            { label: 'К оплате',         color: 'var(--gold-200)',        bgColor: 'var(--gold-glass-medium)', borderColor: 'var(--gold-glass-medium)', icon: CreditCard,   step: 2 },
  verification_pending: { label: 'Проверка оплаты',  color: 'var(--gold-400)',        bgColor: 'var(--gold-glass-subtle)',  borderColor: 'var(--gold-glass-subtle)', icon: Loader2,      step: 2 },
  paid:                 { label: 'В работе',         color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Loader2,     step: 3 },
  paid_full:            { label: 'В работе',         color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Loader2,     step: 3 },
  in_progress:          { label: 'В работе',         color: 'var(--text-secondary)',  bgColor: 'var(--bg-glass)',        borderColor: 'var(--border-strong)',    icon: Loader2,     step: 3 },
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

function SectionFallbackCard({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div
      className="mx-4 mb-4 p-4 rounded-[20px] border border-white/[0.08]"
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
}

const OrderAppBar = memo(function OrderAppBar({
  order,
  onBack,
  onCopyOrderId,
  onContactManager,
  onOpenFAQ,
  onArchive,
}: OrderAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menuItems = [
    { icon: Copy, label: 'Скопировать номер', onClick: () => { onCopyOrderId(); setMenuOpen(false) } },
    { icon: MessageCircle, label: 'Написать менеджеру', onClick: () => { onContactManager(); setMenuOpen(false) } },
    { icon: HelpCircle, label: 'Центр помощи', onClick: () => { onOpenFAQ(); setMenuOpen(false) } },
    { icon: Archive, label: order.is_archived ? 'Из архива' : 'В архив', onClick: () => { onArchive(); setMenuOpen(false) } },
  ]

  return (
    <>
      {/* Main AppBar — minimal, just order number */}
      <div
        className="flex items-center gap-3 px-4 py-[14px] sticky top-0 z-[100] backdrop-blur-[18px]"
        style={{
          background: 'var(--bg-void)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        {/* Back Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="w-10 h-10 rounded-[14px] flex items-center justify-center cursor-pointer shrink-0"
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
          className="w-10 h-10 rounded-[14px] flex items-center justify-center cursor-pointer shrink-0"
          style={{ background: 'transparent', border: 'none' }}
        >
          <MoreHorizontal size={20} color="rgba(255,255,255,0.4)" />
        </motion.button>
      </div>

      {/* Subtle spacing below AppBar */}
      <div className="h-2" />

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
  const isAwaitingPayment = ['waiting_payment', 'confirmed'].includes(order.status)
  const paymentExpired = Boolean(isAwaitingPayment && countdown?.urgency === 'expired')
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const workTypeRaw = order.work_type_label || ORDER_WORK_TYPE_LABELS[order.work_type] || 'Заказ'
  const workTypeLabel = stripEmoji(workTypeRaw)
  const headline = stripEmoji(getOrderHeadlineSafe(order))
  const rawSubject = order.subject?.trim() || ''
  const subject = stripEmoji(rawSubject)
  const totalPrice = order.final_price || order.price || 0
  const remainingAmount = Math.max(totalPrice - (order.paid_amount || 0), 0)
  const displayPrice = remainingAmount > 0 && remainingAmount !== totalPrice ? remainingAmount : totalPrice
  const priceLabel = remainingAmount > 0 && remainingAmount !== totalPrice ? 'ОСТАЛОСЬ К ОПЛАТЕ' : 'СТОИМОСТЬ'

  // Countdown urgency color
  const urgencyColor = countdown?.urgency === 'expired' || countdown?.urgency === 'critical'
    ? 'rgba(239,68,68,0.7)' : 'rgba(212,175,55,0.5)'

  // Dot stepper
  const currentStep = statusConfig.step
  const STEP_COUNT = 6

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
          borderRadius: 24,
          background: 'linear-gradient(165deg, rgba(212,175,55,0.04) 0%, rgba(20,20,23,0.6) 35%, rgba(20,20,23,0.6) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 100,
              background: statusConfig.bgColor,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            <StatusIcon
              size={11}
              color={statusConfig.color}
              className={order.status === 'verification_pending' || order.status === 'in_progress' ? 'animate-spin' : ''}
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
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.02em',
              fontFamily: "var(--font-display, 'Manrope', sans-serif)",
            }}
          >
            {headline}
          </div>
          {subject && subject !== headline && (
            <div style={{ marginTop: 6, fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
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
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Стоимость</span>
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

        {/* ─── Row 4: Countdown timer ─── */}
        {isAwaitingPayment && countdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ marginTop: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color={urgencyColor} />
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                {paymentExpired ? 'Срок оплаты истёк' : 'Время на оплату'}
              </span>
              {!paymentExpired && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'rgba(212,175,55,0.7)',
                    marginLeft: 'auto',
                  }}
                >
                  {countdown.formatted}
                </span>
              )}
            </div>
            {/* Subtle progress line */}
            {!paymentExpired && (
              <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${countdown.progress}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ height: '100%', borderRadius: 1, background: urgencyColor }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Row 5: Deadline + dot stepper ─── */}
        {currentStep >= 0 && !['cancelled', 'rejected'].includes(order.status) && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Deadline */}
            {order.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="rgba(255,255,255,0.25)" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                  Срок: {formatOrderDeadlineRu(order.deadline)}
                </span>
              </div>
            )}

            {/* Dot indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: STEP_COUNT }).map((_, i) => {
                const isCompleted = currentStep > i
                const isCurrent = currentStep === i
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      width: isCurrent ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: isCompleted
                        ? 'rgba(212,175,55,0.4)'
                        : isCurrent
                          ? 'rgba(212,175,55,0.9)'
                          : 'rgba(255,255,255,0.08)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ Trust signals (outside the card, with breathing room) ═══ */}
      {isAwaitingPayment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ marginTop: 16, padding: '0 4px' }}
        >
          {[
            { icon: ShieldCheck, text: 'Полный возврат до начала работы' },
            { icon: RotateCcw, text: '3 бесплатных круга правок' },
            { icon: CalendarCheck, text: 'Гарантия соблюдения сроков' },
          ].map((g, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <g.icon size={15} color="rgba(212,175,55,0.45)" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>
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

type ActionBarVariant = 'payment' | 'verification' | 'work' | 'review' | 'completed' | 'cancelled'

interface StickyActionBarProps {
  order: Order
  paymentScheme: 'full' | 'half'
  paymentExpired: boolean
  onPaymentClick: () => void
  onContactManager: () => void
  onDownloadFiles: () => void
}

const StickyActionBar = memo(function StickyActionBar({
  order,
  paymentScheme,
  paymentExpired,
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
      buttonText: 'Перейти к оплате',
      buttonIcon: ChevronRight,
      buttonColor: 'var(--text-on-gold)',
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
      buttonColor: 'var(--text-on-gold)',
      buttonBg: `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
      disabled: false,
      onClick: onContactManager,
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

  // Don't show for cancelled/rejected and statuses without real CTA
  // Only show for: payment, verification, review, completed
  if (['cancelled', 'work'].includes(variant)) return null

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
      <div className="flex items-center justify-between gap-4 max-w-[480px] mx-auto">
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

        {/* Right: Action Button */}
        <motion.button
          whileTap={config.disabled ? undefined : { scale: 0.97 }}
          onClick={config.onClick}
          disabled={config.disabled}
          className="flex items-center justify-center gap-2 py-4 px-5 rounded-2xl text-[15px] font-bold min-h-[52px]"
          style={{
            flex: config.showAmount ? '1 1 auto' : '1 1 100%',
            background: config.buttonBg,
            border: variant === 'work' ? `1px solid ${DS.colors.borderLight}` : 'none',
            color: config.buttonColor,
            cursor: config.disabled ? 'not-allowed' : 'pointer',
            opacity: config.disabled ? 0.6 : 1,
            boxShadow: ['payment', 'review', 'completed'].includes(variant)
              ? '0 4px 16px -2px rgba(212,175,55,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
              : 'none',
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
  const fullAmount = order.final_price || 0
  const halfAmount = Math.ceil(fullAmount / 2)
  const remainingAfterHalf = fullAmount - halfAmount
  const todayAmount = paymentScheme === 'full' ? fullAmount : halfAmount
  const hasPaymentInfo = Boolean(paymentInfo)

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
    const allText = `Карта: ${cardNumber}\nПолучатель: ${cardHolder}\nСумма: ${todayAmount} ₽\nКомментарий: Заказ #${order.id}`
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
  }, [cardNumber, cardHolder, todayAmount, order.id, haptic, showToast])

  if (!isOpen) return null

  // Unified field renderer for card/SBP — tap-to-copy on entire row
  const renderField = (label: string, value: string, fieldKey: string, options?: {
    mono?: boolean
    gold?: boolean
    toggleVisibility?: boolean
    isVisible?: boolean
    onToggle?: () => void
    large?: boolean
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
        borderBottom: '1px solid rgba(255,255,255,0.04)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
            background: copiedField === fieldKey ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
            transition: 'background 0.2s',
          }}
        >
          {copiedField === fieldKey
            ? <Check size={14} color="rgba(34,197,94,0.8)" />
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
            className="w-full max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col"
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
                  Оплата
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
            <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>

              {/* ═══ Payment scheme toggle ═══ */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                  Сумма оплаты
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Full */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentScheme('full')}
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 16,
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      background: paymentScheme === 'full'
                        ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
                        : 'rgba(255,255,255,0.02)',
                      border: paymentScheme === 'full'
                        ? '1.5px solid rgba(212,175,55,0.4)'
                        : '1.5px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: paymentScheme === 'full' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      Полная
                    </div>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: paymentScheme === 'full' ? '#E8D5A3' : 'rgba(255,255,255,0.35)',
                    }}>
                      {formatPrice(fullAmount)} ₽
                    </div>
                  </motion.button>

                  {/* Half */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentScheme('half')}
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 16,
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      background: paymentScheme === 'half'
                        ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
                        : 'rgba(255,255,255,0.02)',
                      border: paymentScheme === 'half'
                        ? '1.5px solid rgba(212,175,55,0.4)'
                        : '1.5px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: paymentScheme === 'half' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                      50% аванс
                    </div>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: paymentScheme === 'half' ? '#E8D5A3' : 'rgba(255,255,255,0.35)',
                    }}>
                      {formatPrice(halfAmount)} ₽
                    </div>
                    {paymentScheme === 'half' && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                        + {formatPrice(remainingAfterHalf)} ₽ потом
                      </div>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* ═══ Payment method segmented control ═══ */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                  Способ оплаты
                </div>

                <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.03)' }}>
                  {(['online', 'card', 'sbp'] as PaymentMethod[]).map((method) => {
                    const isActive = paymentMethod === method
                    const label = method === 'online' ? 'Онлайн' : method === 'card' ? 'Карта' : 'СБП'
                    const Icon = method === 'online' ? Globe : method === 'card' ? CreditCard : Smartphone
                    return (
                      <motion.button
                        key={method}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                          border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                          transition: 'all 0.2s',
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

              {/* ═══ Payment details ═══ */}
              <div style={{ marginBottom: 16 }}>
                {paymentMethod === 'online' ? (
                  /* ── Online: minimal, just amount + security note ── */
                  <div style={{
                    padding: '20px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <ShieldCheck size={18} color="rgba(212,175,55,0.5)" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
                        Безопасная оплата через ЮKassa
                      </span>
                    </div>
                    <div style={{
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#E8D5A3',
                      letterSpacing: '-0.02em',
                      marginBottom: 8,
                    }}>
                      {formatPrice(todayAmount)} ₽
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                      Данные карты вводятся на стороне ЮKassa. Мы их не храним.
                    </div>
                  </div>
                ) : paymentMethod === 'card' ? (
                  /* ── Card: grouped fields ── */
                  <div style={{
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '0 16px',
                  }}>
                    {renderField('Номер карты', cardNumber, 'card', {
                      mono: true,
                      large: true,
                      toggleVisibility: true,
                      isVisible: cardNumberVisible,
                      onToggle: () => setCardNumberVisible(!cardNumberVisible),
                    })}
                    {renderField('Получатель', cardHolder, 'holder')}
                    {renderField('Сумма', `${formatPrice(todayAmount)} ₽`, 'amount', { mono: true, gold: true, large: true })}
                    <div style={{ borderBottom: 'none' }}>
                      {renderField('Комментарий к переводу', `Заказ #${order.id}`, 'comment')}
                    </div>
                  </div>
                ) : (
                  /* ── SBP: grouped fields ── */
                  <div style={{
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '0 16px',
                  }}>
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
                    <div style={{ borderBottom: 'none' }}>
                      {renderField('Комментарий', `Заказ #${order.id}`, 'sbp_comment')}
                    </div>
                  </div>
                )}

                {/* Copy all for card/sbp */}
                {paymentMethod !== 'online' && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyAll}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '12px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: copiedField === 'all' ? 'rgba(34,197,94,0.15)' : 'transparent',
                      border: `1px solid ${copiedField === 'all' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    {copiedField === 'all'
                      ? <Check size={14} color="rgba(34,197,94,0.8)" />
                      : <Copy size={14} color="rgba(255,255,255,0.3)" />
                    }
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: copiedField === 'all' ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.35)',
                    }}>
                      Скопировать все реквизиты
                    </span>
                  </motion.button>
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
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const, marginBottom: 12 }}>
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
                  borderRadius: 16,
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
                    ? '0 4px 16px -2px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : 'none',
                }}
              >
                {onlinePaymentLoading ? (
                  <Loader2 size={20} color="rgba(255,255,255,0.4)" className="animate-spin" />
                ) : paymentMethod === 'online' ? (
                  <Globe size={18} color="#050507" />
                ) : (
                  <CheckCircle2 size={18} color={hasPaymentInfo ? '#050507' : 'rgba(255,255,255,0.3)'} />
                )}
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: onlinePaymentLoading
                    ? 'rgba(255,255,255,0.4)'
                    : (paymentMethod === 'online' ? !onlinePaymentLoading : hasPaymentInfo)
                      ? '#050507'
                      : 'rgba(255,255,255,0.3)',
                }}>
                  {onlinePaymentLoading
                    ? 'Создаём платёж...'
                    : paymentMethod === 'online'
                      ? 'Перейти к оплате'
                      : 'Подтвердить перевод'
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
    { id: 'amount', label: `Сумма перевода: ${formatPrice(paymentAmount)} ₽`, checked: false },
    { id: 'details', label: 'Реквизиты указаны верно', checked: false },
    { id: 'comment', label: `Комментарий к переводу: Заказ #${order.id}`, checked: false },
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
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col"
            style={{
              background: DS.colors.bgSurface,
              borderRadius: `${DS.radius['2xl']}px ${DS.radius['2xl']}px 0 0`,
            }}
          >
            {/* ─── Header ─── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
                  Подтверждение оплаты
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {formatPrice(paymentAmount)} ₽ · Заказ #{order.id}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'transparent', border: 'none',
                }}
              >
                <X size={18} color="rgba(255,255,255,0.4)" />
              </motion.button>
            </div>

            {/* ─── Content ─── */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
              {/* Checklist — simplified, compact */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                  Подтвердите
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {checklist.map((item) => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textAlign: 'left' as const,
                        background: item.checked ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${item.checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.checked ? 'rgba(34,197,94,0.9)' : 'transparent',
                        border: `2px solid ${item.checked ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.15)'}`,
                        transition: 'all 0.2s',
                      }}>
                        {item.checked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: item.checked ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
                        flex: 1,
                      }}>
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                  Скриншот оплаты
                  <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}> — необязательно</span>
                </div>

                {screenshotPreview ? (
                  <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={screenshotPreview}
                      alt="Скриншот"
                      loading="lazy"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover' as const }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={removeScreenshot}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} color="rgba(239,68,68,0.8)" />
                    </motion.button>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '6px 10px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <FileImage size={12} color="rgba(34,197,94,0.7)" />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {screenshot?.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '14px 16px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload size={18} color="rgba(255,255,255,0.25)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
                        Загрузить скриншот
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        PNG, JPG до 10 МБ
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* ─── Footer ─── */}
            <div style={{
              padding: '16px 20px',
              paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: DS.colors.bgSurface,
            }}>
              {/* Timing note — gold palette, not cyan */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.1)',
                marginBottom: 12,
              }}>
                <Timer size={14} color="rgba(212,175,55,0.5)" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  Проверка займёт <strong style={{ color: '#E8D5A3', fontWeight: 600 }}>5–15 минут</strong>
                </span>
              </div>

              <motion.button
                whileTap={allChecked && !isSubmitting ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={!allChecked || isSubmitting}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 16,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: allChecked && !isSubmitting ? 'pointer' : 'not-allowed',
                  background: allChecked
                    ? 'linear-gradient(135deg, #f0d35c, #D4AF37, #b48e26)'
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: allChecked
                    ? '0 4px 16px -2px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : 'none',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} color="#050507" className="animate-spin" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#050507' }}>
                      Отправка...
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} color={allChecked ? '#050507' : 'rgba(255,255,255,0.3)'} />
                    <span style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: allChecked ? '#050507' : 'rgba(255,255,255,0.3)',
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

// TrustSection removed — trust info moved to PaymentSheet context

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
      className="mx-4 mb-4 p-[18px] rounded-[20px] bg-gold-400/[0.04] border border-gold-400/10"
    >
      <div className="flex items-center gap-3.5 mb-3">
        <div className="w-11 h-11 rounded-[14px] bg-gold-400/[0.08] flex items-center justify-center shrink-0">
          <Loader2 size={22} color="rgba(212,175,55,0.60)" className="animate-spin" />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-white/[0.88] mb-1">
            Платёж на проверке
          </div>
          <div className="text-[13px] leading-[1.55] text-white/[0.42]">
            Обычно подтверждаем за {estimatedMinutes} минут и переводим заказ в работу автоматически.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <ShieldCheck size={14} color="rgba(212,175,55,0.50)" />
        <span className="text-[12px] text-white/[0.38]">
          Статус обновится сам, ничего дополнительно отправлять не нужно
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

  // Parse files from order — files_url is a Yandex.Disk folder link
  const workLabel = order.work_type_label || 'Работа'
  const files: OrderFile[] = order.files_url
    ? [
        {
          id: '1',
          name: `${workLabel} — файлы`,
          size: 0,
          type: 'folder',
          url: order.files_url,
        },
      ]
    : []

  // Check if files are available based on status
  const filesAvailable = ['completed', 'review', 'paid', 'paid_full', 'in_progress'].includes(order.status)
  const hasFiles = files.length > 0

  if (!filesAvailable && !hasFiles) return null

  return (
    <div className="mx-4 mb-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} color={DS.colors.gold} />
          <span className="text-[15px] font-bold text-text-primary">
            Файлы
          </span>
          {hasFiles && (
            <span className="px-2 py-1 rounded-lg bg-gold-400/15 text-[11px] font-semibold text-gold-400"
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
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-transparent cursor-pointer"
            style={{ border: `1px solid ${DS.colors.borderGold}` }}
          >
            <Download size={14} color={DS.colors.gold} />
            <span className="text-[12px] text-gold-400">
              Скачать всё
            </span>
          </motion.button>
        )}
      </div>

      {/* Files List */}
      <div
        className="p-4 rounded-[20px]"
        style={{
          background: DS.colors.bgCard,
          border: `1px solid ${DS.colors.border}`,
        }}
      >
        {hasFiles ? (
          <div className="flex flex-col gap-2">
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
                  className="w-full p-3 rounded-2xl cursor-pointer flex items-center gap-3 text-left"
                  style={{
                    background: DS.colors.bgElevated,
                    border: `1px solid ${DS.colors.border}`,
                  }}
                >
                  {/* File Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${fileColor}15` }}
                  >
                    <FileIcon size={22} color={fileColor} />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {file.type === 'folder' ? 'Яндекс.Диск' : formatFileSize(file.size)}
                    </div>
                  </div>

                  {/* Download Icon */}
                  <div className="w-9 h-9 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
                    <Download size={18} color={DS.colors.gold} />
                  </div>
                </motion.button>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center p-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <FileText size={28} color={DS.colors.textMuted} />
            </div>
            <p className="text-[14px] text-text-secondary m-0 mb-1">
              Файлы появятся здесь
            </p>
            <p className="text-[12px] text-text-muted m-0">
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

interface SupportCardProps {
  onOpenChat: () => void
}

const SupportCard = memo(function SupportCard({ onOpenChat }: SupportCardProps) {
  const { haptic } = useTelegram()

  return (
    <div style={{ padding: '0 20px', marginBottom: 8 }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptic?.('medium'); onOpenChat() }}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
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
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              Поддержка
            </div>
            <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              Обычно отвечаем за ~10 мин
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
      <div className="w-20 h-20 rounded-[20px] bg-red-500/15 border border-red-500/25 flex items-center justify-center">
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

  // Parse order ID
  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  // Countdown for payment
  const paymentCountdownAnchor = order && ['waiting_payment', 'confirmed'].includes(order.status)
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
        (normalizedOrder.paid_amount || 0) < normalizedOrder.final_price &&
        ['confirmed', 'waiting_payment', 'paid'].includes(normalizedOrder.status)
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
      }
    })
    return unsubscribe
  }, [orderId, isValidOrderId, addMessageHandler, loadOrder])

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

  const CANCELABLE_STATUSES = ['draft', 'pending', 'waiting_payment', 'confirmed', 'waiting_estimation']
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

  const sectionResetKey = `${order.id}:${order.status}:${order.updated_at || order.created_at || 'static'}`
  const sectionContext = {
    orderId: order.id,
    status: order.status,
    route: `/order/${order.id}`,
  }

  return (
    <div
      className="premium-club-page pb-[140px]"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.03) 0%, transparent 60%), var(--bg-main, #050507)',
      }}
    >
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
        />
      </SectionErrorBoundary>

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
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <button
            type="button"
            onClick={() => { haptic?.('light'); setCancelConfirmOpen(true) }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '12px 24px',
            }}
          >
            Отменить заказ
          </button>
        </div>
      )}

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
              className="w-full max-w-[320px] rounded-[20px] p-5 text-center"
              style={{
                background: DS.colors.bgCard,
                border: `1px solid ${DS.colors.borderLight}`,
              }}
            >
              <div className="w-12 h-12 rounded-[14px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
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
              className="w-full max-w-[320px] rounded-[20px] p-5 text-center"
              style={{
                background: DS.colors.bgCard,
                border: `1px solid ${DS.colors.borderLight}`,
              }}
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
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
                    color: '#09090b',
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
        />
      </SectionErrorBoundary>

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
  )
}

export default OrderDetailPageV8
