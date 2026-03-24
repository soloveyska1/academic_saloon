import { useCallback, useMemo, memo } from 'react'
import { m } from 'framer-motion'
import { ArrowRight, TrendingUp, Check, Lock } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
  onCreateOrder?: () => void
}

function fmt(v: number): string {
  return `${Math.max(0, Math.round(v)).toLocaleString('ru-RU')} ₽`
}

function memberSince(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
  } catch { return null }
}

/* ── Compact tier row ── */
const TierRow = memo(function TierRow({
  rank, index, currentRankIndex,
}: {
  rank: typeof RANKS[0]
  index: number
  currentRankIndex: number
}) {
  const isPassed = index < currentRankIndex
  const isCurrent = index === currentRankIndex
  const isLocked = index > currentRankIndex
  const Icon = rank.icon

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isCurrent ? '6px 10px' : '5px 10px',
        borderRadius: 8,
        background: isCurrent ? 'var(--gold-glass-subtle)' : 'transparent',
        opacity: isLocked ? 0.4 : 1,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: isPassed || isCurrent ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isPassed ? (
          <Check size={10} strokeWidth={2.5} color="var(--gold-400)" />
        ) : isLocked ? (
          <Lock size={9} strokeWidth={2} color="var(--text-muted)" />
        ) : (
          <Icon size={10} strokeWidth={1.8} color="var(--gold-400)" />
        )}
      </div>

      <span style={{
        flex: 1, fontSize: 12,
        fontWeight: isCurrent ? 700 : 600,
        color: isCurrent ? 'var(--text-primary)' : isPassed ? 'var(--text-secondary)' : 'var(--text-muted)',
      }}>
        {rank.displayName}
        {isLocked && rank.minSpent > 0 && (
          <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontWeight: 600, fontSize: 11 }}>
            · от {fmt(rank.minSpent)}
          </span>
        )}
      </span>

      <span style={{
        fontSize: 12, fontWeight: 700,
        color: isCurrent ? 'var(--gold-400)' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {rank.cashback}%
      </span>
    </div>
  )
})

export function CashbackModal({ isOpen, onClose, user, onCreateOrder }: CashbackModalProps) {
  const admin = useAdmin()

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

  const since = memberSince(user.created_at)

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Кэшбэк"
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════ HERO CARD ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            padding: '18px',
            borderRadius: 14,
            background: 'linear-gradient(160deg, rgba(27,22,12,0.95) 0%, rgba(12,12,12,0.98) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          <div aria-hidden="true" style={{
            position: 'absolute', top: -40, right: -20,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => { const Icon = currentRank.icon; return (
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: 'var(--gold-glass-medium)',
                    border: '1px solid rgba(212,175,55,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} strokeWidth={1.8} color="var(--gold-400)" />
                  </div>
                ) })()}
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentRank.displayName}
                </div>
              </div>

              <div style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 34, fontWeight: 700, lineHeight: 1,
                letterSpacing: '-0.04em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.20))',
              }}>
                {currentRank.cashback}%
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Возвращается с каждого заказа
              </span>
              {totalSaved > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.04))',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}>
                  <TrendingUp size={11} strokeWidth={2.2} color="var(--gold-400)" style={{ opacity: 0.7 }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold-300)', letterSpacing: '-0.02em' }}>
                    {fmt(totalSaved)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </m.div>

        {/* ═══════ PROGRESS (non-max only) ═══════ */}
        {nextRank && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-default)',
              marginBottom: 14,
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                До «{nextRank.displayName}»
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                осталось {fmt(spentToNext)}
              </span>
            </div>
            <div style={{
              height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.4), var(--gold-400))',
                  boxShadow: '0 0 8px rgba(212,175,55,0.20)',
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

        {/* ═══════ TIER LIST ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ marginBottom: 14 }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            {RANKS.map((rank, index) => (
              <TierRow key={rank.id} rank={rank} index={index} currentRankIndex={currentRankIndex} />
            ))}
          </div>
        </m.div>

        {/* ═══════ LOYALTY STATS — premium grid for max-rank ═══════ */}
        {isMaxRank && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'grid',
              gridTemplateColumns: since ? '1fr 1fr 1fr' : '1fr 1fr',
              gap: 8,
            }}
          >
            {[
              { value: String(user.orders_count), label: 'Заказов' },
              { value: fmt(user.total_spent), label: 'Потрачено' },
              ...(since ? [{ value: since, label: 'С нами' }] : []),
            ].map((stat, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 + i * 0.06 }}
                style={{
                  position: 'relative',
                  padding: '14px 10px 12px',
                  borderRadius: 12,
                  background: 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)',
                  border: '1px solid rgba(212,175,55,0.10)',
                  textAlign: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* Subtle top shine */}
                <div aria-hidden="true" style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
                }} />
                <div style={{
                  fontSize: 14, fontWeight: 800, lineHeight: 1.2,
                  background: 'linear-gradient(180deg, var(--gold-150), var(--gold-400))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 4,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {stat.label}
                </div>
              </m.div>
            ))}
          </m.div>
        )}

        {/* ═══════ CTA — only for users who can grow ═══════ */}
        {onCreateOrder && !isMaxRank && (
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCTA}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              width: '100%',
              padding: '13px 20px', borderRadius: 12,
              background: 'var(--gold-metallic)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, boxShadow: 'var(--glow-gold)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-on-gold)' }}>
              Сделать заказ
            </span>
            <ArrowRight size={15} strokeWidth={2.5} color="var(--text-on-gold)" />
          </m.button>
        )}
      </div>
    </ModalWrapper>
  )
}
