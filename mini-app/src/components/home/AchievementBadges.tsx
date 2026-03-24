import { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X } from 'lucide-react'
import { UserData } from '../../types'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: (user: UserData) => boolean
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_order',
    title: 'Первый шаг',
    description: 'Оформили первый заказ',
    icon: '🎯',
    condition: (u) => u.orders_count >= 1,
    rarity: 'common',
  },
  {
    id: 'three_orders',
    title: 'Постоянный клиент',
    description: '3 заказа подряд',
    icon: '⭐',
    condition: (u) => u.orders_count >= 3,
    rarity: 'common',
  },
  {
    id: 'five_orders',
    title: 'Золотой клиент',
    description: '5 завершённых заказов',
    icon: '🏅',
    condition: (u) => u.orders_count >= 5,
    rarity: 'rare',
  },
  {
    id: 'ten_orders',
    title: 'Легенда Салона',
    description: '10 заказов — вы невероятны!',
    icon: '👑',
    condition: (u) => u.orders_count >= 10,
    rarity: 'legendary',
  },
  {
    id: 'referral_1',
    title: 'Привёл друга',
    description: 'Первый реферал',
    icon: '🤝',
    condition: (u) => u.referrals_count >= 1,
    rarity: 'common',
  },
  {
    id: 'referral_5',
    title: 'Амбассадор',
    description: '5 рефералов',
    icon: '📣',
    condition: (u) => u.referrals_count >= 5,
    rarity: 'epic',
  },
  {
    id: 'streak_7',
    title: 'Недельная серия',
    description: 'Серия бонусов 7 дней',
    icon: '🔥',
    condition: (u) => (u.daily_bonus_streak ?? 0) >= 7,
    rarity: 'rare',
  },
  {
    id: 'streak_30',
    title: 'Мастер серий',
    description: '30 дней подряд!',
    icon: '💎',
    condition: (u) => (u.daily_bonus_streak ?? 0) >= 30,
    rarity: 'legendary',
  },
  {
    id: 'big_spender',
    title: 'Большие планы',
    description: 'Потрачено 10 000₽+',
    icon: '💰',
    condition: (u) => u.total_spent >= 10000,
    rarity: 'epic',
  },
  {
    id: 'night_owl',
    title: 'Ночная сова',
    description: 'Заказ после 23:00',
    icon: '🦉',
    condition: (u) => {
      return u.orders.some(o => {
        const h = new Date(o.created_at).getHours()
        return h >= 23 || h < 5
      })
    },
    rarity: 'rare',
  },
  {
    id: 'early_bird',
    title: 'Ранняя пташка',
    description: 'Заказ до 7 утра',
    icon: '🐦',
    condition: (u) => {
      return u.orders.some(o => {
        const h = new Date(o.created_at).getHours()
        return h >= 5 && h < 7
      })
    },
    rarity: 'rare',
  },
  {
    id: 'bonus_rich',
    title: 'Копилка',
    description: 'Накопили 500₽+ бонусов',
    icon: '🐷',
    condition: (u) => u.bonus_balance >= 500,
    rarity: 'epic',
  },
]

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: {
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    text: 'var(--text-secondary)',
  },
  rare: {
    bg: 'rgba(59, 130, 246, 0.06)',
    border: 'rgba(59, 130, 246, 0.15)',
    text: 'rgba(96, 165, 250, 0.9)',
  },
  epic: {
    bg: 'rgba(167, 139, 250, 0.06)',
    border: 'rgba(167, 139, 250, 0.15)',
    text: 'rgba(167, 139, 250, 0.9)',
  },
  legendary: {
    bg: 'rgba(212,175,55,0.06)',
    border: 'rgba(212,175,55,0.15)',
    text: 'var(--gold-300)',
  },
}

interface AchievementBadgesProps {
  user: UserData
  haptic: (type: 'light' | 'medium' | 'heavy') => void
}

export const AchievementBadges = memo(function AchievementBadges({
  user,
  haptic,
}: AchievementBadgesProps) {
  const [showModal, setShowModal] = useState(false)

  const { unlocked, locked } = useMemo(() => {
    const u: Achievement[] = []
    const l: Achievement[] = []
    for (const a of ACHIEVEMENTS) {
      if (a.condition(user)) u.push(a)
      else l.push(a)
    }
    return { unlocked: u, locked: l }
  }, [user])

  const handleOpen = useCallback(() => {
    haptic('light')
    setShowModal(true)
  }, [haptic])

  if (unlocked.length === 0) return null

  return (
    <>
      {/* Compact badge strip */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '12px 14px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(212,175,55,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Trophy size={14} color="var(--gold-400)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            Достижения
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}>
            {unlocked.length} из {ACHIEVEMENTS.length} открыто
          </div>
        </div>

        {/* Badge preview */}
        <div style={{ display: 'flex', gap: 2 }}>
          {unlocked.slice(0, 5).map(a => (
            <span key={a.id} style={{ fontSize: 16 }}>{a.icon}</span>
          ))}
          {unlocked.length > 5 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              alignSelf: 'center',
              marginLeft: 2,
            }}>
              +{unlocked.length - 5}
            </span>
          )}
        </div>
      </motion.button>

      {/* Full modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              overflowY: 'auto',
              padding: '0 16px',
              paddingTop: 'max(16px, env(safe-area-inset-top))',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0 20px',
            }}>
              <div>
                <div style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  Достижения
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}>
                  {unlocked.length} / {ACHIEVEMENTS.length}
                </div>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="rgba(255,255,255,0.6)" />
              </motion.button>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.06)',
              marginBottom: 24,
            }}>
              <div style={{
                height: '100%',
                borderRadius: 2,
                background: 'var(--gold-metallic)',
                width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Unlocked */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--gold-400)',
                marginBottom: 12,
              }}>
                Разблокированы
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {unlocked.map((a, i) => {
                  const colors = RARITY_COLORS[a.rarity]
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{a.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                          {a.description}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: colors.text,
                        padding: '3px 6px',
                        borderRadius: 4,
                        background: colors.bg,
                      }}>
                        {a.rarity}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Locked */}
            {locked.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                }}>
                  Заблокированы
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {locked.map(a => (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        opacity: 0.5,
                      }}
                    >
                      <span style={{ fontSize: 24, filter: 'grayscale(1)' }}>{a.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                          {a.description}
                        </div>
                      </div>
                      <span style={{ fontSize: 16 }}>🔒</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})
