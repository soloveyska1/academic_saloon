import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo, useScroll, useSpring } from 'framer-motion'
import {
  FileStack, Search, Plus, ChevronRight, Clock, CheckCircle, XCircle, CreditCard, Loader, AlertCircle,
  TrendingUp, Calendar, MessageCircle, Sparkles, Filter, ArrowUpDown, X, Bell, Zap, Target, Eye, EyeOff,
  GraduationCap, FileText, BookOpen, Briefcase, PenTool, ClipboardCheck, Presentation, Scroll, Camera,
  Star, Crown, Gem, Award, Wallet, ChevronDown, Copy, Activity, Flame, Shield, Trophy, TrendingDown
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { usePremiumGesture } from '../hooks/usePremiumGesture'

// ═══════════════════════════════════════════════════════════════════════════════
//  🏆 PORTFOLIO V4.0 — ULTIMATE PREMIUM REDESIGN
//  Philosophy: "Old Money sophistication meets Cyberpunk precision"
//  Features: Portfolio Health Orb, Priority Lanes, Smart Insights, Focus Mode
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
}

type FilterType = 'all' | 'active' | 'completed' | 'attention'
type SortOption = 'date' | 'price' | 'status' | 'deadline'
type ViewMode = 'default' | 'focus' | 'timeline'

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null
  return date
}

function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function getHoursUntilDeadline(deadline: string | null | undefined): number | null {
  const date = parseDateSafe(deadline)
  if (!date) return null
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60))
  return diff
}

function getMonthKey(dateString: string): string {
  const date = parseDateSafe(dateString)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey: string): string {
  if (monthKey === 'unknown') return 'Без даты'
  const [year, month] = monthKey.split('-').map(Number)
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const now = new Date()
  const isCurrentYear = year === now.getFullYear()
  return isCurrentYear ? months[month - 1] : `${months[month - 1]} ${year}`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

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

// Premium subdued color palette - lower opacity for refined look
const WORK_TYPE_COLORS: Record<string, { primary: string; glow: string }> = {
  masters: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.2)' },
  diploma: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.2)' },
  coursework: { primary: '#d4af37', glow: 'rgba(212,175,55,0.2)' },
  practice: { primary: '#60a5fa', glow: 'rgba(96,165,250,0.2)' },
  essay: { primary: '#d4af37', glow: 'rgba(212,175,55,0.2)' },
  presentation: { primary: '#f472b6', glow: 'rgba(244,114,182,0.2)' },
  control: { primary: '#4ade80', glow: 'rgba(74,222,128,0.2)' },
  independent: { primary: '#d4af37', glow: 'rgba(212,175,55,0.2)' },
  report: { primary: '#d4af37', glow: 'rgba(212,175,55,0.2)' },
  photo_task: { primary: '#fb923c', glow: 'rgba(251,146,60,0.2)' },
  other: { primary: '#d4af37', glow: 'rgba(212,175,55,0.2)' },
}

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Clock
  priority: number
  needsAttention: boolean
  step: number
  lane: 'urgent' | 'active' | 'archive'
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'На оценке', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)', icon: Clock, priority: 2, needsAttention: false, step: 0, lane: 'active' },
  waiting_estimation: { label: 'На оценке', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)', icon: Clock, priority: 2, needsAttention: false, step: 0, lane: 'active' },
  confirmed: { label: 'К оплате', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)', icon: CreditCard, priority: 1, needsAttention: true, step: 1, lane: 'urgent' },
  waiting_payment: { label: 'К оплате', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.15)', icon: CreditCard, priority: 1, needsAttention: true, step: 1, lane: 'urgent' },
  verification_pending: { label: 'Проверка оплаты', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Loader, priority: 3, needsAttention: false, step: 2, lane: 'active' },
  paid: { label: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2, lane: 'active' },
  paid_full: { label: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2, lane: 'active' },
  in_progress: { label: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Loader, priority: 4, needsAttention: false, step: 2, lane: 'active' },
  review: { label: 'Готов', color: '#4ade80', bgColor: 'rgba(74,222,128,0.12)', icon: CheckCircle, priority: 5, needsAttention: true, step: 3, lane: 'urgent' },
  revision: { label: 'На правках', color: '#fb923c', bgColor: 'rgba(251,146,60,0.12)', icon: AlertCircle, priority: 3, needsAttention: true, step: 2, lane: 'urgent' },
  completed: { label: 'Завершён', color: '#4ade80', bgColor: 'rgba(74,222,128,0.08)', icon: CheckCircle, priority: 6, needsAttention: false, step: 4, lane: 'archive' },
  cancelled: { label: 'Отменён', color: '#71717a', bgColor: 'rgba(113,113,122,0.08)', icon: XCircle, priority: 7, needsAttention: false, step: -1, lane: 'archive' },
  rejected: { label: 'Отклонён', color: '#71717a', bgColor: 'rgba(113,113,122,0.08)', icon: XCircle, priority: 7, needsAttention: false, step: -1, lane: 'archive' },
}

const TIMELINE_STEPS = ['Создан', 'Оценён', 'В работе', 'Готов', 'Завершён']

// ═══════════════════════════════════════════════════════════════════════════════
//  🔮 PORTFOLIO HEALTH ORB — Живая голографическая сфера
// ═══════════════════════════════════════════════════════════════════════════════

function PortfolioHealthOrb({ health, totalOrders, onClick }: { health: 'excellent' | 'good' | 'warning' | 'critical'; totalOrders: number; onClick: () => void }) {
  // Premium color palette - warm amber instead of aggressive red
  const healthColors = {
    excellent: { primary: '#4ade80', secondary: '#22c55e', glow: 'rgba(74,222,128,0.35)' },
    good: { primary: '#d4af37', secondary: '#b48e26', glow: 'rgba(212,175,55,0.35)' },
    warning: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251,191,36,0.3)' },
    critical: { primary: '#fb923c', secondary: '#f97316', glow: 'rgba(251,146,60,0.35)' }, // Warm amber, not red!
  }

  const colors = healthColors[health]
  const healthLabels = { excellent: 'Отлично', good: 'Хорошо', warning: 'Внимание', critical: 'Требует заботы' } // "Заботы" sounds more premium than "внимания"

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        cursor: 'pointer',
      }}
    >
      {/* Outer glow ring */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 30px ${colors.glow}, inset 0 0 20px ${colors.glow}`,
            `0 0 50px ${colors.glow}, inset 0 0 30px ${colors.glow}`,
            `0 0 30px ${colors.glow}, inset 0 0 20px ${colors.glow}`,
          ],
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${colors.primary}`,
          background: `radial-gradient(circle at 30% 30%, ${colors.glow}, transparent 70%)`,
        }}
      />

      {/* Inner orb */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 30% 30%, ${colors.primary}40, transparent 50%),
            radial-gradient(circle at 70% 70%, ${colors.secondary}30, transparent 50%),
            linear-gradient(145deg, rgba(20,20,24,0.95), rgba(10,10,12,0.98))
          `,
          border: `1px solid ${colors.primary}40`,
        }}
      />

      {/* Core content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            fontSize: 32,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: `drop-shadow(0 0 10px ${colors.glow})`,
          }}
        >
          {totalOrders}
        </motion.span>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: colors.primary,
        }}>
          {healthLabels[health]}
        </span>
      </div>

      {/* Orbiting particles */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 80 + i * 10,
            height: 80 + i * 10,
            marginTop: -(40 + i * 5),
            marginLeft: -(40 + i * 5),
          }}
        >
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 4,
              height: 4,
              marginLeft: -2,
              borderRadius: '50%',
              background: colors.primary,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  📊 ANIMATED STAT CARD — Метрика с анимацией
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedStatCard({ icon: Icon, value, label, color, suffix = '', trend, onClick }: {
  icon: typeof Clock
  value: number
  label: string
  color: string
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
}) {
  const count = useMotionValue(0)
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = count.on('change', (v) => setDisplayValue(Math.round(v).toLocaleString('ru-RU')))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count])

  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        padding: '16px 14px',
        borderRadius: 18,
        background: `linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))`,
        border: `1px solid ${color}25`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120%',
        height: 50,
        background: `radial-gradient(ellipse at center, ${color}15, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `${color}20`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={16} color={color} strokeWidth={2} />
          </div>
          {trend && trend !== 'neutral' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '3px 6px',
              borderRadius: 6,
              background: trend === 'up' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            }}>
              {trend === 'up' ? <TrendingUp size={10} color="#4ade80" /> : <TrendingDown size={10} color="#f87171" />}
            </div>
          )}
        </div>

        <div style={{
          fontSize: 24,
          fontWeight: 800,
          color: color,
          fontFamily: 'var(--font-mono)',
          marginBottom: 4,
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
        }}>
          {displayValue}
          {suffix && <span style={{ fontSize: 14, opacity: 0.7 }}>{suffix}</span>}
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.02em',
        }}>
          {label}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ⚡ SMART INSIGHT CARD — AI-подобные подсказки
// ═══════════════════════════════════════════════════════════════════════════════

function SmartInsightCard({ type, message, action, actionLabel, color, icon: Icon }: {
  type: 'tip' | 'warning' | 'success' | 'promo'
  message: string
  action?: () => void
  actionLabel?: string
  color: string
  icon: typeof Zap
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      layout
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${color}12, ${color}06)`,
        border: `1px solid ${color}30`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer */}
      <motion.div
        animate={{ x: ['-150%', '250%'] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${color}15, transparent)`,
          transform: 'skewX(-20deg)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${color}20`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-main)',
          margin: 0,
          lineHeight: 1.4,
        }}>
          {message}
        </p>
      </div>

      {action && actionLabel && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={action}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${color}40`,
            background: `${color}20`,
            color: color,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  🎯 FOCUS MODE TOGGLE — Режим фокуса
// ═══════════════════════════════════════════════════════════════════════════════

function FocusModeToggle({ isActive, onToggle, actionsCount }: { isActive: boolean; onToggle: () => void; actionsCount: number }) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.95 }}
      animate={isActive ? {
        boxShadow: [
          '0 0 20px rgba(212,175,55,0.3)',
          '0 0 35px rgba(212,175,55,0.5)',
          '0 0 20px rgba(212,175,55,0.3)',
        ],
      } : {}}
      transition={isActive ? { duration: 2, repeat: Infinity } : {}}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 14,
        border: isActive ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
        background: isActive
          ? 'linear-gradient(135deg, #D4AF37, #B38728)'
          : 'linear-gradient(145deg, rgba(30,30,35,0.9), rgba(20,20,24,0.95))',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 'fit-content',
        flexShrink: 0, // Prevent squashing
      }}
    >
      {isActive && (
        <motion.div
          animate={{ x: ['-150%', '250%'] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            transform: 'skewX(-20deg)',
          }}
        />
      )}

      {isActive ? <Eye size={18} color="#0a0a0c" strokeWidth={2.5} /> : <EyeOff size={18} color="rgba(255,255,255,0.6)" />}

      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: isActive ? '#0a0a0c' : 'rgba(255,255,255,0.7)',
        position: 'relative',
        zIndex: 1,
      }}>
        {isActive ? 'Focus Mode' : 'Focus'}
      </span>

      {actionsCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            background: isActive
              ? 'rgba(0,0,0,0.3)'
              : 'linear-gradient(135deg, #fb923c, #f97316)', // Warm amber, not aggressive red
            color: '#0a0a0c', // Dark text for contrast
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            border: isActive ? 'none' : '1px solid rgba(251,146,60,0.3)',
            boxShadow: isActive ? 'none' : '0 2px 8px rgba(251,146,60,0.25)',
          }}
        >
          {actionsCount}
        </motion.span>
      )}
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  📅 MINI TIMELINE — Компактная временная шкала
// ═══════════════════════════════════════════════════════════════════════════════

function MiniTimeline({ currentStep, color = '#d4af37' }: { currentStep: number; color?: string }) {
  if (currentStep < 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '8px 0' }}>
      {TIMELINE_STEPS.map((_, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
            style={{
              width: index <= currentStep ? 10 : 6,
              height: index <= currentStep ? 10 : 6,
              borderRadius: '50%',
              background: index <= currentStep ? color : 'rgba(255,255,255,0.15)',
              boxShadow: index === currentStep ? `0 0 12px ${color}` : 'none',
              transition: 'all 0.3s ease',
            }}
          />
          {index < TIMELINE_STEPS.length - 1 && (
            <div style={{
              width: 16,
              height: 2,
              background: index < currentStep ? color : 'rgba(255,255,255,0.1)',
              marginLeft: 3,
              borderRadius: 1,
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ⏱️ DEADLINE BADGE — Визуализация дедлайна
// ═══════════════════════════════════════════════════════════════════════════════

function DeadlineBadge({ deadline, isCompleted }: { deadline: string | null; isCompleted: boolean }) {
  const days = getDaysUntilDeadline(deadline)
  const hours = getHoursUntilDeadline(deadline)

  if (days === null || isCompleted) return null

  const getUrgencyConfig = () => {
    if (hours !== null && hours <= 24) return {
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)',
      border: 'rgba(239,68,68,0.3)',
      text: hours <= 0 ? 'Просрочен!' : `${hours}ч`,
      icon: Flame,
      pulse: true
    }
    if (days <= 2) return {
      color: '#f97316',
      bg: 'rgba(249,115,22,0.12)',
      border: 'rgba(249,115,22,0.25)',
      text: `${days}д`,
      icon: AlertCircle,
      pulse: true
    }
    if (days <= 5) return {
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.1)',
      border: 'rgba(251,191,36,0.2)',
      text: `${days}д`,
      icon: Clock,
      pulse: false
    }
    return {
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.08)',
      border: 'rgba(96,165,250,0.15)',
      text: `${days}д`,
      icon: Calendar,
      pulse: false
    }
  }

  const config = getUrgencyConfig()
  const IconComp = config.icon

  return (
    <motion.div
      animate={config.pulse ? {
        scale: [1, 1.03, 1],
        boxShadow: [
          `0 0 0 rgba(239,68,68,0)`,
          `0 0 15px ${config.color}40`,
          `0 0 0 rgba(239,68,68,0)`,
        ],
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 10,
      }}
    >
      <IconComp size={12} color={config.color} strokeWidth={2.5} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: config.color,
        fontFamily: 'var(--font-mono)',
      }}>
        {config.text}
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  💳 PAYMENT REQUIRED BADGE — Премиум бейдж оплаты
// ═══════════════════════════════════════════════════════════════════════════════

function PaymentBadge({ amount, hasPromo, discount }: { amount: number; hasPromo: boolean; discount?: number }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 15px rgba(212,175,55,0.15)',
          '0 0 25px rgba(212,175,55,0.25)',
          '0 0 15px rgba(212,175,55,0.15)',
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(184,135,40,0.08))', // Gold, not purple
        border: '1px solid rgba(212,175,55,0.2)', // Subtle gold border
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shine */}
      <motion.div
        animate={{ x: ['-150%', '250%'] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transform: 'skewX(-20deg)',
        }}
      />

      <CreditCard size={18} color="#d4af37" strokeWidth={2} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(212,175,55,0.8)', // Gold color
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          К оплате
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 16,
            fontWeight: 800,
            color: hasPromo ? '#4ade80' : '#d4af37', // Gold color
            fontFamily: 'var(--font-mono)',
          }}>
            {amount.toLocaleString('ru-RU')} ₽
          </span>
          {hasPromo && discount && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#4ade80',
              background: 'rgba(74,222,128,0.15)',
              padding: '2px 6px',
              borderRadius: 4,
            }}>
              −{discount}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  💎 ULTRA-PREMIUM ORDER CARD — Главная карточка заказа
// ═══════════════════════════════════════════════════════════════════════════════

function PremiumOrderCard({ order, index, showTimeline = true, isFocusMode = false }: {
  order: Order
  index: number
  showTimeline?: boolean
  isFocusMode?: boolean
}) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const [swipeX, setSwipeX] = useState(0)

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const workTypeColors = WORK_TYPE_COLORS[order.work_type] || WORK_TYPE_COLORS.other

  const progress = (order as any).progress || 0
  const isCompleted = order.status === 'completed'
  const needsPayment = ['confirmed', 'waiting_payment'].includes(order.status)
  const isInProgress = ['paid', 'paid_full', 'in_progress'].includes(order.status)
  const isPending = ['pending', 'waiting_estimation'].includes(order.status)
  const isReady = order.status === 'review'

  const SWIPE_THRESHOLD = 80

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      setSwipeX(info.offset.x > 0 ? SWIPE_THRESHOLD : -SWIPE_THRESHOLD)
      haptic('light')
    } else {
      setSwipeX(0)
    }
  }

  const handleAction = (action: 'pay' | 'chat' | 'view') => {
    haptic('medium')
    setSwipeX(0)
    if (action === 'pay') navigate(`/order/${order.id}?action=pay`)
    else if (action === 'chat') navigate(`/order/${order.id}?tab=chat`)
    else navigate(`/order/${order.id}`)
  }

  const handleCardTap = () => {
    if (swipeX !== 0) {
      setSwipeX(0)
    } else {
      navigate(`/order/${order.id}`)
    }
  }

  // Card priority styling — PREMIUM: subtle, hair-thin borders like private banking
  const getPriorityStyles = () => {
    if (needsPayment) return {
      border: '1px solid rgba(212,175,55,0.2)', // Gold accent for payment, not purple
      boxShadow: `
        0 1px 2px rgba(212,175,55,0.06),
        0 8px 24px -8px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(212,175,55,0.12)
      `,
    }
    if (isReady) return {
      border: '1px solid rgba(74,222,128,0.12)', // Muted sage green
      boxShadow: `
        0 1px 2px rgba(74,222,128,0.04),
        0 8px 24px -8px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(74,222,128,0.08)
      `,
    }
    if (isCompleted) return {
      border: '1px solid rgba(255,255,255,0.03)',
      boxShadow: '0 4px 16px -8px rgba(0,0,0,0.4)',
      opacity: 0.6,
    }
    return {
      border: '1px solid rgba(212,175,55,0.06)', // Barely visible gold whisper
      boxShadow: `
        0 1px 1px rgba(212,175,55,0.03),
        0 8px 20px -8px rgba(0,0,0,0.5)
      `,
    }
  }

  const priorityStyles = getPriorityStyles()

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: priorityStyles.opacity || 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      layout
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        marginBottom: 16,
      }}
    >
      {/* Swipe action backgrounds */}
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
        borderRadius: '24px 0 0 24px',
      }}>
        <motion.div animate={{ scale: swipeX > 0 ? 1.2 : 1 }} onClick={() => handleAction('chat')}>
          <MessageCircle size={24} color="#fff" />
        </motion.div>
      </div>

      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: SWIPE_THRESHOLD,
        background: 'linear-gradient(270deg, #d4af37, #b48e26)', // Always gold for premium feel
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0 24px 24px 0',
      }}>
        <motion.div animate={{ scale: swipeX < 0 ? 1.2 : 1 }} onClick={() => handleAction(needsPayment ? 'pay' : 'view')}>
          {needsPayment ? <CreditCard size={24} color="#0a0a0c" /> : <ChevronRight size={24} color="#0a0a0c" />}
        </motion.div>
      </div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_THRESHOLD, right: SWIPE_THRESHOLD }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeX }}
        onClick={handleCardTap}
        style={{
          position: 'relative',
          padding: 20,
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, ${workTypeColors.glow}08, transparent),
            linear-gradient(155deg, rgba(32,32,38,0.95), rgba(18,18,22,0.98))
          `,
          ...priorityStyles,
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: 24,
          cursor: 'pointer',
          touchAction: 'pan-y',
          overflow: 'hidden',
        }}
      >
        {/* Accent line */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 20,
          bottom: 20,
          width: 4,
          borderRadius: '0 4px 4px 0',
          background: `linear-gradient(180deg, ${workTypeColors.primary}, ${workTypeColors.primary}60)`,
          boxShadow: `0 0 20px ${workTypeColors.glow}`,
        }} />

        {/* Top shine */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 30,
          right: 30,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${workTypeColors.primary}30, transparent)`,
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingLeft: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            {/* Icon with progress ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {isInProgress && progress > 0 ? (
                <div style={{ position: 'relative', width: 52, height: 52 }}>
                  <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
                    <motion.circle
                      cx={26} cy={26} r={22}
                      fill="none"
                      stroke={workTypeColors.primary}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={138}
                      initial={{ strokeDashoffset: 138 }}
                      animate={{ strokeDashoffset: 138 - (138 * progress / 100) }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                      style={{ filter: `drop-shadow(0 0 8px ${workTypeColors.glow})` }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <WorkIcon size={20} color={workTypeColors.primary} strokeWidth={1.5} />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: `linear-gradient(135deg, ${workTypeColors.primary}, ${workTypeColors.primary}cc)`,
                      color: '#0a0a0c',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: `0 2px 8px ${workTypeColors.glow}`,
                    }}
                  >
                    {progress}%
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: `linear-gradient(145deg, ${workTypeColors.primary}20, ${workTypeColors.primary}08)`,
                    border: `1.5px solid ${workTypeColors.primary}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 20px ${workTypeColors.glow}30`,
                  }}
                >
                  <WorkIcon size={24} color={workTypeColors.primary} strokeWidth={1.5} />
                </motion.div>
              )}

              {/* Status indicators */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(74,222,128,0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <CheckCircle size={14} color="#fff" strokeWidth={3} />
                </motion.div>
              )}

              {isPending && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(251,191,36,0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Clock size={12} color="#0a0a0c" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Title & Subject */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
                marginBottom: 4,
                fontFamily: 'var(--font-serif)',
              }}>
                {order.work_type_label}
              </h3>
              <p style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {order.subject || order.topic || 'Без темы'}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            background: statusConfig.bgColor,
            borderRadius: 12,
            border: `1px solid ${statusConfig.color}25`,
            flexShrink: 0,
          }}>
            <motion.div
              animate={needsPayment || isReady ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusConfig.color,
                boxShadow: `0 0 8px ${statusConfig.color}`,
              }}
            />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: statusConfig.color,
              letterSpacing: '0.02em',
            }}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {showTimeline && statusConfig.step >= 0 && (
          <div style={{ paddingLeft: 16, marginBottom: 12 }}>
            <MiniTimeline currentStep={statusConfig.step} color={workTypeColors.primary} />
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 14,
          paddingLeft: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'var(--font-mono)',
            }}>
              #{order.id}
            </span>

            <DeadlineBadge deadline={order.deadline} isCompleted={isCompleted} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Promo badge */}
            {order.promo_code && order.promo_discount && order.promo_discount > 0 && (
              <motion.div
                animate={{ boxShadow: ['0 0 0 rgba(74,222,128,0)', '0 0 15px rgba(74,222,128,0.4)', '0 0 0 rgba(74,222,128,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 10 }}>🎟️</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                  −{order.promo_discount}%
                </span>
              </motion.div>
            )}

            {/* Original price crossed */}
            {order.promo_code && order.price && order.price !== order.final_price && (
              <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                textDecoration: 'line-through',
                fontFamily: 'var(--font-mono)',
              }}>
                {order.price.toLocaleString('ru-RU')}
              </span>
            )}

            {/* Price */}
            <motion.span
              animate={needsPayment ? {
                textShadow: ['0 0 10px rgba(167,139,250,0.4)', '0 0 25px rgba(167,139,250,0.7)', '0 0 10px rgba(167,139,250,0.4)'],
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: order.promo_code && order.promo_discount ? '#4ade80' : needsPayment ? '#a78bfa' : workTypeColors.primary,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
            </motion.span>

            <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ChevronRight size={18} color={needsPayment ? '#a78bfa' : 'rgba(255,255,255,0.4)'} />
            </motion.div>
          </div>
        </div>

        {/* Special states */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 14,
              paddingTop: 14,
              paddingLeft: 16,
              borderTop: '1px solid rgba(251,191,36,0.15)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} color="#fbbf24" />
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 2 }}>
                Оцениваем заказ...
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                Эксперт изучает задание
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: 4, height: 4, borderRadius: '50%', background: '#fbbf24' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {isReady && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(74,222,128,0.2)',
            }}
          >
            {[
              { icon: CheckCircle, label: 'Готово', color: '#4ade80' },
              { icon: Star, label: 'Качество', color: '#d4af37' },
              { icon: Shield, label: 'Гарантия', color: '#60a5fa' },
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 10,
                  background: `${badge.color}12`,
                  border: `1px solid ${badge.color}25`,
                }}
              >
                <badge.icon size={12} color={badge.color} />
                <span style={{ fontSize: 10, fontWeight: 600, color: badge.color }}>{badge.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Decorative corners */}
        {(needsPayment || isReady) && (
          <>
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
              <motion.div
                key={pos}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.5, scale: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  position: 'absolute',
                  width: 18,
                  height: 18,
                  pointerEvents: 'none',
                  ...(pos === 'top-left' && { top: 8, left: 8, borderTop: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}`, borderLeft: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}` }),
                  ...(pos === 'top-right' && { top: 8, right: 8, borderTop: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}`, borderRight: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}` }),
                  ...(pos === 'bottom-left' && { bottom: 8, left: 8, borderBottom: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}`, borderLeft: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}` }),
                  ...(pos === 'bottom-right' && { bottom: 8, right: 8, borderBottom: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}`, borderRight: `2px solid ${needsPayment ? '#a78bfa' : '#4ade80'}` }),
                }}
              />
            ))}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  🎭 PREMIUM EMPTY STATE — Люксовое пустое состояние
// ═══════════════════════════════════════════════════════════════════════════════

function LuxuryEmptyState({ filter, onCreateOrder }: { filter: FilterType; onCreateOrder: () => void }) {
  const configs = {
    all: { title: 'Ваш академический сейф пуст', subtitle: 'Создайте первый проект и начните путь к успеху', icon: Gem, color: '#d4af37' },
    active: { title: 'Нет активных проектов', subtitle: 'Все задачи завершены — отличная работа!', icon: Trophy, color: '#4ade80' },
    completed: { title: 'История пуста', subtitle: 'Завершённые проекты появятся здесь', icon: Award, color: '#60a5fa' },
    attention: { title: 'Всё под контролем', subtitle: 'Нет задач, требующих вашего внимания', icon: Shield, color: '#4ade80' },
  }

  const config = configs[filter]
  const IconComp = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      style={{
        textAlign: 'center',
        padding: '60px 32px',
        background: 'linear-gradient(145deg, rgba(32,32,38,0.95), rgba(18,18,22,0.98))',
        borderRadius: 28,
        border: '1px solid rgba(212,175,55,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 100% 50% at 50% 0%, ${config.color}10, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
          style={{
            position: 'absolute',
            left: `${10 + (i * 12) % 80}%`,
            top: `${20 + (i * 15) % 60}%`,
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            borderRadius: '50%',
            background: config.color,
            boxShadow: `0 0 10px ${config.color}`,
          }}
        />
      ))}

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, delay: 0.1 }}
        style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: 24,
        }}
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 40px ${config.color}30, inset 0 0 30px ${config.color}10`,
              `0 0 60px ${config.color}50, inset 0 0 40px ${config.color}15`,
              `0 0 40px ${config.color}30, inset 0 0 30px ${config.color}10`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            width: 100,
            height: 100,
            borderRadius: 30,
            background: 'linear-gradient(145deg, rgba(30,30,35,0.95), rgba(18,18,22,0.98))',
            border: `2px solid ${config.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <IconComp size={44} color={config.color} strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Orbiting sparkles */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 120 + i * 15,
              height: 120 + i * 15,
              marginTop: -(60 + i * 7.5),
              marginLeft: -(60 + i * 7.5),
            }}
          >
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 4,
                height: 4,
                marginLeft: -2,
                borderRadius: '50%',
                background: config.color,
                boxShadow: `0 0 8px ${config.color}`,
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'var(--font-serif)',
          background: `linear-gradient(135deg, ${config.color}, ${config.color}80)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {config.title}
      </motion.h3>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 260,
          margin: '0 auto 28px',
          lineHeight: 1.5,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {config.subtitle}
      </motion.p>

      {/* CTA Button */}
      {filter === 'all' && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateOrder}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 28px',
            borderRadius: 16,
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'linear-gradient(135deg, #D4AF37, #B38728)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: ['-150%', '250%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
          <Plus size={20} color="#0a0a0c" strokeWidth={2.5} />
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#0a0a0c',
            position: 'relative',
            zIndex: 1,
          }}>
            Создать проект
          </span>
        </motion.button>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ✨ PREMIUM FAB BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function PremiumFAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08, rotate: 90 }}
      style={{
        position: 'fixed',
        bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 20,
        border: '2px solid rgba(255,255,255,0.2)',
        background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 70%, #D4AF37 100%)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Glow ring */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 25px rgba(212,175,55,0.4), 0 10px 35px rgba(212,175,55,0.3)',
            '0 0 45px rgba(212,175,55,0.6), 0 15px 45px rgba(212,175,55,0.5)',
            '0 0 25px rgba(212,175,55,0.4), 0 10px 35px rgba(212,175,55,0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'absolute', inset: 0, borderRadius: 20 }}
      />

      {/* Rotating shimmer */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          inset: -2,
          background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.4), transparent, transparent)',
          borderRadius: 22,
        }}
      />

      {/* Inner */}
      <div style={{
        position: 'absolute',
        inset: 2,
        borderRadius: 18,
        background: 'linear-gradient(145deg, #D4AF37, #B38728)',
      }} />

      {/* Icon */}
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Plus size={28} color="#0a0a0c" strokeWidth={3} />
      </motion.div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  🏠 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const containerRef = useRef<HTMLDivElement>(null)

  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('status')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showInsights, setShowInsights] = useState(true)

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const active = orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    const needsPayment = orders.filter(o => ['confirmed', 'waiting_payment'].includes(o.status))
    const inProgress = orders.filter(o => ['paid', 'paid_full', 'in_progress'].includes(o.status))
    const completed = orders.filter(o => o.status === 'completed')
    const attention = orders.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    const totalSpent = completed.reduce((sum, o) => sum + (o.final_price || o.price || 0), 0)
    const pendingTotal = needsPayment.reduce((sum, o) => sum + (o.final_price || o.price || 0), 0)
    const totalSavings = orders.reduce((sum, o) => {
      if (o.promo_code && o.promo_discount && o.price) {
        return sum + (o.price - (o.final_price || o.price))
      }
      return sum
    }, 0)

    // Calculate portfolio health
    let health: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent'
    const urgentDeadlines = orders.filter(o => {
      const days = getDaysUntilDeadline(o.deadline)
      return days !== null && days <= 2 && !['completed', 'cancelled', 'rejected'].includes(o.status)
    })

    if (urgentDeadlines.length > 2 || needsPayment.length > 3) health = 'critical'
    else if (urgentDeadlines.length > 0 || needsPayment.length > 1) health = 'warning'
    else if (attention.length > 0) health = 'good'

    return { active, needsPayment, inProgress, completed, attention, totalSpent, pendingTotal, totalSavings, health }
  }, [orders])

  // Generate smart insights
  const insights = useMemo(() => {
    const result: Array<{ type: 'tip' | 'warning' | 'success' | 'promo'; message: string; action?: () => void; actionLabel?: string; color: string; icon: typeof Zap }> = []

    if (stats.needsPayment.length > 0) {
      result.push({
        type: 'warning',
        message: `${stats.needsPayment.length} ${stats.needsPayment.length === 1 ? 'заказ требует' : 'заказа требуют'} оплаты на сумму ${stats.pendingTotal.toLocaleString('ru-RU')} ₽`,
        action: () => navigate('/batch-payment?orders=' + stats.needsPayment.map(o => o.id).join(',')),
        actionLabel: 'Оплатить',
        color: '#a78bfa',
        icon: CreditCard,
      })
    }

    if (stats.totalSavings > 0) {
      result.push({
        type: 'success',
        message: `Вы сэкономили ${stats.totalSavings.toLocaleString('ru-RU')} ₽ благодаря промокодам!`,
        color: '#4ade80',
        icon: Sparkles,
      })
    }

    const urgentOrder = orders.find(o => {
      const hours = getHoursUntilDeadline(o.deadline)
      return hours !== null && hours <= 48 && !['completed', 'cancelled', 'rejected'].includes(o.status)
    })

    if (urgentOrder) {
      const hours = getHoursUntilDeadline(urgentOrder.deadline)
      result.push({
        type: 'warning',
        message: `Заказ #${urgentOrder.id} требует внимания — до дедлайна ${hours}ч`,
        action: () => navigate(`/order/${urgentOrder.id}`),
        actionLabel: 'Открыть',
        color: '#f97316',
        icon: Flame,
      })
    }

    return result
  }, [orders, stats, navigate])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Focus mode — only attention-required
    if (isFocusMode) {
      result = result.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
    } else {
      // Apply filter
      if (filter === 'active') {
        result = result.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
      } else if (filter === 'completed') {
        result = result.filter(o => o.status === 'completed')
      } else if (filter === 'attention') {
        result = result.filter(o => STATUS_CONFIG[o.status]?.needsAttention)
      }
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
      if (sortBy === 'deadline') {
        const daysA = getDaysUntilDeadline(a.deadline) ?? 999
        const daysB = getDaysUntilDeadline(b.deadline) ?? 999
        return daysA - daysB
      } else if (sortBy === 'price') {
        return (b.final_price || b.price || 0) - (a.final_price || a.price || 0)
      } else if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else { // status priority
        const priorityA = STATUS_CONFIG[a.status]?.priority || 99
        const priorityB = STATUS_CONFIG[b.status]?.priority || 99
        return priorityA - priorityB
      }
    })

    return result
  }, [orders, filter, searchQuery, sortBy, isFocusMode])

  const handleFilterChange = (newFilter: FilterType) => {
    haptic('light')
    setFilter(newFilter)
    if (isFocusMode) setIsFocusMode(false)
  }

  const handleCreateOrder = () => {
    haptic('medium')
    navigate('/create-order')
  }

  const toggleFocusMode = () => {
    haptic('medium')
    setIsFocusMode(!isFocusMode)
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        paddingBottom: 160,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        padding: '28px 20px 24px',
        background: `
          radial-gradient(ellipse 100% 60% at 50% -10%, rgba(212,175,55,0.1), transparent),
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(212,175,55,0.05), transparent),
          radial-gradient(ellipse 60% 40% at 80% 20%, rgba(212,175,55,0.04), transparent)
        `,
        overflow: 'hidden',
      }}>
        {/* Background particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
            style={{
              position: 'absolute',
              left: `${5 + (i * 9) % 90}%`,
              top: `${10 + (i * 13) % 80}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              borderRadius: '50%',
              background: '#d4af37',
              boxShadow: '0 0 8px rgba(212,175,55,0.5)',
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Title row with Health Orb */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PortfolioHealthOrb
                health={stats.health}
                totalOrders={orders.length}
                onClick={() => setShowInsights(!showInsights)}
              />

              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 28,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #D4AF37 90%, #FCF6BA 100%)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: 0,
                    animation: 'shimmer-text-portfolio 4s ease-in-out infinite',
                  }}
                >
                  Портфель
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    margin: '4px 0 0',
                  }}
                >
                  {stats.active.length > 0 ? (
                    <>
                      <span style={{ color: '#d4af37', fontWeight: 600 }}>{stats.active.length}</span>
                      {' активных '}
                      {stats.attention.length > 0 && (
                        <>
                          • <span style={{ color: '#f97316', fontWeight: 600 }}>{stats.attention.length}</span>
                          {' требуют внимания'}
                        </>
                      )}
                    </>
                  ) : 'Нет активных проектов'}
                </motion.p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { haptic('light'); setShowSearch(!showSearch) }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: showSearch ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                  background: showSearch ? 'linear-gradient(135deg, #D4AF37, #B38728)' : 'rgba(30,30,35,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Search size={18} color={showSearch ? '#0a0a0c' : 'rgba(255,255,255,0.6)'} />
              </motion.button>
            </div>
          </div>

          {/* Search bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 20, overflow: 'hidden' }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'rgba(30,30,35,0.9)',
                  borderRadius: 16,
                  border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <Search size={18} color="#d4af37" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по заказам..."
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      color: 'var(--text-main)',
                    }}
                  />
                  {searchQuery && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <X size={18} color="rgba(255,255,255,0.5)" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <AnimatedStatCard
              icon={Activity}
              value={stats.active.length}
              label="Активных"
              color="#60a5fa"
            />
            <AnimatedStatCard
              icon={CreditCard}
              value={stats.pendingTotal}
              label="К оплате"
              color="#a78bfa"
              suffix=" ₽"
              onClick={stats.needsPayment.length > 0 ? () => navigate('/batch-payment?orders=' + stats.needsPayment.map(o => o.id).join(',')) : undefined}
            />
            <AnimatedStatCard
              icon={Trophy}
              value={stats.completed.length}
              label="Завершено"
              color="#4ade80"
            />
          </div>

          {/* Focus Mode + Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            overflowX: 'auto',
            paddingBottom: 4,
            paddingLeft: 4, // Prevent left cutoff
            paddingRight: 4, // Prevent right cutoff
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', // Hide scrollbar Firefox
            msOverflowStyle: 'none', // Hide scrollbar IE
          }}>
            <FocusModeToggle
              isActive={isFocusMode}
              onToggle={toggleFocusMode}
              actionsCount={stats.attention.length}
            />

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {[
              { key: 'all', label: 'Все', count: orders.length },
              { key: 'active', label: 'Активные', count: stats.active.length },
              { key: 'attention', label: 'Внимание', count: stats.attention.length },
              { key: 'completed', label: 'Готовы', count: stats.completed.length }, // Shorter label for mobile
            ].map((f) => (
              <motion.button
                key={f.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange(f.key as FilterType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px', // Slightly reduced padding
                  borderRadius: 12,
                  border: `1px solid ${filter === f.key && !isFocusMode ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: filter === f.key && !isFocusMode
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))'
                    : 'rgba(30,30,35,0.6)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0, // Prevent squashing
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: filter === f.key && !isFocusMode ? '#d4af37' : 'rgba(255,255,255,0.6)',
                }}>
                  {f.label}
                </span>
                {f.count > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: filter === f.key && !isFocusMode ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)',
                    color: filter === f.key && !isFocusMode ? '#d4af37' : 'rgba(255,255,255,0.5)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {f.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SMART INSIGHTS
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showInsights && insights.length > 0 && !isFocusMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '0 20px', marginBottom: 20 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.slice(0, 2).map((insight, i) => (
                <SmartInsightCard key={i} {...insight} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          ORDERS LIST
          ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 20px' }}>
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <LuxuryEmptyState filter={filter} onCreateOrder={handleCreateOrder} />
          ) : (
            filteredOrders.map((order, index) => (
              <PremiumOrderCard
                key={order.id}
                order={order}
                index={index}
                showTimeline={!isFocusMode}
                isFocusMode={isFocusMode}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <PremiumFAB onClick={handleCreateOrder} />

      {/* Shimmer animation keyframe */}
      <style>{`
        @keyframes shimmer-text-portfolio {
          0% { background-position: -100% 0; }
          50% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  )
}

export default OrdersPage
