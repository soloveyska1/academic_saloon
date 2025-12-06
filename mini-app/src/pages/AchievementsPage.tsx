import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const RARITY_COLORS = {
  common: {
    bg: 'rgba(113, 113, 122, 0.08)',
    border: 'rgba(113, 113, 122, 0.15)',
    text: '#a1a1aa',
    glow: 'rgba(113, 113, 122, 0.2)'
  },
  rare: {
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.2)',
    text: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.3)'
  },
  epic: {
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.2)',
    text: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.3)'
  },
  legendary: {
    bg: 'rgba(212, 175, 55, 0.1)',
    border: 'rgba(212, 175, 55, 0.25)',
    text: '#d4af37',
    glow: 'rgba(212, 175, 55, 0.4)'
  },
}

const RARITY_LABELS = {
  common: 'Обычное',
  rare: 'Редкое',
  epic: 'Эпическое',
  legendary: 'Легендарное',
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { haptic } = useTelegram()
  const Icon = achievement.icon
  const rarityStyle = RARITY_COLORS[achievement.rarity]

  const handleClick = () => {
    haptic('light')
    setIsExpanded(!isExpanded)
  }

  const progressPercent = achievement.maxProgress
    ? ((achievement.progress || 0) / achievement.maxProgress) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleClick}
      style={{
        padding: 18,
        background: achievement.unlocked
          ? `linear-gradient(145deg, ${achievement.color}12 0%, rgba(18, 18, 22, 0.95) 50%, rgba(12, 12, 15, 0.98) 100%)`
          : 'linear-gradient(145deg, rgba(28, 28, 32, 0.6) 0%, rgba(18, 18, 22, 0.9) 100%)',
        border: `1px solid ${achievement.unlocked ? `${achievement.color}35` : 'rgba(255, 255, 255, 0.04)'}`,
        borderRadius: 20,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        boxShadow: achievement.unlocked
          ? `0 4px 24px ${rarityStyle.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
          : 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
      }}
    >
      {/* Animated background glow for unlocked */}
      {achievement.unlocked && (
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            background: `radial-gradient(circle, ${achievement.color}20 0%, transparent 70%)`,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Secret achievement sparkle */}
      {achievement.secret && achievement.unlocked && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0.6,
          }}
        >
          <Sparkles size={14} color={achievement.color} />
        </motion.div>
      )}

      {/* Locked overlay with blur */}
      {!achievement.unlocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Lock size={26} color="#52525b" />
          </motion.div>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
        {/* Icon with premium styling */}
        <motion.div
          animate={achievement.unlocked ? {
            boxShadow: [
              `0 0 15px ${achievement.color}25`,
              `0 0 25px ${achievement.color}40`,
              `0 0 15px ${achievement.color}25`,
            ],
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: achievement.unlocked
              ? `linear-gradient(145deg, ${achievement.color} 0%, ${achievement.color}cc 100%)`
              : 'linear-gradient(145deg, rgba(40, 40, 48, 0.9) 0%, rgba(30, 30, 35, 0.9) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: achievement.unlocked
              ? `1px solid ${achievement.color}60`
              : '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Icon shine effect */}
          {achievement.unlocked && (
            <motion.div
              animate={{ x: [-60, 60] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{
                position: 'absolute',
                width: 30,
                height: '150%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
          )}
          <Icon
            size={28}
            color={achievement.unlocked ? '#0a0a0c' : '#4a4a52'}
            strokeWidth={achievement.unlocked ? 2.2 : 1.8}
          />
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: achievement.unlocked ? '#f5f5f5' : '#71717a',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              {achievement.title}
            </span>
            {achievement.unlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 7,
                  background: 'linear-gradient(145deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
                }}
              >
                <Check size={12} color="#fff" strokeWidth={3} />
              </motion.div>
            )}
            {achievement.secret && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#a855f7',
                  background: 'rgba(168, 85, 247, 0.15)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  letterSpacing: '0.05em',
                }}
              >
                SECRET
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: 12,
              color: '#8a8a8f',
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            {achievement.description}
          </p>

          {/* Rarity badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              background: rarityStyle.bg,
              border: `1px solid ${rarityStyle.border}`,
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              color: rarityStyle.text,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {achievement.rarity === 'legendary' && <Sparkles size={10} />}
            {RARITY_LABELS[achievement.rarity]}
          </div>

          {/* Progress bar with premium styling */}
          {achievement.maxProgress && !achievement.unlocked && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: '#71717a' }}>Прогресс</span>
                <span style={{ color: achievement.color, fontWeight: 600 }}>
                  {achievement.maxProgress >= 1000
                    ? `${(achievement.progress || 0).toLocaleString()}/${achievement.maxProgress.toLocaleString()}`
                    : `${achievement.progress || 0}/${achievement.maxProgress}`
                  }
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${achievement.color}cc, ${achievement.color})`,
                    borderRadius: 4,
                    boxShadow: `0 0 10px ${achievement.color}40`,
                    position: 'relative',
                  }}
                >
                  {/* Progress bar shine */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '50%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                  />
                </motion.div>
              </div>
            </div>
          )}

          {/* Reward with premium styling */}
          {achievement.reward && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: achievement.unlocked ? '#22c55e' : '#5a5a5f',
                fontWeight: 600,
                background: achievement.unlocked
                  ? 'rgba(34, 197, 94, 0.08)'
                  : 'rgba(255, 255, 255, 0.02)',
                padding: '6px 12px',
                borderRadius: 8,
                border: achievement.unlocked
                  ? '1px solid rgba(34, 197, 94, 0.15)'
                  : '1px solid rgba(255, 255, 255, 0.03)',
              }}
            >
              <Award size={14} />
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
      {/* Background decorative elements */}
      <div
        style={{
          position: 'fixed',
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 100,
          right: -100,
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          textAlign: 'center',
          marginBottom: 28,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          style={{
            width: 88,
            height: 88,
            margin: '0 auto 18px',
            borderRadius: 26,
            background: 'linear-gradient(145deg, #d4af37 0%, #f5d061 40%, #b38728 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(212, 175, 55, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shine effect */}
          <motion.div
            animate={{ x: [-100, 100] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
            style={{
              position: 'absolute',
              width: 40,
              height: '150%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
          <Trophy size={44} color="#0a0a0c" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 10,
            background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.02em',
          }}
        >
          ДОСТИЖЕНИЯ
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{
            fontSize: 14,
            color: '#8a8a8f',
            letterSpacing: '0.02em',
          }}
        >
          Выполняй задания и получай награды
        </motion.p>
      </motion.header>

      {/* Overall Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: 22,
          background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, rgba(18, 18, 22, 0.95) 50%, rgba(12, 12, 15, 0.98) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: 24,
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Decorative corner glow */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17,
              fontWeight: 700,
              color: '#f5f5f5',
              letterSpacing: '0.01em',
            }}
          >
            Общий прогресс
          </span>
          <motion.span
            key={unlockedCount}
            initial={{ scale: 1.3, color: '#f5d061' }}
            animate={{ scale: 1, color: '#d4af37' }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {unlockedCount}/{totalCount}
          </motion.span>
        </div>

        {/* Progress bar with premium styling */}
        <div
          style={{
            height: 12,
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            position: 'relative',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #b38728, #d4af37, #f5d061, #d4af37)',
              backgroundSize: '200% 100%',
              borderRadius: 6,
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
              position: 'relative',
            }}
          >
            {/* Animated gradient */}
            <motion.div
              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                backgroundSize: '50% 100%',
              }}
            />
          </motion.div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 18,
            gap: 12,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(34, 197, 94, 0.08)',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(34, 197, 94, 0.12)',
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#22c55e',
                fontFamily: "'Playfair Display', serif",
                marginBottom: 2,
              }}
            >
              {unlockedCount}
            </div>
            <div style={{ fontSize: 11, color: '#6a6a6f', fontWeight: 500 }}>Получено</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(113, 113, 122, 0.08)',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(113, 113, 122, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#71717a',
                fontFamily: "'Playfair Display', serif",
                marginBottom: 2,
              }}
            >
              {totalCount - unlockedCount}
            </div>
            <div style={{ fontSize: 11, color: '#6a6a6f', fontWeight: 500 }}>Осталось</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              flex: 1,
              textAlign: 'center',
              background: 'rgba(212, 175, 55, 0.08)',
              borderRadius: 14,
              padding: '14px 8px',
              border: '1px solid rgba(212, 175, 55, 0.12)',
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: '#d4af37',
                fontFamily: "'Playfair Display', serif",
                marginBottom: 2,
              }}
            >
              {Math.round(progress)}%
            </div>
            <div style={{ fontSize: 11, color: '#6a6a6f', fontWeight: 500 }}>Прогресс</div>
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
