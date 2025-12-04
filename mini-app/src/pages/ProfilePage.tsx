import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Users, Wallet, Percent, FileText, MessageCircle,
  Calendar, Award, ChevronRight, Shield, TrendingUp, QrCode,
  ArrowUpRight, ArrowDownLeft, Clock, Sparkles, Gift, Star, BarChart3
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { QRCodeModal } from '../components/ui/QRCode'
import { AnimatedBarChart, AnimatedLineChart, Sparkline } from '../components/ui/AnimatedCharts'

interface Props {
  user: UserData | null
}

// Premium rank name mapping
const PREMIUM_RANK_NAMES: Record<string, string> = {
  'Салага': 'Резидент',
  'Ковбой': 'Партнёр',
  'Шериф': 'VIP-Клиент',
  'Легенда': 'Премиум',
}

// Premium loyalty status mapping (old -> new names)
const PREMIUM_LOYALTY_NAMES: Record<string, { name: string; emoji: string }> = {
  // Old system names
  'Новичок': { name: 'Резидент', emoji: '🌵' },
  'Завсегдатай': { name: 'Партнёр', emoji: '🤝' },
  'Шериф': { name: 'VIP-Клиент', emoji: '⭐' },
  'Легенда салуна': { name: 'Премиум', emoji: '👑' },
  // In case API returns with emoji prefix
  '🌵 Новичок': { name: 'Резидент', emoji: '🌵' },
  '🤠 Завсегдатай': { name: 'Партнёр', emoji: '🤝' },
  '⭐ Шериф': { name: 'VIP-Клиент', emoji: '⭐' },
  '🏆 Легенда салуна': { name: 'Премиум', emoji: '👑' },
}

// Helper function to get real monthly activity from orders
function getMonthlyActivity(orders: { created_at: string; status: string }[]): { label: string; value: number }[] {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const now = new Date()
  const currentMonth = now.getMonth()

  // Get last 6 months of activity
  const monthlyData: { label: string; value: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12
    const year = i > currentMonth ? now.getFullYear() - 1 : now.getFullYear()

    // Count orders in this month (all orders, not just completed)
    const count = orders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate.getMonth() === monthIndex &&
             orderDate.getFullYear() === year
    }).length

    monthlyData.push({
      label: months[monthIndex],
      value: count
    })
  }

  return monthlyData
}

// Calculate activity trend percentage
function getActivityTrend(monthlyData: { value: number }[]): { value: number; positive: boolean } {
  if (monthlyData.length < 2) return { value: 0, positive: true }

  const recent = monthlyData.slice(-2).reduce((sum, m) => sum + m.value, 0)
  const previous = monthlyData.slice(0, -2).reduce((sum, m) => sum + m.value, 0)

  if (previous === 0) return { value: recent > 0 ? 100 : 0, positive: true }

  const change = Math.round(((recent - previous) / previous) * 100)
  return { value: Math.abs(change), positive: change >= 0 }
}

// Animated Counter Component
function AnimatedCounter({ value, suffix = '', prefix = '' }: {
  value: number
  suffix?: string
  prefix?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, prefix, suffix])

  return <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{displayValue}</span>
}

// Transaction Item Component
function TransactionItem({
  type,
  title,
  amount,
  date,
  delay
}: {
  type: 'income' | 'expense' | 'bonus'
  title: string
  amount: number
  date: string
  delay: number
}) {
  const config = {
    income: { icon: ArrowDownLeft, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', prefix: '+' },
    expense: { icon: ArrowUpRight, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', prefix: '-' },
    bonus: { icon: Gift, color: '#d4af37', bg: 'rgba(212, 175, 55, 0.1)', prefix: '+' },
  }

  const { icon: Icon, color, bg, prefix } = config[type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: '#71717a' }}>
          {date}
        </div>
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: color,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {prefix}{amount.toLocaleString('ru-RU')} ₽
      </div>
    </motion.div>
  )
}

// Achievement Badge Component
function AchievementBadge({ emoji, title, unlocked, description }: {
  emoji: string
  title: string
  unlocked: boolean
  description: string
}) {
  return (
    <motion.div
      whileHover={unlocked ? { scale: 1.05 } : undefined}
      style={{
        background: unlocked
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))'
          : 'rgba(20, 20, 23, 0.5)',
        border: unlocked
          ? '1px solid rgba(212, 175, 55, 0.3)'
          : '1px solid rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 12,
        textAlign: 'center',
        opacity: unlocked ? 1 : 0.5,
        filter: unlocked ? 'none' : 'grayscale(1)',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{
        fontSize: 28,
        marginBottom: 6,
        filter: unlocked ? 'none' : 'grayscale(1)',
      }}>
        {emoji}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: unlocked ? '#d4af37' : '#71717a',
        marginBottom: 2,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 9,
        color: '#52525b',
      }}>
        {description}
      </div>
    </motion.div>
  )
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, suffix = '', color, delay, large }: {
  icon: typeof FileText
  label: string
  value: number | string
  suffix?: string
  color: string
  delay: number
  large?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(20, 20, 23, 0.7)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 18,
        padding: 18,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{
        fontSize: large ? 28 : 22,
        fontWeight: 800,
        fontFamily: "'Montserrat', sans-serif",
        color: '#f2f2f2',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} suffix={suffix} />
        ) : value}
      </div>
      <div style={{
        fontSize: 10,
        color: '#71717a',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </div>
    </motion.div>
  )
}

export function ProfilePage({ user }: Props) {
  const { haptic, hapticSuccess, openSupport } = useTelegram()
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats')

  if (!user) return null

  // Premium rank name
  const premiumRankName = PREMIUM_RANK_NAMES[user.rank.name] || user.rank.name

  // Premium loyalty name (map old names to new)
  const loyaltyMapping = PREMIUM_LOYALTY_NAMES[user.loyalty.status]
  const premiumLoyaltyName = loyaltyMapping?.name || user.loyalty.status
  const premiumLoyaltyEmoji = loyaltyMapping?.emoji || user.loyalty.emoji

  // Real activity data from orders
  const monthlyActivity = getMonthlyActivity(user.orders)
  const activityTrend = getActivityTrend(monthlyActivity)

  // Calculate stats
  const moneySaved = Math.round(user.total_spent * (user.discount / 100))
  const completedOrders = user.orders.filter(o => o.status === 'completed').length
  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  // Member since
  const memberSince = user.orders.length > 0
    ? new Date(user.orders[user.orders.length - 1].created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  // Generate mock transaction history based on orders
  const transactions = user.orders.slice(0, 5).map((order, i) => ({
    type: order.status === 'completed' ? 'expense' as const : 'expense' as const,
    title: order.subject || `Заказ #${order.id}`,
    amount: order.price || Math.floor(Math.random() * 5000) + 1000,
    date: new Date(order.created_at).toLocaleDateString('ru-RU'),
  }))

  // Add bonus transactions
  if (user.bonus_balance > 0) {
    transactions.unshift({
      type: 'bonus' as const,
      title: 'Реферальный бонус',
      amount: user.bonus_balance,
      date: 'Накоплено',
    })
  }

  const copyInviteLink = () => {
    const inviteLink = `https://t.me/AcademicSaloonBot?start=ref_${user.telegram_id}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSupportClick = () => {
    haptic('medium')
    openSupport()
  }

  return (
    <div style={{
      padding: '20px 16px 110px 16px',
      minHeight: '100vh',
      background: '#0a0a0c',
    }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Shield size={20} color="#d4af37" />
        </div>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Личный Кабинет
          </h1>
          <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>
            Агент с {memberSince}
          </p>
        </div>
      </motion.div>

      {/* Profile Card with Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(20,20,23,0.95) 40%)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 24,
          padding: 24,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated glow */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
          {/* Spinning Gold Ring Avatar */}
          <div style={{ position: 'relative' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #d4af37, #f5d061, #d4af37, #b38728, #d4af37)',
                padding: 2,
              }}
            />
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              position: 'relative',
              zIndex: 1,
              border: '3px solid #09090b',
            }}>
              {user.rank.emoji}
            </div>
          </div>

          {/* Name & Status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.fullname}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 600,
                color: '#d4af37',
              }}>
                <Award size={10} />
                {premiumRankName}
              </span>
              <span style={{ fontSize: 10, color: '#71717a' }}>
                Уровень {user.loyalty.level}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 20,
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#22c55e',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {Math.round(user.balance)}
            </div>
            <div style={{ fontSize: 10, color: '#71717a' }}>Кешбэк ₽</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#d4af37',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {user.discount}%
            </div>
            <div style={{ fontSize: 10, color: '#71717a' }}>Скидка</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#3b82f6',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {user.orders_count}
            </div>
            <div style={{ fontSize: 10, color: '#71717a' }}>Заказов</div>
          </div>
        </div>
      </motion.div>

      {/* Referral Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(20,20,23,0.95) 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}>
          <Users size={18} color="#d4af37" />
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Реферальная программа
          </span>
          <div style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 600,
            color: '#22c55e',
          }}>
            +5% с заказов
          </div>
        </div>

        {/* Referral Stats */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          padding: '14px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 12,
          border: '1px solid rgba(212,175,55,0.15)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#71717a', marginBottom: 4 }}>Приглашённых</div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#d4af37',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              0
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(212,175,55,0.2)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#71717a', marginBottom: 4 }}>Заработано</div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#22c55e',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {user.bonus_balance} ₽
            </div>
          </div>
        </div>

        {/* Invite Link Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyInviteLink}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: copied
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(255,255,255,0.05)',
              border: copied
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: copied ? '#22c55e' : '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowQR(true)}
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #d4af37, #b38728)',
              border: 'none',
              borderRadius: 12,
              color: '#09090b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(212,175,55,0.3)',
            }}
          >
            <QrCode size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          padding: 4,
          background: 'rgba(20, 20, 23, 0.7)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {[
          { id: 'stats', label: 'Статистика', icon: TrendingUp },
          { id: 'history', label: 'История', icon: Clock },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic('light')
              setActiveTab(tab.id as 'stats' | 'history')
            }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                : 'transparent',
              border: activeTab === tab.id
                ? '1px solid rgba(212,175,55,0.3)'
                : '1px solid transparent',
              borderRadius: 10,
              color: activeTab === tab.id ? '#d4af37' : '#71717a',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'stats' ? (
          <motion.div
            key="stats"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}>
              <StatCard
                icon={FileText}
                label="Всего заказов"
                value={user.orders_count}
                color="#3b82f6"
                delay={0.35}
              />
              <StatCard
                icon={Wallet}
                label="Сэкономлено"
                value={moneySaved}
                suffix=" ₽"
                color="#22c55e"
                delay={0.4}
              />
            </div>

            {/* Activity Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
                backdropFilter: 'blur(40px)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={16} color="#d4af37" />
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                  }}>
                    Активность
                  </span>
                </div>
                {monthlyActivity.some(m => m.value > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Sparkline
                      data={monthlyActivity.map(m => m.value)}
                      color={activityTrend.positive ? '#22c55e' : '#ef4444'}
                      width={50}
                      height={16}
                    />
                    <span style={{
                      fontSize: 10,
                      color: activityTrend.positive ? '#22c55e' : '#ef4444'
                    }}>
                      {activityTrend.positive ? '+' : '-'}{activityTrend.value}%
                    </span>
                  </div>
                )}
              </div>
              <AnimatedBarChart
                data={monthlyActivity}
                height={100}
              />
            </motion.div>

            {/* Progress to Next Level */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
                backdropFilter: 'blur(40px)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14,
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {premiumLoyaltyEmoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    fontFamily: "'Montserrat', sans-serif"
                  }}>
                    {premiumLoyaltyName}
                  </div>
                  {user.loyalty.orders_to_next > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: '#71717a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Sparkles size={10} color="#d4af37" />
                      До повышения: {user.loyalty.orders_to_next} заказов
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 18,
                    color: '#d4af37',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    +{user.loyalty.discount}%
                  </span>
                  <div style={{ fontSize: 9, color: '#71717a' }}>скидка</div>
                </div>
              </div>

              {/* Progress Bar */}
              {user.loyalty.orders_to_next > 0 && (
                <div style={{
                  height: 6,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 100,
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(10, 100 - (user.loyalty.orders_to_next * 10))}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                      borderRadius: 100,
                      boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
                    }}
                  />
                </div>
              )}
            </motion.div>

            {/* Lifetime Investment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{
                    fontSize: 10,
                    color: '#71717a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    marginBottom: 4,
                  }}>
                    Всего инвестировано
                  </div>
                  <div style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <AnimatedCounter value={user.total_spent} suffix=" ₽" />
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
                  borderRadius: 12,
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  textAlign: 'center',
                }}>
                  <span style={{
                    fontSize: 14,
                    color: '#22c55e',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    -{moneySaved.toLocaleString('ru-RU')} ₽
                  </span>
                  <div style={{ fontSize: 9, color: '#71717a', marginTop: 2 }}>
                    сэкономлено
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Orders Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {[
                { label: 'Активных', value: activeOrders, color: '#f59e0b' },
                { label: 'Завершено', value: completedOrders, color: '#22c55e' },
                { label: 'Всего', value: user.orders_count, color: '#3b82f6' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    background: 'rgba(20, 20, 23, 0.7)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 14,
                    padding: '14px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: stat.color,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 4,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: '#71717a' }}>{stat.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Achievements Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: 18,
                marginTop: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
              }}>
                <Award size={18} color="#d4af37" />
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  Достижения
                </span>
                <div style={{
                  marginLeft: 'auto',
                  padding: '4px 8px',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#d4af37',
                }}>
                  {[
                    user.orders_count >= 1,
                    user.orders_count >= 5,
                    user.orders_count >= 10,
                    user.total_spent >= 50000,
                    user.total_spent >= 100000,
                    completedOrders >= 3,
                  ].filter(Boolean).length}/6
                </div>
              </div>

              {/* Achievement Badges */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}>
                {/* First Order */}
                <AchievementBadge
                  emoji="🎉"
                  title="Первый заказ"
                  unlocked={user.orders_count >= 1}
                  description="Сделать первый заказ"
                />
                {/* 5 Orders */}
                <AchievementBadge
                  emoji="🔥"
                  title="В ударе"
                  unlocked={user.orders_count >= 5}
                  description="5+ заказов"
                />
                {/* 10 Orders */}
                <AchievementBadge
                  emoji="⚡"
                  title="Постоянный"
                  unlocked={user.orders_count >= 10}
                  description="10+ заказов"
                />
                {/* 50k Spent */}
                <AchievementBadge
                  emoji="💎"
                  title="Инвестор"
                  unlocked={user.total_spent >= 50000}
                  description="50 000₽ потрачено"
                />
                {/* 100k Spent */}
                <AchievementBadge
                  emoji="👑"
                  title="VIP Клиент"
                  unlocked={user.total_spent >= 100000}
                  description="100 000₽ потрачено"
                />
                {/* 3 Completed */}
                <AchievementBadge
                  emoji="✅"
                  title="Надёжный"
                  unlocked={completedOrders >= 3}
                  description="3+ завершённых"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Transaction History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: '16px 18px',
                backdropFilter: 'blur(40px)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  Последние операции
                </span>
                <span style={{ fontSize: 11, color: '#71717a' }}>
                  {transactions.length} записей
                </span>
              </div>

              {transactions.length > 0 ? (
                <div>
                  {transactions.map((tx, i) => (
                    <TransactionItem
                      key={i}
                      type={tx.type}
                      title={tx.title}
                      amount={tx.amount}
                      date={tx.date}
                      delay={0.1 + i * 0.05}
                    />
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                }}>
                  <Clock size={40} color="#52525b" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, color: '#71717a' }}>
                    История пуста
                  </div>
                  <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
                    Здесь появятся ваши операции
                  </div>
                </div>
              )}
            </motion.div>

            {/* Order History Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'rgba(20, 20, 23, 0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 18,
                padding: 18,
                marginTop: 16,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                  border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Star size={24} color="#d4af37" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: 4,
                  }}>
                    Ваш рейтинг
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a' }}>
                    {completedOrders} успешных заказов
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: 2,
                }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      fill={star <= Math.min(5, Math.ceil(completedOrders / 2)) ? '#d4af37' : 'transparent'}
                      color={star <= Math.min(5, Math.ceil(completedOrders / 2)) ? '#d4af37' : '#52525b'}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSupportClick}
        style={{
          width: '100%',
          padding: '16px',
          marginTop: 20,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 16,
          color: '#d4af37',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <MessageCircle size={18} />
        Связаться с поддержкой
        <ChevronRight size={16} />
      </motion.button>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <QRCodeModal
            value={`ref_${user.telegram_id}`}
            onClose={() => setShowQR(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
