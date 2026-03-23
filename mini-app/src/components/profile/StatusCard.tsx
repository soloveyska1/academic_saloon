import { memo } from 'react'
import { motion } from 'framer-motion'
import { Medal, Wallet2 } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import {
  formatMoney,
  getProfileRankName,
  prefersReducedMotion,
  toSafeNumber,
} from './profileHelpers'
import type { UserData } from '../../types'

interface Props {
  user: UserData
}

export const StatusCard = memo(function StatusCard({ user }: Props) {
  const displayRankName = getProfileRankName(user.rank.name)
  const cashbackPercent = toSafeNumber(user.rank.cashback)
  const loyaltyDiscount = toSafeNumber(user.loyalty.discount || user.discount)
  const bonusBalance = toSafeNumber(user.balance)
  const referralsCount = toSafeNumber(user.referrals_count)

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 16 }}
    >
      <div className={s.sectionTitle}>Статус и условия</div>

      {/* Rank progress card */}
      <div className={`${s.glassCard} ${s.glassCardActive}`} style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--gold-glass-subtle)',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Medal size={18} color="var(--gold-300)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: 2,
            }}>
              {displayRankName}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {user.rank.is_max
                ? 'Максимальные условия активны'
                : `До следующего статуса ${formatMoney(user.rank.spent_to_next)}`}
            </div>
          </div>
          <span className={`${s.metaPill} ${s.metaPillGold}`}>
            <Wallet2 size={12} />
            {cashbackPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className={s.progressTrack}>
          <motion.div
            className={s.progressFill}
            initial={prefersReducedMotion ? {} : { width: '0%' }}
            animate={{ width: `${Math.max(0, Math.min(100, user.rank.progress))}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </div>

      {/* Stats grid 2x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
      }}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Скидка</div>
          <div className={s.statValue} style={{ color: 'var(--accent-green)' }}>{loyaltyDiscount}%</div>
          <div className={s.statHelper}>
            {user.loyalty.orders_to_next > 0
              ? `Ещё ${user.loyalty.orders_to_next} заказов до ↑`
              : 'Максимальная'}
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Кэшбэк</div>
          <div className={s.statValue} style={{ color: 'var(--gold-300)' }}>{cashbackPercent}%</div>
          <div className={s.statHelper}>После оплаченных заказов</div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Бонусный баланс</div>
          <div className={s.statValue} style={{ color: 'var(--accent-blue)' }}>{formatMoney(bonusBalance)}</div>
          <div className={s.statHelper}>Списать в оплату</div>
        </div>

        <div className={s.statCard}>
          <div className={s.statLabel}>Рефералы</div>
          <div className={s.statValue} style={{ color: 'var(--accent-purple)' }}>{referralsCount}</div>
          <div className={s.statHelper}>
            {referralsCount > 0 ? 'Приглашённых друзей' : 'Пока без приглашений'}
          </div>
        </div>
      </div>
    </motion.section>
  )
})
