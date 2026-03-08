import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, ToggleLeft, ToggleRight, Trash2, RefreshCw } from 'lucide-react'
import {
  fetchGodPromos,
  createGodPromo,
  toggleGodPromo,
  deleteGodPromo,
} from '../../api/userApi'
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

  const applyValidityPreset = useCallback((days: number) => {
    const next = new Date()
    next.setDate(next.getDate() + days)
    next.setMinutes(next.getMinutes() - next.getTimezoneOffset())
    setNewValidUntil(next.toISOString().slice(0, 16))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchGodPromos()
      setPromos(result.promos)
    } catch {
      showToast({ type: 'error', title: 'Ошибка загрузки', message: 'Не удалось загрузить промокоды' })
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newCode.trim()) return
    setCreating(true)
    try {
      await createGodPromo({
        code: newCode,
        discount_percent: Number(newDiscount || '0'),
        max_uses: Number(newMaxUses || '0'),
        valid_until: newValidUntil ? new Date(newValidUntil).toISOString() : undefined,
        new_users_only: newUsersOnly,
      })
      showToast({
        type: 'success',
        title: '✓ Промокод создан',
        message: `${newCode} — скидка ${newDiscount}%${newUsersOnly ? ' (новые пользователи)' : ''}`,
      })
      setNewCode('')
      setNewDiscount('10')
      setNewMaxUses('0')
      setNewUsersOnly(false)
      setNewValidUntil('')
      setShowCreate(false)
      load()
    } catch (e) {
      showToast({ type: 'error', title: 'Ошибка создания', message: e instanceof Error ? e.message : 'Не удалось создать промокод' })
    }
    setCreating(false)
  }

  const handleToggle = async (id: number, currentlyActive: boolean) => {
    try {
      await toggleGodPromo(id)
      showToast({ type: 'success', title: currentlyActive ? '⏸ Промокод деактивирован' : '✓ Промокод активирован' })
      load()
    } catch {
      showToast({ type: 'error', title: 'Ошибка', message: 'Не удалось изменить статус' })
    }
  }

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Удалить промокод ${code}?`)) return
    try {
      await deleteGodPromo(id)
      showToast({ type: 'success', title: '🗑 Промокод удалён', message: code })
      load()
    } catch {
      showToast({ type: 'error', title: 'Ошибка удаления', message: 'Не удалось удалить промокод' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${s.flexColumn} ${s.gap16}`}
    >
      <button type="button" onClick={() => setShowCreate(!showCreate)} className={s.primaryBtn}>
        <Plus size={18} /> Создать промокод
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={s.card}
          >
            <div className={`${s.flexColumn} ${s.gap12}`}>
              <input
                type="text"
                inputMode="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="Код (напр. SALE20)"
                className={s.input}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                style={{ WebkitUserSelect: 'text', userSelect: 'text', WebkitAppearance: 'none' } as React.CSSProperties}
              />
              <div className={s.flexRow} style={{ gap: 10 }}>
                <input type="number" inputMode="numeric" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} placeholder="Скидка %" min="1" max="100" className={s.input} style={{ flex: 1, WebkitAppearance: 'none' } as React.CSSProperties} autoComplete="off" enterKeyHint="next" />
                <input type="number" inputMode="numeric" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} placeholder="Лимит (0=∞)" min="0" className={s.input} style={{ flex: 1, WebkitAppearance: 'none' } as React.CSSProperties} autoComplete="off" enterKeyHint="done" />
              </div>

              <div className={`${s.flexColumn} ${s.gap8}`}>
                <label className={s.formLabel}>Срок действия</label>
                <input type="datetime-local" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} className={s.input} />
                <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8 }}>
                  {[3, 7, 30].map((days) => (
                    <button key={days} type="button" onClick={() => applyValidityPreset(days)} className={s.secondaryBtn} style={{ padding: '8px 12px', fontSize: 12, background: 'rgba(255,255,255,0.06)' }}>
                      {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                    </button>
                  ))}
                  <button type="button" onClick={() => setNewValidUntil('')} className={s.secondaryBtn} style={{ padding: '8px 12px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}>
                    Без срока
                  </button>
                </div>
              </div>

              <div
                onClick={() => setNewUsersOnly(!newUsersOnly)}
                className={s.checkboxRow}
                style={{
                  background: newUsersOnly ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${newUsersOnly ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)'}`,
                }}
              >
                <div
                  className={s.checkbox}
                  style={{
                    border: `2px solid ${newUsersOnly ? '#D4AF37' : 'rgba(255,255,255,0.3)'}`,
                    background: newUsersOnly ? '#D4AF37' : 'transparent',
                  }}
                >
                  {newUsersOnly && <Check size={14} color="#0a0a0c" strokeWidth={3} />}
                </div>
                <span style={{ color: newUsersOnly ? '#D4AF37' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
                  Только для новых пользователей
                </span>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!newCode.trim() || creating}
                className={s.primaryBtn}
                style={{ opacity: newCode.trim() && !creating ? 1 : 0.5, cursor: newCode.trim() && !creating ? 'pointer' : 'not-allowed' }}
              >
                {creating ? (
                  <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Создание...</>
                ) : (
                  <><Check size={18} /> Создать</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promos list */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className={`${s.flexColumn} ${s.gap10}`}>
          {promos.map((promo) => (
            <PromoItem
              key={promo.id}
              promo={promo}
              onToggle={() => handleToggle(promo.id, promo.is_active)}
              onDelete={() => handleDelete(promo.id, promo.code)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
})

/* ─── Promo Item ─── */

const PromoItem = memo(function PromoItem({
  promo,
  onToggle,
  onDelete,
}: {
  promo: GodPromo
  onToggle: () => void
  onDelete: () => void
}) {
  const validFrom = promo.valid_from ? new Date(promo.valid_from) : null
  const validUntil = promo.valid_until ? new Date(promo.valid_until) : null
  const now = new Date()
  const isExpired = validUntil && validUntil < now
  const notYetValid = validFrom && validFrom > now

  return (
    <div className={s.promoCard} style={{ opacity: promo.is_active && !isExpired && !notYetValid ? 1 : 0.5 }}>
      {/* Header */}
      <div className={s.flexRow} style={{ gap: 12, marginBottom: 12 }}>
        <div className={s.flex1}>
          <div className={`${s.flexRow} ${s.flexWrap}`} style={{ gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: 16 }}>{promo.code}</span>
            <span className={s.tagSmall} style={{ background: promo.is_active ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)', color: promo.is_active ? '#22c55e' : '#6b7280' }}>
              {promo.is_active ? 'Активен' : 'Выкл'}
            </span>
            {isExpired && <span className={s.tagSmall} style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Истёк</span>}
            {notYetValid && <span className={s.tagSmall} style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>Скоро</span>}
            {promo.new_users_only && <span className={s.tagSmall} style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>Новые</span>}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>
            -{promo.discount_percent}%
          </div>
        </div>
        <button type="button" onClick={onToggle} className={s.ghostBtn} title={promo.is_active ? 'Деактивировать' : 'Активировать'}>
          {promo.is_active ? <ToggleRight size={28} color="#22c55e" /> : <ToggleLeft size={28} color="#6b7280" />}
        </button>
        <button type="button" onClick={onDelete} className={s.ghostBtn} title="Удалить">
          <Trash2 size={20} color="#ef4444" />
        </button>
      </div>

      {/* Stats */}
      <div className={s.promoStatsGrid}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Использования</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{promo.active_usages}/{promo.max_uses || '∞'}</div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Всего сэкономлено</div>
          <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>{promo.total_savings.toFixed(0)}₽</div>
        </div>
      </div>

      {/* Validity */}
      <div className={`${s.flexColumn}`} style={{ gap: 4 }}>
        {validFrom && <div className={s.mutedSmall}>Действует с: {validFrom.toLocaleDateString('ru-RU')}</div>}
        {validUntil && (
          <div className={s.mutedSmall}>
            Действует до: {validUntil.toLocaleDateString('ru-RU')}
            {isExpired && <span style={{ color: '#ef4444' }}> (истёк)</span>}
          </div>
        )}
        {!validUntil && <div className={s.mutedSmall}>Без срока действия</div>}
        {promo.created_by && (
          <div className={s.mutedSmall}>
            Создал: {promo.created_by.fullname}
            {promo.created_by.username && ` (@${promo.created_by.username})`}
          </div>
        )}
      </div>
    </div>
  )
})
