import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Target } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  VAULT LOCK — 3D Mechanical Safe (FORCED DARK)
//  Features: User photo "TARGET LOCKED", Gyroscope parallax, Glitch effects
// ═══════════════════════════════════════════════════════════════════════════

interface VaultLockProps {
  isSpinning: boolean
  isOpen: boolean
  userPhotoUrl?: string
  onSpinComplete?: () => void
}

export const VaultLock = memo(({ isSpinning, isOpen, userPhotoUrl }: VaultLockProps) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [dialRotation, setDialRotation] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Gyroscope / Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || isSpinning) return
      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const x = (e.clientY - centerY) / 25
      const y = (e.clientX - centerX) / -25
      setTilt({
        x: Math.max(-12, Math.min(12, x)),
        y: Math.max(-12, Math.min(12, y)),
      })
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!e.beta || !e.gamma || isSpinning) return
      setTilt({
        x: Math.max(-12, Math.min(12, (e.beta - 45) * 0.25)),
        y: Math.max(-12, Math.min(12, e.gamma * 0.25)),
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [isSpinning])

  // Dial animation during spin
  useEffect(() => {
    if (isSpinning) {
      const startTime = Date.now()
      const duration = 3000 // 3 seconds
      const totalRotation = 1440 // 4 full rotations

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setDialRotation(eased * totalRotation)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    } else {
      setDialRotation(0)
    }
  }, [isSpinning])

  return (
    <div
      ref={containerRef}
      style={{
        flex: '1 1 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
        minHeight: 0,
        maxHeight: '35vh',
        padding: '8px 0',
      }}
    >
      <motion.div
        animate={{
          rotateX: isSpinning ? 0 : tilt.x,
          rotateY: isSpinning ? 0 : tilt.y,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        style={{
          position: 'relative',
          width: 200,
          height: 200,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Outer Ring - Gold Border */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #8b6914, #D4AF37)',
            boxShadow: isSpinning
              ? '0 0 40px rgba(212, 175, 55, 0.5), 0 0 80px rgba(212, 175, 55, 0.3)'
              : '0 0 20px rgba(212, 175, 55, 0.3)',
            transition: 'box-shadow 0.3s',
          }}
        />

        {/* Main Vault Body */}
        <div
          className={isSpinning ? 'pulse-gold' : ''}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #1a1a1e, #0a0a0c)',
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8), inset 0 -2px 10px rgba(212, 175, 55, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* User Photo Background (Identity Fusion) */}
          {userPhotoUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 20,
                borderRadius: '50%',
                backgroundImage: `url(${userPhotoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.15,
                filter: 'grayscale(100%) blur(2px)',
              }}
            />
          )}

          {/* Dial with Rotation */}
          <div
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              transform: `rotate(${dialRotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.3s',
            }}
          >
            {/* Major Dial Marks */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: 3,
                  height: 14,
                  background: '#D4AF37',
                  borderRadius: 2,
                  left: '50%',
                  top: 0,
                  marginLeft: -1.5,
                  transformOrigin: '50% 80px',
                  transform: `rotate(${i * 30}deg)`,
                  boxShadow: '0 0 6px rgba(212, 175, 55, 0.5)',
                }}
              />
            ))}

            {/* Minor Dial Marks */}
            {[...Array(60)].map((_, i) => {
              if (i % 5 === 0) return null
              return (
                <div
                  key={`m-${i}`}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 8,
                    background: '#444',
                    left: '50%',
                    top: 0,
                    marginLeft: -0.5,
                    transformOrigin: '50% 80px',
                    transform: `rotate(${i * 6}deg)`,
                  }}
                />
              )
            })}
          </div>

          {/* Center Hub */}
          <div
            style={{
              position: 'relative',
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #D4AF37, #8b6914)',
              boxShadow: `
                inset 0 3px 8px rgba(255,255,255,0.3),
                inset 0 -3px 8px rgba(0,0,0,0.4),
                0 0 30px rgba(212, 175, 55, 0.4)
              `,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Knurled texture */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'repeating-conic-gradient(transparent 0deg, rgba(0,0,0,0.15) 3deg, transparent 6deg)',
              }}
            />

            {/* Lock Icon */}
            {isOpen ? (
              <Unlock size={32} color="#050505" strokeWidth={2.5} />
            ) : isSpinning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Lock size={32} color="#050505" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <Lock size={32} color="#050505" strokeWidth={2.5} />
            )}
          </div>

          {/* Scanner Sweep during spin */}
          {isSpinning && (
            <div className="scanner-sweep" />
          )}
        </div>

        {/* LED Indicators */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
          }}
        >
          {/* Processing LED */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isSpinning ? '#eab308' : '#2a2a00',
              boxShadow: isSpinning ? '0 0 12px #eab308' : 'none',
              transition: 'all 0.2s',
            }}
          />
          {/* Success LED */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isOpen ? '#22c55e' : '#0a2a0a',
              boxShadow: isOpen ? '0 0 12px #22c55e' : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        {/* TARGET LOCKED overlay */}
        {userPhotoUrl && !isSpinning && !isOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: -24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 4,
            }}
          >
            <Target size={10} color="#D4AF37" />
            <span
              style={{
                fontSize: 8,
                fontFamily: 'var(--font-hack, monospace)',
                color: '#D4AF37',
                letterSpacing: '0.15em',
              }}
            >
              ЦЕЛЬ ЗАХВАЧЕНА
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
})

VaultLock.displayName = 'VaultLock'
