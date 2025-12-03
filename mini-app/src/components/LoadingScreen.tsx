import { motion } from 'framer-motion'

/**
 * Premium Loading Screen — "The Vault Mechanism"
 *
 * A sophisticated loading animation inspired by safe mechanisms
 * and revolver chambers. Pure CSS/SVG animation without emojis.
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
        background: 'var(--bg-void)',
        zIndex: 9999,
      }}
    >
      {/* Ambient glow behind mechanism */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* The Mechanism Container */}
      <div
        style={{
          position: 'relative',
          width: 120,
          height: 120,
          marginBottom: 40,
        }}
      >
        {/* Outer Ring — Clockwise */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            inset: 0,
          }}
        >
          <svg
            viewBox="0 0 120 120"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.4))',
            }}
          >
            <defs>
              <linearGradient id="outerGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b48e26" />
                <stop offset="25%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#f5d061" />
                <stop offset="75%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#b48e26" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="none"
              stroke="url(#outerGoldGradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
            />
            {/* Notches around the ring */}
            {[...Array(12)].map((_, i) => (
              <line
                key={i}
                x1="60"
                y1="4"
                x2="60"
                y2="12"
                stroke="#d4af37"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${i * 30} 60 60)`}
                style={{ opacity: 0.7 }}
              />
            ))}
          </svg>
        </motion.div>

        {/* Middle Ring — Counter-clockwise */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            inset: 20,
          }}
        >
          <svg
            viewBox="0 0 80 80"
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.3))',
            }}
          >
            <defs>
              <linearGradient id="middleGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e6c547" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#8b6914" />
              </linearGradient>
            </defs>
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#middleGoldGradient)"
              strokeWidth="3"
              strokeDasharray="20 10"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        {/* Inner Ring — Clockwise Fast */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            inset: 40,
          }}
        >
          <svg
            viewBox="0 0 40 40"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <defs>
              <linearGradient id="innerGoldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f5d061" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#f5d061" />
              </linearGradient>
            </defs>
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="url(#innerGoldGradient)"
              strokeWidth="2"
            />
            {/* 6 chamber dots like a revolver */}
            {[...Array(6)].map((_, i) => (
              <circle
                key={i}
                cx="20"
                cy="6"
                r="3"
                fill="#d4af37"
                transform={`rotate(${i * 60} 20 20)`}
                style={{ opacity: 0.8 }}
              />
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
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f5d061 0%, #d4af37 50%, #8b6914 100%)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.6), inset 0 1px 2px rgba(255,255,255,0.3)',
          }}
        />
      </div>

      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--gold-400)',
            textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
          }}
        >
          Загрузка данных
        </motion.p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold-400)',
                boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Film grain overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.04,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  )
}
