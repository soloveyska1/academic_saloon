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
//  CASHBACK MODAL — "The Void & The Gold" Premium Edition
// ═══════════════════════════════════════════════════════════════════════════

// Shared voidGlass card style
const VOID_CARD: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.04)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative',
  overflow: 'hidden',
}

// Icon container style
const goldIconStyle: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 14,
  background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
  border: '1px solid rgba(212,175,55,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.15))',
}

// Top highlight line
function TopHighlight() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
    }} />
  )
}

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

        {/* ── Section label (Cinzel serif) ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.03 }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 12,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          Лояльность
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, rgba(82,82,91,0.3), transparent)',
          }} />
        </m.div>

        {/* ── Subtitle ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}
        >
          Ваш уровень — <span style={{ color: currentRank.color, fontWeight: 600 }}>{currentRank.displayName}</span>
        </m.div>

        {/* Sim badge */}
        {admin.simulatedRank !== null && (
          <div style={{ textAlign: 'right', marginBottom: 4 }}>
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9, fontWeight: 700, color: '#fca5a5',
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(239,68,68,0.15)',
              letterSpacing: '0.1em',
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
                    ? `1.5px solid ${rank.color}60`
                    : '1.5px solid rgba(255,255,255,0.04)',
                  background: isActive
                    ? 'rgba(9,9,11,0.8)'
                    : 'rgba(9,9,11,0.4)',
                  boxShadow: isActive
                    ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 12px ${rank.color}15`
                    : 'inset 0 1px 0 rgba(255,255,255,0.02)',
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
                    background: `linear-gradient(90deg, transparent, ${rank.color}, transparent)`,
                    borderRadius: '2px 2px 0 0',
                  }} />
                )}
                {!isUnlocked && (
                  <Lock size={10} color="#3f3f46" style={{ position: 'absolute', top: 4, right: 4 }} />
                )}
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 17, fontWeight: 700,
                  color: isActive ? rank.color : isUnlocked ? '#a1a1aa' : '#3f3f46',
                }}>
                  {rank.cashback}%
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600,
                  color: isActive ? rank.color : '#52525b',
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
//  PROGRESS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function ProgressSection({
  progress, spentToNext, color, nextRankName,
}: {
  progress: number; spentToNext: number; color: string; nextRankName: string
}) {
  return (
    <div style={{ ...VOID_CARD, marginBottom: 10 }}>
      <TopHighlight />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={goldIconStyle}>
          <TrendingUp size={20} color="#d4af37" strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 4 }}>
            До уровня «{nextRankName}»
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Осталось потратить {spentToNext.toLocaleString('ru-RU')} ₽
          </div>
        </div>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 16, fontWeight: 700, color, flexShrink: 0,
        }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, width: '100%', marginTop: 14,
        background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden',
      }}>
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 2,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAX RANK SECTION
// ═══════════════════════════════════════════════════════════════════════════

function MaxRankSection({ color }: { color: string }) {
  return (
    <div style={{ ...VOID_CARD, marginBottom: 10 }}>
      <TopHighlight />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={goldIconStyle}>
          <Sparkles size={20} color="#d4af37" strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 4 }}>
            Максимальный уровень
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Все привилегии программы лояльности активны
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PAST RANK SECTION
// ═══════════════════════════════════════════════════════════════════════════

function PastRankSection({ rank }: { rank: typeof RANKS[0] }) {
  return (
    <div style={VOID_CARD}>
      <TopHighlight />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={goldIconStyle}>
          <CheckCircle size={20} color="#d4af37" strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 4 }}>
            Уровень «{rank.displayName}» пройден
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Кешбэк {rank.cashback}% и привилегии этого ранга были активны
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOCKED RANK SECTION
// ═══════════════════════════════════════════════════════════════════════════

function LockedRankSection({ rank, amountNeeded }: { rank: typeof RANKS[0]; amountNeeded: number }) {
  return (
    <div style={{ ...VOID_CARD, marginBottom: 10 }}>
      <TopHighlight />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Lock size={20} color="#3f3f46" strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 4 }}>
            Уровень «{rank.displayName}»
          </div>
          <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
            Для открытия потратьте ещё{' '}
            <span style={{ color: '#a1a1aa', fontWeight: 600 }}>
              {amountNeeded.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Cashback preview */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14, paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <span style={{ fontSize: 12, color: '#3f3f46' }}>Кешбэк на этом уровне</span>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 14, fontWeight: 700, color: rank.color,
        }}>{rank.cashback}%</span>
      </div>
    </div>
  )
}
