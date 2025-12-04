import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Copy, Share2, Gift, Check, QrCode, ChevronRight, Crown, Sparkles } from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useToast } from '../components/ui/Toast'

interface Props {
  user: UserData | null
}

// Referral tier bonuses
const REFERRAL_TIERS = [
  { count: 1, bonus: 50, label: 'Первый друг' },
  { count: 3, bonus: 100, label: 'Начало пути' },
  { count: 5, bonus: 200, label: 'Активист' },
  { count: 10, bonus: 500, label: 'Амбассадор' },
  { count: 25, bonus: 1000, label: 'Легенда' },
]

// Invited friend card component
function InvitedFriendCard({ name, bonus, date }: { name: string; bonus: number; date: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.8) 0%, rgba(15, 15, 18, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Users size={20} color="#d4af37" />
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#f2f2f2',
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#71717a',
          }}
        >
          {date}
        </div>
      </div>

      <div
        style={{
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 8,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          color: '#22c55e',
        }}
      >
        +{bonus}₽
      </div>
    </motion.div>
  )
}

export function ReferralPage({ user }: Props) {
  const { haptic, hapticSuccess, botUsername } = useTelegram()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const referralCode = user?.referral_code || 'ABCD1234'
  const referralLink = `https://t.me/${botUsername}?start=ref_${referralCode}`

  // Mock data - replace with real data
  const referralCount = 3
  const totalEarned = 250
  const invitedFriends = [
    { name: 'Александр', bonus: 100, date: '2 дня назад' },
    { name: 'Мария', bonus: 100, date: '5 дней назад' },
    { name: 'Дмитрий', bonus: 50, date: '1 неделю назад' },
  ]

  // Find current tier
  const currentTier = REFERRAL_TIERS.find(t => referralCount < t.count) || REFERRAL_TIERS[REFERRAL_TIERS.length - 1]
  const progress = currentTier
    ? Math.min((referralCount / currentTier.count) * 100, 100)
    : 100

  const copyLink = async () => {
    haptic('medium')
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      hapticSuccess()
      showToast({
        type: 'success',
        title: 'Скопировано!',
        message: 'Ссылка в буфере обмена',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось скопировать',
      })
    }
  }

  const shareLink = () => {
    haptic('medium')
    if (navigator.share) {
      navigator.share({
        title: 'Присоединяйся к Academic Saloon!',
        text: `Используй мой код ${referralCode} и получи бонус на первый заказ!`,
        url: referralLink,
      })
    } else {
      copyLink()
    }
  }

  return (
    <div
      className="app-content"
      style={{
        padding: '16px 16px 120px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d061 50%, #8b6914 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
          }}
        >
          <Gift size={40} color="#0a0a0c" strokeWidth={1.5} />
        </motion.div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ПРИГЛАСИ ДРУЗЕЙ
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#a1a1aa',
            lineHeight: 1.5,
          }}
        >
          Получай <span style={{ color: '#d4af37', fontWeight: 600 }}>100₽</span> за каждого друга
        </p>
      </motion.header>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 23, 0.9) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              fontWeight: 800,
              color: '#d4af37',
              marginBottom: 4,
            }}
          >
            {referralCount}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#71717a',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ДРУЗЕЙ
          </div>
        </div>

        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(20, 20, 23, 0.9) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              fontWeight: 800,
              color: '#22c55e',
              marginBottom: 4,
            }}
          >
            {totalEarned}₽
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#71717a',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ЗАРАБОТАНО
          </div>
        </div>
      </motion.div>

      {/* Progress to Next Tier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: 20,
          background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.9) 0%, rgba(15, 15, 18, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 18,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crown size={18} color="#d4af37" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#f2f2f2',
              }}
            >
              {currentTier?.label || 'Максимум достигнут'}
            </span>
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: '#d4af37',
            }}
          >
            {referralCount}/{currentTier?.count || referralCount}
          </span>
        </div>

        <div
          style={{
            height: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37, #f5d061)',
              borderRadius: 4,
              boxShadow: '0 0 10px rgba(212, 175, 55, 0.4)',
            }}
          />
        </div>

        {currentTier && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={14} color="#d4af37" />
            <span>
              Ещё {currentTier.count - referralCount} до бонуса{' '}
              <span style={{ color: '#22c55e', fontWeight: 600 }}>+{currentTier.bonus}₽</span>
            </span>
          </div>
        )}
      </motion.div>

      {/* Referral Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{
          padding: 20,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: 18,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: '#71717a',
            marginBottom: 8,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em',
          }}
        >
          ТВОЙ КОД
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28,
            fontWeight: 800,
            textAlign: 'center',
            color: '#d4af37',
            letterSpacing: '0.15em',
            marginBottom: 16,
          }}
        >
          {referralCode}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          <motion.button
            onClick={copyLink}
            whileTap={{ scale: 0.95 }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: copied
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
              border: copied
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: copied ? '#22c55e' : '#f2f2f2',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Скопировано' : 'Копировать'}
          </motion.button>

          <motion.button
            onClick={shareLink}
            whileTap={{ scale: 0.95 }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#0a0a0c',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
            }}
          >
            <Share2 size={18} />
            Поделиться
          </motion.button>
        </div>
      </motion.div>

      {/* Invited Friends */}
      {invitedFriends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 700,
                color: '#f2f2f2',
              }}
            >
              Приглашённые друзья
            </h3>
            <span
              style={{
                fontSize: 12,
                color: '#71717a',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {invitedFriends.length} чел.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {invitedFriends.map((friend, i) => (
              <InvitedFriendCard key={i} {...friend} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Tiers Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: 24,
          padding: 20,
          background: 'linear-gradient(135deg, rgba(20, 20, 23, 0.8) 0%, rgba(15, 15, 18, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 18,
        }}
      >
        <h4
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14,
            color: '#d4af37',
            marginBottom: 16,
            letterSpacing: '0.05em',
          }}
        >
          УРОВНИ НАГРАД
        </h4>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {REFERRAL_TIERS.map((tier, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: referralCount >= tier.count ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: referralCount >= tier.count
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {referralCount >= tier.count ? (
                    <Check size={14} color="#fff" />
                  ) : (
                    <span style={{ fontSize: 11, color: '#71717a' }}>{tier.count}</span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: '#a1a1aa' }}>{tier.label}</span>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: referralCount >= tier.count ? '#22c55e' : '#71717a',
                }}
              >
                +{tier.bonus}₽
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
