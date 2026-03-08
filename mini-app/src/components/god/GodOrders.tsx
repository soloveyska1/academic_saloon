import { memo, useCallback, useEffect, useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight } from 'lucide-react'
import { fetchGodOrders } from '../../api/userApi'
import type { GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, formatMoney, formatDateTime, withRouteParams } from './godHelpers'
import { StateCard, LoadingSpinner } from './GodShared'
import { GodOrderDetail } from './GodOrderDetail'
import s from '../../pages/GodModePage.module.css'

export const GodOrders = memo(function GodOrders() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('order_q') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('order_status') || 'all')
  const [selectedOrder, setSelectedOrder] = useState<GodOrder | null>(null)
  const [total, setTotal] = useState(0)
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    const nextSearch = searchParams.get('order_q') || ''
    const nextStatus = searchParams.get('order_status') || 'all'
    if (nextSearch !== search) setSearch(nextSearch)
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
  }, [search, searchParams, statusFilter])

  useEffect(() => {
    const next = withRouteParams(searchParams, { tab: 'orders', order_q: search.trim() || null, order_status: statusFilter })
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [search, searchParams, setSearchParams, statusFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodOrders({ status: statusFilter, search: deferredSearch, limit: 100 })
      setOrders(result.orders)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      setOrders([]); setTotal(0)
      setError(err instanceof Error ? err.message : 'Ошибка')
      showToast({ type: 'error', title: 'Ошибка загрузки', message: 'Заказы не загрузились' })
    }
    setLoading(false)
  }, [deferredSearch, showToast, statusFilter])

  useEffect(() => { void load() }, [load])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      {/* Search & Filter */}
      <div className={s.searchBar}>
        <div className={s.searchWrap} style={{ flex: 1 }}>
          <Search size={14} className={s.searchIcon} />
          <input type="text" placeholder="ID, тема, предмет…" value={search} onChange={(e) => setSearch(e.target.value)} className={s.searchInput} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={s.filterSelect}>
          <option value="all">Все</option>
          <option value="pending">Новые</option>
          <option value="verification_pending">Проверка</option>
          <option value="waiting_payment">К оплате</option>
          <option value="in_progress">В работе</option>
          <option value="review">Готово</option>
          <option value="completed">Завершён</option>
        </select>
      </div>

      <div className={`${s.flexRow} ${s.gap6}`}>
        <span className={s.tagMuted}>{total} заказов</span>
        {statusFilter !== 'all' && <span className={s.tagGold}>{STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>}
      </div>

      {/* List */}
      {loading ? <LoadingSpinner /> : error ? (
        <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={() => void load()} />
      ) : orders.length === 0 ? (
        <StateCard title="Пусто" description="Нет заказов по фильтру" />
      ) : (
        <div className={`${s.flexCol} ${s.gap6}`}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && <GodOrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={load} />}
      </AnimatePresence>
    </motion.div>
  )
})

/* ─── Order Card ─── */

const OrderCard = memo(function OrderCard({ order, onClick }: { order: GodOrder; onClick: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

  return (
    <div className={s.listItem} onClick={onClick}>
      {/* Row 1: status + id + price */}
      <div className={`${s.flexRow} ${s.gap6}`}>
        <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji} {cfg.label}</span>
        <span className={s.mutedSmall} style={{ fontWeight: 700 }}>#{order.id}</span>
        {order.promo_code && <span className={s.tagBlue} style={{ fontSize: 10 }}>{order.promo_code} −{order.promo_discount}%</span>}
        <div className={`${s.mlAuto} ${s.priceBox}`}>
          <span className={s.priceValue}>{formatMoney(order.final_price)}</span>
        </div>
      </div>
      {/* Row 2: title */}
      <div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 14, margin: '4px 0 2px' }}>
        {order.work_type_label}
      </div>
      {/* Row 3: details */}
      <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`}>
        <span className={s.muted}>{order.subject || 'Без предмета'}</span>
        <span className={s.mutedSmall}>· {order.user_fullname}</span>
        {order.deadline && <span className={s.mutedSmall}>· дедлайн {formatDateTime(order.deadline)}</span>}
        {order.progress > 0 && (
          <span className={`${s.flexRow} ${s.gap4} ${s.mlAuto}`}>
            <span className={s.progressBar}><span className={s.progressFill} style={{ width: `${Math.min(order.progress, 100)}%` }} /></span>
            <span style={{ color: '#d4af37', fontSize: 11, fontWeight: 700 }}>{order.progress}%</span>
          </span>
        )}
        <ChevronRight size={14} color="#52525b" className={s.mlAuto} style={{ flexShrink: 0 }} />
      </div>
    </div>
  )
})
