/**
 * OrderDetailPage V7.0 — Private Concierge Masterpiece
 *
 * Philosophy: "Every detail matters. Every interaction delights."
 *
 * Architecture:
 * 1. DESIGN SYSTEM — Consistent tokens for colors, spacing, radii
 * 2. NO DUPLICATES — Single source of truth for all configurations
 * 3. UNIQUE SECTIONS — Each card has its own personality, unified style
 * 4. FULL FUNCTIONALITY — Revision modal, real-time updates, accessible
 * 5. TYPE SAFETY — No `as any`, proper interfaces
 *
 * @version 7.0.0
 */

import { useState, useEffect, useCallback, useRef, memo, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  Download,
  MessageCircle,
  FileText,
  RefreshCw,
  PenTool,
  AlertTriangle,
  Flame,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  Star,
  ExternalLink,
  Sparkles,
  Eye,
  Gift,
  X,
  Send,
  Calendar,
  Zap,
} from 'lucide-react'
import { Order, OrderStatus } from '../types'
import { useTelegram } from '../hooks/useUserData'
import {
  fetchOrderDetail,
  fetchPaymentInfo,
  confirmWorkCompletion,
  requestRevision,
  PaymentInfo,
} from '../api/userApi'
import { useWebSocketContext } from '../hooks/useWebSocket'

import { ReviewSection } from '../components/order/ReviewSection'
import { GoldenInvoice } from '../components/order/GoldenInvoice'
import { PremiumChat, PremiumChatHandle } from '../components/order/PremiumChat'

// ═══════════════════════════════════════════════════════════════════════════════
//                              DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const DS = {
  // Color Palette
  colors: {
    // Primary
    gold: '#D4AF37',
    goldLight: '#FCF6BA',
    goldDark: '#B38728',
    // Semantic
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    info: '#3b82f6',
    infoLight: '#60a5fa',
    purple: '#8b5cf6',
    purpleLight: '#a78bfa',
    cyan: '#06b6d4',
    orange: '#f97316',
    // Neutral
    white: '#ffffff',
    textPrimary: 'var(--text-main)',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.12)',
    surface: 'rgba(255,255,255,0.02)',
    surfaceElevated: 'rgba(255,255,255,0.05)',
  },
  // Spacing Scale (4px base)
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  // Typography
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
    '5xl': 28,
  },
  // Shadows
  shadow: {
    gold: '0 8px 24px -4px rgba(212,175,55,0.35)',
    success: '0 8px 24px -4px rgba(34,197,94,0.35)',
    purple: '0 8px 24px -4px rgba(139,92,246,0.35)',
    warning: '0 8px 24px -4px rgba(245,158,11,0.35)',
  },
} as const

// Business Constants
const CONFIG = {
  MAX_FREE_REVISIONS: 3,
  CASHBACK_PERCENT: 5,
  URGENCY_CRITICAL_HOURS: 12,
  URGENCY_WARNING_HOURS: 48,
  COUNTDOWN_UPDATE_MS: 60000, // 1 minute
} as const

// ═══════════════════════════════════════════════════════════════════════════════
//                              EXTENDED ORDER TYPE
// ═══════════════════════════════════════════════════════════════════════════════

// Extend Order type with fields used in this component
interface ExtendedOrder extends Order {
  revision_count?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

// Respect user's motion preferences
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}

// Format price with Russian locale
const formatPrice = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || typeof amount !== 'number') return '0'
  return amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

// Format date relative to now
const formatRelativeDate = (dateStr: string | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  if (isToday) return `сегодня, ${time}`
  if (isYesterday) return `вчера, ${time}`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Generate color variants
const colorWithAlpha = (color: string, alpha: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return color
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusConfig {
  label: string
  shortLabel: string
  color: string
  icon: typeof Clock
  needsAction: boolean
  actionLabel?: string
  step: number
}

// Status presets to avoid duplication
const STATUS_PRESETS = {
  estimation: {
    label: 'На оценке',
    shortLabel: 'Оценка',
    color: DS.colors.warning,
    icon: Clock,
    needsAction: false,
    step: 1,
  },
  payment: {
    label: 'Ожидает оплаты',
    shortLabel: 'К оплате',
    color: DS.colors.gold,
    icon: CreditCard,
    needsAction: true,
    actionLabel: 'Оплатить',
    step: 2,
  },
  working: {
    label: 'В работе',
    shortLabel: 'В работе',
    color: DS.colors.info,
    icon: Loader2,
    needsAction: false,
    step: 3,
  },
  cancelled: {
    label: 'Отменён',
    shortLabel: 'Отменён',
    color: DS.colors.error,
    icon: XCircle,
    needsAction: false,
    step: -1,
  },
} as const

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: {
    label: 'Черновик',
    shortLabel: 'Черновик',
    color: '#6b7280',
    icon: PenTool,
    needsAction: false,
    step: 0,
  },
  pending: STATUS_PRESETS.estimation,
  waiting_estimation: STATUS_PRESETS.estimation,
  confirmed: STATUS_PRESETS.payment,
  waiting_payment: STATUS_PRESETS.payment,
  verification_pending: {
    label: 'Проверка оплаты',
    shortLabel: 'Проверка',
    color: DS.colors.cyan,
    icon: Loader2,
    needsAction: false,
    step: 2,
  },
  paid: STATUS_PRESETS.working,
  paid_full: STATUS_PRESETS.working,
  in_progress: STATUS_PRESETS.working,
  revision: {
    label: 'На доработке',
    shortLabel: 'Правки',
    color: DS.colors.orange,
    icon: RefreshCw,
    needsAction: false,
    step: 3,
  },
  review: {
    label: 'Готов к проверке',
    shortLabel: 'Проверка',
    color: DS.colors.purple,
    icon: Eye,
    needsAction: true,
    actionLabel: 'Проверить',
    step: 4,
  },
  completed: {
    label: 'Выполнен',
    shortLabel: 'Готово',
    color: DS.colors.success,
    icon: CheckCircle2,
    needsAction: false,
    step: 5,
  },
  cancelled: STATUS_PRESETS.cancelled,
  rejected: {
    ...STATUS_PRESETS.cancelled,
    label: 'Отклонён',
    shortLabel: 'Отклонён',
  },
}

const WORK_TYPE_EMOJI: Record<string, string> = {
  masters: '🎓',
  diploma: '📜',
  coursework: '📚',
  essay: '✍️',
  report: '📋',
  control: '📝',
  presentation: '🎯',
  practice: '💼',
  independent: '📖',
  other: '📄',
  photo_task: '📸',
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  totalHours: number
  isExpired: boolean
  urgency: 'safe' | 'warning' | 'critical' | 'expired'
  formatted: string
}

function useCountdown(deadline: string | null): CountdownResult | null {
  const [result, setResult] = useState<CountdownResult | null>(null)

  useEffect(() => {
    if (!deadline) {
      setResult(null)
      return
    }

    const parseDeadline = (d: string): Date | null => {
      const lower = d.toLowerCase().trim()
      if (lower === 'today' || lower === 'сегодня') {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return today
      }
      if (lower === 'tomorrow' || lower === 'завтра') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(23, 59, 59, 999)
        return tomorrow
      }
      const parsed = new Date(d)
      if (isNaN(parsed.getTime())) return null
      return parsed
    }

    const calculate = (): CountdownResult | null => {
      const target = parseDeadline(deadline)
      if (!target) return null

      const diff = target.getTime() - Date.now()
      if (diff <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          totalHours: 0,
          isExpired: true,
          urgency: 'expired',
          formatted: 'Истёк',
        }
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const totalHours = days * 24 + hours

      let urgency: CountdownResult['urgency'] = 'safe'
      if (totalHours < CONFIG.URGENCY_CRITICAL_HOURS) urgency = 'critical'
      else if (totalHours < CONFIG.URGENCY_WARNING_HOURS) urgency = 'warning'

      let formatted = ''
      if (days > 0) formatted = `${days}д ${hours}ч`
      else if (hours > 0) formatted = `${hours}ч ${minutes}м`
      else formatted = `${minutes}м`

      return { days, hours, minutes, totalHours, isExpired: false, urgency, formatted }
    }

    setResult(calculate())
    const interval = setInterval(() => setResult(calculate()), CONFIG.COUNTDOWN_UPDATE_MS)
    return () => clearInterval(interval)
  }, [deadline])

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Premium Button Component
interface PremiumButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant: 'primary' | 'secondary' | 'ghost'
  color?: string
  icon?: ReactNode
  children: ReactNode
  fullWidth?: boolean
  reduced?: boolean
  ariaLabel?: string
}

const PremiumButton = memo(function PremiumButton({
  onClick,
  disabled = false,
  loading = false,
  variant,
  color = DS.colors.gold,
  icon,
  children,
  fullWidth = false,
  reduced = false,
  ariaLabel,
}: PremiumButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${color}, ${colorWithAlpha(color, 0.8)})`,
      border: 'none',
      color: color === DS.colors.success || color === DS.colors.gold ? '#fff' : '#fff',
      boxShadow: `0 8px 24px -4px ${colorWithAlpha(color, 0.35)}`,
    },
    secondary: {
      background: colorWithAlpha(color, 0.1),
      border: `1px solid ${colorWithAlpha(color, 0.3)}`,
      color: color,
    },
    ghost: {
      background: DS.colors.surfaceElevated,
      border: `1px solid ${DS.colors.border}`,
      color: DS.colors.textSecondary,
    },
  }

  return (
    <motion.button
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      style={{
        ...styles[variant],
        width: fullWidth ? '100%' : 'auto',
        padding: `${DS.space.lg}px ${DS.space.xl}px`,
        borderRadius: DS.radius.md,
        fontSize: DS.fontSize.lg,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DS.space.sm,
        transition: 'opacity 0.2s ease',
      }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {children}
    </motion.button>
  )
})

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon: ReactNode
  iconColor?: string
  children: ReactNode
  defaultOpen?: boolean
  reduced?: boolean
}

const CollapsibleSection = memo(function CollapsibleSection({
  title,
  subtitle,
  icon,
  iconColor = DS.colors.gold,
  children,
  defaultOpen = false,
  reduced = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        borderRadius: DS.radius.lg,
        background: DS.colors.surface,
        border: `1px solid ${DS.colors.border}`,
        marginBottom: DS.space.lg,
        overflow: 'hidden',
      }}
    >
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: `${DS.space.lg}px ${DS.space.xl - 2}px`,
          background: 'transparent',
          border: 'none',
          color: DS.colors.textSecondary,
          fontSize: DS.fontSize.md,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
          <span style={{ color: iconColor }}>{icon}</span>
          {title}
          {subtitle && (
            <span style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted }}>
              {subtitle}
            </span>
          )}
        </span>
        {isOpen ? (
          <ChevronUp size={16} color={DS.colors.textMuted} />
        ) : (
          <ChevronDown size={16} color={DS.colors.textMuted} />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: `0 ${DS.space.xl - 2}px ${DS.space.xl - 2}px` }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// Info Card Component
interface InfoCardProps {
  value: string | number
  label: string
  color: string
  icon?: ReactNode
  compact?: boolean
}

const InfoCard = memo(function InfoCard({ value, label, color, icon, compact = false }: InfoCardProps) {
  return (
    <div
      style={{
        flex: compact ? '1 1 100px' : '1 1 140px',
        padding: compact ? DS.space.md : DS.space.lg,
        borderRadius: DS.radius.md,
        background: colorWithAlpha(color, 0.08),
        border: `1px solid ${colorWithAlpha(color, 0.2)}`,
        display: compact ? 'flex' : 'block',
        alignItems: compact ? 'center' : undefined,
        justifyContent: compact ? 'space-between' : undefined,
      }}
    >
      <div>
        <div
          style={{
            fontSize: compact ? DS.fontSize.md : DS.fontSize['3xl'],
            fontWeight: 700,
            color: color,
            marginBottom: compact ? 0 : DS.space.xs,
            display: 'flex',
            alignItems: 'center',
            gap: DS.space.sm,
          }}
        >
          {icon}
          {value}
        </div>
        <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted }}>{label}</div>
      </div>
      {compact && icon && (
        <div style={{ fontSize: DS.fontSize.xl, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {value}
        </div>
      )}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              REVISION MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface RevisionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (comment: string) => void
  isLoading: boolean
  reduced: boolean
}

const RevisionModal = memo(function RevisionModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  reduced,
}: RevisionModalProps) {
  const [comment, setComment] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    if (!isOpen) {
      setComment('')
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (comment.trim().length < 5) return
    onSubmit(comment.trim())
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: DS.space.lg,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={reduced ? false : { y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? undefined : { y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'linear-gradient(145deg, #1c1c20, #14141a)',
              borderRadius: `${DS.radius.xl}px ${DS.radius.xl}px ${DS.radius.md}px ${DS.radius.md}px`,
              border: `1px solid ${colorWithAlpha(DS.colors.warning, 0.3)}`,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: DS.space.xl,
                borderBottom: `1px solid ${DS.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: DS.radius.md,
                    background: colorWithAlpha(DS.colors.warning, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PenTool size={22} color={DS.colors.warning} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: DS.fontSize.xl,
                      fontWeight: 700,
                      color: DS.colors.textPrimary,
                      fontFamily: 'var(--font-serif)',
                    }}
                  >
                    Запрос правок
                  </h3>
                  <p style={{ margin: 0, fontSize: DS.fontSize.sm, color: DS.colors.textMuted }}>
                    Опишите, что нужно исправить
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={reduced ? undefined : { scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: DS.radius.sm,
                  background: DS.colors.surfaceElevated,
                  border: `1px solid ${DS.colors.border}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={DS.colors.textMuted} />
              </motion.button>
            </div>

            {/* Content */}
            <div style={{ padding: DS.space.xl }}>
              <textarea
                ref={inputRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: Нужно исправить оформление списка литературы и добавить больше источников..."
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: DS.space.lg,
                  borderRadius: DS.radius.md,
                  background: DS.colors.surfaceElevated,
                  border: `1px solid ${DS.colors.borderLight}`,
                  color: DS.colors.textPrimary,
                  fontSize: DS.fontSize.base,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <p
                style={{
                  margin: `${DS.space.md}px 0 0`,
                  fontSize: DS.fontSize.xs,
                  color: comment.length < 5 ? DS.colors.warning : DS.colors.textMuted,
                }}
              >
                {comment.length < 5
                  ? `Минимум 5 символов (ещё ${5 - comment.length})`
                  : 'Менеджер получит ваш комментарий и свяжется с вами'}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: DS.space.md, marginTop: DS.space.xl }}>
                <PremiumButton
                  onClick={onClose}
                  variant="ghost"
                  reduced={reduced}
                  fullWidth
                >
                  Отмена
                </PremiumButton>
                <PremiumButton
                  onClick={handleSubmit}
                  variant="primary"
                  color={DS.colors.warning}
                  disabled={comment.trim().length < 5}
                  loading={isLoading}
                  icon={<Send size={18} />}
                  reduced={reduced}
                  fullWidth
                  ariaLabel="Отправить запрос на правки"
                >
                  Отправить
                </PremiumButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              ORDER HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderHeaderProps {
  order: ExtendedOrder
  onBack: () => void
  reduced: boolean
}

const OrderHeader = memo(function OrderHeader({ order, onBack, reduced }: OrderHeaderProps) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const typeEmoji = WORK_TYPE_EMOJI[order.work_type] || WORK_TYPE_EMOJI.other
  const countdown = useCountdown(order.deadline)
  const StatusIcon = statusConfig.icon

  const isWorking = ['paid', 'paid_full', 'in_progress', 'revision'].includes(order.status)
  const progress = order.progress || 0

  const urgencyColor =
    countdown?.urgency === 'critical'
      ? DS.colors.error
      : countdown?.urgency === 'warning'
      ? DS.colors.warning
      : DS.colors.success

  return (
    <div
      style={{
        padding: DS.space.xl,
        borderRadius: DS.radius.xl,
        background: 'linear-gradient(145deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))',
        border: `1px solid ${colorWithAlpha(statusConfig.color, 0.25)}`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Row 1: Back + Type + ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md, marginBottom: DS.space.lg }}>
        <motion.button
          whileTap={reduced ? undefined : { scale: 0.95 }}
          onClick={onBack}
          aria-label="Вернуться к списку заказов"
          style={{
            width: 44,
            height: 44,
            borderRadius: DS.radius.md,
            background: DS.colors.surfaceElevated,
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm, marginBottom: DS.space.xs }}>
            <span style={{ fontSize: DS.fontSize['3xl'] }}>{typeEmoji}</span>
            <span
              style={{
                fontSize: DS.fontSize['2xl'] - 1,
                fontWeight: 700,
                color: DS.colors.textPrimary,
                fontFamily: 'var(--font-serif)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {order.work_type_label || 'Заказ'}
            </span>
          </div>
          {order.subject && (
            <p
              style={{
                fontSize: DS.fontSize.md,
                color: DS.colors.textSecondary,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {order.subject}
            </p>
          )}
        </div>

        {/* Order ID Badge */}
        <div
          style={{
            padding: `${DS.space.sm}px ${DS.space.lg}px`,
            borderRadius: DS.radius.md,
            background: colorWithAlpha(DS.colors.gold, 0.1),
            border: `1px solid ${colorWithAlpha(DS.colors.gold, 0.25)}`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: DS.fontSize.base,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: DS.colors.gold,
            }}
          >
            #{order.id}
          </span>
        </div>
      </div>

      {/* Row 2: Status + Deadline */}
      <div style={{ display: 'flex', gap: DS.space.md, marginBottom: DS.space.lg, flexWrap: 'wrap' }}>
        {/* Status */}
        <div
          style={{
            flex: '1 1 auto',
            minWidth: 140,
            padding: `${DS.space.md}px ${DS.space.lg}px`,
            borderRadius: DS.radius.md,
            background: colorWithAlpha(statusConfig.color, 0.12),
            border: `1px solid ${colorWithAlpha(statusConfig.color, 0.25)}`,
            display: 'flex',
            alignItems: 'center',
            gap: DS.space.md,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: DS.radius.sm + 2,
              background: colorWithAlpha(statusConfig.color, 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isWorking && !reduced ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <StatusIcon size={18} color={statusConfig.color} />
              </motion.div>
            ) : (
              <StatusIcon size={18} color={statusConfig.color} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: DS.fontSize.base,
                fontWeight: 700,
                color: statusConfig.color,
                marginBottom: isWorking && progress > 0 ? DS.space.sm : 0,
              }}
            >
              {statusConfig.label}
            </div>
            {isWorking && progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: colorWithAlpha(DS.colors.white, 0.1),
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: statusConfig.color,
                      borderRadius: 2,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: DS.fontSize.sm,
                    fontWeight: 700,
                    color: statusConfig.color,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {progress}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Deadline */}
        {countdown && !['completed', 'cancelled', 'rejected'].includes(order.status) && (
          <div
            style={{
              flex: '0 0 auto',
              padding: `${DS.space.md}px ${DS.space.lg}px`,
              borderRadius: DS.radius.md,
              background: colorWithAlpha(urgencyColor, 0.12),
              border: `1px solid ${colorWithAlpha(urgencyColor, 0.25)}`,
              display: 'flex',
              alignItems: 'center',
              gap: DS.space.sm,
            }}
          >
            {countdown.urgency === 'critical' ? (
              <Flame
                size={18}
                color={DS.colors.error}
                style={{ animation: reduced ? undefined : 'pulse 2s infinite' }}
              />
            ) : countdown.urgency === 'warning' ? (
              <AlertTriangle size={18} color={DS.colors.warning} />
            ) : (
              <Calendar size={18} color={DS.colors.success} />
            )}
            <span
              style={{
                fontSize: DS.fontSize.lg,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: urgencyColor,
              }}
            >
              {countdown.formatted}
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Price */}
      <div
        style={{
          paddingTop: DS.space.lg,
          borderTop: `1px solid ${DS.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {order.final_price && order.final_price > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: DS.space.sm }}>
                {order.promo_code && order.promo_discount && order.promo_discount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: DS.space.xs,
                      padding: `${DS.space.xs}px ${DS.space.sm}px`,
                      borderRadius: DS.radius.sm,
                      background: colorWithAlpha(DS.colors.success, 0.15),
                      border: `1px solid ${colorWithAlpha(DS.colors.success, 0.3)}`,
                    }}
                  >
                    <Sparkles size={12} color={DS.colors.success} />
                    <span
                      style={{
                        fontSize: DS.fontSize.xs,
                        fontWeight: 700,
                        color: DS.colors.success,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      −{order.promo_discount}%
                    </span>
                  </div>
                )}
                <span
                  style={{
                    fontSize: DS.fontSize['5xl'],
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    background: order.promo_code
                      ? `linear-gradient(135deg, ${DS.colors.success}, ${DS.colors.successLight})`
                      : `linear-gradient(135deg, ${DS.colors.goldLight}, ${DS.colors.gold})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatPrice(order.final_price)} ₽
                </span>
              </div>
              {order.paid_amount !== undefined && order.paid_amount > 0 && (
                <div
                  style={{
                    fontSize: DS.fontSize.sm,
                    color:
                      (order.paid_amount || 0) >= order.final_price
                        ? DS.colors.success
                        : DS.colors.textMuted,
                    marginTop: DS.space.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: DS.space.sm,
                  }}
                >
                  {(order.paid_amount || 0) >= order.final_price ? (
                    <>
                      <CheckCircle2 size={12} />
                      Оплачено полностью
                    </>
                  ) : (
                    <>
                      Оплачено {formatPrice(order.paid_amount)} ₽ • Осталось{' '}
                      {formatPrice(order.final_price - (order.paid_amount || 0))} ₽
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
              <Clock size={18} color={DS.colors.warning} />
              <span style={{ fontSize: DS.fontSize.lg, fontWeight: 600, color: DS.colors.warning }}>
                На оценке...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              REVIEW ACTIONS (STICKY)
// ═══════════════════════════════════════════════════════════════════════════════

interface ReviewActionsProps {
  order: ExtendedOrder
  isConfirming: boolean
  onConfirm: () => void
  onRevisionClick: () => void
  reduced: boolean
}

const ReviewActions = memo(function ReviewActions({
  order,
  isConfirming,
  onConfirm,
  onRevisionClick,
  reduced,
}: ReviewActionsProps) {
  const revisionCount = order.revision_count || 0
  const remainingFree = Math.max(0, CONFIG.MAX_FREE_REVISIONS - revisionCount)
  const nextRevisionPaid = remainingFree === 0

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'sticky',
        top: DS.space.lg,
        zIndex: 50,
        padding: DS.space.xl,
        borderRadius: DS.radius.xl,
        background: `linear-gradient(145deg, ${colorWithAlpha(DS.colors.purple, 0.12)}, rgba(20,20,23,0.98))`,
        border: `1px solid ${colorWithAlpha(DS.colors.purple, 0.3)}`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.md, marginBottom: DS.space.lg }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: DS.radius.md,
            background: colorWithAlpha(DS.colors.purple, 0.2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Eye size={24} color={DS.colors.purple} />
        </div>
        <div>
          <h3
            style={{
              fontSize: DS.fontSize.xl,
              fontWeight: 700,
              color: DS.colors.textPrimary,
              margin: 0,
              fontFamily: 'var(--font-serif)',
            }}
          >
            Проверьте работу
          </h3>
          <p style={{ fontSize: DS.fontSize.md, color: DS.colors.textSecondary, margin: 0 }}>
            Скачайте файлы ниже и оцените качество
          </p>
        </div>
      </div>

      {/* Revisions Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DS.space.sm,
          padding: `${DS.space.sm + 2}px ${DS.space.lg}px`,
          borderRadius: DS.radius.md,
          background: nextRevisionPaid
            ? colorWithAlpha(DS.colors.warning, 0.1)
            : DS.colors.surface,
          border: `1px solid ${nextRevisionPaid ? colorWithAlpha(DS.colors.warning, 0.25) : DS.colors.border}`,
          marginBottom: DS.space.lg,
        }}
      >
        <RefreshCw size={14} color={nextRevisionPaid ? DS.colors.warning : DS.colors.purple} />
        <span
          style={{
            fontSize: DS.fontSize.sm,
            color: nextRevisionPaid ? DS.colors.warning : DS.colors.textSecondary,
          }}
        >
          {nextRevisionPaid
            ? 'Следующая правка будет платной'
            : `Бесплатных правок: ${remainingFree} из ${CONFIG.MAX_FREE_REVISIONS}`}
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: DS.space.md }}>
        <PremiumButton
          onClick={onConfirm}
          variant="primary"
          color={DS.colors.success}
          disabled={isConfirming}
          loading={isConfirming}
          icon={<CheckCircle2 size={18} />}
          fullWidth
          reduced={reduced}
          ariaLabel="Принять работу"
        >
          {isConfirming ? 'Принимаем...' : 'Всё отлично'}
        </PremiumButton>

        <PremiumButton
          onClick={onRevisionClick}
          variant="secondary"
          color={DS.colors.warning}
          icon={<PenTool size={18} />}
          fullWidth
          reduced={reduced}
          ariaLabel="Запросить правки"
        >
          Нужны правки
        </PremiumButton>
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              FILES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface FilesSectionProps {
  order: ExtendedOrder
  onDownload: () => void
  reduced: boolean
}

const FilesSection = memo(function FilesSection({ order, onDownload, reduced }: FilesSectionProps) {
  const hasFiles = !!order.files_url
  const isCompleted = order.status === 'completed'
  const accentColor = isCompleted ? DS.colors.success : DS.colors.purple

  // No files yet
  if (!hasFiles) {
    return (
      <div
        style={{
          padding: DS.space.xl,
          borderRadius: DS.radius.xl,
          background: 'linear-gradient(145deg, rgba(28,28,32,0.95), rgba(18,18,22,0.98))',
          border: `1px solid ${DS.colors.border}`,
          marginBottom: DS.space.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.lg }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: DS.radius.md,
              background: 'rgba(107,114,128,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={24} color="#6b7280" />
          </div>
          <div>
            <h3 style={{ fontSize: DS.fontSize.lg, fontWeight: 600, color: DS.colors.textPrimary, margin: 0 }}>
              Файлы заказа
            </h3>
            <p
              style={{
                fontSize: DS.fontSize.md,
                color: DS.colors.textMuted,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: DS.space.sm,
              }}
            >
              <Clock size={12} />
              Появятся после выполнения
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleDownload = () => {
    if (!order.files_url) return
    try {
      window.open(order.files_url, '_blank', 'noopener,noreferrer')
      onDownload()
    } catch (err) {
      console.error('[FilesSection] Failed to open files:', err)
    }
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: DS.space.xl,
        borderRadius: DS.radius.xl,
        background: `linear-gradient(145deg, ${colorWithAlpha(accentColor, 0.08)}, rgba(20,20,23,0.98))`,
        border: `1px solid ${colorWithAlpha(accentColor, 0.25)}`,
        marginBottom: DS.space.lg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: DS.space.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.lg }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: DS.radius.md,
              background: colorWithAlpha(accentColor, 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={24} color={accentColor} />
          </div>
          <div>
            <h3
              style={{
                fontSize: DS.fontSize.xl,
                fontWeight: 700,
                color: DS.colors.textPrimary,
                margin: 0,
                fontFamily: 'var(--font-serif)',
              }}
            >
              {isCompleted ? 'Готовая работа' : 'Работа готова'}
            </h3>
            <p
              style={{
                fontSize: DS.fontSize.md,
                color: accentColor,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: DS.space.sm,
              }}
            >
              <CheckCircle2 size={14} />
              {isCompleted ? 'Заказ успешно выполнен' : 'Скачайте и проверьте'}
            </p>
          </div>
        </div>
        {isCompleted && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: DS.radius.sm + 2,
              background: `linear-gradient(135deg, ${DS.colors.gold}, ${DS.colors.goldDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={20} color="#0a0a0c" fill="#0a0a0c" />
          </div>
        )}
      </div>

      {/* Download Button */}
      <PremiumButton
        onClick={handleDownload}
        variant="primary"
        color={accentColor}
        icon={<Download size={18} />}
        fullWidth
        reduced={reduced}
        ariaLabel="Скачать файлы работы"
      >
        Скачать файлы
        <ExternalLink size={14} style={{ opacity: 0.7, marginLeft: DS.space.xs }} />
      </PremiumButton>

      {/* Quality Badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: DS.space.xl,
          marginTop: DS.space.lg,
          paddingTop: DS.space.lg,
          borderTop: `1px solid ${DS.colors.border}`,
        }}
      >
        {[
          { icon: Shield, label: 'Проверено' },
          { icon: CheckCircle2, label: 'По ГОСТ' },
        ].map((badge, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: DS.space.sm }}>
            <badge.icon size={14} color={DS.colors.textMuted} />
            <span style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted }}>{badge.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              CHAT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatButtonProps {
  unreadCount: number
  onClick: () => void
  reduced: boolean
}

const ChatButton = memo(function ChatButton({ unreadCount, onClick, reduced }: ChatButtonProps) {
  return (
    <motion.button
      whileTap={reduced ? undefined : { scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: DS.space.xl - 2,
        borderRadius: DS.radius.xl - 2,
        background: 'linear-gradient(145deg, rgba(25,25,30,0.95), rgba(30,30,35,0.9))',
        border: `1px solid ${colorWithAlpha(DS.colors.gold, 0.25)}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: DS.space.lg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: DS.space.lg }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: DS.radius.md,
            background: `linear-gradient(135deg, ${DS.colors.gold}, ${DS.colors.goldDark})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <MessageCircle size={24} color="#050505" />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 20,
                height: 20,
                borderRadius: DS.radius.full,
                background: DS.colors.error,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: DS.fontSize.xs,
                fontWeight: 700,
                color: DS.colors.white,
                padding: `0 ${DS.space.xs}px`,
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              fontSize: DS.fontSize.lg,
              fontWeight: 700,
              color: DS.colors.textPrimary,
              fontFamily: 'var(--font-serif)',
            }}
          >
            Написать менеджеру
          </div>
          <div
            style={{
              fontSize: DS.fontSize.sm,
              color: unreadCount > 0 ? DS.colors.success : colorWithAlpha(DS.colors.gold, 0.7),
              display: 'flex',
              alignItems: 'center',
              gap: DS.space.sm,
            }}
          >
            {unreadCount > 0 ? (
              <span style={{ fontWeight: 600 }}>{unreadCount} новых сообщений</span>
            ) : (
              <>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: DS.colors.success,
                  }}
                />
                Онлайн • Отвечаем быстро
              </>
            )}
          </div>
        </div>
      </div>
      <ChevronDown size={20} color={DS.colors.textMuted} style={{ transform: 'rotate(-90deg)' }} />
    </motion.button>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              GUARANTEES SECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface GuaranteesSectionProps {
  order: ExtendedOrder
  reduced: boolean
}

const GuaranteesSection = memo(function GuaranteesSection({ order, reduced }: GuaranteesSectionProps) {
  const revisionCount = order.revision_count || 0
  const remainingFree = Math.max(0, CONFIG.MAX_FREE_REVISIONS - revisionCount)
  const finalPrice = order.final_price || order.price || 0
  const cashbackAmount = Math.floor(finalPrice * (CONFIG.CASHBACK_PERCENT / 100))

  return (
    <CollapsibleSection
      title="Гарантии и бонусы"
      icon={<Shield size={14} />}
      iconColor={DS.colors.gold}
      reduced={reduced}
    >
      <div style={{ display: 'flex', gap: DS.space.md, flexWrap: 'wrap' }}>
        <InfoCard value="30 дней" label="гарантии на правки" color={DS.colors.success} />
        <InfoCard
          value={`${remainingFree} / ${CONFIG.MAX_FREE_REVISIONS}`}
          label="бесплатных правок"
          color={DS.colors.purple}
        />
        {finalPrice > 0 && (
          <div
            style={{
              flex: '1 1 100%',
              padding: DS.space.lg,
              borderRadius: DS.radius.md,
              background: colorWithAlpha(DS.colors.gold, 0.08),
              border: `1px solid ${colorWithAlpha(DS.colors.gold, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: DS.fontSize.md,
                  fontWeight: 600,
                  color: DS.colors.gold,
                  display: 'flex',
                  alignItems: 'center',
                  gap: DS.space.sm,
                }}
              >
                <Gift size={14} />
                Кэшбэк {CONFIG.CASHBACK_PERCENT}%
              </div>
              <div style={{ fontSize: DS.fontSize.xs, color: DS.colors.textMuted }}>
                после завершения заказа
              </div>
            </div>
            <div
              style={{
                fontSize: DS.fontSize.xl,
                fontWeight: 700,
                color: DS.colors.gold,
                fontFamily: 'var(--font-mono)',
              }}
            >
              +{formatPrice(cashbackAmount)} ₽
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

interface TimelineProps {
  order: ExtendedOrder
  reduced: boolean
}

const Timeline = memo(function Timeline({ order, reduced }: TimelineProps) {
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)

  const steps = [
    { key: 'created', label: 'Создан', done: true },
    {
      key: 'estimated',
      label: 'Оценён',
      done: !['draft', 'pending', 'waiting_estimation'].includes(order.status),
    },
    {
      key: 'paid',
      label: 'Оплачен',
      done: ['paid', 'paid_full', 'in_progress', 'revision', 'review', 'completed'].includes(order.status),
    },
    {
      key: 'in_progress',
      label: 'В работе',
      done: ['in_progress', 'revision', 'review', 'completed'].includes(order.status),
    },
    {
      key: 'review',
      label: 'На проверке',
      done: ['review', 'completed'].includes(order.status),
    },
    { key: 'completed', label: 'Готово', done: order.status === 'completed' },
  ]

  const currentStep = steps.findIndex((s) => !s.done)
  const progress = ((currentStep === -1 ? steps.length : currentStep) / steps.length) * 100

  return (
    <CollapsibleSection
      title="История заказа"
      subtitle={`• создан ${formatRelativeDate(order.created_at)}`}
      icon={<Clock size={14} />}
      iconColor={DS.colors.gold}
      reduced={reduced}
    >
      {isCancelled ? (
        <div
          style={{
            padding: DS.space.lg,
            borderRadius: DS.radius.md,
            background: colorWithAlpha(DS.colors.error, 0.1),
            border: `1px solid ${colorWithAlpha(DS.colors.error, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            gap: DS.space.md,
          }}
        >
          <XCircle size={20} color={DS.colors.error} />
          <span style={{ fontSize: DS.fontSize.base, color: DS.colors.error }}>
            Заказ {order.status === 'cancelled' ? 'отменён' : 'отклонён'}
          </span>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Progress Line */}
          <div
            style={{
              position: 'absolute',
              left: 11,
              top: 0,
              bottom: 0,
              width: 2,
              background: colorWithAlpha(DS.colors.white, 0.1),
              borderRadius: 1,
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${progress}%`,
                background: `linear-gradient(180deg, ${DS.colors.gold}, ${DS.colors.success})`,
                borderRadius: 1,
                transition: 'height 0.3s ease',
              }}
            />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space.sm }}>
            {steps.map((step, i) => {
              const isCurrent = !step.done && (i === 0 || steps[i - 1].done)
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: DS.space.md,
                    padding: `${DS.space.sm}px 0`,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: DS.radius.full,
                      background: step.done
                        ? DS.colors.success
                        : isCurrent
                        ? DS.colors.gold
                        : colorWithAlpha(DS.colors.white, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {step.done && <CheckCircle2 size={12} color={DS.colors.white} />}
                    {isCurrent && <Zap size={10} color="#0a0a0c" />}
                  </div>
                  <span
                    style={{
                      fontSize: DS.fontSize.md,
                      color: step.done
                        ? DS.colors.textPrimary
                        : isCurrent
                        ? DS.colors.gold
                        : DS.colors.textMuted,
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              REORDER BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ReorderButtonProps {
  onClick: () => void
  reduced: boolean
}

const ReorderButton = memo(function ReorderButton({ onClick, reduced }: ReorderButtonProps) {
  return (
    <PremiumButton onClick={onClick} variant="ghost" icon={<RefreshCw size={16} />} fullWidth reduced={reduced}>
      Заказать похожую работу
    </PremiumButton>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const reducedMotion = useReducedMotion()

  // State
  const [order, setOrder] = useState<ExtendedOrder | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRequestingRevision, setIsRequestingRevision] = useState(false)
  const [revisionModalOpen, setRevisionModalOpen] = useState(false)

  const { addMessageHandler } = useWebSocketContext()
  const chatRef = useRef<PremiumChatHandle>(null)

  // Safe haptic feedback
  const safeHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      try {
        haptic(type)
      } catch (e) {
        console.warn('[Haptic] Failed:', e)
      }
    },
    [haptic]
  )

  const safeHapticSuccess = useCallback(() => {
    try {
      hapticSuccess()
    } catch (e) {
      console.warn('[Haptic] Failed:', e)
    }
  }, [hapticSuccess])

  const safeHapticError = useCallback(() => {
    try {
      hapticError()
    } catch (e) {
      console.warn('[Haptic] Failed:', e)
    }
  }, [hapticError])

  // Parse and validate order ID
  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  // Load order data
  const loadOrder = useCallback(async () => {
    if (!isValidOrderId) {
      setLoadError('Некорректный ID заказа')
      setLoading(false)
      return
    }
    setLoadError(null)
    try {
      const data = await fetchOrderDetail(orderId)
      setOrder(data as ExtendedOrder)
      if (data.payment_scheme) setPaymentScheme(data.payment_scheme as 'full' | 'half')

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
          console.error('[OrderDetail] Failed to load payment info:', err)
        }
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [orderId, isValidOrderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  // WebSocket for real-time updates
  useEffect(() => {
    if (!isValidOrderId) return
    const unsubscribe = addMessageHandler((message) => {
      // Type-safe comparison: convert both to numbers
      const msgOrderId =
        typeof (message as { order_id?: unknown }).order_id === 'number'
          ? (message as { order_id: number }).order_id
          : typeof (message as { order_id?: unknown }).order_id === 'string'
          ? parseInt((message as { order_id: string }).order_id, 10)
          : null

      if (msgOrderId !== null && msgOrderId === orderId) {
        if (message.type === 'order_update') loadOrder()
      }
      if (message.type === 'refresh') loadOrder()
    })
    return unsubscribe
  }, [orderId, isValidOrderId, addMessageHandler, loadOrder])

  // Handlers
  const handleBack = useCallback(() => {
    safeHaptic('light')
    navigate('/orders')
  }, [safeHaptic, navigate])

  const openChat = useCallback(() => {
    safeHaptic('light')
    chatRef.current?.open()
  }, [safeHaptic])

  const handleConfirmCompletion = useCallback(async () => {
    if (isConfirming || !order) return
    setIsConfirming(true)
    safeHaptic('medium')
    try {
      await confirmWorkCompletion(order.id)
      setOrder((prev) => (prev ? { ...prev, status: 'completed' } : null))
      safeHapticSuccess()
    } catch (err) {
      console.error('[OrderDetail] Failed to confirm completion:', err)
      safeHapticError()
      const errorMessage =
        err instanceof Error ? err.message : 'Ошибка подтверждения. Попробуйте позже.'
      try {
        window.Telegram?.WebApp?.showAlert?.(errorMessage)
      } catch {
        alert(errorMessage)
      }
    } finally {
      setIsConfirming(false)
    }
  }, [order, isConfirming, safeHaptic, safeHapticSuccess, safeHapticError])

  const handleRevisionSubmit = useCallback(
    async (comment: string) => {
      if (isRequestingRevision || !order) return
      setIsRequestingRevision(true)
      safeHaptic('light')
      try {
        await requestRevision(order.id, comment)
        setOrder((prev) => (prev ? { ...prev, status: 'revision' } : null))
        setRevisionModalOpen(false)
        safeHapticSuccess()
        // Open chat so user can continue discussion
        setTimeout(() => openChat(), 300)
      } catch (err) {
        console.error('[OrderDetail] Failed to request revision:', err)
        safeHapticError()
        const errorMessage =
          err instanceof Error ? err.message : 'Ошибка запроса правок. Попробуйте позже.'
        try {
          window.Telegram?.WebApp?.showAlert?.(errorMessage)
        } catch {
          alert(errorMessage)
        }
      } finally {
        setIsRequestingRevision(false)
      }
    },
    [order, isRequestingRevision, safeHaptic, safeHapticSuccess, safeHapticError, openChat]
  )

  const handleReorder = useCallback(() => {
    if (!order) return
    safeHaptic('light')
    navigate('/create-order', {
      state: {
        prefill: {
          work_type: order.work_type,
          subject: order.subject,
          deadline: order.deadline,
        },
      },
    })
  }, [order, safeHaptic, navigate])

  // Loading state
  if (loading) {
    return (
      <div
        className="premium-club-page"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: DS.space.lg }}
      >
        <motion.div
          animate={reducedMotion ? undefined : { rotate: 360 }}
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

  // Error state
  if (!order || loadError) {
    return (
      <div
        className="premium-club-page"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: DS.space['2xl'],
          gap: DS.space.xl,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: DS.radius.xl,
            background: colorWithAlpha(DS.colors.error, 0.1),
            border: `1px solid ${colorWithAlpha(DS.colors.error, 0.2)}`,
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
          {loadError || 'Заказ не найден'}
        </p>
        <PremiumButton onClick={handleBack} variant="ghost" reduced={reducedMotion}>
          Назад к заказам
        </PremiumButton>
      </div>
    )
  }

  // Computed
  const showPaymentUI =
    order.final_price &&
    order.final_price > 0 &&
    (order.paid_amount || 0) < order.final_price &&
    !['completed', 'cancelled', 'rejected'].includes(order.status) &&
    paymentInfo !== null
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isReview = order.status === 'review'
  const isCompleted = order.status === 'completed'

  return (
    <div className="premium-club-page">
      {/* Subtle background gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${colorWithAlpha(DS.colors.gold, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div className="club-content" style={{ paddingBottom: 40, position: 'relative', zIndex: 1 }}>
        {/* 1. Header */}
        <OrderHeader order={order} onBack={handleBack} reduced={reducedMotion} />

        {/* 2. Review Actions (sticky) */}
        {isReview && (
          <ReviewActions
            order={order}
            isConfirming={isConfirming}
            onConfirm={handleConfirmCompletion}
            onRevisionClick={() => setRevisionModalOpen(true)}
            reduced={reducedMotion}
          />
        )}

        {/* 3. Payment Section */}
        {showPaymentUI && paymentInfo && (
          <div id="payment-section">
            <GoldenInvoice
              order={order}
              paymentInfo={paymentInfo}
              onPaymentConfirmed={loadOrder}
              paymentScheme={paymentScheme}
              setPaymentScheme={setPaymentScheme}
              onChatStart={openChat}
            />
          </div>
        )}

        {/* 4. Files Section */}
        <FilesSection order={order} onDownload={() => safeHaptic('medium')} reduced={reducedMotion} />

        {/* 5. Review Section */}
        {isCompleted && !order.review_submitted && (
          <div id="review-section">
            <ReviewSection
              orderId={order.id}
              haptic={haptic}
              onReviewSubmitted={() => setOrder((prev) => (prev ? { ...prev, review_submitted: true } : null))}
            />
          </div>
        )}

        {/* 6. Chat Button */}
        {!isCancelled && <ChatButton unreadCount={0} onClick={openChat} reduced={reducedMotion} />}

        {/* 7. Guarantees */}
        <GuaranteesSection order={order} reduced={reducedMotion} />

        {/* 8. Timeline */}
        <Timeline order={order} reduced={reducedMotion} />

        {/* 9. Reorder Button */}
        {(isCompleted || isCancelled) && <ReorderButton onClick={handleReorder} reduced={reducedMotion} />}

        {/* 10. Chat Component */}
        <PremiumChat ref={chatRef} orderId={order.id} />
      </div>

      {/* Revision Modal */}
      <RevisionModal
        isOpen={revisionModalOpen}
        onClose={() => setRevisionModalOpen(false)}
        onSubmit={handleRevisionSubmit}
        isLoading={isRequestingRevision}
        reduced={reducedMotion}
      />
    </div>
  )
}

// CSS keyframes (injected once)
if (typeof document !== 'undefined') {
  const styleId = 'order-detail-v7-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `
    document.head.appendChild(style)
  }
}
