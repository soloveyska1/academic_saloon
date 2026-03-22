import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileEdit,
  Loader2,
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
  { key: 'created', label: 'Создан', icon: FileEdit },
  { key: 'paid', label: 'Оплачен', icon: CircleDollarSign },
  { key: 'working', label: 'В работе', icon: Loader2 },
  { key: 'done', label: 'Готово', icon: CheckCircle2 },
] as const

function getStageIndex(status: string): number {
  if (['pending', 'waiting_estimation', 'waiting_payment', 'verification_pending'].includes(status)) return 0
  if (['confirmed', 'paid', 'paid_full'].includes(status)) return 1
  if (['in_progress', 'revision'].includes(status)) return 2
  if (['review', 'completed'].includes(status)) return 3
  return 0
}

function getStatusMessage(status: string, progress?: number): string {
  switch (status) {
    case 'pending':
      return 'Менеджер формирует персональное предложение по заказу.'
    case 'waiting_estimation':
      return 'Уточняем детали, чтобы назвать точную стоимость и срок.'
    case 'waiting_payment':
      return 'Осталось подтвердить оплату, и работа сразу уйдёт в производство.'
    case 'verification_pending':
      return 'Платёж уже принят, сейчас его подтверждает менеджер.'
    case 'confirmed':
    case 'paid':
    case 'paid_full':
      return 'Заказ закреплён, готовим исполнителя и материалы.'
    case 'in_progress':
      return progress ? `Работа выполнена примерно на ${progress}%.` : 'Эксперт уже работает над заказом.'
    case 'review':
      return 'Результат готов. Проверьте материал и дайте обратную связь.'
    case 'revision':
      return 'Правки приняты. Команда дорабатывает материал.'
    default:
      return 'Заказ под контролем команды.'
  }
}

function getPrimaryActionLabel(status: string): string {
  switch (status) {
    case 'waiting_payment':
      return 'Перейти к оплате'
    case 'waiting_estimation':
      return 'Уточнить детали'
    case 'review':
      return 'Открыть готовую работу'
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

  const stageIdx = getStageIndex(activeOrder.status)
  const total = Math.max(0, activeOrder.final_price ?? activeOrder.price ?? 0)
  const paid = Math.max(0, activeOrder.paid_amount ?? 0)
  const remaining = Math.max(0, total - paid)
  const statusInfo = ORDER_STATUS_MAP[activeOrder.status]
  const workType = stripEmoji(activeOrder.work_type_label ?? activeOrder.work_type ?? 'Заказ')
  const headline = getOrderHeadlineSafe(activeOrder)
  const deadlineText = activeOrder.deadline ? formatOrderDeadlineRu(activeOrder.deadline) : 'Срок уточняется'
  const stageText = STAGES[stageIdx]?.label ?? 'Создан'
  const needsAction = ['waiting_payment', 'waiting_estimation', 'review', 'revision'].includes(activeOrder.status)
  const ctaLabel = getPrimaryActionLabel(activeOrder.status)
  const moneyLabel = remaining > 0 ? `Осталось ${formatMoney(remaining)}` : formatMoney(total)
  const spotlightDetail = remaining > 0
    ? `К оплате осталось ${formatMoney(remaining)}`
    : activeOrder.status === 'review'
      ? 'Материал готов к вашему просмотру'
      : `Этап: ${stageText.toLowerCase()}`

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 14 }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={() => {
          haptic('light')
          onNavigate(`/order/${activeOrder.id}`)
        }}
        style={{
          display: 'block',
          width: '100%',
          padding: '24px 20px 20px',
          borderRadius: 28,
          background: needsAction
            ? 'linear-gradient(158deg, rgba(34, 28, 15, 0.98) 0%, rgba(18, 16, 12, 0.96) 34%, rgba(10, 10, 11, 1) 100%)'
            : 'linear-gradient(158deg, rgba(24, 22, 17, 0.96) 0%, rgba(14, 14, 15, 0.98) 46%, rgba(9, 9, 11, 1) 100%)',
          border: `1px solid ${needsAction ? 'rgba(212, 175, 55, 0.16)' : 'rgba(255,255,255,0.05)'}`,
          boxShadow: '0 30px 60px -42px rgba(0, 0, 0, 0.82)',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -72,
            right: -36,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: needsAction
              ? 'radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.06) 30%, transparent 72%)'
              : 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 28%, transparent 72%)',
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
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={12} color="var(--gold-300)" strokeWidth={1.8} />
                Priority Desk
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 999,
                  background: 'rgba(212, 175, 55, 0.05)',
                  border: '1px solid rgba(212, 175, 55, 0.08)',
                  color: 'var(--gold-200)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Заказ #{activeOrder.id}
              </span>

              {otherActiveCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  +{otherActiveCount} ещё
                </span>
              )}
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
              {statusInfo?.label ?? activeOrder.status}
            </span>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(212, 175, 55, 0.7)',
                marginBottom: 10,
              }}
            >
              {workType}
            </div>

            <div
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 30,
                lineHeight: 0.98,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {headline}
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
              }}
            >
              {getStatusMessage(activeOrder.status, activeOrder.progress)}
            </div>
          </div>

          <div
            style={{
              padding: '16px 16px 14px',
              borderRadius: 22,
              marginBottom: 16,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(14,12,10,0.44) 100%)',
              border: `1px solid ${needsAction ? 'rgba(212, 175, 55, 0.14)' : 'rgba(255,255,255,0.05)'}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 8,
              }}
            >
              Главное сейчас
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.25,
                color: needsAction ? 'var(--gold-300)' : 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              {getPrimaryActionLabel(activeOrder.status)}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
              }}
            >
              {spotlightDetail}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            {[
              { label: 'Срок', value: deadlineText, icon: Clock3 },
              { label: 'Этап', value: stageText, icon: STAGES[stageIdx]?.icon ?? FileEdit },
              { label: remaining > 0 ? 'Доплата' : 'Бюджет', value: moneyLabel, icon: CircleDollarSign },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 18,
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
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      marginBottom: 10,
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.10)',
                    }}
                  >
                    <Icon size={15} color="var(--gold-300)" strokeWidth={1.8} />
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: item.label === 'Доплата' || item.label === 'Бюджет' ? 15 : 14,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.03em',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
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
                    boxShadow: index === stageIdx ? '0 0 18px rgba(212,175,55,0.18)' : 'none',
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
                    letterSpacing: '0.02em',
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
              background: needsAction ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${needsAction ? 'rgba(212, 175, 55, 0.16)' : 'rgba(255,255,255,0.05)'}`,
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
                {ctaLabel}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: 'var(--text-secondary)',
                }}
              >
                {needsAction ? 'Ключевое действие вынесено наверх, чтобы вы не искали его по экрану.' : 'Все детали, чат и материалы доступны внутри заказа.'}
              </div>
            </div>

            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.96), rgba(245,225,160,0.82))',
                color: 'var(--text-on-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 18px 28px -20px rgba(212, 175, 55, 0.48)',
              }}
            >
              <ArrowRight size={18} strokeWidth={2.3} />
            </div>
          </div>
        </div>
      </motion.button>
    </motion.section>
  )
})
