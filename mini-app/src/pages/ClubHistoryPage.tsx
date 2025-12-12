import { useCallback, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, History, Gift, Target, ShoppingBag, Ticket, TrendingUp } from 'lucide-react'
import { ClubHistoryEntry } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { useClub } from '../contexts/ClubContext'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB HISTORY PAGE - Реальная история баллов и начислений
// ═══════════════════════════════════════════════════════════════════════════════

const getEntryIcon = (type: ClubHistoryEntry['type']) => {
  switch (type) {
    case 'bonus_claim':
      return { icon: <Gift size={16} />, color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.15)' }
    case 'mission_complete':
      return { icon: <Target size={16} />, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' }
    case 'reward_exchange':
      return { icon: <ShoppingBag size={16} />, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' }
    case 'voucher_use':
      return { icon: <Ticket size={16} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    case 'xp_gain':
      return { icon: <TrendingUp size={16} />, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' }
    default:
      return { icon: <History size={16} />, color: '#fff', bg: 'rgba(255, 255, 255, 0.1)' }
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours < 24) return `${hours} ч. назад`
  if (days === 1) return 'Вчера'
  if (days < 7) return `${days} дн. назад`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Header
const HistoryHeader = memo(function HistoryHeader({
  onBack,
  totalEarned,
  currentBalance,
}: {
  onBack: () => void
  totalEarned: number
  currentBalance: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} color="rgba(255, 255, 255, 0.7)" />
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <History size={20} color="rgba(255, 255, 255, 0.7)" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              История
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Баланс: {currentBalance} баллов
            </div>
          </div>
        </div>
      </div>

      {/* Stats badge */}
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
          +{totalEarned} всего
        </span>
      </div>
    </motion.div>
  )
})

function ClubHistoryPage() {
  const navigate = useNavigate()
  const club = useClub()

  // Получаем реальную историю из состояния клуба
  const history = club.history

  const totalEarned = useMemo(() =>
    history.filter(e => e.points > 0).reduce((sum, e) => sum + e.points, 0),
    [history]
  )

  const handleBack = useCallback(() => {
    navigate('/club')
  }, [navigate])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0a0a0c',
      }}
    >
      {/* Premium background */}
      <PremiumBackground />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingBottom: 120,
        }}
      >
        {/* Header */}
        <HistoryHeader
          onBack={handleBack}
          totalEarned={totalEarned}
          currentBalance={club.points}
        />

        {/* History list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((entry, idx) => {
            const { icon, color, bg } = getEntryIcon(entry.type)
            const isPositive = entry.points > 0
            const isNeutral = entry.points === 0

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(18, 18, 21, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#fff',
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)' }}>
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>

                {/* Points */}
                {!isNeutral && (
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isPositive ? '#22c55e' : '#EC4899',
                      flexShrink: 0,
                    }}
                  >
                    {isPositive ? '+' : ''}{entry.points}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Empty state */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: 40,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <History size={28} color="rgba(255, 255, 255, 0.3)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
              История пуста
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }}>
              Здесь появится история ваших баллов
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ClubHistoryPage
