import { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Target, Star, Medal, Crown, Users, Megaphone, Flame,
  Gem, Wallet, Moon, Sunrise, X,
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { UserData } from '../../types'

interface Achievement {
  id: string
  title: string
  description: string
  icon: LucideIcon
  condition: (user: UserData) => boolean
  progress?: (user: UserData) => { current: number; target: number } | null
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_order',
    title: 'Первый шаг',
    description: 'Оформили первый заказ',
    icon: Target,
    condition: (u) => u.orders_count >= 1,
    progress: (u) => u.orders_count < 1 ? { current: u.orders_count, target: 1 } : null,
  },
  {
    id: 'three_orders',
    title: 'Постоянный клиент',
    description: '3 заказа',
    icon: Star,
    condition: (u) => u.orders_count >= 3,
    progress: (u) => u.orders_count < 3 ? { current: u.orders_count, target: 3 } : null,
  },
  {
    id: 'five_orders',
    title: 'Золотой клиент',
    description: '5 заказов',
    icon: Medal,
    condition: (u) => u.orders_count >= 5,
    progress: (u) => u.orders_count < 5 ? { current: u.orders_count, target: 5 } : null,
  },
  {
    id: 'ten_orders',
    title: 'Легенда Салона',
    description: '10 заказов',
    icon: Crown,
    condition: (u) => u.orders_count >= 10,
    progress: (u) => u.orders_count < 10 ? { current: u.orders_count, target: 10 } : null,
  },
  {
    id: 'referral_1',
    title: 'Привёл друга',
    description: '1 реферал',
    icon: Users,
    condition: (u) => u.referrals_count >= 1,
    progress: (u) => u.referrals_count < 1 ? { current: u.referrals_count, target: 1 } : null,
  },
  {
    id: 'referral_5',
    title: 'Амбассадор',
    description: '5 рефералов',
    icon: Megaphone,
    condition: (u) => u.referrals_count >= 5,
    progress: (u) => u.referrals_count < 5 ? { current: u.referrals_count, target: 5 } : null,
  },
  {
    id: 'streak_7',
    title: 'Недельная серия',
    description: 'Серия 7 дней',
    icon: Flame,
    condition: (u) => (u.daily_bonus_streak ?? 0) >= 7,
    progress: (u) => {
      const s = u.daily_bonus_streak ?? 0
      return s < 7 ? { current: s, target: 7 } : null
    },
  },
  {
    id: 'streak_30',
    title: 'Мастер серий',
    description: '30 дней подряд',
    icon: Gem,
    condition: (u) => (u.daily_bonus_streak ?? 0) >= 30,
    progress: (u) => {
      const s = u.daily_bonus_streak ?? 0
      return s < 30 ? { current: s, target: 30 } : null
    },
  },
  {
    id: 'big_spender',
    title: 'Большие планы',
    description: '10 000₽ потрачено',
    icon: Wallet,
    condition: (u) => u.total_spent >= 10000,
    progress: (u) => u.total_spent < 10000 ? { current: u.total_spent, target: 10000 } : null,
  },
  {
    id: 'night_owl',
    title: 'Ночная сова',
    description: 'Заказ после 23:00',
    icon: Moon,
    condition: (u) => u.orders.some(o => {
      const h = new Date(o.created_at).getHours()
      return h >= 23 || h < 5
    }),
  },
  {
    id: 'early_bird',
    title: 'Ранняя пташка',
    description: 'Заказ до 7 утра',
    icon: Sunrise,
    condition: (u) => u.orders.some(o => {
      const h = new Date(o.created_at).getHours()
      return h >= 5 && h < 7
    }),
  },
]

interface AchievementBadgesProps {
  user: UserData
  haptic: (type: 'light' | 'medium' | 'heavy') => void
}

export const AchievementBadges = memo(function AchievementBadges({
  user,
  haptic,
}: AchievementBadgesProps) {
  const [showModal, setShowModal] = useState(false)

  const { unlocked, locked, nextToUnlock } = useMemo(() => {
    const u: Achievement[] = []
    const l: Achievement[] = []
    for (const a of ACHIEVEMENTS) {
      if (a.condition(user)) u.push(a)
      else l.push(a)
    }
    // Find the nearest achievement to unlock (with most progress)
    const next = l.find(a => {
      const prog = a.progress?.(user)
      return prog && prog.current > 0
    }) || l[0] || null
    return { unlocked: u, locked: l, nextToUnlock: next }
  }, [user])

  const handleOpen = useCallback(() => {
    haptic('light')
    setShowModal(true)
  }, [haptic])

  if (unlocked.length === 0 && !nextToUnlock) return null

  return (
    <>
      {/* Compact strip */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border-default)',
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: '0 4px 12px -4px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'var(--gold-glass-subtle)',
          border: '1px solid rgba(212,175,55,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Trophy size={15} strokeWidth={2} color="var(--gold-400)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Достижения
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.3 }}>
            {unlocked.length} из {ACHIEVEMENTS.length} открыто
          </div>
        </div>

        {/* Mini icon preview */}
        <div style={{ display: 'flex', gap: 3 }}>
          {unlocked.slice(0, 4).map(a => {
            const Icon = a.icon
            return (
              <div
                key={a.id}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'var(--gold-glass-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={12} strokeWidth={2} color="var(--gold-400)" />
              </div>
            )
          })}
          {unlocked.length > 4 && (
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}>
              +{unlocked.length - 4}
            </div>
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
              background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(12px)',
              overflowY: 'auto',
              padding: '0 16px',
              paddingTop: 'max(16px, env(safe-area-inset-top))',
              paddingBottom: 'max(32px, env(safe-area-inset-bottom))',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0 16px',
            }}>
              <div>
                <div style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}>
                  Достижения
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
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
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="var(--text-secondary)" />
              </motion.button>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: 3,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.06)',
              marginBottom: 24,
            }}>
              <div style={{
                height: '100%',
                borderRadius: 2,
                background: 'var(--gold-metallic)',
                width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`,
                transition: 'width 0.5s var(--ease-out)',
              }} />
            </div>

            {/* Unlocked */}
            {unlocked.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.55)',
                  marginBottom: 12,
                }}>
                  Разблокированы
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {unlocked.map((a, i) => {
                    const Icon = a.icon
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          borderRadius: 12,
                          background: 'var(--gold-glass-subtle)',
                          border: '1px solid rgba(212,175,55,0.12)',
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'var(--gold-glass-medium)',
                          border: '1px solid rgba(212,175,55,0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={17} strokeWidth={2} color="var(--gold-400)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {a.title}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                            {a.description}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

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
                  Впереди
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {locked.map(a => {
                    const Icon = a.icon
                    const prog = a.progress?.(user)
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-default)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={17} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
                            {a.title}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', opacity: 0.6 }}>
                            {a.description}
                          </div>
                          {/* Progress toward unlock */}
                          {prog && prog.current > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{
                                width: '100%',
                                height: 2,
                                borderRadius: 1,
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  height: '100%',
                                  borderRadius: 1,
                                  background: 'rgba(212,175,55,0.4)',
                                  width: `${Math.min((prog.current / prog.target) * 100, 100)}%`,
                                }} />
                              </div>
                              <div style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginTop: 3,
                                opacity: 0.6,
                              }}>
                                {prog.current} / {prog.target}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})
