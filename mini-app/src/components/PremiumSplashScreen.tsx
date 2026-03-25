import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * PREMIUM SPLASH v6 — "Золотая Печать" (lightweight)
 * localStorage-based: shows only once ever (first launch).
 * Total duration: 2.0s max, skip from 0.5s.
 */

interface PremiumSplashScreenProps {
  onComplete: () => void
  minimumDuration?: number
}

const SPLASH_KEY = 'as_splash_seen'

const G = {
  deep: 'var(--gold-700)',
  primary: 'var(--gold-400)',
  shine: 'var(--gold-100)',
  white: 'var(--gold-200)',
}

export function PremiumSplashScreen({
  onComplete,
  minimumDuration = 2000,
}: PremiumSplashScreenProps) {
  const [phase, setPhase] = useState(-1)
  const [canSkip, setCanSkip] = useState(false)
  const exitedRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleExit = useCallback(() => {
    if (exitedRef.current) return
    exitedRef.current = true
    try {
      localStorage.setItem(SPLASH_KEY, '1')
    } catch {
      // Storage may be unavailable — non-critical.
    }
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    } catch {
      // Haptic is optional.
    }
    onComplete()
  }, [onComplete])

  useEffect(() => {
    // If already seen, skip immediately
    try {
      if (localStorage.getItem(SPLASH_KEY)) {
        onComplete()
        return
      }
    } catch {
      // Storage unavailable — show splash anyway.
    }

    const t = timersRef.current
    t.push(
      setTimeout(() => setPhase(0), 30),        // seal + rings start
      setTimeout(() => setPhase(1), 600),        // monogram
      setTimeout(() => setPhase(2), 1200),       // title + tagline
      setTimeout(() => setCanSkip(true), 500),   // skip available early
      setTimeout(() => handleExit(), minimumDuration), // auto-dismiss
    )
    return () => {
      t.forEach(clearTimeout)
      timersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role="button"
      aria-label="Нажмите, чтобы пропустить заставку и войти в приложение"
      tabIndex={0}
      onClick={() => canSkip && handleExit()}
      onKeyDown={(e) => {
        if (canSkip && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleExit()
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--bg-void)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: canSkip ? 'pointer' : 'default',
      }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.05, 0.15, 0.05], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '40%', left: '50%',
          width: '150vw', height: '150vh',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${G.primary}0d 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Golden spark */}
      {phase >= 0 && phase < 1 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 20], opacity: [0, 1, 0] }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute', top: '42%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 6, height: 6, borderRadius: '50%',
            background: `radial-gradient(circle, ${G.white}, ${G.primary})`,
            boxShadow: `0 0 30px ${G.primary}`,
            zIndex: 20,
          }}
        />
      )}

      {/* ═══ MAIN CONTENT BLOCK ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5, marginTop: '-4vh' }}>
        {/* Seal */}
        <Seal phase={phase} />

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(16px, 4.8vw, 24px)',
            fontWeight: 600,
            letterSpacing: '0.22em',
            margin: '20px 0 0 0',
            textAlign: 'center',
            background: `linear-gradient(180deg, ${G.shine} 0%, ${G.primary} 55%, ${G.deep} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          АКАДЕМИЧЕСКИЙ САЛОН
        </motion.h1>

        {/* Divider */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={phase >= 2 ? { width: 90, opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            height: 1, marginTop: 12,
            background: `linear-gradient(90deg, transparent, ${G.primary}80, transparent)`,
          }}
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 0.5 } : {}}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 'clamp(8px, 2.2vw, 11px)',
            fontWeight: 600,
            letterSpacing: '0.35em',
            color: G.primary,
            textTransform: 'uppercase',
            margin: '10px 0 0 0',
          }}
        >
          Премиальный сервис
        </motion.p>
      </div>

      {/* Skip indicator at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: canSkip ? 0.7 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute',
          bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
          fontFamily: "'Manrope', sans-serif",
          fontSize: 12, fontWeight: 600,
          letterSpacing: '0.2em', color: G.primary,
          textTransform: 'uppercase',
        }}
      >
        <motion.span animate={canSkip ? { opacity: [0.5, 1, 0.5] } : {}} transition={{ duration: 2, repeat: Infinity }}>
          Нажмите для входа
        </motion.span>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SEAL — SVG seal with rings, dots, monogram (no rotating text ring)
   ═══════════════════════════════════════════════════════════════ */

function Seal({ phase }: { phase: number }) {
  const S = 300
  const cx = S / 2, cy = S / 2
  const outerR = 80, innerR = 66, dotR = 73
  const outerC = 2 * Math.PI * outerR
  const innerC = 2 * Math.PI * innerR

  const dots = useMemo(() =>
    [...Array(12)].map((_, i) => {
      const a = (i * 30 * Math.PI) / 180 - Math.PI / 2
      return { x: cx + dotR * Math.cos(a), y: cy + dotR * Math.sin(a), big: i % 3 === 0 }
    }), [cx, cy, dotR])

  return (
    <div style={{ width: 'clamp(180px, 52vw, 240px)', aspectRatio: '1', position: 'relative' }}>
      {/* Glow */}
      <motion.div
        animate={{ opacity: [0.08, 0.25, 0.08], scale: [0.95, 1.06, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: '-15%', borderRadius: '50%',
          background: `radial-gradient(circle, ${G.primary}18 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Static seal SVG (rings, dots, lines, monogram) */}
      <svg viewBox={`0 0 ${S} ${S}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="sg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={G.shine} />
            <stop offset="50%" stopColor={G.primary} />
            <stop offset="100%" stopColor="var(--gold-700)" />
          </linearGradient>
          <linearGradient id="sg2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-700)" />
            <stop offset="50%" stopColor={G.shine} />
            <stop offset="100%" stopColor={G.primary} />
          </linearGradient>
          <filter id="ggl"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Outer ring */}
        <motion.circle
          cx={cx} cy={cy} r={outerR} fill="none" stroke="url(#sg1)" strokeWidth="1.2"
          initial={{ strokeDasharray: outerC, strokeDashoffset: outerC, opacity: 0 }}
          animate={phase >= 0 ? { strokeDashoffset: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        />

        {/* Inner ring */}
        <motion.circle
          cx={cx} cy={cy} r={innerR} fill="none" stroke="url(#sg2)" strokeWidth="0.6"
          initial={{ strokeDasharray: innerC, strokeDashoffset: -innerC, opacity: 0 }}
          animate={phase >= 0 ? { strokeDashoffset: 0, opacity: 0.5 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.76, 0, 0.24, 1] }}
        />

        {/* Dots */}
        {dots.map((d, i) => (
          <motion.circle key={i} cx={d.x} cy={d.y} r={d.big ? 2.2 : 1.2}
            fill={d.big ? G.shine : G.primary} filter={d.big ? 'url(#ggl)' : undefined}
            initial={{ opacity: 0 }}
            animate={phase >= 0 ? { opacity: d.big ? 0.9 : 0.4 } : {}}
            transition={{ duration: 0.25, delay: 0.3 + i * 0.02 }}
          />
        ))}

        {/* Cross lines */}
        {[0, 90, 180, 270].map((deg, i) => {
          const a = (deg * Math.PI) / 180 - Math.PI / 2
          return (
            <motion.line key={i}
              x1={cx + (innerR + 2) * Math.cos(a)} y1={cy + (innerR + 2) * Math.sin(a)}
              x2={cx + (outerR - 2) * Math.cos(a)} y2={cy + (outerR - 2) * Math.sin(a)}
              stroke={G.primary} strokeWidth="0.4"
              initial={{ opacity: 0 }}
              animate={phase >= 0 ? { opacity: 0.35 } : {}}
              transition={{ duration: 0.25, delay: 0.35 + i * 0.03 }}
            />
          )
        })}

        {/* Monogram */}
        <motion.text
          x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 52, fontWeight: 700, letterSpacing: '0.12em' }}
          fill="url(#sg1)"
        >
          АС
        </motion.text>
      </svg>

      {/* Shimmer */}
      {phase >= 2 && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
          <motion.div
            initial={{ x: '-150%' }}
            animate={{ x: '250%' }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${G.white}15 45%, ${G.shine}30 50%, ${G.white}15 55%, transparent 100%)`,
              transform: 'skewX(-20deg)',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default PremiumSplashScreen
