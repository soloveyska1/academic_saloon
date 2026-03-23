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

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
}

function getFinanceHero(total: number, paid: number, remaining: number, stageSummary: string, deadlineText: string) {
  if (total <= 0) {
    return {
      eyebrow: 'Расчёт',
      value: 'Уточняется',
      supporting: 'Стоимость и точный объём покажем после расчёта.',
      accent: false,
      details: [
        { label: 'Этап', value: stageSummary },
        { label: 'Срок', value: deadlineText },
      ],
    }
  }

  if (paid > 0 && remaining > 0) {
    return {
      eyebrow: 'К доплате',
      value: formatMoney(remaining),
      supporting: 'Аванс уже принят, заказ движется по плану.',
      accent: true,
      details: [
        { label: 'Внесено', value: formatMoney(paid) },
        { label: 'Полная сумма', value: formatMoney(total) },
      ],
    }
  }

  if (remaining > 0) {
    return {
      eyebrow: 'К оплате',
      value: formatMoney(remaining),
      supporting: 'После подтверждения оплаты сразу запускаем следующий этап.',
      accent: true,
      details: [
        { label: 'Полная сумма', value: formatMoney(total) },
        { label: 'Срок', value: deadlineText },
      ],
    }
  }

  return {
    eyebrow: 'Оплачено',
    value: formatMoney(total),
    supporting: 'Финансовый этап закрыт, дальше только работа по заказу.',
    accent: false,
    details: [
      { label: 'Этап', value: stageSummary },
      { label: 'Срок', value: deadlineText },
    ],
  }
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
  const financeHero = getFinanceHero(total, paid, remaining, stageSummary, deadlineText)
  const footerHint = otherActiveCount > 0
    ? `Ещё ${otherActiveCount} ${otherActiveCount === 1 ? 'заказ' : otherActiveCount < 5 ? 'заказа' : 'заказов'} в работе.`
    : needsAction
      ? financeSummary
      : 'Чат, файлы и все статусы собраны внутри заказа.'

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
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 6,
              top: -8,
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 110,
              lineHeight: 0.84,
              color: 'rgba(212,175,55,0.05)',
              letterSpacing: '-0.08em',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            #{activeOrder.id}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(212, 175, 55, 0.72)',
                  marginBottom: 8,
                }}
              >
                {workType}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 31,
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
                  marginBottom: 12,
                }}
              >
                {narrative}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(255,255,255,0.56)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Clock3 size={14} color="var(--gold-300)" strokeWidth={1.9} />
                {deadlineText}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
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

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.48)',
                  textAlign: 'right',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                #{activeOrder.id}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(116px, 0.8fr)',
              gap: 16,
              padding: '16px 0 18px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.34)',
                  marginBottom: 8,
                }}
              >
                {financeHero.eyebrow}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 42,
                  lineHeight: 0.9,
                  letterSpacing: '-0.06em',
                  color: financeHero.accent ? 'var(--gold-300)' : 'var(--text-primary)',
                  marginBottom: 8,
                  wordBreak: 'break-word',
                }}
              >
                {financeHero.value}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  maxWidth: 300,
                }}
              >
                {financeHero.supporting}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              {hasPartialPayment && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gold-300)',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    marginBottom: 12,
                  }}
                >
                  Аванс внесён
                </div>
              )}

              {financeHero.details.map((item) => (
                <div
                  key={item.label}
                  style={{
                    minWidth: 0,
                    paddingTop: 12,
                    marginTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.32)',
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: 'var(--text-primary)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '0 2px',
              marginBottom: 16,
            }}
          >
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
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.32)',
                }}
              >
                Этап заказа
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                }}
              >
                {stageSummary}
              </div>
            </div>

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
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: needsAction ? 'var(--gold-300)' : 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {primaryAction}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: 'var(--text-secondary)',
                }}
              >
                {footerHint}
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
