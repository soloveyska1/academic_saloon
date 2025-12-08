/**
 * KineticText - Premium Animated Typography
 *
 * Provides luxurious text animations that adapt to device capability:
 * - ULTRA: Full character-by-character animation with shimmer
 * - PREMIUM: Word-by-word fade with gradient
 * - ELEGANT: Static gradient text (still premium look)
 */

import React, { memo, useMemo } from 'react'
import { motion, Variants } from 'framer-motion'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

interface KineticTextProps {
  children: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  variant?: 'gold' | 'white' | 'gradient' | 'shimmer'
  animation?: 'typewriter' | 'fade' | 'wave' | 'none'
  delay?: number
  staggerDelay?: number
  className?: string
  style?: React.CSSProperties
  onAnimationComplete?: () => void
}

// Style configurations
const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  gold: {
    background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  white: {
    color: '#f2f2f2',
  },
  gradient: {
    background: 'linear-gradient(135deg, #f2f2f2 0%, #D4AF37 50%, #f2f2f2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  shimmer: {
    background: 'linear-gradient(90deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #FCF6BA 75%, #BF953F 100%)',
    backgroundSize: '200% 100%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
}

// Animation variants for Framer Motion
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
}

const characterVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 200,
    },
  },
}

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

const waveVariants: Variants = {
  hidden: { y: 0 },
  visible: (i: number) => ({
    y: [0, -8, 0],
    transition: {
      delay: i * 0.05,
      duration: 0.6,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 2,
    },
  }),
}

// Static text component for Tier 1
const StaticKineticText = memo(function StaticKineticText({
  children,
  as: Tag = 'span',
  variant,
  style,
  className,
}: Pick<KineticTextProps, 'children' | 'as' | 'variant' | 'style' | 'className'>) {
  const variantStyle = VARIANT_STYLES[variant || 'white']

  return (
    <Tag className={className} style={{ ...variantStyle, ...style }}>
      {children}
    </Tag>
  )
})

// Character-by-character animation for Tier 3
const CharacterAnimation = memo(function CharacterAnimation({
  children,
  as: Tag = 'span',
  variant,
  delay = 0,
  staggerDelay = 0.03,
  style,
  className,
  onAnimationComplete,
}: KineticTextProps) {
  const variantStyle = VARIANT_STYLES[variant || 'white']
  const characters = children.split('')

  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      onAnimationComplete={onAnimationComplete}
      className={className}
      style={{ display: 'inline-block', ...style }}
    >
      {characters.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          variants={characterVariants}
          style={{
            display: 'inline-block',
            ...variantStyle,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  )
})

// Word-by-word animation for Tier 2
const WordAnimation = memo(function WordAnimation({
  children,
  as: Tag = 'span',
  variant,
  delay = 0,
  staggerDelay = 0.1,
  style,
  className,
  onAnimationComplete,
}: KineticTextProps) {
  const variantStyle = VARIANT_STYLES[variant || 'white']
  const words = children.split(' ')

  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      onAnimationComplete={onAnimationComplete}
      className={className}
      style={{ display: 'inline-block', ...style }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariants}
          style={{
            display: 'inline-block',
            marginRight: '0.3em',
            ...variantStyle,
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
})

// Wave animation (always character-based, for emphasis)
const WaveAnimation = memo(function WaveAnimation({
  children,
  variant,
  style,
  className,
}: KineticTextProps) {
  const variantStyle = VARIANT_STYLES[variant || 'gold']
  const characters = children.split('')

  return (
    <span className={className} style={{ display: 'inline-block', ...style }}>
      {characters.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={waveVariants}
          style={{
            display: 'inline-block',
            ...variantStyle,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  )
})

// Shimmer effect component (CSS animation - works on all tiers)
const ShimmerText = memo(function ShimmerText({
  children,
  as: Tag = 'span',
  style,
  className,
}: Pick<KineticTextProps, 'children' | 'as' | 'style' | 'className'>) {
  return (
    <Tag
      className={className}
      style={{
        ...VARIANT_STYLES.shimmer,
        animation: 'shimmer-text 3s linear infinite',
        ...style,
      }}
    />
  )
})

export const KineticText = memo(function KineticText(props: KineticTextProps) {
  const {
    children,
    as = 'span',
    variant = 'white',
    animation = 'fade',
    delay = 0,
    staggerDelay,
    className,
    style,
    onAnimationComplete,
  } = props

  const capability = useCapability()

  // Determine which animation to use based on tier and requested animation
  const content = useMemo(() => {
    // Force shimmer variant to always animate (CSS-based, lightweight)
    if (variant === 'shimmer' && capability.shouldAnimate('decorative')) {
      return (
        <ShimmerText as={as} style={style} className={className}>
          {children}
        </ShimmerText>
      )
    }

    // If no animation requested or reduced motion
    if (animation === 'none' || capability.tier === 1) {
      return (
        <StaticKineticText
          as={as}
          variant={variant}
          style={style}
          className={className}
        >
          {children}
        </StaticKineticText>
      )
    }

    // Wave animation (decorative, skip on Tier 2)
    if (animation === 'wave') {
      if (!capability.shouldAnimate('heavy')) {
        return (
          <StaticKineticText
            as={as}
            variant={variant}
            style={style}
            className={className}
          >
            {children}
          </StaticKineticText>
        )
      }
      return <WaveAnimation {...props} />
    }

    // Typewriter/Character animation - only on Tier 3
    if (animation === 'typewriter' && capability.tier === 3) {
      return (
        <CharacterAnimation
          {...props}
          staggerDelay={staggerDelay ?? 0.03}
        />
      )
    }

    // Fade/Word animation - Tier 2 and 3
    if (capability.tier >= 2) {
      return (
        <WordAnimation
          {...props}
          staggerDelay={staggerDelay ?? 0.1}
        />
      )
    }

    // Fallback to static
    return (
      <StaticKineticText
        as={as}
        variant={variant}
        style={style}
        className={className}
      >
        {children}
      </StaticKineticText>
    )
  }, [capability, animation, variant, as, style, className, children, staggerDelay, props])

  return content
})

// Simple fade-in text for essential content
export const FadeInText = memo(function FadeInText({
  children,
  delay = 0,
  duration = 0.5,
  style,
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  style?: React.CSSProperties
  className?: string
}) {
  const capability = useCapability()

  if (!capability.shouldAnimate('essential')) {
    return <span style={style} className={className}>{children}</span>
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: capability.getTransitionDuration(duration),
        ease: [0.16, 1, 0.3, 1],
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.span>
  )
})

// Add the CSS animation to your global styles:
// @keyframes shimmer-text {
//   0% { background-position: 200% center; }
//   100% { background-position: -200% center; }
// }

export default KineticText
