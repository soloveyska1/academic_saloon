import { useRef, useState, useCallback, ReactNode } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  disabled?: boolean
  magneticStrength?: number  // 0-1, how strong the magnetic pull is
  springConfig?: { stiffness: number; damping: number }
  haptic?: boolean
}

export function MagneticButton({
  children,
  className = '',
  style = {},
  onClick,
  disabled = false,
  magneticStrength = 0.4,
  springConfig = { stiffness: 300, damping: 20 },
  haptic = true,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Spring animations for smooth magnetic effect
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  // Transform for inner content (moves slightly more for depth effect)
  const innerX = useTransform(x, v => v * 1.3)
  const innerY = useTransform(y, v => v * 1.3)

  // Scale spring for press effect
  const scale = useSpring(1, { stiffness: 400, damping: 25 })

  // Glow intensity based on distance
  const glowIntensity = useSpring(0, { stiffness: 200, damping: 30 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    // Calculate magnetic pull (stronger when closer to center)
    const maxDistance = Math.max(rect.width, rect.height) / 2
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2)
    const pullStrength = Math.max(0, 1 - distance / (maxDistance * 2))

    x.set(distanceX * magneticStrength * pullStrength)
    y.set(distanceY * magneticStrength * pullStrength)
    glowIntensity.set(pullStrength)
  }, [disabled, magneticStrength, x, y, glowIntensity])

  const handleMouseEnter = useCallback(() => {
    if (disabled) return
    setIsHovered(true)
    scale.set(1.02)
  }, [disabled, scale])

  const handleMouseLeave = useCallback(() => {
    if (disabled) return
    setIsHovered(false)
    x.set(0)
    y.set(0)
    scale.set(1)
    glowIntensity.set(0)
  }, [disabled, x, y, scale, glowIntensity])

  const handleMouseDown = useCallback(() => {
    if (disabled) return
    scale.set(0.96)

    // Haptic feedback
    if (haptic) {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
      } catch {}
    }
  }, [disabled, scale, haptic])

  const handleMouseUp = useCallback(() => {
    if (disabled) return
    scale.set(isHovered ? 1.02 : 1)
  }, [disabled, scale, isHovered])

  const handleClick = useCallback(() => {
    if (disabled) return
    onClick?.()

    // Success haptic on click
    if (haptic) {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
      } catch {}
    }
  }, [disabled, onClick, haptic])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return

    const touch = e.touches[0]
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distanceX = touch.clientX - centerX
    const distanceY = touch.clientY - centerY

    x.set(distanceX * magneticStrength * 0.3)
    y.set(distanceY * magneticStrength * 0.3)
    scale.set(0.96)
    glowIntensity.set(0.5)

    if (haptic) {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
      } catch {}
    }
  }, [disabled, magneticStrength, x, y, scale, glowIntensity, haptic])

  const handleTouchEnd = useCallback(() => {
    if (disabled) return
    x.set(0)
    y.set(0)
    scale.set(1)
    glowIntensity.set(0)
  }, [disabled, x, y, scale, glowIntensity])

  return (
    <motion.button
      ref={ref}
      className={`magnetic-button ${className}`}
      style={{
        ...style,
        position: 'relative',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      disabled={disabled}
    >
      {/* Magnetic container */}
      <motion.div
        style={{
          x,
          y,
          scale,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glow effect */}
        <motion.div
          style={{
            position: 'absolute',
            inset: -10,
            borderRadius: 'inherit',
            background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)',
            opacity: glowIntensity,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        {/* Inner content with extra movement for depth */}
        <motion.div
          style={{
            x: innerX,
            y: innerY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM GOLD MAGNETIC BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface PremiumMagneticButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  icon?: ReactNode
  variant?: 'gold' | 'glass' | 'danger'
}

export function PremiumMagneticButton({
  children,
  onClick,
  disabled = false,
  icon,
  variant = 'gold',
}: PremiumMagneticButtonProps) {
  const variants = {
    gold: {
      background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)',
      color: '#09090b',
      shadow: '0 0 50px -10px rgba(212,175,55,0.6), 0 15px 35px -10px rgba(0,0,0,0.4)',
    },
    glass: {
      background: 'rgba(255,255,255,0.08)',
      color: '#EDEDED',
      shadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
      color: '#ffffff',
      shadow: '0 0 40px -10px rgba(239,68,68,0.5), 0 15px 35px -10px rgba(0,0,0,0.4)',
    },
  }

  const config = variants[variant]

  return (
    <MagneticButton
      onClick={onClick}
      disabled={disabled}
      magneticStrength={0.35}
      style={{
        width: '100%',
        padding: '20px 26px',
        borderRadius: 18,
        background: config.background,
        backgroundSize: '200% 200%',
        boxShadow: config.shadow,
        animation: variant === 'gold' ? 'liquid-gold-shift 4s ease-in-out infinite' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shimmer-pass 3s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: config.color,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {children}
          </div>
        </div>

        {icon && (
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: variant === 'gold' ? 'rgba(9,9,11,0.12)' : 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </MagneticButton>
  )
}
