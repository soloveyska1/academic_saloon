import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREMIUM SPLASH SCREEN v2.0 — "The Golden Vault"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHILOSOPHY: "Less is more. Silence is gold. Exclusivity is everything."
 *
 * Inspired by: Cartier, Rolex, Hermès digital experiences
 * - Fewer effects, more meaning
 * - Breathing moments between phases
 * - Narrative arc that tells a story
 * - Sound of silence (strategic pauses)
 *
 * NARRATIVE ARC (5.8 seconds):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PHASE 0: DARKNESS (0-0.6s)                                              │
 * │   → Pure black. Anticipation. "Something is about to happen"            │
 * │                                                                         │
 * │ PHASE 1: MONOGRAM EMERGES (0.6-2.0s)                                    │
 * │   → 3D monogram fades in from depth, rotates slowly                     │
 * │   → Rings begin spinning. Glow pulses.                                  │
 * │                                                                         │
 * │ PAUSE: BREATHING MOMENT (2.0-2.3s)                                      │
 * │   → Nothing moves. Just the monogram breathing.                         │
 * │                                                                         │
 * │ PHASE 2: TENSION BUILDS (2.3-3.5s)                                      │
 * │   → Light begins seeping through vault door cracks                      │
 * │   → Particles start swirling slowly toward center                       │
 * │   → Anticipation grows                                                  │
 * │                                                                         │
 * │ PHASE 3: CLIMAX - VAULT OPENS (3.5-4.5s)                                │
 * │   → Doors slide apart with weight                                       │
 * │   → Light bursts through (300ms AFTER doors start)                      │
 * │   → Haptic impact                                                       │
 * │                                                                         │
 * │ PHASE 4: REVELATION (4.5-5.4s)                                          │
 * │   → Brand crystallizes from light (blur → sharp)                        │
 * │   → Elegant typography appears                                          │
 * │                                                                         │
 * │ PHASE 5: HOLD & APPRECIATE (5.4-5.8s)                                   │
 * │   → Everything settles. User absorbs the moment.                        │
 * │   → Gentle fade to app                                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PremiumSplashScreenProps {
  onComplete: () => void
  minimumDuration?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINED EASING FUNCTIONS — Luxury motion curves
// ═══════════════════════════════════════════════════════════════════════════
const EASING = {
  // Smooth appearance — gentle acceleration, controlled deceleration
  smooth: [0.25, 0.46, 0.45, 0.94] as const,

  // Heavy vault doors — weight and power
  vault: [0.22, 1, 0.36, 1] as const,

  // Ethereal light — magical, floating
  ethereal: [0.17, 0.67, 0.83, 0.67] as const,

  // Spring pop — elegant bounce for reveals
  spring: [0.34, 1.56, 0.64, 1] as const,

  // Cinematic — slow start, powerful finish
  cinematic: [0.16, 1, 0.3, 1] as const,

  // Fade out — graceful exit
  fadeOut: [0.4, 0, 0.2, 1] as const,
}

// ═══════════════════════════════════════════════════════════════════════════
// REFINED GOLD PALETTE — Luxury metallics
// ═══════════════════════════════════════════════════════════════════════════
const GOLD = {
  darkest: '#3d2e0a',
  dark: '#5c4510',
  deep: '#8E6E27',
  primary: '#D4AF37',
  bright: '#e6c547',
  light: '#FFF8D6',
  shine: '#FCF6BA',
  white: '#FFFEF5',
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Ambient Dust Particles (subtle, elegant)
// ═══════════════════════════════════════════════════════════════════════════
function AmbientDust() {
  const particles = useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 1 + Math.random() * 1.5,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * 8,
      opacity: 0.08 + Math.random() * 0.12,
    }))
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: '110vh', opacity: 0 }}
          animate={{
            y: '-10vh',
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
            boxShadow: `0 0 ${p.size * 4}px ${GOLD.primary}40`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Breathing Glow (pulses slowly behind monogram)
// ═══════════════════════════════════════════════════════════════════════════
function BreathingGlow({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0.2, 0.4, 0.2],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD.primary}12, ${GOLD.primary}05 40%, transparent 70%)`,
        filter: 'blur(40px)',
        zIndex: 5,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Refined 3D Monogram
// ═══════════════════════════════════════════════════════════════════════════
function Monogram3D({ phase }: { phase: number }) {
  const controls = useAnimation()
  const isVisible = phase >= 1

  useEffect(() => {
    if (phase >= 1 && phase < 3) {
      controls.start({
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: {
          duration: 1.4,
          ease: EASING.smooth,
        },
      })
    }
    if (phase >= 3) {
      controls.start({
        scale: 0.5,
        y: -120,
        opacity: 0,
        transition: {
          duration: 1,
          ease: EASING.cinematic,
        },
      })
    }
  }, [phase, controls])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 30, filter: 'blur(10px)' }}
      animate={controls}
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
      }}
    >
      {/* Outer ring - slow rotation */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          border: `1px solid ${GOLD.primary}25`,
        }}
      />

      {/* Inner ring - counter rotation */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: 130,
          height: 130,
          borderRadius: '50%',
          border: `1px solid ${GOLD.bright}30`,
        }}
      />

      {/* Core monogram */}
      <motion.div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `
            conic-gradient(from 45deg at 30% 30%,
              ${GOLD.shine}15,
              ${GOLD.primary}10,
              ${GOLD.dark}20,
              ${GOLD.primary}10,
              ${GOLD.shine}15
            ),
            radial-gradient(circle at 30% 30%, ${GOLD.light}10, transparent 60%)
          `,
          border: `1.5px solid ${GOLD.primary}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `
            0 0 40px ${GOLD.primary}20,
            0 0 80px ${GOLD.primary}10,
            inset 0 0 20px ${GOLD.primary}08,
            0 15px 30px rgba(0,0,0,0.4)
          `,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle shine sweep */}
        <motion.div
          animate={{ x: ['-150%', '250%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${GOLD.shine}20, transparent)`,
            transform: 'skewX(-20deg)',
          }}
        />

        {/* AS Text */}
        <span
          style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 600,
            background: `linear-gradient(180deg, ${GOLD.white} 0%, ${GOLD.primary} 50%, ${GOLD.deep} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.08em',
          }}
        >
          AS
        </span>
      </motion.div>

      {/* Minimal accent dots */}
      {[0, 90, 180, 270].map((angle) => (
        <motion.div
          key={angle}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: 0.8 + angle * 0.001, duration: 0.4 }}
          style={{
            position: 'absolute',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: GOLD.primary,
            transform: `rotate(${angle}deg) translateY(-65px)`,
            boxShadow: `0 0 6px ${GOLD.primary}60`,
          }}
        />
      ))}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Light Seeping Through Cracks (builds tension)
// ═══════════════════════════════════════════════════════════════════════════
function SeepingLight({ phase }: { phase: number }) {
  const isVisible = phase >= 2 && phase < 3.5

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Central seam glow - pulsing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.3, 0.8, 0.5, 0.9, 0.6],
              boxShadow: [
                `0 0 30px ${GOLD.primary}40`,
                `0 0 80px ${GOLD.primary}80`,
                `0 0 50px ${GOLD.primary}60`,
                `0 0 100px ${GOLD.primary}90`,
                `0 0 60px ${GOLD.primary}70`,
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 3,
              height: '100%',
              background: `linear-gradient(180deg,
                transparent 5%,
                ${GOLD.shine}80 20%,
                ${GOLD.white} 50%,
                ${GOLD.shine}80 80%,
                transparent 95%
              )`,
              transform: 'translateX(-50%)',
              zIndex: 45,
            }}
          />

          {/* Ambient glow behind doors */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0.1, 0.3, 0.2],
              scale: [0.8, 1.2, 1],
            }}
            exit={{ opacity: 0, scale: 2, transition: { duration: 0.5 } }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${GOLD.primary}25, transparent 70%)`,
              filter: 'blur(60px)',
              zIndex: 30,
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Converging Particles (minimal, elegant)
// ═══════════════════════════════════════════════════════════════════════════
function ConvergingParticles({ phase }: { phase: number }) {
  const isActive = phase >= 2 && phase < 4

  const particles = useMemo(() => {
    return [...Array(24)].map((_, i) => ({
      id: i,
      angle: (i / 24) * 360 + Math.random() * 15,
      distance: 150 + Math.random() * 100,
      size: 2 + Math.random() * 2,
      delay: Math.random() * 0.5,
      speed: 0.8 + Math.random() * 0.4,
    }))
  }, [])

  if (!isActive) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            opacity: 0,
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
          }}
          animate={
            phase >= 3
              ? {
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                  transition: {
                    duration: 0.6,
                    delay: p.delay * 0.2,
                    ease: 'easeIn',
                  },
                }
              : {
                  opacity: [0, 0.6, 0.4],
                  x: Math.cos((p.angle * Math.PI) / 180) * p.distance * 0.7,
                  y: Math.sin((p.angle * Math.PI) / 180) * p.distance * 0.7,
                  transition: {
                    duration: 2 * p.speed,
                    delay: p.delay,
                    ease: 'easeOut',
                  },
                }
          }
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: GOLD.shine,
            boxShadow: `
              0 0 ${p.size * 2}px ${GOLD.primary}60,
              0 0 ${p.size * 4}px ${GOLD.primary}30
            `,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Vault Doors (refined, with ornaments)
// ═══════════════════════════════════════════════════════════════════════════
function VaultDoors({ phase }: { phase: number }) {
  const isOpen = phase >= 3.5

  const DoorSurface = ({ side }: { side: 'left' | 'right' }) => (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(${side === 'left' ? '90deg' : '270deg'},
            #080808 0%,
            #121212 40%,
            #0a0a0a 100%
          )
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Door seam edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          [side === 'left' ? 'right' : 'left']: 0,
          width: 2,
          height: '100%',
          background: `linear-gradient(180deg,
            transparent 10%,
            ${GOLD.primary}20 30%,
            ${GOLD.primary}30 50%,
            ${GOLD.primary}20 70%,
            transparent 90%
          )`,
        }}
      />

      {/* Vertical accent line */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          [side === 'left' ? 'right' : 'left']: 40,
          width: 1,
          height: '70%',
          background: `linear-gradient(180deg, transparent, ${GOLD.primary}15, ${GOLD.primary}25, ${GOLD.primary}15, transparent)`,
        }}
      />

      {/* Central emblem area */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          [side === 'left' ? 'right' : 'left']: 50,
          transform: 'translateY(-50%)',
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: `1px solid ${GOLD.primary}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `1px solid ${GOLD.primary}30`,
            background: `radial-gradient(circle at 30% 30%, ${GOLD.primary}10, transparent)`,
          }}
        />
      </div>

      {/* Corner ornaments */}
      {['top', 'bottom'].map((pos) => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            [pos]: 60,
            [side === 'left' ? 'right' : 'left']: 30,
            width: 30,
            height: 30,
            border: `1px solid ${GOLD.primary}15`,
            borderRadius: 3,
            transform: 'rotate(45deg)',
          }}
        />
      ))}

      {/* "PRIVATE" text on door */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          [side === 'left' ? 'right' : 'left']: 35,
          fontSize: 8,
          letterSpacing: '0.25em',
          color: `${GOLD.primary}20`,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
        }}
      >
        PRIVATE
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
          duration: 1.4,
          ease: EASING.vault,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          zIndex: 50,
        }}
      >
        <DoorSurface side="left" />
      </motion.div>

      {/* Right door */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: isOpen ? '100%' : 0 }}
        transition={{
          duration: 1.4,
          ease: EASING.vault,
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          zIndex: 50,
        }}
      >
        <DoorSurface side="right" />
      </motion.div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Light Burst (delayed after doors)
// ═══════════════════════════════════════════════════════════════════════════
function LightBurst({ phase }: { phase: number }) {
  // Light bursts 300ms AFTER doors start opening
  const showBurst = phase >= 3.8

  return (
    <AnimatePresence>
      {showBurst && (
        <>
          {/* Central explosion */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.9, 0.5],
              scale: [0, 1.5, 3],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: EASING.ethereal }}
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle,
                ${GOLD.white}90,
                ${GOLD.shine}60 30%,
                ${GOLD.primary}30 60%,
                transparent 80%
              )`,
              filter: 'blur(20px)',
              zIndex: 40,
            }}
          />

          {/* Light rays - fewer, more elegant */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{
                opacity: [0, 0.7, 0],
                scaleY: [0, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.03,
                ease: EASING.cinematic,
              }}
              style={{
                position: 'absolute',
                width: 2,
                height: 300,
                background: `linear-gradient(180deg, transparent, ${GOLD.shine}50, transparent)`,
                transformOrigin: 'center center',
                transform: `rotate(${i * 45}deg)`,
                zIndex: 39,
              }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Brand Reveal (crystallizes from blur)
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
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            zIndex: 60,
          }}
        >
          {/* Ambient glow behind brand */}
          <motion.div
            animate={{
              opacity: [0.15, 0.3, 0.15],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: -80,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${GOLD.primary}20, transparent 70%)`,
              filter: 'blur(50px)',
              zIndex: -1,
            }}
          />

          {/* Top decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASING.spring }}
            style={{
              width: 100,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD.primary}50, transparent)`,
            }}
          />

          {/* Exclusivity badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: 9,
              letterSpacing: '0.25em',
              color: GOLD.primary,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}
          >
            MEMBERS ONLY
          </motion.div>

          {/* Main brand name - blur to sharp */}
          <motion.h1
            initial={{
              opacity: 0,
              y: 50,
              scale: 0.8,
              filter: 'blur(20px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{
              duration: 1.2,
              ease: EASING.smooth,
            }}
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontSize: 58,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              background: `linear-gradient(180deg,
                ${GOLD.white} 0%,
                ${GOLD.light} 20%,
                ${GOLD.primary} 50%,
                ${GOLD.deep} 100%
              )`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              position: 'relative',
            }}
          >
            Салун

            {/* Shimmer overlay */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 2,
                delay: 1,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${GOLD.shine}40, transparent)`,
                transform: 'skewX(-20deg)',
              }}
            />
          </motion.h1>

          {/* Decorative diamond */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              fontSize: 10,
              color: GOLD.primary,
            }}
          >
            ✦
          </motion.div>

          {/* Bottom line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease: EASING.spring }}
            style={{
              width: 60,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD.primary}30, transparent)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: Status Indicator (elegant "please wait")
// ═══════════════════════════════════════════════════════════════════════════
function StatusIndicator({ phase, canSkip }: { phase: number; canSkip: boolean }) {
  // Hide during brand reveal
  if (phase >= 4) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: canSkip ? 0.35 : 0.2 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute',
        bottom: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 30,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD.primary}40, transparent)`,
        }}
      />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 9,
          letterSpacing: '0.15em',
          color: canSkip ? `${GOLD.primary}60` : 'rgba(255,255,255,0.3)',
        }}
      >
        {canSkip ? 'TAP TO CONTINUE' : 'PLEASE WAIT'}
      </span>
      <div
        style={{
          width: 30,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD.primary}40, transparent)`,
        }}
      />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: Premium Splash Screen v2.0
// ═══════════════════════════════════════════════════════════════════════════
export function PremiumSplashScreen({
  onComplete,
  minimumDuration = 5800,
}: PremiumSplashScreenProps) {
  const [phase, setPhase] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [canSkip, setCanSkip] = useState(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // NARRATIVE ARC TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // Phase 0: Darkness (0-600ms) - anticipation
    // [implicit - starts at 0]

    // Phase 1: Monogram emerges (600ms)
    timers.push(setTimeout(() => setPhase(1), 600))

    // BREATHING PAUSE built into Phase 1 duration

    // Phase 2: Tension builds - light seeps, particles appear (2300ms)
    timers.push(setTimeout(() => setPhase(2), 2300))

    // Phase 3: Vault doors begin opening (3500ms)
    timers.push(setTimeout(() => setPhase(3), 3500))

    // Phase 3.5: Doors fully opening (3800ms)
    timers.push(setTimeout(() => setPhase(3.5), 3800))

    // Phase 3.8: Light burst (300ms after doors start) (4100ms)
    timers.push(setTimeout(() => setPhase(3.8), 4100))

    // Phase 4: Brand reveals (4500ms)
    timers.push(setTimeout(() => setPhase(4), 4500))

    // Enable skip after 1.5 seconds
    timers.push(setTimeout(() => setCanSkip(true), 1500))

    // Phase 5: Exit (5800ms)
    timers.push(setTimeout(() => {
      setIsExiting(true)
      setTimeout(onComplete, 400)
    }, minimumDuration))

    return () => timers.forEach(clearTimeout)
  }, [onComplete, minimumDuration])

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPTIC FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.HapticFeedback) return

    if (phase === 3.5) {
      // Heavy impact when vault opens
      tg.HapticFeedback.impactOccurred('heavy')
    } else if (phase === 4) {
      // Medium impact on brand reveal
      tg.HapticFeedback.impactOccurred('medium')
    }
  }, [phase])

  // ═══════════════════════════════════════════════════════════════════════════
  // SKIP HANDLER
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSkip = useCallback(() => {
    if (!canSkip || isExiting) return

    const tg = window.Telegram?.WebApp
    tg?.HapticFeedback?.impactOccurred('light')

    setIsExiting(true)
    setTimeout(onComplete, 300)
  }, [canSkip, isExiting, onComplete])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.4, ease: EASING.fadeOut }}
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        zIndex: 9999,
        overflow: 'hidden',
        cursor: canSkip ? 'pointer' : 'default',
      }}
    >
      {/* Phase-based background transition */}
      <motion.div
        animate={{
          background: phase >= 1
            ? `radial-gradient(ellipse 80% 60% at 50% 50%, ${GOLD.darkest}15, transparent 70%),
               linear-gradient(180deg, #030303 0%, #080808 50%, #030303 100%)`
            : '#000000',
        }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Subtle ambient dust */}
      <AmbientDust />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Breathing glow behind monogram */}
      <BreathingGlow visible={phase >= 1 && phase < 3.5} />

      {/* Converging particles */}
      <ConvergingParticles phase={phase} />

      {/* Light seeping through cracks */}
      <SeepingLight phase={phase} />

      {/* Light burst */}
      <LightBurst phase={phase} />

      {/* 3D Monogram */}
      <Monogram3D phase={phase} />

      {/* Vault doors */}
      <VaultDoors phase={phase} />

      {/* Brand reveal */}
      <BrandReveal phase={phase} />

      {/* Status indicator */}
      <StatusIndicator phase={phase} canSkip={canSkip} />

      {/* Noise texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  )
}

// Type declarations
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
