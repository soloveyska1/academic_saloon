import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Ban, Eye, EyeOff, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import {
  fetchGodUserDetails,
  modifyGodUserBalance,
  toggleGodUserBan,
  toggleGodUserWatch,
  updateGodUserNotes,
} from '../../api/userApi'
import type { GodUser, GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, TRANSACTION_REASON_LABELS, formatMoney, formatDateTime } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

interface Props {
  user: GodUser
  onClose: () => void
  onUpdate: () => void
}

interface Transaction {
  id: number
  amount: number
  type: string
  reason: string
  description: string | null
  created_at: string | null
}

export const GodUserDetail = memo(function GodUserDetail({ user, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const [detailUser, setDetailUser] = useState<GodUser>(user)
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [notes, setNotes] = useState(user.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true)
    try {
      const data = await fetchGodUserDetails(user.telegram_id)
      setDetailUser(data.user as GodUser)
      setOrders(data.orders as GodOrder[])
      setTransactions(data.transactions)
      setNotes((data.user as GodUser).admin_notes || '')
    } catch {
      showToast({ type: 'error', title: 'Не удалось открыть клиента', message: 'Попробуйте обновить данные ещё раз' })
    } finally {
      setDetailsLoading(false)
    }
  }, [showToast, user.telegram_id])

  useEffect(() => {
    setDetailUser(user)
    setNotes(user.admin_notes || '')
    setOrders([])
    setTransactions([])
  }, [user])

  useEffect(() => { loadDetails() }, [loadDetails])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDetails(), Promise.resolve(onUpdate())])
  }, [loadDetails, onUpdate])

  const handleBalance = async (add: boolean) => {
    if (!balanceAmount) return
    setSaving(true)
    try {
      const amount = add ? parseFloat(balanceAmount) : -parseFloat(balanceAmount)
      await modifyGodUserBalance(detailUser.telegram_id, amount, balanceReason || 'Ручная корректировка', true)
      setBalanceAmount('')
      setBalanceReason('')
      showToast({ type: 'success', title: 'Баланс обновлён' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить баланс' })
    }
    setSaving(false)
  }

  const handleBan = async () => {
    setSaving(true)
    try {
      await toggleGodUserBan(detailUser.telegram_id, !detailUser.is_banned)
      showToast({ type: 'success', title: detailUser.is_banned ? 'Блокировка снята' : 'Клиент заблокирован' })
      await refreshAll()
      if (!detailUser.is_banned) onClose()
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить блокировку' })
    }
    setSaving(false)
  }

  const handleWatch = async () => {
    setSaving(true)
    try {
      await toggleGodUserWatch(detailUser.telegram_id, !detailUser.is_watched)
      showToast({ type: 'success', title: detailUser.is_watched ? 'Наблюдение снято' : 'Клиент добавлен под наблюдение' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось изменить наблюдение' })
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await updateGodUserNotes(detailUser.telegram_id, notes)
      showToast({ type: 'success', title: 'Заметки сохранены' })
      await refreshAll()
    } catch {
      showToast({ type: 'error', title: 'Не удалось сохранить заметки' })
    }
    setSaving(false)
  }

  const recentOrders = orders.slice(0, 5)
  const recentTransactions = transactions.slice(0, 5)

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
          <div style={{ fontSize: 32 }}>{detailUser.rank_emoji}</div>
          <div className={s.flex1}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              {detailUser.fullname || 'Клиент без имени'}
            </div>
            <div className={s.muted}>
              {detailUser.username ? `@${detailUser.username}` : 'Без username'} • ID: {detailUser.telegram_id}
            </div>
          </div>
          <button type="button" onClick={onClose} className={s.ghostBtn}>
            <X size={24} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Top stats */}
        <div className={s.statGrid3} style={{ marginBottom: 18 }}>
          <div className={s.statCenter}>
            <div className={s.statValueGold}>{formatMoney(detailUser.balance)}</div>
            <div className={s.statLabel}>Баланс</div>
          </div>
          <div className={s.statCenter}>
            <div className={s.statValue}>{detailUser.orders_count}</div>
            <div className={s.statLabel}>Заказов</div>
          </div>
          <div className={s.statCenter}>
            <div className={s.statValue}>{formatMoney(detailUser.total_spent)}</div>
            <div className={s.statLabel}>Потрачено</div>
          </div>
        </div>

        {/* Rank & Referrals */}
        <div className={s.statGrid2} style={{ marginBottom: 18 }}>
          <div className={s.statCard} style={{ borderRadius: 12 }}>
            <div className={s.statLabel}>Статус</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{detailUser.rank_name}</div>
            <div className={s.muted} style={{ marginTop: 4 }}>
              Лояльность: {detailUser.loyalty_status} • скидка {detailUser.loyalty_discount}%
            </div>
          </div>
          <div className={s.statCard} style={{ borderRadius: 12 }}>
            <div className={s.statLabel}>Рефералы</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{detailUser.referrals_count}</div>
            <div className={s.muted} style={{ marginTop: 4 }}>
              Заработано: {formatMoney(detailUser.referral_earnings)}
            </div>
          </div>
        </div>

        {/* Bonus expiry */}
        {detailUser.bonus_expiry?.has_expiry && (
          <div className={s.card} style={{ marginBottom: 18, padding: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>Бонусный баланс под контролем</div>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.55 }}>
              {detailUser.bonus_expiry.status_text} • cгорит {formatMoney(detailUser.bonus_expiry.burn_amount)}
            </div>
          </div>
        )}

        {/* Balance modifier */}
        <div style={{ marginBottom: 20 }}>
          <label className={s.formLabel}>Изменить баланс</label>
          <div className={s.flexRow} style={{ gap: 8, marginBottom: 8 }}>
            <input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="Сумма" className={s.input} style={{ flex: 1 }} />
            <button type="button" onClick={() => handleBalance(true)} disabled={saving || !balanceAmount} className={s.successBtn}>
              <TrendingUp size={16} />
            </button>
            <button type="button" onClick={() => handleBalance(false)} disabled={saving || !balanceAmount} className={s.dangerBtn}>
              <TrendingDown size={16} />
            </button>
          </div>
          <input type="text" value={balanceReason} onChange={(e) => setBalanceReason(e.target.value)} placeholder="Причина изменения" className={s.input} />
        </div>

        {/* Ban / Watch */}
        <div className={s.flexRow} style={{ gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={handleBan}
            disabled={saving}
            className={detailUser.is_banned ? s.successBtn : s.dangerBtn}
            style={{ flex: 1 }}
          >
            {detailUser.is_banned ? <Check size={16} /> : <Ban size={16} />}
            {detailUser.is_banned ? 'Разблокировать' : 'Заблокировать'}
          </button>
          <button
            type="button"
            onClick={handleWatch}
            disabled={saving}
            className={s.secondaryBtn}
            style={{
              flex: 1,
              background: detailUser.is_watched ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {detailUser.is_watched ? <EyeOff size={16} /> : <Eye size={16} />}
            {detailUser.is_watched ? 'Снять наблюдение' : 'Наблюдать'}
          </button>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 18 }}>
          <label className={s.formLabel}>Заметки по клиенту</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Что важно помнить о клиенте" rows={3} className={s.textarea} />
          <button type="button" onClick={handleSaveNotes} disabled={saving} className={s.primaryBtn} style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
            Сохранить заметки
          </button>
        </div>

        {/* Recent orders */}
        <div className={s.cardCompact} style={{ marginBottom: 14 }}>
          <div className={s.flexRow} style={{ justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div className={s.cardLabel} style={{ margin: 0 }}>Последние заказы</div>
            <button type="button" onClick={loadDetails} className={s.ghostBtn}>
              <RefreshCw size={14} color="rgba(255,255,255,0.45)" />
            </button>
          </div>
          {detailsLoading ? (
            <div className={s.muted}>Загружаем историю клиента…</div>
          ) : recentOrders.length === 0 ? (
            <div className={s.muted}>У клиента пока нет заказов.</div>
          ) : (
            <div className={`${s.flexColumn} ${s.gap8}`}>
              {recentOrders.map((item) => {
                const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
                return (
                  <div key={item.id} className={s.messageClient}>
                    <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>#{item.id}</span>
                      <span className={s.tagSmall} style={{ background: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                      <span className={s.mlAuto} style={{ color: '#D4AF37', fontWeight: 700 }}>
                        {formatMoney(item.final_price)}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{item.work_type_label}</div>
                    <div className={s.muted} style={{ marginTop: 4 }}>
                      {item.subject || 'Предмет не указан'} • {formatDateTime(item.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className={s.cardCompact}>
          <div className={s.cardLabel}>Последние операции</div>
          {detailsLoading ? (
            <div className={s.muted}>Загружаем операции…</div>
          ) : recentTransactions.length === 0 ? (
            <div className={s.muted}>Операций пока нет.</div>
          ) : (
            <div className={`${s.flexColumn} ${s.gap8}`}>
              {recentTransactions.map((item) => (
                <div key={item.id} className={s.messageClient}>
                  <div className={s.flexRow} style={{ justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {TRANSACTION_REASON_LABELS[item.reason] || item.description || 'Операция'}
                    </div>
                    <div style={{ color: item.amount >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>
                      {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount)}
                    </div>
                  </div>
                  <div className={s.muted}>
                    {item.description || 'Без комментария'} • {formatDateTime(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})
