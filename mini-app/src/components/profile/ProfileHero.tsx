import { memo } from 'react'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { formatMemberSince, getMemberSince, getProfileRankName, prefersReducedMotion, toSafeNumber } from './profileHelpers'
import type { UserData } from '../../types'

interface Props {
  user: UserData
  userPhoto?: string
  isAdmin: boolean
  onAdminAccess: () => void
}

export const ProfileHero = memo(function ProfileHero({ user, userPhoto, isAdmin, onAdminAccess }: Props) {
  const memberSince = getMemberSince(user.orders, user.created_at)
  const displayRankName = getProfileRankName(user.rank.name)
  const cashbackPercent = toSafeNumber(user.rank.cashback)
  const loyaltyDiscount = toSafeNumber(user.loyalty.discount || user.discount)

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      {/* Top row: label + admin button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--gold-label)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Профиль
        </div>

        {isAdmin && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onAdminAccess}
            className={s.goldButton}
            style={{ height: 34, padding: '0 12px', fontSize: 12 }}
          >
            Админ
          </motion.button>
        )}
      </div>

      {/* Identity row: avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar with gold ring */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--gold-glass-subtle)',
          border: '2px solid var(--border-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={user.fullname}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Crown size={24} color="var(--gold-300)" />
          )}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className={s.goldAccent} style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.02,
            fontWeight: 700,
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            marginBottom: 8,
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {user.fullname}
          </h1>

          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            marginBottom: 8,
          }}>
            {user.username ? `@${user.username}` : 'Telegram-клиент'} · с {formatMemberSince(memberSince)}
          </div>

          {/* Rank + discount + cashback pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className={`${s.metaPill} ${s.metaPillGold}`}>
              <Crown size={12} />
              {displayRankName}
            </span>
            {loyaltyDiscount > 0 && (
              <span className={s.metaPill}>
                Скидка {loyaltyDiscount}%
              </span>
            )}
            {cashbackPercent > 0 && (
              <span className={s.metaPill}>
                Кешбэк {cashbackPercent}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
