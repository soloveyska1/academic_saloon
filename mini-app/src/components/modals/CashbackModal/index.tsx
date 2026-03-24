import { useCallback, useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ArrowRight, Crown, TrendingUp, Check, Lock, ChevronRight } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Premium tier progression
//  Clean: Hero stat → Card → Progress → Tier ladder → CTA
//  No noise. Every pixel earns its place.
// ═══════════════════════════════════════════════════════════════════════════

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
  onCreateOrder?: () => void
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

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

  const handleCTA = useCallback(() => {
    onClose()
    onCreateOrder?.()
  }, [onClose, onCreateOrder])

  // View a different rank's details
  const viewedRank = selectedRankIndex !== null ? RANKS[selectedRankIndex] : null
  const isViewingLocked = selectedRankIndex !== null && selectedRankIndex > currentRankIndex

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Кэшбэк"
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '0 20px 24px', overflowX: 'hidden' }}>

        {/* ═══════ HERO — Current status, compact ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            textAlign: 'center',
            padding: '12px 0 28px',
          }}
        >
          {/* Big percentage */}
          <m.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 16 }}
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              background: 'var(--gold-metallic)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 8,
            }}
          >
            {currentRank.cashback}%
          </m.div>

          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 4,
          }}>
            кэшбэк на все заказы
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'var(--gold-glass-subtle)',
            border: '1px solid rgba(212,175,55,0.10)',
          }}>
            {(() => { const Icon = currentRank.icon; return <Icon size={12} strokeWidth={2} color="var(--gold-400)" /> })()}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gold-300)',
              letterSpacing: '0.04em',
            }}>
              {currentRank.displayName}
            </span>
          </div>
        </m.div>

        {/* ═══════ SAVINGS — If user has saved anything ═══════ */}
        {totalSaved > 0 && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid rgba(212,175,55,0.10)',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.50)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}>
                Сэкономлено
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--gold-200)',
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                letterSpacing: '-0.02em',
              }}>
                {formatMoney(totalSaved)}
              </div>
            </div>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={18} strokeWidth={1.8} color="var(--gold-400)" />
            </div>
          </m.div>
        )}

        {/* ═══════ PROGRESS TO NEXT RANK ═══════ */}
        {nextRank && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: '16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-default)',
              marginBottom: 16,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>
                До «{nextRank.displayName}»
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--gold-300)',
              }}>
                {nextRank.cashback}%
              </span>
            </div>

            {/* Bar */}
            <div style={{
              height: 5,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.5), var(--gold-400))',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <m.div
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '30%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                  }}
                />
              </m.div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                {progress}%
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                ещё {formatMoney(spentToNext)}
              </span>
            </div>
          </m.div>
        )}

        {/* Max rank */}
        {isMaxRank && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid rgba(212,175,55,0.12)',
              marginBottom: 16,
            }}
          >
            <Crown size={16} strokeWidth={1.8} color="var(--gold-400)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-200)' }}>
                Максимальный кэшбэк
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                10% возвращается с каждого заказа
              </div>
            </div>
          </m.div>
        )}

        {/* ═══════ TIER LADDER ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 12,
          }}>
            Уровни
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {RANKS.map((rank, index) => {
              const isPassed = index < currentRankIndex
              const isCurrent = index === currentRankIndex
              const isLocked = index > currentRankIndex
              const isSelected = selectedRankIndex === index
              const Icon = rank.icon

              return (
                <m.button
                  key={rank.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRankIndex(prev => prev === index ? null : index)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: 'none',
                    background: isCurrent
                      ? 'var(--gold-glass-subtle)'
                      : isSelected
                        ? 'rgba(255,255,255,0.03)'
                        : 'transparent',
                    outline: isCurrent
                      ? '1px solid rgba(212,175,55,0.15)'
                      : isSelected
                        ? '1px solid var(--border-default)'
                        : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isPassed || isCurrent
                      ? `${rank.color}15`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isPassed || isCurrent ? `${rank.color}25` : 'var(--border-default)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isPassed ? (
                      <Check size={15} strokeWidth={2.5} color={rank.color} />
                    ) : (
                      <Icon size={15} strokeWidth={1.8} color={isPassed || isCurrent ? rank.color : 'var(--text-muted)'} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isCurrent ? 'var(--text-primary)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                      }}>
                        {rank.displayName}
                      </span>
                      {isCurrent && (
                        <span style={{
                          fontSize: 8,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--gold-400)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(212,175,55,0.08)',
                        }}>
                          Сейчас
                        </span>
                      )}
                    </div>
                    {rank.minSpent > 0 && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                      }}>
                        от {formatMoney(rank.minSpent)}
                      </span>
                    )}
                  </div>

                  {/* Cashback badge */}
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isCurrent ? 'var(--gold-300)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    {rank.cashback}%
                  </div>

                  {isLocked && (
                    <Lock size={12} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.4, flexShrink: 0 }} />
                  )}
                </m.button>
              )
            })}
          </div>
        </m.div>

        {/* ═══════ LOCKED RANK DETAIL ═══════ */}
        <AnimatePresence>
          {viewedRank && isViewingLocked && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 16 }}
            >
              <div style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}>
                  Привилегии «{viewedRank.displayName}»
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Кэшбэк {viewedRank.cashback}% на все заказы.
                  {viewedRank.cashback >= 7 && ' Приоритет в поддержке.'}
                  {viewedRank.cashback >= 10 && ' Персональные условия.'}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ═══════ HOW IT WORKS — Two compact lines ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 20,
          }}
        >
          {[
            'Начисляется автоматически с каждого заказа',
            'Растёт с объёмом заказов — без ограничений по сроку',
          ].map((text, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}
            >
              <Check size={12} strokeWidth={2.5} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.6 }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                {text}
              </span>
            </div>
          ))}
        </m.div>

        {/* ═══════ CTA ═══════ */}
        {onCreateOrder && !isMaxRank && (
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCTA}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: 12,
              background: 'var(--gold-metallic)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: 'var(--glow-gold)',
            }}
          >
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text-on-gold)',
              letterSpacing: '0.02em',
            }}>
              Заказать → {nextRank!.cashback}%
            </span>
            <ArrowRight size={16} strokeWidth={2.5} color="var(--text-on-gold)" />
          </m.button>
        )}

        {/* Max rank CTA */}
        {onCreateOrder && isMaxRank && (
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCTA}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: 12,
              background: 'var(--gold-glass-medium)',
              border: '1px solid rgba(212,175,55,0.20)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--gold-200)',
            }}>
              Новый заказ с кэшбэком 10%
            </span>
            <ChevronRight size={16} color="var(--gold-300)" />
          </m.button>
        )}

      </div>
    </ModalWrapper>
  )
}
