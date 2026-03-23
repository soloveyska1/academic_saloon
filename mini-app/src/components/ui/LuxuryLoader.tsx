import { motion } from 'framer-motion'

/**
 * LUXURY LOADER — Rotating seal with text ring.
 * Used as a full-page Suspense fallback and page transition loader.
 * Matches the brand identity of PremiumSplashScreen "Золотая Печать".
 */

const GOLD = {
  primary: 'var(--gold-400)',
  shine: 'var(--gold-100)',
  deep: '#8E6E27',
  white: '#FFFEF5',
}

export const LuxuryLoader = () => {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-[#050505] overflow-hidden">
      <div className="relative flex items-center justify-center">
        {/* Ambient glow */}
        <motion.div
          animate={{ opacity: [0.06, 0.15, 0.06], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute"
          style={{
            width: 300,
            height: 300,
            background: `radial-gradient(circle, ${GOLD.primary}12 0%, transparent 65%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Rotating text ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
          className="relative z-10"
          style={{ width: 192, height: 192 }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="luxGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#B38728" />
                <stop offset="50%" stopColor={GOLD.shine} />
                <stop offset="100%" stopColor={GOLD.primary} />
              </linearGradient>
            </defs>
            <path
              id="luxCirclePath"
              d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
              fill="none"
            />
            <text
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.25em',
              }}
            >
              <textPath
                href="#luxCirclePath"
                startOffset="0%"
                fill="url(#luxGold)"
                opacity="0.6"
              >
                АКАДЕМИЧЕСКИЙ • САЛОН • АКАДЕМИЧЕСКИЙ • САЛОН •
              </textPath>
            </text>
          </svg>
        </motion.div>

        {/* Center monogram with breathing */}
        <motion.div
          className="absolute z-20 flex items-center justify-center"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity }}
        >
          {/* Subtle inner ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 72,
              height: 72,
              border: `0.5px solid ${GOLD.primary}30`,
            }}
          />
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 32,
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
    </div>
  )
}
