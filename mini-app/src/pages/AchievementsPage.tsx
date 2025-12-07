import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Trophy,
  Star,
  Target,
  Zap,
  Crown,
  Medal,
  Flame,
  Shield,
  Gem,
  Award,
  Lock,
  Check,
  Sparkles,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'

interface Props {
  user: UserData | null
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  unlocked: boolean
  progress?: number
  maxProgress?: number
  reward?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  secret?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING GOLD PARTICLES — Premium Background Effect
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles() {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: `${8 + (i * 10) % 84}%`,
    top: `${12 + (i * 14) % 76}%`,
    size: 2 + (i % 2),
    delay: i * 0.5,
    duration: 7 + (i % 4),
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            opacity: [0, 0.5, 0.3, 0.5, 0],
            y: [0, -40, -20, -60, -80],
            x: [0, 12, -8, 18, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: '#D4AF37',
            boxShadow: `0 0 ${p.size * 4}px rgba(212,175,55,0.6)`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER — Smooth Number Animation
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// Generate achievements based on real user data
function generateAchievements(user: UserData | null): Achievement[] {
  if (!user) return []

  return [
    {
      id: 'first_order',
      title: 'Первый шаг',
      description: 'Сделай свой первый заказ в Салуне',
      icon: Star,
      color: '#d4af37',
      unlocked: user.orders_count >= 1,
      progress: Math.min(user.orders_count, 1),
      maxProgress: 1,
      reward: '+50₽ на баланс',
      rarity: 'common',
    },
    {
      id: 'loyal_customer',
      title: 'Постоянный клиент',
      description: 'Заверши 5 заказов — ты наш!',
      icon: Medal,
      color: '#3b82f6',
      unlocked: user.orders_count >= 5,
      progress: Math.min(user.orders_count, 5),
      maxProgress: 5,
      reward: '+200₽ на баланс',
      rarity: 'rare',
    },
    {
      id: 'veteran',
      title: 'Ветеран Салуна',
      description: 'Заверши 15 заказов',
      icon: Shield,
      color: '#6366f1',
      unlocked: user.orders_count >= 15,
      progress: Math.min(user.orders_count, 15),
      maxProgress: 15,
      reward: '+500₽ на баланс',
      rarity: 'epic',
    },
    {
      id: 'vip_status',
      title: 'VIP статус',
      description: 'Достигни VIP уровня лояльности',
      icon: Crown,
      color: '#a855f7',
      unlocked: user.rank.level >= 3,
      progress: user.rank.level,
      maxProgress: 3,
      reward: '+15% кешбэк навсегда',
      rarity: 'epic',
    },
    {
      id: 'legend',
      title: 'Легенда Салуна',
      description: 'Достигни максимального уровня',
      icon: Sparkles,
      color: '#f59e0b',
      unlocked: user.rank.is_max,
      progress: user.rank.level,
      maxProgress: 4,
      reward: 'Эксклюзивные привилегии',
      rarity: 'legendary',
    },
    {
      id: 'big_spender',
      title: 'Щедрая душа',
      description: 'Потрать более 10,000₽',
      icon: Gem,
      color: '#ec4899',
      unlocked: user.total_spent >= 10000,
      progress: Math.min(user.total_spent, 10000),
      maxProgress: 10000,
      reward: '+1000₽ на баланс',
      rarity: 'legendary',
    },
    {
      id: 'whale',
      title: 'Кит',
      description: 'Потрать более 50,000₽',
      icon: TrendingUp,
      color: '#14b8a6',
      unlocked: user.total_spent >= 50000,
      progress: Math.min(user.total_spent, 50000),
      maxProgress: 50000,
      reward: 'Персональный менеджер',
      rarity: 'legendary',
    },
    {
      id: 'first_referral',
      title: 'Первый друг',
      description: 'Пригласи первого друга',
      icon: Users,
      color: '#22c55e',
      unlocked: user.referrals_count >= 1,
      progress: Math.min(user.referrals_count, 1),
      maxProgress: 1,
      reward: '+100₽ за друга',
      rarity: 'common',
    },
    {
      id: 'referral_master',
      title: 'Мастер рефералов',
      description: 'Пригласи 10 друзей',
      icon: Target,
      color: '#10b981',
      unlocked: user.referrals_count >= 10,
      progress: Math.min(user.referrals_count, 10),
      maxProgress: 10,
      reward: '+1000₽ на баланс',
      rarity: 'epic',
    },
    {
      id: 'lucky_spinner',
      title: 'Испытатель удачи',
      description: 'Покрути рулетку 5 раз',
      icon: Flame,
      color: '#ef4444',
      unlocked: user.free_spins === 0 && user.orders_count >= 5,
      reward: 'Бонусный спин',
      rarity: 'rare',
      secret: true,
    },
    {
      id: 'streak_master',
      title: 'На волне',
      description: 'Получи ежедневный бонус 7 дней подряд',
      icon: Zap,
      color: '#f59e0b',
      unlocked: user.daily_bonus_streak >= 7,
      progress: Math.min(user.daily_bonus_streak, 7),
      maxProgress: 7,
      reward: '+300₽ бонус',
      rarity: 'rare',
    },
    {
      id: 'early_bird',
      title: 'Ранняя пташка',
      description: 'Будь с нами с самого начала',
      icon: Clock,
      color: '#8b5cf6',
      unlocked: user.orders_count >= 1,
      reward: 'Статус первопроходца',
      rarity: 'common',
      secret: true,
    },
  ]
}

// ═══════════════════════════════════════════════════════════════════════════
//  MONOCHROME RARITY SYSTEM — All gold-based with subtle variations
// ═══════════════════════════════════════════════════════════════════════════

const RARITY_COLORS = {
  common: {
    bg: 'rgba(212, 175, 55, 0.04)',
    border: 'rgba(212, 175, 55, 0.12)',
    text: 'rgba(212, 175, 55, 0.5)',
    glow: 'rgba(212, 175, 55, 0.15)'
  },
  rare: {
    bg: 'rgba(212, 175, 55, 0.06)',
    border: 'rgba(212, 175, 55, 0.18)',
    text: 'rgba(212, 175, 55, 0.65)',
    glow: 'rgba(212, 175, 55, 0.25)'
  },
  epic: {
    bg: 'rgba(212, 175, 55, 0.08)',
    border: 'rgba(212, 175, 55, 0.25)',
    text: 'rgba(212, 175, 55, 0.8)',
    glow: 'rgba(212, 175, 55, 0.35)'
  },
  legendary: {
    bg: 'rgba(212, 175, 55, 0.12)',
    border: 'rgba(212, 175, 55, 0.4)',
    text: '#D4AF37',
    glow: 'rgba(212, 175, 55, 0.5)'
  },
}

const RARITY_LABELS = {
  common: 'Обычное',
  rare: 'Редкое',
  epic: 'Эпическое',
  legendary: 'Легендарное',
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM ACHIEVEMENT CARD — Monochrome Gold Style
// ═══════════════════════════════════════════════════════════════════════════

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const { haptic } = useTelegram()
  const Icon = achievement.icon
  const rarityStyle = RARITY_COLORS[achievement.rarity]

  const handleClick = () => {
    haptic('light')
  }

  const progressPercent = achievement.maxProgress
    ? ((achievement.progress || 0) / achievement.maxProgress) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleClick}
      style={{
        padding: 16,
        background: 'linear-gradient(145deg, rgba(25,25,28,0.95) 0%, rgba(18,18,20,0.98) 100%)',
        border: `1px solid ${achievement.unlocked ? rarityStyle.border : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 18,
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        boxShadow: achievement.unlocked
          ? `0 4px 24px ${rarityStyle.glow}`
          : 'none',
      }}
    >
      {/* Top highlight line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        background: achievement.unlocked
          ? `linear-gradient(90deg, transparent, ${rarityStyle.text}, transparent)`
          : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
      }} />

      {/* Locked overlay */}
      {!achievement.unlocked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          borderRadius: 18,
        }}>
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Lock size={22} color="rgba(212,175,55,0.4)" strokeWidth={1.5} />
          </motion.div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
        {/* Icon — Dark glass with gold border */}
        <motion.div
          animate={achievement.unlocked && achievement.rarity === 'legendary' ? {
            boxShadow: [
              '0 0 15px rgba(212,175,55,0.3)',
              '0 0 25px rgba(212,175,55,0.5)',
              '0 0 15px rgba(212,175,55,0.3)',
            ],
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
            border: `1px solid ${achievement.unlocked ? rarityStyle.border : 'rgba(255,255,255,0.06)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Icon shimmer for unlocked */}
          {achievement.unlocked && (
            <motion.div
              animate={{ x: [-60, 60] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              style={{
                position: 'absolute',
                width: 20,
                height: '150%',
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
          )}
          <Icon
            size={24}
            color={achievement.unlocked ? rarityStyle.text : 'rgba(100,100,100,0.4)'}
            strokeWidth={1.5}
          />
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: achievement.unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
            }}>
              {achievement.title}
            </span>
            {achievement.unlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  background: 'linear-gradient(145deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={10} color="#fff" strokeWidth={3} />
              </motion.div>
            )}
            {achievement.secret && (
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.8)',
                background: 'rgba(212,175,55,0.1)',
                padding: '2px 5px',
                borderRadius: 4,
                letterSpacing: '0.05em',
              }}>
                SECRET
              </span>
            )}
          </div>

          <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 8,
            lineHeight: 1.4,
          }}>
            {achievement.description}
          </p>

          {/* Rarity badge — minimal style */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: rarityStyle.bg,
            border: `1px solid ${rarityStyle.border}`,
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 700,
            color: rarityStyle.text,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {achievement.rarity === 'legendary' && <Sparkles size={9} />}
            {RARITY_LABELS[achievement.rarity]}
          </div>

          {/* Progress bar for locked achievements */}
          {achievement.maxProgress && !achievement.unlocked && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
                fontSize: 10,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>Прогресс</span>
                <span style={{ color: 'rgba(212,175,55,0.6)', fontWeight: 600 }}>
                  {achievement.maxProgress >= 1000
                    ? `${(achievement.progress || 0).toLocaleString()}/${achievement.maxProgress.toLocaleString()}`
                    : `${achievement.progress || 0}/${achievement.maxProgress}`
                  }
                </span>
              </div>
              <div style={{
                height: 6,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.03)',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,0.9))',
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          )}

          {/* Reward */}
          {achievement.reward && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: achievement.unlocked ? '#22c55e' : 'rgba(255,255,255,0.3)',
                fontWeight: 500,
                background: achievement.unlocked
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(255,255,255,0.02)',
                padding: '5px 10px',
                borderRadius: 6,
                border: achievement.unlocked
                  ? '1px solid rgba(34, 197, 94, 0.2)'
                  : '1px solid rgba(255,255,255,0.03)',
              }}
            >
              <Award size={12} />
              <span>{achievement.reward}</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function AchievementsPage({ user }: Props) {
  const achievements = useMemo(() => generateAchievements(user), [user])
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  // Sort: unlocked first, then by rarity (legendary > epic > rare > common)
  const sortedAchievements = useMemo(() => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 }
    return [...achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      return rarityOrder[a.rarity] - rarityOrder[b.rarity]
    })
  }, [achievements])

  if (!user) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#71717a' }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div
      className="app-content"
      style={{
        padding: '16px 16px 120px',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Floating gold particles */}
      <FloatingParticles />

      {/* Background decorative glow */}
      <div style={{
        position: 'fixed',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Hero Icon with Breathing Animation */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
          {/* Outer breathing ring */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: 30,
              border: '1px solid rgba(212,175,55,0.3)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
              border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,175,55,0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top gold accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
            }} />

            {/* Inner breathing glow */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy size={36} color="rgba(212,175,55,0.85)" strokeWidth={1.5} />
            </motion.div>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontFamily: "var(--font-serif, 'Playfair Display', serif)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.02em',
          }}
        >
          ДОСТИЖЕНИЯ
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Выполняй задания и получай награды
        </motion.p>
      </motion.header>

      {/* Overall Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          padding: 20,
          background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: 20,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
          }}>
            Общий прогресс
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.9)',
            fontFamily: 'var(--font-mono)',
          }}>
            {unlockedCount}/{totalCount}
          </span>
        </div>

        {/* Progress bar with shimmer */}
        <div style={{
          height: 10,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 5,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.03)',
          position: 'relative',
          marginBottom: 16,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0.95))',
              borderRadius: 5,
              boxShadow: '0 0 16px rgba(212, 175, 55, 0.4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />
          </motion.div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(34, 197, 94, 0.08)',
              borderRadius: 12,
              padding: '12px 8px',
              border: '1px solid rgba(34, 197, 94, 0.15)',
            }}
          >
            <motion.div
              animate={{ textShadow: ['0 0 8px rgba(34,197,94,0.3)', '0 0 16px rgba(34,197,94,0.5)', '0 0 8px rgba(34,197,94,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#22c55e',
                marginBottom: 2,
              }}
            >
              <AnimatedCounter value={unlockedCount} />
            </motion.div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Получено</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: '12px 8px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 2,
            }}>
              <AnimatedCounter value={totalCount - unlockedCount} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Осталось</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(212, 175, 55, 0.08)',
              borderRadius: 12,
              padding: '12px 8px',
              border: '1px solid rgba(212, 175, 55, 0.15)',
            }}
          >
            <motion.div
              animate={{ textShadow: ['0 0 8px rgba(212,175,55,0.2)', '0 0 16px rgba(212,175,55,0.4)', '0 0 8px rgba(212,175,55,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.9)',
                marginBottom: 2,
              }}
            >
              <AnimatedCounter value={Math.round(progress)} suffix="%" />
            </motion.div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Прогресс</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Achievements List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {sortedAchievements.map((achievement, index) => (
          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
        ))}
      </motion.div>
    </div>
  )
}
