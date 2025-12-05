import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp, Gift, QrCode,
  Star, Zap, Crown, CreditCard, Briefcase, Award, Target, Sparkles, Flame
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode, fetchDailyBonusInfo, claimDailyBonus, DailyBonusInfo } from '../api/userApi'
import { QRCodeModal } from '../components/ui/QRCode'
import { Confetti } from '../components/ui/Confetti'
import { DailyBonusModal } from '../components/ui/DailyBonus'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'

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
//  ULTRA-PREMIUM GLASS CARD STYLES
//  Rule: Never flat backgrounds, always gradient borders, gold-tinted shadows
// ═══════════════════════════════════════════════════════════════════════════

const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  padding: 20,
  // Glass background
  background: 'var(--bg-card)',
  // Heavy blur
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  // Gradient border simulating light on edges
  border: '1px solid var(--card-border)',
  // Gold-tinted shadow (THE SECRET)
  boxShadow: 'var(--card-shadow)',
}

const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  padding: 20,
  // Premium gold gradient background
  background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  // Heavy blur
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  // Gold gradient border
  border: '1px solid var(--border-gold)',
  // Gold aura shadow
  boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

// Inner shine effect component for cards
const CardInnerShine = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
    pointerEvents: 'none',
    borderRadius: 'inherit',
  }} />
)

// ═══════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT BADGE COMPONENT — Glass Pills Style
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
      {/* Glass Pill Badge */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        // Glass pill background
        background: unlocked
          ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'
          : 'var(--bg-glass)',
        // Gradient border
        border: unlocked
          ? '1px solid rgba(212,175,55,0.35)'
          : '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Gold glow for special badges
        boxShadow: unlocked && glow
          ? '0 0 25px rgba(212,175,55,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          : unlocked
          ? '0 0 15px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        <Icon
          size={22}
          color={unlocked ? 'var(--gold-400)' : 'var(--text-muted)'}
          strokeWidth={unlocked ? 2 : 1.5}
          style={{
            filter: unlocked && glow ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' : 'none',
          }}
        />
      </div>
      <span style={{
        fontSize: 9,
        color: unlocked ? 'var(--text-secondary)' : 'var(--text-muted)',
        textAlign: 'center',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE — HEAVY LUXURY PREMIUM
// ═══════════════════════════════════════════════════════════════════════════

// Floating Gold Particles Component (kept for extra sparkle)
const FloatingParticles = () => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + (i * 12) % 80}%`,
    top: `${15 + (i * 15) % 70}%`,
    delay: `${i * 0.9}s`,
    size: 2 + (i % 2),
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          className="gold-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: `${8 + p.id % 3}s`,
          }}
        />
      ))}
    </div>
  )
}

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, webApp } = useTelegram()
  const admin = useAdmin()
  const [copied, setCopied] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [dailyBonusInfo, setDailyBonusInfo] = useState<DailyBonusInfo | null>(null)

  // Fetch daily bonus info on mount
  useEffect(() => {
    fetchDailyBonusInfo()
      .then(setDailyBonusInfo)
      .catch(console.error)
  }, [])

  // Secret admin activation (5 quick taps on logo badge)
  const tapCountRef = useRef(0)
  const lastTapTimeRef = useRef(0)

  const handleSecretTap = useCallback(() => {
    if (!admin.isAdmin) return // Only for admins

    const now = Date.now()
    // Reset if more than 500ms between taps
    if (now - lastTapTimeRef.current > 500) {
      tapCountRef.current = 1
    } else {
      tapCountRef.current += 1
      if (tapCountRef.current >= 5) {
        haptic('heavy')
        openAdminPanel() // Open the admin panel via global function
        tapCountRef.current = 0
      }
    }
    lastTapTimeRef.current = now
  }, [admin.isAdmin, haptic])

  // Use real daily bonus data from API
  const canClaimBonus = dailyBonusInfo?.can_claim ?? false
  const dailyStreak = dailyBonusInfo?.streak ?? 1

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
    <div style={{ minHeight: '100vh', padding: '24px 20px 120px', background: 'var(--bg-main)', position: 'relative' }}>
      {/* Background particles */}
      <FloatingParticles />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER WITH AVATAR — Ultra-Premium
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* User Avatar with Spinning Gold Ring */}
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
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {userPhoto ? (
                <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 20,
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {user.fullname?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Greeting — Serif headline */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 500 }}>
              {getTimeGreeting()},
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-main)',
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.02em',
            }}>
              {user.fullname?.split(' ')[0] || 'Гость'}
            </div>
          </div>
        </div>

        {/* Logo Badge — Glass Pill (5 taps opens admin panel) */}
        <div
          onClick={handleSecretTap}
          style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
            border: '1px solid var(--border-gold)',
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 0 20px -5px rgba(212,175,55,0.2)',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <span style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.15em',
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>ЭЛИТНЫЙ КЛУБ</span>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID: BALANCE & LEVEL — Ultra-Premium Glass Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* BALANCE — Vault Style with Gold Gradient Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="breathing-card pulse-border-gold"
          style={{ ...glassGoldStyle, boxShadow: 'var(--card-shadow), 0 0 50px -15px rgba(212,175,55,0.25)' }}
        >
          {/* Inner Shine Effect */}
          <CardInnerShine />
          {/* Gold Radial Glow */}
          <div
            className="radial-glow"
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CreditCard size={14} color="var(--gold-400)" strokeWidth={1.5} className="glow-pulse" />
              <span className="float-label" style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: 700,
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>СЧЁТ</span>
            </div>
            {/* Balance with Gold Gradient Currency Symbol */}
            <div style={{
              fontSize: 30,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'baseline',
            }}>
              <AnimatedCounter value={user.balance} />
              <span style={{
                marginLeft: 6,
                fontSize: 24,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
              }}>₽</span>
            </div>
            {/* Bonus Balance — Glass Pill */}
            <div style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--success-glass)',
              border: '1px solid var(--success-border)',
              borderRadius: 100,
            }}>
              <span style={{ fontSize: 10, color: 'var(--success-text)', fontWeight: 600 }}>
                +{user.bonus_balance} бонусов
              </span>
            </div>
          </div>
        </motion.div>

        {/* LEVEL — Glass Card with Serif Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="breathing-card shimmer-wave"
          style={glassStyle}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-muted)' }}>
              <Crown size={14} strokeWidth={1.5} />
              <span style={{ fontSize: 10, letterSpacing: '0.15em', fontWeight: 700 }}>УРОВЕНЬ</span>
            </div>
            {/* Rank Name — Serif with Gold Gradient */}
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              marginBottom: 10,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.02em',
            }}>
              {displayRankName}
            </div>
            {/* Progress Bar */}
            <div style={{
              height: 5,
              background: 'var(--bg-glass)',
              borderRadius: 100,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(user.rank.progress, 5)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-shimmer"
                style={{
                  height: '100%',
                  borderRadius: 100,
                  boxShadow: '0 0 10px rgba(212,175,55,0.4)',
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
              Уровень {user.rank.level}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO BUTTON — Liquid Gold Premium CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNewOrder}
        className="shimmer-gold"
        style={{
          position: 'relative',
          width: '100%',
          padding: '22px 26px',
          borderRadius: 18,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Liquid Gold Metallic Gradient
          background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)',
          backgroundSize: '200% 200%',
          // Gold glow + inset highlights
          boxShadow: `
            0 0 50px -10px rgba(212,175,55,0.6),
            0 15px 35px -10px rgba(0,0,0,0.4),
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.1)
          `,
          marginBottom: 16,
          overflow: 'hidden',
          animation: 'liquid-gold-shift 4s ease-in-out infinite',
        }}
      >
        {/* Shimmer shine sweep effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shimmer-pass 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#09090b',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Поручить задачу
          </div>
          <div style={{ fontSize: 11, color: 'rgba(9,9,11,0.65)', marginTop: 4, fontWeight: 500 }}>
            Персональный менеджер
          </div>
        </div>
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'rgba(9,9,11,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <Plus size={26} color="#09090b" strokeWidth={2.5} />
        </div>
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════════════
          PANIC BUTTON — Error Glass Style
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handlePanicOrder}
        style={{
          ...glassStyle,
          marginBottom: 16,
          cursor: 'pointer',
          border: '1px solid var(--error-border)',
          background: 'linear-gradient(135deg, var(--error-glass) 0%, var(--bg-card) 50%)',
        }}
      >
        <CardInnerShine />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(239,68,68,0.5)',
            }}
          >
            <Zap size={24} color="#fff" strokeWidth={2} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--error-text)' }}>Срочно?</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Скинь фото — оценим за 5 минут</div>
          </div>
          <ChevronRight size={22} color="var(--error-text)" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE INPUT — Glass Card Style
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        style={{ ...glassStyle, marginBottom: 16, padding: 18 }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Gift size={14} color="var(--gold-400)" strokeWidth={1.5} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.15em',
            }}>ПРОМОКОД</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Введите код"
              style={{
                flex: 1,
                padding: '14px 16px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                borderRadius: 12,
                color: 'var(--text-main)',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--border-gold)'
                e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.1), var(--glow-gold)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-default)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePromoSubmit}
              disabled={promoLoading}
              style={{
                padding: '14px 22px',
                background: promoLoading ? 'var(--text-muted)' : 'var(--gold-metallic)',
                border: 'none',
                borderRadius: 12,
                color: '#09090b',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                cursor: promoLoading ? 'wait' : 'pointer',
                boxShadow: promoLoading ? 'none' : '0 0 20px -5px rgba(212,175,55,0.4)',
              }}
            >
              {promoLoading ? '...' : 'OK'}
            </motion.button>
          </div>
          {promoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 500,
                color: promoMessage.type === 'success' ? 'var(--success-text)' : 'var(--error-text)',
              }}
            >
              {promoMessage.text}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACHIEVEMENTS — Glass Card with Pills
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...glassStyle, marginBottom: 16 }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Award size={14} color="var(--gold-400)" strokeWidth={1.5} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.15em',
            }}>ДОСТИЖЕНИЯ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {achievements.map((a, i) => (
              <AchievementBadge key={i} icon={a.icon} label={a.label} unlocked={a.unlocked} glow={a.glow} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION (Referral) — Premium Gold Card
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="breathing-card pulse-border-gold inner-shine-sweep"
        style={{ ...glassGoldStyle, marginBottom: 16 }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Star size={14} color="var(--gold-400)" fill="var(--gold-400)" strokeWidth={1.5} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.1em',
            }}>РЕПУТАЦИЯ</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Пригласите партнёра и получайте{' '}
            <span style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}>5% роялти</span>{' '}
            с каждого заказа.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {user.referral_code}
              </code>
              {copied ? (
                <Check size={18} color="var(--success-text)" strokeWidth={2} />
              ) : (
                <Copy size={18} color="var(--text-muted)" strokeWidth={1.5} />
              )}
            </motion.button>
            <motion.button
              onClick={(e) => { e.stopPropagation(); setShowQR(true); haptic('light') }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 52,
                height: 52,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px -5px rgba(212,175,55,0.2)',
              }}
            >
              <QrCode size={22} color="var(--gold-400)" strokeWidth={1.5} />
            </motion.button>
          </div>
          {user.referrals_count > 0 && (
            <div style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--success-glass)',
              border: '1px solid var(--success-border)',
              borderRadius: 100,
            }}>
              <span style={{ fontSize: 10, color: 'var(--success-text)', fontWeight: 600 }}>
                Приглашено: {user.referrals_count}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL — Glass Card
          ═══════════════════════════════════════════════════════════════════ */}
      {displayNextRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="breathing-card shimmer-wave"
          style={{ ...glassStyle, marginBottom: 16 }}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px -5px rgba(212,175,55,0.2)',
              }}>
                <TrendingUp size={22} color="var(--gold-400)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Следующий уровень</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-serif)',
                  background: 'var(--gold-text-shine)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginTop: 2,
                }}>{displayNextRank}</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 16,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{user.rank.progress}%</span>
            </div>
            <div style={{
              height: 10,
              background: 'var(--bg-glass)',
              borderRadius: 100,
              overflow: 'hidden',
              marginBottom: 12,
              border: '1px solid var(--border-subtle)',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-shimmer"
                style={{
                  height: '100%',
                  borderRadius: 100,
                  boxShadow: '0 0 15px rgba(212,175,55,0.5)',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Осталось{' '}
              <span style={{
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS — Ultra-Premium Glass Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Active Orders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/orders')}
          style={{
            ...glassStyle,
            cursor: 'pointer',
            border: activeOrders > 0 ? '1px solid var(--info-border)' : '1px solid var(--card-border)',
            background: activeOrders > 0
              ? 'linear-gradient(135deg, var(--info-glass) 0%, var(--bg-card) 50%)'
              : 'var(--bg-card)',
          }}
        >
          <CardInnerShine />
          <div style={{
            position: 'absolute',
            bottom: -15,
            right: -15,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: activeOrders > 0
              ? 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Briefcase size={16} color={activeOrders > 0 ? 'var(--info-text)' : 'var(--text-muted)'} strokeWidth={1.5} />
              <span style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: 700,
                color: activeOrders > 0 ? 'var(--info-text)' : 'var(--text-muted)',
              }}>ЗАКАЗЫ</span>
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              color: activeOrders > 0 ? 'var(--info-text)' : 'var(--text-main)',
              textShadow: activeOrders > 0 ? '0 0 20px rgba(59,130,246,0.3)' : 'none',
            }}>{activeOrders}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>активных</div>
          </div>
        </motion.div>

        {/* Completed Orders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/orders')}
          style={{
            ...glassStyle,
            cursor: 'pointer',
            border: '1px solid var(--border-gold)',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, var(--bg-card) 50%)',
          }}
        >
          <CardInnerShine />
          <div style={{
            position: 'absolute',
            bottom: -15,
            right: -15,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Star size={16} color="var(--gold-400)" fill="var(--gold-400)" strokeWidth={1.5} />
              <span style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: 700,
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>ВЫПОЛНЕНО</span>
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))',
            }}>{user.orders_count}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>заказов</div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DAILY BONUS FLOATING BUTTON — Premium Gold
          ═══════════════════════════════════════════════════════════════════ */}
      {canClaimBonus && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowDailyBonus(true); haptic('medium') }}
          style={{
            position: 'fixed',
            bottom: 110,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--gold-metallic)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.6), 0 10px 30px -10px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <Gift size={26} color="#09090b" strokeWidth={2} />
          {/* Notification badge */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239,68,68,0.5)',
              border: '2px solid var(--bg-main)',
            }}
          >
            <Flame size={12} color="#fff" />
          </motion.div>
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
        {showDailyBonus && dailyBonusInfo && (
          <DailyBonusModal
            streak={dailyStreak}
            canClaim={canClaimBonus}
            bonuses={dailyBonusInfo.bonuses}
            cooldownRemaining={dailyBonusInfo.cooldown_remaining}
            onClaim={async () => {
              const result = await claimDailyBonus()
              if (result.won) {
                setShowConfetti(true)
              }
              // Refresh daily bonus info after claim
              setDailyBonusInfo(prev => prev ? { ...prev, can_claim: false, cooldown_remaining: '24ч' } : null)
              return result
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
