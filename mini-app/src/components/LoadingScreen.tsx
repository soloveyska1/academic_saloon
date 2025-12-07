import { motion } from 'framer-motion'

/**
 * Premium Loading Screen — "Luxury Brand Reveal"
 *
 * Minimalist elegance like high-end fashion brands.
 * Less is more. Simplicity = expensive.
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
        background: '#0a0a0a',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Subtle ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Top decorative line — reveals from center */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 'calc(50% - 80px)',
          width: 200,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
        }}
      />

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 'calc(50% + 80px)',
          width: 200,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
        }}
      />

      {/* Main content container */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        {/* Small decorative element above */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5))',
          }} />
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            border: '1px solid rgba(212, 175, 55, 0.5)',
          }} />
          <div style={{
            width: 24,
            height: 1,
            background: 'linear-gradient(270deg, transparent, rgba(212, 175, 55, 0.5))',
          }} />
        </motion.div>

        {/* Brand Name — САЛУН */}
        <motion.h1
          initial={{ opacity: 0, y: 15, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '0.35em' }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 48,
            fontWeight: 600,
            textTransform: 'uppercase',
            background: 'linear-gradient(180deg, #f5d485 0%, #D4AF37 50%, #a68523 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: 12,
          }}
        >
          Салун
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'rgba(212, 175, 55, 0.5)',
            margin: 0,
          }}
        >
          Академический сервис
        </motion.p>
      </div>

      {/* Loading indicator — minimal elegant bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{
          position: 'absolute',
          bottom: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Thin loading bar */}
        <div
          style={{
            width: 80,
            height: 1,
            background: 'rgba(212, 175, 55, 0.15)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '40%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.8), transparent)',
            }}
          />
        </div>
      </motion.div>

      {/* Footer — EST. 2024 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 48,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.2em',
            color: 'rgba(255, 255, 255, 0.15)',
          }}
        >
          EST. 2024
        </span>
      </motion.div>

      {/* Vignette — subtle edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  )
}
