import { useCallback, useMemo, useState } from 'react'
import { m } from 'framer-motion'
import { ArrowUpRight, Crown, Lock, Sparkles, Wallet2 } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { HolographicCard } from './HolographicCard'
import { PrivilegeScanner } from './PrivilegeScanner'
import { RANKS, getRankIndexByCashback } from '../../../lib/ranks'
import { useAdmin } from '../../../contexts/AdminContext'
import type { UserData } from '../../../types'

export interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ProgressBar({
  value,
  color,
}: {
  value: number
  color: string
}) {
  return (
    <div
      style={{
        height: 7,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(value, 100))}%`,
          height: '100%',
          borderRadius: 999,
          background: `linear-gradient(90deg, ${color}, rgba(252,246,186,0.95))`,
          boxShadow: `0 0 16px ${color}44`,
        }}
      />
    </div>
  )
}

function RankPill({
  active,
  locked,
  label,
  cashback,
  color,
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
        flex: 1,
        minWidth: 0,
        padding: '12px 8px',
        borderRadius: 16,
        border: `1px solid ${active ? `${color}66` : 'rgba(255,255,255,0.06)'}`,
        background: active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        color: active ? '#fff' : 'rgba(255,255,255,0.78)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {locked && (
        <Lock
          size={11}
          color="rgba(255,255,255,0.35)"
          style={{ position: 'absolute', top: 8, right: 8 }}
        />
      )}
      <span style={{ fontSize: 17, fontWeight: 800, color: active ? color : '#fff' }}>
        {cashback}%
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: active ? color : 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </m.button>
  )
}

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const admin = useAdmin()
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  const effectiveCashback = useMemo(
    () => (admin.simulatedRank !== null ? admin.simulatedRank : user.rank.cashback),
    [admin.simulatedRank, user.rank.cashback]
  )

  const currentRankIndex = useMemo(
    () => Math.max(getRankIndexByCashback(effectiveCashback), 0),
    [effectiveCashback]
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

  const currentBadgeText = useMemo(() => {
    if (isLockedView) {
      return `Откроется после общего объёма от ${formatMoney(displayRank.minSpent)}`
    }
    if (isPastView) {
      return 'Этот статус уже пройден и все его условия включены автоматически.'
    }
    if (!nextRank) {
      return 'У вас максимальный уровень кэшбэка и приоритетные условия уже активны.'
    }
    return `До следующего статуса осталось ${formatMoney(spentToNext)}`
  }, [displayRank.minSpent, isLockedView, isPastView, nextRank, spentToNext])

  const handleRankSelect = useCallback((index: number) => {
    setSelectedRankIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="cashback-modal"
      title="Кэшбэк и статус"
      accentColor={displayRank.color}
    >
      <div style={{ padding: '0 20px 20px', overflowX: 'hidden' }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 18,
            paddingTop: 4,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              marginBottom: 12,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.16)',
              color: '#d4af37',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <Wallet2 size={12} />
            Кэшбэк
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
            Профиль и статус клиента синхронизированы
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Здесь видно ваш текущий кэшбэк, что уже включено в условия и какой статус откроется следующим.
          </div>
        </m.div>

        <SurfaceCard
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(255,255,255,0.02))',
            border: '1px solid rgba(212,175,55,0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(212,175,55,0.72)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Ваш статус
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {currentRank.displayName}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                Кэшбэк {currentRank.cashback}% действует на все заказы и отображается так же в профиле.
              </div>
            </div>

            <div
              style={{
                flex: '0 0 auto',
                minWidth: 88,
                padding: '10px 12px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Сейчас
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: currentRank.color }}>
                {currentRank.cashback}%
              </div>
            </div>
          </div>

          {admin.simulatedRank !== null && (
            <div
              style={{
                marginBottom: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                borderRadius: 999,
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.18)',
                color: '#fda4af',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <Sparkles size={12} />
              Тестовый просмотр
            </div>
          )}

          <HolographicCard rank={displayRank} isLocked={isLockedView} />
        </SurfaceCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
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

        <SurfaceCard style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {isLockedView ? `Что даст статус «${displayRank.displayName}»` : 'Движение по статусу'}
            </div>
            {!isLockedView && !isPastView && nextRank && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--gold-300)', fontSize: 12, fontWeight: 700 }}>
                <ArrowUpRight size={14} />
                Следующий: {nextRank.displayName}
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 14 }}>
            {currentBadgeText}
          </div>

          {!isLockedView && !isPastView && nextRank && (
            <>
              <ProgressBar value={progress} color={currentRank.color} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
                  Текущий статус: {currentRank.displayName}
                </span>
                <span style={{ fontSize: 12, color: currentRank.color, fontWeight: 700 }}>
                  {progress}%
                </span>
              </div>
            </>
          )}

          {!nextRank && !isLockedView && !isPastView && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 14,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.14)',
                color: 'var(--gold-300)',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Crown size={15} />
              Максимальный статус уже активен
            </div>
          )}
        </SurfaceCard>

        <PrivilegeScanner rank={displayRank} isLocked={isLockedView} />
      </div>
    </ModalWrapper>
  )
}
