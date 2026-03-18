import { useCallback, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import { ArrowRight, Crown, Sparkles, TrendingUp, Wallet2 } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import { useThemeValue } from '../../../contexts/ThemeContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Aspirational Rewards Experience
//  Not an info screen — a "look how far you've come" celebration
//  + "look what's waiting for you" motivation engine.
//  Every element either validates progress or creates desire.
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

// ═══════════ ANIMATED COUNTER ═══════════
function AnimatedValue({ value, prefix = '', suffix = '' }: {
  value: number; prefix?: string; suffix?: string
}) {
  return (
    <m.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {prefix}{Math.round(value).toLocaleString('ru-RU')}{suffix}
    </m.span>
  )
}

// ═══════════ RANK STEP ═══════════
function RankStep({
  rank,
  index,
  isActive,
  isPassed,
  isLast,
  onSelect,
  isSelected,
  isDark,
}: {
  rank: typeof RANKS[0]
  index: number
  isActive: boolean
  isPassed: boolean
  isLast: boolean
  onSelect: (i: number) => void
  isSelected: boolean
  isDark: boolean
}) {
  const Icon = rank.icon

  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(index)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        padding: '8px 0',
      }}
    >
      {/* Connector line */}
      {!isLast && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            right: '-50%',
            height: 2,
            background: isPassed
              ? isDark ? 'rgba(212,175,55,0.3)' : 'rgba(180,142,38,0.25)'
              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)',
            transform: 'translateY(-50%)',
            zIndex: 0,
          }}
        />
      )}

      {/* Node */}
      <m.div
        animate={isActive ? {
          boxShadow: [
            '0 0 0 0 rgba(212,175,55,0)',
            `0 0 0 6px ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(180,142,38,0.12)'}`,
            '0 0 0 0 rgba(212,175,55,0)',
          ],
        } : undefined}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{
          width: isSelected ? 42 : 36,
          height: isSelected ? 42 : 36,
          borderRadius: isSelected ? 14 : 12,
          background: isPassed || isActive
            ? `linear-gradient(135deg, ${rank.color}30, ${rank.color}15)`
            : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.05)',
          border: isSelected
            ? `2px solid ${rank.color}60`
            : isPassed || isActive
              ? `1.5px solid ${rank.color}30`
              : isDark ? '1.5px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(120,85,40,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.2s ease',
        }}
      >
        <Icon
          size={isSelected ? 18 : 15}
          color={isPassed || isActive
            ? rank.color
            : isDark ? 'rgba(255,255,255,0.20)' : 'rgba(120,113,108,0.4)'}
          strokeWidth={1.8}
        />
      </m.div>

      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: isSelected
            ? rank.color
            : isPassed || isActive
              ? isDark ? 'rgba(255,255,255,0.45)' : 'rgba(87,83,78,0.7)'
              : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,113,108,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          textAlign: 'center',
          lineHeight: 1.2,
          transition: 'color 0.2s ease',
        }}
      >
        {rank.cashback}%
      </span>
    </m.button>
  )
}

export function CashbackModal({ isOpen, onClose, user, onCreateOrder }: CashbackModalProps) {
  const admin = useAdmin()
  const theme = useThemeValue()
  const isDark = theme === 'dark'
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  const effectiveCashback = useMemo(
    () => admin.simulatedRank !== null ? admin.simulatedRank : user.rank.cashback,
    [admin.simulatedRank, user.rank.cashback],
  )

  const currentRankIndex = useMemo(
    () => Math.max(getRankIndexByCashback(effectiveCashback), 0),
    [effectiveCashback],
  )

  const activeRankIndex = selectedRankIndex ?? currentRankIndex
  const currentRank = RANKS[currentRankIndex] || RANKS[0]
  const displayRank = RANKS[activeRankIndex] || RANKS[0]
  const nextRank = RANKS[currentRankIndex + 1] || null
  const isLockedView = activeRankIndex > currentRankIndex
  const progress = Math.max(0, Math.min(user.rank.progress, 100))

  // Calculate actual savings
  const totalSaved = useMemo(() => {
    const spent = admin.simulatedRank !== null ? 25000 : user.total_spent
    return Math.round(spent * currentRank.cashback / 100)
  }, [admin.simulatedRank, user.total_spent, currentRank.cashback])

  // Calculate what next rank would save on total
  const nextRankSavings = useMemo(() => {
    if (!nextRank) return 0
    const spent = admin.simulatedRank !== null ? 25000 : user.total_spent
    return Math.round(spent * nextRank.cashback / 100) - totalSaved
  }, [nextRank, admin.simulatedRank, user.total_spent, totalSaved])

  const spentToNext = useMemo(() => {
    if (!nextRank) return 0
    if (admin.simulatedRank !== null) {
      return Math.round((nextRank.minSpent - currentRank.minSpent) * 0.55)
    }
    return Math.max(0, user.rank.spent_to_next)
  }, [admin.simulatedRank, currentRank.minSpent, nextRank, user.rank.spent_to_next])

  const handleRankSelect = useCallback((index: number) => {
    setSelectedRankIndex(prev => prev === index ? null : index)
  }, [])

  const handleCTA = useCallback(() => {
    onClose()
    onCreateOrder?.()
  }, [onClose, onCreateOrder])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Кэшбэк и статус"
      accentColor={isDark ? '#D4AF37' : '#9e7a1a'}
    >
      <div style={{ padding: '0 20px 20px', overflowX: 'hidden' }}>

        {/* ═══════ HERO — Big cashback number ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 24px' }}
        >
          {/* Cashback icon */}
          <m.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: isDark
                ? 'linear-gradient(145deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))'
                : 'linear-gradient(145deg, rgba(180,142,38,0.10), rgba(180,142,38,0.03))',
              border: isDark
                ? '1.5px solid rgba(212,175,55,0.15)'
                : '1.5px solid rgba(180,142,38,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: isDark
                ? '0 24px 56px -14px rgba(212,175,55,0.22)'
                : '0 24px 56px -14px rgba(158,122,26,0.12)',
            }}
          >
            <Wallet2
              size={32}
              color={isDark ? 'rgba(212,175,55,0.70)' : 'rgba(158,122,26,0.55)'}
              strokeWidth={1.3}
            />
          </m.div>

          {/* Big percentage */}
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 14 }}
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              fontFamily: "'Manrope', sans-serif",
              color: isDark ? '#E8D5A3' : '#7d5c12',
              marginBottom: 8,
            }}
          >
            {currentRank.cashback}%
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{
              fontSize: 14,
              color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(87,83,78,0.7)',
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            кэшбэк на все заказы
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 13,
              color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(120,113,108,0.6)',
              fontWeight: 500,
            }}
          >
            статус «{currentRank.displayName}»
          </m.div>

          {admin.simulatedRank !== null && (
            <div style={{
              marginTop: 10,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', borderRadius: 6,
              background: 'rgba(239,68,68,0.08)',
              color: 'rgba(239,68,68,0.65)',
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Sparkles size={10} />
              Тестовый просмотр
            </div>
          )}
        </m.div>

        {/* ═══════ SAVINGS CARD — The wow moment ═══════ */}
        {totalSaved > 0 && (
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              padding: '18px 20px',
              borderRadius: 18,
              background: isDark
                ? 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(21,128,61,0.06) 0%, rgba(21,128,61,0.02) 100%)',
              border: isDark
                ? '1px solid rgba(34,197,94,0.12)'
                : '1px solid rgba(21,128,61,0.12)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? 'rgba(34,197,94,0.55)' : 'rgba(21,128,61,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              Вы сэкономили с кэшбэком
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 800,
              color: isDark ? '#4ade80' : '#15803d',
              letterSpacing: '-0.02em',
              fontFamily: "'Manrope', sans-serif",
              lineHeight: 1,
            }}>
              <AnimatedValue value={totalSaved} suffix=" ₽" />
            </div>
            {nextRankSavings > 0 && (
              <div style={{
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(120,113,108,0.6)',
                fontWeight: 500,
                marginTop: 8,
              }}>
                С кэшбэком {nextRank!.cashback}% было бы на {formatMoney(nextRankSavings)} больше
              </div>
            )}
          </m.div>
        )}

        {/* ═══════ STATUS CARD ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 20 }}
        >
          <HolographicCard rank={displayRank} isLocked={isLockedView} />
        </m.div>

        {/* ═══════ RANK PROGRESSION ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0,
            marginBottom: 20,
            padding: '0 4px',
          }}
        >
          {RANKS.map((rank, index) => (
            <RankStep
              key={rank.id}
              rank={rank}
              index={index}
              isActive={index === currentRankIndex}
              isPassed={index < currentRankIndex}
              isLast={index === RANKS.length - 1}
              onSelect={handleRankSelect}
              isSelected={activeRankIndex === index}
              isDark={isDark}
            />
          ))}
        </m.div>

        {/* ═══════ PROGRESS TO NEXT ═══════ */}
        {nextRank && !isLockedView && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              padding: '18px 18px',
              borderRadius: 18,
              background: isDark
                ? 'rgba(212,175,55,0.04)'
                : 'rgba(180,142,38,0.04)',
              border: isDark
                ? '1px solid rgba(212,175,55,0.10)'
                : '1px solid rgba(180,142,38,0.15)',
              marginBottom: 16,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp
                  size={14}
                  color={isDark ? 'rgba(212,175,55,0.55)' : 'rgba(158,122,26,0.5)'}
                />
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(28,25,23,0.75)',
                }}>
                  До «{nextRank.displayName}»
                </span>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: isDark ? '#E8D5A3' : '#7d5c12',
              }}>
                {formatMoney(spentToNext)}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6,
              borderRadius: 99,
              background: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(120,85,40,0.08)',
              overflow: 'hidden',
              marginBottom: 10,
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  borderRadius: 99,
                  background: isDark
                    ? 'linear-gradient(90deg, rgba(212,175,55,0.5), #D4AF37)'
                    : 'linear-gradient(90deg, rgba(158,122,26,0.45), #9e7a1a)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <m.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '40%', height: '100%',
                    background: isDark
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                  }}
                />
              </m.div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(120,113,108,0.55)',
                fontWeight: 500,
              }}>
                {progress}% пройдено
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: isDark ? 'rgba(212,175,55,0.50)' : 'rgba(158,122,26,0.5)',
              }}>
                +{nextRank.cashback - currentRank.cashback}% к кэшбэку
              </span>
            </div>
          </m.div>
        )}

        {/* Max rank celebration */}
        {!nextRank && !isLockedView && (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
            style={{
              padding: '20px 18px',
              borderRadius: 18,
              background: isDark
                ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))'
                : 'linear-gradient(135deg, rgba(180,142,38,0.08), rgba(180,142,38,0.02))',
              border: isDark
                ? '1px solid rgba(212,175,55,0.15)'
                : '1px solid rgba(180,142,38,0.18)',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              fontWeight: 700,
              color: isDark ? '#E8D5A3' : '#7d5c12',
            }}>
              <Crown size={18} color={isDark ? '#D4AF37' : '#9e7a1a'} />
              Максимальный кэшбэк активен
            </div>
            <div style={{
              fontSize: 13,
              color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(120,113,108,0.6)',
              marginTop: 8,
              lineHeight: 1.5,
            }}>
              10% возвращается с каждого заказа на ваш баланс
            </div>
          </m.div>
        )}

        {/* Locked rank preview */}
        {isLockedView && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              padding: '18px 18px',
              borderRadius: 18,
              background: isDark
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(255,255,255,0.85)',
              border: isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(120,85,40,0.08)',
              marginBottom: 16,
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(120,113,108,0.55)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 10,
            }}>
              Условия статуса «{displayRank.displayName}»
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}>
              <div>
                <div style={{
                  fontSize: 14,
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(87,83,78,0.75)',
                  fontWeight: 600,
                  marginBottom: 4,
                }}>
                  Кэшбэк {displayRank.cashback}% на все заказы
                </div>
                <div style={{
                  fontSize: 13,
                  color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(120,113,108,0.55)',
                }}>
                  Объём заказов от {formatMoney(displayRank.minSpent)}
                </div>
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(120,113,108,0.15)',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {displayRank.cashback}%
              </div>
            </div>
          </m.div>
        )}

        {/* ═══════ BENEFITS STRIP ═══════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: 'Автоматически', desc: 'Начисление на баланс', icon: '✓' },
            { label: 'На все заказы', desc: 'Без исключений', icon: '✓' },
            { label: 'Бессрочно', desc: 'Накопленное не сгорает', icon: '✓' },
            { label: 'Растёт', desc: 'С каждым заказом', icon: '↑' },
          ].map((b, i) => (
            <div
              key={b.label}
              style={{
                padding: '14px 14px',
                borderRadius: 14,
                background: i === 0
                  ? isDark ? 'rgba(212,175,55,0.03)' : 'rgba(180,142,38,0.04)'
                  : isDark ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.90)',
                border: `1px solid ${i === 0
                  ? isDark ? 'rgba(212,175,55,0.06)' : 'rgba(180,142,38,0.12)'
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.06)'}`,
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(28,25,23,0.75)',
                marginBottom: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  fontSize: 11,
                  color: isDark ? 'rgba(212,175,55,0.50)' : 'rgba(158,122,26,0.55)',
                  fontWeight: 800,
                }}>
                  {b.icon}
                </span>
                {b.label}
              </div>
              <div style={{
                fontSize: 12,
                color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(120,113,108,0.55)',
                fontWeight: 500,
              }}>
                {b.desc}
              </div>
            </div>
          ))}
        </m.div>

        {/* ═══════ CTA ═══════ */}
        {onCreateOrder && nextRank && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))'
                  : 'linear-gradient(135deg, rgba(180,142,38,0.12), rgba(180,142,38,0.04))',
                border: isDark
                  ? '1px solid rgba(212,175,55,0.20)'
                  : '1px solid rgba(180,142,38,0.22)',
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
                color: isDark ? '#E8D5A3' : '#7d5c12',
              }}>
                Следующий заказ приближает к {nextRank.cashback}%
              </span>
              <ArrowRight size={16} color={isDark ? '#E8D5A3' : '#7d5c12'} />
            </m.button>
          </m.div>
        )}

      </div>
    </ModalWrapper>
  )
}
