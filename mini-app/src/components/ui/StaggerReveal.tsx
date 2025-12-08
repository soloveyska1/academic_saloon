/**
 * StaggerReveal - Cascade Animation Container
 *
 * Provides elegant staggered reveal animations for lists and grids:
 * - ULTRA: Full stagger with spring physics and scale
 * - PREMIUM: Simple stagger with fade and translate
 * - ELEGANT: Instant reveal (no animation delay)
 */

import React, { memo, useMemo, Children, cloneElement, isValidElement } from 'react'
import { motion, Variants, HTMLMotionProps } from 'framer-motion'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

interface StaggerRevealProps {
  children: React.ReactNode
  delay?: number
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  animation?: 'fade' | 'slide' | 'scale' | 'spring'
  className?: string
  style?: React.CSSProperties
  once?: boolean // Only animate once (default true)
  threshold?: number // Intersection observer threshold
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

// Animation variants by type
const getVariants = (
  direction: StaggerRevealProps['direction'],
  animation: StaggerRevealProps['animation'],
  tier: 1 | 2 | 3
): { container: Variants; item: Variants } => {
  // Direction offsets
  const directionOffset = {
    up: { x: 0, y: 20 },
    down: { x: 0, y: -20 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  }[direction || 'up']

  // Tier 1: No animation
  if (tier === 1) {
    return {
      container: {
        hidden: {},
        visible: {},
      },
      item: {
        hidden: {},
        visible: {},
      },
    }
  }

  // Container variants (controls stagger timing)
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: tier === 3 ? 0.08 : 0.12,
        delayChildren: 0,
      },
    },
  }

  // Item variants based on animation type
  let item: Variants

  switch (animation) {
    case 'scale':
      item = {
        hidden: {
          opacity: 0,
          scale: 0.8,
          ...directionOffset,
        },
        visible: {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          transition: tier === 3
            ? { type: 'spring', stiffness: 300, damping: 24 }
            : { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        },
      }
      break

    case 'spring':
      item = {
        hidden: {
          opacity: 0,
          scale: 0.9,
          ...directionOffset,
        },
        visible: {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: tier === 3 ? 400 : 300,
            damping: tier === 3 ? 20 : 30,
          },
        },
      }
      break

    case 'slide':
      item = {
        hidden: {
          opacity: 0,
          ...directionOffset,
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            duration: tier === 3 ? 0.5 : 0.4,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }
      break

    case 'fade':
    default:
      item = {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            duration: tier === 3 ? 0.4 : 0.3,
            ease: 'easeOut',
          },
        },
      }
      break
  }

  return { container, item }
}

// Wrapper for individual items
const StaggerItem = memo(function StaggerItem({
  children,
  variants,
  className,
  style,
}: {
  children: React.ReactNode
  variants: Variants
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      variants={variants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
})

export const StaggerReveal = memo(function StaggerReveal({
  children,
  delay = 0,
  staggerDelay,
  direction = 'up',
  animation = 'slide',
  className,
  style,
  once = true,
  threshold = 0.1,
  as: Component = 'div',
}: StaggerRevealProps) {
  const capability = useCapability()

  const variants = useMemo(
    () => getVariants(direction, animation, capability.tier),
    [direction, animation, capability.tier]
  )

  // Adjust stagger timing based on tier
  const containerVariants = useMemo(() => ({
    ...variants.container,
    visible: {
      ...variants.container.visible,
      transition: {
        ...((variants.container.visible as any)?.transition || {}),
        staggerChildren: staggerDelay ?? (capability.tier === 3 ? 0.08 : 0.12),
        delayChildren: delay,
      },
    },
  }), [variants.container, staggerDelay, delay, capability.tier])

  // For Tier 1, just render children without animation wrapper
  if (capability.tier === 1) {
    return (
      <Component className={className} style={style}>
        {children}
      </Component>
    )
  }

  // Wrap each child in StaggerItem
  const wrappedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child

    return (
      <StaggerItem
        key={child.key ?? index}
        variants={variants.item}
      >
        {child}
      </StaggerItem>
    )
  })

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={containerVariants}
      className={className}
      style={style}
    >
      {wrappedChildren}
    </motion.div>
  )
})

// Simple reveal for individual elements
export const Reveal = memo(function Reveal({
  children,
  delay = 0,
  direction = 'up',
  animation = 'slide',
  className,
  style,
  once = true,
  ...motionProps
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  animation?: 'fade' | 'slide' | 'scale' | 'spring'
  className?: string
  style?: React.CSSProperties
  once?: boolean
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'variants'>) {
  const capability = useCapability()

  // Direction offsets
  const directionOffset = {
    up: { x: 0, y: 20 },
    down: { x: 0, y: -20 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 },
  }[direction]

  // No animation for Tier 1
  if (capability.tier === 1) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const getInitial = () => {
    const base: any = { opacity: 0 }
    if (animation === 'scale') base.scale = 0.9
    if (animation !== 'fade') {
      base.x = directionOffset.x
      base.y = directionOffset.y
    }
    return base
  }

  const getAnimate = () => {
    const base: any = { opacity: 1, x: 0, y: 0 }
    if (animation === 'scale') base.scale = 1
    return base
  }

  const getTransition = () => {
    if (animation === 'spring') {
      return {
        type: 'spring',
        stiffness: capability.tier === 3 ? 400 : 300,
        damping: capability.tier === 3 ? 20 : 30,
        delay,
      }
    }
    return {
      duration: capability.getTransitionDuration(animation === 'fade' ? 0.3 : 0.5),
      ease: [0.16, 1, 0.3, 1],
      delay,
    }
  }

  return (
    <motion.div
      initial={getInitial()}
      whileInView={getAnimate()}
      viewport={{ once }}
      transition={getTransition()}
      className={className}
      style={style}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
})

// Grid-specific stagger with proper grid semantics
export const StaggerGrid = memo(function StaggerGrid({
  children,
  columns = 2,
  gap = 12,
  delay = 0,
  animation = 'scale',
  className,
  style,
}: {
  children: React.ReactNode
  columns?: number
  gap?: number
  delay?: number
  animation?: 'fade' | 'slide' | 'scale' | 'spring'
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <StaggerReveal
      delay={delay}
      animation={animation}
      direction="up"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        ...style,
      }}
    >
      {children}
    </StaggerReveal>
  )
})

export default StaggerReveal
