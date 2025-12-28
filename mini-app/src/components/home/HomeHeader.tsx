import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import s from '../../pages/HomePage.module.css'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Elite Gold Edition
// ═══════════════════════════════════════════════════════════════════════════

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean }
    daily_bonus_streak: number
    orders_count?: number
    has_active_orders?: boolean
  }
  userPhoto?: string
  onSecretTap: () => void
}

export const HomeHeader = memo(function HomeHeader({ user, userPhoto, onSecretTap }: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)
  const firstName = user.fullname?.split(' ')[0] || 'GUEST'
  const isVIP = user.rank.is_max

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
          <div className={s.avatar}>
            {userPhoto && !avatarError ? (
              <img
                src={userPhoto}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid rgba(212,175,55,0.2)'
              }}>
                <span style={{
                  color: '#d4af37',
                  fontWeight: 700,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '16px',
                  paddingTop: '2px' // Visual center correction
                }}>
                  {(firstName || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={s.userInfo}>
          <div className={s.userName}>{firstName.toUpperCase()}</div>
          <div className={s.userStatus}>
            <div className={s.statusDot} />
            {isVIP ? 'VIP КЛИЕНТ' : 'КЛУБ ACADEMIC'}
          </div>
        </div>
      </div>

      {/* RIGHT: Club Access / Settings */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={onSecretTap}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '12px',
          padding: '8px 16px',
          color: '#d4af37',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        ЛАУНЖ
      </motion.button>
    </motion.header>
  )
}, (prev: Readonly<HomeHeaderProps>, next: Readonly<HomeHeaderProps>) => {
  return prev.userPhoto === next.userPhoto &&
    prev.user.fullname === next.user.fullname &&
    prev.user.rank.is_max === next.user.rank.is_max
})
