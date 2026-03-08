import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Ban, Eye, EyeOff, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { fetchGodUserDetails, modifyGodUserBalance, toggleGodUserBan, toggleGodUserWatch, updateGodUserNotes } from '../../api/userApi'
import type { GodUser, GodOrder } from '../../types'
import { useToast } from '../ui/Toast'
import { STATUS_CONFIG, TRANSACTION_REASON_LABELS, formatMoney, formatDateTime } from './godHelpers'
import s from '../../pages/GodModePage.module.css'

interface Props { user: GodUser; onClose: () => void; onUpdate: () => void }
interface Transaction { id: number; amount: number; type: string; reason: string; description: string | null; created_at: string | null }

export const GodUserDetail = memo(function GodUserDetail({ user, onClose, onUpdate }: Props) {
  const { showToast } = useToast()
  const [det, setDet] = useState<GodUser>(user)
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [detLoading, setDetLoading] = useState(true)
  const [balanceAmt, setBalanceAmt] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [notes, setNotes] = useState(user.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const loadDetails = useCallback(async () => {
    setDetLoading(true)
    try { const data = await fetchGodUserDetails(user.telegram_id); setDet(data.user as GodUser); setOrders(data.orders as GodOrder[]); setTransactions(data.transactions); setNotes((data.user as GodUser).admin_notes || '') }
    catch { showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось загрузить' }) }
    finally { setDetLoading(false) }
  }, [showToast, user.telegram_id])

  useEffect(() => { setDet(user); setNotes(user.admin_notes || ''); setOrders([]); setTransactions([]) }, [user])
  useEffect(() => { loadDetails() }, [loadDetails])
  const refreshAll = useCallback(async () => { await Promise.all([loadDetails(), Promise.resolve(onUpdate())]) }, [loadDetails, onUpdate])

  const act = async (fn: () => Promise<void>, ok: string) => { setSaving(true); try { await fn(); showToast({ type: 'success', title: ok }); await refreshAll() } catch { showToast({ type: 'error', title: 'Ошибка' }) } setSaving(false) }

  const handleBalance = (add: boolean) => {
    if (!balanceAmt) return
    const amount = add ? parseFloat(balanceAmt) : -parseFloat(balanceAmt)
    act(async () => { await modifyGodUserBalance(det.telegram_id, amount, balanceReason || 'Ручная корректировка', true); setBalanceAmt(''); setBalanceReason('') }, 'Баланс ✓')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className={s.modalOverlay}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(e) => e.stopPropagation()} className={s.modalSheet}>

        <div className={s.modalHeader}>
          <span style={{ fontSize: 24 }}>{det.rank_emoji}</span>
          <div className={s.flex1}>
            <div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 15 }}>{det.fullname || 'Без имени'}</div>
            <div className={s.mutedSmall}>{det.username ? `@${det.username}` : 'Без username'} · ID: {det.telegram_id}</div>
          </div>
          <button type="button" onClick={onClose} className={s.ghostBtn}><X size={20} /></button>
        </div>

        {/* Stats */}
        <div className={s.statRow3} style={{ marginBottom: 14 }}>
          <div className={s.statCenter}><div className={s.statValueSmall} style={{ color: '#d4af37' }}>{formatMoney(det.balance)}</div><div className={s.statLabel}>Баланс</div></div>
          <div className={s.statCenter}><div className={s.statValueSmall}>{det.orders_count}</div><div className={s.statLabel}>Заказов</div></div>
          <div className={s.statCenter}><div className={s.statValueSmall}>{formatMoney(det.total_spent)}</div><div className={s.statLabel}>Потрачено</div></div>
        </div>

        {/* Rank */}
        <div className={s.statRow2} style={{ marginBottom: 14 }}>
          <div className={s.stat} style={{ '--accent': '#d4af37' } as React.CSSProperties}>
            <div className={s.statLabel}>Статус</div>
            <div className={s.statValueSmall}>{det.rank_name}</div>
            <div className={s.mutedSmall}>{det.loyalty_status} · −{det.loyalty_discount}%</div>
          </div>
          <div className={s.stat} style={{ '--accent': '#3b82f6' } as React.CSSProperties}>
            <div className={s.statLabel}>Рефералы</div>
            <div className={s.statValueSmall}>{det.referrals_count}</div>
            <div className={s.mutedSmall}>Заработано: {formatMoney(det.referral_earnings)}</div>
          </div>
        </div>

        {/* Bonus expiry */}
        {det.bonus_expiry?.has_expiry && (
          <div style={{ marginBottom: 14, padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 12 }}>Бонусы сгорают</div>
            <div className={s.mutedSmall}>{det.bonus_expiry.status_text} · −{formatMoney(det.bonus_expiry.burn_amount)}</div>
          </div>
        )}

        {/* Balance modifier */}
        <div className={s.formSection}>
          <label className={s.formLabel}>Баланс</label>
          <div className={`${s.flexRow} ${s.gap6}`} style={{ marginBottom: 6 }}>
            <input type="number" value={balanceAmt} onChange={(e) => setBalanceAmt(e.target.value)} placeholder="Сумма" className={s.input} style={{ flex: 1 }} />
            <button type="button" onClick={() => handleBalance(true)} disabled={saving || !balanceAmt} className={s.successBtn}><TrendingUp size={14} /></button>
            <button type="button" onClick={() => handleBalance(false)} disabled={saving || !balanceAmt} className={s.dangerBtn}><TrendingDown size={14} /></button>
          </div>
          <input type="text" value={balanceReason} onChange={(e) => setBalanceReason(e.target.value)} placeholder="Причина" className={s.input} />
        </div>

        {/* Ban / Watch */}
        <div className={`${s.flexRow} ${s.gap6}`} style={{ marginBottom: 14 }}>
          <button type="button" onClick={() => act(async () => { await toggleGodUserBan(det.telegram_id, !det.is_banned); if (!det.is_banned) onClose() }, det.is_banned ? 'Разбанен' : 'Забанен')} disabled={saving} className={det.is_banned ? s.successBtn : s.dangerBtn} style={{ flex: 1 }}>
            {det.is_banned ? <><Check size={14} /> Разбанить</> : <><Ban size={14} /> Забанить</>}
          </button>
          <button type="button" onClick={() => act(() => toggleGodUserWatch(det.telegram_id, !det.is_watched), det.is_watched ? 'Снято' : 'Под наблюдением')} disabled={saving} className={s.secondaryBtn} style={{ flex: 1, background: det.is_watched ? 'rgba(245,158,11,0.15)' : undefined }}>
            {det.is_watched ? <><EyeOff size={14} /> Снять</> : <><Eye size={14} /> Наблюдать</>}
          </button>
        </div>

        {/* Notes */}
        <div className={s.formSection}>
          <label className={s.formLabel}>Заметки</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Заметка" rows={2} className={s.textarea} />
          <button type="button" onClick={() => act(() => updateGodUserNotes(det.telegram_id, notes), 'Сохранено')} disabled={saving} className={s.primaryBtn} style={{ marginTop: 6, width: '100%', justifyContent: 'center' }}>Сохранить</button>
        </div>

        {/* Recent orders */}
        <div className={s.cardCompact} style={{ marginBottom: 10 }}>
          <div className={`${s.flexRow} ${s.gap8}`} style={{ marginBottom: 8 }}>
            <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12 }}>Заказы</span>
            <button type="button" onClick={loadDetails} className={`${s.ghostBtn} ${s.mlAuto}`}><RefreshCw size={12} /></button>
          </div>
          {detLoading ? <div className={s.muted}>Загрузка…</div> : orders.length === 0 ? <div className={s.muted}>Нет заказов</div> : (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {orders.slice(0, 5).map((o) => {
                const st = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending
                return (
                  <div key={o.id} className={s.messageClient}>
                    <div className={`${s.flexRow} ${s.gap6}`}>
                      <span className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12 }}>#{o.id}</span>
                      <span className={s.statusBadge} style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                      <span className={`${s.textGold} ${s.bold} ${s.mlAuto}`} style={{ fontSize: 12 }}>{formatMoney(o.final_price)}</span>
                    </div>
                    <div className={s.mutedSmall}>{o.work_type_label} · {o.subject || 'Без предмета'} · {formatDateTime(o.created_at)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className={s.cardCompact}>
          <div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12, marginBottom: 8 }}>Операции</div>
          {detLoading ? <div className={s.muted}>Загрузка…</div> : transactions.length === 0 ? <div className={s.muted}>Нет операций</div> : (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className={s.messageClient}>
                  <div className={`${s.flexRow} ${s.gap6}`}>
                    <span className={s.textWhite} style={{ fontSize: 12, fontWeight: 600 }}>{TRANSACTION_REASON_LABELS[t.reason] || t.description || 'Операция'}</span>
                    <span className={`${s.bold} ${s.mlAuto}`} style={{ fontSize: 12, color: t.amount >= 0 ? '#4ade80' : '#f87171' }}>{t.amount >= 0 ? '+' : ''}{formatMoney(t.amount)}</span>
                  </div>
                  <div className={s.mutedSmall}>{t.description || '—'} · {formatDateTime(t.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})
