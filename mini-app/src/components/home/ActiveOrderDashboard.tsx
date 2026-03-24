import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
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
import { formatOrderDeadlineRu, getOrderHeadlineSafe, stripEmoji } from '../../lib/orderView'
import { ORDER_STATUS_MAP } from './constants'
import { formatMoney } from '../../lib/utils'
import { GoldText, GoldBadge } from '../ui/GoldText'
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
  'confirmed',
  'paid',
  'paid_full',
  'in_progress',
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
  if (['pending', 'waiting_estimation', 'waiting_payment', 'verification_pending'].includes(status)) return 0
  if (['confirmed', 'paid', 'paid_full'].includes(status)) return 1
  if (['in_progress', 'revision'].includes(status)) return 2
  if (['review', 'completed'].includes(status)) return 3
  return 0
}

function getVisibleOrderStatus(order: Order): string {
  const total = Math.max(0, order.final_price ?? order.price ?? 0)
  const paid = Math.max(0, order.paid_amount ?? 0)
  const remaining = Math.max(0, total - paid)

  if (paid > 0 && remaining > 0 && ['waiting_payment', 'confirmed', 'verification_pending'].includes(order.status)) {
    return 'paid'
  }

  if (paid > 0 && remaining <= 0 && ['waiting_payment', 'confirmed', 'verification_pending', 'paid'].includes(order.status)) {
    return 'paid_full'
  }

  return order.status
}

function getStatusNarrative(status: string, remaining: number, paid: number, progress?: number): string {
  switch (status) {
    case 'pending':
      return 'Заявка принята.'
    case 'waiting_estimation':
      return 'Готовим расчёт.'
    case 'waiting_payment':
      return paid > 0 ? `Осталось внести ${formatMoney(remaining)}.` : 'Ожидает оплаты.'
    case 'verification_pending':
      return 'Подтверждаем оплату.'
    case 'confirmed':
    case 'paid':
      return remaining > 0 ? 'Аванс внесён.' : 'Оплата принята.'
    case 'paid_full':
    case 'in_progress':
      return progress ? `Готовность около ${progress}%.` : 'Работа в процессе.'
    case 'review':
      return 'Материал готов.'
    case 'revision':
      return 'Идёт доработка.'
    default:
      return 'Все детали внутри заказа.'
  }
}

function getPrimaryAction(status: string, hasPartialPayment: boolean): string {
  switch (status) {
    case 'waiting_payment':
      return hasPartialPayment ? 'Доплатить остаток' : 'Перейти к оплате'
    case 'waiting_estimation':
      return 'Открыть заказ'
    case 'verification_pending':
      return 'Открыть заказ'
    case 'review':
      return 'Открыть результат'
    case 'revision':
      return 'Посмотреть правки'
    default:
      return 'Открыть заказ'
  }
}

const ACTION_NEEDED_STATUSES = ['waiting_payment', 'waiting_estimation', 'review', 'revision']

/* ═══════════════════════════════════════════════════════════════
   Animated shimmer line that sweeps across the card
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
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.04), rgba(255,255,255,0.02), transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   Animated gold border — breathing glow
   ═══════════════════════════════════════════════════════════════ */
function AnimatedGoldBorder({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <motion.div
      animate={{
        opacity: [0.4, 0.8, 0.4],
      }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: -1,
        borderRadius: 14,
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
   Stage progress — animated dots with pulse on active stage
   ═══════════════════════════════════════════════════════════════ */
function StageProgress({ stageIdx }: { stageIdx: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      {STAGES.map((stage, index) => {
        const completed = index < stageIdx
        const active = index === stageIdx
        const future = index > stageIdx
        const StageIcon = stage.icon

        return (
          <React.Fragment key={stage.key}>
            {/* Connector line before (except first) */}
            {index > 0 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: completed || active
                    ? 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.3))'
                    : 'rgba(255,255,255,0.06)',
                  transition: 'background 0.5s ease',
                }}
              />
            )}

            {/* Stage node */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                position: 'relative',
              }}
            >
              {/* Pulse ring for active stage */}
              {active && (
                <motion.div
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.4, 0, 0.4],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid rgba(212,175,55,0.3)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Icon circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: active ? [1, 1.08, 1] : 1,
                }}
                transition={active ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: completed
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(183,142,38,0.15))'
                    : active
                      ? 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(183,142,38,0.10))'
                      : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${
                    completed
                      ? 'rgba(212,175,55,0.35)'
                      : active
                        ? 'rgba(212,175,55,0.25)'
                        : 'rgba(255,255,255,0.06)'
                  }`,
                  boxShadow: active
                    ? '0 0 12px rgba(212,175,55,0.15)'
                    : 'none',
                  transition: 'all 0.4s ease',
                }}
              >
                <StageIcon
                  size={12}
                  strokeWidth={2}
                  style={{
                    color: completed || active
                      ? 'var(--gold-400)'
                      : 'rgba(255,255,255,0.20)',
                    transition: 'color 0.4s ease',
                  }}
                />
              </motion.div>

              {/* Label */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 600,
                  letterSpacing: '0.04em',
                  color: completed
                    ? 'rgba(212,175,55,0.6)'
                    : active
                      ? 'var(--gold-400)'
                      : future
                        ? 'rgba(255,255,255,0.18)'
                        : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.4s ease',
                }}
              >
                {stage.label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export const ActiveOrderDashboard = memo(function ActiveOrderDashboard({
  orders,
  onNavigate,
  haptic,
}: ActiveOrderDashboardProps) {
  const { activeOrder, otherActiveCount } = useMemo(() => {
    const priority: Record<string, number> = {
      waiting_payment: 1,
      review: 2,
      revision: 3,
      waiting_estimation: 4,
      in_progress: 5,
      paid: 6,
      paid_full: 6,
      confirmed: 7,
      verification_pending: 8,
      pending: 9,
    }

    const active = orders
      .filter((order) => ACTIVE_STATUSES.includes(order.status))
      .sort((a, b) => (priority[a.status] ?? 99) - (priority[b.status] ?? 99))

    return {
      activeOrder: active[0] || null,
      otherActiveCount: Math.max(0, active.length - 1),
    }
  }, [orders])

  if (!activeOrder) return null

  const visibleStatus = getVisibleOrderStatus(activeOrder)
  const stageIdx = getStageIndex(visibleStatus)
  const statusInfo = ORDER_STATUS_MAP[visibleStatus]
  const total = Math.max(0, activeOrder.final_price ?? activeOrder.price ?? 0)
  const paid = Math.max(0, activeOrder.paid_amount ?? 0)
  const remaining = Math.max(0, total - paid)
  const hasPartialPayment = paid > 0 && remaining > 0
  const workType = stripEmoji(activeOrder.work_type_label ?? activeOrder.work_type ?? 'Заказ')
  const headline = getOrderHeadlineSafe(activeOrder)
  const deadlineText = activeOrder.deadline ? formatOrderDeadlineRu(activeOrder.deadline) : 'Срок уточняется'
  const needsAction = ACTION_NEEDED_STATUSES.includes(visibleStatus)
  const narrative = getStatusNarrative(visibleStatus, remaining, paid, activeOrder.progress)
  const primaryAction = getPrimaryAction(visibleStatus, hasPartialPayment)
  const footerHint = otherActiveCount > 0
    ? `Ещё ${otherActiveCount} ${otherActiveCount === 1 ? 'заказ' : otherActiveCount < 5 ? 'заказа' : 'заказов'} в работе`
    : null

  const financeAmount = total <= 0 ? 'Уточняется' : remaining > 0 ? formatMoney(remaining) : formatMoney(total)

  return (
    <Reveal animation="spring" delay={0.1} style={{ marginBottom: 16 }}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={() => {
          haptic('light')
          onNavigate(`/order/${activeOrder.id}`)
        }}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          padding: 0,
          borderRadius: 14,
          background: 'linear-gradient(165deg, rgba(18,16,12,0.98) 0%, rgba(10,10,11,0.99) 40%, rgba(6,6,8,1) 100%)',
          border: needsAction ? 'none' : '1px solid rgba(255,255,255,0.05)',
          textAlign: 'left',
          cursor: 'pointer',
          appearance: 'none',
          overflow: 'hidden',
          boxShadow: needsAction
            ? '0 0 40px -10px rgba(212,175,55,0.12), 0 20px 50px -20px rgba(0,0,0,0.8)'
            : '0 20px 50px -20px rgba(0,0,0,0.7)',
        }}
      >
        {/* Animated gold border for action-needed */}
        <AnimatedGoldBorder active={needsAction} />

        {/* Shimmer sweep across card */}
        <ShimmerSweep />

        {/* Subtle inner glow at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: 80,
            background: needsAction
              ? 'radial-gradient(ellipse at top, rgba(212,175,55,0.06) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at top, rgba(255,255,255,0.02) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* ─── Zone 1: Identity ─── */}
        <div style={{ padding: '20px 20px 16px', position: 'relative', zIndex: 3 }}>
          {/* Work type + status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles
                size={11}
                strokeWidth={2}
                style={{ color: 'rgba(212,175,55,0.4)' }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.45)',
                }}
              >
                {workType} #{activeOrder.id}
              </span>
            </div>

            {needsAction ? (
              <GoldBadge>{statusInfo?.label ?? visibleStatus}</GoldBadge>
            ) : (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: statusInfo?.bg ?? 'rgba(212,175,55,0.06)',
                  border: `1px solid ${statusInfo?.border ?? 'rgba(212,175,55,0.10)'}`,
                  color: statusInfo?.color ?? 'var(--gold-300)',
                  fontSize: 10,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Animated dot */}
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: statusInfo?.color ?? 'var(--gold-400)',
                  }}
                />
                {statusInfo?.label ?? visibleStatus}
              </motion.span>
            )}
          </div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 21,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            {headline}
          </motion.div>

          {/* Narrative + deadline */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.45,
              color: 'rgba(255,255,255,0.40)',
            }}
          >
            {narrative}{' '}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock3 size={11} strokeWidth={2} style={{ verticalAlign: 'middle', opacity: 0.7 }} />
              {deadlineText}
            </span>
          </div>
        </div>

        {/* ─── Separator ─── */}
        <div
          style={{
            margin: '0 20px',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          }}
        />

        {/* ─── Zone 2: Finance + Progress ─── */}
        <div style={{ padding: '16px 20px', position: 'relative', zIndex: 3 }}>
          {/* Finance row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <GoldText variant="liquid" size="xl" weight={700}>
                {financeAmount}
              </GoldText>
              {remaining > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                  }}
                >
                  к оплате
                </span>
              )}
            </div>

            {hasPartialPayment && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.12)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(74,222,128,0.8)',
                  whiteSpace: 'nowrap',
                }}
              >
                Аванс внесён
              </span>
            )}
          </div>

          {/* Stage progress — animated nodes */}
          <StageProgress stageIdx={stageIdx} />
        </div>

        {/* ─── Separator ─── */}
        <div
          style={{
            margin: '0 20px',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          }}
        />

        {/* ─── Zone 3: Action ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 20px',
            position: 'relative',
            zIndex: 3,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.2,
                color: needsAction ? 'var(--gold-300)' : 'rgba(255,255,255,0.7)',
                marginBottom: footerHint ? 3 : 0,
              }}
            >
              {primaryAction}
            </div>
            {footerHint && (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {footerHint}
              </div>
            )}
          </div>

          {/* Arrow button with gold glow for action-needed */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: needsAction
                ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(183,142,38,0.08))'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${needsAction ? 'rgba(212,175,55,0.20)' : 'rgba(255,255,255,0.06)'}`,
              boxShadow: needsAction
                ? '0 0 20px -4px rgba(212,175,55,0.15)'
                : 'none',
            }}
          >
            <ArrowRight
              size={16}
              strokeWidth={2.2}
              style={{
                color: needsAction ? 'var(--gold-400)' : 'rgba(255,255,255,0.35)',
              }}
            />
          </motion.div>
        </div>
      </motion.button>
    </Reveal>
  )
})
