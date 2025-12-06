import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Crown, Users, MessageCircle, ChevronRight, Check, Copy, QrCode
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { FloatingParticles, glassStyle, glassGoldStyle, CardInnerShine } from '../components/ui/PremiumDesign'
import { TransactionHistory } from '../components/profile/TransactionHistory'
import { QRCodeModal } from '../components/ui/QRCode'

interface Props {
  user: UserData | null
}

const PREMIUM_RANK_NAMES: Record<string, string> = {
  'Салага': 'Резидент',
  'Ковбой': 'Партнёр',
  'Головорез': 'VIP-Клиент',
  'Легенда Запада': 'Премиум',
}

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

  return <span>{displayValue}</span>
}

export function ProfilePage({ user }: Props) {
  const { haptic, hapticSuccess, botUsername } = useTelegram()
  const navigate = useNavigate()
  useTheme() // Keep context subscription for theme changes
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  if (!user) return null

  const premiumRankName = PREMIUM_RANK_NAMES[user.rank.name] || user.rank.name
  const memberSince = user.orders.length > 0
    ? new Date(user.orders[user.orders.length - 1].created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const copyInviteLink = () => {
    // Correct Mini App deep link format
    const inviteLink = `https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSupportClick = () => {
    haptic('medium')
    // Navigate to internal support page which handles the actual contact logic
    navigate('/support')
  }

  return (
    <div style={{
      padding: '24px 20px 120px',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <FloatingParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 28,
          position: 'relative',
          zIndex: 1
        }}
      >
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
            fontSize: 24
          }}>
            {user.rank.emoji}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "var(--font-serif)",
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 4
          }}>
            Личный Кабинет
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Агент с {memberSince}
          </p>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, position: 'relative', zIndex: 1 }}>
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="breathing-card"
          style={glassGoldStyle}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CreditCard size={14} color="var(--gold-400)" strokeWidth={1.5} />
              <span style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: 700,
                color: 'var(--gold-400)'
              }}>БАЛАНС</span>
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'baseline'
            }}>
              <AnimatedCounter value={user.balance} />
              <span style={{ fontSize: 20, color: 'var(--gold-400)', marginLeft: 4 }}>₽</span>
            </div>
            {/* Cashback Badge */}
            <div style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: user.rank.is_max ? 'var(--gold-gradient)' : 'rgba(34, 197, 94, 0.1)',
              border: user.rank.is_max ? '1px solid var(--gold-border)' : '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 100,
            }}>
              <span style={{
                fontSize: 10,
                color: user.rank.is_max ? 'var(--bg-main)' : '#22c55e',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                {user.rank.is_max ? '👑 ' : ''}Кешбэк {user.rank.cashback}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={glassStyle}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-muted)' }}>
              <Crown size={14} strokeWidth={1.5} />
              <span style={{ fontSize: 10, letterSpacing: '0.15em', fontWeight: 700 }}>СТАТУС</span>
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 10
            }}>
              {premiumRankName}
            </div>
            {/* Progress Bar */}
            <div style={{
              height: 4,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 100,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(user.rank.progress, 5)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{
                  height: '100%',
                  background: 'var(--gold-metallic)',
                  borderRadius: 100,
                  boxShadow: '0 0 10px rgba(212,175,55,0.4)',
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Discount & Orders Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={glassStyle}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Скидка</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#d4af37', fontFamily: "var(--font-mono)" }}>{user.discount}%</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={glassStyle}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Заказов</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', fontFamily: "var(--font-mono)" }}>{user.orders_count}</div>
        </motion.div>
      </div>

      {/* Referral Section - Premium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...glassGoldStyle, padding: 24, marginBottom: 24 }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Users size={18} color="#d4af37" />
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.05em',
              color: 'var(--text-main)'
            }}>РЕФЕРАЛЬНАЯ СЕТЬ</span>
          </div>

          <div style={{
            background: 'var(--bg-glass)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            border: '1px solid rgba(212,175,55,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ваш код</span>
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>+5% с заказов</span>
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: '#d4af37',
              letterSpacing: '2px'
            }}>
              {user.referral_code}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={copyInviteLink}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 14,
                background: copied ? 'var(--success-glass)' : 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                border: copied ? '1px solid var(--success-border)' : '1px solid rgba(212,175,55,0.3)',
                color: copied ? '#22c55e' : '#d4af37',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Скопировано!' : 'Пригласить друга'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQR(true)}
              style={{
                width: 54,
                borderRadius: 14,
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#d4af37'
              }}
            >
              <QrCode size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Transaction History - Premium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: 24 }}
      >
        <TransactionHistory transactions={user.transactions} />
      </motion.div>

      {/* Support Button - Premium */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSupportClick}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: 18,
          background: 'linear-gradient(135deg, var(--bg-card), var(--bg-card))',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          cursor: 'pointer',
          boxShadow: 'var(--card-shadow)'
        }}
      >
        <MessageCircle size={20} color="var(--text-secondary)" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
          Чат с поддержкой
        </span>
        <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
      </motion.button>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <QRCodeModal
            onClose={() => setShowQR(false)}
            value={`https://t.me/${botUsername}/app?startapp=ref_${user.telegram_id}`}
            title="Ваша реферальная ссылка"
            subtitle="Дайте отсканировать этот код другу, чтобы он стал вашим рефералом"
          />
        )}
      </AnimatePresence>

    </div>
  )
}
