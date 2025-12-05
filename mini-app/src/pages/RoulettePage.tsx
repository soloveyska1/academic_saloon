import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, GraduationCap, BookOpen, FileText, Lightbulb,
  Gift, Lock, ChevronRight, Clock, X, Zap, AlertTriangle,
} from 'lucide-react'
import { UserData, RouletteResult } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { useSound } from '../hooks/useSound'
import { spinRoulette } from '../api/userApi'
import { useAdmin } from '../contexts/AdminContext'
import { Confetti, useConfetti } from '../components/ui/Confetti'
import { VaultLock } from '../components/VaultLock'
import { usePremiumGesture } from '../hooks/usePremiumGesture'
import { LiveWinnersTicker } from '../components/LiveWinnersTicker'
import { PrizeTicker, Asset } from '../components/PrizeTicker'
import '../styles/Roulette.css'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  HACKER LUXURY — FORCED DARK 100DVH NO-SCROLL LAYOUT
//  Russian only. NO PROBABILITIES — rarity badges instead.
//  "ВЗЛОМАТЬ" / "АКТИВ" / "ХАКЕР" terminology
// ═══════════════════════════════════════════════════════════════════════════

// Asset definitions with rarity badges (NO PROBABILITIES!)
const ASSETS: Asset[] = [
  {
    id: 'diploma',
    name: 'ДИПЛОМ ПОД КЛЮЧ',
    value: '∞',
    rarity: 'mythic',
    icon: Crown,
  },
  {
    id: 'coursework',
    name: 'КУРСОВАЯ РАБОТА',
    value: '5 000₽',
    rarity: 'legendary',
    icon: GraduationCap,
  },
  {
    id: 'essay',
    name: 'ЭССЕ / РЕФЕРАТ',
    value: '2 500₽',
    rarity: 'epic',
    icon: BookOpen,
  },
  {
    id: 'strategy',
    name: 'КОНСУЛЬТАЦИЯ',
    value: '1 500₽',
    rarity: 'rare',
    icon: Lightbulb,
  },
  {
    id: 'discount500',
    name: 'СКИДКА -500₽',
    value: '500₽',
    rarity: 'common',
    icon: FileText,
  },
  {
    id: 'discount200',
    name: 'СКИДКА -200₽',
    value: '200₽',
    rarity: 'common',
    icon: Gift,
  },
]

// ═══════════════════════════════════════════════════════════════════════════
//  GOD RAYS — Premium Atmospheric Background
// ═══════════════════════════════════════════════════════════════════════════

const GodRays = memo(() => <div className="god-rays" />)
GodRays.displayName = 'GodRays'

// ═══════════════════════════════════════════════════════════════════════════
//  CRT SCANLINES — Retro Hacker Effect
// ═══════════════════════════════════════════════════════════════════════════

const CRTScanlines = memo(() => <div className="crt-scanlines" />)
CRTScanlines.displayName = 'CRTScanlines'

// ═══════════════════════════════════════════════════════════════════════════
//  GLITCH TEXT — Cyberpunk Header
// ═══════════════════════════════════════════════════════════════════════════

const GlitchHeader = memo(({ active }: { active: boolean }) => (
  <h1
    className={`glitch-text ${active ? 'active' : ''}`}
    data-text="ЭЛИТНЫЙ ДОСТУП"
    style={{
      fontFamily: 'var(--font-elite, Georgia, serif)',
      fontSize: 22,
      fontWeight: 800,
      background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
      letterSpacing: '0.08em',
    }}
  >
    ЭЛИТНЫЙ ДОСТУП
  </h1>
))
GlitchHeader.displayName = 'GlitchHeader'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SPIN BUTTON — Zero-Latency Touch "ВЗЛОМАТЬ СИСТЕМУ"
// ═══════════════════════════════════════════════════════════════════════════

const SpinButton = memo(({
  onClick,
  disabled,
  spinning,
}: {
  onClick: () => void
  disabled: boolean
  spinning: boolean
}) => {
  const { ref, handlers } = usePremiumGesture({
    onTap: onClick,
    scale: 0.96,
    hapticType: 'heavy',
    tolerance: 20,
    pressDelay: 30,
  })

  return (
    <button
      ref={ref}
      {...handlers}
      disabled={disabled}
      className={`premium-spin-button ${spinning ? 'pulse-gold' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 280,
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
        borderRadius: 16,
        background: 'linear-gradient(180deg, #5a4010, #2a1f08)',
        filter: 'blur(2px)',
      }} />

      {/* Main button */}
      <div style={{
        position: 'relative',
        padding: '16px 28px',
        borderRadius: 14,
        background: disabled
          ? 'linear-gradient(180deg, #3a3a40 0%, #2a2a2e 100%)'
          : 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)',
        border: disabled
          ? '2px solid rgba(255,255,255,0.06)'
          : '3px solid #6b4f0f',
        boxShadow: disabled
          ? 'inset 0 2px 4px rgba(255,255,255,0.03)'
          : 'inset 0 3px 6px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.25), 0 0 60px rgba(212, 175, 55, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
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
              <Lock size={22} color="#0a0a0c" />
            </motion.div>
            <span style={{
              fontFamily: 'var(--font-elite, Georgia, serif)',
              fontSize: 16,
              fontWeight: 800,
              color: '#0a0a0c',
              letterSpacing: '0.08em',
            }}>
              ВЗЛОМ...
            </span>
          </>
        ) : (
          <>
            <Zap size={22} color="#0a0a0c" />
            <span style={{
              fontFamily: 'var(--font-elite, Georgia, serif)',
              fontSize: 16,
              fontWeight: 800,
              color: '#0a0a0c',
              letterSpacing: '0.08em',
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
          left: 28,
          right: 28,
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
//  SALES MODAL — "СИСТЕМА УЯЗВИМА" with RED urgency timer
// ═══════════════════════════════════════════════════════════════════════════

interface SalesModalProps {
  result: RouletteResult
  asset: Asset | null
  onClose: () => void
  onClaim: () => void
}

const SalesModal = memo(({ result, asset, onClose, onClaim }: SalesModalProps) => {
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const sound = useSound()
  const alarmPlayed = useRef(false)

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
        // Play alarm at 30 seconds
        if (prev === 31 && !alarmPlayed.current) {
          sound.play('alarm')
          alarmPlayed.current = true
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [sound])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isWin = result.type !== 'nothing'
  const Icon = asset?.icon || Gift
  const isUrgent = timeLeft <= 30

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          borderRadius: 20,
          background: '#0a0a0c',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 60px rgba(212, 175, 55, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          ref={closeRef}
          {...closeHandlers}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <X size={14} color="#555" />
        </button>

        {/* Top Gold Bar */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061, #d4af37, #8b6914)',
        }} />

        {/* Urgency Timer - RED */}
        <div
          className={isUrgent ? 'pulse-red' : ''}
          style={{
            padding: '12px 16px',
            background: isUrgent ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.08)',
            borderBottom: '1px solid rgba(255, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isUrgent && <AlertTriangle size={14} color="#ff4444" />}
          <Clock size={14} color="#ff4444" />
          <span style={{
            fontFamily: 'var(--font-hack, monospace)',
            fontSize: 12,
            fontWeight: 700,
            color: '#ff4444',
            letterSpacing: '0.1em',
          }}>
            РЕЗЕРВ ИСТЕКАЕТ: {formatTime(timeLeft)}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px' }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <h2 style={{
              fontFamily: 'var(--font-elite, Georgia, serif)',
              fontSize: 20,
              fontWeight: 800,
              color: isWin ? '#D4AF37' : '#666',
              marginBottom: 4,
              letterSpacing: '0.08em',
            }}>
              {isWin ? 'СИСТЕМА УЯЗВИМА' : 'СИСТЕМА УСТОЯЛА'}
            </h2>
            <p style={{
              fontFamily: 'var(--font-hack, monospace)',
              fontSize: 9,
              color: '#555',
              letterSpacing: '0.15em',
            }}>
              {isWin ? 'АКТИВ ЗАРЕЗЕРВИРОВАН' : 'ПОПРОБУЙ СНОВА'}
            </p>
          </div>

          {/* Asset Icon */}
          <motion.div
            animate={{
              rotate: isWin ? [0, -5, 5, -3, 3, 0] : 0,
              scale: isWin ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              width: 70,
              height: 70,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: isWin
                ? 'linear-gradient(135deg, #d4af37, #8b6914)'
                : '#1a1a1e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isWin
                ? '0 0 40px rgba(212, 175, 55, 0.4)'
                : 'none',
              border: isWin
                ? '2px solid rgba(255,255,255,0.2)'
                : '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Icon size={32} color={isWin ? '#fff' : '#444'} strokeWidth={1.5} />
          </motion.div>

          {/* Asset Details */}
          {isWin && asset && (
            <div style={{
              textAlign: 'center',
              marginBottom: 20,
            }}>
              <div style={{
                fontFamily: 'var(--font-elite, Georgia, serif)',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 4,
              }}>
                {asset.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-hack, monospace)',
                fontSize: 18,
                fontWeight: 700,
                color: '#D4AF37',
                textShadow: '0 0 12px rgba(212, 175, 55, 0.5)',
              }}>
                {asset.value}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <button
            ref={claimRef}
            {...claimHandlers}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 12,
              background: isWin
                ? 'linear-gradient(180deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)'
                : 'rgba(255,255,255,0.05)',
              border: isWin
                ? '2px solid #6b4f0f'
                : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              fontFamily: 'var(--font-elite, Georgia, serif)',
              fontSize: 14,
              fontWeight: 700,
              color: isWin ? '#0a0a0c' : '#666',
              letterSpacing: '0.1em',
              boxShadow: isWin
                ? '0 0 30px rgba(212, 175, 55, 0.3)'
                : 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isWin ? (
              <>
                АКТИВИРОВАТЬ АКТИВ
                <ChevronRight size={16} />
              </>
            ) : (
              'ВЗЛОМАТЬ СНОВА'
            )}
          </button>

          {/* Security notice */}
          <div style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 8,
            fontFamily: 'var(--font-hack, monospace)',
            color: '#333',
            letterSpacing: '0.15em',
          }}>
            ЗАШИФРОВАННОЕ СОЕДИНЕНИЕ
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})
SalesModal.displayName = 'SalesModal'

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN ROULETTE PAGE — 100DVH NO-SCROLL FORCED DARK
//  Sales Inception Algorithm with glitch triggers
// ═══════════════════════════════════════════════════════════════════════════

export function RoulettePage({ user }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { unlimitedRoulette } = useAdmin()
  const sound = useSound()

  const [spinning, setSpinning] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<RouletteResult | null>(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null)
  const [glitchActive, setGlitchActive] = useState(false)
  const [wonAsset, setWonAsset] = useState<Asset | null>(null)

  const confetti = useConfetti()
  const spinTimeoutRef = useRef<NodeJS.Timeout>()

  // Get user photo URL from Telegram
  const userPhotoUrl = user?.telegram_photo_url || undefined

  // Suppress unused variable warning in dev
  void unlimitedRoulette

  // ═══════════════════════════════════════════════════════════════════════════
  //  SALES INCEPTION ALGORITHM
  //  1. Fast start → 2. Slow on expensive → 3. Glitch trigger → 4. Land on result
  // ═══════════════════════════════════════════════════════════════════════════

  const runSalesInceptionAnimation = useCallback(async (finalResult: RouletteResult) => {
    // Map result to asset
    let targetAsset = ASSETS[ASSETS.length - 1] // Default to smallest discount

    if (finalResult.type !== 'nothing' && finalResult.value > 0) {
      const matchedAsset = ASSETS.find(a => {
        const numVal = parseInt(a.value.replace(/[^0-9]/g, ''))
        return numVal === finalResult.value || a.value === '∞'
      })
      if (matchedAsset) targetAsset = matchedAsset
    }

    setWonAsset(targetAsset)
    const targetIndex = ASSETS.findIndex(a => a.id === targetAsset.id)

    // Animation parameters
    const tickCount = 20 + Math.floor(Math.random() * 8)

    sound.play('spin_start')

    for (let i = 0; i < tickCount; i++) {
      const progress = i / tickCount
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const delay = 60 + easedProgress * 300

      await new Promise(resolve => setTimeout(resolve, delay))

      let currentIndex: number
      if (progress < 0.7) {
        currentIndex = i % ASSETS.length
      } else {
        const settlingProgress = (progress - 0.7) / 0.3
        const overshoot = Math.floor((1 - settlingProgress) * 2)
        currentIndex = Math.max(0, Math.min(ASSETS.length - 1, targetIndex + overshoot))
      }

      const currentAsset = ASSETS[currentIndex]
      setActiveAssetId(currentAsset.id)
      sound.play('tick')
      haptic('light')

      // GLITCH TRIGGER on expensive assets
      if (progress > 0.5 && (currentAsset.id === 'diploma' || currentAsset.id === 'coursework')) {
        setGlitchActive(true)
        haptic('heavy')
        setTimeout(() => setGlitchActive(false), 150)
      }
    }

    // Final pause
    await new Promise(resolve => setTimeout(resolve, 250))

    // Land on target
    setActiveAssetId(targetAsset.id)
    sound.play('latch')
    haptic('heavy')

    return targetAsset
  }, [sound, haptic])

  const handleSpin = async () => {
    if (spinning) return

    haptic('heavy')
    sound.play('click')

    setSpinning(true)
    setIsOpen(false)
    setResult(null)
    setGlitchActive(false)
    setActiveAssetId(ASSETS[0].id)

    try {
      const spinPromise = spinRoulette()
      const spinResult = await spinPromise
      setResult(spinResult)

      const asset = await runSalesInceptionAnimation(spinResult)

      await new Promise(resolve => setTimeout(resolve, 400))

      setIsOpen(true)
      sound.play('unlock')

      spinTimeoutRef.current = setTimeout(() => {
        setShowSalesModal(true)

        if (spinResult.type !== 'nothing') {
          hapticSuccess()
          if (asset.id === 'diploma' || asset.id === 'coursework') {
            sound.play('jackpot')
            confetti.fire()
          } else {
            sound.play('win')
            confetti.fire()
          }
        } else {
          hapticError()
          sound.play('error')
        }
      }, 600)

    } catch {
      hapticError()
      sound.play('error')
      setResult({ prize: 'Ошибка', type: 'nothing', value: 0 })
      setShowSalesModal(true)
    } finally {
      setSpinning(false)
    }
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowSalesModal(false)
    setActiveAssetId(null)
    setIsOpen(false)
  }, [])

  const handleClaim = useCallback(() => {
    // TODO: Navigate to order page with asset
    handleCloseModal()
  }, [handleCloseModal])

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER — 100dvh FLEX LAYOUT NO SCROLL
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#050505',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Atmospheric Effects */}
      <GodRays />
      <CRTScanlines />

      {/* LIVE WINNERS TICKER — Top Bar (Fixed 30px) */}
      <LiveWinnersTicker />

      {/* HEADER — "LEGACY" / "ЭЛИТНЫЙ ДОСТУП" */}
      <header
        style={{
          flex: '0 0 auto',
          padding: '12px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 4,
        }}>
          <Crown size={20} color="#D4AF37" />
          <GlitchHeader active={glitchActive} />
          <Crown size={20} color="#D4AF37" />
        </div>
        <p style={{
          fontFamily: 'var(--font-hack, monospace)',
          fontSize: 8,
          color: '#444',
          letterSpacing: '0.2em',
          margin: 0,
        }}>
          LEGACY EDITION • ВЗЛОМАЙ СИСТЕМУ
        </p>
      </header>

      {/* VAULT LOCK — Flex Grow (Takes remaining space) */}
      <VaultLock
        isSpinning={spinning}
        isOpen={isOpen}
        userPhotoUrl={userPhotoUrl}
      />

      {/* PRIZE TICKER — Compact Asset List */}
      <PrizeTicker
        assets={ASSETS}
        activeId={activeAssetId}
      />

      {/* BUTTON CONTAINER — Fixed bottom with safe area */}
      <div
        style={{
          flex: '0 0 auto',
          padding: '12px 20px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <SpinButton
          onClick={handleSpin}
          disabled={spinning}
          spinning={spinning}
        />
      </div>

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
            asset={wonAsset}
            onClose={handleCloseModal}
            onClaim={handleClaim}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
