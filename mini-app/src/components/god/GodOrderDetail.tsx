import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, CreditCard, Send, Percent, Package, RefreshCw } from 'lucide-react'
import {
  fetchGodOrderDetails,
  updateGodOrderStatus,
  updateGodOrderPrice,
  updateGodOrderProgress,
  updateGodOrderNotes,
  confirmGodPayment,
  rejectGodPayment,
  sendGodOrderMessage,
} from '../../api/userApi'
import type { GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, formatMoney, formatDateTime } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

interface Props {
  order: GodOrder
  onClose: () => void
  onUpdate: () => void
}

interface OrderDetailUser {
  telegram_id: number | null
  username: string | null
  fullname: string | null
  balance: number
  orders_count: number
  total_spent: number
  is_banned: boolean
}

interface OrderMessage {
  id: number
  sender_type: string
  message_text: string | null
  file_type: string | null
  file_name: string | null
  created_at: string | null
}

export const GodOrderDetail = memo(function GodOrderDetail({ order, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const [detailOrder, setDetailOrder] = useState<GodOrder>(order)
  const [detailUser, setDetailUser] = useState<OrderDetailUser | null>(null)
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [status, setStatus] = useState(order.status)
  const [price, setPrice] = useState(order.price.toString())
  const [progress, setProgress] = useState(order.progress.toString())
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState(order.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const syncOrder = useCallback((next: GodOrder) => {
    setDetailOrder(next)
    setStatus(next.status)
    setPrice(String(next.price || next.final_price || 0))
    setProgress(String(next.progress || 0))
    setNotes(next.admin_notes || '')
  }, [])

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true)
    try {
      const data = await fetchGodOrderDetails(order.id)
      syncOrder(data.order as GodOrder)
      setDetailUser(data.user)
      setMessages(data.messages)
      setNotes((data.order as GodOrder).admin_notes || '')
    } catch {
      showToast({ type: 'error', title: 'Не удалось открыть заказ', message: 'Попробуйте обновить данные ещё раз' })
    } finally {
      setDetailsLoading(false)
    }
  }, [order.id, showToast, syncOrder])

  useEffect(() => {
    syncOrder(order)
    setDetailUser(null)
    setMessages([])
    setNotes(order.admin_notes || '')
  }, [order, syncOrder])

  useEffect(() => { loadDetails() }, [loadDetails])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDetails(), Promise.resolve(onUpdate())])
  }, [loadDetails, onUpdate])

  const handleStatusChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderStatus(detailOrder.id, status)
      showToast({ type: 'success', title: 'Статус обновлён' })
      await refreshAll()
    } catch { showToast({ type: 'error', title: 'Не удалось обновить статус' }) }
    setSaving(false)
  }

  const handlePriceChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderPrice(detailOrder.id, parseFloat(price))
      showToast({ type: 'success', title: 'Стоимость обновлена' })
      await refreshAll()
    } catch { showToast({ type: 'error', title: 'Не удалось обновить стоимость' }) }
    setSaving(false)
  }

  const handleProgressChange = async () => {
    setSaving(true)
    try {
      await updateGodOrderProgress(detailOrder.id, parseInt(progress, 10))
      showToast({ type: 'success', title: 'Прогресс обновлён' })
      await refreshAll()
    } catch { showToast({ type: 'error', title: 'Не удалось обновить прогресс' }) }
    setSaving(false)
  }

  const handleConfirmPayment = async () => {
    setSaving(true)
    try {
      await confirmGodPayment(detailOrder.id)
      showToast({ type: 'success', title: 'Оплата подтверждена' })
      await Promise.resolve(onUpdate())
      onClose()
    } catch { showToast({ type: 'error', title: 'Не удалось подтвердить оплату' }) }
    setSaving(false)
  }

  const handleRejectPayment = async () => {
    setSaving(true)
    try {
      await rejectGodPayment(detailOrder.id, 'Платёж не найден')
      showToast({ type: 'success', title: 'Проверка оплаты отклонена' })
      await Promise.resolve(onUpdate())
      onClose()
    } catch { showToast({ type: 'error', title: 'Не удалось отклонить оплату' }) }
    setSaving(false)
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    setSaving(true)
    try {
      await sendGodOrderMessage(detailOrder.id, message)
      setMessage('')
      showToast({ type: 'success', title: 'Сообщение отправлено' })
      await loadDetails()
    } catch { showToast({ type: 'error', title: 'Не удалось отправить сообщение' }) }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateGodOrderNotes(detailOrder.id, notes)
      showToast({ type: 'success', title: 'Заметка по заказу сохранена' })
      await refreshAll()
    } catch { showToast({ type: 'error', title: 'Не удалось сохранить заметку' }) }
    setSaving(false)
  }

  const cfg = STATUS_CONFIG[detailOrder.status] || STATUS_CONFIG.pending
  const recentMessages = [...messages].slice(-6).reverse()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className={s.modalOverlay}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className={s.modalSheet}
      >
        {/* Header */}
        <div className={s.modalHeader}>
          <span style={{ padding: '6px 14px', background: cfg.bg, color: cfg.color, borderRadius: 8, fontWeight: 600 }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span className={s.muted}>Заказ #{detailOrder.id}</span>
          <button type="button" onClick={onClose} className={s.ghostBtn} style={{ marginLeft: 'auto' }}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Order info */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            {detailOrder.work_type_label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 1.6 }}>
            {detailOrder.subject || 'Предмет не указан'}
            {detailOrder.topic ? ` • ${detailOrder.topic}` : ''}
          </div>
          <div className={s.muted} style={{ marginTop: 8 }}>
            Клиент: {detailOrder.user_fullname || 'Клиент без имени'}
            {detailOrder.user_username ? ` • @${detailOrder.user_username}` : ''}
            {detailOrder.created_at ? ` • создан ${formatDateTime(detailOrder.created_at)}` : ''}
          </div>
        </div>

        {/* Promo info */}
        {detailOrder.promo_code && (
          <div
            style={{
              marginBottom: 18,
              padding: '16px 18px',
              background: detailOrder.promo_returned
                ? 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.08))'
                : 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(34,197,94,0.10))',
              border: `1px solid ${detailOrder.promo_returned ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.24)'}`,
              borderRadius: 16,
            }}
          >
            <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8, marginBottom: 8 }}>
              <span style={{ color: detailOrder.promo_returned ? '#fca5a5' : '#D4AF37', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Промокод {detailOrder.promo_code}
              </span>
              {detailOrder.promo_discount > 0 && (
                <span className={s.tagSmall} style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>
                  −{detailOrder.promo_discount}%
                </span>
              )}
              {detailOrder.promo_returned && (
                <span className={s.tagSmall} style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>
                  Возвращён
                </span>
              )}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 1.5 }}>
              Экономия клиента: {formatMoney(detailOrder.promo_discount_amount)}
            </div>
          </div>
        )}

        {/* User stats */}
        {detailUser && (
          <div className={s.statGrid3} style={{ marginBottom: 18 }}>
            <div className={s.statCard}>
              <div className={s.statLabel}>Баланс</div>
              <div className={s.statValueGold}>{formatMoney(detailUser.balance)}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Заказов</div>
              <div className={s.statValue}>{detailUser.orders_count}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Потратил</div>
              <div className={s.statValue}>{formatMoney(detailUser.total_spent)}</div>
            </div>
          </div>
        )}

        {/* Materials */}
        {(detailOrder.description || detailOrder.files_url) && (
          <div className={s.cardCompact} style={{ marginBottom: 18 }}>
            <div className={s.cardLabel}>Материалы заказа</div>
            {detailOrder.description && (
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-line', marginBottom: detailOrder.files_url ? 12 : 0 }}>
                {detailOrder.description}
              </div>
            )}
            {detailOrder.files_url && (
              <button type="button" onClick={() => window.open(detailOrder.files_url!, '_blank', 'noopener,noreferrer')} className={s.secondaryBtn} style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                <Package size={16} /> Открыть папку с файлами
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <div className={s.cardCompact} style={{ marginBottom: 18 }}>
          <div className={s.cardLabel}>Внутренняя заметка</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Что важно помнить по этому заказу"
            rows={3}
            className={s.textarea}
            style={{ marginBottom: 10 }}
          />
          <button type="button" onClick={handleSaveNotes} disabled={saving} className={s.secondaryBtn} style={{ width: '100%', justifyContent: 'center' }}>
            Сохранить заметку
          </button>
        </div>

        {/* Payment verification */}
        {detailOrder.status === 'verification_pending' && (
          <div className={s.flexRow} style={{ gap: 10, marginBottom: 18, padding: 16, background: 'rgba(236,72,153,0.1)', borderRadius: 12 }}>
            <button type="button" onClick={handleConfirmPayment} disabled={saving} className={s.successBtn} style={{ flex: 1 }}>
              <Check size={18} /> Подтвердить оплату
            </button>
            <button type="button" onClick={handleRejectPayment} disabled={saving} className={s.dangerBtn} style={{ flex: 1 }}>
              <X size={18} /> Отклонить
            </button>
          </div>
        )}

        {/* Status change */}
        <div style={{ marginBottom: 16 }}>
          <label className={s.formLabel}>Статус заказа</label>
          <div className={s.flexRow} style={{ gap: 8 }}>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={s.input} style={{ flex: 1 }}>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.emoji} {val.label}</option>
              ))}
            </select>
            <button type="button" onClick={handleStatusChange} disabled={saving || status === detailOrder.status} className={s.primaryBtn}>
              <Check size={16} />
            </button>
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 16 }}>
          <label className={s.formLabel}>Стоимость и оплата</label>
          <div className={s.muted} style={{ marginBottom: 8 }}>
            База: {formatMoney(detailOrder.price)} • Финальная: {formatMoney(detailOrder.final_price)} • Оплачено: {formatMoney(detailOrder.paid_amount)}
          </div>
          <div className={s.flexRow} style={{ gap: 8 }}>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={s.input} style={{ flex: 1 }} placeholder={detailOrder.final_price.toString()} />
            <button type="button" onClick={handlePriceChange} disabled={saving} className={s.primaryBtn}>
              <CreditCard size={16} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <label className={s.formLabel}>Прогресс: {progress}%</label>
          <div className={s.flexRow} style={{ gap: 8 }}>
            <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} style={{ flex: 1 }} />
            <button type="button" onClick={handleProgressChange} disabled={saving} className={s.primaryBtn}>
              <Percent size={16} />
            </button>
          </div>
        </div>

        {/* Send message */}
        <div style={{ marginBottom: 16 }}>
          <label className={s.formLabel}>Сообщение клиенту</label>
          <div className={s.flexRow} style={{ gap: 8 }}>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Введите сообщение..." className={s.input} style={{ flex: 1 }} />
            <button type="button" onClick={handleSendMessage} disabled={saving || !message.trim()} className={s.primaryBtn}>
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Recent messages */}
        <div className={s.cardCompact}>
          <div className={s.flexRow} style={{ justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div className={s.cardLabel} style={{ margin: 0 }}>Последние сообщения</div>
            <button type="button" onClick={loadDetails} disabled={detailsLoading} className={s.ghostBtn}>
              <RefreshCw size={14} color="rgba(255,255,255,0.45)" />
            </button>
          </div>
          {detailsLoading ? (
            <div className={s.muted}>Загружаем переписку и детали…</div>
          ) : recentMessages.length === 0 ? (
            <div className={s.muted}>Сообщений пока нет.</div>
          ) : (
            <div className={`${s.flexColumn} ${s.gap8}`}>
              {recentMessages.map((item) => (
                <div key={item.id} className={item.sender_type === 'admin' ? s.messageAdmin : s.messageClient}>
                  <div className={s.flexRow} style={{ justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <span style={{ color: item.sender_type === 'admin' ? '#D4AF37' : '#d4d4d8', fontSize: 12, fontWeight: 700 }}>
                      {item.sender_type === 'admin' ? 'Команда' : 'Клиент'}
                    </span>
                    <span className={s.mutedSmall}>{formatDateTime(item.created_at)}</span>
                  </div>
                  {item.message_text && (
                    <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 1.55 }}>
                      {item.message_text}
                    </div>
                  )}
                  {item.file_name && (
                    <div style={{ color: '#D4AF37', fontSize: 12, marginTop: 6 }}>
                      Файл: {item.file_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})
