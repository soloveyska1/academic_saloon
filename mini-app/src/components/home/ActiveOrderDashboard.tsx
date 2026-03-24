import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileEdit,
  FolderKanban,
} from 'lucide-react'
import { Order } from '../../types'
import { formatOrderDeadlineRu, getOrderHeadlineSafe, stripEmoji } from '../../lib/orderView'
import { ORDER_STATUS_MAP } from './constants'
import { formatMoney } from '../../lib/utils'
import { GoldText, GoldBadge, LiquidGoldButton } from '../ui/GoldText'
import { TiltCard } from '../ui/TiltCard'
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

  // Finance display
  const financeAmount = total <= 0 ? 'Уточняется' : remaining > 0 ? formatMoney(remaining) : formatMoney(total)

  return (
    <Reveal animation="spring" delay={0.1} style={{ marginBottom: 16 }}>
      <TiltCard tiltMaxAngle={5} style={{ borderRadius: 12 }}>
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
            borderRadius: 12,
            background: needsAction
              ? 'linear-gradient(155deg, rgba(30,24,12,0.98) 0%, rgba(14,14,15,0.97) 50%, rgba(8,8,10,1) 100%)'
              : 'linear-gradient(155deg, rgba(20,18,14,0.97) 0%, rgba(12,12,13,0.98) 50%, rgba(8,8,10,1) 100%)',
            border: `1px solid ${needsAction ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: '0 24px 48px -32px rgba(0,0,0,0.8)',
            textAlign: 'left',
            cursor: 'pointer',
            appearance: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Gold top accent line for action-needed */}
          {needsAction && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
              }}
            />
          )}

          {/* ─── Zone 1: Identity (top) ─── */}
          <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Work type + status row */}
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
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.55)',
                }}
              >
                {workType} #{activeOrder.id}
              </div>

              {needsAction ? (
                <GoldBadge>{statusInfo?.label ?? visibleStatus}</GoldBadge>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: statusInfo?.bg ?? 'rgba(212,175,55,0.08)',
                    border: `1px solid ${statusInfo?.border ?? 'rgba(212,175,55,0.14)'}`,
                    color: statusInfo?.color ?? 'var(--gold-300)',
                    fontSize: 10,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusInfo?.label ?? visibleStatus}
                </span>
              )}
            </div>

            {/* Headline */}
            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {headline}
            </div>

            {/* Narrative + deadline */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
              }}
            >
              {narrative}{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock3 size={12} strokeWidth={2} style={{ verticalAlign: 'middle' }} />
                {deadlineText}
              </span>
            </div>
          </div>

          {/* ─── Zone 2: Finance (middle) ─── */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(255,255,255,0.015)',
            }}
          >
            {/* Finance row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <GoldText variant="liquid" size="2xl" weight={700}>
                {financeAmount}
              </GoldText>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.34)',
                }}
              >
                К ОПЛАТЕ
              </span>

              {hasPartialPayment && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--gold-300)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Аванс внесён
                </span>
              )}
            </div>

            {/* Stage progress bar */}
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {STAGES.map((stage, index) => (
                  <div
                    key={stage.key}
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background: index <= stageIdx
                        ? 'linear-gradient(90deg, rgba(212,175,55,0.9), rgba(245,225,160,0.7))'
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: index === stageIdx ? '0 0 12px rgba(212,175,55,0.2)' : 'none',
                      transition: 'background 0.3s ease',
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
                  gap: 6,
                }}
              >
                {STAGES.map((stage, index) => (
                  <div
                    key={stage.key}
                    style={{
                      fontSize: 10,
                      fontWeight: index === stageIdx ? 700 : 600,
                      color: index <= stageIdx ? 'var(--gold-300)' : 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    {stage.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Zone 3: Action (bottom) ─── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '16px 20px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: needsAction ? 'var(--gold-300)' : 'var(--text-primary)',
                  marginBottom: footerHint ? 3 : 0,
                }}
              >
                {primaryAction}
              </div>
              {footerHint && (
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {footerHint}
                </div>
              )}
            </div>

            {needsAction ? (
              <LiquidGoldButton
                fullWidth={false}
                onClick={(e) => {
                  e.stopPropagation()
                  haptic('medium')
                  onNavigate(`/order/${activeOrder.id}`)
                }}
                style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  borderRadius: 12,
                  flexShrink: 0,
                }}
              >
                <ArrowRight size={18} strokeWidth={2.2} />
              </LiquidGoldButton>
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowRight size={18} strokeWidth={2.2} />
              </div>
            )}
          </div>
        </motion.button>
      </TiltCard>
    </Reveal>
  )
})
