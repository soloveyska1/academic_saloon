import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

/**
 * Premium Loading Screen — "The Vault Opens"
 *
 * Cinematic splash with brand identity.
 * Spinning gold mechanism + ACADEMIC SALOON branding.
 */
export function LoadingScreen() {
  const [systemReady, setSystemReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSystemReady(true), 1500)
    return () => clearTimeout(timer)
  }, [])

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
      {/* Ambient Radial Glow */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Horizontal Gold Lines */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: '30%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)',
        }}
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          bottom: '30%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)',
        }}
      />

      {/* The Mechanism Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative',
          width: 100,
          height: 100,
          marginBottom: 48,
        }}
      >
        {/* Outer Ring — Clockwise */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.4))' }}>
            <defs>
              <linearGradient id="outerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b48e26" />
                <stop offset="50%" stopColor="#f5d061" />
                <stop offset="100%" stopColor="#b48e26" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="url(#outerGold)" strokeWidth="1.5" strokeDasharray="6 3" />
            {[...Array(12)].map((_, i) => (
              <line
                key={i}
                x1="50" y1="4" x2="50" y2="10"
                stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round"
                transform={`rotate(${i * 30} 50 50)`}
                opacity="0.6"
              />
            ))}
          </svg>
        </motion.div>

        {/* Inner Ring — Counter-clockwise */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 18 }}
        >
          <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="innerGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f5d061" />
                <stop offset="100%" stopColor="#8b6914" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="28" fill="none" stroke="url(#innerGold)" strokeWidth="2" strokeDasharray="14 7" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* Chamber Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 34 }}
        >
          <svg viewBox="0 0 32 32" style={{ width: '100%', height: '100%' }}>
            <circle cx="16" cy="16" r="12" fill="none" stroke="#d4af37" strokeWidth="1" />
            {[...Array(6)].map((_, i) => (
              <circle key={i} cx="16" cy="5" r="2.5" fill="#d4af37" transform={`rotate(${i * 60} 16 16)`} opacity="0.7" />
            ))}
          </svg>
        </motion.div>

        {/* Center Pin */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f5d061 0%, #8b6914 100%)',
            boxShadow: '0 0 15px rgba(212, 175, 55, 0.6), inset 0 1px 2px rgba(255,255,255,0.3)',
          }}
        />
      </motion.div>

      {/* Brand Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', marginBottom: 24 }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 40%, #b48e26 60%, #f5d061 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.4))',
            marginBottom: 8,
          }}
        >
          Academic
        </h1>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d061 50%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(212, 175, 55, 0.5))',
          }}
        >
          Saloon
        </h1>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <motion.div
          animate={{ opacity: systemReady ? [1, 0.3, 1] : 0.5 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: systemReady ? '#22c55e' : '#d4af37',
              boxShadow: systemReady
                ? '0 0 10px #22c55e'
                : '0 0 10px rgba(212, 175, 55, 0.5)',
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: systemReady ? '#22c55e' : 'var(--gold-400)',
            }}
          >
            {systemReady ? 'System Initialized' : 'Initializing...'}
          </span>
        </motion.div>

        {/* Loading Bar */}
        <div
          style={{
            width: 120,
            height: 2,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--gold-400), transparent)',
            }}
          />
        </div>
      </motion.div>

      {/* Film Grain Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.05,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  )
}
