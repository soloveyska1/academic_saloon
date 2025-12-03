import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import { FileText, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { Order } from '../types'

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

// ═══════════════════════════════════════════════════════════════════════════
//  DOSSIER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DossierCardProps {
  order: Order
  isActive: boolean
  onClick: () => void
}

function DossierCard({ order, isActive, onClick }: DossierCardProps) {
  const config = statusConfig[order.status] || { label: order.status, variant: 'info', icon: FileText }
  const StatusIcon = config.icon

  const variantColors = {
    gold: { bg: 'rgba(212, 175, 55, 0.12)', border: 'rgba(212, 175, 55, 0.3)', text: 'var(--gold-300)' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: 'var(--status-info)' },
    success: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', text: 'var(--status-success)' },
    warning: { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', text: 'var(--status-warning)' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: 'var(--status-error)' },
  }

  const colors = variantColors[config.variant]

  return (
    <motion.div
      onClick={onClick}
      animate={{
        scale: isActive ? 1 : 0.92,
        opacity: isActive ? 1 : 0.7,
        rotateY: isActive ? 0 : -5,
      }}
      whileTap={{ scale: 0.96 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      style={{
        width: 280,
        minHeight: 160,
        padding: 20,
        background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.85) 0%, rgba(20, 20, 23, 0.95) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isActive
          ? 'var(--shadow-vault), 0 0 40px -10px rgba(212, 175, 55, 0.15)'
          : 'var(--shadow-lg)',
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {/* Metallic edge effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
      }}>
        <span
          className="text-mono"
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          #{order.id.toString().padStart(5, '0')}
        </span>

        {/* Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            borderRadius: 'var(--radius-full)',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            boxShadow: `0 0 12px -4px ${colors.text}`,
          }}
        >
          <StatusIcon size={10} />
          {config.label}
        </div>
      </div>

      {/* Content */}
      <h4
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 6,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
        }}
      >
        {order.work_type_label}
      </h4>

      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {order.subject || 'Без предмета'}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        {/* Progress or Price */}
        {order.progress > 0 && order.progress < 100 ? (
          <div style={{ flex: 1, marginRight: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Прогресс</span>
              <span className="text-mono" style={{ fontSize: 10, color: 'var(--gold-400)' }}>
                {order.progress}%
              </span>
            </div>
            <div style={{
              height: 4,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progress}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--gold-600), var(--gold-400))',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)',
                }}
              />
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Price */}
        <div style={{ textAlign: 'right' }}>
          <span
            className="text-mono gold-gradient-text"
            style={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {order.final_price.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>

      {/* Diagonal stamp for active state */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        width: '100%',
        padding: 40,
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.6) 0%, rgba(20, 20, 23, 0.8) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px dashed var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          width: 60,
          height: 60,
          margin: '0 auto 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(212, 175, 55, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FileText size={28} color="var(--gold-500)" strokeWidth={1.5} />
      </motion.div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        Нет активных дел
      </p>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 8,
          opacity: 0.7,
        }}
      >
        Создайте новый заказ
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN CAROUSEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function OrdersCarousel({ orders, onOrderClick }: OrdersCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const x = useMotionValue(0)

  const cardWidth = 296 // 280 + 16 gap
  const totalWidth = orders.length * cardWidth

  // Handle drag end - snap to nearest card
  const handleDragEnd = (_: never, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    let newIndex = activeIndex
    if (offset < -50 || velocity < -500) {
      newIndex = Math.min(activeIndex + 1, orders.length - 1)
    } else if (offset > 50 || velocity > 500) {
      newIndex = Math.max(activeIndex - 1, 0)
    }

    setActiveIndex(newIndex)
    animate(x, -newIndex * cardWidth, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    })
  }

  // Indicator dots
  const renderIndicators = () => {
    if (orders.length <= 1) return null

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginTop: 16,
        }}
      >
        {orders.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i === activeIndex ? 1.2 : 1,
              backgroundColor: i === activeIndex
                ? 'var(--gold-400)'
                : 'var(--border-strong)',
            }}
            transition={{ duration: 0.2 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: i === activeIndex
                ? '0 0 10px rgba(212, 175, 55, 0.5)'
                : 'none',
            }}
            onClick={() => {
              setActiveIndex(i)
              animate(x, -i * cardWidth, {
                type: 'spring',
                stiffness: 300,
                damping: 30,
              })
            }}
          />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return <EmptyState />
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Carousel Container */}
      <div
        ref={containerRef}
        style={{
          overflow: 'hidden',
          margin: '0 -20px',
          padding: '8px 20px',
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={{
            left: -(totalWidth - cardWidth + 40),
            right: 0,
          }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            gap: 16,
            x,
            cursor: 'grab',
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {orders.map((order, i) => (
            <DossierCard
              key={order.id}
              order={order}
              isActive={i === activeIndex}
              onClick={() => onOrderClick(order.id)}
            />
          ))}
        </motion.div>
      </div>

      {/* Indicators */}
      {renderIndicators()}

      {/* Edge fade effects */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 24,
          width: 40,
          background: 'linear-gradient(90deg, transparent, var(--bg-void))',
          pointerEvents: 'none',
          opacity: activeIndex < orders.length - 1 ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  )
}
