import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { fetchGodLogs } from '../../api/userApi'
import type { GodLog } from '../../types'
import { SectionHeader, StateCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodLogs = memo(function GodLogs() {
  const [logs, setLogs] = useState<GodLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodLogs({ limit: 100 })
      setLogs(result.logs)
      setError(null)
    } catch (err) {
      setLogs([])
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал действий')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap8}`}
    >
      <SectionHeader
        eyebrow="Аудит"
        title="Журнал действий"
        description="Последние 100 операций админки с контекстом по целям и времени выполнения."
        meta={error ? 'Загрузка завершилась с ошибкой' : `${logs.length} записей`}
      />

      {error && (
        <StateCard
          tone="error"
          title="Журнал не загрузился"
          description={error}
          actionLabel="Загрузить ещё раз"
          onAction={() => void load()}
        />
      )}

      <div className={s.flexRow} style={{ marginBottom: 8 }}>
        <span className={s.muted}>Последние 100 действий</span>
        <button type="button" onClick={load} className={s.ghostBtn} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {logs.map((log) => (
        <div key={log.id} className={s.logItem}>
          <div className={s.flexRow} style={{ gap: 8 }}>
            <span style={{ fontSize: 16 }}>{log.action_emoji}</span>
            <span style={{ color: '#fff', fontWeight: 500, fontSize: 13 }}>{log.action_type}</span>
            {log.target_type && (
              <span className={s.mutedSmall}>• {log.target_type} #{log.target_id}</span>
            )}
          </div>
          {log.details && (
            <div className={s.muted} style={{ marginTop: 4 }}>{log.details}</div>
          )}
          <div className={s.mutedSmall} style={{ marginTop: 4 }}>
            {log.admin_username || `Админ ${log.admin_id}`} • {new Date(log.created_at!).toLocaleString('ru')}
          </div>
        </div>
      ))}

      {!error && logs.length === 0 && (
        <StateCard
          title="Журнал пока пуст"
          description="Здесь появятся действия после работы с заказами, клиентами и промокодами."
        />
      )}
    </motion.div>
  )
})
