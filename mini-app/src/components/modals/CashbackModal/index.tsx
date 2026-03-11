import { useCallback, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import { ArrowUpRight, Crown, Lock, Sparkles, Wallet2 } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { PrivilegeScanner } from './PrivilegeScanner'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Quiet Luxury Redesign
//  Warm gold monochrome. No radial gradients, no animated shimmer.
//  Clean card, simple rank grid, subtle privilege list.
// ═══════════════════════════════════════════════════════════════════════════

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      height: 5, borderRadius: 99,
      background: 'rgba(255,255,255,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${Math.max(0, Math.min(value, 100))}%`,
        height: '100%', borderRadius: 99,
        background: color,
        opacity: 0.7,
      }} />
    </div>
  )
}

function RankPill({
  active,
  locked,
  label,
  cashback,
  color: _color,
  onClick,
}: {
  active: boolean
  locked: boolean
  label: string
  cashback: number
  color: string
  onClick: () => void
}) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0,
        padding: '12px 8px',
        borderRadius: 14,
        border: `1px solid ${active ? 'rgba(212,175,55,0.20)' : 'rgba(255,255,255,0.04)'}`,
        background: active ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 3,
        position: 'relative',
      }}
    >
      {locked && (
        <Lock
          size={10}
          color="rgba(255,255,255,0.20)"
          style={{ position: 'absolute', top: 7, right: 7 }}
        />
      )}
      <span style={{
        fontSize: 17, fontWeight: 800,
        color: active ? '#E8D5A3' : locked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
      }}>
        {cashback}%
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: active ? 'rgba(212,175,55,0.60)' : 'rgba(255,255,255,0.30)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textAlign: 'center',
      }}>
        {label}
      </span>
    </m.button>
  )
}

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
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

  const activeRankIndex = selectedRankIndex ?? currentRankIndex
  const currentRank = RANKS[currentRankIndex] || RANKS[0]
  const displayRank = RANKS[activeRankIndex] || RANKS[0]
  const nextRank = RANKS[currentRankIndex + 1] || null
  const isLockedView = activeRankIndex > currentRankIndex
  const isPastView = activeRankIndex < currentRankIndex
  const progress = Math.max(0, Math.min(user.rank.progress, 100))

  const spentToNext = useMemo(() => {
    if (!nextRank) return 0
    if (admin.simulatedRank !== null) {
      return Math.round((nextRank.minSpent - currentRank.minSpent) * 0.55)
    }
    return Math.max(0, user.rank.spent_to_next)
  }, [admin.simulatedRank, currentRank.minSpent, nextRank, user.rank.spent_to_next])

  const statusText = useMemo(() => {
    if (isLockedView) return `Откроется при объёме заказов от ${formatMoney(displayRank.minSpent)}`
    if (isPastView) return 'Этот статус уже пройден, все условия включены автоматически.'
    if (!nextRank) return 'Максимальный уровень кэшбэка активен.'
    return `До следующего статуса осталось ${formatMoney(spentToNext)}`
  }, [displayRank.minSpent, isLockedView, isPastView, nextRank, spentToNext])

  const handleRankSelect = useCallback((index: number) => {
    setSelectedRankIndex(prev => prev === index ? null : index)
  }, [])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Кэшбэк и статус"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '0 20px 20px', overflowX: 'hidden' }}>

        {/* ═══════ Hero ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 24px' }}
        >
          <m.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 20px 48px -12px rgba(212,175,55,0.18)',
            }}
          >
            <Wallet2 size={28} color="rgba(212,175,55,0.65)" strokeWidth={1.4} />
          </m.div>

          <div style={{
            fontSize: 26, fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.02em', marginBottom: 10,
            fontFamily: "'Manrope', sans-serif",
            color: '#E8D5A3',
          }}>
            Кэшбэк и статус
          </div>
          <div style={{
            fontSize: 14, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.42)', fontWeight: 500,
            maxWidth: 270, margin: '0 auto',
          }}>
            Ваш кэшбэк растёт с каждым заказом — автоматически
          </div>
        </m.div>

        {/* ═══════ Current Status ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            padding: 18, borderRadius: 18,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.10)',
            marginBottom: 16,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: 12,
            marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: 'rgba(212,175,55,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em', marginBottom: 6,
              }}>
                Ваш статус
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: 'rgba(255,255,255,0.88)', marginBottom: 4,
              }}>
                {currentRank.displayName}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>
                Кэшбэк {currentRank.cashback}% на все заказы
              </div>
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.04)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#E8D5A3' }}>
                {currentRank.cashback}%
              </div>
            </div>
          </div>

          {admin.simulatedRank !== null && (
            <div style={{
              marginBottom: 14,
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

          <HolographicCard rank={displayRank} isLocked={isLockedView} />
        </m.div>

        {/* ═══════ Rank Grid ═══════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8, marginBottom: 16,
        }}>
          {RANKS.map((rank, index) => (
            <RankPill
              key={rank.id}
              active={activeRankIndex === index}
              locked={index > currentRankIndex}
              label={rank.displayName}
              cashback={rank.cashback}
              color={rank.color}
              onClick={() => handleRankSelect(index)}
            />
          ))}
        </div>

        {/* ═══════ Progress ═══════ */}
        <div style={{
          padding: 16, borderRadius: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          marginBottom: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700,
              color: 'rgba(255,255,255,0.75)',
            }}>
              {isLockedView ? `Статус «${displayRank.displayName}»` : 'Прогресс'}
            </div>
            {!isLockedView && !isPastView && nextRank && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                color: 'rgba(212,175,55,0.55)', fontSize: 12, fontWeight: 600,
              }}>
                <ArrowUpRight size={13} />
                {nextRank.displayName}
              </div>
            )}
          </div>

          <div style={{
            fontSize: 13, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.42)', marginBottom: 12,
          }}>
            {statusText}
          </div>

          {!isLockedView && !isPastView && nextRank && (
            <>
              <ProgressBar value={progress} color="#D4AF37" />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                gap: 10, marginTop: 8,
              }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
                  {currentRank.displayName}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#E8D5A3' }}>
                  {progress}%
                </span>
              </div>
            </>
          )}

          {!nextRank && !isLockedView && !isPastView && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 12px', borderRadius: 12,
              background: 'rgba(212,175,55,0.05)',
              border: '1px solid rgba(212,175,55,0.08)',
              color: '#E8D5A3', fontSize: 13, fontWeight: 600,
            }}>
              <Crown size={14} />
              Максимальный статус активен
            </div>
          )}
        </div>

        {/* ═══════ Privileges ═══════ */}
        <PrivilegeScanner rank={displayRank} isLocked={isLockedView} />

      </div>
    </ModalWrapper>
  )
}
