/**
 * God Mode v3 — Order Detail Bottom Sheet
 * Tabs: Инфо | Чат | Хронология
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { Send, Check, X, ExternalLink } from 'lucide-react'
import {
  fetchGodOrderDetails, updateGodOrderStatus, updateGodOrderPrice,
  updateGodOrderProgress, updateGodOrderNotes, confirmGodPayment,
  rejectGodPayment, sendGodOrderMessage,
} from '../../api/userApi'
import type { GodOrder, GodUser, GodOrderMessage } from '../../types'
import { STATUS_CONFIG, formatMoney, formatDateTime } from './godConstants'
import { useHaptic } from './godHooks'
import { useToast } from '../ui/Toast'
import { BottomSheet } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

const SHEET_TABS = [
  { id: 'info', label: 'Инфо' },
  { id: 'chat', label: 'Чат' },
  { id: 'timeline', label: 'Хронология' },
]

interface OrderSheetProps {
  orderId: number | null
  onClose: () => void
}

export const OrderSheet = memo(function OrderSheet({ orderId, onClose }: OrderSheetProps) {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const [tab, setTab] = useState('info')
  const [order, setOrder] = useState<GodOrder | null>(null)
  const [user, setUser] = useState<GodUser | null>(null)
  const [messages, setMessages] = useState<GodOrderMessage[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [newStatus, setNewStatus] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newProgress, setNewProgress] = useState(0)
  const [notes, setNotes] = useState('')
  const [msgText, setMsgText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const r = await fetchGodOrderDetails(orderId)
      setOrder(r.order)
      setUser(r.user)
      setMessages((r.messages || []) as GodOrderMessage[])
      setNewStatus(r.order.status)
      setNewPrice(String(r.order.price || ''))
      setNewProgress(r.order.progress || 0)
      setNotes(r.order.admin_notes || '')
    } catch { showToast({ type: 'error', title: 'Не удалось загрузить' }) }
    setLoading(false)
  }, [orderId, showToast])

  useEffect(() => { if (orderId) { setTab('info'); load() } }, [orderId, load])

  const act = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    impact('medium')
    try {
      await fn()
      notify('success')
      showToast({ type: 'success', title: label })
      load()
    } catch (e) {
      notify('error')
      showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось выполнить действие. Попробуйте позже.' })
    }
    setBusy(false)
  }, [impact, notify, showToast, load])

  if (!orderId) return null

  const cfg = order ? STATUS_CONFIG[order.status] : null
  const isVerification = order?.status === 'verification_pending'

  return (
    <BottomSheet
      isOpen={!!orderId}
      onClose={onClose}
      title={order ? `Заказ #${order.id}` : 'Загрузка...'}
      tabs={SHEET_TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {loading && !order ? (
        <div className={s.mutedSmall} style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>
      ) : order ? (
        <>
          {/* ═══════ INFO TAB ═══════ */}
          {tab === 'info' && (
            <div className={`${s.flexCol} ${s.gap10}`}>
              {/* Status */}
              {cfg && (
                <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color, alignSelf: 'flex-start' }}>
                  {cfg.emoji} {cfg.label}
                </span>
              )}

              {/* Order Info */}
              <div className={s.card}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{order.work_type_label || order.work_type}</div>
                {order.subject && <div className={s.mutedSmall}>Предмет: {order.subject}</div>}
                {order.topic && <div className={s.mutedSmall}>Тема: {order.topic}</div>}
                {order.deadline && <div className={s.mutedSmall}>Дедлайн: {formatDateTime(order.deadline)}</div>}
              </div>

              {/* User Info */}
              {user && (
                <div className={s.card}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {user.fullname || 'Без имени'} {user.username ? `@${user.username}` : ''}
                  </div>
                  <div className={`${s.flexRow} ${s.gap8} ${s.flexWrap}`} style={{ marginTop: 6 }}>
                    <span className={s.tagGold}>{formatMoney(user.balance)}</span>
                    <span className={s.tagMuted}>{user.orders_count} заказов</span>
                    <span className={s.tagMuted}>{formatMoney(user.total_spent)} потрачено</span>
                  </div>
                </div>
              )}

              {/* Promo Info */}
              {order.promo_code && (
                <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`}>
                  <span className={s.tagGold}>{order.promo_code} −{order.promo_discount}%</span>
                  <span className={s.tagGreen}>Экономия: {formatMoney(order.promo_discount_amount)}</span>
                  {order.promo_returned && <span className={s.tagRed}>Возвращён</span>}
                </div>
              )}

              {/* Price Summary */}
              <div className={s.card}>
                <div className={`${s.flexRow} ${s.gap8}`}>
                  <div className={s.flex1}>
                    <div className={s.mutedSmall}>Цена</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#d4af37' }}>{formatMoney(order.final_price || order.price)}</div>
                  </div>
                  <div>
                    <div className={s.mutedSmall}>Оплачено</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: order.paid_amount >= (order.final_price || order.price) ? '#22c55e' : '#f59e0b' }}>
                      {formatMoney(order.paid_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials */}
              {order.description && (
                <div className={s.formSection}>
                  <div className={s.formLabel}>Описание</div>
                  <div className={s.mutedSmall} style={{ whiteSpace: 'pre-wrap' }}>{order.description}</div>
                </div>
              )}
              {order.files_url && (
                <a href={order.files_url} target="_blank" rel="noopener noreferrer" className={s.secondaryBtn}>
                  <ExternalLink size={12} /> Материалы
                </a>
              )}

              {/* Payment Actions */}
              {isVerification && (
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <button type="button" className={`${s.successBtn} ${s.btnFull}`} disabled={busy}
                    onClick={() => act('Оплата подтверждена', () => confirmGodPayment(order.id))}>
                    <Check size={14} /> Подтвердить
                  </button>
                  <button type="button" className={`${s.dangerBtn} ${s.btnFull}`} disabled={busy}
                    onClick={() => act('Оплата отклонена', () => rejectGodPayment(order.id))}>
                    <X size={14} /> Отклонить
                  </button>
                </div>
              )}

              {/* Status Change */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Статус</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={s.filterSelect} style={{ flex: 1 }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                  <button type="button" className={s.primaryBtn} disabled={busy || newStatus === order.status}
                    onClick={() => act('Статус обновлён', () => updateGodOrderStatus(order.id, newStatus))}>
                    OK
                  </button>
                </div>
              </div>

              {/* Price Change */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Цена</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <input type="number" inputMode="numeric" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                    className={s.input} style={{ flex: 1 }} placeholder="0" />
                  <button type="button" className={s.primaryBtn} disabled={busy || !newPrice}
                    onClick={() => act('Цена обновлена', () => updateGodOrderPrice(order.id, Number(newPrice)))}>
                    OK
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Прогресс: {newProgress}%</div>
                <input type="range" min={0} max={100} value={newProgress} onChange={(e) => setNewProgress(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#d4af37' }} />
                <button type="button" className={s.secondaryBtn} disabled={busy || newProgress === order.progress}
                  onClick={() => act('Прогресс обновлён', () => updateGodOrderProgress(order.id, newProgress))} style={{ marginTop: 4 }}>
                  Сохранить
                </button>
              </div>

              {/* Notes */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Заметки</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={s.textarea} rows={3} />
                <button type="button" className={s.secondaryBtn} disabled={busy || notes === (order.admin_notes || '')}
                  onClick={() => act('Заметки сохранены', () => updateGodOrderNotes(order.id, notes))} style={{ marginTop: 4 }}>
                  Сохранить
                </button>
              </div>

              {/* Send Message */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Сообщение клиенту</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
                    className={s.input} style={{ flex: 1 }} placeholder="Текст..." />
                  <button type="button" className={s.primaryBtn} disabled={busy || !msgText.trim()}
                    onClick={() => act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText('') })}>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ CHAT TAB ═══════ */}
          {tab === 'chat' && (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {messages.length === 0 ? (
                <div className={s.mutedSmall} style={{ textAlign: 'center', padding: 20 }}>Нет сообщений</div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_type === 'admin'
                  return (
                    <div key={msg.id} style={{
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: isAdmin ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isAdmin ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div style={{ fontSize: 12, color: isAdmin ? '#d4af37' : '#e4e4e7', whiteSpace: 'pre-wrap' }}>
                        {msg.message_text || (msg.file_name ? `📎 ${msg.file_name}` : '—')}
                      </div>
                      <div className={s.mutedSmall} style={{ marginTop: 2, textAlign: 'right' }}>
                        {formatDateTime(msg.created_at)}
                      </div>
                    </div>
                  )
                })
              )}
              <div className={`${s.flexRow} ${s.gap6}`} style={{ marginTop: 8 }}>
                <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
                  className={s.input} style={{ flex: 1 }} placeholder="Сообщение..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && msgText.trim()) {
                      act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText(''); await load() })
                    }
                  }}
                />
                <button type="button" className={s.primaryBtn} disabled={busy || !msgText.trim()}
                  onClick={() => act('Отправлено', async () => { await sendGodOrderMessage(order.id, msgText); setMsgText(''); await load() })}>
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════ TIMELINE TAB ═══════ */}
          {tab === 'timeline' && (
            <div className={s.timeline}>
              <div className={s.timelineItem}>
                <div className={s.timelineDot} />
                <div className={s.timelineContent}>
                  <div style={{ color: '#fff', fontWeight: 500 }}>Текущий статус: {cfg?.label}</div>
                  <div className={s.timelineTime}>{cfg?.emoji}</div>
                </div>
              </div>
              {order.progress > 0 && (
                <div className={s.timelineItem}>
                  <div className={s.timelineDot} style={{ borderColor: '#6366f1' }} />
                  <div className={s.timelineContent}>
                    <div style={{ color: '#e4e4e7' }}>Прогресс: {order.progress}%</div>
                  </div>
                </div>
              )}
              {order.paid_amount > 0 && (
                <div className={s.timelineItem}>
                  <div className={s.timelineDot} style={{ borderColor: '#22c55e' }} />
                  <div className={s.timelineContent}>
                    <div style={{ color: '#e4e4e7' }}>Оплата: {formatMoney(order.paid_amount)}</div>
                  </div>
                </div>
              )}
              <div className={s.timelineItem}>
                <div className={s.timelineDot} style={{ borderColor: '#71717a' }} />
                <div className={s.timelineContent}>
                  <div style={{ color: '#e4e4e7' }}>Создан</div>
                  <div className={s.timelineTime}>{formatDateTime(order.created_at)}</div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </BottomSheet>
  )
})
