import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * SPLASH SCREEN v4 — "Золотая Печать" (compact)
 *
 * First-time: Full animated seal reveal (~3.5s).
 * Returning: Quick monogram flash (~0.4s).
 */

interface SplashScreenProps {
  onComplete: () => void
  ready?: boolean
}

const GOLD = {
  primary: '#D4AF37',
  shine: '#FCF6BA',
  deep: '#8E6E27',
  white: '#FFFEF5',
}

const EASE_CINEMATIC = [0.76, 0, 0.24, 1] as const
const EASE_SMOOTH = [0.25, 0.46, 0.45, 0.94] as const

export const SplashScreen = ({ onComplete, ready = false }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'seal' | 'reveal' | 'exit'>('seal')
  const [hasSeen, setHasSeen] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('as_intro_seen') === 'true'
    if (seen) {
      setHasSeen(true)
      const timer = setTimeout(onComplete, 400)
      return () => clearTimeout(timer)
    }

    sessionStorage.setItem('as_intro_seen', 'true')

    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => setPhase('exit'), 3000)
    const t3 = setTimeout(onComplete, 3500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onComplete])

  useEffect(() => {
    if (!hasSeen && ready && phase !== 'exit') {
      setPhase('exit')
      const timer = setTimeout(onComplete, 700)
      return () => clearTimeout(timer)
    }
  }, [hasSeen, onComplete, phase, ready])

  // Returning user — quick monogram flash
  if (hasSeen) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: '#050505' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <QuickMonogram />
      </motion.div>
    )
  }

  // First-time user — full seal animation
  return (
    <AnimatePresence>
      <motion.div
        key="seal-splash"
        className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        style={{ background: '#050505' }}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute"
          animate={{ opacity: [0.06, 0.18, 0.06], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '140vw',
            height: '140vh',
            background: `radial-gradient(ellipse at center, ${GOLD.primary}0d 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Floating particles */}
        <GoldParticles active={phase !== 'seal'} />

        {/* Main content */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          animate={phase === 'exit' ? { scale: 1.3, opacity: 0, filter: 'blur(10px)' } : {}}
          transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
        >
          {/* Animated Seal */}
          <SealEmblem phase={phase} />

          {/* Brand name + tagline */}
          <motion.div
            className="mt-8 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase !== 'seal' ? 1 : 0, y: phase !== 'seal' ? 0 : 20 }}
            transition={{ duration: 0.8, ease: EASE_SMOOTH, delay: 0.2 }}
          >
            <ShimmeringBrandName active={phase === 'reveal'} />

            {/* Divider */}
            <motion.div
              className="h-[1px] overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: phase !== 'seal' ? 140 : 0, opacity: phase !== 'seal' ? 1 : 0 }}
              transition={{ duration: 0.8, ease: EASE_SMOOTH, delay: 0.4 }}
              style={{
                background: `linear-gradient(90deg, transparent, ${GOLD.primary}, transparent)`,
              }}
            />

            {/* Tagline */}
            <motion.span
              className="mt-2 text-xs tracking-[0.4em] uppercase"
              style={{ color: `${GOLD.primary}90`, fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'seal' ? 0.6 : 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Премиальный академический сервис
            </motion.span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEAL EMBLEM — Self-drawing circular seal with monogram
// ═══════════════════════════════════════════════════════════════════════════

const SealEmblem = ({ phase }: { phase: string }) => {
  const showRings = phase !== 'seal'
  const size = 160
  const c = size / 2
  const outerR = 72
  const innerR = 58
  const outerCirc = 2 * Math.PI * outerR
  const innerCirc = 2 * Math.PI * innerR

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size + 40,
          height: size + 40,
          background: `radial-gradient(circle, ${GOLD.primary}18 0%, transparent 65%)`,
        }}
      />

      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="splGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GOLD.shine} />
            <stop offset="50%" stopColor={GOLD.primary} />
            <stop offset="100%" stopColor="#B38728" />
          </linearGradient>
        </defs>

        {/* Outer ring — draws itself */}
        <motion.circle
          cx={c} cy={c} r={outerR}
          fill="none" stroke="url(#splGold)" strokeWidth="1.2"
          initial={{ strokeDasharray: outerCirc, strokeDashoffset: outerCirc, opacity: 0 }}
          animate={showRings ? { strokeDashoffset: 0, opacity: 1 } : {}}
          transition={{ duration: 1.2, ease: EASE_CINEMATIC }}
        />

        {/* Inner ring — opposite direction */}
        <motion.circle
          cx={c} cy={c} r={innerR}
          fill="none" stroke={GOLD.primary} strokeWidth="0.5"
          initial={{ strokeDasharray: innerCirc, strokeDashoffset: -innerCirc, opacity: 0 }}
          animate={showRings ? { strokeDashoffset: 0, opacity: 0.4 } : {}}
          transition={{ duration: 1, ease: EASE_CINEMATIC, delay: 0.2 }}
        />

        {/* Cardinal dots */}
        {[0, 90, 180, 270].map((deg, i) => {
          const angle = (deg * Math.PI) / 180 - Math.PI / 2
          const dotR2 = (outerR + innerR) / 2
          return (
            <motion.circle
              key={deg}
              cx={c + dotR2 * Math.cos(angle)}
              cy={c + dotR2 * Math.sin(angle)}
              r="2"
              fill={GOLD.shine}
              initial={{ opacity: 0, scale: 0 }}
              animate={showRings ? { opacity: 0.7, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
            />
          )
        })}
      </svg>

      {/* Center monogram */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.6, opacity: 0, filter: 'blur(12px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.span
          animate={{
            textShadow: [
              `0 0 15px ${GOLD.primary}50`,
              `0 0 30px ${GOLD.shine}70`,
              `0 0 15px ${GOLD.primary}50`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '0.12em',
            background: `linear-gradient(180deg, ${GOLD.white} 0%, ${GOLD.shine} 25%, ${GOLD.primary} 55%, ${GOLD.deep} 85%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          АС
        </motion.span>
      </motion.div>

      {/* Shimmer sweep */}
      {showRings && (
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`,
              transform: 'skewX(-20deg)',
            }}
            animate={{ x: ['-150%', '250%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIMMERING BRAND NAME
// ═══════════════════════════════════════════════════════════════════════════

const ShimmeringBrandName = ({ active }: { active: boolean }) => (
  <div className="relative">
    <h1
      className="text-2xl font-bold tracking-[0.3em]"
      style={{
        fontFamily: "'Cinzel', 'Playfair Display', serif",
        color: '#1a1408',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}
    >
      АКАДЕМИЧЕСКИЙ САЛОН
    </h1>
    <motion.h1
      className="absolute inset-0 text-2xl font-bold tracking-[0.3em]"
      style={{
        fontFamily: "'Cinzel', 'Playfair Display', serif",
        background: `linear-gradient(90deg, #B38728 0%, #B38728 30%, ${GOLD.shine} 50%, #B38728 70%, #B38728 100%)`,
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
      initial={{ backgroundPosition: '-150% 0' }}
      animate={active ? { backgroundPosition: ['150% 0', '-150% 0'] } : {}}
      transition={{ duration: 3, ease: 'easeInOut', repeat: active ? Infinity : 0, repeatDelay: 1 }}
    >
      АКАДЕМИЧЕСКИЙ САЛОН
    </motion.h1>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════
// GOLD PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

const GoldParticles = ({ active }: { active: boolean }) => {
  const particles = [...Array(18)].map((_, i) => ({
    id: i,
    left: `${5 + (i * 5.5) % 90}%`,
    top: `${10 + (i * 7) % 80}%`,
    size: 1.5 + (i % 3),
    delay: i * 0.15,
    duration: 5 + (i % 3) * 2,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: GOLD.primary,
            boxShadow: `0 0 ${p.size * 3}px ${GOLD.primary}50`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            active
              ? {
                  opacity: [0, 0.6, 0.3, 0.6, 0],
                  scale: [0.5, 1, 0.8, 1, 0.5],
                  y: [0, -25, -15, -35, -55],
                }
              : { opacity: 0 }
          }
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK MONOGRAM (returning users)
// ═══════════════════════════════════════════════════════════════════════════

const QuickMonogram = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: `0.5px solid ${GOLD.primary}40`,
        boxShadow: `0 0 30px ${GOLD.primary}15`,
      }}
    >
      <span
        className="text-3xl font-bold"
        style={{
          fontFamily: "'Cinzel', serif",
          background: `linear-gradient(135deg, ${GOLD.shine}, ${GOLD.primary}, #B38728)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        АС
      </span>
    </div>
  </motion.div>
)

export default SplashScreen
