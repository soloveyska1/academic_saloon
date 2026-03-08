import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { fetchGodLiveActivity } from '../../api/userApi'
import type { GodLiveUser } from '../../types'
import { formatPageLabel } from './godHelpers'
import { StateCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodLive = memo(function GodLive() {
  const [data, setData] = useState<{ online_count: number; users: GodLiveUser[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { const r = await fetchGodLiveActivity(); setData(r); setError(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка') }
    setLoading(false)
  }, [])

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i) }, [load])

  if (loading && !data) return <LoadingSpinner />
  if (!data) return <StateCard tone="error" title="Ошибка" description={error || ''} actionLabel="Повторить" onAction={load} />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      <div className={s.onlineBar}>
        <div className={s.onlineDot} />
        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>{data.online_count}</span>
        <span className={s.muted}>онлайн</span>
        <button type="button" onClick={load} className={`${s.ghostBtn} ${s.mlAuto}`}><RefreshCw size={14} /></button>
      </div>

      {data.users.map((u) => (
        <div key={u.telegram_id} className={s.card}>
          <div className={`${s.flexRow} ${s.gap8}`}>
            <div className={s.onlineDotSmall} />
            <div className={s.flex1}>
              <div className={s.textWhite} style={{ fontWeight: 500, fontSize: 13 }}>{u.fullname || 'Без имени'} {u.username ? `@${u.username}` : ''}</div>
              <div className={s.mutedSmall}>{formatPageLabel(u.current_page)}{u.current_order_id ? ` · #${u.current_order_id}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={s.mutedSmall}>{u.session_duration_min} мин</div>
              <div className={s.mutedSmall}>{u.platform}</div>
            </div>
          </div>
        </div>
      ))}

      {data.users.length === 0 && <div className={s.emptyCenter}>Никого нет</div>}
    </motion.div>
  )
})
