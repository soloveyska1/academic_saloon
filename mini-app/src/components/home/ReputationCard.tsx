import { memo } from 'react'
import { motion } from 'framer-motion'
import { Star, Copy, Check, QrCode } from 'lucide-react'

// Glass gold style
const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background:
    'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  border: '1px solid var(--border-gold)',
  boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

interface ReputationCardProps {
  referralCode: string
  referralsCount: number
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
}

export const ReputationCard = memo(function ReputationCard({
  referralCode,
  referralsCount,
  copied,
  onCopy,
  onShowQR,
}: ReputationCardProps) {
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
        <div
          aria-hidden="true"
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}
        >
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
            РЕПУТАЦИЯ
          </span>
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Пригласите партнёра и получайте{' '}
          <span
            style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}
          >
            5% роялти
          </span>{' '}
          с каждого заказа.
        </p>
        <div aria-hidden="true" style={{ display: 'flex', gap: 10 }}>
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
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {referralCode}
            </code>
            {copied ? (
              <Check size={18} color="var(--success-text)" strokeWidth={2} />
            ) : (
              <Copy size={18} color="var(--text-muted)" strokeWidth={1.5} />
            )}
          </motion.button>
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onShowQR()
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Показать QR-код реферальной ссылки"
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
        {referralsCount > 0 && (
          <div
            aria-hidden="true"
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--success-glass)',
              border: '1px solid var(--success-border)',
              borderRadius: 100,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--success-text)', fontWeight: 600 }}>
              Приглашено: {referralsCount}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
})
