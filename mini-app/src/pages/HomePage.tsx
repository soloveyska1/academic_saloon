import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp, Percent, FileText,
  Award, Wallet, Gift, Target, Zap, Crown, Star, Users, Trophy
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode } from '../api/userApi'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '', prefix = '' }: {
  value: number
  suffix?: string
  prefix?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, prefix, suffix])

  return <span className="text-mono">{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING SVG
// ═══════════════════════════════════════════════════════════════════════════

function ProgressRing({ progress, size = 72, strokeWidth = 4 }: {
  progress: number
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.4))' }}>
      <defs>
        <linearGradient id="progressGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d061" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b48e26" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="url(#progressGold)" strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  BENTO CELL COMPONENT — THE BUILDING BLOCK
// ═══════════════════════════════════════════════════════════════════════════

interface BentoCellProps {
  children: React.ReactNode
  span?: 1 | 2
  variant?: 'default' | 'vault' | 'gold' | 'action'
  delay?: number
  onClick?: () => void
  className?: string
}

function BentoCell({ children, span = 1, variant = 'default', delay = 0, onClick, className = '' }: BentoCellProps) {
  const variants = {
    default: {
      background: 'rgba(20, 20, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
    },
    vault: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 23, 0.9) 40%, rgba(212, 175, 55, 0.05) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.2)',
      boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    gold: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(180, 142, 38, 0.08) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      boxShadow: '0 15px 40px -15px rgba(0, 0, 0, 0.5), 0 0 40px -15px rgba(212, 175, 55, 0.2)',
    },
    action: {
      background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, rgba(20, 20, 23, 0.95) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.25)',
      boxShadow: '0 15px 40px -10px rgba(0, 0, 0, 0.5), 0 0 50px -15px rgba(212, 175, 55, 0.2)',
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={className}
      style={{
        gridColumn: span === 2 ? 'span 2' : 'span 1',
        ...variants[variant],
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 18,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        minHeight: span === 2 ? 'auto' : 120,
      }}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AchievementBadge({ icon: Icon, label, unlocked }: {
  icon: typeof Star
  label: string
  unlocked: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: unlocked ? 1 : 0.3,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: unlocked
            ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))'
            : 'rgba(255, 255, 255, 0.03)',
          border: unlocked
            ? '1px solid rgba(212, 175, 55, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: unlocked ? '0 0 20px -5px rgba(212, 175, 55, 0.3)' : 'none',
        }}
      >
        <Icon size={18} color={unlocked ? '#d4af37' : '#71717a'} />
      </div>
      <span style={{ fontSize: 9, color: unlocked ? 'var(--text-secondary)' : 'var(--text-muted)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE COMPONENT — PREMIUM CONVERSION-FOCUSED
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, openBot } = useTelegram()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const handlePanicOrder = () => {
    haptic('heavy')
    // Redirect to create order with photo_task type pre-selected
    navigate('/create-order?type=photo_task&urgent=true')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  // Active orders count
  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  return (
    <div className="app-content" style={{ paddingBottom: 110 }}>
      {/* ═══════════════════════════════════════════════════════════════════
          PREMIUM BENTO GRID — CONVERSION FOCUSED
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK A — USER IDENTITY (Wide)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="default" delay={0}>
          {/* Animated mesh background */}
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(212,175,55,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(212,175,55,0.05) 0%, transparent 50%)',
              backgroundSize: '200% 200%',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            {/* Avatar with Progress Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <ProgressRing progress={user.rank.progress} size={72} strokeWidth={3} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1e 0%, #0a0a0c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
              }}>
                {user.rank.emoji}
              </div>
            </div>

            {/* Name & Rank */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.fullname}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-gold" style={{ padding: '3px 10px', fontSize: 9 }}>
                  <Award size={10} />
                  {user.rank.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Уровень {user.rank.level}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ textAlign: 'right' }}>
              <div className="text-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-400)' }}>
                {user.orders_count}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Заказов
              </div>
            </div>
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK B — MAIN VAULT (Balance)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell variant="vault" delay={0.1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Wallet size={16} color="#d4af37" />
            </div>
            <span style={{ fontSize: 10, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
              Баланс
            </span>
          </div>
          <div className="gold-gradient-text" style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1,
          }}>
            <AnimatedCounter value={user.balance} suffix=" ₽" />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            +<span style={{ color: 'var(--gold-400)' }}>{user.bonus_balance}</span> бонусов
          </div>

          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            bottom: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK C — LOYALTY LEVEL (Discount)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell variant="default" delay={0.15}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Percent size={16} color="#22c55e" />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
              Скидка
            </span>
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 800,
            fontFamily: "'Playfair Display', serif",
            color: '#22c55e',
            lineHeight: 1,
            textShadow: '0 0 30px rgba(34, 197, 94, 0.3)',
          }}>
            <AnimatedCounter value={user.discount} suffix="%" />
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            Постоянная
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            PRIMARY CTA — NEW ORDER (Wide)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="action" delay={0.2} onClick={handleNewOrder}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(212, 175, 55, 0)',
                '0 0 0 6px rgba(212, 175, 55, 0.1)',
                '0 0 0 0 rgba(212, 175, 55, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '4px 0',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f5d061 0%, #b48e26 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px -5px rgba(212, 175, 55, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}>
              <Plus size={24} color="#050505" strokeWidth={3} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>
                Новый заказ
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Рассчитать стоимость</p>
            </div>
            <ChevronRight size={22} color="var(--gold-400)" />
          </motion.div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            PANIC BUTTON — INSTANT ORDER (Wide)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell
          span={2}
          variant="default"
          delay={0.25}
          onClick={handlePanicOrder}
          className="panic-button"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '2px 0',
          }}>
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0)',
                  '0 0 20px 4px rgba(239, 68, 68, 0.3)',
                  '0 0 0 0 rgba(239, 68, 68, 0)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={22} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>
                Срочно?
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Скинь фото задания — оценим за 5 минут
              </p>
            </div>
            <ChevronRight size={20} color="#ef4444" />
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK D — REFERRAL PROGRAM (Wide) — Golden Ticket Style
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="gold" delay={0.25}>
          {/* Ticket perforations */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 20,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,0.3) 8px, rgba(0,0,0,0.3) 16px)',
            borderRadius: '18px 0 0 18px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={14} color="#d4af37" />
                <span style={{ fontSize: 10, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
                  Реферальная программа
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Получай <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>5%</span> от заказов друзей
              </div>

              {/* Referral Code */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <span className="text-mono gold-gradient-text" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>
                  {user.referral_code}
                </span>
                {copied ? (
                  <Check size={16} color="#22c55e" />
                ) : (
                  <Copy size={16} color="#d4af37" />
                )}
              </motion.button>
            </div>

            {/* Gift Icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px -10px rgba(212, 175, 55, 0.3)',
            }}>
              <Gift size={28} color="#d4af37" />
            </div>
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK E — NEXT GOAL (Wide)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="default" delay={0.3}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              {user.rank.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                {user.rank.name}
              </div>
              {user.rank.next_rank && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={10} color="var(--gold-400)" />
                  Следующий: {user.rank.next_rank}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="text-mono" style={{ fontSize: 16, color: 'var(--gold-400)', fontWeight: 600 }}>
                {user.rank.progress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: 8,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 100,
            overflow: 'hidden',
            marginBottom: 10,
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.rank.progress}%` }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                borderRadius: 100,
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
              }}
            />
          </div>

          {user.rank.next_rank && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Осталось <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            QUICK ACTIONS ROW
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell delay={0.35} onClick={() => navigate('/orders')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FileText size={18} color="var(--status-info)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Заказы</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            {activeOrders}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>активных</div>
        </BentoCell>

        <BentoCell delay={0.4} onClick={() => navigate('/roulette')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Target size={18} color="var(--gold-400)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Удача</span>
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            color: user.daily_luck_available ? 'var(--gold-400)' : 'var(--text-muted)',
          }}>
            {user.daily_luck_available ? '1' : '0'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {user.daily_luck_available ? 'доступно' : 'завтра'}
          </div>
        </BentoCell>
      </div>
    </div>
  )
}
