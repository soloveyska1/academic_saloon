import { useState } from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  HOME HEADER — Premium compact header
//  Features:
//  - Avatar with spinning gold ring (VIP glow for max rank)
//  - Greeting with user name
//  - Streak chip
//  - Compact "Club" button (secret admin access)
// ═══════════════════════════════════════════════════════════════════════════

interface HomeHeaderProps {
  user: {
    fullname?: string
    rank: { is_max: boolean }
    daily_bonus_streak: number
  }
  userPhoto?: string
  onSecretTap: () => void
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

function getStreakText(days: number): string {
  if (days === 1) return '1 день подряд'
  if (days < 5) return `${days} дня подряд`
  return `${days} дней подряд`
}

export function HomeHeader({ user, userPhoto, onSecretTap }: HomeHeaderProps) {
  const [avatarError, setAvatarError] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* User Avatar with Spinning Gold Ring + VIP Glow */}
        <div style={{ position: 'relative' }}>
          {/* VIP Glow Effect for Max Rank */}
          {user.rank.is_max && (
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)',
                filter: 'blur(4px)',
              }}
            />
          )}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              background:
                'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {userPhoto && !avatarError ? (
              <img
                src={userPhoto}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 18,
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {user.fullname?.charAt(0) || 'U'}
              </span>
            )}
          </div>
        </div>

        {/* Greeting + Name + Streak */}
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 3,
              fontWeight: 500,
            }}
          >
            {getTimeGreeting()},
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.02em',
              background: user.rank.is_max
                ? 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)'
                : 'var(--text-main)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: user.rank.is_max ? 'transparent' : 'var(--text-main)',
              filter: user.rank.is_max ? 'drop-shadow(0 0 8px rgba(212,175,55,0.3))' : 'none',
            }}
          >
            {user.fullname?.split(' ')[0] || 'Гость'}
          </div>
          {/* Streak Badge */}
          {user.daily_bonus_streak > 0 && (
            <div
              style={{
                marginTop: 5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background:
                  'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 100,
              }}
            >
              <span style={{ fontSize: 10 }}>&#x1F525;</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#fb923c',
                  letterSpacing: '0.03em',
                }}
              >
                {getStreakText(user.daily_bonus_streak)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Club Badge */}
      <motion.div
        onClick={onSecretTap}
        whileTap={{ scale: 0.97 }}
        animate={{
          borderColor: [
            'rgba(212,175,55,0.4)',
            'rgba(212,175,55,0.7)',
            'rgba(212,175,55,0.4)',
          ],
          boxShadow: [
            '0 0 12px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.03)',
            '0 0 20px rgba(212,175,55,0.3), inset 0 0 30px rgba(212,175,55,0.06)',
            '0 0 12px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.03)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          padding: '8px 14px',
          background: 'linear-gradient(145deg, rgba(20,18,14,0.98), rgba(12,11,8,0.98))',
          borderRadius: 8,
          border: '1px solid rgba(212,175,55,0.5)',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.12em',
            background: 'linear-gradient(135deg, #f5d485 0%, #D4AF37 50%, #b48e26 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          КЛУБ
        </span>
      </motion.div>
    </motion.div>
  )
}
