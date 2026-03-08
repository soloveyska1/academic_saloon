import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Package, Users, Tag, Activity,
  Bell, Check, X, AlertTriangle, RefreshCw,
} from 'lucide-react'
import {
  fetchGodDashboard,
  fetchGodOrders,
  confirmGodPayment,
  rejectGodPayment,
} from '../../api/userApi'
import type { GodDashboard as GodDashboardData, GodOrder } from '../../types'
import { formatMoney, withRouteParams, STATUS_CONFIG } from './godHelpers'
import type { TabId } from './godHelpers'
import { SectionHeader, StateCard, StatCard, FocusCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodDashboard = memo(function GodDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<GodDashboardData | null>(null)
  const [pendingOrders, setPendingOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const previousPendingCountRef = useRef(0)

  const openRoute = useCallback(
    (tab: TabId, updates: Record<string, string | null | undefined>) => {
      const next = withRouteParams(searchParams, {
        tab,
        order_status: null,
        order_q: null,
        user_filter: null,
        user_q: null,
        ...updates,
      })
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardResult, ordersResult] = await Promise.all([
        fetchGodDashboard(),
        fetchGodOrders({ status: 'verification_pending', limit: 10 }),
      ])
      setData(dashboardResult)
      setPendingOrders(ordersResult.orders)
      setError(null)

      if (
        ordersResult.orders.length > 0 &&
        previousPendingCountRef.current < ordersResult.orders.length
      ) {
        try {
          const audio = new Audio(
            'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2ckIB0aGRqeIyeo52SgHBjYGd3jJ+pqJuKd2hkaHqOnqmomox4aGVofI+gqqmai3doZWl9kKGrq5qKeGhlanySoaurmop4aGVqfZKhq6yainhoZWp9kqGrrJqKeGhlbH6SoausmYp4aGZsfpOiq6yZinhpZm1/k6KsrJmJeGlmbYCToqysmon/',
          )
          audio.volume = 0.3
          audio.play().catch(() => {})
        } catch {
          /* silent */
        }
      }
      previousPendingCountRef.current = ordersResult.orders.length
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить сводку'
      setError(message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(interval)
  }, [load])

  const handleQuickConfirm = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await confirmGodPayment(orderId)
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
      await load()
      if (navigator.vibrate) navigator.vibrate(100)
    } catch {
      /* silent */
    }
    setActionLoading(null)
  }

  const handleQuickReject = async (orderId: number) => {
    setActionLoading(orderId)
    try {
      await rejectGodPayment(orderId, 'Платёж не найден')
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
      await load()
    } catch {
      /* silent */
    }
    setActionLoading(null)
  }

  if (loading && !data) return <LoadingSpinner />

  if (!data) {
    return (
      <StateCard
        tone="error"
        title="Сводка центра сейчас недоступна"
        description={error || 'Не удалось собрать показатели админки.'}
        actionLabel="Загрузить ещё раз"
        onAction={() => void load()}
      />
    )
  }

  const focusQueues = [
    {
      id: 'pending',
      label: 'Новые заявки',
      count: data.orders.by_status.pending || 0,
      description: 'Сразу забрать в работу и оценить объём.',
      accent: '#f59e0b',
      onClick: () => openRoute('orders', { order_status: 'pending' }),
    },
    {
      id: 'waiting_estimation',
      label: 'На оценке',
      count: data.orders.by_status.waiting_estimation || 0,
      description: 'Назначить цену и не потерять горячий спрос.',
      accent: '#8b5cf6',
      onClick: () => openRoute('orders', { order_status: 'waiting_estimation' }),
    },
    {
      id: 'verification_pending',
      label: 'Проверка оплаты',
      count: data.orders.by_status.verification_pending || 0,
      description: 'Подтвердить платёж и запустить заказ без задержки.',
      accent: '#ec4899',
      onClick: () => openRoute('orders', { order_status: 'verification_pending' }),
    },
    {
      id: 'watched',
      label: 'Клиенты под наблюдением',
      count: data.users.watched || 0,
      description: 'Проблемные и ценные клиенты в отдельной очереди.',
      accent: '#D4AF37',
      onClick: () => openRoute('users', { user_filter: 'watched' }),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      <SectionHeader
        eyebrow="Контроль"
        title="Центр управления"
        description="Ключевые показатели, горячие очереди и быстрые действия, чтобы ничего не терялось между статусами."
        meta={error ? 'Последняя загрузка прошла с предупреждением' : `Онлайн: ${data.users.online}`}
      />

      {/* Quick Payment Verification */}
      {pendingOrders.length > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={s.pendingAlert}
        >
          <div className={s.pendingAlertHeader}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Bell size={20} color="#ec4899" />
            </motion.div>
            <span className={s.pendingAlertTitle}>Проверка оплаты ({pendingOrders.length})</span>
          </div>
          <div className={`${s.flexColumn} ${s.gap10}`} style={{ padding: 12 }}>
            {pendingOrders.slice(0, 5).map((order) => (
              <PendingOrderItem
                key={order.id}
                order={order}
                loading={actionLoading === order.id}
                onConfirm={() => handleQuickConfirm(order.id)}
                onReject={() => handleQuickReject(order.id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Attention Alert */}
      {data.orders.needing_attention > 0 && (
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={s.attentionAlert}>
          <AlertTriangle size={24} color="#ef4444" />
          <div className={s.flex1}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
              Требуют внимания: {data.orders.needing_attention}
            </div>
            <div className={s.muted}>Новые, на оценке и на проверке оплаты</div>
          </div>
        </motion.div>
      )}

      {/* Focus queues */}
      <div className={s.statGrid2}>
        {focusQueues.map((q) => (
          <FocusCard key={q.id} {...q} />
        ))}
      </div>

      {/* Revenue */}
      <div className={s.card}>
        <div className={s.sectionIcon}>
          <DollarSign size={20} color="#D4AF37" />
          <span className={s.sectionIconLabel}>Выручка</span>
          <button type="button" onClick={load} className={s.ghostBtn} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
        <div className={s.statGrid2}>
          <StatCard label="Сегодня" value={`${data.revenue.today.toLocaleString()}₽`} color="#22c55e" />
          <StatCard label="Неделя" value={`${data.revenue.week.toLocaleString()}₽`} color="#3b82f6" />
          <StatCard label="Месяц" value={`${data.revenue.month.toLocaleString()}₽`} color="#8b5cf6" />
          <StatCard label="Всего" value={`${data.revenue.total.toLocaleString()}₽`} color="#D4AF37" />
        </div>
        <div className={s.cardSubtext} style={{ marginTop: 12 }}>
          Средний чек: {data.revenue.average_order.toLocaleString()}₽
        </div>
      </div>

      {/* Orders */}
      <div className={s.card}>
        <div className={s.sectionIcon}>
          <Package size={20} color="#D4AF37" />
          <span className={s.sectionIconLabel}>Заказы</span>
        </div>
        <div className={s.statGrid2}>
          <StatCard label="Активных" value={data.orders.active} color="#3b82f6" />
          <StatCard label="Сегодня" value={data.orders.today} color="#22c55e" />
          <StatCard label="Завершено сегодня" value={data.orders.completed_today} color="#8b5cf6" />
          <StatCard label="Всего" value={data.orders.total} color="#D4AF37" />
        </div>
      </div>

      {/* Users */}
      <div className={s.card}>
        <div className={s.sectionIcon}>
          <Users size={20} color="#D4AF37" />
          <span className={s.sectionIconLabel}>Пользователи</span>
        </div>
        <div className={s.statGrid2}>
          <StatCard label="Онлайн" value={data.users.online} color="#22c55e" />
          <StatCard label="Сегодня" value={data.users.today} color="#3b82f6" />
          <StatCard label="За неделю" value={data.users.week} color="#8b5cf6" />
          <StatCard label="Всего" value={data.users.total} color="#D4AF37" />
        </div>
        <div className={s.flexRow} style={{ marginTop: 12, gap: 16 }}>
          <span className={s.cardSubtext}>Забанено: {data.users.banned}</span>
          <span className={s.cardSubtext}>Под наблюдением: {data.users.watched}</span>
        </div>
        <div className={s.cardSubtextGold} style={{ marginTop: 8 }}>
          Общий баланс бонусов: {data.users.total_bonus_balance.toLocaleString()}₽
        </div>
      </div>

      {/* Promos */}
      <div className={s.card}>
        <div className={s.sectionIcon}>
          <Tag size={20} color="#D4AF37" />
          <span className={s.sectionIconLabel}>Промокоды</span>
        </div>
        <div className={s.statGrid2}>
          <StatCard label="Всего" value={data.promos.total} color="#D4AF37" />
          <StatCard label="Активных" value={data.promos.active} color="#22c55e" />
          <StatCard label="Использований" value={data.promos.total_uses} color="#3b82f6" />
          <StatCard label="Сэкономлено" value={`${data.promos.total_discount_given.toLocaleString()}₽`} color="#8b5cf6" />
        </div>
        {data.promos.popular.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className={s.muted} style={{ marginBottom: 8 }}>Популярные промокоды:</div>
            <div className={`${s.flexColumn} ${s.gap8}`}>
              {data.promos.popular.map((promo, idx) => (
                <div
                  key={promo.code}
                  className={s.flexRow}
                  style={{
                    gap: 8,
                    padding: '6px 10px',
                    background: 'rgba(212,175,55,0.1)',
                    borderRadius: 6,
                    borderLeft: `3px solid ${idx === 0 ? '#D4AF37' : idx === 1 ? '#c0c0c0' : '#cd7f32'}`,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  <span style={{ color: '#D4AF37', fontWeight: 600, fontSize: 13 }}>{promo.code}</span>
                  <span className={s.mlAuto} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {promo.uses} исп.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Orders by status */}
      <div className={s.card}>
        <div className={s.sectionIcon}>
          <Activity size={20} color="#D4AF37" />
          <span className={s.sectionIconLabel}>По статусам</span>
        </div>
        <div className={`${s.flexColumn} ${s.gap8}`}>
          {Object.entries(data.orders.by_status)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] || { label: status, emoji: '📋', color: '#fff', bg: 'rgba(255,255,255,0.1)' }
              return (
                <div
                  key={status}
                  className={s.flexRow}
                  style={{ gap: 10, padding: '8px 12px', background: cfg.bg, borderRadius: 8 }}
                >
                  <span>{cfg.emoji}</span>
                  <span style={{ color: cfg.color, fontWeight: 500, flex: 1 }}>{cfg.label}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </motion.div>
  )
})

/* ─── Pending Order Item ─── */

const PendingOrderItem = memo(function PendingOrderItem({
  order,
  loading,
  onConfirm,
  onReject,
}: {
  order: GodOrder
  loading: boolean
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={s.pendingItem}
    >
      <div className={s.flex1}>
        <div className={s.flexRow} style={{ color: '#fff', fontWeight: 600, fontSize: 14, gap: 8, flexWrap: 'wrap' }}>
          <span>
            #{order.id} •{' '}
            {order.promo_code && order.price !== order.final_price && (
              <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>
                {order.price.toLocaleString()}
              </span>
            )}
            <span style={{ color: order.promo_code ? '#22c55e' : '#fff' }}>
              {order.final_price.toLocaleString()}₽
            </span>
          </span>
          {order.promo_code && (
            <span
              style={{
                padding: '3px 8px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,197,94,0.2))',
                border: '1px solid rgba(139,92,246,0.5)',
                color: '#a78bfa',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              🎟️ {order.promo_code} −{order.promo_discount}%
            </span>
          )}
        </div>
        <div className={s.muted}>
          {order.user_fullname} • {order.work_type_label}
        </div>
      </div>
      <div className={s.flexRow} style={{ gap: 8 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onConfirm}
          disabled={loading}
          className={s.iconBtn}
          style={{
            background: 'linear-gradient(180deg, #22c55e, #16a34a)',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Check size={20} color="#fff" />
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onReject}
          disabled={loading}
          className={s.iconBtn}
          style={{
            background: 'linear-gradient(180deg, #ef4444, #dc2626)',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <X size={20} color="#fff" />
        </motion.button>
      </div>
    </motion.div>
  )
})
