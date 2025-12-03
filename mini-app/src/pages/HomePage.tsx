import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Plus, Sparkles, ChevronRight, Copy, Check, Star } from 'lucide-react'
import { UserData, Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode } from '../api/userApi'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED NUMBER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString())
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })

    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded])

  return (
    <span className="text-mono">
      {displayValue}{suffix}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING SVG
// ═══════════════════════════════════════════════════════════════════════════

function ProgressRing({ progress, size = 88, strokeWidth = 4 }: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="progress-ring">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e6c547" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b48e26" />
        </linearGradient>
      </defs>
      <circle
        className="progress-ring-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
      />
      <motion.circle
        className="progress-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: string }> = {
    pending: { label: 'Оценка', variant: 'badge-warning' },
    waiting_estimation: { label: 'Оценка', variant: 'badge-warning' },
    waiting_payment: { label: 'К оплате', variant: 'badge-gold' },
    verification_pending: { label: 'Проверка', variant: 'badge-info' },
    paid: { label: 'В работе', variant: 'badge-info' },
    paid_full: { label: 'В работе', variant: 'badge-info' },
    in_progress: { label: 'В работе', variant: 'badge-info' },
    review: { label: 'Проверка', variant: 'badge-warning' },
    completed: { label: 'Готово', variant: 'badge-success' },
    cancelled: { label: 'Отменён', variant: 'badge-error' },
    rejected: { label: 'Отклонён', variant: 'badge-error' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'badge' }

  return (
    <span className={`badge ${variant}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER CARD
// ═══════════════════════════════════════════════════════════════════════════

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: 260,
        padding: 16,
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          #{order.id}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <h4 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15,
        fontWeight: 600,
        marginBottom: 4,
        color: 'var(--text-primary)'
      }}>
        {order.work_type_label}
      </h4>

      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 12,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {order.subject || 'Без предмета'}
      </p>

      {order.progress > 0 && order.progress < 100 && (
        <div style={{
          height: 4,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${order.progress}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
              borderRadius: 'var(--radius-full)',
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyBountyBoard() {
  return (
    <div style={{
      width: 260,
      padding: 32,
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-default)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 32,
        marginBottom: 12,
        opacity: 0.5
      }}>
        🌵
      </div>
      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        fontStyle: 'italic'
      }}>
        No bounties active
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError, openBot } = useTelegram()

  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const activeOrders = user.orders.filter(o =>
    !['completed', 'cancelled', 'rejected'].includes(o.status)
  )

  const handleNewOrder = () => {
    haptic('medium')
    openBot('new_order')
  }

  const handlePromoSubmit = async () => {
    if (!promoCode.trim()) return
    haptic('medium')
    setPromoLoading(true)
    setPromoResult(null)

    try {
      const result = await applyPromoCode(promoCode)
      setPromoResult(result)
      if (result.success) {
        hapticSuccess()
        setPromoCode('')
      } else {
        hapticError()
      }
    } catch {
      hapticError()
      setPromoResult({ success: false, message: 'Server error' })
    } finally {
      setPromoLoading(false)
    }
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app-content" style={{ paddingBottom: 100 }}>
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER: THE SHERIFF'S BADGE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        {/* Avatar with Progress Ring */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <ProgressRing progress={user.rank.progress} size={88} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 36,
          }}>
            {user.rank.emoji}
          </div>
        </div>

        {/* Name & Rank */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 4,
            textAlign: 'center'
          }}
        >
          {user.fullname}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--gold-400)',
            fontSize: 14,
            fontFamily: 'var(--font-display)',
          }}
        >
          <Star size={14} fill="currentColor" />
          {user.rank.name}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            width: '100%',
            marginTop: 24,
          }}
        >
          {[
            { value: user.balance, label: 'Баланс', suffix: ' ₽' },
            { value: user.bonus_balance, label: 'Бонусы', suffix: ' ₽' },
            { value: user.orders_count, label: 'Заказов', suffix: '' },
            { value: user.discount, label: 'Скидка', suffix: '%' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{
                padding: '12px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 2
              }}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
          BIG ACTION BUTTON
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.button
        className="btn-gold"
        onClick={handleNewOrder}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: [1, 1.02, 1],
        }}
        transition={{
          opacity: { duration: 0.4, delay: 0.5 },
          scale: {
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut'
          }
        }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '100%',
          padding: '18px 24px',
          fontSize: 17,
          marginBottom: 32,
        }}
      >
        <Plus size={20} strokeWidth={2.5} />
        НОВЫЙ ЗАКАЗ
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════════════
          BOUNTY BOARD (Active Orders Carousel)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            Active Bounties
          </h3>
          {activeOrders.length > 0 && (
            <button
              className="btn-ghost"
              onClick={() => navigate('/orders')}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              See All
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div className="carousel">
          {activeOrders.length > 0 ? (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/order/${order.id}`)}
              />
            ))
          ) : (
            <EmptyBountyBoard />
          )}
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          RANK PROGRESS
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass-card"
        style={{ padding: 20, marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{user.rank.emoji}</span>
          <div>
            <h4 style={{ fontSize: 16, marginBottom: 2 }}>{user.rank.name}</h4>
            {user.rank.next_rank && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                → {user.rank.next_rank}
              </p>
            )}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="text-mono" style={{ fontSize: 20, color: 'var(--gold-400)' }}>
              {user.rank.progress}%
            </span>
          </div>
        </div>

        <div style={{
          height: 6,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${user.rank.progress}%` }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--gold-500), var(--gold-300), var(--gold-400))',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--glow-gold)',
            }}
          />
        </div>

        {user.rank.next_rank && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 12,
            textAlign: 'center'
          }}>
            Ещё <span style={{ color: 'var(--gold-400)' }}>
              {user.rank.spent_to_next.toLocaleString()} ₽
            </span> до следующего ранга
          </p>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ marginBottom: 24 }}
      >
        <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
          Promo Code
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="input"
            placeholder="Enter code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            maxLength={20}
            style={{ flex: 1 }}
          />
          <button
            className="btn-gold"
            onClick={handlePromoSubmit}
            disabled={promoLoading || !promoCode.trim()}
            style={{
              padding: '12px 20px',
              opacity: promoLoading || !promoCode.trim() ? 0.5 : 1
            }}
          >
            {promoLoading ? '...' : <Sparkles size={18} />}
          </button>
        </div>

        <AnimatePresence>
          {promoResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                background: promoResult.success
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                color: promoResult.success
                  ? 'var(--status-success)'
                  : 'var(--status-error)',
                border: `1px solid ${promoResult.success
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              {promoResult.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          REFERRAL
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="glass-card"
        style={{
          padding: 20,
          textAlign: 'center',
          border: '1px solid var(--border-gold)'
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Your Referral Code
        </p>
        <button
          onClick={copyReferralCode}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            margin: '0 auto',
            padding: '8px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span className="text-mono gold-gradient-text" style={{ fontSize: 18, fontWeight: 600 }}>
            {user.referral_code}
          </span>
          {copied ? (
            <Check size={16} color="var(--status-success)" />
          ) : (
            <Copy size={16} color="var(--text-muted)" />
          )}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          5% from friends' orders → your bonuses
        </p>
      </motion.section>
    </div>
  )
}
