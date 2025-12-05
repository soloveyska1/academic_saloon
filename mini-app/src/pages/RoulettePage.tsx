import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, GraduationCap, BookOpen, FileText, Lightbulb,
  Gift, Zap, Lock, ChevronRight, Clock, X,
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
import { LiveWinnersTicker } from '../components/LiveWinnersTicker'
import { PrizeTicker, PrizeTier } from '../components/PrizeTicker'
import React from 'react'
import '../styles/Roulette.css'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  LEGACY EDITION — Sales Inception Prize System
//  Services as prizes, not money. Psychology-driven near-miss mechanics.
// ═══════════════════════════════════════════════════════════════════════════

const PRIZE_TIERS: PrizeTier[] = [
  {
    id: 'diploma',
    name: 'DIPLOMA LIBERTY',
    desc: 'Диплом "Под Ключ" | 100% Free',
    val: '∞',
    chance: '0.001%',
    icon: Crown,
  },
  {
    id: 'coursework',
    name: 'ACADEMIC RELIEF',
    desc: 'Курсовая работа | Полный пакет',
    val: '5 000₽',
    chance: '0.05%',
    icon: GraduationCap,
  },
  {
    id: 'essay',
    name: 'THESIS START',
    desc: 'Эссе или реферат | До 15 страниц',
    val: '2 500₽',
    chance: '0.5%',
    icon: BookOpen,
  },
  {
    id: 'strategy',
    name: 'STRATEGY PACK',
    desc: 'Консультация + план работы',
    val: '1 500₽',
    chance: '2%',
    icon: Lightbulb,
  },
  {
    id: 'discount500',
    name: 'SMART START -500₽',
    desc: 'Скидка на любой заказ',
    val: '500₽',
    chance: '15%',
    icon: FileText,
  },
  {
    id: 'discount200',
    name: 'LITE BONUS -200₽',
    desc: 'Скидка на первый заказ',
    val: '200₽',
    chance: '30%',
    icon: Gift,
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  GOD RAYS EFFECT — Premium Atmosphere
// ═══════════════════════════════════════════════════════════════════════════

const GodRays = React.memo(() => (
  <div className="god-rays" />
))

GodRays.displayName = 'GodRays'

// ═══════════════════════════════════════════════════════════════════════════
//  GLITCH TEXT HEADER — Cyberpunk Distortion Effect
// ═══════════════════════════════════════════════════════════════════════════

const GlitchHeader = React.memo(({ active }: { active: boolean }) => (
  <h1
    className={`glitch-text ${active ? 'active' : ''}`}
    data-text="ЭЛИТНЫЙ КЛУБ"
    style={{
      fontFamily: 'var(--font-serif)',
      fontSize: 28,
      fontWeight: 800,
      background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
    }}
  >
    ЭЛИТНЫЙ КЛУБ
  </h1>
))

GlitchHeader.displayName = 'GlitchHeader'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SPIN BUTTON — Zero-Latency Touch with Scanner Line
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
        overflow: 'hidden',
      }}>
        {/* Scanner line on button */}
        {spinning && <div className="scanner-line" />}

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
              ВЗЛОМ...
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
              ВЗЛОМАТЬ СИСТЕМУ
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
//  SALES MODAL — Urgency Timer & Psychological Pressure
// ═══════════════════════════════════════════════════════════════════════════

interface SalesModalProps {
  result: RouletteResult
  prize: PrizeTier | null
  onClose: () => void
  onClaim: () => void
}

const SalesModal = React.memo(({ result, prize, onClose, onClaim }: SalesModalProps) => {
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const { isDark } = useTheme()
  const { ref: claimRef, handlers: claimHandlers } = usePremiumGesture({
    onTap: onClaim,
    scale: 0.97,
    hapticType: 'heavy',
  })
  const { ref: closeRef, handlers: closeHandlers } = usePremiumGesture({
    onTap: onClose,
    scale: 0.97,
    hapticType: 'light',
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isWin = result.type !== 'nothing'
  const Icon = prize?.icon || Gift

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
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
        initial={{ scale: 0.8, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{
          width: '100%',
          maxWidth: 360,
          borderRadius: 24,
          background: isDark ? '#0f0f12' : '#faf9f6',
          border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(120, 85, 40, 0.2)'}`,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          {...closeHandlers}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <X size={16} color={isDark ? '#666' : '#999'} />
        </button>

        {/* Top Gold Bar */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061, #d4af37, #8b6914)',
        }} />

        {/* Urgency Timer */}
        <div style={{
          padding: '16px 20px',
          background: isDark ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)',
          borderBottom: `1px solid ${isDark ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.1)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}>
          <Clock size={16} color="#ff4444" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 700,
            color: '#ff4444',
            letterSpacing: '0.1em',
          }}>
            РЕЗЕРВ ИСТЕКАЕТ: {formatTime(timeLeft)}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          {/* Prize Icon */}
          <motion.div
            animate={{
              rotate: isWin ? [0, -5, 5, -3, 3, 0] : 0,
              scale: isWin ? [1, 1.1, 1] : 1,
            }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              width: 90,
              height: 90,
              margin: '0 auto 24px',
              borderRadius: 22,
              background: isWin
                ? 'linear-gradient(135deg, #d4af37, #8b6914)'
                : isDark ? '#1a1a1e' : '#e5e2dc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isWin
                ? '0 0 60px rgba(212, 175, 55, 0.4), 0 20px 40px rgba(0,0,0,0.3)'
                : '0 16px 32px rgba(0,0,0,0.2)',
              border: isWin
                ? '3px solid rgba(255,255,255,0.2)'
                : `2px solid ${isDark ? 'rgba(80, 80, 90, 0.3)' : 'rgba(120, 85, 40, 0.1)'}`,
            }}
          >
            <Icon size={42} color={isWin ? '#fff' : (isDark ? '#666' : '#999')} strokeWidth={1.5} />
          </motion.div>

          {/* Title */}
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 800,
            color: isWin ? '#D4AF37' : (isDark ? '#666' : '#999'),
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}>
            {isWin ? 'ВЗЛОМ УСПЕШЕН!' : 'СИСТЕМА УСТОЯЛА'}
          </h2>

          {/* Prize Details */}
          {isWin && prize && (
            <div style={{
              textAlign: 'center',
              marginBottom: 24,
            }}>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                fontWeight: 700,
                color: isDark ? '#fff' : '#1a1a1a',
                marginBottom: 4,
              }}>
                {prize.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: isDark ? '#888' : '#666',
              }}>
                {prize.desc}
              </div>
            </div>
          )}

          {/* Subtitle */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: isDark ? '#888' : '#666',
            marginBottom: 24,
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            {isWin
              ? 'Актив зарезервирован. Нажми "АКТИВИРОВАТЬ" чтобы перейти к оформлению заказа со скидкой.'
              : 'Попробуй ещё раз — система уязвима!'}
          </p>

          {/* CTA Button */}
          <button
            ref={claimRef}
            {...claimHandlers}
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: 14,
              background: isWin
                ? 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)'
                : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: isWin
                ? '2px solid #6b4f0f'
                : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              cursor: 'pointer',
              fontFamily: 'var(--font-serif)',
              fontSize: 16,
              fontWeight: 700,
              color: isWin ? '#0a0a0c' : (isDark ? '#888' : '#666'),
              letterSpacing: '0.1em',
              boxShadow: isWin
                ? '0 0 40px rgba(212, 175, 55, 0.3), inset 0 2px 4px rgba(255,255,255,0.3)'
                : 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {isWin ? (
              <>
                АКТИВИРОВАТЬ
                <ChevronRight size={18} />
              </>
            ) : (
              'ПОПРОБОВАТЬ СНОВА'
            )}
          </button>

          {/* Security notice */}
          <div style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: isDark ? '#444' : '#aaa',
            letterSpacing: '0.1em',
          }}>
            🔒 ЗАШИФРОВАННОЕ СОЕДИНЕНИЕ
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})

SalesModal.displayName = 'SalesModal'

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN ELITE CLUB PAGE — Sales Inception Algorithm
//  Psychology-driven mechanics with glitch triggers & near-miss effects
// ═══════════════════════════════════════════════════════════════════════════

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { unlimitedRoulette } = useAdmin()
  const { isDark } = useTheme()
  const sound = useSound()

  const [spinning, setSpinning] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [glitchActive, setGlitchActive] = useState(false)
  const [wonPrize, setWonPrize] = useState<PrizeTier | null>(null)

  const confetti = useConfetti()
  const spinTimeoutRef = useRef<NodeJS.Timeout>()

  // Get user photo URL from Telegram
  const userPhotoUrl = user?.telegram_photo_url || undefined

  // ═══════════════════════════════════════════════════════════════════════════
  //  SALES INCEPTION ALGORITHM — Psychology-Driven Animation
  //  1. Start fast, build excitement
  //  2. Pass expensive items slowly (near-miss)
  //  3. Trigger glitch effect on premium items
  //  4. Land on predetermined result with dramatic pause
  // ═══════════════════════════════════════════════════════════════════════════

  const runSalesInceptionAnimation = useCallback(async (finalResult: RouletteResult) => {
    // Map result value to prize tier
    let targetPrize = PRIZE_TIERS[PRIZE_TIERS.length - 1] // Default to smallest

    if (finalResult.type !== 'nothing' && finalResult.value > 0) {
      // Find matching prize by value
      const matchedPrize = PRIZE_TIERS.find(t => {
        const numVal = parseInt(t.val.replace(/[^0-9]/g, ''))
        return numVal === finalResult.value || t.val === '∞'
      })
      if (matchedPrize) targetPrize = matchedPrize
    }

    setWonPrize(targetPrize)
    const targetIndex = PRIZE_TIERS.findIndex(t => t.id === targetPrize.id)

    // Animation parameters
    const totalDuration = 5000 // 5 seconds total
    const tickCount = 25 + Math.floor(Math.random() * 10)
    let elapsed = 0

    sound.play('spin_start')

    for (let i = 0; i < tickCount; i++) {
      const progress = i / tickCount

      // Easing: fast start, slow end (cubic ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      // Calculate delay: starts at 80ms, ends at 400ms
      const delay = 80 + easedProgress * 320

      await new Promise(resolve => setTimeout(resolve, delay))
      elapsed += delay

      // Calculate current tier based on progress
      // Near the end, oscillate around target
      let currentIndex: number

      if (progress < 0.7) {
        // Fast scanning phase - cycle through all
        currentIndex = i % PRIZE_TIERS.length
      } else {
        // Settling phase - home in on target with occasional overshoot
        const settlingProgress = (progress - 0.7) / 0.3
        const overshoot = Math.floor((1 - settlingProgress) * 2)
        currentIndex = Math.max(0, Math.min(PRIZE_TIERS.length - 1, targetIndex + overshoot))
      }

      const currentTier = PRIZE_TIERS[currentIndex]
      setHighlightedId(currentTier.id)
      sound.play('tick')
      haptic('light')

      // GLITCH TRIGGER: When passing expensive items late in animation
      if (progress > 0.6 && (currentTier.id === 'diploma' || currentTier.id === 'coursework')) {
        setGlitchActive(true)
        haptic('heavy')
        setTimeout(() => setGlitchActive(false), 200)
      }
    }

    // Final dramatic pause
    await new Promise(resolve => setTimeout(resolve, 300))

    // Land on target
    setHighlightedId(targetPrize.id)
    sound.play('latch')
    haptic('heavy')

    return targetPrize
  }, [sound, haptic])

  const handleSpin = async () => {
    if (spinning) return

    // Initial haptic and sound
    haptic('heavy')
    sound.play('click')

    setSpinning(true)
    setIsOpen(false)
    setResult(null)
    setGlitchActive(false)
    setHighlightedId(PRIZE_TIERS[0].id) // Start from most expensive

    try {
      // Start the spin API call
      const spinPromise = spinRoulette()

      // Get result from API
      const spinResult = await spinPromise
      setResult(spinResult)

      // Run the Sales Inception animation
      const prize = await runSalesInceptionAnimation(spinResult)

      // Short pause for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 500))

      // Open vault
      setIsOpen(true)
      sound.play('open')

      // Show sales modal after vault opens
      spinTimeoutRef.current = setTimeout(() => {
        setShowSalesModal(true)

        if (spinResult.type !== 'nothing') {
          hapticSuccess()
          if (prize.id === 'diploma' || prize.id === 'coursework') {
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
      setShowSalesModal(true)
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

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowSalesModal(false)
    setHighlightedId(null)
    setIsOpen(false)
  }, [])

  // Handle claim action (redirect to order)
  const handleClaim = useCallback(() => {
    // TODO: Redirect to order page with prize
    handleCloseModal()
  }, [handleCloseModal])

  return (
    <div
      className="app-content roulette-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
        paddingBottom: 120,
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* God Rays Background Effect */}
      <GodRays />

      {/* Live Winners Ticker — Social Proof */}
      <LiveWinnersTicker />

      {/* Header with Glitch Effect */}
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
          <Crown size={28} color="#D4AF37" />
          <GlitchHeader active={glitchActive} />
          <Crown size={28} color="#D4AF37" />
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: isDark ? '#666' : '#999',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          LEGACY EDITION • ВЗЛОМАЙ СИСТЕМУ
        </p>
      </motion.header>

      {/* Premium Vault Lock with User Photo */}
      <VaultLock
        isSpinning={spinning}
        isOpen={isOpen}
        resultValue={wonPrize?.val}
        userPhotoUrl={userPhotoUrl}
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

      {/* Prize Ticker — Asset List with Scanning Animation */}
      <PrizeTicker
        tiers={PRIZE_TIERS}
        highlightedId={highlightedId}
      />

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          margin: '0 20px',
          padding: '20px 24px',
          background: isDark ? 'rgba(20, 20, 23, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(120, 85, 40, 0.1)'}`,
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}>
          <Zap size={14} color="#D4AF37" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#D4AF37',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            ПРОТОКОЛ ВЗЛОМА
          </span>
        </div>
        <ul style={{
          listStyle: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: isDark ? '#666' : '#888',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          margin: 0,
          padding: 0,
        }}>
          {[
            'Без лимита попыток — система уязвима',
            'Активы резервируются на 3 минуты',
            'Чем выше уровень — тем сложнее взлом',
            'Диплом "Под Ключ" для избранных хакеров',
          ].map((rule, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#D4AF37',
                boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)',
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

      {/* Sales Modal */}
      <AnimatePresence>
        {showSalesModal && result && (
          <SalesModal
            result={result}
            prize={wonPrize}
            onClose={handleCloseModal}
            onClaim={handleClaim}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
