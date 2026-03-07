import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Search, Plus, ChevronRight, Clock, CheckCircle, XCircle, CreditCard, Loader, AlertCircle,
  Calendar, MessageCircle, Sparkles, Filter, X, Zap, Target, Eye, EyeOff,
  GraduationCap, FileText, BookOpen, Briefcase, PenTool, ClipboardCheck, Presentation, Scroll, Camera,
  Star, Crown, Gem, Award, Wallet, ChevronDown, Activity, Flame, Shield, Trophy,
  SortAsc, ArrowUpRight, Package, Layers, Bell, ChevronUp, Archive
} from 'lucide-react'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useCapability } from '../contexts/DeviceCapabilityContext'
import { PremiumBackground } from '../components/ui/PremiumBackground'

// ═══════════════════════════════════════════════════════════════════════════════
//  🏆 PORTFOLIO V5.0 — PRIVATE BANKING EXPERIENCE
//
//  Philosophy: "Refined simplicity speaks louder than decorated complexity"
//
//  Key Principles:
//  1. Information hierarchy over decoration
//  2. Purposeful animations only (no infinite loops)
//  3. Mobile-first with touch gestures
//  4. Accessibility compliance (WCAG AA)
//  5. Performance: 60fps on mid-range devices
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
}

type FilterType = 'all' | 'action' | 'active' | 'completed' | 'archived'
type SortOption = 'priority' | 'deadline' | 'price' | 'date'
type ViewMode = 'list' | 'timeline'

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
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

function formatDeadline(deadline: string | null): string {
  const days = getDaysUntilDeadline(deadline)
  const hours = getHoursUntilDeadline(deadline)

  if (days === null) return 'Без срока'
  if (hours !== null && hours <= 0) return 'Просрочен'
  if (hours !== null && hours <= 24) return `${hours}ч`
  if (days <= 7) return `${days}д`

  const date = parseDateSafe(deadline)
  if (!date) return 'Без срока'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
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
  const isCurrentMonth = isCurrentYear && month === now.getMonth() + 1
  const isPrevMonth = isCurrentYear && month === now.getMonth()

  if (isCurrentMonth) return 'Этот месяц'
  if (isPrevMonth) return 'Прошлый месяц'
  return isCurrentYear ? months[month - 1] : `${months[month - 1]} ${year}`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
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

interface StatusConfig {
  label: string
  shortLabel: string
  color: string
  bgColor: string
  icon: typeof Clock
  priority: number
  needsAction: boolean
  step: number
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Оценивается', shortLabel: 'Оценка', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)', icon: Clock, priority: 3, needsAction: false, step: 0 },
  waiting_estimation: { label: 'Оценивается', shortLabel: 'Оценка', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)', icon: Clock, priority: 3, needsAction: false, step: 0 },
  confirmed: { label: 'Ожидает оплаты', shortLabel: 'К оплате', color: '#d4af37', bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, priority: 1, needsAction: true, step: 1 },
  waiting_payment: { label: 'Ожидает оплаты', shortLabel: 'К оплате', color: '#d4af37', bgColor: 'rgba(212,175,55,0.15)', icon: CreditCard, priority: 1, needsAction: true, step: 1 },
  verification_pending: { label: 'Проверка оплаты', shortLabel: 'Проверка', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Loader, priority: 4, needsAction: false, step: 2 },
  paid: { label: 'В работе', shortLabel: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Activity, priority: 5, needsAction: false, step: 2 },
  paid_full: { label: 'В работе', shortLabel: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Activity, priority: 5, needsAction: false, step: 2 },
  in_progress: { label: 'В работе', shortLabel: 'В работе', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)', icon: Activity, priority: 5, needsAction: false, step: 2 },
  review: { label: 'Готов к проверке', shortLabel: 'Готов', color: '#4ade80', bgColor: 'rgba(74,222,128,0.12)', icon: CheckCircle, priority: 2, needsAction: true, step: 3 },
  revision: { label: 'На доработке', shortLabel: 'Правки', color: '#fb923c', bgColor: 'rgba(251,146,60,0.12)', icon: AlertCircle, priority: 2, needsAction: true, step: 2 },
  completed: { label: 'Завершён', shortLabel: 'Готово', color: '#4ade80', bgColor: 'rgba(74,222,128,0.08)', icon: CheckCircle, priority: 10, needsAction: false, step: 4 },
  cancelled: { label: 'Отменён', shortLabel: 'Отменён', color: '#71717a', bgColor: 'rgba(113,113,122,0.08)', icon: XCircle, priority: 11, needsAction: false, step: -1 },
  rejected: { label: 'Отклонён', shortLabel: 'Отклонён', color: '#71717a', bgColor: 'rgba(113,113,122,0.08)', icon: XCircle, priority: 11, needsAction: false, step: -1 },
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Clock }[] = [
  { value: 'priority', label: 'По важности', icon: Target },
  { value: 'deadline', label: 'По сроку', icon: Calendar },
  { value: 'price', label: 'По стоимости', icon: Wallet },
  { value: 'date', label: 'По дате', icon: Clock },
]

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

// ═══════════════════════════════════════════════════════════════════════════════
//  💎 PORTFOLIO SUMMARY — Элегантная сводка портфеля
// ═══════════════════════════════════════════════════════════════════════════════

interface PortfolioSummaryProps {
  totalValue: number
  activeCount: number
  actionCount: number
  completedCount: number
  onFilterChange: (filter: FilterType) => void
  currentFilter: FilterType
}

const PortfolioSummary = memo(function PortfolioSummary({
  totalValue,
  activeCount,
  actionCount,
  completedCount,
  onFilterChange,
  currentFilter,
}: PortfolioSummaryProps) {
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: '20px',
        marginBottom: 20,
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(16,16,18,0.98))',
        border: '1px solid rgba(212,175,55,0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 30,
        right: 30,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.7)',
            letterSpacing: '0.12em',
            marginBottom: 6,
          }}>
            МОЙ ПОРТФЕЛЬ
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: 'var(--font-serif)',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'baseline',
          }}>
            {totalValue.toLocaleString('ru-RU')}
            <span style={{
              marginLeft: 6,
              fontSize: 20,
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>₽</span>
          </div>
        </div>

        {/* Status indicator */}
        {actionCount > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: 14,
            }}
          >
            <Bell size={16} color="#d4af37" />
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#d4af37',
            }}>
              {actionCount} {actionCount === 1 ? 'действие' : actionCount < 5 ? 'действия' : 'действий'}
            </span>
          </motion.div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        {/* Action Required */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onFilterChange('action')}
          aria-label="Показать требующие действия"
          aria-pressed={currentFilter === 'action'}
          style={{
            padding: '14px 12px',
            borderRadius: 16,
            border: currentFilter === 'action'
              ? '2px solid #d4af37'
              : '1px solid rgba(212,175,55,0.15)',
            background: currentFilter === 'action'
              ? 'rgba(212,175,55,0.15)'
              : 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: actionCount > 0 ? '#d4af37' : 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
          }}>
            {actionCount}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.02em',
          }}>
            Требуют
          </div>
        </motion.button>

        {/* Active */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onFilterChange('active')}
          aria-label="Показать активные"
          aria-pressed={currentFilter === 'active'}
          style={{
            padding: '14px 12px',
            borderRadius: 16,
            border: currentFilter === 'active'
              ? '2px solid #60a5fa'
              : '1px solid rgba(96,165,250,0.15)',
            background: currentFilter === 'active'
              ? 'rgba(96,165,250,0.15)'
              : 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: activeCount > 0 ? '#60a5fa' : 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
          }}>
            {activeCount}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.02em',
          }}>
            Активных
          </div>
        </motion.button>

        {/* Completed */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onFilterChange('completed')}
          aria-label="Показать завершённые"
          aria-pressed={currentFilter === 'completed'}
          style={{
            padding: '14px 12px',
            borderRadius: 16,
            border: currentFilter === 'completed'
              ? '2px solid #4ade80'
              : '1px solid rgba(74,222,128,0.15)',
            background: currentFilter === 'completed'
              ? 'rgba(74,222,128,0.15)'
              : 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: completedCount > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
          }}>
            {completedCount}
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.02em',
          }}>
            Готово
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  🔍 SEARCH & FILTERS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
  counts: { all: number; action: number; active: number; completed: number }
}

const FilterBar = memo(function FilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filter,
  onFilterChange,
  counts,
}: FilterBarProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Все', count: counts.all },
    { key: 'action', label: 'Требуют', count: counts.action },
    { key: 'active', label: 'Активные', count: counts.active },
    { key: 'completed', label: 'Готово', count: counts.completed },
    ...(counts.archived > 0 ? [{ key: 'archived' as FilterType, label: 'Архив', count: counts.archived }] : []),
  ]

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Search Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      }}>
        {/* Search Input */}
        <AnimatePresence mode="wait">
          {showSearch ? (
            <motion.div
              key="search-input"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(212,175,55,0.2)',
                borderRadius: 14,
              }}
            >
              <Search size={18} color="rgba(212,175,55,0.6)" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск по теме, предмету..."
                maxLength={50}
                aria-label="Поиск заказов"
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: 14,
                }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowSearch(false); onSearchChange('') }}
                aria-label="Закрыть поиск"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} color="rgba(255,255,255,0.5)" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="filter-pills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                flex: 1,
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
              }}
            >
              {filters.map((f) => (
                <motion.button
                  key={f.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onFilterChange(f.key)}
                  aria-pressed={filter === f.key}
                  style={{
                    flexShrink: 0,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: filter === f.key
                      ? '1.5px solid rgba(212,175,55,0.5)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: filter === f.key
                      ? 'linear-gradient(145deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))'
                      : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: filter === f.key ? '#d4af37' : 'rgba(255,255,255,0.7)',
                  }}>
                    {f.label}
                  </span>
                  {f.count > 0 && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: filter === f.key ? '#d4af37' : 'rgba(255,255,255,0.4)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {f.count}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Toggle */}
        {!showSearch && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch(true)}
            aria-label="Открыть поиск"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={18} color="rgba(255,255,255,0.6)" />
          </motion.button>
        )}

        {/* Sort Dropdown */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSort(!showSort)}
            aria-label="Сортировка"
            aria-expanded={showSort}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: showSort ? '1.5px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: showSort ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SortAsc size={18} color={showSort ? '#d4af37' : 'rgba(255,255,255,0.6)'} />
          </motion.button>

          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  padding: 8,
                  background: 'rgba(25,25,28,0.98)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 16,
                  zIndex: 100,
                  minWidth: 180,
                  backdropFilter: 'blur(20px)',
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onSortChange(option.value); setShowSort(false) }}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: 'none',
                      background: sortBy === option.value ? 'rgba(212,175,55,0.15)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <option.icon size={16} color={sortBy === option.value ? '#d4af37' : 'rgba(255,255,255,0.5)'} />
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: sortBy === option.value ? '#d4af37' : 'rgba(255,255,255,0.7)',
                    }}>
                      {option.label}
                    </span>
                    {sortBy === option.value && (
                      <CheckCircle size={14} color="#d4af37" style={{ marginLeft: 'auto' }} />
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  📋 ORDER CARD — Refined, Informative, Actionable
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderCardProps {
  order: Order
  index: number
}

const OrderCard = memo(function OrderCard({ order, index }: OrderCardProps) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, amount: 0.2 })

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const WorkIcon = WORK_TYPE_ICONS[order.work_type] || FileText
  const progress = (order as any).progress || 0
  const isCompleted = order.status === 'completed'
  const needsPayment = ['confirmed', 'waiting_payment'].includes(order.status)
  const isReady = order.status === 'review'
  const isInProgress = ['paid', 'paid_full', 'in_progress'].includes(order.status)

  // Deadline urgency
  const daysLeft = getDaysUntilDeadline(order.deadline)
  const hoursLeft = getHoursUntilDeadline(order.deadline)
  const isUrgent = hoursLeft !== null && hoursLeft <= 24 && !isCompleted
  const isOverdue = hoursLeft !== null && hoursLeft <= 0 && !isCompleted

  const handleClick = () => {
    haptic('light')
    navigate(`/order/${order.id}`)
  }

  const handleQuickPay = (e: React.MouseEvent) => {
    e.stopPropagation()
    haptic('medium')
    navigate(`/order/${order.id}?action=pay`)
  }

  // Priority styling
  const getPriorityBorder = () => {
    if (needsPayment) return 'rgba(212,175,55,0.25)'
    if (isReady) return 'rgba(74,222,128,0.2)'
    if (isUrgent || isOverdue) return 'rgba(251,146,60,0.25)'
    return 'rgba(255,255,255,0.06)'
  }

  return (
    <motion.div
      ref={cardRef}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: isCompleted ? 0.7 : 1, y: 0 } : {}}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.4 }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Заказ ${order.id}: ${order.subject || order.work_type_label}, статус: ${statusConfig.label}`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      style={{
        padding: 18,
        marginBottom: 12,
        borderRadius: 20,
        background: 'linear-gradient(145deg, rgba(28,28,32,0.95), rgba(18,18,20,0.98))',
        border: `1px solid ${getPriorityBorder()}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent line */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 16,
        bottom: 16,
        width: 4,
        borderRadius: '0 4px 4px 0',
        background: statusConfig.color,
      }} />

      {/* Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 12,
        paddingLeft: 10,
      }}>
        {/* Icon */}
        <div style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: 14,
          background: statusConfig.bgColor,
          border: `1px solid ${statusConfig.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WorkIcon size={22} color={statusConfig.color} strokeWidth={1.5} />

          {/* Progress ring for in-progress */}
          {isInProgress && progress > 0 && (
            <svg
              width={52}
              height={52}
              style={{
                position: 'absolute',
                top: -2,
                left: -2,
                transform: 'rotate(-90deg)',
              }}
            >
              <circle
                cx={26}
                cy={26}
                r={22}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={3}
              />
              <circle
                cx={26}
                cy={26}
                r={22}
                fill="none"
                stroke={statusConfig.color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * progress / 100)}
              />
            </svg>
          )}

          {/* Status badge */}
          {isCompleted && (
            <div style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: 6,
              background: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle size={12} color="#fff" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Subject (Primary) */}
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-main)',
            margin: 0,
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {order.subject || order.topic || 'Без темы'}
          </h3>

          {/* Work type (Secondary) */}
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>{order.work_type_label}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>#{order.id}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: statusConfig.bgColor,
          borderRadius: 10,
          flexShrink: 0,
        }}>
          {statusConfig.needsAction && (
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusConfig.color,
            }} />
          )}
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: statusConfig.color,
          }}>
            {statusConfig.shortLabel}
          </span>
        </div>
      </div>

      {/* Footer Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Left: Deadline & Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Deadline */}
          {order.deadline && !isCompleted && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              background: isOverdue
                ? 'rgba(239,68,68,0.15)'
                : isUrgent
                  ? 'rgba(251,146,60,0.12)'
                  : 'rgba(255,255,255,0.05)',
              border: `1px solid ${
                isOverdue
                  ? 'rgba(239,68,68,0.3)'
                  : isUrgent
                    ? 'rgba(251,146,60,0.25)'
                    : 'rgba(255,255,255,0.08)'
              }`,
              borderRadius: 8,
            }}>
              {isUrgent || isOverdue ? (
                <Flame size={12} color={isOverdue ? '#ef4444' : '#fb923c'} />
              ) : (
                <Calendar size={12} color="rgba(255,255,255,0.5)" />
              )}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: isOverdue ? '#ef4444' : isUrgent ? '#fb923c' : 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-mono)',
              }}>
                {formatDeadline(order.deadline)}
              </span>
            </div>
          )}

          {/* Progress indicator */}
          {isInProgress && progress > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.2)',
              borderRadius: 8,
            }}>
              <Activity size={12} color="#60a5fa" />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#60a5fa',
                fontFamily: 'var(--font-mono)',
              }}>
                {progress}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Price & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Promo discount */}
          {order.promo_code && order.promo_discount && order.promo_discount > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#4ade80',
              padding: '3px 6px',
              background: 'rgba(74,222,128,0.12)',
              borderRadius: 6,
            }}>
              −{order.promo_discount}%
            </span>
          )}

          {/* Price */}
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: needsPayment ? '#d4af37' : 'var(--text-main)',
            fontFamily: 'var(--font-mono)',
          }}>
            {(order.final_price || order.price || 0).toLocaleString('ru-RU')} ₽
          </span>

          {/* Quick pay button */}
          {needsPayment && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleQuickPay}
              aria-label="Оплатить заказ"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #D4AF37, #b48e26)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CreditCard size={14} color="#0a0a0c" />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#0a0a0c',
              }}>
                Оплатить
              </span>
            </motion.button>
          )}

          {/* Arrow for non-payment cards */}
          {!needsPayment && (
            <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
          )}
        </div>
      </div>

      {/* Ready to review banner */}
      {isReady && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 12,
          padding: '10px 14px',
          background: 'rgba(74,222,128,0.1)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 12,
        }}>
          <CheckCircle size={16} color="#4ade80" />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#4ade80',
          }}>
            Работа готова — проверьте результат
          </span>
          <ArrowUpRight size={14} color="#4ade80" />
        </div>
      )}
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  🎭 EMPTY STATE — Элегантное пустое состояние
// ═══════════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  filter: FilterType
  searchQuery: string
  onCreateOrder: () => void
  onClearFilter: () => void
}

const EmptyState = memo(function EmptyState({
  filter,
  searchQuery,
  onCreateOrder,
  onClearFilter
}: EmptyStateProps) {
  const configs = {
    all: {
      icon: Gem,
      title: 'Портфель пуст',
      subtitle: 'Создайте первый заказ и начните путь к успеху',
      showCreate: true,
    },
    action: {
      icon: Shield,
      title: 'Всё под контролем',
      subtitle: 'Нет заказов, требующих вашего внимания',
      showCreate: false,
    },
    active: {
      icon: Trophy,
      title: 'Нет активных заказов',
      subtitle: 'Все задачи успешно завершены',
      showCreate: true,
    },
    completed: {
      icon: Award,
      title: 'История пуста',
      subtitle: 'Завершённые заказы появятся здесь',
      showCreate: true,
    },
    archived: {
      icon: Archive,
      title: 'Архив пуст',
      subtitle: 'Перемещённые в архив заказы появятся здесь',
      showCreate: false,
    },
  }

  const config = searchQuery ? {
    icon: Search,
    title: 'Ничего не найдено',
    subtitle: `По запросу «${searchQuery}» нет результатов`,
    showCreate: false,
  } : configs[filter]

  const IconComp = config.icon

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: 'linear-gradient(145deg, rgba(28,28,32,0.95), rgba(18,18,20,0.98))',
        borderRadius: 24,
        border: '1px solid rgba(212,175,55,0.1)',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 80,
        height: 80,
        margin: '0 auto 24px',
        borderRadius: 24,
        background: 'linear-gradient(145deg, rgba(30,30,35,0.95), rgba(20,20,24,0.98))',
        border: '1px solid rgba(212,175,55,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <IconComp size={36} color="#d4af37" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'var(--font-serif)',
        color: 'var(--text-main)',
        margin: 0,
        marginBottom: 8,
      }}>
        {config.title}
      </h3>

      {/* Subtitle */}
      <p style={{
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        margin: 0,
        marginBottom: 24,
        maxWidth: 260,
        marginLeft: 'auto',
        marginRight: 'auto',
        lineHeight: 1.5,
      }}>
        {config.subtitle}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {searchQuery && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClearFilter}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Сбросить поиск
          </motion.button>
        )}

        {config.showCreate && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateOrder}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #D4AF37, #b48e26)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={18} color="#0a0a0c" />
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0a0a0c',
            }}>
              Создать заказ
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  📅 MONTH GROUP HEADER
// ═══════════════════════════════════════════════════════════════════════════════

const MonthGroupHeader = memo(function MonthGroupHeader({
  monthKey,
  count
}: {
  monthKey: string
  count: number
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 0',
      marginBottom: 8,
      marginTop: 16,
    }}>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'rgba(212,175,55,0.7)',
        letterSpacing: '0.08em',
      }}>
        {getMonthLabel(monthKey).toUpperCase()}
      </span>
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(90deg, rgba(212,175,55,0.2), transparent)',
      }} />
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-mono)',
      }}>
        {count}
      </span>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  ✨ FLOATING ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingCreateButton = memo(function FloatingCreateButton({
  onClick
}: {
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={prefersReducedMotion ? {} : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Создать новый заказ"
      style={{
        position: 'fixed',
        bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 18,
        border: 'none',
        background: 'linear-gradient(135deg, #D4AF37, #b48e26)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(212,175,55,0.3)',
        zIndex: 100,
      }}
    >
      <Plus size={26} color="#0a0a0c" strokeWidth={2.5} />
    </motion.button>
  )
})

const BatchPaymentBanner = memo(function BatchPaymentBanner({
  count,
  amount,
  onClick,
}: {
  count: number
  amount: number
  onClick: () => void
}) {
  return (
    <motion.button
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%',
        marginBottom: 16,
        padding: '18px 18px 16px',
        borderRadius: 22,
        border: '1px solid rgba(212,175,55,0.2)',
        background: 'linear-gradient(145deg, rgba(32,28,18,0.98), rgba(18,18,20,0.98))',
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 'auto auto -20px -10px',
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 68%)',
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.08))',
          border: '1px solid rgba(212,175,55,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CreditCard size={22} color="#d4af37" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.72)',
            letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            ЕДИНАЯ ОПЛАТА
          </div>
          <div style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 4,
          }}>
            Оплатить {count} {count === 1 ? 'заказ' : count < 5 ? 'заказа' : 'заказов'} сразу
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.45,
          }}>
            Один перевод на {amount.toLocaleString('ru-RU')} ₽ вместо нескольких переходов по карточкам.
          </div>
        </div>

        <div style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #D4AF37, #b48e26)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 8px 18px rgba(212,175,55,0.2)',
        }}>
          <ChevronRight size={18} color="#0a0a0c" />
        </div>
      </div>
    </motion.button>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
//  🏠 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const capability = useCapability()

  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Calculate stats (exclude archived from main counts)
  const stats = useMemo(() => {
    const nonArchived = orders.filter(o => !o.is_archived)
    const archived = orders.filter(o => o.is_archived)
    const active = nonArchived.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
    const needsAction = nonArchived.filter(o => STATUS_CONFIG[o.status]?.needsAction)
    const completed = nonArchived.filter(o => o.status === 'completed')
    const totalValue = nonArchived.reduce((sum, o) => {
      if (!['cancelled', 'rejected'].includes(o.status)) {
        return sum + (o.final_price || o.price || 0)
      }
      return sum
    }, 0)

    return {
      active: active.length,
      action: needsAction.length,
      completed: completed.length,
      all: nonArchived.length,
      archived: archived.length,
      totalValue,
    }
  }, [orders])

  const payableOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.is_archived) return false
      if (!['confirmed', 'waiting_payment'].includes(order.status)) return false
      const remaining = (order.final_price || order.price || 0) - (order.paid_amount || 0)
      return remaining > 0
    })
  }, [orders])

  const batchPaymentTotal = useMemo(() => {
    return payableOrders.reduce((sum, order) => {
      const remaining = (order.final_price || order.price || 0) - (order.paid_amount || 0)
      return sum + Math.max(remaining, 0)
    }, 0)
  }, [payableOrders])

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply filter (archived orders hidden by default, shown only in 'archived' tab)
    if (filter === 'archived') {
      result = result.filter(o => o.is_archived)
    } else {
      // Hide archived from all other views
      result = result.filter(o => !o.is_archived)

      if (filter === 'action') {
        result = result.filter(o => STATUS_CONFIG[o.status]?.needsAction)
      } else if (filter === 'active') {
        result = result.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status))
      } else if (filter === 'completed') {
        result = result.filter(o => o.status === 'completed')
      }
    }

    // Apply search
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(o =>
        o.subject?.toLowerCase().includes(query) ||
        o.topic?.toLowerCase().includes(query) ||
        o.work_type_label?.toLowerCase().includes(query) ||
        o.id.toString().includes(query)
      )
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'deadline': {
          const daysA = getDaysUntilDeadline(a.deadline) ?? 999
          const daysB = getDaysUntilDeadline(b.deadline) ?? 999
          return daysA - daysB
        }
        case 'price':
          return (b.final_price || b.price || 0) - (a.final_price || a.price || 0)
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'priority':
        default: {
          const priorityA = STATUS_CONFIG[a.status]?.priority || 99
          const priorityB = STATUS_CONFIG[b.status]?.priority || 99
          return priorityA - priorityB
        }
      }
    })

    return result
  }, [orders, filter, debouncedSearch, sortBy])

  // Group by month for completed view
  const groupedOrders = useMemo(() => {
    if (filter !== 'completed') return null

    const groups: Record<string, Order[]> = {}
    filteredOrders.forEach(order => {
      const key = getMonthKey(order.created_at)
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    })

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredOrders, filter])

  const handleFilterChange = (newFilter: FilterType) => {
    haptic('light')
    setFilter(newFilter)
  }

  const handleCreateOrder = () => {
    haptic('medium')
    navigate('/create-order')
  }

  const handleBatchPayment = () => {
    if (payableOrders.length < 2) return
    haptic('medium')
    navigate(`/batch-payment?orders=${payableOrders.map(order => order.id).join(',')}`)
  }

  const handleClearFilter = () => {
    haptic('light')
    setSearchQuery('')
    setFilter('all')
  }

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      {/* Premium Background - full width */}
      <div className="page-background">
        <PremiumBackground
          variant="gold"
          intensity="subtle"
          interactive={capability.tier >= 3}
        />
      </div>

      {/* Content with padding */}
      <div className="page-content">

      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'var(--font-serif)',
            color: 'var(--text-main)',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            Портфель
          </h1>
          <p style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            marginTop: 4,
          }}>
            {stats.all} {stats.all === 1 ? 'проект' : stats.all < 5 ? 'проекта' : 'проектов'}
          </p>
        </div>

        {/* Quick create for desktop */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateOrder}
          aria-label="Создать заказ"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid rgba(212,175,55,0.3)',
            background: 'rgba(212,175,55,0.1)',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} color="#d4af37" />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#d4af37',
          }}>
            Создать
          </span>
        </motion.button>
      </motion.div>

      {/* Summary Dashboard */}
      <PortfolioSummary
        totalValue={stats.totalValue}
        activeCount={stats.active}
        actionCount={stats.action}
        completedCount={stats.completed}
        onFilterChange={handleFilterChange}
        currentFilter={filter}
      />

      {payableOrders.length > 1 && (
        <BatchPaymentBanner
          count={payableOrders.length}
          amount={batchPaymentTotal}
          onClick={handleBatchPayment}
        />
      )}

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filter={filter}
        onFilterChange={handleFilterChange}
        counts={stats}
      />

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          filter={filter}
          searchQuery={debouncedSearch}
          onCreateOrder={handleCreateOrder}
          onClearFilter={handleClearFilter}
        />
      ) : groupedOrders ? (
        // Grouped view for completed
        <div>
          {groupedOrders.map(([monthKey, monthOrders]) => (
            <div key={monthKey}>
              <MonthGroupHeader monthKey={monthKey} count={monthOrders.length} />
              {monthOrders.map((order, index) => (
                <OrderCard key={order.id} order={order} index={index} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        // Regular list view
        <div>
          {filteredOrders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
        </div>
      )}

      {/* Floating Create Button */}
      <FloatingCreateButton onClick={handleCreateOrder} />
      </div>{/* End page-content */}
    </div>
  )
}

export default OrdersPage
