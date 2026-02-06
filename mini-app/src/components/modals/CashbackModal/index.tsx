import { useState, useMemo, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Lock, ChevronRight } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { PrivilegeScanner } from './PrivilegeScanner'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Premium Loyalty System
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
      <div style={{ padding: '4px 20px 20px' }}>
        {/* Sim badge */}
        {admin.simulatedRank !== null && (
          <div style={{
            textAlign: 'right',
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#fca5a5',
              padding: '2px 8px',
              borderRadius: 4,
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
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 24,
          justifyContent: 'center',
        }}>
          {RANKS.map((rank, i) => {
            const isActive = i === activeDisplayIndex
            const isUnlocked = i <= currentRankIndex
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
                {!isUnlocked && (
                  <Lock size={10} color="#52525b" style={{ position: 'absolute', top: 4, right: 4 }} />
                )}
                <span style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: isActive ? rank.color : isUnlocked ? '#e4e4e7' : '#52525b',
                }}>
                  {rank.cashback}%
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: isActive ? rank.color : '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
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
                {isMax && (
                  <div style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    marginBottom: 16,
                    borderRadius: 16,
                    background: `${displayRank.color}08`,
                    border: `1px solid ${displayRank.color}20`,
                  }}>
                    <span style={{ fontSize: 13, color: displayRank.color, fontWeight: 600 }}>
                      Максимальный уровень достигнут
                    </span>
                  </div>
                )}
                <PrivilegeScanner rank={displayRank} isLocked={false} />
              </>
            )}

            {/* Past rank */}
            {activeDisplayIndex < currentRankIndex && (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: `${displayRank.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <displayRank.icon size={20} color={displayRank.color} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
                  Уровень пройден
                </div>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  Все привилегии этого уровня получены
                </div>
              </div>
            )}

            {/* Future rank */}
            {activeDisplayIndex > currentRankIndex && (
              <>
                <div style={{
                  textAlign: 'center',
                  padding: '20px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: 16,
                }}>
                  <Lock size={24} color="#52525b" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
                    Уровень недоступен
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a' }}>
                    Потратьте ещё{' '}
                    <span style={{ color: '#e4e4e7', fontWeight: 600 }}>
                      {Math.max(0, displayRank.minSpent - (user?.total_spent || 0)).toLocaleString('ru-RU')} ₽
                    </span>
                    {' '}для открытия
                  </div>
                </div>
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
//  PROGRESS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function ProgressSection({
  progress,
  spentToNext,
  color,
  nextRankName,
}: {
  progress: number
  spentToNext: number
  color: string
  nextRankName: string
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
        <span style={{ fontSize: 12, color: '#a1a1aa' }}>
          До уровня «{nextRankName}»
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>
            {Math.round(progress)}%
          </span>
          <ChevronRight size={14} color={color} />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        width: '100%',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
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
        Осталось: <span style={{ color: '#a1a1aa', fontWeight: 600 }}>
          {spentToNext.toLocaleString('ru-RU')} ₽
        </span>
      </div>
    </div>
  )
}
