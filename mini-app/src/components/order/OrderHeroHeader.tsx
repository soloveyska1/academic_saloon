import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Flame, Clock, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { Order } from '../../types'

interface OrderHeroHeaderProps {
  order: Order
  onBack: () => void
}

// Countdown hook with live updates
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

      // Handle Russian and English variants
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

      // Try to parse as date
      const parsed = new Date(d)
      if (isNaN(parsed.getTime())) {
        return null // Invalid date
      }
      return parsed
    }

    const calculate = () => {
      const target = parseDeadline(deadline)

      // If deadline couldn't be parsed, return null
      if (!target) {
        return null
      }

      const diff = target.getTime() - Date.now()

      if (diff <= 0) {
        return {
          days: 0, hours: 0, minutes: 0, seconds: 0,
          totalHours: 0, isExpired: true, urgency: 'expired' as const
        }
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

// Urgency color configs
const urgencyConfig = {
  safe: {
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    icon: Clock,
    label: 'В срок'
  },
  warning: {
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: AlertTriangle,
    label: 'Скоро'
  },
  critical: {
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    icon: Flame,
    label: 'Срочно'
  },
  expired: {
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
    glowColor: 'rgba(107, 114, 128, 0.3)',
    icon: Clock,
    label: 'Истёк'
  }
}

// Work type icons with better styling
const workTypeConfig: Record<string, { emoji: string; color: string; bgColor: string }> = {
  masters: { emoji: '🎓', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  diploma: { emoji: '📜', color: '#d4af37', bgColor: 'rgba(212, 175, 55, 0.15)' },
  coursework: { emoji: '📚', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  essay: { emoji: '✍️', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  report: { emoji: '📋', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)' },
  control: { emoji: '📝', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  presentation: { emoji: '🎯', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  practice: { emoji: '💼', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  independent: { emoji: '📖', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  other: { emoji: '📄', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
  photo_task: { emoji: '📸', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' }
}

export function OrderHeroHeader({ order, onBack }: OrderHeroHeaderProps) {
  const countdown = useCountdown(order.deadline)
  const isCompleted = order.status === 'completed'
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)

  const urgency = countdown?.urgency || 'safe'
  const config = urgencyConfig[urgency]
  const UrgencyIcon = config.icon

  const typeConfig = workTypeConfig[order.work_type] || workTypeConfig.other

  // Format countdown display - compact version
  const formatCountdown = () => {
    if (!countdown || countdown.isExpired) return null
    if (countdown.days > 0) {
      return `${countdown.days}д ${countdown.hours}ч`
    }
    if (countdown.hours > 0) {
      return `${countdown.hours}ч ${countdown.minutes}м`
    }
    return `${countdown.minutes}м ${countdown.seconds}с`
  }

  const countdownText = formatCountdown()

  return (
    <div className="relative mb-4">
      {/* Compact header row: Back | Emoji + Title | ID */}
      <div className="flex items-center gap-3 mb-3">
        {/* Back button - compact */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>

        {/* Emoji + Title - inline */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: typeConfig.bgColor,
              border: `1px solid ${typeConfig.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {typeConfig.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              color: isCompleted ? '#22c55e' : 'var(--text-main)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {order.work_type_label || 'Заказ'}
              {isCompleted && <CheckCircle2 size={16} color="#22c55e" />}
            </h1>
          </div>
        </div>

        {/* Order ID - compact badge */}
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: '#d4af37',
          }}>
            #{order.id}
          </span>
        </div>
      </div>

      {/* Subject - compact single line if short, or small card if long */}
      {order.subject && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: 12,
          }}
        >
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            margin: 0,
          }}>
            {order.subject}
          </p>
        </div>
      )}

      {/* Compact Countdown / Status Row */}
      {!isCompleted && !isCancelled && countdown && countdownText && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: config.bgColor,
            border: `1px solid ${config.borderColor}`,
          }}
        >
          <UrgencyIcon size={18} color={config.color} />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>
            Дедлайн:
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: config.color,
            marginLeft: 'auto',
          }}>
            {countdownText}
          </span>
          {urgency === 'critical' && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <Flame size={16} color={config.color} />
            </motion.div>
          )}
        </div>
      )}

      {/* Completed badge - compact */}
      {isCompleted && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}
        >
          <Sparkles size={18} color="#22c55e" />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#22c55e',
          }}>
            Заказ выполнен
          </span>
          <CheckCircle2 size={16} color="#22c55e" style={{ marginLeft: 'auto' }} />
        </div>
      )}
    </div>
  )
}
