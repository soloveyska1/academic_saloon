/**
 * OrderDetailPage V6.0 — Private Concierge Experience
 *
 * Philosophy: "Your order deserves undivided attention"
 *
 * Design Principles:
 * 1. FOCUS — One clear action at a time
 * 2. HIERARCHY — Status → Price → Action → Details
 * 3. PERFORMANCE — No infinite animations, respect prefers-reduced-motion
 * 4. ACCESSIBILITY — Keyboard navigation, proper ARIA labels
 * 5. ELEGANCE — Premium through restraint, not decoration
 *
 * @version 6.0.0
 * @author Premium Design Team
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
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
} from 'lucide-react'
import { Order, OrderStatus } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail, fetchPaymentInfo, confirmWorkCompletion, requestRevision, PaymentInfo } from '../api/userApi'
import { useWebSocketContext } from '../hooks/useWebSocket'

// Keep existing premium components
import { ReviewSection } from '../components/order/ReviewSection'
import { GoldenInvoice } from '../components/order/GoldenInvoice'
import { PremiumChat, PremiumChatHandle } from '../components/order/PremiumChat'

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
const formatPrice = (amount: number) =>
  amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })

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

// ═══════════════════════════════════════════════════════════════════════════════
//                              STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusConfig {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  icon: typeof Clock
  needsAction: boolean
  actionLabel?: string
  step: number
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: {
    label: 'Черновик',
    shortLabel: 'Черновик',
    color: '#6b7280',
    bgColor: 'rgba(107,114,128,0.12)',
    borderColor: 'rgba(107,114,128,0.25)',
    icon: PenTool,
    needsAction: false,
    step: 0,
  },
  pending: {
    label: 'На оценке',
    shortLabel: 'Оценка',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.25)',
    icon: Clock,
    needsAction: false,
    step: 1,
  },
  waiting_estimation: {
    label: 'На оценке',
    shortLabel: 'Оценка',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.25)',
    icon: Clock,
    needsAction: false,
    step: 1,
  },
  confirmed: {
    label: 'Ожидает оплаты',
    shortLabel: 'К оплате',
    color: '#D4AF37',
    bgColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.3)',
    icon: CreditCard,
    needsAction: true,
    actionLabel: 'Оплатить',
    step: 2,
  },
  waiting_payment: {
    label: 'Ожидает оплаты',
    shortLabel: 'К оплате',
    color: '#D4AF37',
    bgColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.3)',
    icon: CreditCard,
    needsAction: true,
    actionLabel: 'Оплатить',
    step: 2,
  },
  verification_pending: {
    label: 'Проверка оплаты',
    shortLabel: 'Проверка',
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.12)',
    borderColor: 'rgba(6,182,212,0.25)',
    icon: Loader2,
    needsAction: false,
    step: 2,
  },
  paid: {
    label: 'В работе',
    shortLabel: 'В работе',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.25)',
    icon: Loader2,
    needsAction: false,
    step: 3,
  },
  paid_full: {
    label: 'В работе',
    shortLabel: 'В работе',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.25)',
    icon: Loader2,
    needsAction: false,
    step: 3,
  },
  in_progress: {
    label: 'В работе',
    shortLabel: 'В работе',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.25)',
    icon: Loader2,
    needsAction: false,
    step: 3,
  },
  revision: {
    label: 'На доработке',
    shortLabel: 'Правки',
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.12)',
    borderColor: 'rgba(249,115,22,0.25)',
    icon: RefreshCw,
    needsAction: false,
    step: 3,
  },
  review: {
    label: 'Готов к проверке',
    shortLabel: 'Проверка',
    color: '#8b5cf6',
    bgColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.25)',
    icon: Eye,
    needsAction: true,
    actionLabel: 'Проверить',
    step: 4,
  },
  completed: {
    label: 'Выполнен',
    shortLabel: 'Готово',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.25)',
    icon: CheckCircle2,
    needsAction: false,
    step: 5,
  },
  cancelled: {
    label: 'Отменён',
    shortLabel: 'Отменён',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.25)',
    icon: XCircle,
    needsAction: false,
    step: -1,
  },
  rejected: {
    label: 'Отклонён',
    shortLabel: 'Отклонён',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.25)',
    icon: XCircle,
    needsAction: false,
    step: -1,
  },
}

const WORK_TYPE_CONFIG: Record<string, { emoji: string }> = {
  masters: { emoji: '🎓' },
  diploma: { emoji: '📜' },
  coursework: { emoji: '📚' },
  essay: { emoji: '✍️' },
  report: { emoji: '📋' },
  control: { emoji: '📝' },
  presentation: { emoji: '🎯' },
  practice: { emoji: '💼' },
  independent: { emoji: '📖' },
  other: { emoji: '📄' },
  photo_task: { emoji: '📸' },
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
      if (totalHours < 12) urgency = 'critical'
      else if (totalHours < 48) urgency = 'warning'

      let formatted = ''
      if (days > 0) formatted = `${days}д ${hours}ч`
      else if (hours > 0) formatted = `${hours}ч ${minutes}м`
      else formatted = `${minutes}м`

      return { days, hours, minutes, totalHours, isExpired: false, urgency, formatted }
    }

    setResult(calculate())
    // Update every minute (not every second - saves CPU)
    const interval = setInterval(() => setResult(calculate()), 60000)
    return () => clearInterval(interval)
  }, [deadline])

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              COMPACT HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderHeaderProps {
  order: Order
  onBack: () => void
  reduced: boolean
}

const OrderHeader = memo(function OrderHeader({ order, onBack, reduced }: OrderHeaderProps) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const typeConfig = WORK_TYPE_CONFIG[order.work_type] || WORK_TYPE_CONFIG.other
  const countdown = useCountdown(order.deadline)
  const StatusIcon = statusConfig.icon

  const isWorking = ['paid', 'paid_full', 'in_progress', 'revision'].includes(order.status)
  const progress = (order as any).progress || 0

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))',
        border: `1px solid ${statusConfig.borderColor}`,
        marginBottom: 16,
      }}
    >
      {/* TOP ROW: Back + Type + ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <motion.button
          whileTap={reduced ? undefined : { scale: 0.95 }}
          onClick={onBack}
          aria-label="Вернуться к списку заказов"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.7)" />
        </motion.button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{typeConfig.emoji}</span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text-main)',
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
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
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

        <div
          style={{
            padding: '8px 14px',
            borderRadius: 12,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.25)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: '#D4AF37',
            }}
          >
            #{order.id}
          </span>
        </div>
      </div>

      {/* MIDDLE ROW: Status + Deadline */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            flex: '1 1 auto',
            minWidth: 140,
            padding: '12px 16px',
            borderRadius: 14,
            background: statusConfig.bgColor,
            border: `1px solid ${statusConfig.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${statusConfig.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
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
                fontSize: 14,
                fontWeight: 700,
                color: statusConfig.color,
                marginBottom: isWorking && progress > 0 ? 6 : 0,
              }}
            >
              {statusConfig.label}
            </div>
            {/* Progress bar for working states */}
            {isWorking && progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.1)',
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
                    fontSize: 12,
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

        {/* Deadline Badge (if not completed/cancelled) */}
        {countdown && !['completed', 'cancelled', 'rejected'].includes(order.status) && (
          <div
            style={{
              flex: '0 0 auto',
              padding: '12px 16px',
              borderRadius: 14,
              background:
                countdown.urgency === 'critical'
                  ? 'rgba(239,68,68,0.12)'
                  : countdown.urgency === 'warning'
                  ? 'rgba(245,158,11,0.12)'
                  : 'rgba(34,197,94,0.12)',
              border: `1px solid ${
                countdown.urgency === 'critical'
                  ? 'rgba(239,68,68,0.25)'
                  : countdown.urgency === 'warning'
                  ? 'rgba(245,158,11,0.25)'
                  : 'rgba(34,197,94,0.25)'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {countdown.urgency === 'critical' ? (
              <Flame
                size={18}
                color="#ef4444"
                style={{ animation: reduced ? undefined : 'pulse 2s infinite' }}
              />
            ) : countdown.urgency === 'warning' ? (
              <AlertTriangle size={18} color="#f59e0b" />
            ) : (
              <Clock size={18} color="#22c55e" />
            )}
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color:
                  countdown.urgency === 'critical'
                    ? '#ef4444'
                    : countdown.urgency === 'warning'
                    ? '#f59e0b'
                    : '#22c55e',
              }}
            >
              {countdown.formatted}
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM ROW: Price */}
      <div
        style={{
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {order.final_price && order.final_price > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {/* Promo discount badge */}
                {order.promo_code && order.promo_discount && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.3)',
                    }}
                  >
                    <Sparkles size={12} color="#22c55e" />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#22c55e',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      −{order.promo_discount}%
                    </span>
                  </div>
                )}
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    background: order.promo_code
                      ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                      : 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatPrice(order.final_price)} ₽
                </span>
              </div>
              {/* Payment status */}
              {order.paid_amount && order.paid_amount > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color:
                      order.paid_amount >= order.final_price
                        ? '#22c55e'
                        : 'rgba(255,255,255,0.5)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {order.paid_amount >= order.final_price ? (
                    <>
                      <CheckCircle2 size={12} />
                      Оплачено полностью
                    </>
                  ) : (
                    <>
                      Оплачено {formatPrice(order.paid_amount)} ₽ • Осталось{' '}
                      {formatPrice(order.final_price - order.paid_amount)} ₽
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#f59e0b" />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#f59e0b' }}>
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
  order: Order
  isConfirming: boolean
  isRequestingRevision: boolean
  onConfirm: () => void
  onRevision: () => void
  reduced: boolean
}

const ReviewActions = memo(function ReviewActions({
  order,
  isConfirming,
  isRequestingRevision,
  onConfirm,
  onRevision,
  reduced,
}: ReviewActionsProps) {
  const revisionCount = (order as any).revision_count || 0
  const maxFreeRevisions = 3
  const nextRevisionPaid = revisionCount >= maxFreeRevisions

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'sticky',
        top: 16,
        zIndex: 50,
        padding: 20,
        borderRadius: 20,
        background: 'linear-gradient(145deg, rgba(139,92,246,0.12), rgba(20,20,23,0.98))',
        border: '1px solid rgba(139,92,246,0.3)',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(139,92,246,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Eye size={22} color="#8b5cf6" />
        </div>
        <div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0,
              fontFamily: 'var(--font-serif)',
            }}
          >
            Проверьте работу
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}
          >
            Скачайте файлы ниже и оцените качество
          </p>
        </div>
      </div>

      {/* Revisions left indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 12,
          background: nextRevisionPaid
            ? 'rgba(245,158,11,0.1)'
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${
            nextRevisionPaid ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'
          }`,
          marginBottom: 16,
        }}
      >
        <RefreshCw size={14} color={nextRevisionPaid ? '#f59e0b' : '#8b5cf6'} />
        <span
          style={{
            fontSize: 12,
            color: nextRevisionPaid ? '#f59e0b' : 'rgba(255,255,255,0.6)',
          }}
        >
          {nextRevisionPaid
            ? 'Следующая правка будет платной'
            : `Бесплатных правок: ${maxFreeRevisions - revisionCount} из ${maxFreeRevisions}`}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <motion.button
          whileTap={reduced ? undefined : { scale: 0.97 }}
          disabled={isConfirming}
          onClick={onConfirm}
          aria-label="Принять работу"
          style={{
            flex: 1,
            padding: 16,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            opacity: isConfirming ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 8px 24px -4px rgba(34,197,94,0.4)',
          }}
        >
          {isConfirming ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {isConfirming ? 'Принимаем...' : 'Всё отлично'}
        </motion.button>

        <motion.button
          whileTap={reduced ? undefined : { scale: 0.97 }}
          disabled={isRequestingRevision}
          onClick={onRevision}
          aria-label="Запросить правки"
          style={{
            flex: 1,
            padding: 16,
            borderRadius: 14,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#f59e0b',
            fontSize: 15,
            fontWeight: 600,
            cursor: isRequestingRevision ? 'not-allowed' : 'pointer',
            opacity: isRequestingRevision ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isRequestingRevision ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PenTool size={18} />
          )}
          {isRequestingRevision ? 'Отправляем...' : 'Нужны правки'}
        </motion.button>
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              FILES SECTION (SIMPLIFIED)
// ═══════════════════════════════════════════════════════════════════════════════

interface FilesSectionProps {
  order: Order
  onDownload: () => void
  reduced: boolean
}

const FilesSection = memo(function FilesSection({
  order,
  onDownload,
  reduced,
}: FilesSectionProps) {
  const hasFiles = !!order.files_url
  const isCompleted = order.status === 'completed'
  const accentColor = isCompleted ? '#22c55e' : '#8b5cf6'

  if (!hasFiles) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(28,28,32,0.95), rgba(18,18,22,0.98))',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(107,114,128,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} color="#6b7280" />
          </div>
          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-main)',
                margin: 0,
              }}
            >
              Файлы заказа
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
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

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 20,
        borderRadius: 20,
        background: `linear-gradient(145deg, ${accentColor}12, rgba(20,20,23,0.98))`,
        border: `1px solid ${accentColor}30`,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${accentColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={22} color={accentColor} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                fontFamily: 'var(--font-serif)',
              }}
            >
              {isCompleted ? 'Готовая работа' : 'Работа готова'}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: accentColor,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={12} />
              {isCompleted ? 'Заказ успешно выполнен' : 'Скачайте и проверьте'}
            </p>
          </div>
        </div>
        {isCompleted && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #D4AF37, #B38728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={18} color="#0a0a0c" fill="#0a0a0c" />
          </div>
        )}
      </div>

      <motion.button
        whileTap={reduced ? undefined : { scale: 0.98 }}
        onClick={() => {
          if (order.files_url) {
            window.open(order.files_url, '_blank')
            onDownload()
          }
        }}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${accentColor}, ${
            isCompleted ? '#16a34a' : '#7c3aed'
          })`,
          border: 'none',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: `0 8px 24px -4px ${accentColor}40`,
        }}
      >
        <Download size={18} />
        Скачать файлы
        <ExternalLink size={14} style={{ opacity: 0.7 }} />
      </motion.button>

      {/* Quality indicators - compact version */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {[
          { icon: Shield, label: 'Проверено' },
          { icon: CheckCircle2, label: 'По ГОСТ' },
        ].map((badge, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <badge.icon size={12} color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              GUARANTEES SECTION (COLLAPSED)
// ═══════════════════════════════════════════════════════════════════════════════

interface GuaranteesSectionProps {
  order: Order
  reduced: boolean
}

const GuaranteesSection = memo(function GuaranteesSection({
  order,
  reduced,
}: GuaranteesSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const revisionCount = (order as any).revision_count || 0
  const finalPrice = order.final_price || order.price || 0
  const cashbackPercent = 5
  const cashbackAmount = Math.floor(finalPrice * (cashbackPercent / 100))

  return (
    <div
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color="#D4AF37" />
          Гарантии и бонусы
        </span>
        {isOpen ? (
          <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
        ) : (
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
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
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {/* 30 days guarantee */}
                <div
                  style={{
                    flex: '1 1 140px',
                    padding: 14,
                    borderRadius: 14,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#22c55e',
                      marginBottom: 4,
                    }}
                  >
                    30 дней
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    гарантии на правки
                  </div>
                </div>

                {/* Revisions */}
                <div
                  style={{
                    flex: '1 1 140px',
                    padding: 14,
                    borderRadius: 14,
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#8b5cf6',
                      marginBottom: 4,
                    }}
                  >
                    {3 - revisionCount > 0 ? 3 - revisionCount : 0} / 3
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    бесплатных правок
                  </div>
                </div>

                {/* Cashback */}
                {finalPrice > 0 && (
                  <div
                    style={{
                      flex: '1 1 100%',
                      padding: 14,
                      borderRadius: 14,
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D4AF37' }}>
                        Кэшбэк {cashbackPercent}%
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        после завершения заказа
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#D4AF37',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      +{formatPrice(cashbackAmount)} ₽
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              TIMELINE (COMPACT)
// ═══════════════════════════════════════════════════════════════════════════════

interface TimelineProps {
  order: Order
  reduced: boolean
}

const Timeline = memo(function Timeline({ order, reduced }: TimelineProps) {
  const [isOpen, setIsOpen] = useState(false)
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
      done: ['paid', 'paid_full', 'in_progress', 'revision', 'review', 'completed'].includes(
        order.status
      ),
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
    <div
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <motion.button
        whileTap={reduced ? undefined : { scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="#D4AF37" />
          История заказа
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            • создан {formatRelativeDate(order.created_at)}
          </span>
        </span>
        {isOpen ? (
          <ChevronUp size={16} color="rgba(255,255,255,0.4)" />
        ) : (
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
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
            <div style={{ padding: '0 18px 18px' }}>
              {isCancelled ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <XCircle size={20} color="#ef4444" />
                  <span style={{ fontSize: 14, color: '#ef4444' }}>
                    Заказ {order.status === 'cancelled' ? 'отменён' : 'отклонён'}
                  </span>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Progress bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${progress}%`,
                        background: 'linear-gradient(180deg, #D4AF37, #22c55e)',
                        borderRadius: 1,
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Steps */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {steps.map((step, i) => {
                      const isCurrent = !step.done && (i === 0 || steps[i - 1].done)
                      return (
                        <div
                          key={step.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 0',
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              background: step.done
                                ? '#22c55e'
                                : isCurrent
                                ? '#D4AF37'
                                : 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              position: 'relative',
                              zIndex: 1,
                            }}
                          >
                            {step.done && <CheckCircle2 size={12} color="#fff" />}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              color: step.done
                                ? 'var(--text-main)'
                                : isCurrent
                                ? '#D4AF37'
                                : 'rgba(255,255,255,0.4)',
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//                              CHAT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatButtonProps {
  orderId: number
  unreadCount: number
  onClick: () => void
  reduced: boolean
}

const ChatButton = memo(function ChatButton({
  orderId,
  unreadCount,
  onClick,
  reduced,
}: ChatButtonProps) {
  return (
    <motion.button
      whileTap={reduced ? undefined : { scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 18,
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(25,25,30,0.95), rgba(30,30,35,0.9))',
        border: '1px solid rgba(212,175,55,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #D4AF37, #B38728)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <MessageCircle size={22} color="#050505" />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                padding: '0 4px',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-main)',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Написать менеджеру
          </div>
          <div
            style={{
              fontSize: 12,
              color: unreadCount > 0 ? '#22c55e' : 'rgba(212,175,55,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
                    background: '#22c55e',
                  }}
                />
                Онлайн • Отвечаем быстро
              </>
            )}
          </div>
        </div>
      </div>
      <ChevronDown
        size={20}
        color="rgba(255,255,255,0.4)"
        style={{ transform: 'rotate(-90deg)' }}
      />
    </motion.button>
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
    <motion.button
      whileTap={reduced ? undefined : { scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 14,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
      }}
    >
      <RefreshCw size={16} color="rgba(255,255,255,0.6)" />
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
        Заказать похожую работу
      </span>
    </motion.button>
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

  const [order, setOrder] = useState<Order | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [paymentScheme, setPaymentScheme] = useState<'full' | 'half'>('full')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRequestingRevision, setIsRequestingRevision] = useState(false)
  const { addMessageHandler } = useWebSocketContext()
  const chatRef = useRef<PremiumChatHandle>(null)

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

  const orderId = id ? parseInt(id, 10) : NaN
  const isValidOrderId = !isNaN(orderId) && orderId > 0

  const loadOrder = useCallback(async () => {
    if (!isValidOrderId) {
      setLoadError('Некорректный ID заказа')
      setLoading(false)
      return
    }
    setLoadError(null)
    try {
      const data = await fetchOrderDetail(orderId)
      setOrder(data)
      if (data.payment_scheme) setPaymentScheme(data.payment_scheme as 'full' | 'half')

      // Load payment info if needed
      if (
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
      const msgOrderId = (message as any).order_id
      if (msgOrderId && msgOrderId === orderId) {
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

  const scrollToPayment = useCallback(() => {
    safeHaptic('light')
    document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' })
  }, [safeHaptic])

  const scrollToReview = useCallback(() => {
    safeHaptic('light')
    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' })
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
      window.Telegram?.WebApp?.showAlert?.(errorMessage)
    } finally {
      setIsConfirming(false)
    }
  }, [order, isConfirming, safeHaptic, safeHapticSuccess, safeHapticError])

  const handleRequestRevision = useCallback(async () => {
    if (isRequestingRevision || !order) return
    setIsRequestingRevision(true)
    safeHaptic('light')
    try {
      await requestRevision(order.id, '')
      setOrder((prev) => (prev ? { ...prev, status: 'revision' } : null))
      openChat()
    } catch (err) {
      console.error('[OrderDetail] Failed to request revision:', err)
      safeHapticError()
      const errorMessage =
        err instanceof Error ? err.message : 'Ошибка запроса правок. Попробуйте позже.'
      window.Telegram?.WebApp?.showAlert?.(errorMessage)
    } finally {
      setIsRequestingRevision(false)
    }
  }, [order, isRequestingRevision, safeHaptic, safeHapticError, openChat])

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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={32} className="text-gold" />
        </motion.div>
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
          padding: 24,
          gap: 20,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XCircle size={40} color="#ef4444" />
        </div>
        <p
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-main)',
            textAlign: 'center',
          }}
        >
          {loadError || 'Заказ не найден'}
        </p>
        <motion.button
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          onClick={handleBack}
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-main)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Назад к заказам
        </motion.button>
      </div>
    )
  }

  // Computed values
  const showPaymentUI =
    order.final_price > 0 &&
    (order.paid_amount || 0) < order.final_price &&
    !['completed', 'cancelled', 'rejected'].includes(order.status) &&
    paymentInfo !== null
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isReview = order.status === 'review'
  const isCompleted = order.status === 'completed'

  return (
    <div className="premium-club-page">
      {/* Minimal background - no particles */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="club-content" style={{ paddingBottom: 40, position: 'relative', zIndex: 1 }}>
        {/* 1. Compact Header */}
        <OrderHeader order={order} onBack={handleBack} reduced={reducedMotion} />

        {/* 2. Review Actions (STICKY - only for review status) */}
        {isReview && (
          <ReviewActions
            order={order}
            isConfirming={isConfirming}
            isRequestingRevision={isRequestingRevision}
            onConfirm={handleConfirmCompletion}
            onRevision={handleRequestRevision}
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

        {/* 5. Review Section (for completed orders) */}
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
        {!isCancelled && (
          <ChatButton orderId={order.id} unreadCount={0} onClick={openChat} reduced={reducedMotion} />
        )}

        {/* 7. Guarantees (Collapsed) */}
        <GuaranteesSection order={order} reduced={reducedMotion} />

        {/* 8. Timeline (Collapsed) */}
        <Timeline order={order} reduced={reducedMotion} />

        {/* 9. Reorder Button (for completed/cancelled) */}
        {(isCompleted || isCancelled) && (
          <ReorderButton onClick={handleReorder} reduced={reducedMotion} />
        )}

        {/* 10. Chat Component */}
        <PremiumChat ref={chatRef} orderId={order.id} />
      </div>
    </div>
  )
}

// CSS keyframes for pulse animation (injected once)
if (typeof document !== 'undefined') {
  const styleId = 'order-detail-animations'
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
