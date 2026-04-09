import { memo, useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileEdit,
  FolderKanban,
  Sparkles,
} from 'lucide-react'
import { Order } from '../../types'
import {
  canonicalizeOrderStatusAlias,
  formatOrderDeadlineRu,
  getOrderHeadlineSafe,
  parseOrderDateSafe,
  stripEmoji,
} from '../../lib/orderView'
import { ORDER_STATUS_MAP } from './constants'
import { formatMoney } from '../../lib/utils'
import { Reveal } from '../ui/StaggerReveal'

interface ActiveOrderDashboardProps {
  orders: Order[]
  onNavigate: (path: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

const ACTIVE_STATUSES = [
  'pending',
  'waiting_estimation',
  'waiting_payment',
  'verification_pending',
  'paid',
  'paid_full',
  'in_progress',
  'paused',
  'review',
  'revision',
]

const STAGES = [
  { key: 'created', label: 'Заявка', icon: FileEdit },
  { key: 'paid', label: 'Оплата', icon: CreditCard },
  { key: 'working', label: 'Работа', icon: FolderKanban },
  { key: 'done', label: 'Готово', icon: CheckCircle2 },
] as const

function getStageIndex(status: string): number {
  const canonicalStatus = canonicalizeOrderStatusAlias(status) ?? status
  if (['pending', 'waiting_estimation', 'waiting_payment', 'verification_pending'].includes(canonicalStatus)) return 0
  if (['paid', 'paid_full'].includes(canonicalStatus)) return 1
  if (['in_progress', 'revision', 'paused'].includes(canonicalStatus)) return 2
  if (['review', 'completed'].includes(canonicalStatus)) return 3
  return 0
}

function getVisibleOrderStatus(order: Order): string {
  const status = canonicalizeOrderStatusAlias(order.status) ?? order.status
  if (order.current_revision_round?.status === 'open') {
    return 'revision'
  }
  const total = Math.max(0, order.final_price ?? order.price ?? 0)
  const paid = Math.max(0, order.paid_amount ?? 0)
  const remaining = Math.max(0, total - paid)

  if (paid > 0 && remaining > 0 && ['waiting_payment', 'verification_pending'].includes(status)) {
    return 'paid'
  }

  if (paid > 0 && remaining <= 0 && ['waiting_payment', 'verification_pending', 'paid'].includes(status)) {
    return 'paid_full'
  }

  return status
}

function getStatusNarrative(order: Order, status: string, remaining: number, paid: number, progress?: number): string {
  switch (canonicalizeOrderStatusAlias(status) ?? status) {
    case 'pending':
      return 'Заявка принята'
    case 'waiting_estimation':
      return 'Готовим расчёт'
    case 'waiting_payment':
      return paid > 0 ? `Осталось ${formatMoney(remaining)}` : 'Ожидает оплаты'
    case 'verification_pending':
      return 'Подтверждаем оплату'
    case 'paid':
      return remaining > 0 ? 'Аванс внесён' : 'Оплата принята'
    case 'paid_full':
    case 'in_progress':
      return progress ? `Готовность ${progress}%` : 'В работе'
    case 'paused':
      return 'Пауза активна'
    case 'review':
      return order.latest_delivery?.version_number ? `Версия ${order.latest_delivery.version_number} ждёт проверки` : 'Материал готов'
    case 'revision':
      return order.current_revision_round?.round_number ? `Правка #${order.current_revision_round.round_number} в работе` : 'Идёт доработка'
    default:
      return 'Все детали внутри'
  }
}

function getPrimaryAction(order: Order, status: string, hasPartialPayment: boolean): string {
  switch (status) {
    case 'waiting_payment':
      return hasPartialPayment ? 'Доплатить' : 'Оплатить'
    case 'waiting_estimation':
      return 'Подробнее'
    case 'verification_pending':
      return 'Подробнее'
    case 'review':
      return order.latest_delivery?.version_number ? 'Проверить версию' : 'Посмотреть'
    case 'revision':
    case 'paused':
      return status === 'paused' ? 'Возобновить' : order.current_revision_round?.status === 'open' ? 'Чат и файлы' : 'Посмотреть'
    default:
      return 'Открыть'
  }
}

const ACTION_NEEDED_STATUSES = ['waiting_payment', 'waiting_estimation', 'review', 'revision', 'paused']

/* ─── Deadline countdown hook ─── */
function useDeadlineCountdown(deadline: string | null): { text: string; urgency: 'safe' | 'warning' | 'urgent' | 'unknown' } {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!deadline) return { text: 'Срок уточняется', urgency: 'unknown' }

  // Handle text-based deadlines
  const lower = deadline.toLowerCase().trim()
  if (lower === 'today' || lower === 'сегодня') return { text: 'Сегодня', urgency: 'urgent' }
  if (lower === 'tomorrow' || lower === 'завтра') return { text: 'Завтра', urgency: 'warning' }
  if (lower === '3days') return { text: '2–3 дня', urgency: 'safe' }
  if (lower === 'week') return { text: 'Неделя', urgency: 'safe' }
  if (lower === '2weeks') return { text: '2 недели', urgency: 'safe' }
  if (lower === 'month') return { text: 'Месяц+', urgency: 'safe' }

  // Try parsing as date
  const parsed = new Date(deadline)
  if (isNaN(parsed.getTime())) return { text: formatOrderDeadlineRu(deadline), urgency: 'unknown' }

  const diffMs = parsed.getTime() - now
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMs < 0) return { text: 'Просрочено', urgency: 'urgent' }
  if (diffHours < 1) return { text: 'Менее часа', urgency: 'urgent' }
  if (diffHours < 24) {
    const h = Math.floor(diffHours)
    return { text: `${h} ч`, urgency: 'urgent' }
  }
  if (diffDays === 1) return { text: 'Завтра', urgency: 'warning' }
  if (diffDays <= 3) return { text: `${diffDays} дня`, urgency: 'warning' }
  if (diffDays <= 7) return { text: `${diffDays} дней`, urgency: 'safe' }
  return { text: formatOrderDeadlineRu(deadline), urgency: 'safe' }
}

function formatPauseUntilBadge(pauseUntil: string | null | undefined): string {
  const date = parseOrderDateSafe(pauseUntil)
  if (!date) return 'Пауза активна'
  return `До ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
}

/* ─── Live elapsed time for in-progress orders ─── */
function useElapsedTime(updatedAt: string | null | undefined, active: boolean): string | null {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!active || !updatedAt) return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [active, updatedAt])

  if (!active || !updatedAt) return null

  const diffMs = now - new Date(updatedAt).getTime()
  if (diffMs < 60_000) return null
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins} мин`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (hours < 24) return remainMins > 0 ? `${hours}ч ${remainMins}мин` : `${hours}ч`
  const days = Math.floor(hours / 24)
  return `${days}д ${hours % 24}ч`
}

/* ═══════════════════════════════════════════════════════════════
   Animated shimmer line
   ═══════════════════════════════════════════════════════════════ */
function ShimmerSweep() {
  return (
    <motion.div
      animate={{ x: ['-100%', '250%'] }}
      transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.04), rgba(245,235,200,0.02), transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   Animated gold border
   ═══════════════════════════════════════════════════════════════ */
function AnimatedGoldBorder({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: -1,
        borderRadius: 16,
        background: 'conic-gradient(from 45deg, rgba(212,175,55,0.3), rgba(245,225,160,0.15), rgba(212,175,55,0.3), rgba(183,142,38,0.2), rgba(251,245,183,0.15), rgba(212,175,55,0.3))',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        padding: 1,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   Compact progress — segmented bar with stage labels
   Each segment is a stage; completed = gold, active = pulsing, future = dim
   ═══════════════════════════════════════════════════════════════ */
function CompactProgress({ stageIdx }: { stageIdx: number }) {
  // Continuous bar: total 4 stages, fill = (completed stages + 0.5 for active) / total
  const fillPercent = ((stageIdx + 0.5) / STAGES.length) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Continuous progress bar with stage markers */}
      <div style={{
        position: 'relative',
        height: 3,
        borderRadius: 2,
        background: 'rgba(212,175,55,0.06)',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #D4AF37, rgba(245,225,160,0.85))',
            boxShadow: '0 0 8px rgba(212,175,55,0.3)',
          }}
        />
        {/* Stage transition ticks — subtle, flush with bar */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: `${(i / STAGES.length) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: i < stageIdx
                ? '#D4AF37'
                : i === stageIdx
                  ? 'rgba(212,175,55,0.4)'
                  : 'rgba(212,175,55,0.12)',
              border: `1px solid rgba(20,18,14,0.7)`,
              zIndex: 2,
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Stage labels row */}
      <div style={{ display: 'flex' }}>
        {STAGES.map((stage, i) => {
          const completed = i < stageIdx
          const active = i === stageIdx
          const StageIcon = stage.icon

          return (
            <div key={stage.key} style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}>
              <StageIcon
                size={9}
                strokeWidth={2.2}
                style={{
                  color: completed || active ? 'var(--gold-400)' : 'rgba(212,175,55,0.15)',
                  transition: 'color 0.3s',
                }}
              />
              <span style={{
                fontSize: 9,
                fontWeight: active ? 700 : 600,
                color: active
                  ? 'var(--gold-400)'
                  : completed
                    ? 'rgba(212,175,55,0.55)'
                    : 'rgba(212,175,55,0.15)',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
              }}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Urgency color helper
   ═══════════════════════════════════════════════════════════════ */
const URGENCY_COLORS = {
  safe: { text: 'rgba(74,222,128,0.85)', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)' },
  warning: { text: 'rgba(251,191,36,0.9)', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)' },
  urgent: { text: 'rgba(248,113,113,0.9)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' },
  unknown: { text: 'rgba(245,235,200,0.40)', bg: 'rgba(212,175,55,0.04)', border: 'rgba(212,175,55,0.06)' },
}
const PAUSE_COLORS = {
  text: 'rgba(212,175,55,0.92)',
  bg: 'rgba(212,175,55,0.08)',
  border: 'rgba(212,175,55,0.16)',
}

/* ═══════════════════════════════════════════════════════════════
   Single order card
   ═══════════════════════════════════════════════════════════════ */
function OrderCard({
  order,
  onNavigate,
  haptic,
}: {
  order: Order
  onNavigate: (path: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}) {
  const visibleStatus = getVisibleOrderStatus(order)
  const stageIdx = getStageIndex(visibleStatus)
  const statusInfo = ORDER_STATUS_MAP[visibleStatus]
  const total = Math.max(0, order.final_price ?? order.price ?? 0)
  const paid = Math.max(0, order.paid_amount ?? 0)
  const remaining = Math.max(0, total - paid)
  const hasPartialPayment = paid > 0 && remaining > 0
  const workType = stripEmoji(order.work_type_label ?? order.work_type ?? 'Заказ')
  const headline = getOrderHeadlineSafe(order)
  const subline = order.subject && order.subject !== headline ? order.subject : null
  const deadlineState = useDeadlineCountdown(order.deadline)
  const needsAction = ACTION_NEEDED_STATUSES.includes(visibleStatus)
  const narrative = getStatusNarrative(order, visibleStatus, remaining, paid, order.progress)
  const primaryAction = getPrimaryAction(order, visibleStatus, hasPartialPayment)
  const isWorking = ['in_progress', 'revision'].includes(visibleStatus)
  const elapsed = useElapsedTime(order.updated_at, isWorking)
  const deadlineText = visibleStatus === 'paused' ? formatPauseUntilBadge(order.pause_until) : deadlineState.text
  const urgencyColors = visibleStatus === 'paused' ? PAUSE_COLORS : URGENCY_COLORS[deadlineState.urgency]
  const financeAmount = total <= 0 ? null : remaining > 0 ? formatMoney(remaining) : formatMoney(total)

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={() => {
        haptic('light')
        onNavigate(`/order/${order.id}`)
      }}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        padding: 0,
        borderRadius: 16,
        background: 'linear-gradient(165deg, rgba(18,16,12,0.98) 0%, rgba(12,11,10,0.99) 40%, rgba(8,7,6,1) 100%)',
        border: needsAction ? 'none' : '1px solid rgba(212,175,55,0.06)',
        textAlign: 'left',
        cursor: 'pointer',
        appearance: 'none',
        overflow: 'hidden',
        boxShadow: needsAction
          ? '0 0 40px -10px rgba(212,175,55,0.12), 0 20px 50px -20px rgba(0,0,0,0.8)'
          : '0 20px 50px -20px rgba(0,0,0,0.7)',
      }}
    >
      <AnimatedGoldBorder active={needsAction} />
      <ShimmerSweep />

      {/* Inner glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 80,
          background: needsAction
            ? 'radial-gradient(ellipse at top, rgba(212,175,55,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at top, rgba(212,175,55,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ─── Zone 1: Title + Subject (hero) ─── */}
      <div style={{ padding: '20px 20px 0', position: 'relative', zIndex: 3 }}>
        {/* Work type label + order id */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          <Sparkles size={10} strokeWidth={2.2} style={{ color: 'rgba(212,175,55,0.4)', flexShrink: 0 }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.40)',
          }}>
            {workType} #{order.id}
          </span>
        </div>

        {/* Headline — the main attention grabber */}
        <div style={{
          fontFamily: "var(--font-display, 'Playfair Display', serif)",
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          color: 'rgba(245, 240, 225, 0.92)',
          marginBottom: subline ? 4 : 0,
        }}>
          {headline}
        </div>

        {/* Subject subline */}
        {subline && (
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(245,235,200,0.38)',
            lineHeight: 1.3,
          }}>
            {subline}
          </div>
        )}
      </div>

      {/* ─── Zone 2: Status + Deadline — the key info strip ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 20px 14px',
        position: 'relative',
        zIndex: 3,
      }}>
        {/* Status pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 999,
          background: needsAction ? 'rgba(212,175,55,0.08)' : (statusInfo?.bg ?? 'rgba(212,175,55,0.06)'),
          border: `1px solid ${needsAction ? 'rgba(212,175,55,0.15)' : (statusInfo?.border ?? 'rgba(212,175,55,0.10)')}`,
        }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: statusInfo?.color ?? 'var(--gold-400)',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: statusInfo?.color ?? 'var(--gold-300)',
            whiteSpace: 'nowrap',
          }}>
            {narrative}
          </span>
        </div>

        {/* Deadline pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 999,
          background: urgencyColors.bg,
          border: `1px solid ${urgencyColors.border}`,
        }}>
          <Clock3 size={10} strokeWidth={2.2} style={{ color: urgencyColors.text, flexShrink: 0 }} />
          <span style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: urgencyColors.text,
            whiteSpace: 'nowrap',
          }}>
            {deadlineText}
          </span>
        </div>

        {/* Elapsed time badge */}
        {elapsed && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(212,175,55,0.40)',
            whiteSpace: 'nowrap',
            marginLeft: 'auto',
          }}>
            {elapsed}
          </span>
        )}
      </div>

      {/* ─── Zone 3: Compact progress bar ─── */}
      <div style={{
        padding: '0 20px 14px',
        position: 'relative',
        zIndex: 3,
      }}>
        <CompactProgress stageIdx={stageIdx} />
      </div>

      {/* ─── Zone 4: Action footer — CTA with integrated price ─── */}
      <div style={{
        padding: '0 20px 16px',
        position: 'relative',
        zIndex: 3,
      }}>
        {/* Separator */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.06), transparent)',
          marginBottom: 14,
        }} />

        {/* Full-width CTA — price integrated into button for payment states */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: needsAction ? '14px 20px' : '10px 16px',
            borderRadius: 12,
            background: needsAction
              ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)'
              : 'rgba(212,175,55,0.04)',
            border: needsAction ? 'none' : '1px solid rgba(212,175,55,0.08)',
            boxShadow: needsAction
              ? '0 0 30px -5px rgba(212,175,55,0.5), 0 10px 30px -10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(252,246,186,0.4), inset 0 -2px 4px rgba(0,0,0,0.1)'
              : 'none',
          }}
        >
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: needsAction ? 'rgba(15,12,8,0.92)' : 'rgba(245,235,200,0.55)',
            letterSpacing: '0.01em',
          }}>
            {needsAction && financeAmount
              ? order.payment_scheme === 'half' && !hasPartialPayment && remaining === total
                ? `Внести аванс · ${formatMoney(Math.ceil(total / 2))}`
                : `${primaryAction} · ${financeAmount}`
              : primaryAction}
          </span>
          <ArrowRight
            size={15}
            strokeWidth={2.5}
            style={{ color: needsAction ? 'rgba(15,12,8,0.70)' : 'rgba(245,235,200,0.40)' }}
          />
        </motion.div>

        {/* Partial payment badge — below button */}
        {hasPartialPayment && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 8,
          }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.12)',
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(74,222,128,0.8)',
              whiteSpace: 'nowrap',
            }}>
              аванс внесён
            </span>
          </div>
        )}
      </div>
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Dot pagination — max 5 visible dots, scales down for many
   ═══════════════════════════════════════════════════════════════ */
const MAX_DOTS = 5

function DotIndicator({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null

  // Always show dots (max 5 visible), no text counter
  const visible = Math.min(count, MAX_DOTS)
  // For many orders, shift the window so active dot stays centered
  let start = 0
  if (count > MAX_DOTS) {
    start = Math.min(Math.max(0, active - Math.floor(MAX_DOTS / 2)), count - MAX_DOTS)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 10 }}>
      {Array.from({ length: visible }, (_, i) => {
        const idx = start + i
        return (
          <motion.div
            key={idx}
            animate={{ width: idx === active ? 16 : 6, opacity: idx === active ? 1 : 0.35 }}
            transition={{ duration: 0.2 }}
            style={{ height: 3.5, borderRadius: 2, background: idx === active ? 'var(--gold-400)' : 'rgba(212,175,55,0.15)' }}
          />
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   "See all orders" footer link (for 3+ orders)
   ═══════════════════════════════════════════════════════════════ */
function SeeAllOrdersLink({
  count,
  onNavigate,
  haptic,
}: {
  count: number
  onNavigate: (path: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}) {
  if (count < 3) return null

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => { haptic('light'); onNavigate('/orders') }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: '10px 0 2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        appearance: 'none',
      }}
    >
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'rgba(212,175,55,0.35)',
        letterSpacing: '0.01em',
      }}>
        Все заказы
      </span>
      <ArrowRight size={12} strokeWidth={2} style={{ color: 'rgba(212,175,55,0.25)' }} />
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Swipeable carousel of active orders
   ═══════════════════════════════════════════════════════════════ */
export const ActiveOrderDashboard = memo(function ActiveOrderDashboard({
  orders,
  onNavigate,
  haptic,
}: ActiveOrderDashboardProps) {
  const activeOrders = useMemo(() => {
    const priority: Record<string, number> = {
      waiting_payment: 1,
      review: 2,
      paused: 3,
      revision: 4,
      waiting_estimation: 5,
      in_progress: 6,
      paid: 7,
      paid_full: 7,
      verification_pending: 9,
      pending: 10,
    }

    return orders
      .filter((order) => ACTIVE_STATUSES.includes(canonicalizeOrderStatusAlias(order.status) ?? order.status))
      .sort((a, b) => {
        const aStatus = canonicalizeOrderStatusAlias(a.status) ?? a.status
        const bStatus = canonicalizeOrderStatusAlias(b.status) ?? b.status
        return (priority[aStatus] ?? 99) - (priority[bStatus] ?? 99)
      })
  }, [orders])

  const [currentIndex, setCurrentIndex] = useState(0)
  const safeIndex = Math.min(currentIndex, Math.max(0, activeOrders.length - 1))

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    if (info.offset.x < -threshold && safeIndex < activeOrders.length - 1) {
      haptic('light')
      setCurrentIndex(safeIndex + 1)
    } else if (info.offset.x > threshold && safeIndex > 0) {
      haptic('light')
      setCurrentIndex(safeIndex - 1)
    }
  }, [safeIndex, activeOrders.length, haptic])

  if (activeOrders.length === 0) return null

  // Single order — just the card, no chrome
  if (activeOrders.length === 1) {
    return (
      <Reveal animation="spring" delay={0.1} style={{ marginBottom: 16 }}>
        <OrderCard
          order={activeOrders[0]}
          onNavigate={onNavigate}
          haptic={haptic}
        />
      </Reveal>
    )
  }

  // Multiple orders — swipe carousel with smart pagination
  return (
    <Reveal animation="spring" delay={0.1} style={{ marginBottom: 16 }}>
      <div style={{ position: 'relative' }}>
        {/* Swipeable area */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ touchAction: 'pan-y' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={safeIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <OrderCard
                order={activeOrders[safeIndex]}
                onNavigate={onNavigate}
                haptic={haptic}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Pagination: dots for ≤5, counter for 6+ */}
        <DotIndicator count={activeOrders.length} active={safeIndex} />

        {/* "See all" link for 3+ orders */}
        <SeeAllOrdersLink count={activeOrders.length} onNavigate={onNavigate} haptic={haptic} />
      </div>
    </Reveal>
  )
})
