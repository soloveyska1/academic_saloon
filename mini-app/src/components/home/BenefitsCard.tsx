import { memo, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CreditCard, Crown, ChevronRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  BENEFITS CARD — Combined Balance + Level card
//  Premium bento grid with glass morphism
// ═══════════════════════════════════════════════════════════════════════════

interface BonusExpiryInfo {
  has_expiry: boolean
  days_left?: number
  balance: number
  expiry_date?: string
}

interface BenefitsCardProps {
  balance: number
  rank: {
    name: string
    level: number
    cashback: number
    progress: number
    is_max: boolean
    bonus?: string
  }
  bonusExpiry?: BonusExpiryInfo
  onBalanceClick: () => void
  onRankClick: () => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

// Premium rank name mapping
const RANK_DISPLAY_NAMES: Record<string, string> = {
  'Салага': 'Резидент',
  'Ковбой': 'Партнёр',
  'Головорез': 'VIP-Клиент',
  'Легенда Запада': 'Премиум клуб',
}

// Animated counter component
const AnimatedCounter = memo(function AnimatedCounter({
  value,
  suffix = '',
}: {
  value: number
  suffix?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v: number) =>
    `${Math.round(v).toLocaleString('ru-RU')}${suffix}`
  )
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v: string) => setDisplayValue(v))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
})

// Helper to get expiry warning text
function getExpiryText(days: number): string {
  if (days === 0) return 'Сгорают сегодня!'
  if (days === 1) return 'Сгорают завтра!'
  if (days < 5) return `Сгорают через ${days} дня`
  return `Сгорают через ${days} дней`
}

export const BenefitsCard = memo(function BenefitsCard({
  balance,
  rank,
  bonusExpiry,
  onBalanceClick,
  onRankClick,
  haptic,
}: BenefitsCardProps) {
  const displayRankName = RANK_DISPLAY_NAMES[rank.name] || rank.name

  // Show warning if bonus expires within 7 days and balance > 0
  const showExpiryWarning = bonusExpiry?.has_expiry &&
    bonusExpiry.days_left !== undefined &&
    bonusExpiry.days_left <= 7 &&
    bonusExpiry.balance > 0

  const glassGoldStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    padding: 16,
    background:
      'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
    backdropFilter: 'blur(12px) saturate(130%)',
    WebkitBackdropFilter: 'blur(12px) saturate(130%)',
    border: '1px solid var(--border-gold)',
    boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
  }

  const glassStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    padding: 16,
    background: 'var(--bg-card)',
    backdropFilter: 'blur(12px) saturate(130%)',
    WebkitBackdropFilter: 'blur(12px) saturate(130%)',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)',
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16,
      }}
    >
      {/* BALANCE CARD — Gold accent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          haptic('light')
          onBalanceClick()
        }}
        role="button"
        tabIndex={0}
        aria-label={`Баланс: ${balance.toLocaleString('ru-RU')} рублей, кешбэк ${rank.cashback}%. Нажмите для просмотра транзакций`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onBalanceClick() }}}
        style={{
          ...glassGoldStyle,
          cursor: 'pointer',
          transition: 'transform 0.2s ease-out',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={12} color="var(--gold-400)" strokeWidth={1.5} aria-hidden="true" />
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  background: 'var(--gold-text-shine)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                СЧЁТ
              </span>
            </div>
            <ChevronRight size={14} color="var(--gold-400)" strokeWidth={1.5} aria-hidden="true" />
          </div>

          {/* Balance */}
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <AnimatedCounter value={balance} />
            <span
              style={{
                marginLeft: 4,
                fontSize: 20,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
              }}
            >
              &#x20BD;
            </span>
          </div>

          {/* Cashback Badge */}
          <div
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: rank.is_max
                ? 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.25) 100%)'
                : 'var(--success-glass)',
              border: rank.is_max
                ? '1px solid rgba(212,175,55,0.5)'
                : '1px solid var(--success-border)',
              borderRadius: 100,
            }}
          >
            {rank.is_max && <span style={{ fontSize: 10 }}>&#x1F451;</span>}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.03em',
                background: rank.is_max ? 'var(--gold-metallic)' : 'none',
                WebkitBackgroundClip: rank.is_max ? 'text' : 'unset',
                WebkitTextFillColor: rank.is_max ? 'transparent' : 'var(--success-text)',
                color: rank.is_max ? 'transparent' : 'var(--success-text)',
              }}
            >
              Кешбэк {rank.cashback}%
            </span>
          </div>

          {/* Bonus Expiry Warning */}
          {showExpiryWarning && bonusExpiry?.days_left !== undefined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: bonusExpiry.days_left <= 2
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)',
                border: bonusExpiry.days_left <= 2
                  ? '1px solid rgba(239,68,68,0.4)'
                  : '1px solid rgba(249,115,22,0.4)',
                borderRadius: 10,
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ fontSize: 12 }}
              >
                {bonusExpiry.days_left <= 2 ? '🔥' : '⏰'}
              </motion.span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: bonusExpiry.days_left <= 2 ? '#f87171' : '#fb923c',
                  letterSpacing: '0.02em',
                }}
              >
                {getExpiryText(bonusExpiry.days_left)}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* LEVEL CARD — Glass style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          haptic('light')
          onRankClick()
        }}
        role="button"
        tabIndex={0}
        aria-label={`Уровень: ${displayRankName}${rank.is_max ? ', максимальный уровень' : `, прогресс ${rank.progress}%`}. Нажмите для просмотра информации о рангах`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); onRankClick() }}}
        style={{
          ...glassStyle,
          cursor: 'pointer',
          transition: 'transform 0.2s ease-out',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Crown size={12} strokeWidth={1.5} aria-hidden="true" />
              <span style={{ fontSize: 11, letterSpacing: '0.1em', fontWeight: 700 }}>
                УРОВЕНЬ
              </span>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" strokeWidth={1.5} aria-hidden="true" />
          </div>

          {/* Rank Name */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              marginBottom: 8,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.02em',
            }}
          >
            {displayRankName}
          </div>

          {/* Progress Bar or MAX */}
          {rank.is_max ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background:
                  'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(180,140,40,0.1) 100%)',
                borderRadius: 100,
                border: '1px solid rgba(212,175,55,0.4)',
                width: 'fit-content',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #BF953F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                &#x2605; MAX
              </span>
            </div>
          ) : (
            <div
              role="progressbar"
              aria-valuenow={rank.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Прогресс до следующего уровня: ${rank.progress}%`}
              style={{
                height: 5,
                background: 'var(--bg-glass)',
                borderRadius: 100,
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(rank.progress, 5)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-shimmer"
                aria-hidden="true"
                style={{
                  height: '100%',
                  borderRadius: 100,
                  boxShadow: '0 0 10px rgba(212,175,55,0.4)',
                }}
              />
            </div>
          )}

          {/* Bonus info */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            {rank.bonus || `Уровень ${rank.level}`}
          </div>
        </div>
      </motion.div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.balance === nextProps.balance &&
    prevProps.rank.name === nextProps.rank.name &&
    prevProps.rank.level === nextProps.rank.level &&
    prevProps.rank.cashback === nextProps.rank.cashback &&
    prevProps.rank.progress === nextProps.rank.progress &&
    prevProps.rank.is_max === nextProps.rank.is_max &&
    prevProps.rank.bonus === nextProps.rank.bonus &&
    prevProps.bonusExpiry?.has_expiry === nextProps.bonusExpiry?.has_expiry &&
    prevProps.bonusExpiry?.days_left === nextProps.bonusExpiry?.days_left &&
    prevProps.bonusExpiry?.balance === nextProps.bonusExpiry?.balance
})
