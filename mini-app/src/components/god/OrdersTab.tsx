/**
 * God Mode v3 — Orders Pipeline
 * StatusPipeline + search + order list
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { fetchGodDashboard, fetchGodOrders } from '../../api/userApi'
import type { GodDashboard, GodOrder } from '../../types'
import { STATUS_CONFIG, formatMoney, formatDateTime } from './godConstants'
import { useHaptic } from './godHooks'
import { StatusPipeline, Skeleton, EmptyState, StateCard } from './GodWidgets'
import { OrderSheet } from './OrderSheet'
import s from '../../pages/GodModePage.module.css'

export const OrdersTab = memo(function OrdersTab() {
  const { selection } = useHaptic()
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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

  // Load dashboard for status counts
  useEffect(() => {
    fetchGodDashboard().then((d: GodDashboard) => {
      if (d.orders.by_status) setByStatus(d.orders.by_status)
    }).catch(() => {})
  }, [])

  const handleStatusTap = useCallback((status: string) => {
    selection()
    setStatusFilter(status)
    setLoading(true)
  }, [selection])

  if (loading && orders.length === 0) return <Skeleton variant="card" count={4} />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

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
          onKeyDown={(e) => { if (e.key === 'Enter') load() }}
        />
        <span className={s.tagMuted}>{total}</span>
      </div>

      {error && <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={load} />}

      {/* Order List */}
      <div className={`${s.flexCol} ${s.gap6}`}>
        {orders.map((o) => {
          const cfg = STATUS_CONFIG[o.status] || { label: o.status, emoji: '?', color: 'var(--text-muted)', bg: 'rgba(113,113,122,0.15)' }
          return (
            <div key={o.id} className={s.cardClickable} onClick={() => setSelectedOrder(o.id)}>
              <div className={`${s.flexRow} ${s.gap6}`} style={{ marginBottom: 8 }}>
                <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </span>
                <span className={s.mutedSmall}>#{o.id}</span>
                {o.promo_code && <span className={s.tagGold}>{o.promo_code}</span>}
                <span className={`${s.textGold} ${s.bold} ${s.mlAuto}`} style={{ fontSize: 13 }}>
                  {formatMoney(o.final_price || o.price)}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {o.work_type_label || o.work_type}
              </div>
              <div className={s.mutedSmall}>
                {o.subject && <span>{o.subject} · </span>}
                {o.user_fullname || 'Без имени'}
                {o.deadline && <span> · до {formatDateTime(o.deadline)}</span>}
              </div>
              {o.progress > 0 && o.progress < 100 && (
                <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'var(--surface-hover)' }}>
                  <div style={{ width: `${o.progress}%`, height: '100%', borderRadius: 2, background: 'var(--gold-400)' }} />
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
