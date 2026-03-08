import { memo, useCallback, useEffect, useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight } from 'lucide-react'
import { fetchGodUsers } from '../../api/userApi'
import type { GodUser } from '../../types'
import { useToast } from '../ui/Toast'
import { formatMoney, withRouteParams } from './godHelpers'
import { StateCard, LoadingSpinner } from './GodShared'
import { GodUserDetail } from './GodUserDetail'
import s from '../../pages/GodModePage.module.css'

const FILTER_LABELS: Record<string, string> = {
  banned: 'Забанены',
  watched: 'Наблюдение',
  with_balance: 'С балансом',
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

  useEffect(() => {
    const nextSearch = searchParams.get('user_q') || ''
    const nextFilter = searchParams.get('user_filter') || ''
    if (nextSearch !== search) setSearch(nextSearch)
    if (nextFilter !== filterType) setFilterType(nextFilter)
  }, [filterType, search, searchParams])

  useEffect(() => {
    const next = withRouteParams(searchParams, { tab: 'users', user_q: search.trim() || null, user_filter: filterType || null })
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [filterType, search, searchParams, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodUsers({ search: deferredSearch, filter_type: filterType, limit: 100 })
      setUsers(result.users)
      setTotal(result.total)
      setError(null)
    } catch (err) {
      setUsers([]); setTotal(0)
      setError(err instanceof Error ? err.message : 'Ошибка')
      showToast({ type: 'error', title: 'Ошибка загрузки', message: 'Клиенты не загрузились' })
    }
    setLoading(false)
  }, [deferredSearch, filterType, showToast])

  useEffect(() => { void load() }, [load])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      {/* Search & Filter */}
      <div className={s.searchBar}>
        <div className={s.searchWrap} style={{ flex: 1 }}>
          <Search size={14} className={s.searchIcon} />
          <input type="text" placeholder="ID, username, имя…" value={search} onChange={(e) => setSearch(e.target.value)} className={s.searchInput} />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={s.filterSelect}>
          <option value="">Все</option>
          <option value="banned">Забанены</option>
          <option value="watched">Наблюдение</option>
          <option value="with_balance">С балансом</option>
        </select>
      </div>

      <div className={`${s.flexRow} ${s.gap6}`}>
        <span className={s.tagMuted}>{total} клиентов</span>
        {filterType && <span className={s.tagGold}>{FILTER_LABELS[filterType]}</span>}
      </div>

      {/* List */}
      {loading ? <LoadingSpinner /> : error ? (
        <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={() => void load()} />
      ) : users.length === 0 ? (
        <StateCard title="Пусто" description="Нет клиентов по фильтру" />
      ) : (
        <div className={`${s.flexCol} ${s.gap6}`}>
          {users.map((user) => (
            <UserCard key={user.telegram_id} user={user} onClick={() => setSelectedUser(user)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedUser && <GodUserDetail user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={load} />}
      </AnimatePresence>
    </motion.div>
  )
})

/* ─── User Card ─── */

const UserCard = memo(function UserCard({ user, onClick }: { user: GodUser; onClick: () => void }) {
  return (
    <div className={s.listItem} onClick={onClick}>
      <div className={`${s.flexRow} ${s.gap10}`}>
        <div className={s.userAvatar}>{user.rank_emoji}</div>
        <div className={s.flex1}>
          <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`}>
            <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 14 }}>{user.fullname || 'Без имени'}</span>
            {user.is_banned && <span className={s.tagRed}>Бан</span>}
            {user.is_watched && <span className={s.tagOrange}>👁</span>}
          </div>
          <div className={s.mutedSmall}>{user.username ? `@${user.username}` : `ID: ${user.telegram_id}`} · {user.rank_name}</div>
        </div>
        <div className={s.priceBox}>
          <div className={s.priceValue}>{formatMoney(user.balance)}</div>
          <div className={s.priceSub}>баланс</div>
        </div>
        <ChevronRight size={14} color="#52525b" />
      </div>
      <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`} style={{ marginTop: 6 }}>
        <span className={s.tagMuted}>Заказов: {user.orders_count}</span>
        <span className={s.tagMuted}>Потратил: {formatMoney(user.total_spent)}</span>
        <span className={s.tagMuted}>Реф: {user.referrals_count}</span>
      </div>
    </div>
  )
})
