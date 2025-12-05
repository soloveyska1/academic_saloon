import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import {
  Crown, Sparkles, Diamond, Star, Trophy,
  Gem, Zap, Gift, Lock, ChevronRight,
} from 'lucide-react'
import { UserData, RouletteResult } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useSound } from '../hooks/useSound'
import { spinRoulette } from '../api/userApi'
import { useAdmin } from '../contexts/AdminContext'
import { Confetti, useConfetti } from '../components/ui/Confetti'
import { VaultLock } from '../components/VaultLock'
import { useTheme } from '../contexts/ThemeContext'
import { usePremiumGesture } from '../hooks/usePremiumGesture'
import React from 'react'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELITE CLUB PRIZE TIERS — Psychology-Driven Design
//  Near-miss effect: Users see they "almost" won jackpot
// ═══════════════════════════════════════════════════════════════════════════

const PRIZE_TIERS = [
  {
    id: 'jackpot',
    name: 'ДЖЕКПОТ',
    amount: 50000,
    icon: Crown,
    color: '#ffd700',
    bgGradient: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    chance: '0.00001%',
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
//  PRIZE TICKER — Scanning Animation with Near-Miss Psychology
//  Shows "almost winning" jackpot before landing on actual prize
// ═══════════════════════════════════════════════════════════════════════════

function PrizeTicker({
  isActive,
  highlightedIndex,
  isDark,
}: {
  isActive: boolean
  highlightedIndex: number | null
  isDark: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      marginBottom: 24,
    }}>
      {PRIZE_TIERS.map((tier, index) => {
        const Icon = tier.icon
        const isHighlighted = highlightedIndex === index
        const isPassed = highlightedIndex !== null && index < highlightedIndex

        return (
          <motion.div
            key={tier.id}
            animate={{
              scale: isHighlighted ? 1.03 : 1,
              opacity: isPassed ? 0.4 : 1,
            }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'relative',
              padding: '14px 16px',
              borderRadius: 14,
              background: isHighlighted
                ? tier.bgGradient
                : isDark
                  ? 'var(--bg-card)'
                  : 'rgba(255, 255, 255, 0.9)',
              border: isHighlighted
                ? `2px solid ${tier.color}`
                : `1px solid ${isDark ? 'var(--border-default)' : 'rgba(120, 85, 40, 0.1)'}`,
              boxShadow: isHighlighted
                ? `0 0 30px ${tier.glow}, 0 8px 24px rgba(0,0,0,0.3)`
                : isDark
                  ? 'var(--card-shadow)'
                  : '0 2px 8px rgba(120, 85, 40, 0.08)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Scanning line effect */}
            {isHighlighted && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transform: 'skewX(-20deg)',
                }}
              />
            )}

            {/* Icon */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isHighlighted
                ? 'rgba(0,0,0,0.2)'
                : isDark
                  ? `${tier.color}15`
                  : `${tier.color}12`,
              border: `1px solid ${tier.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon
                size={22}
                color={isHighlighted ? '#fff' : tier.color}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: isHighlighted ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                letterSpacing: '0.1em',
                marginBottom: 2,
              }}>
                {tier.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 800,
                color: isHighlighted ? '#fff' : tier.color,
              }}>
                {tier.amount.toLocaleString('ru-RU')}₽
              </div>
            </div>

            {/* Chance badge */}
            <div style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: isDark ? 'var(--bg-glass)' : 'rgba(120, 85, 40, 0.06)',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: isHighlighted ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
              fontWeight: 600,
            }}>
              {tier.chance}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SPIN BUTTON — Zero-Latency Touch
// ═══════════════════════════════════════════════════════════════════════════

const SpinButton = React.memo(({
  onClick,
  disabled,
  spinning,
  isDark,
}: {
  onClick: () => void
  disabled: boolean
  spinning: boolean
  isDark: boolean
}) => {
  const { ref, handlers } = usePremiumGesture({
    onTap: onClick,
    scale: 0.96,
    hapticType: 'heavy',
    tolerance: 20,
    pressDelay: 30,
  })

  const btn = {
    shadowBg: isDark
      ? 'linear-gradient(180deg, #5a4010, #2a1f08)'
      : 'linear-gradient(180deg, rgba(120, 85, 40, 0.3), rgba(120, 85, 40, 0.15))',
    disabledBg: isDark
      ? 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 100%)'
      : 'linear-gradient(180deg, #e5e2dc 0%, #d9d6d0 100%)',
    disabledBorder: isDark
      ? '2px solid rgba(255,255,255,0.06)'
      : '2px solid rgba(120, 85, 40, 0.1)',
    activeBg: 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)',
    activeBorder: '3px solid #6b4f0f',
    activeShadow: isDark
      ? 'inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.25), 0 0 60px rgba(212, 175, 55, 0.4)'
      : 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.15), 0 0 40px rgba(180, 142, 38, 0.3)',
    textColor: '#0a0a0c',
  }

  return (
    <button
      ref={ref}
      {...handlers}
      disabled={disabled}
      className="premium-spin-button"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 300,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Button shadow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        top: 6,
        borderRadius: 20,
        background: btn.shadowBg,
        filter: 'blur(2px)',
      }} />

      {/* Main button */}
      <div style={{
        position: 'relative',
        padding: '20px 32px',
        borderRadius: 18,
        background: disabled ? btn.disabledBg : btn.activeBg,
        border: disabled ? btn.disabledBorder : btn.activeBorder,
        boxShadow: disabled
          ? 'inset 0 2px 4px rgba(255,255,255,0.03)'
          : btn.activeShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        opacity: disabled ? 0.4 : 1,
      }}>
        {spinning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Lock size={24} color={btn.textColor} />
            </motion.div>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 800,
              color: btn.textColor,
              letterSpacing: '0.05em',
            }}>
              ОТКРЫВАЮ...
            </span>
          </>
        ) : (
          <>
            <Crown size={24} color={btn.textColor} />
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 800,
              color: btn.textColor,
              letterSpacing: '0.05em',
            }}>
              ИСПЫТАТЬ УДАЧУ
            </span>
          </>
        )}
      </div>

      {/* Top shine */}
      {!disabled && (
        <div style={{
          position: 'absolute',
          top: 2,
          left: 32,
          right: 32,
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          borderRadius: 2,
        }} />
      )}
    </button>
  )
})

SpinButton.displayName = 'SpinButton'

// ═══════════════════════════════════════════════════════════════════════════
//  RESULT MODAL — Premium Victory/Loss Animation
// ═══════════════════════════════════════════════════════════════════════════

function ResultModal({
  result,
  onClose,
  isJackpot,
}: {
  result: RouletteResult
  onClose: () => void
  isJackpot: boolean
}) {
  const isWin = result.type !== 'nothing'
  const tier = PRIZE_TIERS.find(t => t.amount === result.value)
  const { ref, handlers } = usePremiumGesture({
    onTap: onClose,
    scale: 0.97,
    hapticType: 'medium',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg)',
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
          background: isWin ? 'var(--modal-bg)' : 'var(--bg-card-solid)',
          border: isWin
            ? '2px solid var(--border-gold-strong)'
            : '1px solid var(--border-default)',
          boxShadow: 'var(--modal-shadow)',
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
                ? `0 0 60px ${tier?.glow || 'rgba(212, 175, 55, 0.5)'}, 0 20px 40px rgba(0,0,0,0.4)`
                : '0 16px 32px rgba(0,0,0,0.4)',
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
              fontFamily: 'var(--font-serif)',
              fontSize: isJackpot ? 36 : 32,
              fontWeight: 800,
              color: isWin ? 'var(--gold-300)' : 'var(--text-muted)',
              marginBottom: 8,
              textAlign: 'center',
              letterSpacing: '0.05em',
              textShadow: isWin
                ? '0 2px 20px rgba(212, 175, 55, 0.4)'
                : 'none',
            }}
          >
            {isJackpot ? 'ДЖЕКПОТ!' : isWin ? 'ПОБЕДА!' : 'НЕ ПОВЕЗЛО'}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              color: isWin ? 'var(--text-main)' : 'var(--text-muted)',
              marginBottom: 28,
              textAlign: 'center',
            }}
          >
            {isWin
              ? `+${result.value.toLocaleString('ru-RU')}₽ на баланс!`
              : 'Попробуй ещё раз!'}
          </motion.p>

          {/* Close Button */}
          <button
            ref={ref}
            {...handlers}
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: 16,
              background: isWin ? 'var(--liquid-gold)' : 'var(--bg-glass)',
              border: isWin
                ? '2px solid rgba(255,255,255,0.2)'
                : '1px solid var(--border-default)',
              cursor: 'pointer',
              fontFamily: 'var(--font-serif)',
              fontSize: 16,
              fontWeight: 700,
              color: isWin ? '#0a0a0c' : 'var(--text-secondary)',
              letterSpacing: '0.1em',
              boxShadow: isWin ? 'var(--glow-gold-strong)' : 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isWin ? 'ЗАБРАТЬ' : 'ЗАКРЫТЬ'}
          </button>
        </div>

        {/* Floating particles for win */}
        {isWin && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -60, 0],
                  x: [0, Math.sin(i * 60) * 20, 0],
                  opacity: [0.3, 0.8, 0.3],
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
//  MAIN ELITE CLUB PAGE — Psychology-Driven Premium UX
// ═══════════════════════════════════════════════════════════════════════════

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { unlimitedRoulette } = useAdmin()
  const { isDark } = useTheme()
  const sound = useSound()

  const [spinning, setSpinning] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [isJackpot, setIsJackpot] = useState(false)

  const confetti = useConfetti()
  const spinTimeoutRef = useRef<NodeJS.Timeout>()

  // Theme-aware gold color
  const goldColor = isDark ? '#d4af37' : '#9e7a1a'

  // Near-miss animation: scan through prizes, always pass jackpot
  const runNearMissAnimation = useCallback(async (finalResult: RouletteResult) => {
    // Find final tier index based on result value
    let finalIndex = PRIZE_TIERS.length - 1 // Default to smallest
    if (finalResult.value > 0) {
      const tierIndex = PRIZE_TIERS.findIndex(t => t.amount === finalResult.value)
      if (tierIndex !== -1) finalIndex = tierIndex
    }

    // Psychology: Always start from jackpot (index 0) and scan down
    // This creates "near-miss" effect where user sees they almost won jackpot
    let currentIndex = 0
    const baseDelay = 150 // Starting speed
    const totalSteps = finalIndex + Math.floor(Math.random() * 3) + 6 // Add extra passes

    for (let step = 0; step < totalSteps; step++) {
      // Progressive slowdown as we approach final
      const slowdownFactor = Math.pow(step / totalSteps, 1.5)
      const delay = baseDelay + slowdownFactor * 400

      await new Promise(resolve => setTimeout(resolve, delay))

      // Oscillate through prizes with decreasing amplitude
      if (step < totalSteps - 5) {
        // Fast scanning phase
        currentIndex = step % PRIZE_TIERS.length
      } else {
        // Settling phase - home in on final
        const stepsRemaining = totalSteps - step
        currentIndex = Math.max(0, Math.min(PRIZE_TIERS.length - 1,
          finalIndex - stepsRemaining + Math.floor(Math.random() * 2)
        ))
      }

      setHighlightedIndex(currentIndex)
      sound.play('tick')
    }

    // Final landing
    setHighlightedIndex(finalIndex)
    sound.play('latch')

    return finalIndex
  }, [sound])

  const handleSpin = async () => {
    if (spinning) return

    // Initial haptic and sound
    haptic('heavy')
    sound.play('click')

    setSpinning(true)
    setIsOpen(false)
    setResult(null)
    setIsJackpot(false)
    setHighlightedIndex(0) // Start from jackpot

    try {
      // Start the spin API call
      const spinPromise = spinRoulette()

      // Run near-miss animation (takes ~4-6 seconds)
      // First, we need the result to know where to land
      const spinResult = await spinPromise
      setResult(spinResult)

      // Check for jackpot
      const isJackpotWin = spinResult.type === 'jackpot' || spinResult.value >= 50000
      setIsJackpot(isJackpotWin)

      // Run the scanning animation
      await runNearMissAnimation(spinResult)

      // Short pause for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 300))

      // Open vault
      setIsOpen(true)
      sound.play('open')

      // Show result modal after vault opens
      spinTimeoutRef.current = setTimeout(() => {
        setShowResultModal(true)

        if (spinResult.type !== 'nothing') {
          hapticSuccess()
          if (isJackpotWin) {
            sound.play('jackpot')
            confetti.fire()
          } else {
            sound.play('win')
            confetti.fire()
          }
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
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
    }
  }, [])

  // Reset highlighted index when modal closes
  const handleCloseModal = useCallback(() => {
    setShowResultModal(false)
    setHighlightedIndex(null)
    setIsOpen(false)
  }, [])

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 8,
        }}>
          <Crown size={28} color={goldColor} />
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 800,
            background: isDark
              ? 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)'
              : 'linear-gradient(135deg, #5c4510, #9e7a1a, #c9a02f)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ЭЛИТНЫЙ КЛУБ
          </h1>
          <Crown size={28} color={goldColor} />
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.15em',
        }}>
          ЭКСКЛЮЗИВНЫЕ ПРИЗЫ • КРУТИТЬ БЕЗ ЛИМИТА
        </p>
      </motion.header>

      {/* Premium Vault Lock */}
      <VaultLock
        isSpinning={spinning}
        isOpen={isOpen}
        prizeValue={result?.value}
        isJackpot={isJackpot}
      />

      {/* Spin Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <SpinButton
          onClick={handleSpin}
          disabled={spinning}
          spinning={spinning}
          isDark={isDark}
        />
      </div>

      {/* Prize Ticker with Near-Miss Animation */}
      <PrizeTicker
        isActive={spinning}
        highlightedIndex={highlightedIndex}
        isDark={isDark}
      />

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}>
          <Zap size={14} color="var(--gold-400)" />
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 12,
            color: 'var(--gold-400)',
            letterSpacing: '0.1em',
          }}>
            ПРАВИЛА КЛУБА
          </span>
        </div>
        <ul style={{
          listStyle: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          margin: 0,
          padding: 0,
        }}>
          {[
            'Без лимита — крути сколько хочешь',
            'Призы зачисляются мгновенно',
            'Чем крупнее приз — тем ниже шанс',
            'Джекпот для избранных',
          ].map((rule, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: goldColor,
                boxShadow: isDark
                  ? '0 0 8px rgba(212, 175, 55, 0.4)'
                  : '0 0 8px rgba(180, 142, 38, 0.35)',
                flexShrink: 0,
              }} />
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
            onClose={handleCloseModal}
            isJackpot={isJackpot}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
