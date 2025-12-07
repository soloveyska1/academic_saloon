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

// ═══════════════════════════════════════════════════════════════════════════
//  STRATEGIC REWARDS SYSTEM — Real value for client, 100x profit for owner
//
//  Philosophy:
//  - Each reward FEELS valuable and creates desire
//  - Actual cost is minimal compared to revenue generated
//  - Rewards incentivize more spending/engagement (not just freebies)
//  - Secret achievements create FOMO and mystery
// ═══════════════════════════════════════════════════════════════════════════

function generateAchievements(user: UserData | null): Achievement[] {
  if (!user) return []

  return [
    // ── ONBOARDING: Get them hooked ──
    {
      id: 'first_order',
      title: 'Первый шаг',
      description: 'Сделай свой первый заказ в Салуне',
      icon: Star,
      color: '#d4af37',
      unlocked: user.orders_count >= 1,
      progress: Math.min(user.orders_count, 1),
      maxProgress: 1,
      // 5% off NEXT order = ensures repeat purchase, costs ~150₽ on avg order
      reward: '-5% на следующий заказ',
      rarity: 'common',
    },

    // ── RETENTION: Keep them coming back ──
    {
      id: 'loyal_customer',
      title: 'Постоянный клиент',
      description: 'Заверши 5 заказов — ты наш!',
      icon: Medal,
      color: '#3b82f6',
      unlocked: user.orders_count >= 5,
      progress: Math.min(user.orders_count, 5),
      maxProgress: 5,
      // 150₽ bonus after 5 orders (~15,000₽ spent) = 1% cost, feels big
      reward: '+150₽ бонус',
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
      // Free revision = costs nothing if work is good, feels VERY valuable
      reward: 'Бесплатная доп. правка',
      rarity: 'epic',
    },

    // ── STATUS: Psychological rewards ──
    {
      id: 'vip_status',
      title: 'VIP статус',
      description: 'Достигни VIP уровня лояльности',
      icon: Crown,
      color: '#a855f7',
      unlocked: user.rank.level >= 3,
      progress: user.rank.level,
      maxProgress: 3,
      // Priority queue = costs nothing, feels premium, speeds up workflow
      reward: 'Приоритетная очередь',
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
      // Exclusive room access + early discounts = pure status, no cost
      reward: 'VIP-комната + ранний доступ',
      rarity: 'legendary',
    },

    // ── BIG SPENDERS: Whale rewards that don't hurt ──
    {
      id: 'big_spender',
      title: 'Щедрая душа',
      description: 'Потрать более 10,000₽',
      icon: Gem,
      color: '#ec4899',
      unlocked: user.total_spent >= 10000,
      progress: Math.min(user.total_spent, 10000),
      maxProgress: 10000,
      // 300₽ on 10k spent = 3%, but they're already committed
      reward: '+300₽ на баланс',
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
      // Personal manager = premium feel, actually saves YOUR time
      reward: 'Личный менеджер 24/7',
      rarity: 'legendary',
    },

    // ── REFERRALS: Each friend = new customer ──
    {
      id: 'first_referral',
      title: 'Первый друг',
      description: 'Пригласи первого друга',
      icon: Users,
      color: '#22c55e',
      unlocked: user.referrals_count >= 1,
      progress: Math.min(user.referrals_count, 1),
      maxProgress: 1,
      // 100₽ for bringing customer worth 3000₽+ lifetime = 3% CAC
      reward: '+100₽ тебе и другу',
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
      // 5% permanent = on already-paying customer, they'll spend more
      reward: '+5% кешбэк навсегда',
      rarity: 'epic',
    },

    // ── SECRET: Hidden until unlocked, creates mystery/FOMO ──
    {
      id: 'lucky_spinner',
      title: 'Испытатель удачи',
      description: 'Особые условия для везунчиков',
      icon: Flame,
      color: '#ef4444',
      unlocked: user.free_spins === 0 && user.orders_count >= 5,
      // Extra spin = gamification, keeps them engaged
      reward: '+2 бесплатных спина',
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
      // x2 daily bonus for a week = keeps them opening app daily
      reward: 'x2 дневной бонус на неделю',
      rarity: 'rare',
    },
    {
      id: 'early_bird',
      title: 'Ранняя пташка',
      description: 'Для тех, кто был с нами с начала',
      icon: Clock,
      color: '#8b5cf6',
      unlocked: user.orders_count >= 1,
      // Exclusive badge = pure status, zero cost, creates envy
      reward: 'Эксклюзивный значок OG',
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

  // Secret achievements show as ??? until unlocked
  const isHiddenSecret = achievement.secret && !achievement.unlocked

  const handleClick = () => {
    haptic('light')
  }

  const progressPercent = achievement.maxProgress
    ? ((achievement.progress || 0) / achievement.maxProgress) * 100
    : 0

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECRET ACHIEVEMENT CARD — Mysterious, enticing, creates FOMO
  // ═══════════════════════════════════════════════════════════════════════════
  if (isHiddenSecret) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={handleClick}
        style={{
          padding: 16,
          background: 'linear-gradient(145deg, rgba(20,20,22,0.98) 0%, rgba(15,15,17,0.99) 100%)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: 18,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Mysterious shimmer effect */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '30%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Top highlight */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
        }} />

        <div style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
          {/* Mystery icon */}
          <motion.div
            animate={{
              opacity: [0.4, 0.7, 0.4],
              boxShadow: [
                '0 0 10px rgba(212,175,55,0.1)',
                '0 0 20px rgba(212,175,55,0.2)',
                '0 0 10px rgba(212,175,55,0.1)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'rgba(212,175,55,0.5)',
              fontFamily: 'var(--font-mono)',
            }}>
              ?
            </span>
          </motion.div>

          {/* Mystery content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <motion.span
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'rgba(212,175,55,0.7)',
                  letterSpacing: '0.15em',
                }}
              >
                ???
              </motion.span>
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.9)',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                padding: '3px 8px',
                borderRadius: 4,
                letterSpacing: '0.1em',
                border: '1px solid rgba(212,175,55,0.2)',
              }}>
                СЕКРЕТ
              </span>
            </div>

            <p style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 8,
              lineHeight: 1.4,
              fontStyle: 'italic',
            }}>
              Секретное достижение. Выполни условие, чтобы раскрыть...
            </p>

            {/* Mystery reward teaser */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.15)',
              borderRadius: 6,
            }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                <Sparkles size={11} color="rgba(212,175,55,0.7)" />
              </motion.div>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.6)',
                letterSpacing: '0.05em',
              }}>
                Особая награда
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  REGULAR ACHIEVEMENT CARD — Normal display for non-secret or unlocked
  // ═══════════════════════════════════════════════════════════════════════════
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

      {/* Locked indicator — positioned in corner, not blocking content */}
      {!achievement.unlocked && (
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(145deg, rgba(30,30,35,0.95), rgba(20,20,24,0.98))',
            border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <Lock size={14} color="rgba(212,175,55,0.6)" strokeWidth={1.5} />
        </motion.div>
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
            {/* Show SECRET badge only for unlocked secrets (revealed) */}
            {achievement.secret && achievement.unlocked && (
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.9)',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '0.05em',
                border: '1px solid rgba(212,175,55,0.2)',
              }}>
                СЕКРЕТ ✓
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

          {/* Rarity badge and reward row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            marginTop: 2,
          }}>
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

            {/* Reward — now inline with badge */}
            {achievement.reward && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  color: achievement.unlocked ? '#22c55e' : 'rgba(212,175,55,0.6)',
                  fontWeight: 600,
                  background: achievement.unlocked
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(212,175,55,0.06)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: achievement.unlocked
                    ? '1px solid rgba(34, 197, 94, 0.2)'
                    : '1px solid rgba(212,175,55,0.12)',
                }}
              >
                <Award size={11} />
                <span>{achievement.reward}</span>
              </motion.div>
            )}
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

        {/* Stats row — Premium styled numbers */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shine effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.15), transparent)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Check size={16} color="#22c55e" strokeWidth={2.5} />
              </motion.div>
              <motion.span
                animate={{
                  textShadow: ['0 0 10px rgba(34,197,94,0.4)', '0 0 25px rgba(34,197,94,0.7)', '0 0 10px rgba(34,197,94,0.4)'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  background: 'linear-gradient(180deg, #4ade80, #22c55e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                <AnimatedCounter value={unlockedCount} />
              </motion.span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(34,197,94,0.7)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Получено</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(255,255,255,0.08)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <Lock size={14} color="rgba(255,255,255,0.35)" strokeWidth={2} />
              <span style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '-0.02em',
              }}>
                <AnimatedCounter value={totalCount - unlockedCount} />
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Осталось</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.04))',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shine effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, delay: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              <motion.span
                animate={{
                  textShadow: ['0 0 10px rgba(212,175,55,0.3)', '0 0 25px rgba(212,175,55,0.6)', '0 0 10px rgba(212,175,55,0.3)'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  background: 'linear-gradient(180deg, #f5d485, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                <AnimatedCounter value={Math.round(progress)} suffix="%" />
              </motion.span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(212,175,55,0.8)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Прогресс</div>
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
