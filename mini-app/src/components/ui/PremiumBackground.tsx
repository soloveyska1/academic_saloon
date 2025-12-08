/**
 * PremiumBackground - Adaptive Animated Mesh Gradient Background
 *
 * Provides a luxurious animated gradient background that adapts to device capability:
 * - ULTRA: Full animated mesh with multiple layers and glow
 * - PREMIUM: Simplified animation with fewer layers
 * - ELEGANT: Static premium gradient (still beautiful, no animation)
 */

import React, { memo, useMemo, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

interface PremiumBackgroundProps {
  variant?: 'default' | 'gold' | 'dark' | 'aurora'
  intensity?: 'subtle' | 'medium' | 'intense'
  interactive?: boolean // Respond to mouse/touch
  children?: React.ReactNode
}

// Color configurations for different variants
const GRADIENT_CONFIGS = {
  default: {
    colors: [
      'rgba(212, 175, 55, 0.15)',
      'rgba(180, 142, 38, 0.1)',
      'rgba(191, 149, 63, 0.12)',
    ],
    accent: 'rgba(212, 175, 55, 0.3)',
  },
  gold: {
    colors: [
      'rgba(212, 175, 55, 0.2)',
      'rgba(251, 245, 183, 0.15)',
      'rgba(179, 135, 40, 0.18)',
    ],
    accent: 'rgba(252, 246, 186, 0.4)',
  },
  dark: {
    colors: [
      'rgba(20, 20, 23, 0.9)',
      'rgba(30, 30, 35, 0.85)',
      'rgba(15, 15, 18, 0.95)',
    ],
    accent: 'rgba(212, 175, 55, 0.1)',
  },
  aurora: {
    colors: [
      'rgba(139, 92, 246, 0.12)',
      'rgba(212, 175, 55, 0.1)',
      'rgba(59, 130, 246, 0.08)',
    ],
    accent: 'rgba(167, 139, 250, 0.2)',
  },
}

const INTENSITY_SCALE = {
  subtle: 0.5,
  medium: 1,
  intense: 1.5,
}

// Static gradient for Tier 1 (elegant but no animation)
const StaticBackground = memo(function StaticBackground({
  config,
  intensity,
}: {
  config: typeof GRADIENT_CONFIGS.default
  intensity: number
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, ${config.colors[0]} 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 100%, ${config.colors[1]} 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 20% 50%, ${config.colors[2]} 0%, transparent 50%)
        `,
        opacity: intensity,
        pointerEvents: 'none',
      }}
    />
  )
})

// Animated blob component for Tier 2+
const AnimatedBlob = memo(function AnimatedBlob({
  color,
  size,
  position,
  duration,
  delay,
}: {
  color: string
  size: number
  position: { x: number; y: number }
  duration: number
  delay: number
}) {
  return (
    <motion.div
      initial={{
        x: `${position.x}%`,
        y: `${position.y}%`,
        scale: 0.8,
      }}
      animate={{
        x: [`${position.x}%`, `${position.x + 15}%`, `${position.x - 10}%`, `${position.x}%`],
        y: [`${position.y}%`, `${position.y - 10}%`, `${position.y + 15}%`, `${position.y}%`],
        scale: [0.8, 1.1, 0.9, 0.8],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        width: `${size}%`,
        height: `${size}%`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(40px)',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  )
})

// Interactive spotlight effect for Tier 3
const InteractiveSpotlight = memo(function InteractiveSpotlight({
  color,
  enabled,
}: {
  color: string
  enabled: boolean
}) {
  const mouseX = useMotionValue(50)
  const mouseY = useMotionValue(50)

  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const spotlightX = useTransform(springX, (v) => `${v}%`)
  const spotlightY = useTransform(springY, (v) => `${v}%`)

  useEffect(() => {
    if (!enabled) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY

      mouseX.set((x / window.innerWidth) * 100)
      mouseY.set((y / window.innerHeight) * 100)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('touchmove', handleMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
    }
  }, [enabled, mouseX, mouseY])

  if (!enabled) return null

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: '50%',
        height: '50%',
        left: spotlightX,
        top: spotlightY,
        x: '-50%',
        y: '-50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
        filter: 'blur(60px)',
        pointerEvents: 'none',
        opacity: 0.6,
        willChange: 'left, top',
      }}
    />
  )
})

export const PremiumBackground = memo(function PremiumBackground({
  variant = 'default',
  intensity = 'medium',
  interactive = false,
  children,
}: PremiumBackgroundProps) {
  const capability = useCapability()
  const config = GRADIENT_CONFIGS[variant]
  const intensityValue = INTENSITY_SCALE[intensity]

  // Determine what to render based on tier
  const renderContent = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }

    // Tier 1: Static gradient
    if (capability.tier === 1) {
      return (
        <div style={baseStyle}>
          <StaticBackground config={config} intensity={intensityValue * 0.8} />
        </div>
      )
    }

    // Tier 2: Simple animated blobs
    if (capability.tier === 2) {
      return (
        <div style={baseStyle}>
          <StaticBackground config={config} intensity={intensityValue * 0.5} />
          <AnimatedBlob
            color={config.colors[0]}
            size={60}
            position={{ x: 20, y: 10 }}
            duration={20}
            delay={0}
          />
          <AnimatedBlob
            color={config.colors[1]}
            size={50}
            position={{ x: 70, y: 60 }}
            duration={25}
            delay={2}
          />
        </div>
      )
    }

    // Tier 3: Full animated mesh with interactivity
    return (
      <div style={baseStyle}>
        <StaticBackground config={config} intensity={intensityValue * 0.3} />
        <AnimatedBlob
          color={config.colors[0]}
          size={70}
          position={{ x: 15, y: 5 }}
          duration={18}
          delay={0}
        />
        <AnimatedBlob
          color={config.colors[1]}
          size={55}
          position={{ x: 75, y: 55 }}
          duration={22}
          delay={1.5}
        />
        <AnimatedBlob
          color={config.colors[2]}
          size={45}
          position={{ x: 40, y: 80 }}
          duration={20}
          delay={3}
        />
        <InteractiveSpotlight
          color={config.accent}
          enabled={interactive && capability.canUseHeavyAnimations}
        />
      </div>
    )
  }, [capability.tier, capability.canUseHeavyAnimations, config, intensityValue, interactive])

  return (
    <>
      {renderContent}
      {children}
    </>
  )
})

// Simpler version for use in cards
export const PremiumCardGlow = memo(function PremiumCardGlow({
  color = 'rgba(212, 175, 55, 0.15)',
  active = false,
}: {
  color?: string
  active?: boolean
}) {
  const capability = useCapability()

  if (capability.tier === 1 || !active) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: capability.tier === 3 ? 1 : 0.7 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: -20,
        background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
        filter: capability.canUseBlur ? `blur(${capability.blurAmount}px)` : 'none',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
})

export default PremiumBackground
