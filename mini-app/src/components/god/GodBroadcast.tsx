import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, AlertTriangle } from 'lucide-react'
import { sendGodBroadcast } from '../../api/userApi'
import s from '../../pages/GodModePage.module.css'

export const GodBroadcast = memo(function GodBroadcast() {
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'all' | 'active' | 'with_orders'>('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const send = async () => {
    if (!text.trim() || !confirm(`Отправить рассылку → ${target}?`)) return
    setSending(true)
    try { const r = await sendGodBroadcast(text, target); setResult({ sent: r.sent, failed: r.failed }); setText('') }
    catch { /* silent */ }
    setSending(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      <div className={s.warningBarRed}>
        <AlertTriangle size={14} /> Сообщение уйдёт всем выбранным пользователям
      </div>

      <div>
        <label className={s.formLabel}>Получатели</label>
        <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className={s.input}>
          <option value="all">Все</option>
          <option value="active">Активные (7 дн)</option>
          <option value="with_orders">С заказами</option>
        </select>
      </div>

      <div>
        <label className={s.formLabel}>Сообщение (HTML)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'<b>Заголовок</b>\n\nТекст…'} rows={5} className={s.textarea} />
      </div>

      <button type="button" onClick={send} disabled={sending || !text.trim()} className={s.dangerBtn} style={{ justifyContent: 'center' }}>
        <Send size={14} /> {sending ? 'Отправка…' : 'Отправить'}
      </button>

      {result && (
        <div className={s.broadcastResult}>
          <div style={{ color: '#4ade80', fontWeight: 600, fontSize: 13 }}>Отправлено: {result.sent}</div>
          {result.failed > 0 && <div style={{ color: '#f87171', fontSize: 12 }}>Ошибок: {result.failed}</div>}
        </div>
      )}
    </motion.div>
  )
})
