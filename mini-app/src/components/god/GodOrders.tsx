import { memo, useCallback, useEffect, useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'
import { fetchGodOrders } from '../../api/userApi'
import type { GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, formatMoney, formatDateTime, withRouteParams } from './godHelpers'
import { SectionHeader, StateCard, LoadingSpinner } from './GodShared'
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

  // Sync from URL
  useEffect(() => {
    const nextSearch = searchParams.get('order_q') || ''
    const nextStatus = searchParams.get('order_status') || 'all'
    if (nextSearch !== search) setSearch(nextSearch)
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
  }, [search, searchParams, statusFilter])

  // Sync to URL
  useEffect(() => {
    const next = withRouteParams(searchParams, {
      tab: 'orders',
      order_q: search.trim() || null,
      order_status: statusFilter,
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [search, searchParams, setSearchParams, statusFilter])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodOrders({ status: statusFilter, search: deferredSearch, limit: 100 })
      setOrders(result.orders)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить заказы'
      setOrders([])
      setTotal(0)
      setError(message)
      showToast({ type: 'error', title: 'Заказы не загрузились', message })
    }
    setLoading(false)
  }, [deferredSearch, showToast, statusFilter])

  useEffect(() => { void load() }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      <SectionHeader
        eyebrow="Операции"
        title="Заказы"
        description="Все заявки, статусы и быстрый вход в детали заказа без провалов между очередями."
        meta={
          statusFilter === 'all'
            ? `Показано ${total} заказов`
            : `Очередь: ${STATUS_CONFIG[statusFilter]?.label || statusFilter}`
        }
      />

      {/* Search & Filter */}
      <div className={`${s.cardCompact} ${s.flexColumn} ${s.gap12}`}>
        <div className={s.searchBar}>
          <div className={s.searchField}>
            <Search size={16} color="rgba(255,255,255,0.3)" className={s.searchIcon} />
            <input
              type="text"
              placeholder="ID заказа, тема или предмет"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={s.input}
            style={{ width: 'auto', minWidth: 156 }}
          >
            <option value="all">Все статусы</option>
            <option value="pending">Ожидает</option>
            <option value="verification_pending">Проверка</option>
            <option value="waiting_payment">К оплате</option>
            <option value="in_progress">В работе</option>
            <option value="review">Готово</option>
            <option value="completed">Завершён</option>
          </select>
          <button type="button" onClick={() => void load()} className={s.secondaryBtn}>
            <RefreshCw size={16} /> Обновить
          </button>
        </div>

        <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8 }}>
          <span className={s.badgeNeutral}>Найдено: {total}</span>
          <span className={s.badgeGold}>
            {statusFilter === 'all' ? 'Все очереди' : STATUS_CONFIG[statusFilter]?.label || statusFilter}
          </span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <StateCard
          tone="error"
          title="Очередь заказов сейчас недоступна"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      ) : orders.length === 0 ? (
        <StateCard
          title="По текущему фильтру заявок нет"
          description="Попробуйте снять фильтр или уточнить поисковый запрос. Очередь останется здесь же, без перезагрузки экрана."
        />
      ) : (
        <div className={`${s.flexColumn} ${s.gap10}`}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <GodOrderDetail
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={load}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
})

/* ─── Order Card ─── */

const OrderCard = memo(function OrderCard({
  order,
  onClick,
}: {
  order: GodOrder
  onClick: () => void
}) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const shortUserName = order.user_username ? `@${order.user_username}` : order.user_fullname

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 18px 40px rgba(0,0,0,0.34)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={s.listItem}
    >
      <div className={s.flexRow} style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className={s.flex1}>
          <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8, marginBottom: 8 }}>
            <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}>
              {cfg.label}
            </span>
            <span className={s.muted} style={{ fontWeight: 700 }}>#{order.id}</span>
            {order.promo_code && (
              <span
                className={s.promoBadge}
                style={{
                  background: order.promo_returned ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)',
                  border: `1px solid ${order.promo_returned ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  color: order.promo_returned ? '#fca5a5' : '#86efac',
                }}
              >
                {order.promo_code}{order.promo_discount > 0 ? ` • −${order.promo_discount}%` : ''}
              </span>
            )}
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {order.work_type_label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 13, lineHeight: 1.5 }}>
            {order.subject || 'Предмет не указан'}
          </div>
        </div>
        <div className={s.priceBox}>
          <div className={s.priceValue}>{formatMoney(order.final_price)}</div>
          <div className={s.priceSub}>
            {order.paid_amount > 0 ? `Оплачено ${formatMoney(order.paid_amount)}` : 'Без оплаты'}
          </div>
        </div>
      </div>

      <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8 }}>
        <span className={s.tagRow}>Клиент: {shortUserName}</span>
        <span className={s.tagRow}>Создан: {formatDateTime(order.created_at)}</span>
        {order.deadline && <span className={s.tagRow}>Дедлайн: {formatDateTime(order.deadline)}</span>}
        {order.admin_notes && <span className={s.tagRowGold}>Есть заметка</span>}
        {order.progress > 0 && (
          <div className={`${s.flexRow} ${s.mlAuto}`} style={{ gap: 6, minWidth: 128 }}>
            <div className={s.progressBar}>
              <div className={s.progressFill} style={{ width: `${Math.max(0, Math.min(order.progress, 100))}%` }} />
            </div>
            <span className={s.progressValue}>{order.progress}%</span>
          </div>
        )}
        <div className={s.listItemDetail}>
          Детали <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  )
})
