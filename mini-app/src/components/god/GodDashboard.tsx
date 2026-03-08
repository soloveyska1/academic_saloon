import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Package, Users, Tag, Check, X,
  Bell, AlertTriangle, ChevronRight,
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
import { StatCard, StateCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodDashboard = memo(function GodDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<GodDashboardData | null>(null)
  const [pendingOrders, setPendingOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const prevPendingRef = useRef(0)

  const openRoute = useCallback(
    (tab: TabId, updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        withRouteParams(searchParams, { tab, order_status: null, order_q: null, user_filter: null, user_q: null, ...updates }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, ordRes] = await Promise.all([
        fetchGodDashboard(),
        fetchGodOrders({ status: 'verification_pending', limit: 10 }),
      ])
      setData(dash)
      setPendingOrders(ordRes.orders)
      setError(null)
      if (ordRes.orders.length > prevPendingRef.current) {
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2ckIB0aGRqeIyeo52SgHBjYGd3jJ+pqJuKd2hkaHqOnqmomox4aGVofI+gqqmai3doZWl9kKGrq5qKeGhlanySoaurmop4aGVqfZKhq6yainhoZWp9kqGrrJqKeGhlbH6SoausmYp4aGZsfpOiq6yZinhpZm1/k6KsrJmJeGlmbYCToqysmon/').play().catch(() => {}) } catch {}
      }
      prevPendingRef.current = ordRes.orders.length
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    const i = setInterval(() => void load(), 15000)
    return () => clearInterval(i)
  }, [load])

  const quickAction = async (orderId: number, action: 'confirm' | 'reject') => {
    setActionLoading(orderId)
    try {
      if (action === 'confirm') await confirmGodPayment(orderId)
      else await rejectGodPayment(orderId, 'Платёж не найден')
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
      await load()
      if (navigator.vibrate) navigator.vibrate(80)
    } catch { /* silent */ }
    setActionLoading(null)
  }

  if (loading && !data) return <LoadingSpinner />
  if (!data) return <StateCard tone="error" title="Сводка недоступна" description={error || 'Ошибка'} actionLabel="Повторить" onAction={() => void load()} />

  const focusQueues = [
    { id: 'pending', label: 'Новые', count: data.orders.by_status.pending || 0, color: '#f59e0b', tab: 'orders' as TabId, filter: 'pending' },
    { id: 'estimation', label: 'На оценке', count: data.orders.by_status.waiting_estimation || 0, color: '#8b5cf6', tab: 'orders' as TabId, filter: 'waiting_estimation' },
    { id: 'verification', label: 'Оплата', count: data.orders.by_status.verification_pending || 0, color: '#ec4899', tab: 'orders' as TabId, filter: 'verification_pending' },
    { id: 'watched', label: 'Наблюдение', count: data.users.watched || 0, color: '#d4af37', tab: 'users' as TabId, filter: 'watched' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      {/* Pending Payments */}
      {pendingOrders.length > 0 && (
        <div className={s.alertCard}>
          <div className={s.alertHeader}>
            <Bell size={14} /> Проверка оплаты — {pendingOrders.length}
          </div>
          <div className={s.alertBody}>
            <AnimatePresence>
              {pendingOrders.slice(0, 5).map((order) => (
                <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} className={s.alertItem}>
                  <div className={s.flex1}>
                    <div className={`${s.flexRow} ${s.gap6}`}>
                      <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 13 }}>#{order.id}</span>
                      <span className={s.textGold} style={{ fontSize: 13, fontWeight: 700 }}>{order.final_price.toLocaleString()}₽</span>
                      {order.promo_code && <span className={s.tagBlue} style={{ fontSize: 10 }}>{order.promo_code}</span>}
                    </div>
                    <div className={s.muted}>{order.user_fullname} · {order.work_type_label}</div>
                  </div>
                  <div className={`${s.flexRow} ${s.gap4}`}>
                    <button type="button" onClick={() => quickAction(order.id, 'confirm')} disabled={actionLoading === order.id} className={s.iconBtn} style={{ background: '#16a34a', opacity: actionLoading === order.id ? 0.4 : 1 }}>
                      <Check size={16} color="#fff" />
                    </button>
                    <button type="button" onClick={() => quickAction(order.id, 'reject')} disabled={actionLoading === order.id} className={s.iconBtn} style={{ background: '#dc2626', opacity: actionLoading === order.id ? 0.4 : 1 }}>
                      <X size={16} color="#fff" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Attention */}
      {data.orders.needing_attention > 0 && (
        <div className={s.attentionBar}>
          <AlertTriangle size={14} /> Требуют внимания: {data.orders.needing_attention}
        </div>
      )}

      {/* Focus queues */}
      <div className={`${s.flexCol} ${s.gap4}`}>
        {focusQueues.map((q) => (
          <button
            key={q.id}
            type="button"
            className={s.focusItem}
            onClick={() => openRoute(q.tab, q.tab === 'users' ? { user_filter: q.filter } : { order_status: q.filter })}
          >
            <div className={s.focusCount} style={{ background: `${q.color}18`, color: q.color }}>{q.count}</div>
            <div className={s.flex1}>
              <div className={s.focusLabel}>{q.label}</div>
            </div>
            <ChevronRight size={14} color="#52525b" />
          </button>
        ))}
      </div>

      {/* Revenue */}
      <div className={s.card}>
        <div className={s.sectionTitle}>
          <DollarSign size={13} className={s.sectionTitleIcon} /> Выручка
        </div>
        <div className={s.statRow}>
          <StatCard label="Сегодня" value={`${data.revenue.today.toLocaleString()}₽`} color="#22c55e" />
          <StatCard label="Неделя" value={`${data.revenue.week.toLocaleString()}₽`} color="#3b82f6" />
          <StatCard label="Месяц" value={`${data.revenue.month.toLocaleString()}₽`} color="#8b5cf6" />
          <StatCard label="Всего" value={`${data.revenue.total.toLocaleString()}₽`} color="#d4af37" />
        </div>
        <div className={s.mutedSmall} style={{ marginTop: 6 }}>Средний чек: {data.revenue.average_order.toLocaleString()}₽</div>
      </div>

      {/* Orders */}
      <div className={s.card}>
        <div className={s.sectionTitle}>
          <Package size={13} className={s.sectionTitleIcon} /> Заказы
        </div>
        <div className={s.statRow}>
          <StatCard label="Активных" value={data.orders.active} color="#3b82f6" />
          <StatCard label="Сегодня" value={data.orders.today} color="#22c55e" />
          <StatCard label="Готово" value={data.orders.completed_today} color="#8b5cf6" />
          <StatCard label="Всего" value={data.orders.total} color="#d4af37" />
        </div>
      </div>

      {/* Users */}
      <div className={s.card}>
        <div className={s.sectionTitle}>
          <Users size={13} className={s.sectionTitleIcon} /> Пользователи
        </div>
        <div className={s.statRow}>
          <StatCard label="Онлайн" value={data.users.online} color="#22c55e" />
          <StatCard label="Сегодня" value={data.users.today} color="#3b82f6" />
          <StatCard label="Неделя" value={data.users.week} color="#8b5cf6" />
          <StatCard label="Всего" value={data.users.total} color="#d4af37" />
        </div>
        <div className={`${s.flexRow} ${s.gap12}`} style={{ marginTop: 6 }}>
          <span className={s.mutedSmall}>Бан: {data.users.banned}</span>
          <span className={s.mutedSmall}>Наблюдение: {data.users.watched}</span>
          <span className={s.mutedSmall} style={{ color: '#d4af37' }}>Бонусы: {data.users.total_bonus_balance.toLocaleString()}₽</span>
        </div>
      </div>

      {/* Promos */}
      <div className={s.card}>
        <div className={s.sectionTitle}>
          <Tag size={13} className={s.sectionTitleIcon} /> Промо
        </div>
        <div className={s.statRow}>
          <StatCard label="Всего" value={data.promos.total} color="#d4af37" />
          <StatCard label="Активных" value={data.promos.active} color="#22c55e" />
          <StatCard label="Исп." value={data.promos.total_uses} color="#3b82f6" />
          <StatCard label="Скидки" value={`${data.promos.total_discount_given.toLocaleString()}₽`} color="#8b5cf6" />
        </div>
        {data.promos.popular.length > 0 && (
          <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`} style={{ marginTop: 6 }}>
            {data.promos.popular.map((p, i) => (
              <span key={p.code} className={s.tagGold} style={{ fontSize: 10 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {p.code} ({p.uses})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* By status */}
      <div className={s.card}>
        <div className={s.sectionTitle}>По статусам</div>
        <div className={`${s.flexCol} ${s.gap4}`}>
          {Object.entries(data.orders.by_status)
            .filter(([, c]) => c > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([st, count]) => {
              const cfg = STATUS_CONFIG[st] || { label: st, emoji: '📋', color: '#fff', bg: 'rgba(255,255,255,0.06)' }
              return (
                <div key={st} className={`${s.flexRow} ${s.gap8}`} style={{ padding: '4px 8px', borderRadius: 6, background: cfg.bg }}>
                  <span style={{ fontSize: 12 }}>{cfg.emoji}</span>
                  <span style={{ color: cfg.color, fontSize: 12, fontWeight: 500, flex: 1 }}>{cfg.label}</span>
                  <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12 }}>{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </motion.div>
  )
})
