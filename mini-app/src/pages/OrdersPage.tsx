import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import {
  FileStack, Search, SlidersHorizontal, Plus, ChevronRight,
  Clock, CheckCircle, XCircle, CreditCard, Loader, AlertCircle,
  TrendingUp, Calendar, MessageCircle, Sparkles, Filter,
  ArrowUpDown, X, Bell, Zap, RefreshCw, Copy, Trash2,
  GraduationCap, FileText, BookOpen, Briefcase, PenTool,
  ClipboardCheck, Presentation, Scroll, Camera, ChevronDown,
  Star, Crown, Gem, Award, Wallet,
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS PAGE V3 — Ultimate Premium Redesign
//  Features: Swipe Actions, Timeline, Quick Pay, Grouping, Enhanced Cards
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
}

type FilterType = 'all' | 'active' | 'completed' | 'attention'
type SortOption = 'date' | 'price' | 'status'

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Safe date parser - fixes NaN bug
function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null
  return date
}

// Calculate days until deadline safely
function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

// Format month for grouping
function getMonthKey(dateString: string): string {
  const date = parseDateSafe(dateString)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey: string): string {
  if (monthKey === 'unknown') return 'Без даты'
  const [year, month] = monthKey.split('-').map(Number)
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]
  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  return isCurrentYear ? months[month - 1] : `${months[month - 1]} ${year}`
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const WORK_TYPE_ICONS: Record<string, typeof FileText> = {
  masters: GraduationCap,
  diploma: GraduationCap,
  coursework: BookOpen,
  practice: Briefcase,
  essay: PenTool,
  presentation: Presentation,
  control: ClipboardCheck,
  independent: Scroll,
  report: FileText,
  photo_task: Camera,
  other: Sparkles,
}

const WORK_TYPE_COLORS: Record<string, string> = {
  masters: '#d4af37',      // Gold
  diploma: '#c9a227',      // Deep gold
  coursework: '#e6c453',   // Light gold
  practice: '#b8972b',     // Bronze gold
  essay: '#d4af37',        // Gold
  presentation: '#e6c453', // Light gold
  control: '#c9a227',      // Deep gold
  independent: '#b8972b',  // Bronze gold
  report: '#a08020',       // Muted gold
  photo_task: '#e6c453',   // Light gold
  other: '#d4af37',        // Gold
}

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  priority: number
  needsAttention: boolean
  step: number // For timeline: 0-4
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#d4af37', bgColor: 'rgba(212,175,55,0.12)', icon: Clock, priority: 2, needsAttention: false, step: 0 },
  waiting_estimation: { label: 'На оценке', color: '#d4af37', bgColor: 'rgba(212,175,55,0.12)', icon: Clock, priority: 2, needsAttention: false, step: 0 },
  confirmed: { label: 'К оплате', color: '#e6c453', bgColor: 'rgba(230,196,83,0.12)', icon: CreditCard, priority: 1, needsAttention: true, step: 1 },
  waiting_payment: { label: 'К оплате', color: '#e6c453', bgColor: 'rgba(230,196,83,0.12)', icon: CreditCard, priority: 1, needsAttention: true, step: 1 },
  verification_pending: { label: 'Проверка оплаты', color: '#c9a227', bgColor: 'rgba(201,162,39,0.12)', icon: Loader, priority: 3, needsAttention: false, step: 2 },
  paid: { label: 'В работе', color: '#b8972b', bgColor: 'rgba(184,151,43,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2 },
  paid_full: { label: 'В работе', color: '#b8972b', bgColor: 'rgba(184,151,43,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2 },
  in_progress: { label: 'В работе', color: '#b8972b', bgColor: 'rgba(184,151,43,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2 },
  review: { label: 'Готов', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)', icon: CheckCircle, priority: 5, needsAttention: true, step: 3 },
  revision: { label: 'На правках', color: '#d4af37', bgColor: 'rgba(212,175,55,0.12)', icon: AlertCircle, priority: 3, needsAttention: true, step: 2 },
  completed: { label: 'Завершён', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)', icon: CheckCircle, priority: 6, needsAttention: false, step: 4 },
  cancelled: { label: 'Отменён', color: '#71717a', bgColor: 'rgba(113,113,122,0.12)', icon: XCircle, priority: 7, needsAttention: false, step: -1 },
  rejected: { label: 'Отклонён', color: '#71717a', bgColor: 'rgba(113,113,122,0.12)', icon: XCircle, priority: 7, needsAttention: false, step: -1 },
}

// Timeline steps
const TIMELINE_STEPS = ['Создан', 'Оценён', 'В работе', 'Готов', 'Завершён']

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM VISUAL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Orbiting sparkles for premium icons
function OrbitingSparkles({ color = '#D4AF37', count = 6, size = 100 }: { color?: string; count?: number; size?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{
            duration: 10 + i * 0.8,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.4,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size,
            height: size,
            marginTop: -size / 2,
            marginLeft: -size / 2,
          }}
        >
          <motion.div
            animate={{
              opacity: [0.2, 0.7, 0.2],
              scale: [0.6, 1.1, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 3 + (i % 2),
              height: 3 + (i % 2),
              marginLeft: -1.5,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${6 + i * 2}px ${color}`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// Premium floating particles
function FloatingParticles({ color = '#D4AF37', count = 8 }: { color?: string; count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${10 + (i * 12) % 80}%`,
    top: `${15 + (i * 17) % 70}%`,
    size: 2 + (i % 3),
    delay: i * 0.5,
    duration: 5 + (i % 3),
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.5, 0.3, 0.5, 0],
            y: [0, -20, -10, -30, -50],
            x: [0, 8, -4, 12, 0],
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
            background: color,
            boxShadow: `0 0 ${p.size * 3}px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

// Premium decorative corner
function DecorativeCorner({ position, color = '#D4AF37' }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; color?: string }) {
  const posStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 6, left: 6, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'top-right': { top: 6, right: 6, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    'bottom-left': { bottom: 6, left: 6, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'bottom-right': { bottom: 6, right: 6, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.5, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      style={{
        position: 'absolute',
        width: 16,
        height: 16,
        pointerEvents: 'none',
        ...posStyles[position],
      }}
    />
  )
}

// Premium Hero Icon with glow and animation
function PremiumHeroIcon({ icon: Icon, size = 64 }: { icon: typeof Star; size?: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Outer glow ring */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 30px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.1)',
            '0 0 50px rgba(212,175,55,0.4), inset 0 0 30px rgba(212,175,55,0.15)',
            '0 0 30px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.1)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
          border: '2px solid rgba(212,175,55,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size * 0.45} color="#D4AF37" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
      <OrbitingSparkles size={size + 30} count={6} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v: number) => `${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v: string) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING
// ═══════════════════════════════════════════════════════════════════════════

function ProgressRing({ progress, size = 44, strokeWidth = 3, color = '#d4af37' }: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
      />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINI TIMELINE — Gold themed, compact
// ═══════════════════════════════════════════════════════════════════════════

function MiniTimeline({ currentStep }: { currentStep: number }) {
  if (currentStep < 0) return null // Cancelled/rejected orders

  const goldColor = '#d4af37'
  const goldDim = 'rgba(212, 175, 55, 0.3)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '6px 0',
    }}>
      {TIMELINE_STEPS.map((_, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
          {/* Dot */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            style={{
              width: index <= currentStep ? 8 : 6,
              height: index <= currentStep ? 8 : 6,
              borderRadius: '50%',
              background: index <= currentStep ? goldColor : goldDim,
              boxShadow: index === currentStep ? `0 0 8px ${goldColor}` : 'none',
              transition: 'all 0.3s ease',
            }}
          />
          {/* Line */}
          {index < TIMELINE_STEPS.length - 1 && (
            <div style={{
              width: 12,
              height: 2,
              background: index < currentStep ? goldColor : goldDim,
              borderRadius: 1,
              marginLeft: 2,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK PAY BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function QuickPayButton({
  orders,
  onPay
}: {
  orders: Order[]
  onPay: () => void
}) {
  const { haptic } = useTelegram()
  const totalAmount = orders.reduce((sum, o) => sum + (o.final_price || o.price || 0), 0)
  const ordersWithPromo = orders.filter(o => o.promo_code && o.promo_discount && o.promo_discount > 0)
  const totalSavings = orders.reduce((sum, o) => {
    if (o.promo_code && o.promo_discount && o.price) {
      return sum + (o.price - (o.final_price || o.price))
    }
    return sum
  }, 0)

  if (orders.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0 20px', marginBottom: 20 }}
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          haptic('medium')
          onPay()
        }}
        style={{
          width: '100%',
          padding: '16px 20px',
          borderRadius: 16,
          border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shine effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)',
          borderRadius: '16px 16px 0 0',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 1 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Zap size={20} color="#fff" fill="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              Оплатить всё
              {ordersWithPromo.length > 0 && (
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  background: 'rgba(34,197,94,0.3)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  borderRadius: 4,
                  color: '#86efac',
                }}>
                  🎟️ {ordersWithPromo.length}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
            }}>
              {orders.length} {orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'}
              {totalSavings > 0 && (
                <span style={{ color: '#86efac', marginLeft: 6 }}>
                  (экономия {totalSavings.toLocaleString('ru-RU')} ₽)
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: totalSavings > 0 ? '#86efac' : '#fff',
          fontFamily: 'var(--font-mono)',
          zIndex: 1,
        }}>
          {totalAmount.toLocaleString('ru-RU')} ₽
        </div>
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MONTH HEADER
// ═══════════════════════════════════════════════════════════════════════════

function MonthHeader({ monthKey, count }: { monthKey: string; count: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 0 12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Calendar size={14} color="var(--gold-400)" />
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-main)',
        }}>
          {getMonthLabel(monthKey)}
        </span>
      </div>
      <div style={{
        flex: 1,
        height: 1,
        background: 'var(--border-subtle)',
      }} />
      <span style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        {count}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM STAT CARD
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  onClick,
  isActive,
}: {
  icon: typeof Clock
  value: number
  label: string
  color: string
  onClick?: () => void
  isActive?: boolean
}) {
  const { ref, handlers } = usePremiumGesture<HTMLDivElement>({
    onTap: onClick,
    scale: 0.95,
    hapticType: 'light',
  })

  return (
    <motion.div
      ref={ref}
      {...handlers}
      whileHover={{ y: -3, scale: 1.02 }}
      animate={isActive ? {
        boxShadow: [
          `0 4px 20px ${color}20, 0 0 0 1px ${color}30`,
          `0 8px 30px ${color}35, 0 0 0 1px ${color}50`,
          `0 4px 20px ${color}20, 0 0 0 1px ${color}30`,
        ],
      } : {}}
      transition={isActive ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      style={{
        flex: 1,
        padding: '16px 14px',
        borderRadius: 18,
        background: isActive
          ? `linear-gradient(145deg, ${color}18, ${color}08, ${color}12)`
          : 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
        border: `1px solid ${isActive ? color + '50' : 'rgba(255,255,255,0.08)'}`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Holographic overlay */}
      {isActive && (
        <motion.div
          animate={{
            background: [
              `linear-gradient(45deg, ${color}10 0%, transparent 50%, ${color}08 100%)`,
              `linear-gradient(135deg, ${color}15 0%, transparent 50%, ${color}10 100%)`,
              `linear-gradient(225deg, ${color}08 0%, transparent 50%, ${color}12 100%)`,
              `linear-gradient(315deg, ${color}10 0%, transparent 50%, ${color}08 100%)`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0 }}
        />
      )}

      {/* Radial glow */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: 60,
          background: `radial-gradient(ellipse at center, ${color}25, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Shimmer effect */}
      <motion.div
        animate={{ x: ['-150%', '250%'] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${isActive ? color + '15' : 'rgba(255,255,255,0.05)'}, transparent)`,
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon with glow */}
        <motion.div
          animate={isActive && value > 0 ? {
            scale: [1, 1.1, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: isActive
              ? `linear-gradient(135deg, ${color}30, ${color}15)`
              : `rgba(255,255,255,0.06)`,
            border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: isActive ? `0 4px 16px ${color}30` : 'none',
          }}
        >
          <Icon size={18} color={isActive ? color : 'rgba(255,255,255,0.5)'} strokeWidth={isActive ? 2 : 1.5} />
        </motion.div>

        {/* Value with glow text */}
        <motion.div
          animate={isActive ? {
            textShadow: [
              `0 0 10px ${color}40`,
              `0 0 20px ${color}60`,
              `0 0 10px ${color}40`,
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: isActive ? color : 'rgba(255,255,255,0.9)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          <AnimatedCounter value={value} />
        </motion.div>

        {/* Label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: isActive ? `${color}cc` : 'rgba(255,255,255,0.45)',
          letterSpacing: '0.03em',
        }}>
          {label}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTENTION CARD (Compact)
// ═══════════════════════════════════════════════════════════════════════════

function AttentionCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        cursor: 'pointer',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: statusConfig.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <StatusIcon size={18} color={statusConfig.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {order.work_type_label} #{order.id}
        </div>
        <div style={{
          fontSize: 12,
          color: statusConfig.color,
          fontWeight: 500,
        }}>
          {statusConfig.label}
        </div>
      </div>
      <ChevronRight size={18} color="var(--text-muted)" />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SWIPEABLE ORDER CARD
// ═══════════════════════════════════════════════════════════════════════════

function SwipeableOrderCard({ order, index, showTimeline = true }: {
  order: Order
  index: number
  showTimeline?: boolean
}) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const workTypeColor = WORK_TYPE_COLORS[order.work_type] || '#d4af37'

  // Use safe date parsing - fixes NaN bug
  const daysUntilDeadline = getDaysUntilDeadline(order.deadline)

  const progress = (order as any).progress || 0
  const isInProgress = ['paid', 'paid_full', 'in_progress'].includes(order.status)
  const isCompleted = order.status === 'completed'
  const needsPayment = ['confirmed', 'waiting_payment'].includes(order.status)

  const SWIPE_THRESHOLD = 80

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      setIsRevealed(true)
      setSwipeOffset(info.offset.x > 0 ? SWIPE_THRESHOLD : -SWIPE_THRESHOLD)
      haptic('light')
    } else {
      setIsRevealed(false)
      setSwipeOffset(0)
    }
  }

  const handleAction = (action: 'pay' | 'chat' | 'copy') => {
    haptic('medium')
    setIsRevealed(false)
    setSwipeOffset(0)

    if (action === 'pay') {
      navigate(`/order/${order.id}?action=pay`)
    } else if (action === 'chat') {
      navigate(`/order/${order.id}?tab=chat`)
    } else if (action === 'copy') {
      // Copy order ID
      navigator.clipboard?.writeText(`#${order.id}`)
    }
  }

  const handleCardClick = () => {
    if (!isRevealed) {
      navigate(`/order/${order.id}`)
    } else {
      setIsRevealed(false)
      setSwipeOffset(0)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
      }}
    >
      {/* Swipe Actions Background - Left (Chat) */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SWIPE_THRESHOLD,
        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '20px 0 0 20px',
      }}>
        <motion.div
          animate={{ scale: isRevealed && swipeOffset > 0 ? 1.1 : 1 }}
          onClick={() => handleAction('chat')}
          style={{ cursor: 'pointer' }}
        >
          <MessageCircle size={24} color="#fff" />
        </motion.div>
      </div>

      {/* Swipe Actions Background - Right (Pay/Copy) */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: SWIPE_THRESHOLD,
        background: needsPayment
          ? 'linear-gradient(270deg, #8b5cf6, #7c3aed)'
          : 'linear-gradient(270deg, #6366f1, #4f46e5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0 20px 20px 0',
      }}>
        <motion.div
          animate={{ scale: isRevealed && swipeOffset < 0 ? 1.1 : 1 }}
          onClick={() => handleAction(needsPayment ? 'pay' : 'copy')}
          style={{ cursor: 'pointer' }}
        >
          {needsPayment ? (
            <CreditCard size={24} color="#fff" />
          ) : (
            <Copy size={24} color="#fff" />
          )}
        </motion.div>
      </div>

      {/* Main Card - Draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_THRESHOLD, right: SWIPE_THRESHOLD }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        onClick={handleCardClick}
        style={{
          position: 'relative',
          padding: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          cursor: 'pointer',
          touchAction: 'pan-y',
        }}
      >
        {/* Left accent bar */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 14,
          bottom: 14,
          width: 3,
          borderRadius: '0 3px 3px 0',
          background: `linear-gradient(180deg, ${workTypeColor}, ${workTypeColor}80)`,
          boxShadow: `0 0 12px ${workTypeColor}50`,
        }} />

        {/* Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingLeft: 10,
        }}>
          {/* Left: Icon + Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {/* Work Type Icon with Progress Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {isInProgress && progress > 0 ? (
                <div style={{ position: 'relative' }}>
                  <ProgressRing progress={progress} size={44} strokeWidth={3} color={workTypeColor} />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <WorkIcon size={18} color={workTypeColor} strokeWidth={1.5} />
                  </div>
                </div>
              ) : (
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${workTypeColor}20, ${workTypeColor}08)`,
                  border: `1px solid ${workTypeColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <WorkIcon size={20} color={workTypeColor} strokeWidth={1.5} />
                </div>
              )}
              {isInProgress && progress > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: -3,
                  right: -3,
                  background: workTypeColor,
                  color: '#000',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {progress}%
                </div>
              )}
            </div>

            {/* Title + Subject */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                marginBottom: 2,
              }}>
                {order.work_type_label}
              </h3>
              <p style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {order.subject || order.topic || 'Без темы'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            background: statusConfig.bgColor,
            borderRadius: 16,
            flexShrink: 0,
          }}>
            <div style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: statusConfig.color,
              boxShadow: `0 0 6px ${statusConfig.color}`,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: statusConfig.color,
            }}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Mini Timeline */}
        {showTimeline && statusConfig.step >= 0 && (
          <div style={{ paddingLeft: 10, marginBottom: 6 }}>
            <MiniTimeline currentStep={statusConfig.step} />
          </div>
        )}

        {/* Footer Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          paddingLeft: 10,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {/* Left: ID + Deadline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              #{order.id}
            </span>

            {daysUntilDeadline !== null && !isCompleted && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 7px',
                background: daysUntilDeadline <= 3
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(255,255,255,0.04)',
                borderRadius: 6,
              }}>
                <Calendar size={10} color={daysUntilDeadline <= 3 ? '#ef4444' : 'var(--text-muted)'} />
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: daysUntilDeadline <= 3 ? '#ef4444' : 'var(--text-muted)',
                }}>
                  {daysUntilDeadline <= 0 ? 'Сегодня' : `${daysUntilDeadline} дн.`}
                </span>
              </div>
            )}
          </div>

          {/* Right: Price + Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Promo indicator */}
            {order.promo_code && order.promo_discount && order.promo_discount > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 6px',
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 6,
              }}>
                <span style={{ fontSize: 10 }}>🎟️</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#22c55e',
                  fontFamily: 'var(--font-mono)',
                }}>
                  −{order.promo_discount}%
                </span>
              </div>
            )}
            {/* Original price crossed out */}
            {order.promo_code && order.price && order.price !== order.final_price && (
              <span style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                textDecoration: 'line-through',
                fontFamily: 'var(--font-mono)',
              }}>
                {order.price.toLocaleString('ru-RU')}
              </span>
            )}
            {/* Final price - green if promo applied */}
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: order.promo_code && order.promo_discount
                ? '#22c55e'
                : needsPayment ? '#8b5cf6' : 'var(--gold-200)',
              fontFamily: 'var(--font-mono)',
            }}>
              {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
            </span>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILTER CHIP
// ═══════════════════════════════════════════════════════════════════════════

function FilterChip({
  label,
  isActive,
  onClick,
  count,
  icon: Icon,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  count?: number
  icon?: typeof Clock
}) {
  const { ref, handlers } = usePremiumGesture<HTMLButtonElement>({
    onTap: onClick,
    scale: 0.95,
    hapticType: 'light',
  })

  return (
    <button
      ref={ref}
      {...handlers}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 12,
        border: 'none',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: isActive
          ? 'var(--gold-metallic)'
          : 'transparent',
        color: isActive
          ? 'var(--bg-void)'
          : 'var(--text-muted)',
        boxShadow: isActive
          ? 'var(--glow-gold)'
          : 'none',
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  FAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function FABButton({ onClick }: { onClick: () => void }) {
  const { ref, handlers } = usePremiumGesture<HTMLButtonElement>({
    onTap: onClick,
    scale: 0.9,
    hapticType: 'medium',
  })

  return (
    <motion.button
      ref={ref}
      {...handlers}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.05 }}
      style={{
        position: 'fixed',
        bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 16,
        border: 'none',
        background: 'var(--liquid-gold)',
        boxShadow: '0 8px 24px rgba(212,175,55,0.4), 0 0 40px rgba(212,175,55,0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <Plus size={24} color="#0a0a0c" strokeWidth={2.5} />
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { title: string; subtitle: string }> = {
    all: { title: 'Нет заказов', subtitle: 'Создайте первый заказ, нажав +' },
    active: { title: 'Нет активных', subtitle: 'Все заказы завершены' },
    completed: { title: 'Нет завершённых', subtitle: 'Завершённые заказы появятся здесь' },
    attention: { title: 'Всё в порядке!', subtitle: 'Нет заказов, требующих внимания' },
  }

  const msg = messages[filter]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'var(--bg-card)',
        borderRadius: 24,
        border: '1px solid var(--border-default)',
      }}
    >
      <div style={{
        width: 72,
        height: 72,
        margin: '0 auto 20px',
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
        border: '1px solid var(--border-gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <FileStack size={32} color="var(--gold-400)" strokeWidth={1.5} />
      </div>
      <h3 style={{
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: 8,
      }}>
        {msg.title}
      </h3>
      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
      }}>
        {msg.subtitle}
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [groupByMonth, setGroupByMonth] = useState(true)

  // Calculate stats
  const stats = useMemo(() => {
    const active = orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    const needsPayment = orders.filter(o => ['confirmed', 'waiting_payment'].includes(o.status))
    const inProgress = orders.filter(o => ['paid', 'paid_full', 'in_progress'].includes(o.status))
    const completed = orders.filter(o => o.status === 'completed')
    const attention = orders.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    const totalSpent = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.final_price || o.price || 0), 0)

    return { active, needsPayment, inProgress, completed, attention, totalSpent }
  }, [orders])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply filter
    if (filter === 'active') {
      result = result.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    } else if (filter === 'completed') {
      result = result.filter(o => o.status === 'completed')
    } else if (filter === 'attention') {
      result = result.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.subject?.toLowerCase().includes(query) ||
        o.topic?.toLowerCase().includes(query) ||
        o.work_type_label?.toLowerCase().includes(query) ||
        o.id.toString().includes(query)
      )
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'price') {
        return (b.final_price || b.price || 0) - (a.final_price || a.price || 0)
      } else if (sortBy === 'status') {
        const priorityA = STATUS_CONFIG[a.status]?.priority || 99
        const priorityB = STATUS_CONFIG[b.status]?.priority || 99
        return priorityA - priorityB
      }
      return 0
    })

    return result
  }, [orders, filter, searchQuery, sortBy])

  // Group orders by month
  const groupedOrders = useMemo(() => {
    if (!groupByMonth || filter !== 'all') return null

    const groups: Record<string, Order[]> = {}
    filteredOrders.forEach(order => {
      const key = getMonthKey(order.created_at)
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    })

    // Sort months descending (newest first)
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredOrders, groupByMonth, filter])

  const handleFilterChange = (newFilter: FilterType) => {
    haptic('light')
    setFilter(newFilter)
  }

  const handleQuickPay = () => {
    // Navigate to batch payment page with all unpaid order IDs
    if (stats.needsPayment.length > 0) {
      const orderIds = stats.needsPayment.map(o => o.id).join(',')
      navigate(`/batch-payment?orders=${orderIds}`)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      paddingBottom: 160,
    }}>
      {/* ═══════════════════════════════════════════════════════════════════════
          ULTRA-PREMIUM HERO HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        padding: '28px 20px 24px',
        background: `
          linear-gradient(180deg,
            rgba(212,175,55,0.08) 0%,
            rgba(212,175,55,0.03) 50%,
            transparent 100%
          )
        `,
        overflow: 'hidden',
      }}>
        {/* Floating particles background */}
        <FloatingParticles color="#D4AF37" count={10} />

        {/* Premium decorative gradients */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 250,
          background: `
            radial-gradient(ellipse 100% 60% at 50% -10%, rgba(212,175,55,0.12), transparent),
            radial-gradient(ellipse 60% 40% at 20% 30%, rgba(212,175,55,0.06), transparent),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(212,175,55,0.05), transparent)
          `,
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Premium Title Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Premium Icon with sparkles */}
              <div style={{ position: 'relative' }}>
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(212,175,55,0.2), inset 0 0 15px rgba(212,175,55,0.08)',
                      '0 0 35px rgba(212,175,55,0.35), inset 0 0 20px rgba(212,175,55,0.12)',
                      '0 0 20px rgba(212,175,55,0.2), inset 0 0 15px rgba(212,175,55,0.08)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
                    border: '2px solid rgba(212,175,55,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Inner shine */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '50%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
                      transform: 'skewX(-20deg)',
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <FileStack size={26} color="#D4AF37" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>
                <OrbitingSparkles size={80} count={5} />
              </div>

              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 30,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #D4AF37 90%, #FCF6BA 100%)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: 0,
                    animation: 'shimmer-text-orders 4s ease-in-out infinite',
                  }}
                >
                  Портфель
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                    margin: 0,
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{
                    color: '#D4AF37',
                    fontWeight: 600,
                    fontSize: 14,
                  }}>{orders.length}</span>
                  {orders.length === 1 ? 'проект' : orders.length < 5 ? 'проекта' : 'проектов'}
                </motion.p>
              </div>
            </div>

            {/* Premium Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  haptic('light')
                  setShowSearch(!showSearch)
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: showSearch ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                  background: showSearch
                    ? 'linear-gradient(135deg, #D4AF37, #B38728)'
                    : 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: showSearch ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
                }}
              >
                <Search size={18} color={showSearch ? '#0a0a0c' : 'rgba(255,255,255,0.6)'} strokeWidth={showSearch ? 2.5 : 1.5} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  haptic('light')
                  setShowSort(!showSort)
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: showSort ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.1)',
                  background: showSort
                    ? 'linear-gradient(135deg, #D4AF37, #B38728)'
                    : 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: showSort ? '0 4px 20px rgba(212,175,55,0.3)' : 'none',
                }}
              >
                <SlidersHorizontal size={18} color={showSort ? '#0a0a0c' : 'rgba(255,255,255,0.6)'} strokeWidth={showSort ? 2.5 : 1.5} />
              </motion.button>
            </div>
          </div>

          {/* Premium Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', damping: 20 }}
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon={Loader}
              value={stats.active.length}
              label="В работе"
              color="#3b82f6"
              onClick={() => handleFilterChange('active')}
              isActive={filter === 'active'}
            />
            <StatCard
              icon={Wallet}
              value={stats.needsPayment.length}
              label="К оплате"
              color="#8b5cf6"
              onClick={() => handleFilterChange('attention')}
              isActive={filter === 'attention'}
            />
            <StatCard
              icon={CheckCircle}
              value={stats.completed.length}
              label="Готово"
              color="#22c55e"
              onClick={() => handleFilterChange('completed')}
              isActive={filter === 'completed'}
            />
          </motion.div>

          {/* Premium Total Sum Card */}
          {stats.totalSpent > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                position: 'relative',
                padding: '16px 20px',
                background: `
                  linear-gradient(135deg,
                    rgba(212,175,55,0.12) 0%,
                    rgba(212,175,55,0.05) 50%,
                    rgba(212,175,55,0.08) 100%
                  )
                `,
                borderRadius: 18,
                border: '1px solid rgba(212,175,55,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              {/* Decorative corners */}
              <DecorativeCorner position="top-left" />
              <DecorativeCorner position="top-right" />
              <DecorativeCorner position="bottom-left" />
              <DecorativeCorner position="bottom-right" />

              {/* Shimmer */}
              <motion.div
                animate={{ x: ['-150%', '250%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '40%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  transform: 'skewX(-20deg)',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                    border: '1px solid rgba(212,175,55,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={18} color="#D4AF37" />
                </motion.div>
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    ОБЩИЙ ОБОРОТ
                  </span>
                </div>
              </div>
              <motion.span
                animate={{
                  textShadow: [
                    '0 0 10px rgba(212,175,55,0.3)',
                    '0 0 20px rgba(212,175,55,0.5)',
                    '0 0 10px rgba(212,175,55,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-mono)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <AnimatedCounter value={stats.totalSpent} suffix=" ₽" />
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* CSS Keyframes for shimmer */}
      <style>{`
        @keyframes shimmer-text-orders {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEARCH BAR (Expandable)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', padding: '0 20px' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-card)',
              borderRadius: 14,
              border: '1px solid var(--border-default)',
              marginBottom: 16,
            }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Поиск по теме, предмету..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              {searchQuery && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  <X size={14} color="var(--text-muted)" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          SORT OPTIONS (Expandable)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSort && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', padding: '0 20px' }}
          >
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}>
              {[
                { value: 'date' as SortOption, label: 'По дате', icon: Calendar },
                { value: 'price' as SortOption, label: 'По цене', icon: TrendingUp },
                { value: 'status' as SortOption, label: 'По статусу', icon: Filter },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    haptic('light')
                    setSortBy(option.value)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: `1px solid ${sortBy === option.value ? 'var(--border-gold)' : 'var(--border-default)'}`,
                    background: sortBy === option.value
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
                      : 'var(--bg-card)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: sortBy === option.value ? 'var(--gold-300)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <option.icon size={14} />
                  {option.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          ATTENTION SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      {stats.attention.length > 0 && filter === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ padding: '0 20px', marginBottom: 20 }}
        >
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
            borderRadius: 18,
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#8b5cf6" />
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}>
                  Требует внимания
                </span>
              </div>
              <span style={{
                background: 'rgba(139,92,246,0.2)',
                color: '#a78bfa',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 8,
              }}>
                {stats.attention.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.attention.slice(0, 3).map((order) => (
                <AttentionCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/order/${order.id}`)}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FILTERS
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: '0 20px',
          marginBottom: 20,
        }}
      >
        <div style={{
          display: 'flex',
          gap: 8,
          padding: 6,
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border-default)',
        }}>
          <FilterChip
            label="Все"
            isActive={filter === 'all'}
            onClick={() => handleFilterChange('all')}
            count={orders.length}
          />
          <FilterChip
            label="Активные"
            isActive={filter === 'active'}
            onClick={() => handleFilterChange('active')}
            count={stats.active.length}
          />
          <FilterChip
            label="Готовые"
            isActive={filter === 'completed'}
            onClick={() => handleFilterChange('completed')}
            count={stats.completed.length}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          QUICK PAY BUTTON
          ═══════════════════════════════════════════════════════════════════════ */}
      {stats.needsPayment.length > 1 && filter === 'all' && (
        <QuickPayButton orders={stats.needsPayment} onPay={handleQuickPay} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ORDERS LIST
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 20px' }}>
        {filteredOrders.length === 0 ? (
          <EmptyState filter={filter} />
        ) : groupedOrders ? (
          // Grouped by month view
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groupedOrders.map(([monthKey, monthOrders]) => (
              <div key={monthKey}>
                <MonthHeader monthKey={monthKey} count={monthOrders.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {monthOrders.map((order, index) => (
                    <SwipeableOrderCard
                      key={order.id}
                      order={order}
                      index={index}
                      showTimeline={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat list view
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredOrders.map((order, index) => (
              <SwipeableOrderCard
                key={order.id}
                order={order}
                index={index}
                showTimeline={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FAB BUTTON
          ═══════════════════════════════════════════════════════════════════════ */}
      <FABButton onClick={() => {
        haptic('medium')
        navigate('/create-order')
      }} />
    </div>
  )
}
