/**
 * God Mode v3 — Orders Pipeline
 * StatusPipeline + search + order list
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { fetchGodDashboard, fetchGodOrders } from '../../api/userApi'
import type { GodDashboard, GodOrder } from '../../types'
import { STATUS_CONFIG, formatMoney, formatDateTime, withRouteParams } from './godConstants'
import { useHaptic } from './godHooks'
import { StatusPipeline, Skeleton, EmptyState, StateCard } from './GodWidgets'
import { OrderSheet } from './OrderSheet'
import s from '../../pages/GodModePage.module.css'

function getPaymentMethodLabel(method?: string | null): string {
  switch (method) {
    case 'sbp':
      return 'СБП'
    case 'card':
      return 'Карта'
    case 'transfer':
      return 'Перевод'
    case 'yookassa':
      return 'ЮKassa'
    default:
      return 'Платёж'
  }
}

function getPaymentPhaseLabel(phase?: string | null): string {
  return phase === 'final' ? 'Доплата' : 'Оплата'
}

export const OrdersTab = memo(function OrdersTab() {
  const { selection } = useHaptic()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get('order_q') ?? '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('order_status') ?? '')
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 50 }
      if (statusFilter) params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      const result = await fetchGodOrders(params as any)
      setOrders(result.orders)
      setTotal(result.total)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const nextStatus = searchParams.get('order_status') ?? ''
    const nextSearch = searchParams.get('order_q') ?? ''
    setStatusFilter((prev) => (prev === nextStatus ? prev : nextStatus))
    setSearch((prev) => (prev === nextSearch ? prev : nextSearch))
  }, [searchParams])

  // Load dashboard for status counts
  useEffect(() => {
    fetchGodDashboard().then((d: GodDashboard) => {
      if (d.orders.by_status) setByStatus(d.orders.by_status)
    }).catch(() => {})
  }, [])

  const handleStatusTap = useCallback((status: string) => {
    selection()
    setSearchParams(
      withRouteParams(searchParams, { tab: 'orders', order_status: status || null }),
      { replace: true },
    )
    setLoading(true)
  }, [searchParams, selection, setSearchParams])

  const handleSearchSubmit = useCallback(() => {
    setSearchParams(
      withRouteParams(searchParams, { tab: 'orders', order_q: search.trim() || null }),
      { replace: true },
    )
    setLoading(true)
  }, [search, searchParams, setSearchParams])

  const handleReset = useCallback(() => {
    setSearch('')
    setSearchParams(
      withRouteParams(searchParams, { tab: 'orders', order_q: null, order_status: null }),
      { replace: true },
    )
    setLoading(true)
  }, [searchParams, setSearchParams])

  if (loading && orders.length === 0) return <Skeleton variant="card" count={4} />

  const activeStatusLabel = statusFilter ? STATUS_CONFIG[statusFilter]?.label || statusFilter : null
  const hasFilters = Boolean(statusFilter || search.trim())

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

      <div className={s.tabIntro}>
        <div>
          <div className={s.panelEyebrow}>Заказы</div>
          <div className={s.panelTitle}>Лента заказов</div>
        </div>
        <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`}>
          <span className={s.tagGold}>{total}</span>
          {activeStatusLabel && <span className={s.tagMuted}>{activeStatusLabel}</span>}
          {hasFilters && (
            <button type="button" className={s.inlineLinkBtn} onClick={handleReset}>
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <StatusPipeline statuses={byStatus} active={statusFilter} onTap={handleStatusTap} />

      {/* Search */}
      <div className={s.searchWrap}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className={s.searchInput}
          placeholder="ID, тема, предмет, клиент..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
        />
        {search.trim() ? (
          <button type="button" className={s.ghostBtn} onClick={handleReset} aria-label="Очистить поиск">
            <X size={14} />
          </button>
        ) : null}
        <span className={s.tagMuted}>{total}</span>
      </div>

      {error && <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={load} />}

      {/* Order List */}
      <div className={s.resultsBar}>
        <div className={s.sectionTitle}>Список</div>
        {hasFilters ? <span className={s.mutedSmall}>По текущему фильтру</span> : <span className={s.mutedSmall}>Последние обновления</span>}
      </div>

      <div className={`${s.flexCol} ${s.gap6}`}>
        {orders.map((o) => {
          const cfg = STATUS_CONFIG[o.status] || { label: o.status, emoji: '?', color: 'var(--text-muted)', bg: 'rgba(113,113,122,0.15)' }
          return (
            <div key={o.id} className={s.listCard} onClick={() => setSelectedOrder(o.id)}>
              <div className={s.listCardHead}>
                <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </span>
                <span className={s.mutedSmall}>#{o.id}</span>
                {o.promo_code && <span className={s.tagGold}>{o.promo_code}</span>}
                <span className={`${s.textGold} ${s.bold} ${s.mlAuto}`} style={{ fontSize: 13 }}>
                  {formatMoney(o.final_price || o.price)}
                </span>
              </div>

              <div className={s.listCardTitle}>
                {o.work_type_label || o.work_type}
              </div>

              <div className={s.listCardMeta}>
                {o.subject && <span>{o.subject} · </span>}
                {o.user_fullname || 'Без имени'}
                {o.deadline && <span> · до {formatDateTime(o.deadline)}</span>}
              </div>

              {o.status === 'verification_pending' && (
                <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`} style={{ marginTop: 8 }}>
                  <span className={s.tagGold}>
                    {formatMoney(o.payment_requested_amount || o.pending_verification_amount || o.final_price || o.price)}
                  </span>
                  <span className={s.tagMuted}>
                    {getPaymentPhaseLabel(o.payment_phase)} · {getPaymentMethodLabel(o.payment_method)}
                  </span>
                  {o.payment_is_batch && (o.payment_batch_orders_count || 0) > 1 && (
                    <span className={s.tagMuted}>
                      Пакет: {o.payment_batch_orders_count} · {formatMoney(o.payment_batch_total_amount || 0)}
                    </span>
                  )}
                </div>
              )}

              {(o.deliveries_count || 0) > 0 && (
                <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`} style={{ marginTop: 8 }}>
                  <span className={s.tagGreen}>Выдача: {o.deliveries_count}</span>
                  {o.last_deliverable_at && (
                    <span className={s.tagMuted}>Последняя: {formatDateTime(o.last_deliverable_at)}</span>
                  )}
                </div>
              )}

              {o.progress > 0 && o.progress < 100 && (
                <div className={s.progressTrack}>
                  <div style={{ width: `${o.progress}%` }} className={s.progressBar} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!error && !loading && orders.length === 0 && (
        <EmptyState title="Нет заказов" description="По текущим фильтрам ничего не найдено" />
      )}

      {/* Order Detail Sheet */}
      <OrderSheet orderId={selectedOrder} onClose={() => { setSelectedOrder(null); load() }} />
    </motion.div>
  )
})
