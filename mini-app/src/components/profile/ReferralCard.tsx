import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, LucideIcon, QrCode, Users } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { formatMoney, prefersReducedMotion, toSafeNumber } from './profileHelpers'

interface Props {
  referralCode: string
  referralsCount: number
  referralEarnings: number
  referralPercent: number
  referralRefsToNext: number
  inviteLink: string
  onCopy: () => void
  onShare: () => void
  onOpenQR: () => void
  onOpenProgram: () => void
}

const TIERS = [
  { range: '1–2', percent: 5 },
  { range: '3–5', percent: 7 },
  { range: '6+', percent: 10 },
]

export const ReferralCard = memo(function ReferralCard({
  referralCode,
  referralsCount,
  referralEarnings,
  referralPercent,
  referralRefsToNext,
  inviteLink,
  onCopy,
  onShare,
  onOpenQR,
  onOpenProgram,
}: Props) {
  const count = toSafeNumber(referralsCount)
  const earnings = toSafeNumber(referralEarnings)
  const pct = referralPercent || 5
  const hasLink = Boolean(inviteLink)

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      <div className={s.sectionTitle}>Внутренний круг</div>

      <div className={`${s.glassCard}`} style={{ padding: 16 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--accent-purple-glass)',
            border: '1px solid var(--accent-purple-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 2,
            }}>
              Ваш бонус: {pct}%
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Код {referralCode}
            </div>
          </div>
        </div>

        {/* Tier progress */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
        }}>
          {TIERS.map((tier) => (
            <div
              key={tier.percent}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 11.5,
                fontWeight: tier.percent === pct ? 700 : 500,
                color: tier.percent === pct
                  ? 'var(--accent-purple)'
                  : 'var(--text-muted)',
                background: tier.percent === pct
                  ? 'var(--accent-purple-glass)'
                  : 'var(--bg-glass)',
                border: tier.percent === pct
                  ? '1px solid var(--accent-purple-border)'
                  : '1px solid transparent',
                transition: 'all 0.3s ease',
              }}
            >
              {tier.range} — {tier.percent}%
            </div>
          ))}
        </div>

        {referralRefsToNext > 0 && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 12,
            textAlign: 'center',
          }}>
            +{referralRefsToNext} друзей до следующего уровня
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 12,
        }}>
          <div className={s.statCard}>
            <div className={s.statLabel}>Друзей</div>
            <div className={s.statValue} style={{ color: 'var(--accent-purple)' }}>{count}</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Бонус</div>
            <div className={s.statValue} style={{ color: 'var(--accent-purple)' }}>{pct}%</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Заработано</div>
            <div className={s.statValue} style={{ color: 'var(--accent-blue)' }}>{formatMoney(earnings)}</div>
          </div>
        </div>

        {/* Link display */}
        <div className={s.linkBox} style={{ marginBottom: 12 }}>
          {inviteLink || 'Ссылка появится после загрузки конфигурации.'}
        </div>

        {/* Action buttons grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}>
          <MiniAction icon={Copy} label="Копировать" onClick={onCopy} disabled={!hasLink} />
          <MiniAction icon={ArrowUpRight} label="Поделиться" onClick={onShare} disabled={!hasLink} />
          <MiniAction icon={QrCode} label="QR-код" onClick={onOpenQR} disabled={!hasLink} />
          <MiniAction icon={Users} label="О программе" onClick={onOpenProgram} />
        </div>
      </div>
    </motion.section>
  )
})

/* ─── Mini action button ─── */

function MiniAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={s.miniButton}
    >
      <Icon size={16} color="var(--gold-300)" />
      <span className={s.miniButtonLabel}>{label}</span>
    </motion.button>
  )
}
