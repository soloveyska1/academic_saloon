import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion'
import { FileText, Clock, CheckCircle, AlertCircle, Loader, Lock, Eye, Calendar, Zap } from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'

interface OrdersCarouselProps {
  orders: Order[]
  onOrderClick: (id: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const statusConfig: Record<string, {
  label: string
  variant: 'gold' | 'info' | 'success' | 'warning' | 'error'
  icon: typeof FileText
}> = {
  pending: { label: 'Оценка', variant: 'warning', icon: Clock },
  waiting_estimation: { label: 'Оценка', variant: 'warning', icon: Clock },
  waiting_payment: { label: 'К оплате', variant: 'gold', icon: AlertCircle },
  verification_pending: { label: 'Проверка', variant: 'info', icon: Loader },
  confirmed: { label: 'Подтверждён', variant: 'info', icon: CheckCircle },
  paid: { label: 'В работе', variant: 'info', icon: Loader },
  paid_full: { label: 'В работе', variant: 'info', icon: Loader },
  in_progress: { label: 'В работе', variant: 'info', icon: Loader },
  review: { label: 'На проверке', variant: 'warning', icon: Clock },
  completed: { label: 'Готово', variant: 'success', icon: CheckCircle },
  cancelled: { label: 'Отменён', variant: 'error', icon: AlertCircle },
  rejected: { label: 'Отклонён', variant: 'error', icon: AlertCircle },
}

const variantColors = {
  gold: { bg: 'rgba(212, 175, 55, 0.15)', border: 'rgba(212, 175, 55, 0.4)', text: '#d4af37', glow: 'rgba(212, 175, 55, 0.5)' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
  success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)', text: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)' },
  warning: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', text: '#eab308', glow: 'rgba(234, 179, 8, 0.5)' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' },
}

// ═══════════════════════════════════════════════════════════════════════════
//  COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; text: string } | null>(null)

  useEffect(() => {
    if (!deadline) {
      setTimeLeft(null)
      return
    }

    const calculateTimeLeft = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) {
        return { days: 0, hours: 0, text: 'Истёк' }
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        return { days, hours, text: `${days}д ${hours}ч` }
      }
      return { days, hours, text: `${hours}ч` }
    }

    setTimeLeft(calculateTimeLeft())
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000)
    return () => clearInterval(interval)
  }, [deadline])

  return timeLeft
}

// ═══════════════════════════════════════════════════════════════════════════
//  TOP SECRET CASE FILE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface CaseFileCardProps {
  order: Order
  isActive: boolean
  position: number // -2, -1, 0, 1, 2
  onClick: () => void
}

function CaseFileCard({ order, isActive, position, onClick }: CaseFileCardProps) {
  const config = statusConfig[order.status] || { label: order.status, variant: 'info', icon: FileText }
  const colors = variantColors[config.variant]
  const StatusIcon = config.icon
  const countdown = useCountdown(order.deadline)

  // 3D transform calculations - Enhanced "Cover Flow" style
  const scale = isActive ? 1.1 : 0.78 - Math.abs(position) * 0.06
  const rotateY = position * 35
  const translateX = position * 75
  const translateZ = isActive ? 80 : -100 - Math.abs(position) * 40
  const opacity = isActive ? 1 : 0.6 - Math.abs(position) * 0.15
  const blur = isActive ? 0 : Math.abs(position) * 3

  // Determine if deadline is urgent (< 24 hours)
  const isUrgent = countdown && countdown.days === 0 && countdown.hours < 24

  return (
    <motion.div
      onClick={onClick}
      animate={{
        scale,
        rotateY,
        x: translateX,
        z: translateZ,
        opacity: Math.max(0.15, opacity),
        filter: `blur(${blur}px)`,
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 28,
      }}
      whileTap={{ scale: scale * 0.96 }}
      style={{
        position: 'absolute',
        width: 290,
        minHeight: 220,
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
        zIndex: isActive ? 10 : 5 - Math.abs(position),
      }}
    >
      {/* Dark Metal Card Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 22,
          // Dark metal gradient with subtle texture
          background: isActive
            ? 'linear-gradient(155deg, rgba(35, 35, 40, 0.98) 0%, rgba(18, 18, 22, 0.99) 40%, rgba(28, 28, 33, 0.97) 100%)'
            : 'linear-gradient(155deg, rgba(25, 25, 28, 0.9) 0%, rgba(12, 12, 15, 0.95) 100%)',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(50px)',
          borderRadius: 22,
          border: isActive
            ? `2px solid ${colors.border}`
            : '1px solid rgba(255, 255, 255, 0.04)',
          boxShadow: isActive
            ? `0 30px 70px -20px rgba(0, 0, 0, 0.8), 0 0 60px -15px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)`
            : '0 20px 50px -20px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Metal texture overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isActive
            ? 'radial-gradient(ellipse 120% 80% at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse 100% 60% at 70% 80%, rgba(0,0,0,0.2) 0%, transparent 50%)'
            : 'none',
          pointerEvents: 'none',
        }} />

        {/* Brushed metal lines effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 4px)',
          opacity: isActive ? 0.5 : 0.2,
          pointerEvents: 'none',
        }} />

        {/* TOP SECRET Stamp for Active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              padding: '5px 12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 0 15px -5px rgba(239, 68, 68, 0.3)',
            }}
          >
            <Lock size={11} color="#ef4444" />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: '#ef4444',
              letterSpacing: '0.12em',
            }}>
              СЕКРЕТНО
            </span>
          </motion.div>
        )}

        {/* Case Number Header with improved styling */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: isActive
              ? `linear-gradient(135deg, ${colors.bg}, rgba(0,0,0,0.3))`
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isActive ? colors.border : 'rgba(255,255,255,0.04)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isActive ? `0 0 15px -5px ${colors.glow}` : 'none',
          }}>
            <FileText size={15} color={isActive ? colors.text : '#71717a'} />
          </div>
          <div style={{ flex: 1 }}>
            <span
              className="text-mono"
              style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              ДЕЛО №
            </span>
            <div
              className="text-mono"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: isActive ? colors.text : 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textShadow: isActive ? `0 0 20px ${colors.glow}` : 'none',
              }}
            >
              {order.id.toString().padStart(5, '0')}
            </div>
          </div>
        </div>

        {/* Subject Name - Truncated with elegant display */}
        <h4
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18,
            fontWeight: 700,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            marginBottom: 14,
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textShadow: isActive ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {order.subject || 'Без предмета'}
        </h4>

        {/* Deadline Row - Countdown or Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          padding: '10px 12px',
          background: isUrgent
            ? 'rgba(239, 68, 68, 0.08)'
            : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)'}`,
          borderRadius: 10,
        }}>
          {isUrgent ? (
            <Zap size={14} color="#ef4444" />
          ) : (
            <Calendar size={14} color={isActive ? 'var(--text-secondary)' : 'var(--text-muted)'} />
          )}
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Дедлайн
            </span>
            <div className="text-mono" style={{
              fontSize: 12,
              fontWeight: 600,
              color: isUrgent ? '#ef4444' : (isActive ? 'var(--text-primary)' : 'var(--text-secondary)'),
            }}>
              {countdown ? countdown.text : (order.deadline
                ? new Date(order.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                : 'Не указан'
              )}
            </div>
          </div>
          {isUrgent && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
          )}
        </div>

        {/* Progress Bar (if in progress) */}
        {order.progress > 0 && order.progress < 100 && isActive && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Прогресс
              </span>
              <span className="text-mono" style={{ fontSize: 11, color: colors.text, fontWeight: 700 }}>
                {order.progress}%
              </span>
            </div>
            <div style={{
              height: 5,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 100,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progress}%` }}
                transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${colors.text}, ${colors.glow})`,
                  borderRadius: 100,
                  boxShadow: `0 0 15px ${colors.glow}`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer with Status Badge and Price */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Status Badge with Glowing Dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: isActive ? colors.bg : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive ? colors.border : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 100,
              boxShadow: isActive ? `0 0 20px -8px ${colors.glow}` : 'none',
            }}
          >
            {/* Glowing Status Dot */}
            <motion.div
              animate={isActive ? {
                boxShadow: [`0 0 8px ${colors.text}`, `0 0 15px ${colors.text}`, `0 0 8px ${colors.text}`],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isActive ? colors.text : '#71717a',
                boxShadow: isActive ? `0 0 8px ${colors.text}` : 'none',
              }}
            />
            <span
              className="text-mono"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isActive ? colors.text : 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Price with Gold Gradient */}
          <div style={{ textAlign: 'right' }}>
            <span
              className="text-mono"
              style={{
                fontSize: 17,
                fontWeight: 800,
                background: isActive
                  ? 'linear-gradient(135deg, #f5d061 0%, #d4af37 50%, #b48e26 100%)'
                  : 'none',
                WebkitBackgroundClip: isActive ? 'text' : 'unset',
                WebkitTextFillColor: isActive ? 'transparent' : 'var(--text-muted)',
                backgroundClip: isActive ? 'text' : 'unset',
                textShadow: isActive ? '0 0 30px rgba(212, 175, 55, 0.3)' : 'none',
              }}
            >
              {order.final_price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Active Glow Border Effect - Animated */}
        {isActive && (
          <motion.div
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 24,
              border: `2px solid ${colors.text}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* View indicator - Tap to Open */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              position: 'absolute',
              bottom: -35,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.08))',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: 100,
              boxShadow: '0 0 20px -8px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Eye size={12} color="#d4af37" />
            <span style={{ fontSize: 10, color: '#d4af37', fontWeight: 600, letterSpacing: '0.05em' }}>Открыть</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        width: '100%',
        padding: 48,
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.6) 0%, rgba(20, 20, 23, 0.8) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
      }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          width: 64,
          height: 64,
          margin: '0 auto 20px',
          borderRadius: 16,
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileText size={32} color="#d4af37" strokeWidth={1.5} />
      </motion.div>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 8,
      }}>
        Нет активных дел
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Создайте новый заказ
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN 3D COVERFLOW CAROUSEL
// ═══════════════════════════════════════════════════════════════════════════

export function OrdersCarousel({ orders, onOrderClick }: OrdersCarouselProps) {
  const { haptic } = useTelegram()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const dragX = useMotionValue(0)

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    const threshold = 50
    const velocity = info.velocity.x

    let newIndex = activeIndex
    if (info.offset.x < -threshold || velocity < -500) {
      newIndex = Math.min(activeIndex + 1, orders.length - 1)
    } else if (info.offset.x > threshold || velocity > 500) {
      newIndex = Math.max(activeIndex - 1, 0)
    }

    if (newIndex !== activeIndex) {
      haptic('light')
      setActiveIndex(newIndex)
    }

    animate(dragX, 0, { type: 'spring', stiffness: 300, damping: 30 })
  }, [activeIndex, orders.length, haptic, dragX])

  const goToSlide = useCallback((index: number) => {
    if (index !== activeIndex) {
      haptic('light')
      setActiveIndex(index)
    }
  }, [activeIndex, haptic])

  if (orders.length === 0) {
    return <EmptyState />
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 3D Stage - Premium Cover Flow */}
      <div
        ref={containerRef}
        style={{
          height: 340,
          perspective: 1400,
          perspectiveOrigin: '50% 50%',
          overflow: 'visible',
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformStyle: 'preserve-3d',
            cursor: 'grab',
            x: dragX,
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {orders.map((order, i) => {
            const position = i - activeIndex
            // Only render cards within view range
            if (Math.abs(position) > 2) return null

            return (
              <CaseFileCard
                key={order.id}
                order={order}
                isActive={i === activeIndex}
                position={position}
                onClick={() => {
                  if (i === activeIndex) {
                    onOrderClick(order.id)
                  } else {
                    goToSlide(i)
                  }
                }}
              />
            )
          })}
        </motion.div>
      </div>

      {/* Navigation Dots */}
      {orders.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 24,
          }}
        >
          {orders.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goToSlide(i)}
              animate={{
                scale: i === activeIndex ? 1.3 : 1,
                backgroundColor: i === activeIndex ? '#d4af37' : 'rgba(255,255,255,0.15)',
              }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                boxShadow: i === activeIndex ? '0 0 12px rgba(212, 175, 55, 0.6)' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Card Counter */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 12,
        }}
      >
        <span className="text-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {activeIndex + 1} / {orders.length}
        </span>
      </div>
    </div>
  )
}
