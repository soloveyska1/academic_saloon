import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp, Gift, QrCode,
  Star, Zap, Crown, CreditCard, Briefcase, Award, Target, Sparkles, Flame
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode } from '../api/userApi'
import { QRCodeModal } from '../components/ui/QRCode'
import { Confetti } from '../components/ui/Confetti'
import { DailyBonusModal } from '../components/ui/DailyBonus'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

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
//  STYLES
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
//  ACHIEVEMENT BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AchievementBadge({ icon: Icon, label, unlocked, glow }: {
  icon: typeof Star
  label: string
  unlocked: boolean
  glow?: boolean
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: unlocked ? 1 : 0.35,
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: unlocked
          ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))'
          : 'rgba(255,255,255,0.03)',
        border: unlocked
          ? '1px solid rgba(212,175,55,0.4)'
          : '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: unlocked && glow ? '0 0 20px rgba(212,175,55,0.4)' : 'none',
      }}>
        <Icon size={20} color={unlocked ? '#d4af37' : '#52525b'} />
      </div>
      <span style={{
        fontSize: 9,
        color: unlocked ? '#a1a1aa' : '#52525b',
        textAlign: 'center',
        fontWeight: 500,
      }}>
        {label}
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE — HEAVY LUXURY PREMIUM
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, webApp } = useTelegram()
  const [copied, setCopied] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showDailyBonus, setShowDailyBonus] = useState(false)

  // Check if user can claim daily bonus (mock - should come from API)
  const dailyStreak = 3 // Mock streak
  const canClaimBonus = true // Mock - should check last claim time

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

  const handlePromoSubmit = async () => {
    if (!promoCode.trim() || promoLoading) return
    setPromoLoading(true)
    setPromoMessage(null)
    try {
      const result = await applyPromoCode(promoCode.trim())
      if (result.success) {
        setPromoMessage({ type: 'success', text: result.message || 'Промокод активирован!' })
        setPromoCode('')
        hapticSuccess()
      } else {
        setPromoMessage({ type: 'error', text: result.message || 'Неверный промокод' })
      }
    } catch {
      setPromoMessage({ type: 'error', text: 'Ошибка сети' })
    }
    setPromoLoading(false)
    setTimeout(() => setPromoMessage(null), 3000)
  }

  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  // Premium rank name mapping (backend rank names → display names)
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Головорез': 'VIP-Клиент',
    'Легенда Запада': 'Премиум',
  }
  const displayRankName = rankNameMap[user.rank.name] || user.rank.name
  const displayNextRank = user.rank.next_rank ? (rankNameMap[user.rank.next_rank] || user.rank.next_rank) : null

  // Achievement badges based on user data
  const achievements = [
    { icon: Award, label: 'Первый заказ', unlocked: user.orders_count >= 1 },
    { icon: Target, label: '5 заказов', unlocked: user.orders_count >= 5 },
    { icon: Crown, label: 'VIP', unlocked: user.rank.level >= 3 },
    { icon: Sparkles, label: 'Легенда', unlocked: user.rank.level >= 4, glow: true },
  ]

  // User's Telegram photo
  const userPhoto = webApp?.initDataUnsafe?.user?.photo_url

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 120px', background: '#09090b' }}>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER WITH AVATAR
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* User Avatar with Gold Ring */}
          <div style={{ position: 'relative' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
              }}
            />
            <div style={{
              position: 'relative',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {userPhoto ? (
                <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {user.fullname?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Greeting */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 2 }}>
              {getTimeGreeting()},
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Montserrat', sans-serif" }}>
              {user.fullname?.split(' ')[0] || 'Гость'}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div style={{
          padding: '8px 14px',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 10,
        }}>
          <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>ACADEMIC SALOON</span>
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
          style={{ ...glassGoldStyle, boxShadow: '0 0 40px -10px rgba(212,175,55,0.2)' }}
        >
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#d4af37' }}>
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
              animate={{ width: `${Math.max(user.rank.progress, 5)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #8b6914, #d4af37)', borderRadius: 100 }}
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
          borderRadius: 14,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, #B38728, #D4AF37, #FBF5B7, #D4AF37, #B38728)',
          backgroundSize: '200% auto',
          boxShadow: '0 0 40px -5px rgba(212,175,55,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
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
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(9,9,11,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Plus size={24} color="#09090b" strokeWidth={2.5} />
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
        style={{ ...glassStyle, marginBottom: 16, cursor: 'pointer', borderColor: 'rgba(239,68,68,0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(239,68,68,0.4)',
            }}
          >
            <Zap size={24} color="#fff" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>Срочно?</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Скинь фото — оценим за 5 минут</div>
          </div>
          <ChevronRight size={22} color="#ef4444" />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE INPUT
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{ ...glassStyle, marginBottom: 16, padding: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Gift size={14} color="#d4af37" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.1em' }}>ПРОМОКОД</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Введите код"
            style={{
              flex: 1,
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              outline: 'none',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePromoSubmit}
            disabled={promoLoading}
            style={{
              padding: '12px 20px',
              background: promoLoading ? '#52525b' : 'linear-gradient(135deg, #d4af37, #b38728)',
              border: 'none',
              borderRadius: 10,
              color: '#09090b',
              fontWeight: 700,
              fontSize: 13,
              cursor: promoLoading ? 'wait' : 'pointer',
            }}
          >
            {promoLoading ? '...' : 'OK'}
          </motion.button>
        </div>
        {promoMessage && (
          <div style={{
            marginTop: 10,
            fontSize: 12,
            color: promoMessage.type === 'success' ? '#22c55e' : '#ef4444',
          }}>
            {promoMessage.text}
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACHIEVEMENTS
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...glassStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Award size={14} color="#d4af37" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.1em' }}>ДОСТИЖЕНИЯ</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {achievements.map((a, i) => (
            <AchievementBadge key={i} icon={a.icon} label={a.label} unlocked={a.unlocked} glow={a.glow} />
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION (Referral)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        style={{ ...glassGoldStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Star size={14} color="#d4af37" fill="#d4af37" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>РЕПУТАЦИЯ</span>
        </div>
        <p style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 14, lineHeight: 1.5 }}>
          Пригласите партнёра и получайте <span style={{ color: '#d4af37', fontWeight: 600 }}>5% роялти</span> с каждого заказа.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
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
          <motion.button
            onClick={(e) => { e.stopPropagation(); setShowQR(true); haptic('light') }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 50,
              height: 50,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode size={20} color="#d4af37" />
          </motion.button>
        </div>
        {user.referrals_count > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#71717a' }}>
            Приглашено: <span style={{ color: '#d4af37', fontWeight: 600 }}>{user.referrals_count}</span>
          </div>
        )}
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
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={20} color="#d4af37" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Следующий уровень</div>
              <div style={{ fontSize: 11, color: '#71717a' }}>{displayNextRank}</div>
            </div>
            <span style={{ fontFamily: 'monospace', color: '#d4af37', fontWeight: 600, fontSize: 15 }}>{user.rank.progress}%</span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                borderRadius: 100,
                boxShadow: '0 0 20px rgba(212,175,55,0.5)',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center' }}>
            Осталось <span style={{ color: '#d4af37', fontWeight: 600 }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS — PREMIUM
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/orders')}
          style={{
            ...glassStyle,
            cursor: 'pointer',
            borderColor: activeOrders > 0 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: activeOrders > 0 ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' : 'none',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: activeOrders > 0 ? '#3b82f6' : '#71717a' }}>
            <Briefcase size={16} />
            <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>ЗАКАЗЫ</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: activeOrders > 0 ? '#3b82f6' : '#fff' }}>{activeOrders}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>активных</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/orders')}
          style={{
            ...glassStyle,
            cursor: 'pointer',
            borderColor: 'rgba(212,175,55,0.2)',
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#d4af37' }}>
            <Star size={16} />
            <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>ВЫПОЛНЕНО</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#d4af37' }}>{user.orders_count}</div>
          <div style={{ fontSize: 10, color: '#71717a' }}>заказов</div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DAILY BONUS FLOATING BUTTON
          ═══════════════════════════════════════════════════════════════════ */}
      {canClaimBonus && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          onClick={() => { setShowDailyBonus(true); haptic('medium') }}
          style={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4af37, #b38728)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(212,175,55,0.5)',
            zIndex: 100,
          }}
        >
          <Gift size={24} color="#09090b" />
          {/* Notification badge */}
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Flame size={10} color="#fff" />
          </div>
        </motion.button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showQR && (
          <QRCodeModal
            value={user.referral_code}
            onClose={() => setShowQR(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyBonus && (
          <DailyBonusModal
            streak={dailyStreak}
            canClaim={canClaimBonus}
            onClaim={async () => {
              setShowConfetti(true)
              return { bonus: 30 }
            }}
            onClose={() => setShowDailyBonus(false)}
          />
        )}
      </AnimatePresence>

      {/* Confetti Effect */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  )
}
