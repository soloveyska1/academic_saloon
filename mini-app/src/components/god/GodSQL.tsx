import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, AlertTriangle } from 'lucide-react'
import { executeGodSql } from '../../api/userApi'
import s from '../../pages/GodModePage.module.css'

export const GodSQL = memo(function GodSQL() {
  const [query, setQuery] = useState('SELECT id, fullname, balance FROM users ORDER BY balance DESC LIMIT 10')
  const [result, setResult] = useState<{ columns: string[]; rows: string[][]; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = async () => {
    setLoading(true)
    try { setResult(await executeGodSql(query)) }
    catch (e) { setResult({ columns: [], rows: [], error: e instanceof Error ? e.message : 'Ошибка' }) }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      <div className={s.warningBarYellow}>
        <AlertTriangle size={14} /> Только SELECT-запросы
      </div>

      <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SELECT * FROM …" rows={4} className={s.monoTextarea} />

      <button type="button" onClick={execute} disabled={loading} className={s.primaryBtn}>
        <Zap size={14} /> {loading ? 'Выполняю…' : 'Выполнить'}
      </button>

      {result && (
        <div className={s.card} style={{ overflow: 'auto' }}>
          {result.error
            ? <div style={{ color: '#f87171', fontSize: 12 }}>Ошибка: {result.error}</div>
            : (
              <table className={s.sqlTable}>
                <thead><tr>{result.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
              </table>
            )}
        </div>
      )}
    </motion.div>
  )
})
