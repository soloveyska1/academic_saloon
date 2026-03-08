import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { fetchGodLogs } from '../../api/userApi'
import type { GodLog } from '../../types'
import { StateCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodLogs = memo(function GodLogs() {
  const [logs, setLogs] = useState<GodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setLogs((await fetchGodLogs({ limit: 100 })).logs); setError(null) }
    catch (e) { setLogs([]); setError(e instanceof Error ? e.message : 'Ошибка') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap6}`}>

      <div className={`${s.flexRow} ${s.gap8}`}>
        <span className={s.tagMuted}>{logs.length} записей</span>
        <button type="button" onClick={load} className={`${s.ghostBtn} ${s.mlAuto}`}><RefreshCw size={14} /></button>
      </div>

      {error && <StateCard tone="error" title="Ошибка" description={error} actionLabel="Повторить" onAction={load} />}

      {logs.map((log) => (
        <div key={log.id} className={s.logItem}>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <span style={{ fontSize: 13 }}>{log.action_emoji}</span>
            <span className={s.textWhite} style={{ fontSize: 12, fontWeight: 500 }}>{log.action_type}</span>
            {log.target_type && <span className={s.mutedSmall}>· {log.target_type} #{log.target_id}</span>}
          </div>
          {log.details && <div className={s.mutedSmall} style={{ marginTop: 3 }}>{log.details}</div>}
          <div className={s.mutedSmall} style={{ marginTop: 3 }}>{log.admin_username || `Админ ${log.admin_id}`} · {new Date(log.created_at!).toLocaleString('ru')}</div>
        </div>
      ))}

      {!error && logs.length === 0 && <StateCard title="Пусто" description="Журнал пока пуст" />}
    </motion.div>
  )
})
