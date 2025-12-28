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
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#d4af37', fontWeight: 700 }}>{firstName.charAt(0)}</span>
              </div>
            )}
           </div>
        </div>

        <div className={s.userInfo}>
          <div className={s.userName}>{firstName.toUpperCase()}</div>
          <div className={s.userStatus}>
            <div className={s.statusDot} />
            {isVIP ? 'VIP CLIENT' : 'ACADEMIC CLUB'}
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
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        LOUNGE
      </motion.button>
    </motion.header>
  )
}, (prev, next) => {
  return prev.userPhoto === next.userPhoto &&
    prev.user.fullname === next.user.fullname &&
    prev.user.rank.is_max === next.user.rank.is_max
})
