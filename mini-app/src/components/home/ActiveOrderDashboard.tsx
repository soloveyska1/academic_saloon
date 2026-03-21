import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Package, Clock, CheckCircle2, Loader2, AlertCircle, ArrowRight, FileEdit } from 'lucide-react'
import { Order } from '../../types'
import { ORDER_STATUS_MAP } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  ACTIVE ORDER DASHBOARD — Uber-style delivery tracking on homepage.
//  Shows the most important active order with visual progress bar,
//  current status, and quick action. Makes returning users feel
//  their order is being tracked and cared for.
//
//  Psychology: Status visibility → trust → repeat purchase
// ═══════════════════════════════════════════════════════════════════════════

interface ActiveOrderDashboardProps {
  orders: Order[]
  onNavigate: (path: string) => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}

const ACTIVE_STATUSES = [
  'pending', 'waiting_estimation', 'waiting_payment', 'verification_pending',
  'confirmed', 'paid', 'paid_full', 'in_progress', 'review', 'revision',
]

// Progress stages for visual timeline
const STAGES = [
  { key: 'created', label: 'Создан', icon: FileEdit },
  { key: 'paid', label: 'Оплачен', icon: CheckCircle2 },
  { key: 'working', label: 'В работе', icon: Loader2 },
  { key: 'done', label: 'Готово', icon: Package },
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
    case 'pending': return 'Заказ обрабатывается менеджером'
    case 'waiting_estimation': return 'Ожидаем уточнение деталей'
    case 'waiting_payment': return 'Заказ готов к оплате'
    case 'verification_pending': return 'Проверяем вашу оплату'
    case 'confirmed': case 'paid': case 'paid_full': return 'Заказ оплачен, ищем эксперта'
    case 'in_progress': return progress ? `Выполнено ${progress}%` : 'Эксперт работает над заказом'
    case 'review': return 'Работа готова — проверьте результат'
    case 'revision': return 'Доработка выполнена'
    default: return 'Заказ в обработке'
  }
}

export const ActiveOrderDashboard = memo(function ActiveOrderDashboard({
  orders,
  onNavigate,
  haptic,
}: ActiveOrderDashboardProps) {
  const { activeOrder, otherActiveCount } = useMemo(() => {
    // Find the most important active order (by priority)
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
      .filter(o => ACTIVE_STATUSES.includes(o.status))
      .sort((a, b) => (priority[a.status] ?? 99) - (priority[b.status] ?? 99))

    return {
      activeOrder: active[0] || null,
      otherActiveCount: Math.max(0, active.length - 1),
    }
  }, [orders])

  if (!activeOrder) return null

  const statusInfo = ORDER_STATUS_MAP[activeOrder.status]
  const stageIdx = getStageIndex(activeOrder.status)
  const progressPercent = activeOrder.progress ?? Math.round(((stageIdx + 0.5) / STAGES.length) * 100)
  const needsAction = ['waiting_payment', 'waiting_estimation', 'review', 'revision'].includes(activeOrder.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 16 }}
    >
      {/* Card */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          haptic('light')
          onNavigate(`/order/${activeOrder.id}`)
        }}
        style={{
          display: 'block',
          width: '100%',
          padding: '20px',
          borderRadius: 16,
          background: needsAction
            ? `linear-gradient(145deg, rgba(201, 162, 39, 0.06), rgba(12, 12, 10, 0.6))`
            : 'rgba(12, 12, 10, 0.6)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          border: `1px solid ${needsAction ? 'rgba(201, 162, 39, 0.08)' : 'rgba(255,255,255,0.04)'}`,
          boxShadow: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top row: order type + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--gold-400)',
                boxShadow: '0 0 8px rgba(201, 162, 39, 0.4)',
              }}
            />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontFamily: "'Manrope', sans-serif",
            }}>
              Активный заказ
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: statusInfo?.color ?? 'var(--gold-400)',
              padding: '3px 10px',
              borderRadius: 100,
              background: statusInfo?.bg ?? 'var(--gold-glass-medium)',
              border: `1px solid ${statusInfo?.border ?? 'var(--gold-glass-strong)'}`,
            }}
          >
            {statusInfo?.label ?? activeOrder.status}
          </span>
        </div>

        {/* Order info */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            marginBottom: 4,
          }}>
            {activeOrder.work_type_label ?? activeOrder.work_type}
          </div>
          {activeOrder.subject && (
            <div style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeOrder.subject}
            </div>
          )}
        </div>

        {/* Progress stages — visual timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
          {STAGES.map((stage, i) => {
            const isCompleted = i < stageIdx
            const isCurrent = i === stageIdx
            const StageIcon = stage.icon
            const color = isCompleted
              ? 'var(--success-text)'
              : isCurrent
                ? 'var(--gold-400)'
                : 'var(--text-muted)'

            return (
              <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 0 }}>
                {/* Stage dot/icon */}
                <div style={{
                  width: isCurrent ? 28 : 20,
                  height: isCurrent ? 28 : 20,
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--success-glass)' : isCurrent ? 'rgba(201, 162, 39, 0.06)' : 'var(--bg-glass)',
                  border: `1.5px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={12} color={color} strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <StageIcon size={13} color={color} strokeWidth={2} />
                  ) : (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                  )}
                </div>
                {/* Connecting line */}
                {i < STAGES.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 4,
                    marginLeft: 4,
                    marginRight: 4,
                    borderRadius: 1,
                    background: isCompleted ? 'var(--success-text)' : 'var(--surface-hover)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {isCurrent && (
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min((progressPercent / 100) * 100, 80)}%` }}
                        transition={{ duration: 1.2, delay: 0.5 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          borderRadius: 1,
                          background: 'var(--gold-400)',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stage labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          {STAGES.map((stage, i) => {
            const isCompleted = i < stageIdx
            const isCurrent = i === stageIdx
            return (
              <span key={stage.key} style={{
                fontSize: 10,
                fontWeight: isCurrent ? 700 : 500,
                color: isCompleted ? 'var(--success-text)' : isCurrent ? 'var(--gold-400)' : 'var(--text-muted)',
                textAlign: 'center',
                flex: 1,
                letterSpacing: '0.02em',
              }}>
                {stage.label}
              </span>
            )
          })}
        </div>

        {/* Status message + action */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 12,
          background: needsAction ? 'rgba(201, 162, 39, 0.06)' : 'var(--border-subtle)',
          border: `1px solid ${needsAction ? 'rgba(201, 162, 39, 0.08)' : 'var(--bg-glass)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {needsAction ? (
              <AlertCircle size={14} color="var(--gold-400)" strokeWidth={2} />
            ) : (
              <Clock size={14} color="var(--text-muted)" strokeWidth={2} />
            )}
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: needsAction ? 'var(--gold-400)' : 'var(--text-muted)',
            }}>
              {getStatusMessage(activeOrder.status, activeOrder.progress)}
            </span>
          </div>
          <ArrowRight size={14} color={needsAction ? 'var(--gold-400)' : 'var(--text-muted)'} strokeWidth={2} />
        </div>

        {/* Other active orders hint */}
        {otherActiveCount > 0 && (
          <div style={{
            marginTop: 10,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
          }}>
            + ещё {otherActiveCount} {otherActiveCount === 1 ? 'заказ' : otherActiveCount < 5 ? 'заказа' : 'заказов'} в работе
          </div>
        )}
      </motion.button>
    </motion.div>
  )
})
