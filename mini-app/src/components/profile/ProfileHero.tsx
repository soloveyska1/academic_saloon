import { memo } from 'react'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { useThemeValue } from '../../contexts/ThemeContext'
import { formatMemberSince, getMemberSince, getProfileRankName, prefersReducedMotion, toSafeNumber } from './profileHelpers'
import type { UserData } from '../../types'

interface Props {
  user: UserData
  userPhoto?: string
  isAdmin: boolean
  onAdminAccess: () => void
}

export const ProfileHero = memo(function ProfileHero({ user, userPhoto, isAdmin, onAdminAccess }: Props) {
  const theme = useThemeValue()
  const isDark = theme === 'dark'
  const memberSince = getMemberSince(user.orders, user.created_at)
  const displayRankName = getProfileRankName(user.rank.name)
  const cashbackPercent = toSafeNumber(user.rank.cashback)
  const loyaltyDiscount = toSafeNumber(user.loyalty.discount || user.discount)

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20 }}
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
          color: isDark ? 'rgba(212,175,55,0.72)' : 'rgba(158,122,26,0.72)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar with gold ring */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          overflow: 'hidden',
          flexShrink: 0,
          background: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(158, 122, 26, 0.08)',
          border: isDark ? '2px solid rgba(212, 175, 55, 0.25)' : '2px solid rgba(158, 122, 26, 0.20)',
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
            fontSize: 24,
            lineHeight: 1.1,
            fontWeight: 800,
            fontFamily: "'Manrope', sans-serif",
            marginBottom: 6,
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
                Кэшбэк {cashbackPercent}%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
