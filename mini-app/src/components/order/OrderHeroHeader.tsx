import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowLeft, Flame, Clock, Zap, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const countdown = useCountdown(order.deadline)
  const isCompleted = order.status === 'completed'
  const isCancelled = ['cancelled', 'rejected'].includes(order.status)
  const isInProgress = ['paid', 'paid_full', 'in_progress', 'revision'].includes(order.status)

  // Parallax effect on scroll
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 150], [1, 0.8])
  const headerScale = useTransform(scrollY, [0, 150], [1, 0.95])

  const urgency = countdown?.urgency || 'safe'
  const config = urgencyConfig[urgency]
  const UrgencyIcon = config.icon

  const typeConfig = workTypeConfig[order.work_type] || workTypeConfig.other

  // Format countdown display
  const formatCountdown = () => {
    if (!countdown || countdown.isExpired) return null
    if (countdown.days > 0) {
      return { primary: countdown.days.toString(), secondary: countdown.hours.toString().padStart(2, '0'), label: ['дней', 'часов'] }
    }
    if (countdown.hours > 0) {
      return { primary: countdown.hours.toString(), secondary: countdown.minutes.toString().padStart(2, '0'), label: ['часов', 'минут'] }
    }
    return { primary: countdown.minutes.toString(), secondary: countdown.seconds.toString().padStart(2, '0'), label: ['минут', 'секунд'] }
  }

  const countdownDisplay = formatCountdown()

  return (
    <motion.div
      ref={containerRef}
      style={{ opacity: headerOpacity, scale: headerScale }}
      className="relative mb-6"
    >
      {/* Ambient glow background */}
      <div
        style={{
          position: 'absolute',
          top: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: 200,
          background: isCompleted
            ? 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.15) 0%, transparent 70%)'
            : `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top navigation row */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-main)',
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
          }}
        >
          <ArrowLeft size={22} />
        </motion.button>

        {/* Order ID Badge - Premium embossed style */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            padding: '10px 18px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 4px 20px -5px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(212, 175, 55, 0.7)',
            letterSpacing: '0.1em',
          }}>
            ID
          </span>
          <span style={{
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            background: 'linear-gradient(135deg, #d4af37, #f5d061)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.02em',
          }}>
            #{order.id.toString().padStart(4, '0')}
          </span>
        </motion.div>
      </div>

      {/* Main title area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        {/* Work type with large icon */}
        <div className="flex items-center gap-4 mb-4">
          {/* Large emoji box */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: typeConfig.bgColor,
              border: `1px solid ${typeConfig.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              boxShadow: `0 8px 25px -5px ${typeConfig.color}30`,
            }}
          >
            {typeConfig.emoji}
          </motion.div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              background: isCompleted
                ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 50%, #22c55e 100%)'
                : 'linear-gradient(135deg, #fff 0%, #e5e5e5 50%, #fff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {order.work_type_label || 'Заказ'}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <CheckCircle2 size={22} color="#22c55e" />
                </motion.div>
              )}
            </h1>
          </div>
        </div>

        {/* Subject/Topic - more prominent */}
        {order.subject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: 20,
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Тема работы
            </div>
            <p style={{
              fontSize: 15,
              color: 'var(--text-main)',
              fontFamily: 'var(--font-serif)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              {order.subject}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Countdown Timer Card - PREMIUM */}
      {!isCompleted && !isCancelled && countdown && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: 20,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${config.bgColor} 0%, rgba(20, 20, 23, 0.8) 100%)`,
            border: `1px solid ${config.borderColor}`,
            boxShadow: `0 10px 40px -10px ${config.glowColor}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated glow effect for critical */}
          {urgency === 'critical' && (
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at center, ${config.glowColor} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
          )}

          <div className="flex items-center justify-between relative z-10">
            {/* Left side: Label + Icon */}
            <div className="flex items-center gap-3">
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UrgencyIcon size={22} color={config.color} />
              </div>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 2,
                }}>
                  Дедлайн
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: config.color,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: config.bgColor,
                  }}>
                    {config.label}
                  </span>
                  {urgency === 'critical' && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <Flame size={16} color={config.color} />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Countdown */}
            {countdownDisplay && (
              <div className="flex items-baseline gap-1">
                <motion.span
                  key={countdownDisplay.primary}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: config.color,
                    lineHeight: 1,
                  }}
                >
                  {countdownDisplay.primary}
                </motion.span>
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginRight: 4,
                }}>
                  {countdownDisplay.label[0]}
                </span>
                <motion.span
                  key={countdownDisplay.secondary}
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: config.color,
                    opacity: 0.7,
                    lineHeight: 1,
                  }}
                >
                  {countdownDisplay.secondary}
                </motion.span>
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}>
                  {countdownDisplay.label[1]}
                </span>
              </div>
            )}
          </div>

          {/* Time progress bar */}
          {order.created_at && countdown && !countdown.isExpired && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ marginTop: 16 }}
            >
              <div style={{
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, 100 - (countdown.totalHours / 168) * 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
                    borderRadius: 3,
                    boxShadow: `0 0 10px ${config.glowColor}`,
                  }}
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 10,
                color: 'var(--text-muted)',
              }}>
                <span>Создан</span>
                <span>Дедлайн</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Completed celebration badge */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          style={{
            padding: 20,
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(20, 20, 23, 0.8) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 10px 40px -10px rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={28} color="#22c55e" />
          </div>
          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#22c55e',
              marginBottom: 4,
            }}>
              Заказ выполнен!
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}>
              Спасибо за доверие ✨
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
