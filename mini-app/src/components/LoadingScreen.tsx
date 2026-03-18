import { motion } from 'framer-motion'

/**
 * PREMIUM LOADING SCREEN — "Золотое Дыхание"
 * Concentric pulsing rings + rotating arc + brand monogram.
 * Displayed while user data loads after splash.
 */

const GOLD = {
  primary: 'var(--gold-400)',
  shine: 'var(--gold-100)',
  deep: 'var(--gold-700)',
  white: 'var(--gold-200)',
}

export function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.06, 0.15, 0.06], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '120vw',
          height: '120vh',
          background: `radial-gradient(ellipse at center, ${GOLD.primary}0d 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Seal loader */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 36 }}>
        {/* Outer breathing ring */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: -8 }}
        >
          <svg viewBox="0 0 136 136" width="136" height="136" style={{ position: 'absolute', top: -8, left: -8 }}>
            <circle
              cx="68"
              cy="68"
              r="64"
              fill="none"
              stroke={GOLD.primary}
              strokeWidth="0.5"
              strokeDasharray="4 6"
              opacity="0.4"
            />
          </svg>
        </motion.div>

        {/* Middle static ring */}
        <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="60" cy="60" r="56" fill="none" stroke={GOLD.primary} strokeWidth="0.6" opacity="0.2" />
          {/* Decorative dots at cardinal points */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180 - Math.PI / 2
            return (
              <circle
                key={deg}
                cx={60 + 56 * Math.cos(rad)}
                cy={60 + 56 * Math.sin(rad)}
                r="1.5"
                fill={GOLD.primary}
                opacity="0.5"
              />
            )
          })}
        </svg>

        {/* Rotating arc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <svg viewBox="0 0 120 120" width="120" height="120">
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={GOLD.primary} stopOpacity="0" />
                <stop offset="50%" stopColor={GOLD.shine} stopOpacity="1" />
                <stop offset="100%" stopColor={GOLD.primary} stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {/* 90° arc */}
            <path
              d="M 60 4 A 56 56 0 0 1 116 60"
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Counter-rotating inner arc */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 12 }}
        >
          <svg viewBox="0 0 96 96" width="96" height="96">
            <path
              d="M 48 6 A 42 42 0 0 1 90 48"
              fill="none"
              stroke={GOLD.primary}
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.4"
            />
          </svg>
        </motion.div>

        {/* Center monogram */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Cinzel', 'Playfair Display', serif",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.12em',
              background: `linear-gradient(180deg, ${GOLD.white} 0%, ${GOLD.shine} 30%, ${GOLD.primary} 60%, ${GOLD.deep} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            АС
          </span>
        </motion.div>
      </div>

      {/* Brand text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        style={{ textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            margin: '0 0 10px 0',
            background: `linear-gradient(180deg, ${GOLD.shine} 0%, ${GOLD.primary} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Академический Салон
        </h1>

        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 9,
            letterSpacing: '0.45em',
            color: `${GOLD.primary}60`,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Загрузка
        </p>
      </motion.div>
    </div>
  )
}
