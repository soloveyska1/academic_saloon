import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Plus, Sparkles, Copy, Check, ChevronRight, TrendingUp, Percent, FileText, Award } from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode } from '../api/userApi'
import { OrdersCarousel } from '../components/OrdersCarousel'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  decimals = 0
}: {
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => {
    const formatted = decimals > 0
      ? v.toFixed(decimals)
      : Math.round(v).toLocaleString('ru-RU')
    return `${prefix}${formatted}${suffix}`
  })
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    })

    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded, prefix, suffix])

  return <span className="text-mono">{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING SVG
// ═══════════════════════════════════════════════════════════════════════════

function ProgressRing({ progress, size = 100, strokeWidth = 5 }: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className="progress-ring"
      style={{ filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.4))' }}
    >
      <defs>
        <linearGradient id="progressGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d061" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b48e26" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGoldGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  BENTO CELL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface BentoCellProps {
  children: React.ReactNode
  className?: string
  delay?: number
  span?: 'full' | 'half'
  variant?: 'default' | 'vault' | 'action'
  onClick?: () => void
}

function BentoCell({ children, className = '', delay = 0, span = 'half', variant = 'default', onClick }: BentoCellProps) {
  const baseStyles: React.CSSProperties = {
    gridColumn: span === 'full' ? 'span 2' : 'span 1',
    background: variant === 'vault'
      ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 20, 23, 0.95) 50%, rgba(212, 175, 55, 0.04) 100%)'
      : variant === 'action'
        ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 20, 23, 0.9) 100%)'
        : 'var(--bg-card)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: variant === 'vault'
      ? '1px solid rgba(212, 175, 55, 0.25)'
      : '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-5)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: variant === 'vault'
      ? 'var(--shadow-vault), inset 0 0 80px rgba(212, 175, 55, 0.03)'
      : 'var(--shadow-lg)',
    cursor: onClick ? 'pointer' : 'default',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={baseStyles}
      className={className}
    >
      {children}
    </motion.div>
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
    haptic('heavy')
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
      setPromoResult({ success: false, message: 'Ошибка сервера' })
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
    <div className="app-content" style={{ paddingBottom: 110 }}>
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER: USER PROFILE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 28,
          paddingTop: 8,
        }}
      >
        {/* Avatar with Progress Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing progress={user.rank.progress} size={80} strokeWidth={4} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
          }}>
            {user.rank.emoji}
          </div>
        </div>

        {/* Name & Rank Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
              gap: 8,
            }}
          >
            <span
              className="badge badge-gold"
              style={{ padding: '3px 10px', fontSize: 9 }}
            >
              <Award size={10} />
              {user.rank.name}
            </span>
            {user.rank.next_rank && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                → {user.rank.next_rank}
              </span>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID LAYOUT
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* THE VAULT — Balance Block */}
        <BentoCell span="full" variant="vault" delay={0.1}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <p
                className="text-tracked"
                style={{
                  color: 'var(--gold-400)',
                  marginBottom: 8,
                  opacity: 0.8,
                }}
              >
                Баланс
              </p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                }}
                className="gold-gradient-text"
              >
                <AnimatedCounter value={user.balance} suffix=" ₽" />
              </motion.div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p
                className="text-tracked"
                style={{
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                Бонусы
              </p>
              <div
                className="text-mono"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--gold-300)',
                }}
              >
                <AnimatedCounter value={user.bonus_balance} suffix=" ₽" />
              </div>
            </div>
          </div>

          {/* Ambient gold mesh effect */}
          <div
            style={{
              position: 'absolute',
              bottom: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        </BentoCell>

        {/* Stats Grid — Small Cells */}
        <BentoCell delay={0.2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(212, 175, 55, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Percent size={18} color="var(--gold-400)" />
            </div>
          </div>
          <p className="text-tracked" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
            Скидка
          </p>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            <AnimatedCounter value={user.discount} suffix="%" />
          </div>
        </BentoCell>

        <BentoCell delay={0.25}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText size={18} color="var(--status-info)" />
            </div>
          </div>
          <p className="text-tracked" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
            Всего заказов
          </p>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            <AnimatedCounter value={user.orders_count} />
          </div>
        </BentoCell>

        {/* ACTION BUTTON — New Order */}
        <BentoCell span="full" variant="action" delay={0.3} onClick={handleNewOrder}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(212, 175, 55, 0)',
                '0 0 0 8px rgba(212, 175, 55, 0.15)',
                '0 0 0 0 rgba(212, 175, 55, 0)',
              ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: '6px 0',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold-300) 0%, var(--gold-500) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-gold-strong), 0 4px 15px -5px rgba(0,0,0,0.5)',
              }}
            >
              <Plus size={26} color="var(--bg-void)" strokeWidth={3} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  marginBottom: 2,
                }}
              >
                Новый заказ
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Создать заявку на работу
              </p>
            </div>
            <ChevronRight
              size={24}
              color="var(--gold-400)"
              style={{ marginLeft: 'auto' }}
            />
          </motion.div>
        </BentoCell>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACTIVE ORDERS CAROUSEL
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginBottom: 28 }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingRight: 4,
        }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
          }}>
            Активные дела
          </h3>
          {activeOrders.length > 0 && (
            <button
              className="btn-ghost"
              onClick={() => navigate('/orders')}
              style={{ padding: '5px 10px', fontSize: 11 }}
            >
              Все
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        <OrdersCarousel
          orders={activeOrders}
          onOrderClick={(id) => navigate(`/order/${id}`)}
        />
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          RANK PROGRESS CARD
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card-dossier"
        style={{ padding: 20, marginBottom: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            {user.rank.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 16, marginBottom: 2, fontFamily: 'var(--font-display)' }}>
              {user.rank.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={12} color="var(--gold-400)" />
              <span className="text-mono" style={{ fontSize: 13, color: 'var(--gold-400)' }}>
                {user.rank.progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: 12,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${user.rank.progress}%` }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--gold-600), var(--gold-400), var(--gold-300))',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--glow-gold)',
            }}
          />
        </div>

        {user.rank.next_rank && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Ещё <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>
              {user.rank.spent_to_next.toLocaleString('ru-RU')} ₽
            </span> до <span style={{ color: 'var(--text-secondary)' }}>{user.rank.next_rank}</span>
          </p>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{ marginBottom: 20 }}
      >
        <h3 style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 12,
          fontWeight: 500,
        }}>
          Промокод
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="input"
            placeholder="Введите код"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            maxLength={20}
            style={{ flex: 1, fontSize: 14 }}
          />
          <motion.button
            className="btn-gold"
            onClick={handlePromoSubmit}
            disabled={promoLoading || !promoCode.trim()}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '12px 18px',
              opacity: promoLoading || !promoCode.trim() ? 0.4 : 1
            }}
          >
            {promoLoading ? '...' : <Sparkles size={18} />}
          </motion.button>
        </div>

        <AnimatePresence>
          {promoResult && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: 12,
                padding: 14,
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
          REFERRAL CODE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="gold-border"
        style={{
          padding: 20,
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(20,20,23,0.95) 0%, rgba(30,30,35,0.9) 100%)',
        }}
      >
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
          Ваш реферальный код
        </p>
        <motion.button
          onClick={copyReferralCode}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            margin: '0 auto',
            padding: '10px 20px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span
            className="text-mono gold-gradient-text"
            style={{ fontSize: 20, fontWeight: 700 }}
          >
            {user.referral_code}
          </span>
          {copied ? (
            <Check size={18} color="var(--status-success)" />
          ) : (
            <Copy size={18} color="var(--gold-400)" />
          )}
        </motion.button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          5% от заказов друзей → ваши бонусы
        </p>
      </motion.section>
    </div>
  )
}
