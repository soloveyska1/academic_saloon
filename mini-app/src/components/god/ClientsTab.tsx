/**
 * God Mode v3 — Client CRM
 * Segment chips + search + user list
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye, Ban } from 'lucide-react'
import { fetchGodUsers } from '../../api/userApi'
import type { GodUser } from '../../types'
import { USER_SEGMENTS, formatMoney } from './godConstants'
import { useHaptic } from './godHooks'
import { Skeleton, EmptyState, StateCard } from './GodWidgets'
import { ClientSheet } from './ClientSheet'
import s from '../../pages/GodModePage.module.css'

export const ClientsTab = memo(function ClientsTab() {
  const { selection } = useHaptic()
  const [users, setUsers] = useState<GodUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 50 }
      if (segment) params.filter_type = segment
      if (search.trim()) params.search = search.trim()
      const result = await fetchGodUsers(params as any)
      setUsers(result.users)
      setTotal(result.total)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    }
    setLoading(false)
  }, [segment, search])

  useEffect(() => { load() }, [load])

  if (loading && users.length === 0) return <Skeleton variant="card" count={4} />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

      {/* Segment Chips */}
      <div className={s.segmentBar}>
        {USER_SEGMENTS.map((seg) => (
          <button
            key={seg.id}
            type="button"
            className={segment === seg.id ? s.segmentChipActive : s.segmentChip}
            onClick={() => { selection(); setSegment(seg.id); setLoading(true) }}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={s.searchWrap}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text" className={s.searchInput}
          placeholder="ID, имя, @username..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load() }}
        />
        <span className={s.tagMuted}>{total}</span>
      </div>

      {error && <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={load} />}

      {/* User List */}
      <div className={`${s.flexCol} ${s.gap6}`}>
        {users.map((u) => (
          <div key={u.id} className={s.cardClickable} onClick={() => setSelectedUser(u.telegram_id)}>
            <div className={`${s.flexRow} ${s.gap8}`}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--gold-glass-subtle)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>
                {u.rank_emoji || '👤'}
              </div>
              <div className={s.flex1}>
                <div className={`${s.flexRow} ${s.gap4}`}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullname || 'Без имени'}</span>
                  {u.is_banned && <Ban size={12} color="var(--error-text)" />}
                  {u.is_watched && <Eye size={12} color="var(--warning-text)" />}
                </div>
                <div className={s.mutedSmall}>
                  {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                  {u.rank_name && ` · ${u.rank_name}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>{formatMoney(u.balance)}</div>
                <div className={s.mutedSmall}>{u.orders_count} зак.</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!error && !loading && users.length === 0 && (
        <EmptyState title="Нет клиентов" description="По текущим фильтрам ничего не найдено" />
      )}

      <ClientSheet userId={selectedUser} onClose={() => { setSelectedUser(null); load() }} />
    </motion.div>
  )
})
