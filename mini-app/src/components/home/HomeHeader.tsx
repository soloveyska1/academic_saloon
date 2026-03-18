import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import s from '../../pages/HomePage.module.css'
import { isImageAvatar, normalizeAvatarUrl } from '../../utils/avatar'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Refined Premium Edition
//  Quieter, more confident. No unnecessary decoration.
//  Identity on the left, privilege access on the right.
// ═══════════════════════════════════════════════════════════════════════════

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean }
    orders_count?: number
    has_active_orders?: boolean
  }
  userPhoto?: string
  onSecretTap: () => void
  onOpenLounge: () => void
  isNewUser?: boolean
}

export const HomeHeader = memo(function HomeHeader({ user, userPhoto, onSecretTap, onOpenLounge, isNewUser }: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'ГОСТЬ'
  const isPremiumClub = user.rank.is_max
  const avatarSrc = useMemo(() => normalizeAvatarUrl(userPhoto), [userPhoto])
  const shouldShowAvatar = Boolean(avatarSrc && isImageAvatar(avatarSrc) && !avatarError)

  // Contextual greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6) return 'Доброй ночи'
    if (hour < 12) return 'Доброе утро'
    if (hour < 18) return 'Добрый день'
    return 'Добрый вечер'
  }, [])

  return (
    <motion.header
      className={s.header}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* LEFT: Identity */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className={s.avatarContainer} onClick={onSecretTap}>
          <div className={s.avatar} style={{ position: 'relative', background: 'var(--bg-elevated)' }}>
            {/* Fallback Layer */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-elevated)',
              zIndex: 1
            }}>
              <span style={{
                color: 'var(--gold-400)',
                fontWeight: 700,
                fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                fontSize: '18px',
                lineHeight: 1,
                textTransform: 'uppercase'
              }}>
                {(firstName && firstName.trim().length > 0 ? firstName : 'A').charAt(0)}
              </span>
            </div>

            {/* Image Layer */}
            {shouldShowAvatar && (
              <img
                src={avatarSrc}
                alt={firstName}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                  borderRadius: '50%'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  setAvatarError(true)
                }}
              />
            )}
          </div>
        </div>

        <div className={s.userInfo}>
          {isNewUser ? (
            <>
              <div className={s.userName} style={{ fontSize: 18 }}>
                {greeting}
              </div>
              <div className={s.userStatus}>
                <div className={s.statusDot} />
                АКАДЕМИЧЕСКИЙ САЛОН
              </div>
            </>
          ) : (
            <>
              <div className={s.userName}>{firstName.toUpperCase()}</div>
              <div className={s.userStatus}>
                <div className={s.statusDot} />
                {isPremiumClub ? 'ПРЕМИУМ КЛУБ' : 'КЛУБ ПРИВИЛЕГИЙ'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: Club Access */}
      {!isNewUser && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onOpenLounge}
          style={{
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-gold)',
            borderRadius: '12px',
            padding: '8px 16px',
            color: 'var(--gold-400)',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            backdropFilter: 'blur(10px)',
            boxShadow: 'var(--card-shadow)',
            textTransform: 'uppercase',
          }}
        >
          ПРИВИЛЕГИИ
        </motion.button>
      )}
    </motion.header>
  )
}, (prev: Readonly<HomeHeaderProps>, next: Readonly<HomeHeaderProps>) => {
  return prev.userPhoto === next.userPhoto &&
    prev.user.fullname === next.user.fullname &&
    prev.user.rank.is_max === next.user.rank.is_max &&
    prev.isNewUser === next.isNewUser
})
