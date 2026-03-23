import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileEdit,
  FolderKanban,
  Sparkles,
} from 'lucide-react'
import { Order } from '../../types'
import { formatOrderDeadlineRu, getOrderHeadlineSafe, stripEmoji } from '../../lib/orderView'
import { ORDER_STATUS_MAP } from './constants'

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
      return 'Готовим оценку.'
    case 'waiting_payment':
      return paid > 0 ? `Осталось доплатить ${formatMoney(remaining)}.` : 'Оплатите, чтобы закрепить заказ.'
    case 'verification_pending':
      return 'Подтверждаем перевод.'
    case 'confirmed':
    case 'paid':
      return remaining > 0 ? 'Аванс принят. Готовим запуск.' : 'Оплата принята. Заказ закреплён.'
    case 'paid_full':
    case 'in_progress':
      return progress ? `Готовность около ${progress}%.` : 'Работа в процессе.'
    case 'review':
      return 'Материал готов к просмотру.'
    case 'revision':
      return 'Вносим правки.'
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

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
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
  const needsAction = ['waiting_payment', 'waiting_estimation', 'review', 'revision'].includes(visibleStatus)
  const financeSummary = remaining > 0 && paid > 0
    ? `Оплачено ${formatMoney(paid)} · Осталось ${formatMoney(remaining)}`
    : remaining > 0 && paid === 0
      ? `К оплате ${formatMoney(remaining)}`
      : 'Оплачено полностью'
  const stageSummary = STAGES[stageIdx]?.label ?? 'Заявка'
  const narrative = getStatusNarrative(visibleStatus, remaining, paid, activeOrder.progress)
  const primaryAction = getPrimaryAction(visibleStatus, hasPartialPayment)
  const highlightAmount = hasPartialPayment ? formatMoney(remaining) : remaining > 0 && visibleStatus === 'waiting_payment' ? formatMoney(remaining) : null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 18 }}
    >
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
          padding: '24px 20px 20px',
          borderRadius: 30,
          background: needsAction
            ? 'linear-gradient(160deg, rgba(35, 28, 14, 0.98) 0%, rgba(16, 16, 16, 0.96) 46%, rgba(8, 8, 10, 1) 100%)'
            : 'linear-gradient(160deg, rgba(24, 21, 14, 0.96) 0%, rgba(14, 14, 15, 0.98) 48%, rgba(8, 8, 10, 1) 100%)',
          border: `1px solid ${needsAction ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)'}`,
          boxShadow: '0 34px 70px -44px rgba(0, 0, 0, 0.88)',
          textAlign: 'left',
          cursor: 'pointer',
          appearance: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -88,
            right: -44,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: needsAction
              ? 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 28%, transparent 72%)'
              : 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 28%, transparent 72%)',
            pointerEvents: 'none',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 18%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
              >
                <Sparkles size={12} color="var(--gold-300)" strokeWidth={1.9} />
                Активный заказ
              </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 999,
                background: statusInfo?.bg ?? 'var(--gold-glass-medium)',
                border: `1px solid ${statusInfo?.border ?? 'var(--gold-glass-strong)'}`,
                color: statusInfo?.color ?? 'var(--gold-300)',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
                {statusInfo?.label ?? visibleStatus}
              </span>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(212, 175, 55, 0.72)',
                marginBottom: 10,
              }}
            >
              {workType}
            </div>

            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 30,
                lineHeight: 0.96,
                letterSpacing: '-0.05em',
                color: 'var(--text-primary)',
                marginBottom: 10,
              }}
            >
              {headline}
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
                maxWidth: 320,
              }}
            >
              {narrative}
            </div>
          </div>

          <div
            style={{
              padding: '16px 16px 15px',
              borderRadius: 22,
              marginBottom: 16,
              background: needsAction
                ? 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(14,12,10,0.44) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(14,12,10,0.44) 100%)',
              border: `1px solid ${needsAction ? 'rgba(212,175,55,0.13)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.38)',
                    marginBottom: 8,
                  }}
                >
                  Следующий шаг
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: needsAction ? 'var(--gold-300)' : 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {primaryAction}
                </div>
              </div>

              {highlightAmount && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.32)',
                      marginBottom: 4,
                    }}
                  >
                    {hasPartialPayment ? 'Остаток' : 'Сумма'}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--gold-300)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {highlightAmount}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: 'Срок',
                value: deadlineText,
                hint: `Этап: ${stageSummary.toLowerCase()}`,
                icon: Clock3,
              },
              {
                label: hasPartialPayment ? 'Оплата' : remaining > 0 ? 'Финансы' : 'Оплата',
                value: hasPartialPayment ? `Аванс ${formatMoney(paid)}` : financeSummary,
                hint: hasPartialPayment
                  ? `Осталось ${formatMoney(remaining)}`
                  : total > 0 ? `Бюджет ${formatMoney(total)}` : 'Сумма уточняется',
                icon: CircleDollarSign,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  style={{
                    padding: '16px 14px 14px',
                    borderRadius: 22,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      marginBottom: 12,
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.10)',
                    }}
                  >
                    <Icon size={16} color="var(--gold-300)" strokeWidth={1.9} />
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      marginBottom: 8,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.hint}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
                gap: 8,
                marginBottom: 8,
              }}
            >
              {STAGES.map((stage, index) => (
                <div
                  key={stage.key}
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: index <= stageIdx
                      ? 'linear-gradient(90deg, rgba(212,175,55,0.96), rgba(247,223,150,0.72))'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: index === stageIdx ? '0 0 18px rgba(212,175,55,0.2)' : 'none',
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
                gap: 8,
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 14px 14px 16px',
              borderRadius: 22,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                Открыть заказ
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: 'var(--text-secondary)',
                }}
              >
                {otherActiveCount > 0
                  ? `Ещё ${otherActiveCount} ${otherActiveCount === 1 ? 'заказ' : otherActiveCount < 5 ? 'заказа' : 'заказов'} в списке.`
                  : 'Чат, файлы и финансы внутри карточки.'}
              </div>
            </div>

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.84))',
                color: 'var(--text-on-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 18px 28px -20px rgba(212, 175, 55, 0.48)',
              }}
            >
              <ArrowRight size={18} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </motion.button>
    </motion.section>
  )
})
