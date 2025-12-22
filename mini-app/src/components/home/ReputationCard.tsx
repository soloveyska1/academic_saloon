import { memo } from 'react'
import { motion } from 'framer-motion'
import { Star, Copy, Check, QrCode, Send, Users, Coins } from 'lucide-react'

// Glass gold style
const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background:
    'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  backdropFilter: 'blur(12px) saturate(130%)',
  WebkitBackdropFilter: 'blur(12px) saturate(130%)',
  border: '1px solid var(--border-gold)',
  boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

interface ReputationCardProps {
  referralCode: string
  referralsCount: number
  referralEarnings?: number // Total earned from referrals
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare?: () => void
}

export const ReputationCard = memo(function ReputationCard({
  referralCode,
  referralsCount,
  referralEarnings = 0,
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
}: ReputationCardProps) {
  // Default Telegram share handler
  const handleTelegramShare = () => {
    if (onTelegramShare) {
      onTelegramShare()
    } else {
      // Use Telegram WebApp share if available
      const shareText = `Привет! Я пользуюсь Academic Saloon для учебных работ. Мой код: ${referralCode} — получишь скидку, а я 5% с твоих заказов 📚`
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/AcademicSaloonBot')}&text=${encodeURIComponent(shareText)}`
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      whileHover={{ scale: 1.005 }}
      className="card-padding card-radius"
      style={{
        ...glassGoldStyle,
        marginBottom: 16,
        transition: 'transform 0.2s ease-out',
      }}
    >
      <div aria-hidden="true" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div
          aria-hidden="true"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={14} color="var(--gold-400)" fill="var(--gold-400)" strokeWidth={1.5} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-serif)',
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.1em',
              }}
            >
              ПАРТНЁРКА
            </span>
          </div>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 8 }}>
            {referralsCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'rgba(74, 222, 128, 0.1)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  borderRadius: 100,
                }}
              >
                <Users size={10} color="#22c55e" strokeWidth={1.5} />
                <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                  {referralsCount}
                </span>
              </div>
            )}
            {referralEarnings > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 100,
                }}
              >
                <Coins size={10} color="var(--gold-400)" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background: 'var(--gold-metallic)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  +{referralEarnings.toLocaleString('ru-RU')}₽
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Приглашай друзей →{' '}
          <span
            style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}
          >
            5% с каждого заказа
          </span>{' '}
          навсегда
        </p>

        {/* Action buttons row */}
        <div aria-hidden="true" style={{ display: 'flex', gap: 8 }}>
          {/* Copy code button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
            whileTap={{ scale: 0.97 }}
            aria-label={
              copied
                ? 'Реферальный код скопирован'
                : `Скопировать реферальный код ${referralCode}`
            }
            style={{
              flex: 1,
              padding: '12px 14px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-gold)',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.1em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {referralCode}
            </code>
            {copied ? (
              <Check size={16} color="var(--success-text)" strokeWidth={1.5} />
            ) : (
              <Copy size={16} color="var(--text-muted)" strokeWidth={1.5} />
            )}
          </motion.button>

          {/* Telegram Share button - PRIMARY */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              handleTelegramShare()
            }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            aria-label="Поделиться в Telegram"
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)',
            }}
          >
            <Send size={16} color="white" strokeWidth={1.5} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
              Telegram
            </span>
          </motion.button>

          {/* QR button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onShowQR()
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Показать QR-код реферальной ссылки"
            style={{
              width: 46,
              height: 46,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
              border: '1px solid var(--border-gold)',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <QrCode size={20} color="var(--gold-400)" strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Motivation hint for users with 0 referrals */}
        {referralsCount === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(212, 175, 55, 0.06)',
              borderRadius: 10,
              border: '1px solid rgba(212, 175, 55, 0.1)',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              💡 <strong style={{ color: 'var(--text-secondary)' }}>Пример:</strong> Пригласи 3 друзей с заказами по 5000₽ → заработай{' '}
              <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>750₽</span> пассивно
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
})
