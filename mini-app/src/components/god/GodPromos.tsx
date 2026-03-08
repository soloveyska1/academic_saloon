import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, ToggleLeft, ToggleRight, Trash2, RefreshCw } from 'lucide-react'
import { fetchGodPromos, createGodPromo, toggleGodPromo, deleteGodPromo } from '../../api/userApi'
import type { GodPromo } from '../../types'
import { useToast } from '../ui/Toast'
import { LoadingSpinner } from './GodShared'
import s from '../../pages/GodModePage.module.css'

export const GodPromos = memo(function GodPromos() {
  const { showToast } = useToast()
  const [promos, setPromos] = useState<GodPromo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newMaxUses, setNewMaxUses] = useState('0')
  const [newUsersOnly, setNewUsersOnly] = useState(false)
  const [newValidUntil, setNewValidUntil] = useState('')

  const applyPreset = useCallback((days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days); d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setNewValidUntil(d.toISOString().slice(0, 16))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try { setPromos((await fetchGodPromos()).promos) } catch { showToast({ type: 'error', title: 'Ошибка загрузки' }) }
    setLoading(false)
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newCode.trim()) return
    setCreating(true)
    try {
      await createGodPromo({ code: newCode, discount_percent: Number(newDiscount || '0'), max_uses: Number(newMaxUses || '0'), valid_until: newValidUntil ? new Date(newValidUntil).toISOString() : undefined, new_users_only: newUsersOnly })
      showToast({ type: 'success', title: `✓ ${newCode} создан` })
      setNewCode(''); setNewDiscount('10'); setNewMaxUses('0'); setNewUsersOnly(false); setNewValidUntil(''); setShowCreate(false); load()
    } catch (e) { showToast({ type: 'error', title: 'Ошибка', message: e instanceof Error ? e.message : '' }) }
    setCreating(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${s.flexCol} ${s.gap8}`}>

      <button type="button" onClick={() => setShowCreate(!showCreate)} className={s.primaryBtn}>
        <Plus size={14} /> Новый промокод
      </button>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={s.card}>
            <div className={`${s.flexCol} ${s.gap8}`}>
              <input type="text" inputMode="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Код (SALE20)" className={s.input} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
              <div className={`${s.flexRow} ${s.gap6}`}>
                <input type="number" inputMode="numeric" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} placeholder="Скидка %" className={s.input} style={{ flex: 1 }} />
                <input type="number" inputMode="numeric" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} placeholder="Лимит (0=∞)" className={s.input} style={{ flex: 1 }} />
              </div>
              <div className={`${s.flexCol} ${s.gap4}`}>
                <label className={s.formLabel}>Срок</label>
                <input type="datetime-local" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} className={s.input} />
                <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`}>
                  {[3, 7, 30].map((d) => <button key={d} type="button" onClick={() => applyPreset(d)} className={s.secondaryBtn} style={{ fontSize: 11 }}>{d}д</button>)}
                  <button type="button" onClick={() => setNewValidUntil('')} className={s.secondaryBtn} style={{ fontSize: 11 }}>∞</button>
                </div>
              </div>
              <div onClick={() => setNewUsersOnly(!newUsersOnly)} className={s.checkboxRow} style={{ background: newUsersOnly ? 'rgba(212,175,55,0.1)' : 'rgba(0,0,0,0.2)', border: `1px solid ${newUsersOnly ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className={s.checkbox} style={{ border: `2px solid ${newUsersOnly ? '#d4af37' : '#52525b'}`, background: newUsersOnly ? '#d4af37' : 'transparent' }}>
                  {newUsersOnly && <Check size={12} color="#0a0a0c" strokeWidth={3} />}
                </div>
                <span style={{ color: newUsersOnly ? '#d4af37' : '#71717a', fontSize: 12 }}>Только новые</span>
              </div>
              <button type="button" onClick={handleCreate} disabled={!newCode.trim() || creating} className={s.primaryBtn} style={{ width: '100%', justifyContent: 'center' }}>
                {creating ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Создание…</> : <><Check size={14} /> Создать</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? <LoadingSpinner /> : (
        <div className={`${s.flexCol} ${s.gap6}`}>
          {promos.map((promo) => (
            <PromoItem key={promo.id} promo={promo} onToggle={() => { toggleGodPromo(promo.id).then(load).catch(() => {}) }} onDelete={() => { if (confirm(`Удалить ${promo.code}?`)) deleteGodPromo(promo.id).then(load).catch(() => {}) }} />
          ))}
        </div>
      )}
    </motion.div>
  )
})

const PromoItem = memo(function PromoItem({ promo, onToggle, onDelete }: { promo: GodPromo; onToggle: () => void; onDelete: () => void }) {
  const validUntil = promo.valid_until ? new Date(promo.valid_until) : null
  const isExpired = validUntil && validUntil < new Date()

  return (
    <div className={s.promoCard} style={{ opacity: promo.is_active && !isExpired ? 1 : 0.5 }}>
      <div className={`${s.flexRow} ${s.gap8}`} style={{ marginBottom: 8 }}>
        <div className={s.flex1}>
          <div className={`${s.flexRow} ${s.flexWrap} ${s.gap4}`}>
            <span className={`${s.textGold} ${s.bold}`} style={{ fontSize: 14 }}>{promo.code}</span>
            <span className={promo.is_active ? s.tagGreen : s.tagMuted}>{promo.is_active ? 'Вкл' : 'Выкл'}</span>
            {isExpired && <span className={s.tagRed}>Истёк</span>}
            {promo.new_users_only && <span className={s.tagBlue}>Новые</span>}
          </div>
          <div className={s.mutedSmall}>−{promo.discount_percent}%</div>
        </div>
        <button type="button" onClick={onToggle} className={s.ghostBtn}>{promo.is_active ? <ToggleRight size={22} color="#22c55e" /> : <ToggleLeft size={22} color="#52525b" />}</button>
        <button type="button" onClick={onDelete} className={s.ghostBtn}><Trash2 size={16} color="#ef4444" /></button>
      </div>
      <div className={s.promoStats}>
        <div><div className={s.mutedSmall}>Использования</div><div className={`${s.textWhite} ${s.bold}`} style={{ fontSize: 12 }}>{promo.active_usages}/{promo.max_uses || '∞'}</div></div>
        <div><div className={s.mutedSmall}>Сэкономлено</div><div style={{ color: '#4ade80', fontSize: 12, fontWeight: 600 }}>{promo.total_savings.toFixed(0)}₽</div></div>
      </div>
      <div className={s.mutedSmall}>
        {validUntil ? `До ${validUntil.toLocaleDateString('ru-RU')}` : 'Бессрочный'}
        {promo.created_by && ` · ${promo.created_by.fullname}`}
      </div>
    </div>
  )
})
