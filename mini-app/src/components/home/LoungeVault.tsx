import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Crown, Percent, QrCode, Send, Sparkles, Gift } from 'lucide-react'
import { PromoCodeSection } from '../ui/PromoCodeSection'
import { GoldText } from '../ui/GoldText'
import { Reveal } from '../ui/StaggerReveal'
import { formatMoney } from '../../lib/utils'

interface Rank {
  name: string
  emoji: string
  cashback: number
  progress: number
  next_rank: string | null
  spent_to_next: number
  is_max: boolean
}

interface LoungeVaultProps {
  rank: Rank
  bonusBalance: number
  referralCode: string
  referralsCount: number
  referralEarnings: number
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare: () => void
}

export const LoungeVault = memo(function LoungeVault({
  rank,
  bonusBalance,
  referralCode,
  referralsCount,
  referralEarnings,
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
}: LoungeVaultProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20, display: 'grid', gap: 10 }}
    >
      {/* ═══ Card A — Bonus Balance (HEAVY visual weight) ═══ */}
      <Reveal animation="spring" delay={0.2}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 12,
            background:
              'linear-gradient(160deg, rgba(25, 20, 10, 0.98) 0%, rgba(12, 12, 13, 0.97) 50%, rgba(8, 8, 10, 1) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            boxShadow: '0 24px 48px -32px rgba(0,0,0,0.8)',
          }}
        >
          {/* Gold orb top-right */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -80,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 35%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top shine line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.2) 50%, transparent 90%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px' }}>
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} color="var(--gold-300)" strokeWidth={1.9} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(212, 175, 55, 0.72)',
                  }}
                >
                  Бонусный баланс
                </span>
              </div>

              {rank.is_max ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    color: 'var(--gold-300)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Crown size={12} strokeWidth={1.9} />
                  Высший
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold-300)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rank.progress}% прогресса
                </span>
              )}
            </div>

            {/* THE STAR NUMBER — liquid gold balance */}
            <GoldText
              variant="liquid"
              size="3xl"
              weight={700}
              style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)" }}
            >
              {formatMoney(bonusBalance)}
            </GoldText>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: 'var(--text-secondary)',
                marginTop: 6,
                marginBottom: 20,
                maxWidth: 300,
              }}
            >
              Бонусы списываются при оплате новых заказов вместе с кэшбэком клуба.
            </div>

            {/* Stats grid — 2 columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {/* Cashback — accent card */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.10)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.34)',
                    marginBottom: 6,
                  }}
                >
                  Кэшбэк
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Percent size={14} color="var(--gold-300)" strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--gold-300)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {rank.cashback}%
                  </span>
                </div>
              </div>

              {/* Level — neutral card */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.34)',
                    marginBottom: 6,
                  }}
                >
                  {rank.is_max ? 'Уровень' : 'До уровня'}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {rank.is_max ? 'Высший' : formatMoney(rank.spent_to_next)}
                </div>
              </div>
            </div>

            {/* Progress bar (only if not max rank) */}
            {!rank.is_max && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    height: 5,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, rank.progress)}%` }}
                    transition={{
                      type: 'spring',
                      stiffness: 100,
                      damping: 20,
                      delay: 0.3,
                    }}
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background:
                        'linear-gradient(90deg, rgba(212,175,55,0.9), rgba(245,225,160,0.7))',
                      boxShadow: '0 8px 16px -12px rgba(212,175,55,0.4)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* ═══ Card B — Referral (LIGHT visual weight) ═══ */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <Gift size={14} color="var(--gold-400)" strokeWidth={1.9} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Приглашения
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
              }}
            >
              Приглашайте друзей и открывайте бонусы
            </div>
          </div>

          {/* Referral stats pills */}
          {(referralsCount > 0 || referralEarnings > 0) && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {referralsCount > 0 && (
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referralsCount} приглаш.
                </div>
              )}
              {referralEarnings > 0 && (
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--gold-300)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{formatMoney(referralEarnings)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Referral code + action buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {/* Code button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onCopy}
            style={{
              minWidth: 0,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid rgba(212,175,55,0.14)',
              background: 'rgba(212,175,55,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--gold-300)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {referralCode}
            </span>
            {copied ? (
              <Check size={16} color="var(--success-text)" strokeWidth={2} />
            ) : (
              <Copy size={16} color="var(--text-secondary)" strokeWidth={2} />
            )}
          </motion.button>

          {/* Share button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onTelegramShare}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <Send size={17} strokeWidth={1.8} />
          </motion.button>

          {/* QR button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onShowQR}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <QrCode size={18} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* PromoCode section — collapsible, separated */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: 14,
          }}
        >
          <PromoCodeSection variant="full" collapsible defaultExpanded={false} />
        </div>
      </div>
    </motion.section>
  )
})
