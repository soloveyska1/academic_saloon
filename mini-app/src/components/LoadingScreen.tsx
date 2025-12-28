import { motion } from 'framer-motion'

/**
 * STRICT PREMIUM LOADING SCREEN
 * Absolute minimalism. Deep black. Gold inputs.
 * Brand: "ACADEMIC SALOON"
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
        background: '#050505', // Deepest charcoal black
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* 
        Gold Arc Spinner 
        - A subtle track ring
        - A rotating bright segment (the arc)
      */}
      <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 32 }}>
        {/* Track */}
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="rgba(212, 175, 55, 0.15)" strokeWidth="1.5" />
        </svg>

        {/* Rotating Arc */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Quarter Circle Arc */}
            <path
              d="M32 2 A30 30 0 0 1 62 32"
              stroke="#D4AF37"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Center Glow Dot (Optional "Jewel" feel) */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 4, height: 4,
          borderRadius: '50%',
          background: '#D4AF37',
          boxShadow: '0 0 10px rgba(212,175,55,0.8)'
        }} />
      </div>

      {/* Brand Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        style={{ textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: "'Cinzel', serif", // Strict branding
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#D4AF37',
            margin: '0 0 8px 0',
            background: 'linear-gradient(180deg, #f5d485 0%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 10px rgba(212,175,55,0.1)'
          }}
        >
          Academic Saloon
        </h1>

        <p style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 10,
          letterSpacing: '0.4em',
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          margin: 0
        }}>
          Premium Service
        </p>
      </motion.div>

    </div>
  )
}
