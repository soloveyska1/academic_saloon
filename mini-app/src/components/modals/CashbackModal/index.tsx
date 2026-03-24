import { useCallback, useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ArrowRight, Crown, TrendingUp, Check, Lock, ChevronRight } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { GoldText, LiquidGoldButton } from '../../ui/GoldText'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — «Клуб привилегий»
//  Premium tier progression with luxury feel.
//  Hero stat → Savings → Progress → Tier ladder → CTA
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
      <div style={{ padding: '0 20px 28px', overflowX: 'hidden' }}>

        {/* ═══════ HERO — Radial glow + big % ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            textAlign: 'center',
            padding: '24px 0 32px',
            position: 'relative',
          }}
        >
          {/* Ambient radial glow behind number */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 40%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Big percentage — GoldText with drop-shadow */}
          <m.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', damping: 16 }}
            style={{
              position: 'relative',
              zIndex: 1,
              marginBottom: 12,
            }}
          >
            <GoldText
              variant="liquid"
              weight={700}
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 64,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                filter: 'drop-shadow(0 0 24px rgba(212,175,55,0.25))',
              }}
            >
              {currentRank.cashback}%
            </GoldText>
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 10,
            }}
          >
            возвращается с каждого заказа
          </m.div>

          {/* Rank pill badge */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, type: 'spring', damping: 20 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${currentRank.color}15, ${currentRank.color}08)`,
              border: `1px solid ${currentRank.color}20`,
              boxShadow: `0 0 16px ${currentRank.color}10`,
            }}
          >
            {(() => { const Icon = currentRank.icon; return <Icon size={13} strokeWidth={2} color={currentRank.color} /> })()}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: currentRank.color,
              letterSpacing: '0.04em',
            }}>
              {currentRank.displayName}
            </span>
          </m.div>
        </m.div>

        {/* ═══════ SAVINGS — Celebration card ═══════ */}
        {totalSaved > 0 && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 100%)',
              border: '1px solid rgba(212,175,55,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px rgba(212,175,55,0.08)',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}>
                Возвращено вам
              </div>
              <m.div
                animate={{
                  textShadow: [
                    '0 0 0px rgba(212,175,55,0)',
                    '0 0 12px rgba(212,175,55,0.35)',
                    '0 0 0px rgba(212,175,55,0)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              >
                <GoldText
                  variant="static"
                  weight={700}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 24,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatMoney(totalSaved)}
                </GoldText>
              </m.div>
            </div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.18)',
              boxShadow: '0 0 16px rgba(212,175,55,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={20} strokeWidth={1.8} color="var(--gold-400)" />
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
              padding: '16px 18px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-default)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              marginBottom: 20,
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
                Следующий уровень — «{nextRank.displayName}»
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: nextRank.color,
              }}>
                {nextRank.cashback}%
              </span>
            </div>

            {/* Progress bar with glow */}
            <div style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 10,
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${currentRank.color}80, var(--gold-400))`,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 0 10px rgba(212,175,55,0.30)',
                }}
              >
                <m.div
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '30%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
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
                осталось {formatMoney(spentToNext)}
              </span>
            </div>
          </m.div>
        )}

        {/* Max rank celebration */}
        {isMaxRank && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 18px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
              border: '1px solid rgba(212,175,55,0.15)',
              boxShadow: '0 0 20px rgba(212,175,55,0.06)',
              marginBottom: 20,
            }}
          >
            <Crown size={18} strokeWidth={1.8} color="var(--gold-400)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-200)' }}>
                Высший уровень достигнут
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
            Ваш путь
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
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
                    padding: isCurrent ? '14px 16px' : '12px 14px',
                    borderRadius: isCurrent ? 14 : 12,
                    border: 'none',
                    background: isCurrent
                      ? `linear-gradient(135deg, ${rank.color}12, ${rank.color}06)`
                      : isSelected
                        ? 'rgba(255,255,255,0.03)'
                        : 'transparent',
                    outline: isCurrent
                      ? `1.5px solid ${rank.color}25`
                      : isSelected
                        ? '1px solid var(--border-default)'
                        : '1px solid transparent',
                    boxShadow: isCurrent
                      ? `0 0 16px ${rank.color}10`
                      : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  {/* Icon — rank-colored */}
                  <div style={{
                    width: isCurrent ? 40 : 36,
                    height: isCurrent ? 40 : 36,
                    borderRadius: isCurrent ? 12 : 10,
                    background: isPassed || isCurrent
                      ? `${rank.color}12`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isPassed || isCurrent ? `${rank.color}25` : 'var(--border-default)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isCurrent ? `0 0 12px ${rank.color}15` : 'none',
                    transition: 'all 0.2s ease-out',
                  }}>
                    {isPassed ? (
                      <Check size={15} strokeWidth={2.5} color={rank.color} />
                    ) : (
                      <Icon size={isCurrent ? 17 : 15} strokeWidth={1.8} color={isPassed || isCurrent ? rank.color : 'var(--text-muted)'} />
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
                        fontSize: isCurrent ? 14 : 13,
                        fontWeight: 700,
                        color: isCurrent ? 'var(--gold-200)' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                        fontFamily: isCurrent ? "var(--font-display, 'Playfair Display', serif)" : 'inherit',
                      }}>
                        {rank.displayName}
                      </span>
                      {isCurrent && (
                        <span style={{
                          fontSize: 8,
                          fontWeight: 800,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          color: rank.color,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: `${rank.color}10`,
                          border: `1px solid ${rank.color}20`,
                        }}>
                          Ваш статус
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

                  {/* Cashback % */}
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isCurrent ? rank.color : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    {rank.cashback}%
                  </div>

                  {isLocked && (
                    <Lock size={12} strokeWidth={2} color="var(--text-muted)" style={{ opacity: 0.3, flexShrink: 0 }} />
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
                background: `linear-gradient(135deg, ${viewedRank.color}06, transparent)`,
                border: `1px solid ${viewedRank.color}12`,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}>
                  Уровень «{viewedRank.displayName}» открывает
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Возврат {viewedRank.cashback}% с каждого заказа.
                  {viewedRank.cashback >= 7 && ' Приоритетная линия поддержки.'}
                  {viewedRank.cashback >= 10 && ' Персональный менеджер.'}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 24,
          }}
        >
          {[
            'Начисляется автоматически после каждого заказа',
            'Ваш статус сохраняется навсегда',
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

        {/* ═══════ CTA — LiquidGoldButton ═══════ */}
        {onCreateOrder && !isMaxRank && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <LiquidGoldButton
              onClick={handleCTA}
              icon={<ArrowRight size={16} strokeWidth={2.5} />}
            >
              Сделать заказ
            </LiquidGoldButton>
          </m.div>
        )}

        {onCreateOrder && isMaxRank && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <LiquidGoldButton
              onClick={handleCTA}
              icon={<ChevronRight size={16} strokeWidth={2.5} />}
            >
              Сделать заказ с возвратом 10%
            </LiquidGoldButton>
          </m.div>
        )}

      </div>
    </ModalWrapper>
  )
}
