/**
 * God Mode v3 — Radar Tab
 * Sub-tabs: Онлайн | События | Журнал
 */
import { memo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Wifi } from 'lucide-react'
import {
  fetchGodLiveActivity, fetchLiveFeed, fetchGodLogs,
} from '../../api/userApi'
import type { GodLiveUser, GodLog } from '../../types'
import { formatPageLabel, formatDateTime } from './godConstants'
import { useGodData, useHaptic } from './godHooks'
import { Skeleton, StateCard } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

const SUB_TABS = [
  { id: 'online', label: 'Онлайн' },
  { id: 'events', label: 'События' },
  { id: 'logs', label: 'Журнал' },
]

export const RadarTab = memo(function RadarTab() {
  const [sub, setSub] = useState('online')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>
      <div className={s.subTabBar}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={sub === t.id ? s.subTabActive : s.subTab}
            onClick={() => setSub(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'online' && <OnlineSection />}
      {sub === 'events' && <EventsSection />}
      {sub === 'logs' && <LogsSection />}
    </motion.div>
  )
})

/* ═══════ Online Section ═══════ */

const OnlineSection = memo(function OnlineSection() {
  const { impact } = useHaptic()
  const fetchLive = useCallback(() => fetchGodLiveActivity(), [])
  const live = useGodData<{ online_count: number; users: GodLiveUser[] }>(fetchLive, { interval: 5000 })

  if (live.loading && !live.data) return <Skeleton variant="card" count={3} />

  const users = live.data?.users || []
  const count = live.data?.online_count || 0

  return (
    <div className={`${s.flexCol} ${s.gap6}`}>
      {/* Online header */}
      <div className={s.pulseRow}>
        <div className={s.onlineDot} />
        <span className={s.onlineCount}>{count}</span>
        <span className={s.muted}>онлайн</span>
        <button type="button" className={`${s.ghostBtn} ${s.mlAuto}`}
          onClick={() => { impact('light'); live.refresh() }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <StateCard tone="empty" title="Никого нет" description="Ни один пользователь не онлайн" />
      ) : users.map((u) => (
        <div key={u.telegram_id} className={s.card}>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <Wifi size={12} color="#22c55e" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>
              {u.fullname || 'Без имени'}
            </span>
            {u.username && <span className={s.mutedSmall}>@{u.username}</span>}
          </div>
          <div className={`${s.flexRow} ${s.gap8}`} style={{ marginTop: 4 }}>
            <span className={s.tagMuted}>{formatPageLabel(u.current_page)}</span>
            {u.current_order_id && <span className={s.tagBlue}>Заказ #{u.current_order_id}</span>}
            <span className={s.mutedSmall}>{u.session_duration_min} мин</span>
            {u.platform && <span className={s.mutedSmall}>{u.platform}</span>}
          </div>
        </div>
      ))}
    </div>
  )
})

/* ═══════ Events Section (Live Feed — NEW API) ═══════ */

interface LiveEvent {
  id: string
  type: string
  priority: string
  title: string
  message: string
  order_id?: number
  user_id?: number
  amount?: number
  timestamp: string
  is_new?: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#6b7280',
}

const EventsSection = memo(function EventsSection() {
  const { impact } = useHaptic()
  const fetchEvents = useCallback(() => fetchLiveFeed(), [])
  const feed = useGodData<{ events: LiveEvent[]; has_critical: boolean }>(fetchEvents, { interval: 10000 })

  if (feed.loading && !feed.data) return <Skeleton variant="line" count={5} />

  const events = feed.data?.events || []
  const hasCritical = feed.data?.has_critical

  return (
    <div className={`${s.flexCol} ${s.gap6}`}>
      {/* Critical alert */}
      {hasCritical && (
        <div className={s.card} style={{ borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>
            🔴 Есть критические события, требующие внимания
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`${s.flexRow} ${s.gap6}`}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>
          Лента событий
        </span>
        <span className={s.tagMuted}>{events.length}</span>
        <button type="button" className={`${s.ghostBtn} ${s.mlAuto}`}
          onClick={() => { impact('light'); feed.refresh() }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <StateCard tone="empty" title="Нет событий" description="Лента пуста" />
      ) : events.map((ev) => (
        <div
          key={ev.id}
          className={s.card}
          style={{
            borderLeft: `3px solid ${PRIORITY_COLORS[ev.priority] || '#6b7280'}`,
            opacity: ev.is_new ? 1 : 0.7,
          }}
        >
          <div className={`${s.flexRow} ${s.gap6}`}>
            <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[ev.priority] || '#a1a1aa' }}>
              {ev.title}
            </span>
            {ev.is_new && <span className={s.tagGreen} style={{ fontSize: 9 }}>NEW</span>}
          </div>
          <div className={s.mutedSmall} style={{ marginTop: 2, whiteSpace: 'pre-line' }}>
            {ev.message}
          </div>
          <div className={`${s.flexRow} ${s.gap6}`} style={{ marginTop: 4 }}>
            {ev.order_id && <span className={s.tagMuted}>Заказ #{ev.order_id}</span>}
            {ev.amount && <span className={s.tagGold}>{ev.amount} ₽</span>}
            <span className={`${s.mutedSmall} ${s.mlAuto}`}>{formatDateTime(ev.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  )
})

/* ═══════ Logs Section ═══════ */

const LogsSection = memo(function LogsSection() {
  const { impact } = useHaptic()
  const fetchLogs = useCallback(() => fetchGodLogs({ limit: 100 }), [])
  const logs = useGodData<{ logs: GodLog[] }>(fetchLogs)

  if (logs.loading && !logs.data) return <Skeleton variant="line" count={5} />

  const list = logs.data?.logs || []

  return (
    <div className={`${s.flexCol} ${s.gap4}`}>
      {/* Header */}
      <div className={`${s.flexRow} ${s.gap6}`}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>Журнал действий</span>
        <span className={s.tagMuted}>{list.length}</span>
        <button type="button" className={`${s.ghostBtn} ${s.mlAuto}`}
          onClick={() => { impact('light'); logs.refresh() }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Log items */}
      {list.length === 0 ? (
        <StateCard tone="empty" title="Пусто" description="Нет записей в журнале" />
      ) : list.map((log) => (
        <div key={log.id} className={`${s.flexRow} ${s.gap6}`}
          style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{log.action_emoji}</span>
          <div className={s.flex1}>
            <div style={{ fontSize: 12, color: '#e4e4e7' }}>
              {log.action_type}
              {log.target_type && <span className={s.mutedSmall}> · {log.target_type} #{log.target_id}</span>}
            </div>
            {log.details && <div className={s.mutedSmall}>{log.details}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={s.mutedSmall}>@{log.admin_username || '?'}</div>
            <div className={s.mutedSmall}>{formatDateTime(log.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
})
