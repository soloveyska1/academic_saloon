import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, CreditCard, Send, Percent, Package, RefreshCw } from 'lucide-react'
import {
  fetchGodOrderDetails, updateGodOrderStatus, updateGodOrderPrice,
  updateGodOrderProgress, updateGodOrderNotes,
  confirmGodPayment, rejectGodPayment, sendGodOrderMessage,
} from '../../api/userApi'
import type { GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, formatMoney, formatDateTime } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

interface Props { order: GodOrder; onClose: () => void; onUpdate: () => void }
interface OrderDetailUser { telegram_id: number | null; username: string | null; fullname: string | null; balance: number; orders_count: number; total_spent: number; is_banned: boolean }
interface OrderMessage { id: number; sender_type: string; message_text: string | null; file_type: string | null; file_name: string | null; created_at: string | null }

export const GodOrderDetail = memo(function GodOrderDetail({ order, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const [det, setDet] = useState<GodOrder>(order)
  const [detUser, setDetUser] = useState<OrderDetailUser | null>(null)
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [detLoading, setDetLoading] = useState(true)
  const [status, setStatus] = useState(order.status)
  const [price, setPrice] = useState(order.price.toString())
  const [progress, setProgress] = useState(order.progress.toString())
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState(order.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const sync = useCallback((o: GodOrder) => { setDet(o); setStatus(o.status); setPrice(String(o.price || o.final_price || 0)); setProgress(String(o.progress || 0)); setNotes(o.admin_notes || '') }, [])

  const loadDetails = useCallback(async () => {
    setDetLoading(true)
    try { const data = await fetchGodOrderDetails(order.id); sync(data.order as GodOrder); setDetUser(data.user); setMessages(data.messages); setNotes((data.order as GodOrder).admin_notes || '') }
    catch { showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось открыть заказ' }) }
    finally { setDetLoading(false) }
  }, [order.id, showToast, sync])

  useEffect(() => { sync(order); setDetUser(null); setMessages([]) }, [order, sync])
  useEffect(() => { loadDetails() }, [loadDetails])

  const refreshAll = useCallback(async () => { await Promise.all([loadDetails(), Promise.resolve(onUpdate())]) }, [loadDetails, onUpdate])
  const act = async (fn: () => Promise<void>, ok: string) => { setSaving(true); try { await fn(); showToast({ type: 'success', title: ok }); await refreshAll() } catch { showToast({ type: 'error', title: 'Ошибка' }) } setSaving(false) }

  const cfg = STATUS_CONFIG[det.status] || STATUS_CONFIG.pending
  const recentMsgs = [...messages].slice(-6).reverse()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className={s.modalOverlay}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(e) => e.stopPropagation()} className={s.modalSheet}>

        <div className={s.modalHeader}>
          <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji} {cfg.label}</span>
          <span className={s.mutedSmall}>#{det.id}</span>
          <button type="button" onClick={onClose} className={`${s.ghostBtn} ${s.mlAuto}`}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 16, marginBottom: 4 }}>{det.work_type_label}</div>
          <div className={s.muted}>{det.subject || 'Без предмета'}{det.topic ? ` · ${det.topic}` : ''}</div>
          <div className={s.mutedSmall} style={{ marginTop: 4 }}>{det.user_fullname}{det.user_username ? ` · @${det.user_username}` : ''}{det.created_at ? ` · ${formatDateTime(det.created_at)}` : ''}</div>
        </div>

        {det.promo_code && (
          <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`} style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: det.promo_returned ? 'rgba(239,68,68,0.08)' : 'rgba(212,175,55,0.08)', border: `1px solid ${det.promo_returned ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.15)'}` }}>
            <span className={s.tagGold}>{det.promo_code}</span>
            {det.promo_discount > 0 && <span className={s.tagGreen}>−{det.promo_discount}%</span>}
            {det.promo_returned && <span className={s.tagRed}>Возвращён</span>}
            <span className={s.mutedSmall}>Экономия: {formatMoney(det.promo_discount_amount)}</span>
          </div>
        )}

        {detUser && (
          <div className={s.statRow3} style={{ marginBottom: 14 }}>
            <div className={s.statCenter}><div className={s.statValueSmall} style={{ color: '#d4af37' }}>{formatMoney(detUser.balance)}</div><div className={s.statLabel}>Баланс</div></div>
            <div className={s.statCenter}><div className={s.statValueSmall}>{detUser.orders_count}</div><div className={s.statLabel}>Заказов</div></div>
            <div className={s.statCenter}><div className={s.statValueSmall}>{formatMoney(detUser.total_spent)}</div><div className={s.statLabel}>Потрачено</div></div>
          </div>
        )}

        {(det.description || det.files_url) && (
          <div className={s.cardCompact} style={{ marginBottom: 14 }}>
            <div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12, marginBottom: 6 }}>Материалы</div>
            {det.description && <div className={s.muted} style={{ whiteSpace: 'pre-line', lineHeight: 1.55, marginBottom: det.files_url ? 8 : 0 }}>{det.description}</div>}
            {det.files_url && <button type="button" onClick={() => window.open(det.files_url!, '_blank', 'noopener')} className={s.secondaryBtn} style={{ width: '100%', justifyContent: 'center' }}><Package size={14} /> Файлы</button>}
          </div>
        )}

        <div className={s.formSection}>
          <label className={s.formLabel}>Заметка</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Заметка" rows={2} className={s.textarea} />
          <button type="button" onClick={() => act(() => updateGodOrderNotes(det.id, notes), 'Сохранено')} disabled={saving} className={s.secondaryBtn} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>Сохранить</button>
        </div>

        {det.status === 'verification_pending' && (
          <div className={`${s.flexRow} ${s.gap6}`} style={{ marginBottom: 14, padding: 10, background: 'rgba(236,72,153,0.08)', borderRadius: 8 }}>
            <button type="button" onClick={() => act(async () => { await confirmGodPayment(det.id); onClose() }, 'Оплата ✓')} disabled={saving} className={s.successBtn} style={{ flex: 1 }}><Check size={14} /> Подтвердить</button>
            <button type="button" onClick={() => act(async () => { await rejectGodPayment(det.id, 'Не найден'); onClose() }, 'Отклонено')} disabled={saving} className={s.dangerBtn} style={{ flex: 1 }}><X size={14} /> Отклонить</button>
          </div>
        )}

        <div className={s.formSection}>
          <label className={s.formLabel}>Статус</label>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={s.input} style={{ flex: 1 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
            <button type="button" onClick={() => act(() => updateGodOrderStatus(det.id, status), 'Статус ✓')} disabled={saving || status === det.status} className={s.primaryBtn}><Check size={14} /></button>
          </div>
        </div>

        <div className={s.formSection}>
          <label className={s.formLabel}>Цена (база: {formatMoney(det.price)} · итого: {formatMoney(det.final_price)} · оплачено: {formatMoney(det.paid_amount)})</label>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={s.input} style={{ flex: 1 }} />
            <button type="button" onClick={() => act(() => updateGodOrderPrice(det.id, parseFloat(price)), 'Цена ✓')} disabled={saving} className={s.primaryBtn}><CreditCard size={14} /></button>
          </div>
        </div>

        <div className={s.formSection}>
          <label className={s.formLabel}>Прогресс: {progress}%</label>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} style={{ flex: 1, accentColor: '#d4af37' }} />
            <button type="button" onClick={() => act(() => updateGodOrderProgress(det.id, parseInt(progress, 10)), 'Прогресс ✓')} disabled={saving} className={s.primaryBtn}><Percent size={14} /></button>
          </div>
        </div>

        <div className={s.formSection}>
          <label className={s.formLabel}>Сообщение клиенту</label>
          <div className={`${s.flexRow} ${s.gap6}`}>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Написать…" className={s.input} style={{ flex: 1 }} />
            <button type="button" onClick={() => { const m = message; setMessage(''); act(() => sendGodOrderMessage(det.id, m), 'Отправлено') }} disabled={saving || !message.trim()} className={s.primaryBtn}><Send size={14} /></button>
          </div>
        </div>

        <div className={s.cardCompact}>
          <div className={`${s.flexRow} ${s.gap8}`} style={{ marginBottom: 8 }}>
            <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12 }}>Сообщения</span>
            <button type="button" onClick={loadDetails} disabled={detLoading} className={`${s.ghostBtn} ${s.mlAuto}`}><RefreshCw size={12} /></button>
          </div>
          {detLoading ? <div className={s.muted}>Загрузка…</div> : recentMsgs.length === 0 ? <div className={s.muted}>Пока нет</div> : (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {recentMsgs.map((m) => (
                <div key={m.id} className={m.sender_type === 'admin' ? s.messageAdmin : s.messageClient}>
                  <div className={`${s.flexRow} ${s.gap6}`} style={{ marginBottom: 3 }}>
                    <span style={{ color: m.sender_type === 'admin' ? '#d4af37' : '#a1a1aa', fontSize: 11, fontWeight: 600 }}>{m.sender_type === 'admin' ? 'Команда' : 'Клиент'}</span>
                    <span className={`${s.mutedSmall} ${s.mlAuto}`}>{formatDateTime(m.created_at)}</span>
                  </div>
                  {m.message_text && <div style={{ color: '#d4d4d8', fontSize: 12, lineHeight: 1.5 }}>{m.message_text}</div>}
                  {m.file_name && <div className={s.mutedSmall} style={{ marginTop: 3 }}>📎 {m.file_name}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})
