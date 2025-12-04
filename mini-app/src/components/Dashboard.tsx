import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Sparkles, Copy, Check, ChevronRight, Users, Wallet, Crown
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { GoldText, GoldAvatar, GoldBadge, LiquidGoldButton } from './ui/GoldText'

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD — INTELLIGENT LUXURY DESIGN
//  Premium Concierge Service Interface
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardProps {
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
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GlassCardProps {
  children: React.ReactNode
  variant?: 'default' | 'gold' | 'vault'
  className?: string
  delay?: number
  onClick?: () => void
  span?: 1 | 2
}

function GlassCard({
  children,
  variant = 'default',
  className = '',
  delay = 0,
  onClick,
  span = 1,
}: GlassCardProps) {
  const variants = {
    default: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    gold: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(18, 18, 21, 0.9) 50%, rgba(212, 175, 55, 0.05) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.2)',
    },
    vault: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(12, 12, 14, 0.95) 40%, rgba(212, 175, 55, 0.04) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.25)',
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={className}
      style={{
        gridColumn: span === 2 ? 'span 2' : 'span 1',
        ...variants[variant],
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 18,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: variant === 'vault'
          ? '0 20px 50px -15px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(212, 175, 55, 0.15)'
          : '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess } = useTelegram()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  // Get user's first name for greeting
  const firstName = user.fullname?.split(' ')[0] || 'Гость'

  return (
    <div className="app-content" style={{ paddingBottom: 110 }}>
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — THE FACE
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Avatar with spinning gold border */}
        <GoldAvatar initials="AS" size={60} />

        {/* Greeting & Status */}
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 4,
              fontWeight: 300,
            }}
          >
            Добро пожаловать,
          </p>
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.02em',
              marginBottom: 6,
            }}
          >
            {firstName}
          </h2>

          {/* Status Badge with Gold Border */}
          <GoldBadge>
            <Crown size={10} />
            LEVEL {user.rank.level}: {user.rank.name.toUpperCase()}
          </GoldBadge>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID — DASHBOARD CARDS
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            CARD 1: BALANCE (Vault Style)
            ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard variant="vault" delay={0.1}>
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={16} color="#d4af37" strokeWidth={1.5} />
            </div>
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 10,
                color: 'var(--gold-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 600,
              }}
            >
              Баланс
            </span>
          </div>

          <GoldText size="2xl" weight={800} variant="liquid">
            <AnimatedCounter value={user.balance} suffix=" ₽" />
          </GoldText>
        </GlassCard>

        {/* ═══════════════════════════════════════════════════════════════════
            CARD 2: STATUS / PRIVILEGE
            ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard variant="default" delay={0.15}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              {user.rank.emoji}
            </div>
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 600,
              }}
            >
              Статус
            </span>
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {user.rank.name}
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              style={{
                height: 4,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 100,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${user.rank.progress}%` }}
                transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                  borderRadius: 100,
                  boxShadow: '0 0 10px rgba(212, 175, 55, 0.4)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ color: 'var(--gold-400)' }}>{user.rank.progress}%</span> до следующего уровня
            </div>
          </div>
        </GlassCard>

        {/* ═══════════════════════════════════════════════════════════════════
            HERO ACTION — NEW ORDER (Liquid Gold Button)
            ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ gridColumn: 'span 2' }}
        >
          <LiquidGoldButton
            onClick={handleNewOrder}
            icon={<Sparkles size={20} strokeWidth={1.5} />}
          >
            Новый заказ
          </LiquidGoldButton>
          <p
            style={{
              textAlign: 'center',
              marginTop: 8,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontWeight: 300,
            }}
          >
            Персональный менеджер
          </p>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            REFERRAL SECTION — REPUTATION
            ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard variant="gold" span={2} delay={0.25}>
          {/* Ticket perforations effect */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 16,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,0.25) 8px, rgba(0,0,0,0.25) 16px)',
              borderRadius: '18px 0 0 18px',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={14} color="#d4af37" strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 10,
                    color: 'var(--gold-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    fontWeight: 600,
                  }}
                >
                  Репутация
                </span>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 14,
                  fontWeight: 300,
                  lineHeight: 1.5,
                }}
              >
                Пригласите партнера —{' '}
                <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>5% роялти</span>
              </p>

              {/* Referral Code Button */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  copyReferralCode()
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <GoldText size="lg" weight={700} variant="static" tracking="wider">
                  {user.referral_code}
                </GoldText>
                {copied ? (
                  <Check size={18} color="#22c55e" strokeWidth={1.5} />
                ) : (
                  <Copy size={18} color="#d4af37" strokeWidth={1.5} />
                )}
              </motion.button>
            </div>

            {/* Referrals Count */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 16,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
                borderRadius: 16,
              }}
            >
              <GoldText size="xl" weight={800} variant="static">
                {user.referrals_count}
              </GoldText>
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--gold-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginTop: 4,
                }}
              >
                Партнеров
              </span>
            </div>
          </div>
        </GlassCard>

        {/* ═══════════════════════════════════════════════════════════════════
            QUICK STATS ROW
            ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard delay={0.3} onClick={() => navigate('/orders')}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: 6,
                }}
              >
                Заказов
              </p>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  color: 'var(--text-primary)',
                }}
              >
                {user.orders_count}
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
        </GlassCard>

        <GlassCard delay={0.35} onClick={() => navigate('/profile')}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: 6,
                }}
              >
                Скидка
              </p>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  color: '#22c55e',
                  textShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                }}
              >
                {user.discount}%
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" strokeWidth={1.5} />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export default Dashboard
