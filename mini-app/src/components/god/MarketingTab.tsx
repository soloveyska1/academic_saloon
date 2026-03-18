/**
 * God Mode v3 — Marketing Tab
 * Sub-tabs: Промокоды | Рассылка
 */
import { memo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ToggleLeft, ToggleRight, Send } from 'lucide-react'
import {
  fetchGodPromos, createGodPromo, toggleGodPromo, deleteGodPromo,
  sendGodBroadcast,
} from '../../api/userApi'
import type { GodPromo } from '../../types'
import { formatMoney, formatDateTime } from './godConstants'
import { useGodData, useHaptic } from './godHooks'
import { useToast } from '../ui/Toast'
import { Skeleton, StateCard } from './GodWidgets'
import s from '../../pages/GodModePage.module.css'

const SUB_TABS = [
  { id: 'promos', label: 'Промокоды' },
  { id: 'broadcast', label: 'Рассылка' },
]

export const MarketingTab = memo(function MarketingTab() {
  const [sub, setSub] = useState('promos')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.flexCol} ${s.gap10}`}>
      <div className={s.subTabBar}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={sub === t.id ? s.subTabActive : s.subTab}
            onClick={() => setSub(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'promos' && <PromosSection />}
      {sub === 'broadcast' && <BroadcastSection />}
    </motion.div>
  )
})

/* ═══════ Promos Section ═══════ */

const PromosSection = memo(function PromosSection() {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const fetchPromos = useCallback(() => fetchGodPromos(), [])
  const promos = useGodData<{ promos: GodPromo[] }>(fetchPromos)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newUsersOnly, setNewUsersOnly] = useState(false)
  const [newValidUntil, setNewValidUntil] = useState('')

  const handleCreate = useCallback(async () => {
    if (!newCode.trim()) return
    setCreating(true)
    impact('medium')
    try {
      await createGodPromo({
        code: newCode.trim().toUpperCase(),
        discount_percent: Number(newDiscount) || 10,
        max_uses: newMaxUses ? Number(newMaxUses) : undefined,
        new_users_only: newUsersOnly,
        valid_until: newValidUntil || undefined,
      })
      notify('success')
      showToast({ type: 'success', title: 'Промокод создан' })
      setNewCode(''); setNewDiscount('10'); setNewMaxUses(''); setNewUsersOnly(false); setNewValidUntil('')
      setShowCreate(false)
      promos.refresh()
    } catch (e) {
      notify('error')
      showToast({ type: 'error', title: 'Ошибка', message: e instanceof Error ? e.message : '' })
    }
    setCreating(false)
  }, [newCode, newDiscount, newMaxUses, newUsersOnly, newValidUntil, impact, notify, showToast, promos])

  const handleToggle = useCallback(async (id: number) => {
    impact('light')
    try {
      await toggleGodPromo(id)
      promos.refresh()
    } catch { showToast({ type: 'error', title: 'Ошибка' }) }
  }, [impact, promos, showToast])

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Удалить промокод?')) return
    impact('medium')
    try {
      await deleteGodPromo(id)
      notify('success')
      promos.refresh()
    } catch { showToast({ type: 'error', title: 'Ошибка удаления' }) }
  }, [impact, notify, promos, showToast])

  if (promos.loading && !promos.data) return <Skeleton variant="card" count={3} />

  const list = promos.data?.promos || []

  const setDate = (d: number) => {
    const date = new Date()
    date.setDate(date.getDate() + d)
    setNewValidUntil(date.toISOString().split('T')[0])
  }

  return (
    <div className={`${s.flexCol} ${s.gap8}`}>
      {/* Create button */}
      <button type="button" className={s.primaryBtn} onClick={() => setShowCreate(!showCreate)}>
        <Plus size={14} /> Новый промокод
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={s.card}
            style={{ overflow: 'hidden' }}
          >
            <div className={`${s.flexCol} ${s.gap6}`}>
              <div className={s.formLabel}>Код</div>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className={s.input} placeholder="SALE2025" style={{ textTransform: 'uppercase' }} />

              <div className={`${s.flexRow} ${s.gap6}`}>
                <div className={s.flex1}>
                  <div className={s.formLabel}>Скидка %</div>
                  <input type="number" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)}
                    className={s.input} placeholder="10" />
                </div>
                <div className={s.flex1}>
                  <div className={s.formLabel}>Макс. исп.</div>
                  <input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)}
                    className={s.input} placeholder="∞" />
                </div>
              </div>

              <div className={s.formLabel}>Срок действия</div>
              <div className={`${s.flexRow} ${s.gap4}`}>
                <button type="button" className={s.ghostBtn} onClick={() => setDate(3)}>3д</button>
                <button type="button" className={s.ghostBtn} onClick={() => setDate(7)}>7д</button>
                <button type="button" className={s.ghostBtn} onClick={() => setDate(30)}>30д</button>
                <button type="button" className={s.ghostBtn} onClick={() => setNewValidUntil('')}>∞</button>
                {newValidUntil && <span className={s.mutedSmall}>до {newValidUntil}</span>}
              </div>

              <label className={`${s.flexRow} ${s.gap6}`} style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={newUsersOnly} onChange={(e) => setNewUsersOnly(e.target.checked)} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Только новые пользователи</span>
              </label>

              <button type="button" className={s.successBtn} disabled={creating || !newCode.trim()} onClick={handleCreate}>
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promo list */}
      {list.length === 0 ? (
        <StateCard tone="empty" title="Нет промокодов" description="Создайте первый промокод" />
      ) : list.map((p) => {
        const expired = p.valid_until && new Date(p.valid_until) < new Date()
        return (
          <div key={p.id} className={s.card}>
            <div className={`${s.flexRow} ${s.gap6}`}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-400)', fontFamily: 'monospace' }}>{p.code}</span>
              <span className={s.tagGold}>-{p.discount_percent}%</span>
              {p.is_active && !expired && <span className={s.tagGreen}>Активен</span>}
              {expired && <span className={s.tagRed}>Истёк</span>}
              {!p.is_active && !expired && <span className={s.tagMuted}>Выкл</span>}
              {p.new_users_only && <span className={s.tagBlue}>Новые</span>}
            </div>

            <div className={`${s.flexRow} ${s.gap8}`} style={{ marginTop: 6 }}>
              <span className={s.mutedSmall}>Исп: {p.current_uses}{p.max_uses ? `/${p.max_uses}` : ''}</span>
              {p.total_savings > 0 && <span className={s.mutedSmall}>Сэкон: {formatMoney(p.total_savings)}</span>}
              {p.valid_until && <span className={s.mutedSmall}>до {formatDateTime(p.valid_until)}</span>}
            </div>

            <div className={`${s.flexRow} ${s.gap4}`} style={{ marginTop: 6 }}>
              <button type="button" className={s.ghostBtn} onClick={() => handleToggle(p.id)}>
                {p.is_active ? <ToggleRight size={16} color="var(--success-text)" /> : <ToggleLeft size={16} color="#6b7280" />}
              </button>
              <button type="button" className={s.ghostBtn} onClick={() => handleDelete(p.id)}>
                <Trash2 size={14} color="var(--error-text)" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
})

/* ═══════ Broadcast Section ═══════ */

const TARGETS = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные 7д' },
  { id: 'with_orders', label: 'С заказами' },
] as const

const BroadcastSection = memo(function BroadcastSection() {
  const { showToast } = useToast()
  const { impact, notify } = useHaptic()
  const [text, setText] = useState('')
  const [target, setTarget] = useState<'all' | 'active' | 'with_orders'>('all')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  const send = useCallback(async () => {
    if (!text.trim() || !confirm(`Отправить рассылку (${target})?`)) return
    setSending(true)
    impact('heavy')
    try {
      const r = await sendGodBroadcast(text, target)
      setResult({ sent: r.sent, failed: r.failed })
      notify('success')
      showToast({ type: 'success', title: `Отправлено: ${r.sent}` })
      setText('')
    } catch (e) {
      notify('error')
      showToast({ type: 'error', title: 'Ошибка рассылки', message: e instanceof Error ? e.message : '' })
    }
    setSending(false)
  }, [text, target, impact, notify, showToast])

  return (
    <div className={`${s.flexCol} ${s.gap8}`}>
      {/* Warning */}
      <div className={s.card} style={{ borderLeft: '3px solid var(--error-text)' }}>
        <div style={{ fontSize: 12, color: '#f87171' }}>
          ⚠️ Рассылка отправляется всем выбранным пользователям. Используйте осторожно.
        </div>
      </div>

      {/* Target */}
      <div className={s.formSection}>
        <div className={s.formLabel}>Аудитория</div>
        <div className={`${s.flexRow} ${s.gap4}`}>
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={target === t.id ? s.primaryBtn : s.secondaryBtn}
              style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}
              onClick={() => setTarget(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className={s.formSection}>
        <div className={s.formLabel}>Сообщение (HTML)</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={s.textarea}
          rows={5}
          placeholder="<b>Заголовок</b>\n\nТекст рассылки..."
        />
      </div>

      {/* Send */}
      <button type="button" className={s.dangerBtn} disabled={sending || !text.trim()} onClick={send}>
        <Send size={14} /> {sending ? 'Отправка...' : 'Отправить рассылку'}
      </button>

      {/* Result */}
      {result && (
        <div className={s.card}>
          <div className={`${s.flexRow} ${s.gap10}`}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success-text)' }}>{result.sent}</div>
              <div className={s.mutedSmall}>Доставлено</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--error-text)' }}>{result.failed}</div>
              <div className={s.mutedSmall}>Ошибок</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
