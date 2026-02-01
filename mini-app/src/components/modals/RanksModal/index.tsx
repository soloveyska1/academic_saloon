import { useMemo } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { Crown } from 'lucide-react'
import { ModalWrapper, HeroIcon, LuxuryCard } from '../shared'
import { RankTimeline } from './RankTimeline'
import { getDisplayName } from '../../../lib/ranks'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  RANKS MODAL — Premium Client Journey Display
// ═══════════════════════════════════════════════════════════════════════════

export interface RanksModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

export function RanksModal({ isOpen, onClose, user }: RanksModalProps) {
  const displayRankName = useMemo(() =>
    getDisplayName(user.rank.name),
    [user.rank.name]
  )

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="ranks-modal"
      title="Путь клиента"
      accentColor="#D4AF37"
    >
      <LazyMotion features={domAnimation}>
        <div style={{ padding: '8px 24px 40px' }}>
          {/* Hero Section */}
          <HeroSection displayRankName={displayRankName} />

          {/* Vertical Timeline */}
          <RankTimeline userCashback={user.rank.cashback} />

          {/* Progress or Max Level */}
          {user.rank.is_max ? (
            <MaxLevelBadge />
          ) : (
            <ProgressCard
              progress={user.rank.progress}
              spentToNext={user.rank.spent_to_next}
            />
          )}
        </div>

        {/* CSS Keyframes */}
        <style>{`
          @keyframes shimmer-text {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </LazyMotion>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function HeroSection({ displayRankName }: { displayRankName: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <HeroIcon
        icon={Crown}
        gradient="linear-gradient(135deg, #D4AF37 0%, #B38728 100%)"
        glowColor="#D4AF37"
        size={96}
      />

      <m.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 700,
          marginTop: 24,
          marginBottom: 10,
          background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer-text 3s ease-in-out infinite',
        }}
      >
        Путь клиента
      </m.h2>

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}
      >
        Ваш статус:{' '}
        <span style={{
          color: '#D4AF37',
          fontWeight: 700,
          textShadow: '0 0 12px rgba(212,175,55,0.4)',
        }}>
          {displayRankName}
        </span>
      </m.p>
    </div>
  )
}

function ProgressCard({
  progress,
  spentToNext,
}: {
  progress: number
  spentToNext: number
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
    >
      <LuxuryCard
        gradient="linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)"
        borderColor="rgba(255,255,255,0.08)"
        style={{ padding: 20 }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            До следующего уровня
          </span>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {spentToNext.toLocaleString('ru-RU')} ₽
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 12,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <m.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress, 3)}%` }}
            transition={{ delay: 0.9, duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #B38728, #D4AF37, #FCF6BA)',
              borderRadius: 6,
              boxShadow: '0 0 16px rgba(212,175,55,0.6)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer on progress */}
            <m.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              }}
            />
          </m.div>
        </div>
      </LuxuryCard>
    </m.div>
  )
}

function MaxLevelBadge() {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8, type: 'spring' }}
    >
      <LuxuryCard
        gradient="linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)"
        borderColor="rgba(212,175,55,0.45)"
        glowColor="#D4AF37"
        isActive
        style={{ padding: 28, textAlign: 'center' }}
      >
        <m.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ fontSize: 44, marginBottom: 12 }}
        >
          👑
        </m.div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'var(--font-serif)',
          background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer-text 3s ease-in-out infinite',
          marginBottom: 8,
        }}>
          Максимальный уровень!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Вы достигли вершины — кешбэк 10%
        </div>
      </LuxuryCard>
    </m.div>
  )
}
