import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Copy, LucideIcon, QrCode, Users } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { formatMoney, prefersReducedMotion, toSafeNumber } from './profileHelpers'

interface Props {
  referralCode: string
  referralsCount: number
  referralEarnings: number
  inviteLink: string
  onCopy: () => void
  onShare: () => void
  onOpenQR: () => void
  onOpenProgram: () => void
}

export const ReferralCard = memo(function ReferralCard({
  referralCode,
  referralsCount,
  referralEarnings,
  inviteLink,
  onCopy,
  onShare,
  onOpenQR,
  onOpenProgram,
}: Props) {
  const count = toSafeNumber(referralsCount)
  const earnings = toSafeNumber(referralEarnings)
  const hasLink = Boolean(inviteLink)

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20 }}
    >
      <div className={s.sectionTitle}>Реферальная программа</div>

      <div className={`${s.glassCard}`} style={{ padding: 18 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'rgba(196, 181, 253, 0.12)',
            border: '1px solid rgba(196, 181, 253, 0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Users size={18} color="#c4b5fd" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 2,
            }}>
              Пригласите друзей
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Код {referralCode}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          marginBottom: 14,
        }}>
          Делитесь ссылкой — получайте бонусы за каждого приглашённого друга.
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 14,
        }}>
          <div className={s.statCard}>
            <div className={s.statLabel}>Приглашено</div>
            <div className={s.statValue} style={{ color: '#c4b5fd' }}>{count}</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Начислено</div>
            <div className={s.statValue} style={{ color: '#93c5fd' }}>{formatMoney(earnings)}</div>
          </div>
        </div>

        {/* Link display */}
        <div className={s.linkBox} style={{ marginBottom: 14 }}>
          {inviteLink || 'Ссылка появится, когда мини-приложение получит конфигурацию бота.'}
        </div>

        {/* Action buttons grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
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
