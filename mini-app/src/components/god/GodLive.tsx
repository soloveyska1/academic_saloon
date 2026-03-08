import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { fetchGodLiveActivity } from '../../api/userApi'
import type { GodLiveUser } from '../../types'
import { formatPageLabel } from './godHelpers'
import { SectionHeader, StateCard, LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodLive = memo(function GodLive() {
  const [data, setData] = useState<{ online_count: number; users: GodLiveUser[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchGodLiveActivity()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить онлайн-активность')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  if (loading && !data) return <LoadingSpinner />

  if (!data) {
    return (
      <StateCard
        tone="error"
        title="Не удалось открыть онлайн-активность"
        description={error || 'Сервис активности временно не ответил.'}
        actionLabel="Загрузить ещё раз"
        onAction={() => void load()}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      <SectionHeader
        eyebrow="Мониторинг"
        title="Кто сейчас в приложении"
        description="Активные пользователи, текущие экраны и быстрый срез поведения без перехода в логи."
        meta={error ? 'Последняя загрузка с предупреждением' : `${data.online_count} онлайн`}
      />

      {/* Online count */}
      <div className={s.onlineBar}>
        <div className={s.onlineDot} />
        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>{data.online_count}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>клиентов онлайн</span>
        <button type="button" onClick={load} className={s.ghostBtn} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>

      {/* Users */}
      {data.users.map((user) => (
        <div key={user.telegram_id} className={s.card}>
          <div className={s.flexRow} style={{ gap: 12 }}>
            <div className={s.onlineDotSmall} />
            <div className={s.flex1}>
              <div style={{ color: '#fff', fontWeight: 500 }}>
                {user.fullname || 'Клиент без имени'} {user.username ? `@${user.username}` : ''}
              </div>
              <div className={s.muted}>
                {formatPageLabel(user.current_page)}
                {user.current_order_id && ` • Заказ #${user.current_order_id}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={s.mutedSmall}>{user.session_duration_min} мин</div>
              <div className={s.mutedSmall}>{user.platform}</div>
            </div>
          </div>
        </div>
      ))}

      {data.users.length === 0 && <div className={s.emptyCenter}>Никого нет онлайн</div>}
    </motion.div>
  )
})
