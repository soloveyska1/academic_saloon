import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import {
  Crown, Sparkles, Diamond, Star, Trophy,
  Gem, Zap, Gift, Target, Lock, Unlock
} from 'lucide-react'
import { UserData, RouletteResult } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { spinRoulette } from '../api/userApi'
import { useAdmin } from '../contexts/AdminContext'
import { Confetti, useConfetti } from '../components/ui/Confetti'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELITE CLUB PRIZE TIERS
//  Шанс выигрыша крайне низкий - это элитный клуб!
// ═══════════════════════════════════════════════════════════════════════════

const PRIZE_TIERS = [
  {
    id: 'jackpot',
    name: 'ДЖЕКПОТ',
    amount: 50000,
    icon: Crown,
    color: '#ffd700',
    bgGradient: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    chance: '0.00001%', // Практически невозможно
    glow: 'rgba(255, 215, 0, 0.6)',
  },
  {
    id: 'mega',
    name: 'МЕГА-ПРИЗ',
    amount: 10000,
    icon: Trophy,
    color: '#e5e4e2',
    bgGradient: 'linear-gradient(135deg, #e5e4e2, #8a8a8a)',
    chance: '0.0001%',
    glow: 'rgba(229, 228, 226, 0.4)',
  },
  {
    id: 'super',
    name: 'СУПЕР-ПРИЗ',
    amount: 5000,
    icon: Diamond,
    color: '#b9f2ff',
    bgGradient: 'linear-gradient(135deg, #b9f2ff, #00bfff)',
    chance: '0.001%',
    glow: 'rgba(185, 242, 255, 0.4)',
  },
  {
    id: 'big',
    name: 'КРУПНЫЙ',
    amount: 1000,
    icon: Gem,
    color: '#da70d6',
    bgGradient: 'linear-gradient(135deg, #da70d6, #9932cc)',
    chance: '0.01%',
    glow: 'rgba(218, 112, 214, 0.3)',
  },
  {
    id: 'medium',
    name: 'ХОРОШИЙ',
    amount: 500,
    icon: Star,
    color: '#d4af37',
    bgGradient: 'linear-gradient(135deg, #d4af37, #8b6914)',
    chance: '0.1%',
    glow: 'rgba(212, 175, 55, 0.3)',
  },
  {
    id: 'small',
    name: 'БОНУС',
    amount: 100,
    icon: Gift,
    color: '#22c55e',
    bgGradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    chance: '1%',
    glow: 'rgba(34, 197, 94, 0.3)',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED PRIZE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PrizeCard({
  tier,
  delay,
  isHighlighted,
}: {
  tier: typeof PRIZE_TIERS[0]
  delay: number
  isHighlighted: boolean
}) {
  const Icon = tier.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: 1,
        scale: isHighlighted ? 1.05 : 1,
        y: 0,
      }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      style={{
        position: 'relative',
        padding: 16,
        borderRadius: 16,
        background: isHighlighted
          ? tier.bgGradient
          : 'var(--bg-card)',
        border: isHighlighted
          ? `2px solid ${tier.color}`
          : '1px solid var(--border-default)',
        boxShadow: isHighlighted
          ? `0 0 40px ${tier.glow}, 0 8px 32px rgba(0,0,0,0.4)`
          : 'var(--card-shadow)',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Shine effect */}
      {isHighlighted && (
        <motion.div
          animate={{
            x: ['-100%', '200%'],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            transform: 'skewX(-20deg)',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: isHighlighted
              ? 'rgba(0,0,0,0.2)'
              : `${tier.color}15`,
            border: `1px solid ${tier.color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isHighlighted
              ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
              : 'none',
          }}
        >
          <Icon
            size={24}
            color={isHighlighted ? '#fff' : tier.color}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: isHighlighted ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginBottom: 2,
            }}
          >
            {tier.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              fontWeight: 800,
              color: isHighlighted ? '#fff' : tier.color,
            }}
          >
            {tier.amount.toLocaleString('ru-RU')}₽
          </div>
        </div>
        <div
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            background: 'var(--bg-glass)',
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: isHighlighted ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {tier.chance}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELITE VAULT ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

function EliteVault({
  isOpening,
  isOpen,
  result,
}: {
  isOpening: boolean
  isOpen: boolean
  result: RouletteResult | null
}) {
  return (
    <motion.div
      style={{
        position: 'relative',
        width: 200,
        height: 200,
        margin: '0 auto 32px',
      }}
    >
      {/* Vault glow */}
      <motion.div
        animate={{
          opacity: isOpening ? [0.3, 0.8, 0.3] : 0.2,
          scale: isOpening ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 1,
          repeat: isOpening ? Infinity : 0,
        }}
        style={{
          position: 'absolute',
          inset: -40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Vault body */}
      <motion.div
        animate={isOpening ? { rotate: [0, -2, 2, -1, 1, 0] } : {}}
        transition={{
          duration: 0.5,
          repeat: isOpening ? Infinity : 0,
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24,
          background: 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 50%, #1a1a1e 100%)',
          border: '4px solid #4a4a50',
          boxShadow: `
            0 20px 60px rgba(0, 0, 0, 0.7),
            inset 0 2px 8px rgba(255,255,255,0.1),
            inset 0 -4px 12px rgba(0,0,0,0.4)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Inner vault door */}
        <motion.div
          animate={isOpen ? { rotateY: -120, x: -80 } : { rotateY: 0, x: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          style={{
            width: 140,
            height: 140,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #4a4a50 0%, #3a3a40 50%, #2a2a2e 100%)',
            border: '3px solid #5a5a60',
            boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transformStyle: 'preserve-3d',
            perspective: 1000,
          }}
        >
          {/* Lock icon */}
          <motion.div
            animate={isOpening ? { rotate: 360 } : {}}
            transition={{
              duration: 2,
              repeat: isOpening ? Infinity : 0,
              ease: 'linear',
            }}
          >
            {isOpen ? (
              <Unlock size={48} color="#22c55e" strokeWidth={1.5} />
            ) : (
              <Lock size={48} color="#d4af37" strokeWidth={1.5} />
            )}
          </motion.div>
          {!isOpen && (
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: 600,
                color: '#71717a',
                letterSpacing: '0.1em',
              }}
            >
              ELITE VAULT
            </div>
          )}
        </motion.div>

        {/* Prize reveal behind door */}
        {isOpen && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {result.type !== 'nothing' ? (
              <>
                <Sparkles size={32} color="#d4af37" />
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-serif)",
                    fontSize: 28,
                    fontWeight: 800,
                    color: '#d4af37',
                  }}
                >
                  {result.value.toLocaleString('ru-RU')}₽
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: '#71717a',
                  textAlign: 'center',
                }}
              >
                Пусто
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Decorative elements */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={i}
          animate={isOpening ? {
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          } : {}}
          transition={{
            duration: 0.8,
            delay: i * 0.1,
            repeat: isOpening ? Infinity : 0,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#d4af37',
            boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
            transform: `rotate(${angle}deg) translateY(-110px)`,
          }}
        />
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPIN BUTTON WITH PREMIUM DESIGN
// ═══════════════════════════════════════════════════════════════════════════

function SpinButton({
  onClick,
  disabled,
  spinning,
}: {
  onClick: () => void
  disabled: boolean
  spinning: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.03, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 300,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Button shadow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: 6,
          borderRadius: 20,
          background: 'linear-gradient(180deg, #5a4010, #2a1f08)',
          filter: 'blur(2px)',
        }}
      />

      {/* Main button */}
      <div
        style={{
          position: 'relative',
          padding: '20px 32px',
          borderRadius: 18,
          background: disabled
            ? 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 100%)'
            : 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)',
          border: disabled
            ? '2px solid rgba(255,255,255,0.06)'
            : '3px solid #6b4f0f',
          boxShadow: disabled
            ? 'inset 0 2px 4px rgba(255,255,255,0.03)'
            : `
              inset 0 3px 6px rgba(255,255,255,0.35),
              inset 0 -4px 8px rgba(0,0,0,0.25),
              0 0 60px rgba(212, 175, 55, 0.4)
            `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {spinning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Target size={24} color="#0a0a0c" />
            </motion.div>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 800,
                color: '#0a0a0c',
                letterSpacing: '0.05em',
              }}
            >
              ОТКРЫТИЕ...
            </span>
          </>
        ) : (
          <>
            <Crown size={24} color="#0a0a0c" />
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 800,
                color: '#0a0a0c',
                letterSpacing: '0.05em',
              }}
            >
              ИСПЫТАТЬ УДАЧУ
            </span>
          </>
        )}
      </div>

      {/* Top shine */}
      {!disabled && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 32,
            right: 32,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            borderRadius: 2,
          }}
        />
      )}
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESULT MODAL — ULTRA PREMIUM REDESIGN
// ═══════════════════════════════════════════════════════════════════════════

function ResultModal({
  result,
  onClose,
}: {
  result: RouletteResult
  onClose: () => void
}) {
  const isWin = result.type !== 'nothing'
  const tier = PRIZE_TIERS.find(t =>
    t.amount === result.value ||
    (result.type === 'bonus' && t.id === 'small') ||
    (result.type === 'jackpot' && t.id === 'jackpot')
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: isWin
          ? 'radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)'
          : 'radial-gradient(ellipse at 50% 30%, rgba(100, 100, 110, 0.1) 0%, rgba(0, 0, 0, 0.95) 70%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.7, y: 60, rotateX: 30 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 0.8, y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 32,
          background: isWin
            ? 'linear-gradient(180deg, rgba(40, 35, 25, 0.98) 0%, rgba(20, 18, 12, 0.99) 100%)'
            : 'linear-gradient(180deg, rgba(45, 45, 50, 0.98) 0%, rgba(25, 25, 28, 0.99) 100%)',
          border: isWin
            ? '2px solid rgba(212, 175, 55, 0.4)'
            : '1px solid rgba(120, 120, 130, 0.15)',
          boxShadow: isWin
            ? `
              0 0 100px rgba(212, 175, 55, 0.3),
              0 40px 80px rgba(0,0,0,0.7),
              inset 0 1px 0 rgba(255,255,255,0.1)
            `
            : `
              0 40px 80px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top glow bar */}
        <div style={{
          height: 4,
          background: isWin
            ? 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061, #d4af37, #8b6914)'
            : 'linear-gradient(90deg, #3a3a40, #5a5a65, #3a3a40)',
        }} />

        {/* Content */}
        <div style={{ padding: '36px 28px 32px' }}>
          {/* Icon */}
          <motion.div
            animate={isWin ? {
              rotate: [0, -8, 8, -4, 4, 0],
              scale: [1, 1.15, 1],
            } : {
              y: [0, -4, 0],
            }}
            transition={{
              duration: isWin ? 0.8 : 2,
              repeat: isWin ? 0 : Infinity,
              repeatType: 'reverse',
            }}
            style={{
              width: 100,
              height: 100,
              margin: '0 auto 28px',
              borderRadius: 28,
              background: isWin
                ? tier?.bgGradient || 'linear-gradient(135deg, #d4af37, #8b6914)'
                : 'linear-gradient(145deg, #35353a, #28282c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isWin
                ? `
                  0 0 60px ${tier?.glow || 'rgba(212, 175, 55, 0.5)'},
                  0 20px 40px rgba(0,0,0,0.4),
                  inset 0 2px 4px rgba(255,255,255,0.3),
                  inset 0 -4px 8px rgba(0,0,0,0.2)
                `
                : `
                  0 16px 32px rgba(0,0,0,0.4),
                  inset 0 1px 2px rgba(255,255,255,0.08),
                  inset 0 -2px 6px rgba(0,0,0,0.3)
                `,
              border: isWin
                ? '3px solid rgba(255,255,255,0.2)'
                : '2px solid rgba(80, 80, 90, 0.3)',
            }}
          >
            {isWin ? (
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={48} color="#fff" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <Lock size={48} color="#6a6a70" strokeWidth={1.5} />
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 32,
              fontWeight: 800,
              color: isWin ? '#f5d061' : '#8a8a90',
              marginBottom: 8,
              textAlign: 'center',
              letterSpacing: '0.05em',
              textShadow: isWin
                ? '0 2px 20px rgba(212, 175, 55, 0.4)'
                : 'none',
            }}
          >
            {isWin ? 'ПОБЕДА!' : 'НЕ ПОВЕЗЛО'}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: isWin ? 'var(--text-main)' : '#6a6a70',
              marginBottom: 28,
              textAlign: 'center',
              letterSpacing: '0.02em',
            }}
          >
            {isWin
              ? `+${result.value.toLocaleString('ru-RU')}₽ на баланс!`
              : 'Попробуй ещё раз!'}
          </motion.p>

          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: 16,
              background: isWin
                ? 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #9e7a1a 100%)'
                : 'linear-gradient(180deg, #4a4a52 0%, #38383f 50%, #2a2a30 100%)',
              border: isWin
                ? '2px solid rgba(255,255,255,0.2)'
                : '1px solid rgba(100, 100, 110, 0.2)',
              cursor: 'pointer',
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              fontWeight: 700,
              color: isWin ? '#0a0a0c' : '#a0a0a8',
              letterSpacing: '0.1em',
              boxShadow: isWin
                ? `
                  0 8px 24px rgba(212, 175, 55, 0.3),
                  inset 0 2px 4px rgba(255,255,255,0.3),
                  inset 0 -2px 4px rgba(0,0,0,0.15)
                `
                : `
                  0 6px 16px rgba(0,0,0,0.3),
                  inset 0 1px 2px rgba(255,255,255,0.06)
                `,
            }}
          >
            {isWin ? 'ЗАБРАТЬ' : 'ЗАКРЫТЬ'}
          </motion.button>
        </div>

        {/* Ambient particles for win */}
        {isWin && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -60, 0],
                  x: [0, Math.sin(i * 60) * 20, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                style={{
                  position: 'absolute',
                  bottom: 60 + i * 40,
                  left: 30 + i * 45,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#d4af37',
                  boxShadow: '0 0 12px rgba(212, 175, 55, 0.6)',
                }}
              />
            ))}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN ELITE CLUB PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { unlimitedRoulette } = useAdmin()
  const [spinning, setSpinning] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [highlightedTier, setHighlightedTier] = useState<string | null>(null)

  const confetti = useConfetti()

  // Animate through tiers during spin
  useEffect(() => {
    if (!spinning) return

    let index = 0
    const interval = setInterval(() => {
      setHighlightedTier(PRIZE_TIERS[index % PRIZE_TIERS.length].id)
      index++
    }, 150)

    return () => {
      clearInterval(interval)
      setHighlightedTier(null)
    }
  }, [spinning])

  const handleSpin = async () => {
    if (spinning) return

    haptic('heavy')
    setSpinning(true)
    setIsOpen(false)
    setResult(null)

    // Dramatic spin duration
    const spinDuration = 4000 + Math.random() * 2000

    setTimeout(async () => {
      try {
        const spinResult = await spinRoulette()
        setResult(spinResult)
        setIsOpen(true)

        // Delay showing modal for vault animation
        setTimeout(() => {
          setShowResultModal(true)
          if (spinResult.type !== 'nothing') {
            hapticSuccess()
            confetti.fire()
          } else {
            hapticError()
          }
        }, 800)
      } catch {
        hapticError()
        setResult({ prize: 'Ошибка', type: 'nothing', value: 0 })
        setShowResultModal(true)
      } finally {
        setSpinning(false)
        setHighlightedTier(null)
      }
    }, spinDuration)
  }

  return (
    <div
      className="app-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
        paddingBottom: 120,
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Crown size={28} color="#d4af37" />
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 28,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ЭЛИТНЫЙ КЛУБ
          </h1>
          <Crown size={28} color="#d4af37" />
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
          }}
        >
          ЭКСКЛЮЗИВНЫЕ ПРИЗЫ • КРУТИТЬ БЕЗ ЛИМИТА
        </p>
      </motion.header>

      {/* Elite Vault */}
      <EliteVault
        isOpening={spinning}
        isOpen={isOpen}
        result={result}
      />

      {/* Spin Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <SpinButton
          onClick={handleSpin}
          disabled={spinning}
          spinning={spinning}
        />
      </div>

      {/* Prize Tiers */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Diamond size={16} color="#d4af37" />
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              fontWeight: 700,
              color: '#d4af37',
              letterSpacing: '0.1em',
            }}
          >
            ПРИЗОВОЙ ФОНД
          </span>
          <Diamond size={16} color="#d4af37" />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {PRIZE_TIERS.map((tier, i) => (
            <PrizeCard
              key={tier.id}
              tier={tier}
              delay={0.1 + i * 0.05}
              isHighlighted={highlightedTier === tier.id}
            />
          ))}
        </div>
      </div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          padding: '20px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Zap size={14} color="var(--gold-400)" />
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 12,
              color: 'var(--gold-400)',
              letterSpacing: '0.1em',
            }}
          >
            ПРАВИЛА КЛУБА
          </span>
        </div>
        <ul
          style={{
            listStyle: 'none',
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {[
            'Без лимита — крути сколько хочешь',
            'Призы зачисляются мгновенно',
            'Чем крупнее приз — тем ниже шанс',
            'Джекпот для избранных 💎',
          ].map((rule, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#d4af37',
                  boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)',
                  flexShrink: 0,
                }}
              />
              {rule}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Confetti */}
      <Confetti
        active={confetti.isActive}
        onComplete={confetti.reset}
        intensity="extreme"
      />

      {/* Result Modal */}
      <AnimatePresence>
        {showResultModal && result && (
          <ResultModal
            result={result}
            onClose={() => setShowResultModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
