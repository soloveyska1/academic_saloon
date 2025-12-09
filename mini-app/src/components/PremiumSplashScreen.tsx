import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREMIUM SPLASH SCREEN — "The Golden Vault"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A cinematic brand reveal experience combining:
 * - 3D Rotating Monogram "AS"
 * - Golden particle vortex convergence
 * - Massive vault doors opening
 * - Light burst revelation
 * - Premium brand typography
 *
 * Timeline (4 seconds total):
 * Phase 0 (0-0.3s):   Darkness, anticipation
 * Phase 1 (0.3-1.2s): 3D Monogram appears and rotates
 * Phase 2 (1.2-2.2s): Golden particles swirl and converge
 * Phase 3 (2.2-3.2s): Vault doors slide open, light bursts through
 * Phase 4 (3.2-3.8s): Brand "САЛУН" rises from depth
 * Phase 5 (3.8-4.2s): Elegant fade out to app
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PremiumSplashScreenProps {
  onComplete: () => void
  minimumDuration?: number
}

// Easing functions for ultra-smooth animations
const EASING = {
  // Cinematic ease - slow start, powerful middle, gentle end
  cinematic: [0.16, 1, 0.3, 1] as const,
  // Heavy vault door movement
  vault: [0.7, 0, 0.3, 1] as const,
  // Elastic spring for reveals
  spring: [0.34, 1.56, 0.64, 1] as const,
  // Smooth exponential
  expo: [0.87, 0, 0.13, 1] as const,
}

// Golden color palette
const GOLD = {
  dark: '#5c4510',
  deep: '#8E6E27',
  primary: '#D4AF37',
  bright: '#e6c547',
  light: '#FFF8D6',
  shine: '#FCF6BA',
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Ambient Floating Particles (always visible subtle effect)
// ═══════════════════════════════════════════════════════════════════════════
function AmbientParticles() {
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.1 + Math.random() * 0.2,
    }))
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '110vh', opacity: 0 }}
          animate={{
            y: ['-10vh'],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: GOLD.primary,
            boxShadow: `0 0 ${p.size * 3}px ${GOLD.primary}60`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Pulsing Glow Ring (behind monogram)
// ═══════════════════════════════════════════════════════════════════════════
function PulsingGlowRing({ phase }: { phase: number }) {
  if (phase < 1) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: phase >= 3 ? 0 : [0.3, 0.6, 0.3],
        scale: phase >= 3 ? 2 : [1, 1.1, 1],
      }}
      transition={{
        opacity: { duration: phase >= 3 ? 0.5 : 2, repeat: phase >= 3 ? 0 : Infinity },
        scale: { duration: phase >= 3 ? 0.8 : 2, repeat: phase >= 3 ? 0 : Infinity },
      }}
      style={{
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD.primary}15, transparent 70%)`,
        filter: 'blur(30px)',
        zIndex: 5,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: 3D Rotating Monogram
// ═══════════════════════════════════════════════════════════════════════════
function Monogram3D({ phase }: { phase: number }) {
  const controls = useAnimation()

  useEffect(() => {
    if (phase >= 1) {
      controls.start({
        opacity: 1,
        rotateY: 0,
        scale: 1,
        transition: {
          duration: 1.2,
          ease: EASING.cinematic,
        },
      })
    }
    if (phase >= 3) {
      controls.start({
        scale: 0.6,
        y: -80,
        opacity: 0.3,
        transition: {
          duration: 0.8,
          ease: EASING.vault,
        },
      })
    }
  }, [phase, controls])

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -90, scale: 0.5 }}
      animate={controls}
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Outer ring - rotating */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: `1px solid ${GOLD.primary}30`,
          boxShadow: `0 0 40px ${GOLD.primary}20`,
        }}
      />

      {/* Inner ring - counter-rotating */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: `1px solid ${GOLD.bright}40`,
        }}
      />

      {/* Core monogram container */}
      <motion.div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${GOLD.light}15, transparent 60%),
                       linear-gradient(135deg, ${GOLD.dark}40, ${GOLD.primary}20, ${GOLD.dark}40)`,
          border: `2px solid ${GOLD.primary}60`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `
            0 0 60px ${GOLD.primary}30,
            inset 0 0 30px ${GOLD.primary}10,
            0 20px 40px rgba(0,0,0,0.5)
          `,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shine sweep animation */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${GOLD.shine}30, transparent)`,
            transform: 'skewX(-20deg)',
          }}
        />

        {/* AS Monogram Text */}
        <span
          style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            background: `linear-gradient(180deg, ${GOLD.light} 0%, ${GOLD.primary} 50%, ${GOLD.deep} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.1em',
            textShadow: `0 2px 10px ${GOLD.primary}40`,
          }}
        >
          AS
        </span>
      </motion.div>

      {/* Decorative dots around monogram */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: GOLD.primary,
            boxShadow: `0 0 10px ${GOLD.primary}`,
            transform: `rotate(${i * 45}deg) translateY(-70px)`,
          }}
        />
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Golden Particle Vortex
// ═══════════════════════════════════════════════════════════════════════════
function ParticleVortex({ phase, particleCount = 60 }: { phase: number; particleCount?: number }) {
  const particles = useMemo(() => {
    return [...Array(particleCount)].map((_, i) => ({
      id: i,
      angle: (i / particleCount) * 360,
      delay: Math.random() * 0.5,
      size: 2 + Math.random() * 4,
      distance: 120 + Math.random() * 180,
      speed: 0.5 + Math.random() * 1.5,
      brightness: 0.4 + Math.random() * 0.6,
    }))
  }, [particleCount])

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            opacity: 0,
            x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
            y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
            scale: 0,
          }}
          animate={
            phase >= 2
              ? phase >= 3
                ? {
                    // Converge to center and fade
                    opacity: 0,
                    x: 0,
                    y: 0,
                    scale: 2,
                    transition: {
                      duration: 0.8,
                      delay: particle.delay * 0.3,
                      ease: EASING.cinematic,
                    },
                  }
                : {
                    // Swirl around
                    opacity: particle.brightness,
                    x: [
                      Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
                      Math.cos(((particle.angle + 180) * Math.PI) / 180) * particle.distance * 0.8,
                      Math.cos(((particle.angle + 360) * Math.PI) / 180) * particle.distance * 0.6,
                    ],
                    y: [
                      Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
                      Math.sin(((particle.angle + 180) * Math.PI) / 180) * particle.distance * 0.8,
                      Math.sin(((particle.angle + 360) * Math.PI) / 180) * particle.distance * 0.6,
                    ],
                    scale: 1,
                    transition: {
                      duration: 2 * particle.speed,
                      delay: particle.delay,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }
              : {}
          }
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD.shine}, ${GOLD.primary})`,
            boxShadow: `0 0 ${particle.size * 2}px ${GOLD.primary}80`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Vault Doors
// ═══════════════════════════════════════════════════════════════════════════
function VaultDoors({ phase }: { phase: number }) {
  const isOpen = phase >= 3

  // Door pattern - decorative elements
  const DoorPattern = ({ side }: { side: 'left' | 'right' }) => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        [side]: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Main door surface */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `
            linear-gradient(${side === 'left' ? '90deg' : '270deg'},
              #0a0a0a 0%,
              #141414 50%,
              #0a0a0a 100%
            )
          `,
          borderLeft: side === 'right' ? `1px solid ${GOLD.primary}30` : 'none',
          borderRight: side === 'left' ? `1px solid ${GOLD.primary}30` : 'none',
        }}
      >
        {/* Vertical gold accent lines */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            [side === 'left' ? 'right' : 'left']: 30,
            width: 1,
            height: '80%',
            background: `linear-gradient(180deg, transparent, ${GOLD.primary}40, ${GOLD.primary}60, ${GOLD.primary}40, transparent)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '15%',
            [side === 'left' ? 'right' : 'left']: 50,
            width: 1,
            height: '70%',
            background: `linear-gradient(180deg, transparent, ${GOLD.primary}20, ${GOLD.primary}30, ${GOLD.primary}20, transparent)`,
          }}
        />

        {/* Decorative corner ornaments */}
        {['top', 'bottom'].map((pos) => (
          <div
            key={pos}
            style={{
              position: 'absolute',
              [pos]: 40,
              [side === 'left' ? 'right' : 'left']: 20,
              width: 40,
              height: 40,
              border: `1px solid ${GOLD.primary}30`,
              borderRadius: 4,
              transform: 'rotate(45deg)',
            }}
          />
        ))}

        {/* Central emblem */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            [side === 'left' ? 'right' : 'left']: 40,
            transform: 'translateY(-50%)',
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `2px solid ${GOLD.primary}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle, ${GOLD.primary}10, transparent)`,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: `1px solid ${GOLD.primary}50`,
              background: `radial-gradient(circle at 30% 30%, ${GOLD.primary}20, transparent)`,
            }}
          />
        </div>

        {/* Door texture lines */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${20 + i * 15}%`,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD.dark}20, transparent)`,
            }}
          />
        ))}
      </div>
    </div>
  )

  return (
    <>
      {/* Left door */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: isOpen ? '-100%' : 0 }}
        transition={{
          duration: 1.2,
          ease: EASING.vault,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          zIndex: 50,
          boxShadow: isOpen ? '20px 0 60px rgba(0,0,0,0.8)' : 'none',
        }}
      >
        <DoorPattern side="left" />
      </motion.div>

      {/* Right door */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: isOpen ? '100%' : 0 }}
        transition={{
          duration: 1.2,
          ease: EASING.vault,
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          zIndex: 50,
          boxShadow: isOpen ? '-20px 0 60px rgba(0,0,0,0.8)' : 'none',
        }}
      >
        <DoorPattern side="right" />
      </motion.div>

      {/* Center seam glow - visible before opening */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2.5 && !isOpen ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: 2,
          height: '100%',
          background: `linear-gradient(180deg, transparent, ${GOLD.primary}60, ${GOLD.shine}, ${GOLD.primary}60, transparent)`,
          boxShadow: `0 0 30px ${GOLD.primary}60, 0 0 60px ${GOLD.primary}40`,
          transform: 'translateX(-50%)',
          zIndex: 51,
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Light Burst
// ═══════════════════════════════════════════════════════════════════════════
function LightBurst({ phase }: { phase: number }) {
  const showBurst = phase >= 3

  return (
    <AnimatePresence>
      {showBurst && (
        <>
          {/* Central light explosion */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.6], scale: [0, 1.5, 3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: EASING.expo }}
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${GOLD.shine}80, ${GOLD.primary}40, transparent 70%)`,
              filter: 'blur(20px)',
              zIndex: 40,
            }}
          />

          {/* Light rays */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 0.8, 0], scaleY: [0, 1, 0.5] }}
              transition={{
                duration: 1,
                delay: i * 0.02,
                ease: EASING.cinematic,
              }}
              style={{
                position: 'absolute',
                width: 2,
                height: 400,
                background: `linear-gradient(180deg, transparent, ${GOLD.shine}60, transparent)`,
                transformOrigin: 'center center',
                transform: `rotate(${i * 30}deg)`,
                zIndex: 39,
              }}
            />
          ))}

          {/* Ambient glow expansion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.3, scale: 2 }}
            transition={{ duration: 1.5, ease: EASING.cinematic }}
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${GOLD.primary}30, transparent 70%)`,
              zIndex: 38,
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Brand Reveal
// ═══════════════════════════════════════════════════════════════════════════
function BrandReveal({ phase }: { phase: number }) {
  const showBrand = phase >= 4

  return (
    <AnimatePresence>
      {showBrand && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            zIndex: 60,
          }}
        >
          {/* Decorative line above */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASING.cinematic }}
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD.primary}60, transparent)`,
            }}
          />

          {/* Main brand name */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 1,
              ease: EASING.spring,
            }}
            style={{ position: 'relative' }}
          >
            {/* Glow behind text */}
            <div
              style={{
                position: 'absolute',
                inset: -20,
                background: `radial-gradient(ellipse at center, ${GOLD.primary}20, transparent 70%)`,
                filter: 'blur(20px)',
              }}
            />

            <h1
              style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif",
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                background: `linear-gradient(180deg, ${GOLD.light} 0%, ${GOLD.primary} 40%, ${GOLD.deep} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                position: 'relative',
                textShadow: `0 4px 30px ${GOLD.primary}60`,
              }}
            >
              Салун
            </h1>

            {/* Shimmer overlay */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 2,
                delay: 0.5,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${GOLD.shine}40, transparent)`,
                transform: 'skewX(-20deg)',
              }}
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASING.cinematic }}
            style={{
              fontFamily: "'Manrope', 'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: `${GOLD.primary}80`,
              margin: 0,
            }}
          >
            Академический сервис
          </motion.p>

          {/* Decorative line below */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASING.cinematic }}
            style={{
              width: 80,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD.primary}40, transparent)`,
            }}
          />

          {/* EST. 2024 */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.25)',
              marginTop: 8,
            }}
          >
            EST. 2024
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Skip Indicator
// ═══════════════════════════════════════════════════════════════════════════
function SkipIndicator({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 0.4 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Нажмите для пропуска
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: Premium Splash Screen
// ═══════════════════════════════════════════════════════════════════════════
export function PremiumSplashScreen({
  onComplete,
  minimumDuration = 4200
}: PremiumSplashScreenProps) {
  const [phase, setPhase] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [canSkip, setCanSkip] = useState(false)

  // Phase progression
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // Phase 1: Monogram appears (300ms)
    timers.push(setTimeout(() => setPhase(1), 300))

    // Phase 2: Particles swirl (1200ms)
    timers.push(setTimeout(() => setPhase(2), 1200))

    // Phase 3: Vault opens (2200ms)
    timers.push(setTimeout(() => setPhase(3), 2200))

    // Phase 4: Brand reveal (3200ms)
    timers.push(setTimeout(() => setPhase(4), 3200))

    // Enable skip after 1 second
    timers.push(setTimeout(() => setCanSkip(true), 1000))

    // Auto-complete (4200ms)
    timers.push(setTimeout(() => {
      setIsExiting(true)
      setTimeout(onComplete, 500)
    }, minimumDuration))

    return () => timers.forEach(clearTimeout)
  }, [onComplete, minimumDuration])

  // Haptic feedback on phase change
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback) {
      if (phase === 3) {
        // Heavy impact when vault opens
        tg.HapticFeedback.impactOccurred('heavy')
      } else if (phase === 4) {
        // Medium impact on brand reveal
        tg.HapticFeedback.impactOccurred('medium')
      }
    }
  }, [phase])

  // Skip handler
  const handleSkip = useCallback(() => {
    if (!canSkip || isExiting) return

    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light')
    }

    setIsExiting(true)
    setTimeout(onComplete, 400)
  }, [canSkip, isExiting, onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050507',
        zIndex: 9999,
        overflow: 'hidden',
        cursor: canSkip ? 'pointer' : 'default',
      }}
    >
      {/* Deep ambient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 50%, ${GOLD.dark}08, transparent 60%),
            linear-gradient(180deg, #050507 0%, #0a0a0c 50%, #050507 100%)
          `,
        }}
      />

      {/* Ambient floating particles (always visible) */}
      <AmbientParticles />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Pulsing glow ring behind monogram */}
      <PulsingGlowRing phase={phase} />

      {/* Particle vortex layer */}
      <ParticleVortex phase={phase} particleCount={50} />

      {/* Light burst layer */}
      <LightBurst phase={phase} />

      {/* 3D Monogram */}
      <Monogram3D phase={phase} />

      {/* Vault doors */}
      <VaultDoors phase={phase} />

      {/* Brand reveal */}
      <BrandReveal phase={phase} />

      {/* Skip indicator */}
      <SkipIndicator visible={canSkip && !isExiting && phase < 4} />

      {/* Noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  )
}

// Type declaration for Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
      }
    }
  }
}
