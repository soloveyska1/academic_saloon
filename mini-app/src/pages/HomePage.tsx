import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp,
  Star, Zap, Crown, CreditCard, Briefcase
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS PANEL — INLINE STYLES
// ═══════════════════════════════════════════════════════════════════════════

const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  padding: 20,
  position: 'relative',
  overflow: 'hidden',
}

const glassGoldStyle: React.CSSProperties = {
  ...glassStyle,
  background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(20,20,23,0.9) 50%, rgba(212,175,55,0.05) 100%)',
  border: '1px solid rgba(212, 175, 55, 0.2)',
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE — HEAVY LUXURY
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess } = useTelegram()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const handlePanicOrder = () => {
    haptic('heavy')
    navigate('/create-order?type=photo_task&urgent=true')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  // Premium rank name mapping
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Шериф': 'VIP-Клиент',
    'Легенда': 'Премиум',
  }
  const displayRankName = rankNameMap[user.rank.name] || user.rank.name
  const displayNextRank = user.rank.next_rank ? (rankNameMap[user.rank.next_rank] || user.rank.next_rank) : null

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 120px', background: '#09090b' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#d4af37', fontWeight: 700, marginBottom: 4 }}>
            INTELLIGENT CLUB
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: "'Montserrat', sans-serif" }}>
            Academic Saloon
          </h1>
        </div>

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
            }}
          />
          <div style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#09090b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>AS</span>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID: BALANCE & LEVEL
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* BALANCE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={glassGoldStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#71717a' }}>
            <CreditCard size={14} />
            <span style={{ fontSize: 10, letterSpacing: '0.15em', fontWeight: 600 }}>СЧЁТ</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontFamily: "'Montserrat', sans-serif" }}>
            <AnimatedCounter value={user.balance} />
            <span style={{ color: '#d4af37', marginLeft: 4 }}>₽</span>
          </div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 8 }}>
            +{user.bonus_balance} бонусов
          </div>
        </motion.div>

        {/* LEVEL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={glassStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#71717a' }}>
            <Crown size={14} />
            <span style={{ fontSize: 10, letterSpacing: '0.15em', fontWeight: 600 }}>УРОВЕНЬ</span>
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {displayRankName}
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.rank.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ height: '100%', background: '#d4af37', borderRadius: 100 }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#71717a', marginTop: 6 }}>Уровень {user.rank.level}</div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO BUTTON — ПОРУЧИТЬ ЗАДАЧУ
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNewOrder}
        style={{
          width: '100%',
          padding: '20px 24px',
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, #B38728, #D4AF37, #FBF5B7, #D4AF37, #B38728)',
          backgroundSize: '200% auto',
          boxShadow: '0 0 30px -5px rgba(212,175,55,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
          marginBottom: 16,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#09090b', fontFamily: "'Montserrat', sans-serif" }}>
            ПОРУЧИТЬ ЗАДАЧУ
          </div>
          <div style={{ fontSize: 11, color: 'rgba(9,9,11,0.7)', marginTop: 2 }}>
            Персональный менеджер
          </div>
        </div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(9,9,11,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Plus size={22} color="#09090b" strokeWidth={2.5} />
        </div>
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════════════
          PANIC BUTTON
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handlePanicOrder}
        style={{ ...glassStyle, marginBottom: 16, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={22} color="#fff" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>Срочно?</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Скинь фото — оценим за 5 минут</div>
          </div>
          <ChevronRight size={20} color="#ef4444" />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION (Referral)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...glassGoldStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Star size={14} color="#d4af37" fill="#d4af37" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>РЕПУТАЦИЯ</span>
        </div>
        <p style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.5 }}>
          Пригласите партнёра в клуб и получайте <span style={{ color: '#d4af37', fontWeight: 600 }}>5% роялти</span> с каждого заказа.
        </p>
        <motion.button
          onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <code style={{ color: '#d4af37', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em' }}>
            {user.referral_code}
          </code>
          {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} color="#71717a" />}
        </motion.button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL
          ═══════════════════════════════════════════════════════════════════ */}
      {displayNextRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{ ...glassStyle, marginBottom: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={18} color="#d4af37" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Следующий уровень</div>
              <div style={{ fontSize: 11, color: '#71717a' }}>{displayNextRank}</div>
            </div>
            <span style={{ fontFamily: 'monospace', color: '#d4af37', fontWeight: 600 }}>{user.rank.progress}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.rank.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                borderRadius: 100,
                boxShadow: '0 0 15px rgba(212,175,55,0.5)',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center' }}>
            Осталось <span style={{ color: '#d4af37', fontWeight: 600 }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/orders')}
          style={{ ...glassStyle, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#71717a' }}>
            <Briefcase size={16} />
            <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 500 }}>ЗАКАЗЫ</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{activeOrders}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>активных</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/orders')}
          style={{ ...glassStyle, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#71717a' }}>
            <Star size={16} />
            <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 500 }}>ВСЕГО</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d4af37' }}>{user.orders_count}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>выполнено</div>
        </motion.div>
      </div>
    </div>
  )
}
