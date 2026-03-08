import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, AlertTriangle } from 'lucide-react'
import { executeGodSql } from '../../api/userApi'
import s from '../../pages/GodModePage.module.css'

export const GodSQL = memo(function GodSQL() {
  const [query, setQuery] = useState(
    'SELECT id, fullname, balance FROM users ORDER BY balance DESC LIMIT 10',
  )
  const [result, setResult] = useState<{
    columns: string[]
    rows: string[][]
    error?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = async () => {
    setLoading(true)
    try {
      const res = await executeGodSql(query)
      setResult(res)
    } catch (e: unknown) {
      setResult({ columns: [], rows: [], error: e instanceof Error ? e.message : 'Неизвестная ошибка' })
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      {/* Warning */}
      <div className={s.sqlWarning}>
        <AlertTriangle size={18} color="#f59e0b" />
        <span>Только SELECT-запросы. Любые изменения проводим через отдельные действия панели.</span>
      </div>

      {/* Query */}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10"
        rows={4}
        className={s.monoTextarea}
      />

      <button type="button" onClick={execute} disabled={loading} className={s.primaryBtn}>
        <Zap size={18} /> {loading ? 'Выполняю...' : 'Выполнить'}
      </button>

      {/* Result */}
      {result && (
        <div className={s.card} style={{ overflow: 'auto' }}>
          {result.error ? (
            <div style={{ color: '#ef4444' }}>Ошибка: {result.error}</div>
          ) : (
            <table className={s.sqlTable}>
              <thead>
                <tr>
                  {result.columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.div>
  )
})
