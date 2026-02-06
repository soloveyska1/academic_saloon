import { useState, useMemo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Lock, CheckCircle, Sparkles, TrendingUp } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { PrivilegeScanner } from './PrivilegeScanner'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Система лояльности
// ═══════════════════════════════════════════════════════════════════════════

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const admin = useAdmin()
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  const effectiveCashback = useMemo(() =>
    admin.simulatedRank !== null ? admin.simulatedRank : user.rank.cashback,
    [admin.simulatedRank, user.rank.cashback]
  )

  const currentRankIndex = useMemo(() =>
    getRankIndexByCashback(effectiveCashback),
    [effectiveCashback]
  )

  const activeDisplayIndex = useMemo(() =>
    selectedRankIndex !== null
      ? selectedRankIndex
      : (currentRankIndex !== -1 ? currentRankIndex : 0),
    [selectedRankIndex, currentRankIndex]
  )

  const currentRank = RANKS[currentRankIndex] || RANKS[0]
  const displayRank = RANKS[activeDisplayIndex] || RANKS[0]
  const isLockedView = activeDisplayIndex > currentRankIndex
  const nextRank = RANKS[currentRankIndex + 1]
  const isMax = !nextRank

  const { progress, spentToNext } = useMemo(() => {
    if (admin.simulatedRank !== null) {
      return {
        progress: 45,
        spentToNext: nextRank ? (nextRank.minSpent - currentRank.minSpent) * 0.55 : 0,
      }
    }
    return {
      progress: user.rank.progress,
      spentToNext: user.rank.spent_to_next,
    }
  }, [admin.simulatedRank, nextRank, currentRank.minSpent, user.rank.progress, user.rank.spent_to_next])

  const handleRankSelect = useCallback((index: number) => {
    setSelectedRankIndex(prev => prev === index ? null : index)
  }, [])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Система лояльности"
      accentColor={displayRank.color}
    >
      <div style={{ padding: '0 20px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f2', marginBottom: 6 }}
          >
            Система лояльности
          </m.div>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            style={{ fontSize: 13, color: '#71717a' }}
          >
            Ваш текущий уровень — <span style={{ color: currentRank.color, fontWeight: 600 }}>{currentRank.displayName}</span>
          </m.div>
        </div>

        {/* Sim badge */}
        {admin.simulatedRank !== null && (
          <div style={{ textAlign: 'right', marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#fca5a5',
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(239,68,68,0.15)',
            }}>
              SIM
            </span>
          </div>
        )}

        {/* Card */}
        <div style={{ marginBottom: 20 }}>
          <HolographicCard rank={displayRank} isLocked={isLockedView} />
        </div>

        {/* Rank pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, justifyContent: 'center' }}>
          {RANKS.map((rank, i) => {
            const isActive = i === activeDisplayIndex
            const isUnlocked = i <= currentRankIndex
            const isCurrent = i === currentRankIndex
            return (
              <m.button
                key={rank.id}
                onClick={() => handleRankSelect(i)}
                whileTap={{ scale: 0.92 }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 12,
                  border: isActive
                    ? `1.5px solid ${rank.color}`
                    : '1.5px solid rgba(255,255,255,0.06)',
                  background: isActive
                    ? `${rank.color}15`
                    : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: rank.color, borderRadius: '2px 2px 0 0',
                  }} />
                )}
                {!isUnlocked && (
                  <Lock size={10} color="#52525b" style={{ position: 'absolute', top: 4, right: 4 }} />
                )}
                <span style={{
                  fontSize: 18, fontWeight: 800,
                  color: isActive ? rank.color : isUnlocked ? '#e4e4e7' : '#52525b',
                }}>
                  {rank.cashback}%
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600,
                  color: isActive ? rank.color : '#71717a',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {rank.displayName}
                </span>
              </m.button>
            )
          })}
        </div>

        {/* Dynamic content */}
        <AnimatePresence mode="wait">
          <m.div
            key={displayRank.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Current rank view */}
            {activeDisplayIndex === currentRankIndex && (
              <>
                {!isMax && (
                  <ProgressSection
                    progress={progress}
                    spentToNext={spentToNext}
                    color={displayRank.color}
                    nextRankName={nextRank?.displayName || ''}
                  />
                )}
                {isMax && <MaxRankSection color={displayRank.color} />}
                <PrivilegeScanner rank={displayRank} isLocked={false} />
              </>
            )}

            {/* Past rank */}
            {activeDisplayIndex < currentRankIndex && (
              <>
                <PastRankSection rank={displayRank} />
                <PrivilegeScanner rank={displayRank} isLocked={false} />
              </>
            )}

            {/* Future rank */}
            {activeDisplayIndex > currentRankIndex && (
              <>
                <LockedRankSection
                  rank={displayRank}
                  amountNeeded={Math.max(0, displayRank.minSpent - (user?.total_spent || 0))}
                />
                <PrivilegeScanner rank={displayRank} isLocked={true} />
              </>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS SECTION — Прогресс до следующего уровня
// ═══════════════════════════════════════════════════════════════════════════

function ProgressSection({
  progress, spentToNext, color, nextRankName,
}: {
  progress: number; spentToNext: number; color: string; nextRankName: string
}) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} color={color} />
          <span style={{ fontSize: 12, color: '#a1a1aa' }}>
            До уровня «{nextRankName}»
          </span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, width: '100%',
        background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden',
      }}>
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 3,
          }}
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#52525b', textAlign: 'right' }}>
        Осталось потратить: <span style={{ color: '#a1a1aa', fontWeight: 600 }}>
          {spentToNext.toLocaleString('ru-RU')} ₽
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAX RANK SECTION — Максимальный уровень достигнут
// ═══════════════════════════════════════════════════════════════════════════

function MaxRankSection({ color }: { color: string }) {
  return (
    <div style={{
      padding: '20px 16px',
      marginBottom: 16,
      borderRadius: 16,
      background: `${color}08`,
      border: `1px solid ${color}20`,
      textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
      }}>
        <Sparkles size={22} color={color} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e4e4e7', marginBottom: 4 }}>
        Максимальный уровень
      </div>
      <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
        Вы достигли наивысшего ранга и получаете все привилегии программы лояльности
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PAST RANK SECTION — Пройденный уровень
// ═══════════════════════════════════════════════════════════════════════════

function PastRankSection({ rank }: { rank: typeof RANKS[0] }) {
  return (
    <div style={{
      padding: '20px 16px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: `${rank.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CheckCircle size={22} color={rank.color} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
            Уровень «{rank.displayName}» пройден
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Вы уже прошли этот уровень. Кешбэк {rank.cashback}% и все привилегии этого ранга были активны на тот момент.
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOCKED RANK SECTION — Заблокированный уровень
// ═══════════════════════════════════════════════════════════════════════════

function LockedRankSection({ rank, amountNeeded }: { rank: typeof RANKS[0]; amountNeeded: number }) {
  return (
    <div style={{
      padding: '20px 16px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Lock size={20} color="#52525b" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
            Уровень «{rank.displayName}»
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Для открытия нужно потратить ещё{' '}
            <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
              {amountNeeded.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Mini info row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14, paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <span style={{ fontSize: 11, color: '#52525b' }}>Кешбэк на этом уровне</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: rank.color }}>{rank.cashback}%</span>
      </div>
    </div>
  )
}
