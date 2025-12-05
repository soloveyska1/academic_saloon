import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode, CSSProperties } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  GOLD TEXT — LIQUID METALLIC GRADIENT TEXT EFFECT
//  Premium "High-End Fintech" Typography Component
// ═══════════════════════════════════════════════════════════════════════════

interface GoldTextProps {
  children: ReactNode
  style?: CSSProperties
  variant?: 'liquid' | 'static' | 'shimmer'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  weight?: 300 | 400 | 500 | 600 | 700 | 800
  uppercase?: boolean
  tracking?: 'normal' | 'wide' | 'wider' | 'widest'
}

const sizeStyles: Record<string, { fontSize: number; lineHeight: number }> = {
  xs: { fontSize: 10, lineHeight: 1.4 },
  sm: { fontSize: 12, lineHeight: 1.4 },
  md: { fontSize: 14, lineHeight: 1.4 },
  lg: { fontSize: 18, lineHeight: 1.3 },
  xl: { fontSize: 24, lineHeight: 1.2 },
  '2xl': { fontSize: 32, lineHeight: 1.15 },
  '3xl': { fontSize: 42, lineHeight: 1.1 },
}

const trackingStyles: Record<string, string> = {
  normal: '0',
  wide: '0.05em',
  wider: '0.1em',
  widest: '0.2em',
}

// The signature Liquid Gold gradient
const LIQUID_GOLD_GRADIENT = `linear-gradient(
  135deg,
  #BF953F 0%,
  #FCF6BA 25%,
  #D4AF37 50%,
  #B38728 75%,
  #FBF5B7 100%
)`

const STATIC_GOLD_GRADIENT = 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)'

export function GoldText({
  children,
  variant = 'liquid',
  size = 'md',
  weight = 600,
  uppercase = false,
  tracking = 'normal',
  style,
}: GoldTextProps) {
  const { fontSize, lineHeight } = sizeStyles[size]

  const baseStyle: React.CSSProperties = {
    background: variant === 'static' ? STATIC_GOLD_GRADIENT : LIQUID_GOLD_GRADIENT,
    backgroundSize: variant === 'liquid' ? '200% 200%' : '100% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: "'Montserrat', system-ui, sans-serif",
    fontSize,
    lineHeight,
    fontWeight: weight,
    textTransform: uppercase ? 'uppercase' : 'none',
    letterSpacing: trackingStyles[tracking],
    display: 'inline-block',
    animation: variant === 'liquid' ? 'liquid-gold-shift 4s ease-in-out infinite' : undefined,
    ...style,
  }

  // For shimmer variant, add an overlay effect
  if (variant === 'shimmer') {
    return (
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={baseStyle}>
          {children}
        </span>
        <span
          className="gold-shimmer-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(251, 245, 183, 0.4) 50%, transparent 100%)',
            pointerEvents: 'none',
            animation: 'shimmer-pass 2.5s ease-in-out infinite',
          }}
        />
      </span>
    )
  }

  // Use regular span to avoid framer-motion type issues
  return (
    <span style={baseStyle}>
      {children}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GOLD BADGE — Status Badge with Gold Gradient Border
// ═══════════════════════════════════════════════════════════════════════════

interface GoldBadgeProps {
  children: ReactNode
  className?: string
}

export function GoldBadge({ children, className = '' }: GoldBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 14px',
        borderRadius: 9999,
        background: 'transparent',
      }}
    >
      {/* Gradient border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 9999,
          padding: 1,
          background: LIQUID_GOLD_GRADIENT,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <GoldText size="xs" weight={600} uppercase tracking="wider" variant="static">
        {children}
      </GoldText>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  AVATAR WITH SPINNING GOLD RING
// ═══════════════════════════════════════════════════════════════════════════

interface GoldAvatarProps {
  initials: string
  size?: number
}

export function GoldAvatar({ initials, size = 60 }: GoldAvatarProps) {
  const innerSize = size - 6

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      {/* Spinning gold border */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          ease: 'linear',
          repeat: Infinity,
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(
            from 0deg,
            #BF953F,
            #FCF6BA,
            #D4AF37,
            #B38728,
            #FBF5B7,
            #BF953F
          )`,
        }}
      />

      {/* Inner circle background */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #141417 0%, #09090b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        <GoldText
          size={size >= 60 ? 'lg' : 'md'}
          weight={700}
          variant="static"
          tracking="wide"
        >
          {initials}
        </GoldText>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIQUID GOLD BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface LiquidGoldButtonProps extends HTMLMotionProps<'button'> {
  children: ReactNode
  icon?: ReactNode
  fullWidth?: boolean
}

export function LiquidGoldButton({
  children,
  icon,
  fullWidth = true,
  style,
  ...props
}: LiquidGoldButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: fullWidth ? '100%' : 'auto',
        padding: '18px 28px',
        fontFamily: "'Montserrat', system-ui, sans-serif",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#050505',
        background: LIQUID_GOLD_GRADIENT,
        backgroundSize: '200% 200%',
        border: 'none',
        borderRadius: 16,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: `
          0 0 30px -5px rgba(212, 175, 55, 0.5),
          0 10px 30px -10px rgba(0, 0, 0, 0.5),
          inset 0 2px 4px rgba(255, 255, 255, 0.4),
          inset 0 -2px 4px rgba(0, 0, 0, 0.1)
        `,
        ...style,
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        backgroundPosition: {
          duration: 4,
          ease: 'easeInOut',
          repeat: Infinity,
        },
      }}
      {...props}
    >
      {/* Shimmer overlay */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2.5,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 2,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {icon && <span style={{ position: 'relative', zIndex: 1 }}>{icon}</span>}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  )
}

export default GoldText
