import { memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Sparkles, X } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  RANK UP CELEBRATION — Full-screen celebration when user levels up
//  Shows confetti, new rank, and unlocked perks
// ═══════════════════════════════════════════════════════════════════════════

interface RankUpCelebrationProps {
  isOpen: boolean
  onClose: () => void
  newRank: {
    name: string
    displayName: string
    level: number
    cashback: number
    emoji: string
  }
  previousRank?: string
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

// Premium rank name mapping
const RANK_DISPLAY_NAMES: Record<string, string> = {
  'Салага': 'Резидент',
  'Ковбой': 'Партнёр',
  'Головорез': 'VIP-Клиент',
  'Легенда Запада': 'Премиум',
}

// Rank perks
const RANK_PERKS: Record<number, string[]> = {
  1: ['Базовый кешбэк 5%', 'Доступ к бонусам'],
  2: ['Кешбэк 7%', 'Приоритетная поддержка'],
  3: ['Кешбэк 8%', 'VIP-поддержка 24/7', 'Бесплатная доработка'],
  4: ['Максимальный кешбэк 10%', 'Персональный менеджер', 'Приоритет в очереди', 'Эксклюзивные скидки'],
}

export const RankUpCelebration = memo(function RankUpCelebration({
  isOpen,
  onClose,
  newRank,
  previousRank,
  haptic,
}: RankUpCelebrationProps) {
  const displayName = RANK_DISPLAY_NAMES[newRank.name] || newRank.displayName || newRank.name
  const prevDisplayName = previousRank ? (RANK_DISPLAY_NAMES[previousRank] || previousRank) : null
  const perks = RANK_PERKS[newRank.level] || []
  const isMaxRank = newRank.level === 4

  useEffect(() => {
    if (isOpen && haptic) {
      // Celebration haptic pattern
      haptic('heavy')
      setTimeout(() => haptic('medium'), 200)
      setTimeout(() => haptic('light'), 400)
    }
  }, [isOpen, haptic])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: 20,
          }}
        >
          {/* Confetti particles */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50vw',
                  y: '30vh',
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 720 - 360,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  width: 8 + Math.random() * 8,
                  height: 8 + Math.random() * 8,
                  borderRadius: Math.random() > 0.5 ? '50%' : 2,
                  background: [
                    '#D4AF37',
                    '#FCF6BA',
                    '#BF953F',
                    '#f59e0b',
                    '#fbbf24',
                  ][Math.floor(Math.random() * 5)],
                  boxShadow: '0 0 10px rgba(212,175,55,0.5)',
                }}
              />
            ))}
          </div>

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 340,
              background: 'linear-gradient(180deg, rgba(30,28,24,0.98) 0%, rgba(15,14,12,0.99) 100%)',
              borderRadius: 28,
              padding: 32,
              border: '1px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 60px rgba(212,175,55,0.2), inset 0 0 40px rgba(212,175,55,0.03)',
              textAlign: 'center',
            }}
          >
            {/* Close button */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} color="var(--text-muted)" />
            </motion.button>

            {/* Crown icon with glow */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 80,
                height: 80,
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))',
                border: '2px solid rgba(212,175,55,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(212,175,55,0.4)',
              }}
            >
              <Crown size={40} color="#D4AF37" strokeWidth={1.5} />
            </motion.div>

            {/* Celebration text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: 'var(--gold-400)',
                  marginBottom: 8,
                }}
              >
                {isMaxRank ? '🏆 МАКСИМАЛЬНЫЙ УРОВЕНЬ!' : '🎉 ПОВЫШЕНИЕ!'}
              </div>

              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: 'var(--font-serif)',
                  background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                  filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.4))',
                }}
              >
                {displayName}
              </h2>

              {prevDisplayName && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginBottom: 20,
                  }}
                >
                  {prevDisplayName} → {displayName}
                </div>
              )}
            </motion.div>

            {/* New perks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                background: 'rgba(212,175,55,0.08)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                border: '1px solid rgba(212,175,55,0.15)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={12} color="var(--gold-400)" />
                РАЗБЛОКИРОВАНО
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {perks.map((perk, i) => (
                  <motion.div
                    key={perk}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--text-main)',
                    }}
                  >
                    <span style={{ color: '#4ade80' }}>✓</span>
                    {perk}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Cashback highlight */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(180,140,40,0.15) 100%)',
                borderRadius: 100,
                border: '1px solid rgba(212,175,55,0.4)',
              }}
            >
              <span style={{ fontSize: 20 }}>💰</span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Кешбэк {newRank.cashback}%
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})
