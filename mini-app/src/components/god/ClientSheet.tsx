/**
 * God Mode v3 — Client Detail Bottom Sheet
 * Tabs: Профиль | Заказы | Финансы
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { Ban, Eye, EyeOff, Plus, Minus } from 'lucide-react'
import {
  fetchGodUserDetails, modifyGodUserBalance, toggleGodUserBan,
  toggleGodUserWatch, updateGodUserNotes,
} from '../../api/userApi'
import type { GodUser, GodOrder } from '../../types'
import { STATUS_CONFIG, TRANSACTION_REASON_LABELS, formatMoney, formatDateTime } from './godConstants'
import { useHaptic } from './godHooks'
import { useToast } from '../ui/Toast'
import { BottomSheet } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

interface Transaction {
  id: number
  amount: number
  type: string
  reason: string
  description: string | null
  created_at: string | null
}

const SHEET_TABS = [
  { id: 'profile', label: 'Профиль' },
  { id: 'orders', label: 'Заказы' },
  { id: 'finance', label: 'Финансы' },
]

interface ClientSheetProps {
  userId: number | null
  onClose: () => void
}

export const ClientSheet = memo(function ClientSheet({ userId, onClose }: ClientSheetProps) {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const [tab, setTab] = useState('profile')
  const [user, setUser] = useState<GodUser | null>(null)
  const [orders, setOrders] = useState<GodOrder[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [balAmt, setBalAmt] = useState('')
  const [balReason, setBalReason] = useState('admin_adjustment')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const r = await fetchGodUserDetails(userId)
      setUser(r.user)
      setOrders(r.orders || [])
      setTransactions((r.transactions || []) as Transaction[])
      setNotes(r.user.admin_notes || '')
    } catch { showToast({ type: 'error', title: 'Не удалось загрузить' }) }
    setLoading(false)
  }, [userId, showToast])

  useEffect(() => { if (userId) { setTab('profile'); load() } }, [userId, load])

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

  if (!userId) return null

  return (
    <BottomSheet
      isOpen={!!userId}
      onClose={onClose}
      title={user ? (user.fullname || 'Клиент') : 'Загрузка...'}
      tabs={SHEET_TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {loading && !user ? (
        <div className={s.mutedSmall} style={{ padding: 20, textAlign: 'center' }}>Загрузка...</div>
      ) : user ? (
        <>
          {/* ═══════ PROFILE TAB ═══════ */}
          {tab === 'profile' && (
            <div className={`${s.flexCol} ${s.gap10}`}>
              {/* Header */}
              <div className={`${s.flexRow} ${s.gap10}`}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(212,175,55,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {user.rank_emoji || '👤'}
                </div>
                <div className={s.flex1}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user.fullname || 'Без имени'}</div>
                  <div className={s.mutedSmall}>
                    {user.username ? `@${user.username}` : ''} · ID: {user.telegram_id}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div className={s.card} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#d4af37' }}>{formatMoney(user.balance)}</div>
                  <div className={s.mutedSmall}>Баланс</div>
                </div>
                <div className={s.card} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user.orders_count}</div>
                  <div className={s.mutedSmall}>Заказов</div>
                </div>
                <div className={s.card} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{formatMoney(user.total_spent)}</div>
                  <div className={s.mutedSmall}>Потрачено</div>
                </div>
              </div>

              {/* Rank & Loyalty */}
              <div className={`${s.flexRow} ${s.gap6} ${s.flexWrap}`}>
                <span className={s.tagGold}>{user.rank_emoji} {user.rank_name}</span>
                {user.loyalty_status && <span className={s.tagBlue}>{user.loyalty_status} −{user.loyalty_discount}%</span>}
                {user.referrals_count > 0 && <span className={s.tagGreen}>{user.referrals_count} рефералов</span>}
                {user.is_banned && <span className={s.tagRed}>Забанен</span>}
                {user.is_watched && <span className={s.tagOrange}>На контроле</span>}
              </div>

              {/* Balance Modifier */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Баланс</div>
                <div className={`${s.flexRow} ${s.gap6}`}>
                  <input type="number" inputMode="numeric" value={balAmt} onChange={(e) => setBalAmt(e.target.value)}
                    className={s.input} style={{ flex: 1 }} placeholder="Сумма" />
                  <button type="button" className={s.successBtn} disabled={busy || !balAmt}
                    onClick={() => act('Баланс пополнен', async () => { await modifyGodUserBalance(user.telegram_id, Math.abs(Number(balAmt)), balReason, true); setBalAmt('') })}>
                    <Plus size={12} />
                  </button>
                  <button type="button" className={s.dangerBtn} disabled={busy || !balAmt}
                    onClick={() => act('Баланс списан', async () => { await modifyGodUserBalance(user.telegram_id, -Math.abs(Number(balAmt)), balReason, true); setBalAmt('') })}>
                    <Minus size={12} />
                  </button>
                </div>
                <select value={balReason} onChange={(e) => setBalReason(e.target.value)} className={s.filterSelect} style={{ width: '100%', marginTop: 6 }}>
                  <option value="admin_adjustment">Ручная корректировка</option>
                  <option value="compensation">Компенсация</option>
                  <option value="coupon">Купон</option>
                </select>
              </div>

              {/* Ban / Watch */}
              <div className={`${s.flexRow} ${s.gap6}`}>
                <button type="button" className={user.is_banned ? s.dangerBtn : s.secondaryBtn} style={{ flex: 1 }} disabled={busy}
                  onClick={() => act(user.is_banned ? 'Разбанен' : 'Забанен', () => toggleGodUserBan(user.telegram_id, !user.is_banned))}>
                  <Ban size={14} /> {user.is_banned ? 'Разбанить' : 'Забанить'}
                </button>
                <button type="button" className={user.is_watched ? s.secondaryBtn : s.secondaryBtn} style={{ flex: 1 }} disabled={busy}
                  onClick={() => act(user.is_watched ? 'Снят с контроля' : 'На контроле', () => toggleGodUserWatch(user.telegram_id, !user.is_watched))}>
                  {user.is_watched ? <EyeOff size={14} /> : <Eye size={14} />}
                  {user.is_watched ? 'Снять' : 'Контроль'}
                </button>
              </div>

              {/* Notes */}
              <div className={s.formSection}>
                <div className={s.formLabel}>Заметки</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={s.textarea} rows={3} />
                <button type="button" className={s.secondaryBtn} disabled={busy || notes === (user.admin_notes || '')}
                  onClick={() => act('Сохранено', () => updateGodUserNotes(user.telegram_id, notes))} style={{ marginTop: 4 }}>
                  Сохранить
                </button>
              </div>
            </div>
          )}

          {/* ═══════ ORDERS TAB ═══════ */}
          {tab === 'orders' && (
            <div className={`${s.flexCol} ${s.gap6}`}>
              {orders.length === 0 ? (
                <div className={s.mutedSmall} style={{ textAlign: 'center', padding: 20 }}>Нет заказов</div>
              ) : orders.map((o) => {
                const cfg = STATUS_CONFIG[o.status]
                return (
                  <div key={o.id} className={s.card}>
                    <div className={`${s.flexRow} ${s.gap6}`}>
                      {cfg && <span className={s.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>{cfg.emoji} {cfg.label}</span>}
                      <span className={s.mutedSmall}>#{o.id}</span>
                      <span className={`${s.textGold} ${s.bold} ${s.mlAuto}`}>{formatMoney(o.final_price || o.price)}</span>
                    </div>
                    <div className={s.mutedSmall} style={{ marginTop: 4 }}>
                      {o.work_type_label || o.work_type} · {formatDateTime(o.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══════ FINANCE TAB ═══════ */}
          {tab === 'finance' && (
            <div className={`${s.flexCol} ${s.gap4}`}>
              {transactions.length === 0 ? (
                <div className={s.mutedSmall} style={{ textAlign: 'center', padding: 20 }}>Нет транзакций</div>
              ) : transactions.map((tx) => (
                <div key={tx.id} className={`${s.flexRow} ${s.gap8}`} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className={s.flex1}>
                    <div style={{ fontSize: 12, color: '#e4e4e7' }}>
                      {TRANSACTION_REASON_LABELS[tx.reason] || tx.reason}
                    </div>
                    {tx.description && <div className={s.mutedSmall}>{tx.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tx.amount >= 0 ? '#22c55e' : '#ef4444' }}>
                      {tx.amount >= 0 ? '+' : ''}{formatMoney(tx.amount)}
                    </div>
                    <div className={s.mutedSmall}>{formatDateTime(tx.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </BottomSheet>
  )
})
