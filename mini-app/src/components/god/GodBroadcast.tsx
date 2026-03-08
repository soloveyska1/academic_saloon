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
    if (!text.trim()) return
    if (!confirm(`Отправить рассылку ${target}?`)) return

    setSending(true)
    try {
      const res = await sendGodBroadcast(text, target)
      setResult({ sent: res.sent, failed: res.failed })
      setText('')
    } catch {
      /* silent */
    }
    setSending(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      {/* Warning */}
      <div className={s.broadcastWarning}>
        <AlertTriangle size={18} />
        <span>Осторожно! Сообщение будет отправлено всем выбранным пользователям.</span>
      </div>

      {/* Target */}
      <div>
        <label className={s.formLabel}>Получатели</label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as 'all' | 'active' | 'with_orders')}
          className={s.input}
        >
          <option value="all">Все пользователи</option>
          <option value="active">Активные (7 дней)</option>
          <option value="with_orders">С заказами</option>
        </select>
      </div>

      {/* Message */}
      <div>
        <label className={s.formLabel}>Сообщение (поддерживает HTML)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'<b>Заголовок</b>\n\nТекст сообщения...'}
          rows={6}
          className={s.textarea}
        />
      </div>

      {/* Send */}
      <button
        type="button"
        onClick={send}
        disabled={sending || !text.trim()}
        className={s.dangerBtn}
        style={{ justifyContent: 'center' }}
      >
        <Send size={18} /> {sending ? 'Отправка...' : 'Отправить рассылку'}
      </button>

      {/* Result */}
      {result && (
        <div className={s.broadcastResult}>
          <div style={{ color: '#22c55e', fontWeight: 600 }}>Отправлено: {result.sent}</div>
          {result.failed > 0 && (
            <div style={{ color: '#ef4444', fontSize: 12 }}>Ошибок: {result.failed}</div>
          )}
        </div>
      )}
    </motion.div>
  )
})
