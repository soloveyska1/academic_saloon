import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Flame, Clock, AlertTriangle, CheckCircle2, Sparkles,
  CreditCard, Loader2, Eye, RefreshCw, XCircle, PenTool,
  Crown, Zap, TrendingUp
} from 'lucide-react'
import { Order, OrderStatus } from '../../types'

interface OrderHeroHeaderProps {
  order: Order
  onBack: () => void
  onActionClick?: (action: string) => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    totalHours: number
    isExpired: boolean
    urgency: 'safe' | 'warning' | 'critical' | 'expired'
  } | null>(null)

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null)
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

    const calculate = () => {
      const target = parseDeadline(deadline)
      if (!target) return null

      const diff = target.getTime() - Date.now()
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0, isExpired: true, urgency: 'expired' as const }
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      const totalHours = days * 24 + hours

      let urgency: 'safe' | 'warning' | 'critical' | 'expired' = 'safe'
      if (totalHours < 12) urgency = 'critical'
      else if (totalHours < 48) urgency = 'warning'

      return { days, hours, minutes, seconds, totalHours, isExpired: false, urgency }
    }

    setTimeLeft(calculate())
    const interval = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return timeLeft
}

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface StatusConfig {
  icon: typeof Clock
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  isActive?: boolean
  step: number // 0-4 for timeline
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: { icon: PenTool, label: 'Черновик', shortLabel: 'Черновик', color: '#6b7280', bgColor: 'rgba(107,114,128,0.15)', borderColor: 'rgba(107,114,128,0.3)', step: 0 },
  pending: { icon: Clock, label: 'На оценке', shortLabel: 'Оценка', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', isActive: true, step: 0 },
  waiting_estimation: { icon: Clock, label: 'На оценке', shortLabel: 'Оценка', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)', isActive: true, step: 0 },
  waiting_payment: { icon: CreditCard, label: 'К оплате', shortLabel: 'К оплате', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.35)', step: 1 },
  confirmed: { icon: CreditCard, label: 'К оплате', shortLabel: 'К оплате', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.35)', step: 1 },
  verification_pending: { icon: Loader2, label: 'Проверка оплаты', shortLabel: 'Проверка', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)', isActive: true, step: 1 },
  paid: { icon: Loader2, label: 'В работе', shortLabel: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', isActive: true, step: 2 },
  paid_full: { icon: Loader2, label: 'В работе', shortLabel: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', isActive: true, step: 2 },
  in_progress: { icon: Loader2, label: 'В работе', shortLabel: 'В работе', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', isActive: true, step: 2 },
  review: { icon: Eye, label: 'На проверке', shortLabel: 'Проверка', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)', step: 3 },
  revision: { icon: RefreshCw, label: 'Правки', shortLabel: 'Правки', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', isActive: true, step: 2 },
  completed: { icon: CheckCircle2, label: 'Завершён', shortLabel: 'Готово', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', step: 4 },
  cancelled: { icon: XCircle, label: 'Отменён', shortLabel: 'Отменён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', step: -1 },
  rejected: { icon: XCircle, label: 'Отклонён', shortLabel: 'Отклонён', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', step: -1 },
}

// Work type config
const WORK_TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  masters: { emoji: '🎓', color: '#8b5cf6' },
  diploma: { emoji: '📜', color: '#D4AF37' },
  coursework: { emoji: '📚', color: '#3b82f6' },
  essay: { emoji: '✍️', color: '#22c55e' },
  report: { emoji: '📋', color: '#06b6d4' },
  control: { emoji: '📝', color: '#f59e0b' },
  presentation: { emoji: '🎯', color: '#ef4444' },
  practice: { emoji: '💼', color: '#8b5cf6' },
  independent: { emoji: '📖', color: '#3b82f6' },
  other: { emoji: '📄', color: '#6b7280' },
  photo_task: { emoji: '📸', color: '#ec4899' },
}

// Urgency colors for deadline
const URGENCY_CONFIG = {
  safe: { color: '#22c55e', icon: Clock },
  warning: { color: '#f59e0b', icon: AlertTriangle },
  critical: { color: '#ef4444', icon: Flame },
  expired: { color: '#6b7280', icon: Clock },
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING PARTICLES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles({ color = '#D4AF37', count = 6 }: { color?: string; count?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-20, -80],
            x: [0, (i % 2 === 0 ? 15 : -15)],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: `${15 + (i * 14)}%`,
            bottom: '10%',
            width: 3 + Math.random() * 2,
            height: 3 + Math.random() * 2,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINI TIMELINE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function MiniTimeline({ currentStep }: { currentStep: number }) {
  const steps = ['Заявка', 'Оплата', 'Работа', 'Проверка', 'Готово']

  if (currentStep < 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((_step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            <motion.div
              initial={false}
              animate={isCurrent ? {
                scale: [1, 1.15, 1],
                boxShadow: [
                  '0 0 0 rgba(212,175,55,0)',
                  '0 0 8px rgba(212,175,55,0.5)',
                  '0 0 0 rgba(212,175,55,0)',
                ],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: isCurrent ? 10 : 6,
                height: isCurrent ? 10 : 6,
                borderRadius: '50%',
                background: isCompleted
                  ? 'linear-gradient(135deg, var(--success-text), var(--success-text))'
                  : isCurrent
                    ? 'var(--gold-metallic)'
                    : 'var(--surface-overlay)',
                border: isCurrent ? '2px solid var(--border-gold-strong)' : 'none',
              }}
            />
            {index < steps.length - 1 && (
              <div style={{
                width: 16,
                height: 2,
                background: isCompleted
                  ? 'linear-gradient(90deg, var(--success-text), var(--success-text))'
                  : 'var(--surface-active)',
                marginLeft: 2,
                marginRight: 2,
                borderRadius: 1,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function OrderHeroHeader({ order, onBack, onActionClick }: OrderHeroHeaderProps) {
  const countdown = useCountdown(order.deadline)
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const typeConfig = WORK_TYPE_CONFIG[order.work_type] || WORK_TYPE_CONFIG.other

  const isCompleted = order.status === 'completed'
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const needsPayment = ['confirmed', 'waiting_payment'].includes(order.status)
  const isInProgress = ['paid', 'paid_full', 'in_progress'].includes(order.status)
  const isReview = order.status === 'review'

  const progress = (order as any).progress || 0
  const finalPrice = order.final_price || order.price || 0
  const paidAmount = order.paid_amount || 0
  const remainingAmount = finalPrice - paidAmount

  const urgency = countdown?.urgency || 'safe'
  const urgencyConfig = URGENCY_CONFIG[urgency]
  const UrgencyIcon = urgencyConfig.icon

  // Format countdown
  const formatCountdown = () => {
    if (!countdown || countdown.isExpired) return null
    if (countdown.days > 0) return `${countdown.days}д ${countdown.hours}ч`
    if (countdown.hours > 0) return `${countdown.hours}ч ${countdown.minutes}м`
    return `${countdown.minutes}м ${countdown.seconds}с`
  }

  const countdownText = formatCountdown()

  // Determine primary action
  // NOTE: Payment action removed - GoldenInvoice has the payment CTA
  const getPrimaryAction = () => {
    if (needsPayment) return null // Кнопка оплаты находится в GoldenInvoice
    if (isReview) return { label: 'Проверить', action: 'files', color: '#8b5cf6' }
    if (isInProgress) return { label: 'Написать', action: 'chat', color: '#3b82f6' }
    if (isCompleted && !order.review_submitted) return { label: 'Оценить', action: 'review', color: '#22c55e' }
    return null
  }

  const primaryAction = getPrimaryAction()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        marginBottom: 20,
        padding: 20,
        borderRadius: 28,
        background: 'linear-gradient(145deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))',
        border: `1.5px solid ${needsPayment ? 'var(--border-gold-strong)' : isCompleted ? 'var(--success-border)' : 'var(--border-strong)'}`,
        overflow: 'hidden',
      }}
    >
      {/* Background effects */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 180,
        height: 180,
        background: `radial-gradient(circle, ${statusConfig.color}15 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Floating particles for payment/review states */}
      {(needsPayment || isReview) && <FloatingParticles color={statusConfig.color} count={5} />}

      {/* Shimmer effect for payment state */}
      {needsPayment && (
        <motion.div
          animate={{ x: ['-200%', '300%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
            transform: 'skewX(-20deg)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ═══ TOP ROW: Back + Title + ID ═══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'var(--border-default)',
            border: '1px solid var(--surface-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="var(--text-secondary)" />
        </motion.button>

        {/* Work type emoji + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <motion.div
            animate={isInProgress ? { rotate: [0, 360] } : {}}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${typeConfig.color}20, ${typeConfig.color}08)`,
              border: `1.5px solid ${typeConfig.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {typeConfig.emoji}
          </motion.div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              color: isCompleted ? 'var(--success-text)' : 'var(--text-main)',
              margin: 0,
              fontFamily: 'var(--font-serif)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {order.work_type_label || 'Заказ'}
              {isCompleted && <CheckCircle2 size={18} color="var(--success-text)" />}
            </h1>
          </div>
        </div>

        {/* Order ID badge */}
        <motion.div
          animate={needsPayment ? {
            boxShadow: [
              '0 0 0 rgba(212,175,55,0)',
              '0 0 12px rgba(212,175,55,0.4)',
              '0 0 0 rgba(212,175,55,0)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            padding: '8px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--gold-glass-medium), var(--gold-glass-subtle))',
            border: '1px solid var(--border-gold)',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontSize: 14,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            background: 'linear-gradient(135deg, var(--gold-100), var(--gold-400))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            #{order.id}
          </span>
        </motion.div>
      </div>

      {/* ═══ SUBJECT LINE ═══ */}
      {order.subject && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 14,
          background: 'var(--border-subtle)',
          border: '1px solid var(--surface-hover)',
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {order.subject}
          </p>
        </div>
      )}

      {/* ═══ STATUS + DEADLINE ROW ═══ */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 12,
        marginBottom: 16,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Status Card */}
        <motion.div
          animate={statusConfig.isActive ? {
            boxShadow: [
              `0 0 0 ${statusConfig.color}00`,
              `0 0 20px ${statusConfig.color}30`,
              `0 0 0 ${statusConfig.color}00`,
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: 16,
            background: statusConfig.bgColor,
            border: `1px solid ${statusConfig.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Status icon */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${statusConfig.color}20`,
            border: `1px solid ${statusConfig.color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {statusConfig.isActive ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <StatusIcon size={20} color={statusConfig.color} />
              </motion.div>
            ) : (
              <StatusIcon size={20} color={statusConfig.color} />
            )}
            {statusConfig.isActive && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: statusConfig.color,
                  border: '2px solid rgba(20,20,23,1)',
                  boxShadow: `0 0 8px ${statusConfig.color}`,
                }}
              />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: statusConfig.color,
              marginBottom: 2,
            }}>
              {statusConfig.label}
            </div>
            {/* Progress bar for in-progress states */}
            {isInProgress && progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1 }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${statusConfig.color}, ${statusConfig.color}88)`,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusConfig.color,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {progress}%
                </span>
              </div>
            )}
            {/* Mini timeline for non-progress states */}
            {!isInProgress && statusConfig.step >= 0 && !isCancelled && (
              <MiniTimeline currentStep={statusConfig.step} />
            )}
          </div>
        </motion.div>

        {/* Deadline Card (if not completed/cancelled) */}
        {!isCompleted && !isCancelled && countdown && countdownText && (
          <motion.div
            animate={urgency === 'critical' ? {
              boxShadow: [
                '0 0 0 rgba(239,68,68,0)',
                '0 0 16px rgba(239,68,68,0.4)',
                '0 0 0 rgba(239,68,68,0)',
              ],
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: `${urgencyConfig.color}12`,
              border: `1px solid ${urgencyConfig.color}30`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 90,
            }}
          >
            <UrgencyIcon size={18} color={urgencyConfig.color} style={{ marginBottom: 4 }} />
            <span style={{
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: urgencyConfig.color,
            }}>
              {countdownText}
            </span>
            {urgency === 'critical' && (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: 10, color: urgencyConfig.color, fontWeight: 600 }}
              >
                Срочно!
              </motion.span>
            )}
          </motion.div>
        )}
      </div>

      {/* ═══ PRICE + ACTION ROW ═══ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Price section */}
        <div>
          {finalPrice > 0 ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              {/* Promo discount badge */}
              {order.promo_code && order.promo_discount && (
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0 rgba(34,197,94,0)',
                      '0 0 10px rgba(34,197,94,0.3)',
                      '0 0 0 rgba(34,197,94,0)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
                    border: '1px solid rgba(34,197,94,0.35)',
                  }}
                >
                  <Zap size={12} color="#22c55e" fill="#22c55e" />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#22c55e',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    −{order.promo_discount}%
                  </span>
                </motion.div>
              )}
              <motion.span
                animate={needsPayment ? {
                  textShadow: [
                    '0 0 10px rgba(212,175,55,0.3)',
                    '0 0 20px rgba(212,175,55,0.5)',
                    '0 0 10px rgba(212,175,55,0.3)',
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  background: order.promo_code
                    ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                    : needsPayment
                      ? 'linear-gradient(135deg, #FCF6BA, #D4AF37)'
                      : 'linear-gradient(135deg, #fff, #e5e5e5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {finalPrice.toLocaleString('ru-RU')} ₽
              </motion.span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Clock size={18} color="#f59e0b" />
              </motion.div>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#f59e0b' }}>
                На оценке...
              </span>
            </div>
          )}

          {/* Payment status subtitle */}
          {finalPrice > 0 && paidAmount > 0 && paidAmount < finalPrice && (
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <TrendingUp size={12} />
              Оплачено {paidAmount.toLocaleString('ru-RU')} ₽ • Осталось {remainingAmount.toLocaleString('ru-RU')} ₽
            </div>
          )}
          {finalPrice > 0 && paidAmount >= finalPrice && (
            <div style={{
              fontSize: 12,
              color: '#22c55e',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <CheckCircle2 size={12} />
              Полностью оплачено
            </div>
          )}
        </div>

        {/* Primary action button */}
        {primaryAction && onActionClick && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onActionClick(primaryAction.action)}
            animate={needsPayment ? {
              boxShadow: [
                '0 4px 20px rgba(212,175,55,0.3)',
                '0 6px 30px rgba(212,175,55,0.5)',
                '0 4px 20px rgba(212,175,55,0.3)',
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              padding: '14px 24px',
              borderRadius: 14,
              background: needsPayment
                ? 'linear-gradient(135deg, #D4AF37, #B38728)'
                : `linear-gradient(135deg, ${primaryAction.color}, ${primaryAction.color}cc)`,
              border: 'none',
              color: needsPayment ? '#0a0a0c' : '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: `0 8px 24px -4px ${primaryAction.color}40`,
            }}
          >
            {needsPayment && <Crown size={18} />}
            {primaryAction.label}
          </motion.button>
        )}
      </div>

      {/* Completed celebration badge */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))',
            border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Sparkles size={20} color="#22c55e" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
            Заказ успешно выполнен! Спасибо за доверие.
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
