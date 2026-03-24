import { useCallback, useMemo, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ArrowRight, Crown, TrendingUp, Check, Lock } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — «Клуб привилегий»
//  Compact, premium. Everything visible without scroll on most devices.
// ═══════════════════════════════════════════════════════════════════════════

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
  onCreateOrder?: () => void
}

function fmt(v: number): string {
  return `${Math.max(0, Math.round(v)).toLocaleString('ru-RU')} ₽`
}

/* ── Tier row — memoized ── */
const TierRow = memo(function TierRow({
  rank, index, currentRankIndex, isSelected, onSelect,
}: {
  rank: typeof RANKS[0]
  index: number
  currentRankIndex: number
  isSelected: boolean
  onSelect: (i: number) => void
}) {
  const isPassed = index < currentRankIndex
  const isCurrent = index === currentRankIndex
  const isLocked = index > currentRankIndex
  const Icon = rank.icon

  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelect(index)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 + index * 0.04 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        border: 'none',
        background: isCurrent
          ? 'var(--gold-glass-subtle)'
          : isSelected ? 'rgba(255,255,255,0.025)' : 'transparent',
        outline: isCurrent
          ? '1px solid rgba(212,175,55,0.14)'
          : isSelected ? '1px solid var(--border-default)' : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {/* Small icon */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: isPassed || isCurrent ? `${rank.color}10` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isPassed || isCurrent ? `${rank.color}20` : 'var(--border-subtle)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isPassed ? (
          <Check size={12} strokeWidth={2.5} color={rank.color} style={{ opacity: 0.7 }} />
        ) : (
          <Icon size={12} strokeWidth={1.8} color={isPassed || isCurrent ? rank.color : 'var(--text-muted)'} style={{ opacity: isLocked ? 0.4 : 1 }} />
        )}
      </div>

      {/* Name + threshold */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: isCurrent ? 'var(--text-primary)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}>
          {rank.displayName}
        </span>
        {rank.minSpent > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginLeft: 6,
            opacity: 0.7,
          }}>
            от {fmt(rank.minSpent)}
          </span>
        )}
      </div>

      {/* Cashback % */}
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: isCurrent ? 'var(--gold-300)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
        flexShrink: 0,
        opacity: isLocked ? 0.5 : 1,
      }}>
        {rank.cashback}%
      </span>

      {isLocked && <Lock size={10} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.3, flexShrink: 0 }} />}
    </m.button>
  )
})

export function CashbackModal({ isOpen, onClose, user, onCreateOrder }: CashbackModalProps) {
  const admin = useAdmin()
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  const effectiveCashback = useMemo(
    () => admin.simulatedRank !== null ? admin.simulatedRank : user.rank.cashback,
    [admin.simulatedRank, user.rank.cashback],
  )

  const currentRankIndex = useMemo(
    () => Math.max(getRankIndexByCashback(effectiveCashback), 0),
    [effectiveCashback],
  )

  const currentRank = RANKS[currentRankIndex] || RANKS[0]
  const nextRank = RANKS[currentRankIndex + 1] || null
  const progress = Math.max(0, Math.min(user.rank.progress, 100))
  const isMaxRank = !nextRank

  const totalSaved = useMemo(() => {
    const spent = admin.simulatedRank !== null ? 25000 : user.total_spent
    return Math.round(spent * currentRank.cashback / 100)
  }, [admin.simulatedRank, user.total_spent, currentRank.cashback])

  const spentToNext = useMemo(() => {
    if (!nextRank) return 0
    if (admin.simulatedRank !== null) return Math.round((nextRank.minSpent - currentRank.minSpent) * 0.55)
    return Math.max(0, user.rank.spent_to_next)
  }, [admin.simulatedRank, currentRank.minSpent, nextRank, user.rank.spent_to_next])

  const handleCTA = useCallback(() => { onClose(); onCreateOrder?.() }, [onClose, onCreateOrder])
  const handleRankSelect = useCallback((i: number) => setSelectedRankIndex(prev => prev === i ? null : i), [])

  const viewedRank = selectedRankIndex !== null ? RANKS[selectedRankIndex] : null
  const isViewingLocked = selectedRankIndex !== null && selectedRankIndex > currentRankIndex

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Клуб привилегий"
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '0 20px 24px', overflowX: 'hidden' }}>

        {/* ═══════ HERO — % + status + savings in one block ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            padding: '20px',
            borderRadius: 14,
            background: 'linear-gradient(160deg, rgba(27,22,12,0.95) 0%, rgba(12,12,12,0.98) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -40, right: -20,
              width: 140, height: 140,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          {/* Top shine */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0, left: '15%', right: '15%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Row: rank badge + cashback % */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => { const Icon = currentRank.icon; return (
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--gold-glass-medium)',
                    border: '1px solid rgba(212,175,55,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} strokeWidth={1.8} color="var(--gold-400)" />
                  </div>
                ) })()}
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'rgba(212,175,55,0.50)',
                    marginBottom: 1,
                  }}>
                    Ваш статус
                  </div>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  }}>
                    {currentRank.displayName}
                  </div>
                </div>
              </div>

              {/* Big % */}
              <div style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.20))',
              }}>
                {currentRank.cashback}%
              </div>
            </div>

            {/* Savings + description inline */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}>
                Возвращается с каждого заказа
              </div>
              {totalSaved > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.10)',
                  flexShrink: 0,
                }}>
                  <TrendingUp size={11} strokeWidth={2} color="var(--gold-400)" style={{ opacity: 0.6 }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: 'var(--gold-300)',
                  }}>
                    {fmt(totalSaved)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </m.div>

        {/* ═══════ PROGRESS ═══════ */}
        {nextRank && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-default)',
              marginBottom: 16,
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                До «{nextRank.displayName}» — {nextRank.cashback}%
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                {fmt(spentToNext)}
              </span>
            </div>

            <div style={{
              height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.4), var(--gold-400))',
                  boxShadow: '0 0 8px rgba(212,175,55,0.25)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <m.div
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '30%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                  }}
                />
              </m.div>
            </div>
          </m.div>
        )}

        {isMaxRank && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid rgba(212,175,55,0.12)',
              marginBottom: 16,
            }}
          >
            <Crown size={14} strokeWidth={1.8} color="var(--gold-400)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-300)' }}>
              Высший уровень — 10% с каждого заказа
            </span>
          </m.div>
        )}

        {/* ═══════ TIER LADDER — compact list ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          style={{ marginBottom: 16 }}
        >
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}>
            Уровни
          </div>

          <div style={{ display: 'grid', gap: 2 }}>
            {RANKS.map((rank, index) => (
              <TierRow
                key={rank.id}
                rank={rank}
                index={index}
                currentRankIndex={currentRankIndex}
                isSelected={selectedRankIndex === index}
                onSelect={handleRankSelect}
              />
            ))}
          </div>
        </m.div>

        {/* ═══════ LOCKED RANK DETAIL ═══════ */}
        <AnimatePresence>
          {viewedRank && isViewingLocked && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 12 }}
            >
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Возврат {viewedRank.cashback}% с каждого заказа.
                  {viewedRank.cashback >= 7 && ' Приоритетная поддержка.'}
                  {viewedRank.cashback >= 10 && ' Персональный менеджер.'}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ═══════ INFO ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex', gap: 16,
            padding: '10px 0',
            marginBottom: 16,
          }}
        >
          {['Автоматически', 'Навсегда'].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={10} strokeWidth={3} color="var(--gold-400)" style={{ opacity: 0.5 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                {text}
              </span>
            </div>
          ))}
        </m.div>

        {/* ═══════ CTA ═══════ */}
        {onCreateOrder && (
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCTA}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--gold-glass-medium), var(--gold-glass-subtle))',
              border: '1px solid rgba(212,175,55,0.18)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: 'var(--gold-200)',
            }}>
              {isMaxRank ? 'Новый заказ' : 'Сделать заказ'}
            </span>
            <ArrowRight size={15} strokeWidth={2.2} color="var(--gold-300)" />
          </m.button>
        )}
      </div>
    </ModalWrapper>
  )
}
