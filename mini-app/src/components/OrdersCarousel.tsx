import { useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion'
import { FileText, Clock, CheckCircle, AlertCircle, Loader, Lock, Eye } from 'lucide-react'
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

  // 3D transform calculations
  const scale = isActive ? 1.08 : 0.82 - Math.abs(position) * 0.05
  const rotateY = position * 25
  const translateX = position * 60
  const translateZ = isActive ? 50 : -80 - Math.abs(position) * 30
  const opacity = isActive ? 1 : 0.5 - Math.abs(position) * 0.1
  const blur = isActive ? 0 : Math.abs(position) * 2

  return (
    <motion.div
      onClick={onClick}
      animate={{
        scale,
        rotateY,
        x: translateX,
        z: translateZ,
        opacity: Math.max(0.2, opacity),
        filter: `blur(${blur}px)`,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileTap={{ scale: scale * 0.97 }}
      style={{
        position: 'absolute',
        width: 280,
        minHeight: 200,
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
        zIndex: isActive ? 10 : 5 - Math.abs(position),
      }}
    >
      {/* Card Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 20,
          background: isActive
            ? 'linear-gradient(145deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 23, 0.98) 50%, rgba(25, 25, 28, 0.95) 100%)'
            : 'linear-gradient(145deg, rgba(25, 25, 28, 0.85) 0%, rgba(15, 15, 18, 0.9) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: 20,
          border: isActive
            ? `2px solid ${colors.border}`
            : '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: isActive
            ? `0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 50px -10px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
            : '0 15px 40px -15px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* TOP SECRET Stamp for Active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '4px 10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Lock size={10} color="#ef4444" />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              fontWeight: 700,
              color: '#ef4444',
              letterSpacing: '0.15em',
            }}>
              СЕКРЕТНО
            </span>
          </motion.div>
        )}

        {/* Case Number Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: isActive ? colors.bg : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isActive ? colors.border : 'rgba(255,255,255,0.05)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileText size={14} color={isActive ? colors.text : '#71717a'} />
          </div>
          <div style={{ flex: 1 }}>
            <span
              className="text-mono"
              style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                letterSpacing: '0.1em',
              }}
            >
              ДЕЛО №
            </span>
            <div
              className="text-mono"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: isActive ? colors.text : 'var(--text-secondary)',
                letterSpacing: '0.05em',
              }}
            >
              {order.id.toString().padStart(5, '0')}
            </div>
          </div>
        </div>

        {/* Work Type - Like a File Label */}
        <div style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          marginBottom: 12,
        }}>
          <span
            className="text-mono"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {order.work_type_label}
          </span>
        </div>

        {/* Subject - Main Content */}
        <h4
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            fontWeight: 700,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            marginBottom: 16,
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {order.subject || 'Без предмета'}
        </h4>

        {/* Progress Bar (if in progress) */}
        {order.progress > 0 && order.progress < 100 && isActive && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Прогресс
              </span>
              <span className="text-mono" style={{ fontSize: 10, color: colors.text, fontWeight: 600 }}>
                {order.progress}%
              </span>
            </div>
            <div style={{
              height: 4,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 100,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${colors.text}, ${colors.glow})`,
                  borderRadius: 100,
                  boxShadow: `0 0 10px ${colors.glow}`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: isActive ? colors.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? colors.border : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 100,
              boxShadow: isActive ? `0 0 15px -5px ${colors.glow}` : 'none',
            }}
          >
            <StatusIcon size={11} color={isActive ? colors.text : '#71717a'} />
            <span
              className="text-mono"
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: isActive ? colors.text : 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Price */}
          <div style={{ textAlign: 'right' }}>
            <span
              className="text-mono"
              style={{
                fontSize: 16,
                fontWeight: 700,
                background: isActive
                  ? 'linear-gradient(135deg, #f5d061, #d4af37)'
                  : 'none',
                WebkitBackgroundClip: isActive ? 'text' : 'unset',
                WebkitTextFillColor: isActive ? 'transparent' : 'var(--text-muted)',
                backgroundClip: isActive ? 'text' : 'unset',
              }}
            >
              {order.final_price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Active Glow Border Effect */}
        {isActive && (
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 22,
              border: `2px solid ${colors.text}`,
              pointerEvents: 'none',
              opacity: 0.5,
            }}
          />
        )}

        {/* View indicator */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'absolute',
              bottom: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 100,
            }}
          >
            <Eye size={10} color="#d4af37" />
            <span style={{ fontSize: 9, color: '#d4af37', fontWeight: 500 }}>Открыть</span>
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
      {/* 3D Stage */}
      <div
        ref={containerRef}
        style={{
          height: 280,
          perspective: 1200,
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
