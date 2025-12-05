import { ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { useTilt3D } from '../../hooks/useTilt3D'

interface HolographicCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  variant?: 'gold' | 'silver' | 'rainbow'
  intensity?: 'subtle' | 'medium' | 'intense'
  disabled?: boolean
  onClick?: () => void
  glowColor?: string
}

// Rainbow gradient stops for holographic effect
const HOLO_GRADIENTS = {
  gold: `
    linear-gradient(
      125deg,
      rgba(212, 175, 55, 0) 0%,
      rgba(255, 215, 0, 0.1) 15%,
      rgba(255, 248, 214, 0.3) 30%,
      rgba(212, 175, 55, 0.1) 45%,
      rgba(255, 215, 0, 0.2) 60%,
      rgba(251, 245, 183, 0.3) 75%,
      rgba(212, 175, 55, 0) 100%
    )
  `,
  silver: `
    linear-gradient(
      125deg,
      rgba(192, 192, 192, 0) 0%,
      rgba(220, 220, 220, 0.15) 20%,
      rgba(255, 255, 255, 0.3) 40%,
      rgba(192, 192, 192, 0.1) 60%,
      rgba(230, 230, 230, 0.2) 80%,
      rgba(192, 192, 192, 0) 100%
    )
  `,
  rainbow: `
    linear-gradient(
      125deg,
      rgba(255, 0, 128, 0) 0%,
      rgba(255, 0, 128, 0.15) 10%,
      rgba(255, 165, 0, 0.2) 20%,
      rgba(255, 255, 0, 0.15) 30%,
      rgba(0, 255, 128, 0.2) 40%,
      rgba(0, 128, 255, 0.15) 50%,
      rgba(128, 0, 255, 0.2) 60%,
      rgba(255, 0, 128, 0.15) 70%,
      rgba(255, 165, 0, 0.1) 80%,
      rgba(255, 255, 0, 0) 100%
    )
  `,
}

const INTENSITY_CONFIG = {
  subtle: { opacity: 0.4, blur: 60 },
  medium: { opacity: 0.6, blur: 40 },
  intense: { opacity: 0.8, blur: 20 },
}

export const HolographicCard = forwardRef<HTMLDivElement, HolographicCardProps>(({
  children,
  className = '',
  style = {},
  variant = 'gold',
  intensity = 'medium',
  disabled = false,
  onClick,
  glowColor = 'rgba(212, 175, 55, 0.3)',
}, _ref) => {
  const { ref, style: tiltStyle, shineStyle, isActive } = useTilt3D<HTMLDivElement>({
    maxTilt: 12,
    scale: 1.02,
    speed: 400,
    glareOpacity: 0.25,
    gyroscope: true,
    disabled,
  })

  const intensityConfig = INTENSITY_CONFIG[intensity]

  return (
    <motion.div
      ref={ref}
      className={`holographic-card ${className}`}
      style={{
        ...style,
        ...tiltStyle,
        ...shineStyle,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Base gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px) saturate(130%)',
          WebkitBackdropFilter: 'blur(24px) saturate(130%)',
        }}
      />

      {/* Holographic rainbow layer */}
      <div
        className="holo-rainbow-layer"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: HOLO_GRADIENTS[variant],
          backgroundSize: '200% 200%',
          backgroundPosition: `var(--shine-x, 50%) var(--shine-y, 50%)`,
          opacity: isActive ? intensityConfig.opacity : intensityConfig.opacity * 0.5,
          filter: `blur(${intensityConfig.blur}px)`,
          transition: 'opacity 0.3s ease, background-position 0.1s ease',
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Spotlight shine effect */}
      <div
        className="holo-shine"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(
            circle at var(--shine-x, 50%) var(--shine-y, 50%),
            rgba(255, 255, 255, var(--shine-opacity, 0)) 0%,
            transparent 60%
          )`,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Inner glow border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: 1,
          background: `linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0.1) 100%
          )`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
      />

      {/* Animated outer glow */}
      <motion.div
        animate={{
          boxShadow: isActive
            ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 60px -10px ${glowColor}`
            : `0 20px 40px -10px rgba(0,0,0,0.4), 0 0 30px -15px ${glowColor}`,
        }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  )
})

HolographicCard.displayName = 'HolographicCard'

// Preset variants
export const GoldHolographicCard = (props: Omit<HolographicCardProps, 'variant' | 'glowColor'>) => (
  <HolographicCard {...props} variant="gold" glowColor="rgba(212, 175, 55, 0.4)" />
)

export const PremiumHolographicCard = (props: Omit<HolographicCardProps, 'variant' | 'glowColor' | 'intensity'>) => (
  <HolographicCard {...props} variant="rainbow" intensity="intense" glowColor="rgba(212, 175, 55, 0.3)" />
)
