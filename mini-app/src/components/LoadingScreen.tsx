import { motion } from 'framer-motion'

/**
 * Premium Loading Screen — "The Vault Opens"
 *
 * Cinematic splash with brand identity.
 * Elegant single-ring mechanism + САЛУН branding.
 *
 * Animation philosophy: Loading screen is the ONE place
 * where cinematic animations are justified.
 */
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
        background: 'linear-gradient(180deg, #050505 0%, #0a0a0c 50%, #050505 100%)',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Ambient Radial Glow — Subtle breathing */}
      <motion.div
        animate={{
          opacity: [0.4, 0.6, 0.4],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* The Mechanism — Elegant Single Ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          width: 120,
          height: 120,
          marginBottom: 56,
        }}
      >
        {/* Outer Ring — Slow elegant rotation */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <svg
            viewBox="0 0 120 120"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.3))',
            }}
          >
            <defs>
              <linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b6914" />
                <stop offset="30%" stopColor="#f5d061" />
                <stop offset="70%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#8b6914" />
              </linearGradient>
            </defs>
            {/* Main ring */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="url(#ringGold)"
              strokeWidth="1.5"
              opacity="0.6"
            />
            {/* Elegant dashes */}
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              strokeDasharray="8 24"
              strokeLinecap="round"
              opacity="0.9"
            />
            {/* Corner accents */}
            {[0, 90, 180, 270].map((angle) => (
              <g key={angle} transform={`rotate(${angle} 60 60)`}>
                <line
                  x1="60" y1="2" x2="60" y2="12"
                  stroke="#d4af37"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            ))}
          </svg>
        </motion.div>

        {/* Inner Ring — Counter rotation, slower */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 24 }}
        >
          <svg viewBox="0 0 72 72" style={{ width: '100%', height: '100%' }}>
            <circle
              cx="36" cy="36" r="32"
              fill="none"
              stroke="rgba(212, 175, 55, 0.3)"
              strokeWidth="1"
            />
            <circle
              cx="36" cy="36" r="32"
              fill="none"
              stroke="#d4af37"
              strokeWidth="1.5"
              strokeDasharray="4 16"
              opacity="0.6"
            />
          </svg>
        </motion.div>

        {/* Center Diamond */}
        <motion.div
          animate={{
            rotate: [0, 45, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 24,
            height: 24,
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="diamondGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5d061" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#8b6914" />
              </linearGradient>
            </defs>
            <rect
              x="4" y="4"
              width="16" height="16"
              rx="3"
              fill="url(#diamondGold)"
              transform="rotate(45 12 12)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' }}
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* Brand Name — САЛУН */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 40%, #b48e26 70%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.4))',
            margin: 0,
          }}
        >
          Салун
        </h1>
      </motion.div>

      {/* Loading Indicator — Subtle & Elegant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Loading Bar — This is where shimmer belongs */}
        <div
          style={{
            width: 100,
            height: 2,
            background: 'rgba(212, 175, 55, 0.15)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
            }}
          />
        </div>

        {/* Status Text */}
        <motion.span
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(212, 175, 55, 0.6)',
          }}
        >
          Загружаем...
        </motion.span>
      </motion.div>

      {/* Footer — EST. 2024 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 48,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'rgba(212, 175, 55, 0.25)',
          }}
        >
          ── EST. 2024 ──
        </span>
      </motion.div>

      {/* Film Grain — Very subtle texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.03,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />

      {/* Vignette — Cinematic edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  )
}
