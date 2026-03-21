import { memo } from 'react'
import { motion } from 'framer-motion'
import { Star, Copy, Check, QrCode, Send, Users, Coins } from 'lucide-react'

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
  // Glass gold style — uses CSS variables that auto-switch
  const glassGoldStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.06) 0%, rgba(12, 12, 10, 0.6) 40%, rgba(201,162,39,0.04) 100%)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.04)',
  }

  // Default Telegram share handler
  const handleTelegramShare = () => {
    if (onTelegramShare) {
      onTelegramShare()
    } else {
      // Use Telegram WebApp share if available
      const shareText = `Привет! Пользуюсь Академическим Салоном для учебных работ — рекомендую. Мой код: ${referralCode}, по нему будет скидка. 📚`
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/AcademicSaloonBot')}&text=${encodeURIComponent(shareText)}`
      window.open(shareUrl, '_blank')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      style={{
        ...glassGoldStyle,
        borderRadius: 16,
        padding: 20,
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
                letterSpacing: '0.08em',
              }}
            >
              ПАРТНЁРСКАЯ ПРОГРАММА
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
                  background: 'var(--success-glass)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 8,
                }}
              >
                <Users size={10} color="var(--success-text)" strokeWidth={1.5} />
                <span style={{ fontSize: 11, color: 'var(--success-text)', fontWeight: 600 }}>
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
                  background: 'var(--gold-glass-medium)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 8,
                }}
              >
                <Coins size={10} color="var(--gold-400)" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 11,
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
          Приглашайте друзей →{' '}
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
              borderRadius: 16,
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
            whileTap={{ scale: 0.97 }}
            aria-label="Поделиться в Telegram"
            style={{
              padding: '12px 16px',
              background: 'var(--gold-glass-medium)',
              border: '1px solid var(--border-gold)',
              borderRadius: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Send size={14} color="var(--gold-400)" strokeWidth={1.5} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold-400)' }}>
              Telegram
            </span>
          </motion.button>

          {/* QR button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onShowQR()
            }}
            whileTap={{ scale: 0.97 }}
            aria-label="Показать QR-код реферальной ссылки"
            style={{
              width: 46,
              height: 46,
              background: 'var(--gold-glass-medium)',
              border: '1px solid var(--border-gold)',
              borderRadius: 16,
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
              background: 'var(--gold-glass-subtle)',
              borderRadius: 8,
              border: '1px solid var(--border-gold)',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              💡 <strong style={{ color: 'var(--text-secondary)' }}>Пример:</strong> Пригласите 3 друзей с заказами по 5000₽ → заработаете{' '}
              <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>750₽</span> пассивно
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
})
