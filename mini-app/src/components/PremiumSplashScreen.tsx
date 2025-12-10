import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREMIUM SPLASH SCREEN v3.0 — "The Golden Breath"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY: "The brand doesn't appear — it breathes into existence."
 *
 * Inspired by: Hermès, Loro Piana — Organic luxury that lives and breathes
 *
 * KEY PRINCIPLES:
 * - NEVER freeze: Every frame has subtle motion
 * - Brand is the HERO: Focus on "САЛУН" typography
 * - Organic reveal: Letters are born from living gold mist
 * - Short & memorable: 3.2 seconds total
 *
 * TIMELINE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 0.0s → Golden particle appears in center (immediate feedback!)          │
 * │ 0.3s → Particle expands into breathing golden mist                      │
 * │ 0.8s → Mist begins forming letter shapes (still soft, dreamy)           │
 * │ 1.2s → Letters "САЛУН" emerge from mist, crystallizing                  │
 * │ 1.8s → Letters settle, shimmer with internal light                      │
 * │ 2.5s → Subtle breathing continues, brand absorbs                        │
 * │ 3.2s → Graceful transition to app                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PremiumSplashScreenProps {
  onComplete: () => void
  minimumDuration?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// EASING FUNCTIONS — Luxury motion curves
// ═══════════════════════════════════════════════════════════════════════════
const EASING = {
  // Organic breath — natural, living motion
  breath: [0.25, 0.46, 0.45, 0.94] as const,

  // Mist expansion — soft and ethereal
  mist: [0.17, 0.67, 0.83, 0.67] as const,

  // Letter crystallization — magical formation
  crystal: [0.16, 1, 0.3, 1] as const,

  // Smooth fade
  fade: [0.4, 0, 0.2, 1] as const,
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLD PALETTE — Living metallics
// ═══════════════════════════════════════════════════════════════════════════
const GOLD = {
  darkest: '#3d2e0a',
  dark: '#6b5420',
  deep: '#8E6E27',
  primary: '#D4AF37',
  bright: '#e6c547',
  light: '#FFF8D6',
  shine: '#FCF6BA',
  white: '#FFFEF5',
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Living Mist Particles (always moving, organic)
// ═══════════════════════════════════════════════════════════════════════════
function LivingMist({ phase }: { phase: number }) {
  const particles = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      id: i,
      // Start from center, spread outward
      startX: 50 + (Math.random() - 0.5) * 10,
      startY: 50 + (Math.random() - 0.5) * 10,
      // End position - spread across screen
      endX: Math.random() * 100,
      endY: Math.random() * 100,
      // Size variation
      size: 4 + Math.random() * 12,
      // Timing
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 1.5,
    }))
  }, [])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            opacity: 0,
            scale: 0,
            x: `${p.startX}vw`,
            y: `${p.startY}vh`,
            filter: 'blur(20px)',
          }}
          animate={phase >= 0.5 ? {
            opacity: [0, 0.6, 0.3, 0.15, 0],
            scale: [0, 1, 1.5, 2, 2.5],
            x: [`${p.startX}vw`, `${p.endX}vw`],
            y: [`${p.startY}vh`, `${p.endY}vh`],
            filter: ['blur(20px)', 'blur(30px)', 'blur(40px)', 'blur(50px)', 'blur(60px)'],
          } : {}}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: EASING.mist,
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD.shine}, ${GOLD.primary}80, transparent)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Central Golden Core (the "seed" of the brand)
// ═══════════════════════════════════════════════════════════════════════════
function GoldenCore({ phase }: { phase: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={phase >= 0 ? {
        scale: phase < 1 ? [0, 1, 15, 30] : 30,
        opacity: phase < 1.5 ? [0, 1, 0.6, 0] : 0,
      } : {}}
      transition={{
        duration: 1.2,
        ease: EASING.mist,
      }}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD.white}, ${GOLD.shine}, ${GOLD.primary})`,
        boxShadow: `
          0 0 20px ${GOLD.primary},
          0 0 40px ${GOLD.primary}80,
          0 0 80px ${GOLD.primary}40
        `,
        filter: 'blur(2px)',
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Background Glow (always breathing, never static)
// ═══════════════════════════════════════════════════════════════════════════
function BreathingBackground({ phase }: { phase: number }) {
  return (
    <>
      {/* Base dark background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #050505 0%, #0a0808 50%, #080604 100%)',
      }} />

      {/* Central breathing glow - ALWAYS active from start */}
      <motion.div
        initial={{ opacity: 0.1, scale: 0.8 }}
        animate={{
          opacity: [0.15, 0.35, 0.15],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120vw',
          height: '120vh',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${GOLD.primary}15 0%, ${GOLD.dark}08 40%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Secondary pulse - offset timing */}
      <motion.div
        initial={{ opacity: 0.05 }}
        animate={{
          opacity: [0.05, 0.2, 0.05],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1.5,
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '80vw',
          height: '80vh',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${GOLD.shine}10 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Animated Brand Letter
// ═══════════════════════════════════════════════════════════════════════════
function BrandLetter({
  letter,
  index,
  phase,
  total,
}: {
  letter: string
  index: number
  phase: number
  total: number
}) {
  const delay = 0.8 + (index * 0.12)
  const isVisible = phase >= 1.2

  return (
    <motion.span
      initial={{
        opacity: 0,
        y: 30,
        filter: 'blur(20px)',
        scale: 1.2,
      }}
      animate={isVisible ? {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
      } : {}}
      transition={{
        duration: 0.8,
        delay: delay - 0.8, // Relative delay
        ease: EASING.crystal,
      }}
      style={{
        display: 'inline-block',
        position: 'relative',
      }}
    >
      {/* The letter itself */}
      <motion.span
        animate={isVisible ? {
          textShadow: [
            `0 0 30px ${GOLD.primary}80, 0 0 60px ${GOLD.primary}40`,
            `0 0 50px ${GOLD.shine}90, 0 0 80px ${GOLD.primary}60`,
            `0 0 30px ${GOLD.primary}80, 0 0 60px ${GOLD.primary}40`,
          ],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.2,
        }}
        style={{
          background: `linear-gradient(180deg,
            ${GOLD.white} 0%,
            ${GOLD.shine} 20%,
            ${GOLD.primary} 50%,
            ${GOLD.deep} 80%,
            ${GOLD.primary} 100%
          )`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {letter}
      </motion.span>
    </motion.span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Brand Name "САЛУН"
// ═══════════════════════════════════════════════════════════════════════════
function BrandName({ phase }: { phase: number }) {
  const letters = ['С', 'А', 'Л', 'У', 'Н']
  const isVisible = phase >= 1.2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={isVisible ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
      }}
    >
      {/* Main brand text */}
      <motion.h1
        animate={isVisible ? {
          scale: [1, 1.015, 1],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          fontFamily: "'Playfair Display', 'Cinzel', Georgia, serif",
          fontSize: 'clamp(52px, 14vw, 88px)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          margin: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '0.02em',
        }}
      >
        {letters.map((letter, i) => (
          <BrandLetter
            key={i}
            letter={letter}
            index={i}
            phase={phase}
            total={letters.length}
          />
        ))}
      </motion.h1>

      {/* Shimmer effect across the text */}
      {isVisible && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 1.5,
            delay: 0.8,
            ease: EASING.breath,
            repeat: Infinity,
            repeatDelay: 3,
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg,
              transparent 0%,
              ${GOLD.white}30 45%,
              ${GOLD.shine}50 50%,
              ${GOLD.white}30 55%,
              transparent 100%
            )`,
            pointerEvents: 'none',
            transform: 'skewX(-20deg)',
          }}
        />
      )}

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 2 ? {
          opacity: 1,
          y: 0,
        } : {}}
        transition={{
          duration: 0.6,
          delay: 0.3,
          ease: EASING.breath,
        }}
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 'clamp(10px, 2.5vw, 13px)',
          fontWeight: 500,
          letterSpacing: '0.35em',
          color: GOLD.primary,
          opacity: 0.7,
          marginTop: 20,
          textTransform: 'uppercase',
        }}
      >
        Премиум сервис
      </motion.p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Floating Dust (perpetual subtle motion)
// ═══════════════════════════════════════════════════════════════════════════
function FloatingDust() {
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
    }))
  }, [])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: GOLD.primary,
            boxShadow: `0 0 ${p.size * 2}px ${GOLD.primary}60`,
            opacity: 0.2,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Skip Indicator (bottom)
// ═══════════════════════════════════════════════════════════════════════════
function SkipIndicator({ canSkip, onSkip }: { canSkip: boolean; onSkip: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: canSkip ? 0.6 : 0.3 }}
      transition={{ duration: 0.5 }}
      onClick={onSkip}
      style={{
        position: 'absolute',
        bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '12px 24px',
        zIndex: 100,
      }}
    >
      <motion.span
        animate={canSkip ? { opacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: GOLD.primary,
          textTransform: 'uppercase',
        }}
      >
        {canSkip ? 'Нажмите для входа' : ''}
      </motion.span>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: Premium Splash Screen
// ═══════════════════════════════════════════════════════════════════════════
export function PremiumSplashScreen({
  onComplete,
  minimumDuration = 3200, // 3.2 seconds
}: PremiumSplashScreenProps) {
  const [phase, setPhase] = useState(0)
  const [canSkip, setCanSkip] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Handle exit
  const handleExit = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)

    // Haptic feedback
    try {
      const tg = window.Telegram?.WebApp
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light')
      }
    } catch (e) {}

    // Delay for exit animation
    setTimeout(() => {
      onComplete()
    }, 400)
  }, [isExiting, onComplete])

  // Phase progression
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // Immediate start - no black screen!
    setPhase(0.5)

    // Phase 1: Mist expanding (0.3s)
    timers.push(setTimeout(() => setPhase(1), 300))

    // Phase 1.2: Letters start forming (0.8s)
    timers.push(setTimeout(() => setPhase(1.2), 800))

    // Phase 2: Letters crystallized, tagline appears (1.8s)
    timers.push(setTimeout(() => setPhase(2), 1800))

    // Phase 3: Full brand display, breathing (2.5s)
    timers.push(setTimeout(() => setPhase(3), 2500))

    // Enable skip after 1s
    timers.push(setTimeout(() => setCanSkip(true), 1000))

    // Auto-complete after minimum duration
    timers.push(setTimeout(() => {
      handleExit()
    }, minimumDuration))

    return () => timers.forEach(clearTimeout)
  }, [minimumDuration, handleExit])

  // Handle tap to skip
  const handleTap = useCallback(() => {
    if (canSkip && !isExiting) {
      handleExit()
    }
  }, [canSkip, isExiting, handleExit])

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: 'blur(10px)',
          }}
          transition={{ duration: 0.4, ease: EASING.fade }}
          onClick={handleTap}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: canSkip ? 'pointer' : 'default',
          }}
        >
          {/* Always-breathing background */}
          <BreathingBackground phase={phase} />

          {/* Floating dust - perpetual motion */}
          <FloatingDust />

          {/* Golden core - the seed */}
          <GoldenCore phase={phase} />

          {/* Living mist expansion */}
          <LivingMist phase={phase} />

          {/* Brand name - the hero */}
          <BrandName phase={phase} />

          {/* Skip indicator */}
          <SkipIndicator canSkip={canSkip} onSkip={handleTap} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default PremiumSplashScreen
