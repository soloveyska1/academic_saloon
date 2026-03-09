import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREMIUM SPLASH SCREEN v4.0 — "Золотая Печать" (The Golden Seal)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CONCEPT: An animated luxury wax seal stamps into existence.
 * The brand is revealed through precision motion — never static.
 *
 * TIMELINE:
 * 0.0s → Void. A single golden spark ignites at center.
 * 0.3s → Spark expands into a breathing golden core.
 * 0.6s → Outer seal ring draws itself (SVG stroke animation).
 * 1.0s → Inner ornamental ring draws (counter-rotate).
 * 1.2s → "АС" monogram crystallizes from blur in the center.
 * 1.4s → Decorative dots/jewels appear around the seal.
 * 1.6s → Text ring "АКАДЕМИЧЕСКИЙ • САЛОН" fades in, begins rotating.
 * 2.0s → "АКАДЕМИЧЕСКИЙ САЛОН" title materializes below with stagger.
 * 2.4s → "Премиальный сервис" tagline fades in.
 * 2.8s → Golden shimmer sweeps across everything.
 * 3.4s → Graceful exit — zoom + blur + fade.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface PremiumSplashScreenProps {
  onComplete: () => void
  minimumDuration?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const GOLD = {
  deepest: '#2a1f00',
  dark: '#6b5420',
  deep: '#8E6E27',
  primary: '#D4AF37',
  bright: '#e6c547',
  light: '#FFF8D6',
  shine: '#FCF6BA',
  white: '#FFFEF5',
}

const EASE = {
  smooth: [0.25, 0.46, 0.45, 0.94] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
  cinematic: [0.76, 0, 0.24, 1] as const,
  gentle: [0.4, 0, 0.2, 1] as const,
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND — Deep void with breathing gold ambient
// ═══════════════════════════════════════════════════════════════════════════

function VoidBackground() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #030303 0%, #050505 40%, #040302 100%)',
        }}
      />
      {/* Breathing ambient glow */}
      <motion.div
        animate={{
          opacity: [0.08, 0.2, 0.08],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '140vw',
          height: '140vh',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${GOLD.primary}0d 0%, ${GOLD.deep}06 35%, transparent 65%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN SPARK — The initial ignition point
// ═══════════════════════════════════════════════════════════════════════════

function GoldenSpark({ phase }: { phase: number }) {
  if (phase < 0) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: phase < 1 ? [0, 1.5, 0.8] : [0.8, 25, 40],
        opacity: phase < 1 ? [0, 1, 0.8] : [0.8, 0.3, 0],
      }}
      transition={{
        duration: phase < 1 ? 0.4 : 0.8,
        ease: EASE.smooth,
      }}
      style={{
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD.white}, ${GOLD.shine}, ${GOLD.primary})`,
        boxShadow: `0 0 30px ${GOLD.primary}, 0 0 60px ${GOLD.primary}80`,
        zIndex: 20,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEAL — SVG animated circular seal with self-drawing strokes
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedSeal({ phase }: { phase: number }) {
  const sealSize = 200
  const center = sealSize / 2
  const outerR = 88
  const innerR = 72
  const dotR = 80
  const outerCirc = 2 * Math.PI * outerR // ~553
  const innerCirc = 2 * Math.PI * innerR // ~452

  const showOuter = phase >= 0.6
  const showInner = phase >= 1.0
  const showDots = phase >= 1.4
  const showMonogram = phase >= 1.2

  // 12 decorative dots around the seal
  const dots = useMemo(
    () =>
      [...Array(12)].map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180 - Math.PI / 2
        return {
          cx: center + dotR * Math.cos(angle),
          cy: center + dotR * Math.sin(angle),
          r: i % 3 === 0 ? 2.5 : 1.5,
          isPrimary: i % 3 === 0,
        }
      }),
    [center],
  )

  return (
    <div
      style={{
        position: 'relative',
        width: sealSize,
        height: sealSize,
        zIndex: 10,
      }}
    >
      <svg
        viewBox={`0 0 ${sealSize} ${sealSize}`}
        width={sealSize}
        height={sealSize}
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="sealGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GOLD.shine} />
            <stop offset="50%" stopColor={GOLD.primary} />
            <stop offset="100%" stopColor="#B38728" />
          </linearGradient>
          <linearGradient id="sealGold2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B38728" />
            <stop offset="50%" stopColor={GOLD.shine} />
            <stop offset="100%" stopColor={GOLD.primary} />
          </linearGradient>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring — draws itself */}
        <motion.circle
          cx={center}
          cy={center}
          r={outerR}
          fill="none"
          stroke="url(#sealGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ strokeDasharray: outerCirc, strokeDashoffset: outerCirc, opacity: 0 }}
          animate={
            showOuter
              ? { strokeDashoffset: 0, opacity: 1 }
              : {}
          }
          transition={{ duration: 1.2, ease: EASE.cinematic }}
        />

        {/* Inner ring — draws itself (opposite direction) */}
        <motion.circle
          cx={center}
          cy={center}
          r={innerR}
          fill="none"
          stroke="url(#sealGold2)"
          strokeWidth="0.8"
          initial={{ strokeDasharray: innerCirc, strokeDashoffset: -innerCirc, opacity: 0 }}
          animate={
            showInner
              ? { strokeDashoffset: 0, opacity: 0.6 }
              : {}
          }
          transition={{ duration: 1, ease: EASE.cinematic }}
        />

        {/* Decorative dots */}
        {dots.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.isPrimary ? GOLD.shine : GOLD.primary}
            filter={d.isPrimary ? 'url(#goldGlow)' : undefined}
            initial={{ opacity: 0, scale: 0 }}
            animate={
              showDots
                ? { opacity: d.isPrimary ? 0.9 : 0.5, scale: 1 }
                : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.04,
              ease: EASE.spring,
            }}
          />
        ))}

        {/* Art deco lines between dots (every 90°) */}
        {[0, 90, 180, 270].map((deg, i) => {
          const angle = (deg * Math.PI) / 180 - Math.PI / 2
          const x1 = center + (innerR + 2) * Math.cos(angle)
          const y1 = center + (innerR + 2) * Math.sin(angle)
          const x2 = center + (outerR - 2) * Math.cos(angle)
          const y2 = center + (outerR - 2) * Math.sin(angle)
          return (
            <motion.line
              key={`line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={GOLD.primary}
              strokeWidth="0.5"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={showDots ? { opacity: 0.4, pathLength: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
            />
          )
        })}
      </svg>

      {/* Monogram "АС" center */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
        animate={
          showMonogram
            ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
            : {}
        }
        transition={{ duration: 0.8, ease: EASE.spring }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <motion.span
          animate={
            showMonogram
              ? {
                  textShadow: [
                    `0 0 20px ${GOLD.primary}60`,
                    `0 0 40px ${GOLD.shine}80`,
                    `0 0 20px ${GOLD.primary}60`,
                  ],
                }
              : {}
          }
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: '0.15em',
            background: `linear-gradient(180deg, ${GOLD.white} 0%, ${GOLD.shine} 25%, ${GOLD.primary} 55%, ${GOLD.deep} 85%, ${GOLD.primary} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          АС
        </motion.span>
      </motion.div>

      {/* Shimmer sweep across the seal */}
      {phase >= 2.8 && (
        <motion.div
          initial={{ x: '-150%' }}
          animate={{ x: '250%' }}
          transition={{ duration: 1.2, ease: EASE.smooth }}
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${GOLD.white}20 45%, ${GOLD.shine}40 50%, ${GOLD.white}20 55%, transparent 100%)`,
            pointerEvents: 'none',
            transform: 'skewX(-20deg)',
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROTATING TEXT RING — "АКАДЕМИЧЕСКИЙ • САЛОН" orbiting the seal
// ═══════════════════════════════════════════════════════════════════════════

function TextRing({ phase }: { phase: number }) {
  const isVisible = phase >= 1.6
  const ringSize = 260

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={
        isVisible
          ? { opacity: 1, scale: 1 }
          : {}
      }
      transition={{ duration: 0.8, ease: EASE.smooth }}
      style={{
        position: 'absolute',
        width: ringSize,
        height: ringSize,
        zIndex: 8,
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, ease: 'linear', repeat: Infinity }}
        style={{ width: '100%', height: '100%' }}
      >
        <svg viewBox="0 0 260 260" width={ringSize} height={ringSize}>
          <defs>
            <path
              id="textCircle"
              d="M 130, 130 m -110, 0 a 110,110 0 1,1 220,0 a 110,110 0 1,1 -220,0"
              fill="none"
            />
          </defs>
          <text
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.28em',
            }}
          >
            <textPath
              href="#textCircle"
              startOffset="0%"
              fill={GOLD.primary}
              opacity="0.7"
            >
              АКАДЕМИЧЕСКИЙ • САЛОН • АКАДЕМИЧЕСКИЙ • САЛОН •
            </textPath>
          </text>
        </svg>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND TITLE — Staggered letter reveal below the seal
// ═══════════════════════════════════════════════════════════════════════════

function BrandTitle({ phase }: { phase: number }) {
  const isVisible = phase >= 2.0
  const taglineVisible = phase >= 2.4
  const title = 'АКАДЕМИЧЕСКИЙ САЛОН'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={isVisible ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      style={{
        position: 'absolute',
        bottom: 'max(22%, 140px)',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 15,
        padding: '0 20px',
      }}
    >
      {/* Title letters */}
      <div
        style={{
          fontFamily: "'Cinzel', 'Playfair Display', serif",
          fontSize: 'clamp(18px, 5.5vw, 26px)',
          fontWeight: 700,
          letterSpacing: '0.3em',
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0.02em',
        }}
      >
        {title.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={
              isVisible
                ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                : {}
            }
            transition={{
              duration: 0.5,
              delay: i * 0.035,
              ease: EASE.smooth,
            }}
            style={{
              display: 'inline-block',
              background:
                char === ' '
                  ? 'transparent'
                  : `linear-gradient(180deg, ${GOLD.shine} 0%, ${GOLD.primary} 50%, ${GOLD.deep} 100%)`,
              WebkitBackgroundClip: char === ' ' ? undefined : 'text',
              WebkitTextFillColor: char === ' ' ? undefined : 'transparent',
              backgroundClip: char === ' ' ? undefined : 'text',
              minWidth: char === ' ' ? '0.35em' : undefined,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </div>

      {/* Decorative line */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={isVisible ? { width: 120, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4, ease: EASE.smooth }}
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD.primary}, transparent)`,
          margin: '14px auto',
        }}
      />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={taglineVisible ? { opacity: 0.6, y: 0 } : {}}
        transition={{ duration: 0.6, ease: EASE.smooth }}
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 'clamp(9px, 2.5vw, 12px)',
          fontWeight: 500,
          letterSpacing: '0.4em',
          color: GOLD.primary,
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Премиальный сервис
      </motion.p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING PARTICLES — Perpetual golden dust
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles() {
  const particles = useMemo(
    () =>
      [...Array(30)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 3,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 5,
        drift: (Math.random() - 0.5) * 40,
      })),
    [],
  )

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            y: [0, -60, 0],
            x: [0, p.drift, 0],
            opacity: [0.05, 0.35, 0.05],
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
            boxShadow: `0 0 ${p.size * 3}px ${GOLD.primary}50`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// RADIAL BURST — Golden rays from center during seal reveal
// ═══════════════════════════════════════════════════════════════════════════

function RadialBurst({ phase }: { phase: number }) {
  const showBurst = phase >= 0.6 && phase < 2.0

  if (!showBurst) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.3, 0], scale: [0.5, 1.5, 2] }}
      transition={{ duration: 1.5, ease: EASE.smooth }}
      style={{
        position: 'absolute',
        width: '80vw',
        height: '80vw',
        maxWidth: 400,
        maxHeight: 400,
        background: `conic-gradient(
          from 0deg,
          transparent 0deg,
          ${GOLD.primary}08 15deg,
          transparent 30deg,
          ${GOLD.primary}06 45deg,
          transparent 60deg,
          ${GOLD.primary}08 75deg,
          transparent 90deg,
          ${GOLD.primary}06 105deg,
          transparent 120deg,
          ${GOLD.primary}08 135deg,
          transparent 150deg,
          ${GOLD.primary}06 165deg,
          transparent 180deg,
          ${GOLD.primary}08 195deg,
          transparent 210deg,
          ${GOLD.primary}06 225deg,
          transparent 240deg,
          ${GOLD.primary}08 255deg,
          transparent 270deg,
          ${GOLD.primary}06 285deg,
          transparent 300deg,
          ${GOLD.primary}08 315deg,
          transparent 330deg,
          ${GOLD.primary}06 345deg,
          transparent 360deg
        )`,
        borderRadius: '50%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SKIP INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function SkipIndicator({
  canSkip,
  onSkip,
}: {
  canSkip: boolean
  onSkip: () => void
}) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: canSkip ? 0.5 : 0 }}
      transition={{ duration: 0.5 }}
      onClick={onSkip}
      style={{
        position: 'absolute',
        bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: canSkip ? 'pointer' : 'default',
        padding: '12px 24px',
        zIndex: 100,
      }}
    >
      <motion.span
        animate={canSkip ? { opacity: [0.4, 0.8, 0.4] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.25em',
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PremiumSplashScreen({
  onComplete,
  minimumDuration = 3800,
}: PremiumSplashScreenProps) {
  const [phase, setPhase] = useState(-1)
  const [canSkip, setCanSkip] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleExit = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)

    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {}

    setTimeout(onComplete, 500)
  }, [isExiting, onComplete])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // Immediate spark
    timers.push(setTimeout(() => setPhase(0), 50))
    // Spark expands
    timers.push(setTimeout(() => setPhase(0.6), 300))
    // Outer ring draws
    timers.push(setTimeout(() => setPhase(1.0), 600))
    // Inner ring + monogram
    timers.push(setTimeout(() => setPhase(1.2), 1000))
    // Decorative dots
    timers.push(setTimeout(() => setPhase(1.4), 1200))
    // Text ring
    timers.push(setTimeout(() => setPhase(1.6), 1400))
    // Brand title
    timers.push(setTimeout(() => setPhase(2.0), 1800))
    // Tagline
    timers.push(setTimeout(() => setPhase(2.4), 2200))
    // Shimmer
    timers.push(setTimeout(() => setPhase(2.8), 2600))
    // Enable skip
    timers.push(setTimeout(() => setCanSkip(true), 1200))
    // Auto-exit
    timers.push(setTimeout(() => handleExit(), minimumDuration))

    return () => timers.forEach(clearTimeout)
  }, [minimumDuration, handleExit])

  const handleTap = useCallback(() => {
    if (canSkip && !isExiting) handleExit()
  }, [canSkip, isExiting, handleExit])

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
          transition={{ duration: 0.5, ease: EASE.gentle }}
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
          <VoidBackground />
          <FloatingParticles />
          <RadialBurst phase={phase} />
          <GoldenSpark phase={phase} />
          <TextRing phase={phase} />
          <AnimatedSeal phase={phase} />
          <BrandTitle phase={phase} />
          <SkipIndicator canSkip={canSkip} onSkip={handleTap} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default PremiumSplashScreen
