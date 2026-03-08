import { memo, useCallback, useEffect, useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'
import { fetchGodUsers } from '../../api/userApi'
import type { GodUser } from '../../types'
import { useToast } from '../ui/Toast'
import { formatMoney, withRouteParams } from './godHelpers'
import { SectionHeader, StateCard, LoadingSpinner } from './GodShared'
import { GodUserDetail } from './GodUserDetail'
import s from '../../pages/GodModePage.module.css'

const FILTER_LABELS: Record<string, string> = {
  banned: 'заблокированные',
  watched: 'под наблюдением',
  with_balance: 'с балансом',
}

export const GodUsers = memo(function GodUsers() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<GodUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('user_q') || '')
  const [filterType, setFilterType] = useState(() => searchParams.get('user_filter') || '')
  const [selectedUser, setSelectedUser] = useState<GodUser | null>(null)
  const [total, setTotal] = useState(0)
  const deferredSearch = useDeferredValue(search.trim())
  const filterLabel = FILTER_LABELS[filterType] || 'все клиенты'

  useEffect(() => {
    const nextSearch = searchParams.get('user_q') || ''
    const nextFilter = searchParams.get('user_filter') || ''
    if (nextSearch !== search) setSearch(nextSearch)
    if (nextFilter !== filterType) setFilterType(nextFilter)
  }, [filterType, search, searchParams])

  useEffect(() => {
    const next = withRouteParams(searchParams, {
      tab: 'users',
      user_q: search.trim() || null,
      user_filter: filterType || null,
    })
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [filterType, search, searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodUsers({ search: deferredSearch, filter_type: filterType, limit: 100 })
      setUsers(result.users)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить клиентов'
      setUsers([])
      setTotal(0)
      setError(message)
      showToast({ type: 'error', title: 'Клиенты не загрузились', message })
    }
    setLoading(false)
  }, [deferredSearch, filterType, showToast])

  useEffect(() => { void load() }, [load])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      <SectionHeader
        eyebrow="CRM"
        title="Клиенты"
        description="Профили, баланс, наблюдение и быстрый вход в историю клиента без лишних переходов."
        meta={filterType ? `Фильтр: ${filterLabel}` : `Показано ${total} клиентов`}
      />

      {/* Search & Filter */}
      <div className={`${s.cardCompact} ${s.flexColumn} ${s.gap12}`}>
        <div className={s.searchBar}>
          <div className={s.searchField}>
            <Search size={16} color="rgba(255,255,255,0.3)" className={s.searchIcon} />
            <input
              type="text"
              placeholder="ID, username или имя"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={s.input}
            style={{ width: 'auto', minWidth: 156 }}
          >
            <option value="">Все клиенты</option>
            <option value="banned">Забанены</option>
            <option value="watched">Под наблюдением</option>
            <option value="with_balance">С балансом</option>
          </select>
          <button type="button" onClick={() => void load()} className={s.secondaryBtn}>
            <RefreshCw size={16} /> Обновить
          </button>
        </div>
        <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8 }}>
          <span className={s.badgeNeutral}>Найдено: {total}</span>
          <span className={s.badgeGold}>{filterType ? filterLabel : 'Все клиенты'}</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <StateCard
          tone="error"
          title="База клиентов сейчас недоступна"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      ) : users.length === 0 ? (
        <StateCard
          title="По текущему фильтру никого нет"
          description="Снимите фильтр или измените запрос. Список клиентов появится здесь же без переходов между разделами."
        />
      ) : (
        <div className={`${s.flexColumn} ${s.gap10}`}>
          {users.map((user) => (
            <UserCard key={user.telegram_id} user={user} onClick={() => setSelectedUser(user)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedUser && (
          <GodUserDetail user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={load} />
        )}
      </AnimatePresence>
    </motion.div>
  )
})

/* ─── User Card ─── */

const UserCard = memo(function UserCard({ user, onClick }: { user: GodUser; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 18px 40px rgba(0,0,0,0.34)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={s.listItem}
    >
      <div className={s.flexRow} style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className={s.userAvatar}>{user.rank_emoji}</div>
        <div className={s.flex1}>
          <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{user.fullname || 'Без имени'}</span>
            {user.is_banned && (
              <span className={s.tagSmall} style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                Заблокирован
              </span>
            )}
            {user.is_watched && (
              <span className={s.tagSmall} style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                Под наблюдением
              </span>
            )}
          </div>
          <div className={s.muted}>{user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}</div>
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13, marginTop: 8 }}>
            {user.rank_name} • {user.loyalty_status}
          </div>
        </div>
        <div className={s.balanceBox}>
          <div className={s.priceValue}>{formatMoney(user.balance)}</div>
          <div className={s.priceSub}>Баланс</div>
        </div>
      </div>

      <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8 }}>
        <span className={s.tagRow}>Заказов: {user.orders_count}</span>
        <span className={s.tagRow}>Потратил: {formatMoney(user.total_spent)}</span>
        <span className={s.tagRow}>Рефералы: {user.referrals_count}</span>
        <div className={s.listItemDetail}>
          Профиль клиента <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  )
})
