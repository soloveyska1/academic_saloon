import { useState, useMemo, useCallback } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import { CreditCard, CheckCircle, Lock } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { PrivilegeScanner } from './PrivilegeScanner'
import { RankSelector } from './RankSelector'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Premium Loyalty System Display
// ═══════════════════════════════════════════════════════════════════════════

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const admin = useAdmin()
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPUTED VALUES (memoized)
  // ═══════════════════════════════════════════════════════════════════════

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

  // Progress calculation
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

  // ═══════════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleRankSelect = useCallback((index: number) => {
    setSelectedRankIndex(prev => prev === index ? null : index)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Система лояльности"
      accentColor={displayRank.color}
    >
      <LazyMotion features={domAnimation}>
        <div style={{ padding: '8px 20px 40px' }}>
          {/* Header */}
          <Header
            isLockedView={isLockedView}
            isSimulated={admin.simulatedRank !== null}
          />

          {/* 3D Holographic Card */}
          <div style={{ marginBottom: 32 }}>
            <HolographicCard rank={displayRank} isLocked={isLockedView} />
          </div>

          {/* Rank Selector */}
          <RankSelector
            activeIndex={activeDisplayIndex}
            currentUserIndex={currentRankIndex}
            onSelect={handleRankSelect}
          />

          {/* Dynamic Content */}
          <AnimatePresence mode="wait">
            <m.div
              key={displayRank.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Current Rank View */}
              {activeDisplayIndex === currentRankIndex && (
                <CurrentRankContent
                  rank={displayRank}
                  progress={progress}
                  spentToNext={spentToNext}
                  isMax={isMax}
                />
              )}

              {/* Past Rank View */}
              {activeDisplayIndex < currentRankIndex && (
                <PastRankContent rank={displayRank} />
              )}

              {/* Future Rank View */}
              {activeDisplayIndex > currentRankIndex && (
                <FutureRankContent
                  rank={displayRank}
                  userTotalSpent={user?.total_spent || 0}
                />
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </LazyMotion>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function Header({ isLockedView, isSimulated }: { isLockedView: boolean; isSimulated: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
      {isSimulated && (
        <div style={{
          position: 'absolute',
          top: -10,
          right: 0,
          fontSize: 9,
          fontWeight: 700,
          color: '#fca5a5',
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(239,68,68,0.2)',
        }}>
          SIM
        </div>
      )}

      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ marginBottom: 12, display: 'inline-block' }}
      >
        <div style={{
          padding: '8px 16px',
          borderRadius: 100,
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CreditCard size={14} color="#D4AF37" />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#D4AF37',
            letterSpacing: '0.05em',
          }}>
            LOYALTY SYSTEM
          </span>
        </div>
      </m.div>

      <m.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 4,
        }}
      >
        {isLockedView ? 'Уровень заблокирован' : 'Ваша карта'}
      </m.h2>
      <m.p style={{ fontSize: 13, color: '#a1a1aa' }}>
        {isLockedView ? 'Увеличьте оборот для доступа' : 'Активный статус привилегий'}
      </m.p>
    </div>
  )
}

function CurrentRankContent({
  rank,
  progress,
  spentToNext,
  isMax,
}: {
  rank: typeof RANKS[0]
  progress: number
  spentToNext: number
  isMax: boolean
}) {
  return (
    <>
      {!isMax && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>
              Прогресс до следующего уровня
            </span>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div style={{
            height: 6,
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${rank.color}, #fff)`,
                borderRadius: 3,
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#52525b', textAlign: 'right' }}>
            Осталось: <span style={{ color: '#e4e4e7' }}>
              {spentToNext.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      )}
      <PrivilegeScanner rank={rank} isLocked={false} />
    </>
  )
}

function PastRankContent({ rank }: { rank: typeof RANKS[0] }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 20,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 20,
    }}>
      <CheckCircle size={32} color={rank.color} style={{ margin: '0 auto 12px' }} />
      <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>
        Уровень пройден
      </h3>
      <p style={{ fontSize: 13, color: '#a1a1aa' }}>
        Вы уже получили все награды этого уровня
      </p>
    </div>
  )
}

function FutureRankContent({
  rank,
  userTotalSpent,
}: {
  rank: typeof RANKS[0]
  userTotalSpent: number
}) {
  const remaining = (rank.minSpent - userTotalSpent).toLocaleString('ru-RU')

  return (
    <div style={{
      textAlign: 'center',
      padding: 20,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 20,
    }}>
      <Lock size={32} color="#52525b" style={{ margin: '0 auto 12px' }} />
      <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>
        Уровень недоступен
      </h3>
      <p style={{ fontSize: 13, color: '#a1a1aa' }}>
        Потратьте еще {remaining} ₽ для открытия
      </p>
      <PrivilegeScanner rank={rank} isLocked={true} />
    </div>
  )
}
