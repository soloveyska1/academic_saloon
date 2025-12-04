import { useState } from 'react'
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
  ChevronRight
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
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_order',
    title: 'Первый шаг',
    description: 'Сделай свой первый заказ',
    icon: Star,
    color: '#d4af37',
    unlocked: true,
    reward: '+50₽',
    rarity: 'common',
  },
  {
    id: 'loyal_customer',
    title: 'Постоянный клиент',
    description: 'Заверши 5 заказов',
    icon: Medal,
    color: '#3b82f6',
    unlocked: true,
    progress: 5,
    maxProgress: 5,
    reward: '+200₽',
    rarity: 'rare',
  },
  {
    id: 'vip_status',
    title: 'VIP статус',
    description: 'Достигни VIP уровня лояльности',
    icon: Crown,
    color: '#a855f7',
    unlocked: false,
    progress: 3,
    maxProgress: 5,
    reward: '+500₽',
    rarity: 'epic',
  },
  {
    id: 'speed_demon',
    title: 'Молниеносный',
    description: 'Оформи заказ менее чем за 2 минуты',
    icon: Zap,
    color: '#f59e0b',
    unlocked: true,
    reward: '+100₽',
    rarity: 'rare',
  },
  {
    id: 'big_spender',
    title: 'Щедрая душа',
    description: 'Потрать более 10,000₽',
    icon: Gem,
    color: '#ec4899',
    unlocked: false,
    progress: 7500,
    maxProgress: 10000,
    reward: '+1000₽',
    rarity: 'legendary',
  },
  {
    id: 'referral_master',
    title: 'Мастер рефералов',
    description: 'Пригласи 10 друзей',
    icon: Target,
    color: '#22c55e',
    unlocked: false,
    progress: 3,
    maxProgress: 10,
    reward: '+500₽',
    rarity: 'epic',
  },
  {
    id: 'lucky_winner',
    title: 'Баловень судьбы',
    description: 'Выиграй джекпот в рулетке',
    icon: Flame,
    color: '#ef4444',
    unlocked: false,
    reward: 'Секретный приз',
    rarity: 'legendary',
  },
  {
    id: 'night_owl',
    title: 'Ночная сова',
    description: 'Сделай заказ после полуночи',
    icon: Shield,
    color: '#6366f1',
    unlocked: true,
    reward: '+75₽',
    rarity: 'common',
  },
]

const RARITY_COLORS = {
  common: { bg: 'rgba(113, 113, 122, 0.1)', border: 'rgba(113, 113, 122, 0.2)', text: '#a1a1aa' },
  rare: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
  epic: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
  legendary: { bg: 'rgba(212, 175, 55, 0.1)', border: 'rgba(212, 175, 55, 0.3)', text: '#d4af37' },
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      style={{
        padding: 16,
        background: achievement.unlocked
          ? `linear-gradient(135deg, ${achievement.color}15 0%, rgba(20, 20, 23, 0.9) 100%)`
          : 'linear-gradient(135deg, rgba(30, 30, 35, 0.6) 0%, rgba(20, 20, 23, 0.8) 100%)',
        border: `1px solid ${achievement.unlocked ? `${achievement.color}40` : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: 18,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Locked overlay */}
      {!achievement.unlocked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <Lock size={28} color="#71717a" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Icon */}
        <motion.div
          animate={achievement.unlocked ? {
            boxShadow: [
              `0 0 20px ${achievement.color}30`,
              `0 0 30px ${achievement.color}50`,
              `0 0 20px ${achievement.color}30`,
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: achievement.unlocked
              ? `linear-gradient(135deg, ${achievement.color}, ${achievement.color}aa)`
              : 'rgba(40, 40, 45, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            size={28}
            color={achievement.unlocked ? '#0a0a0c' : '#52525b'}
            strokeWidth={2}
          />
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: achievement.unlocked ? '#f2f2f2' : '#71717a',
              }}
            >
              {achievement.title}
            </span>
            {achievement.unlocked && (
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={12} color="#fff" strokeWidth={3} />
              </div>
            )}
          </div>

          <p
            style={{
              fontSize: 12,
              color: '#71717a',
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {achievement.description}
          </p>

          {/* Rarity badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: rarityStyle.bg,
              border: `1px solid ${rarityStyle.border}`,
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              color: rarityStyle.text,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {RARITY_LABELS[achievement.rarity]}
          </div>

          {/* Progress bar */}
          {achievement.maxProgress && !achievement.unlocked && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ color: '#71717a' }}>Прогресс</span>
                <span style={{ color: achievement.color }}>
                  {achievement.progress}/{achievement.maxProgress}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%`,
                  }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${achievement.color}, ${achievement.color}cc)`,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          )}

          {/* Reward */}
          {achievement.reward && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: achievement.unlocked ? '#22c55e' : '#71717a',
                fontWeight: 600,
              }}
            >
              <Award size={14} />
              <span>Награда: {achievement.reward}</span>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            opacity: 0.5,
          }}
        >
          <ChevronRight size={18} color="#71717a" />
        </motion.div>
      </div>
    </motion.div>
  )
}

export function AchievementsPage({ user }: Props) {
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length
  const totalCount = ACHIEVEMENTS.length
  const progress = (unlockedCount / totalCount) * 100

  return (
    <div
      className="app-content"
      style={{
        padding: '16px 16px 120px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d061 50%, #8b6914 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
          }}
        >
          <Trophy size={40} color="#0a0a0c" strokeWidth={1.5} />
        </motion.div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ДОСТИЖЕНИЯ
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#a1a1aa',
          }}
        >
          Выполняй задания и получай награды
        </p>
      </motion.header>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          padding: 20,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              fontWeight: 700,
              color: '#f2f2f2',
            }}
          >
            Общий прогресс
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: '#d4af37',
              fontWeight: 600,
            }}
          >
            {unlockedCount}/{totalCount}
          </span>
        </div>

        <div
          style={{
            height: 10,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 5,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37, #f5d061, #d4af37)',
              borderRadius: 5,
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#22c55e',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {unlockedCount}
            </div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Получено</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#71717a',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {totalCount - unlockedCount}
            </div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Осталось</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#d4af37',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {Math.round(progress)}%
            </div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Прогресс</div>
          </div>
        </div>
      </motion.div>

      {/* Achievements List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {ACHIEVEMENTS.map((achievement, index) => (
          <AchievementCard key={achievement.id} achievement={achievement} index={index} />
        ))}
      </div>
    </div>
  )
}
