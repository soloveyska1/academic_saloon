/**
 * God Mode v3 — Tools Tab
 * SQL console + Quick presets + System info
 */
import { memo, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Database, Server } from 'lucide-react'
import { executeGodSql, fetchGodSystemInfo } from '../../api/userApi'
import { SQL_PRESETS } from './godConstants'
import { useGodData, useHaptic } from './godHooks'
import { useToast } from '../ui/Toast'
import { Skeleton } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

interface SqlResult {
  columns?: string[]
  rows?: unknown[][]
  error?: string
  total_rows?: number
}

export const ToolsTab = memo(function ToolsTab() {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const [query, setQuery] = useState(SQL_PRESETS[0].query)
  const [result, setResult] = useState<SqlResult | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSysInfo = useCallback(() => fetchGodSystemInfo(), [])
  const sysInfo = useGodData<Record<string, unknown>>(fetchSysInfo)

  const execute = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    impact('medium')
    try {
      const r = await executeGodSql(query.trim())
      setResult(r)
      if (r.error) {
        notify('error')
        showToast({ type: 'error', title: 'SQL ошибка' })
      } else {
        notify('success')
      }
    } catch (e) {
      notify('error')
      setResult({ error: e instanceof Error ? e.message : 'Ошибка выполнения' })
    }
    setLoading(false)
  }, [query, impact, notify, showToast])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>

      {/* SQL Console */}
      <div className={s.formSection}>
        <div className={`${s.flexRow} ${s.gap6}`}>
          <Database size={14} color="#d4af37" />
          <div className={s.formLabel} style={{ margin: 0 }}>SQL Консоль</div>
        </div>

        {/* Warning */}
        <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>
          ⚠️ Только SELECT запросы. Все запросы логируются.
        </div>

        {/* Quick presets */}
        <div className={`${s.flexRow} ${s.gap4} ${s.flexWrap}`} style={{ marginTop: 8 }}>
          {SQL_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={s.ghostBtn}
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => { setQuery(p.query); impact('light') }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={s.textarea}
          rows={4}
          style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 8 }}
          spellCheck={false}
        />

        {/* Execute */}
        <button type="button" className={s.primaryBtn} disabled={loading || !query.trim()} onClick={execute}
          style={{ marginTop: 8 }}>
          <Zap size={14} /> {loading ? 'Выполнение...' : 'Выполнить'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className={s.card} style={{ overflow: 'auto' }}>
          {result.error ? (
            <div style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{result.error}</div>
          ) : result.columns && result.rows ? (
            <>
              <div className={s.mutedSmall} style={{ marginBottom: 8 }}>
                {result.total_rows ?? result.rows.length} строк
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={s.sqlTable}>
                  <thead>
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {(row as unknown[]).map((cell, j) => (
                          <td key={j}>{cell === null ? '—' : String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={s.mutedSmall}>Нет данных</div>
          )}
        </div>
      )}

      {/* System Info */}
      <div className={s.formSection}>
        <div className={`${s.flexRow} ${s.gap6}`}>
          <Server size={14} color="#6366f1" />
          <div className={s.formLabel} style={{ margin: 0 }}>Системная информация</div>
        </div>

        {sysInfo.loading && !sysInfo.data ? (
          <Skeleton variant="line" count={4} />
        ) : sysInfo.data ? (
          <div className={`${s.flexCol} ${s.gap2}`} style={{ marginTop: 8 }}>
            {Object.entries(sysInfo.data).map(([key, value]) => (
              <div key={key} className={s.sysRow}>
                <span className={s.sysKey}>{key}</span>
                <span className={s.sysVal}>
                  {Array.isArray(value)
                    ? value.join(', ')
                    : typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value ?? '—')
                  }
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
})
