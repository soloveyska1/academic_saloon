/**
 * SpotlightEffect - Premium Cursor/Touch Following Light
 *
 * Creates a luxurious spotlight effect that follows cursor/touch:
 * - ULTRA: Full spotlight with glow, blur, and smooth spring physics
 * - PREMIUM: Simplified spotlight with less blur
 * - ELEGANT: No spotlight (disabled)
 */

import React, { memo, useRef, useEffect, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

interface SpotlightEffectProps {
  children: React.ReactNode
  color?: string
  size?: number
  intensity?: number
  blur?: number
  spring?: { stiffness?: number; damping?: number }
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// Spotlight overlay component
const SpotlightOverlay = memo(function SpotlightOverlay({
  color,
  size,
  intensity,
  blur,
  spring,
  containerRef,
}: {
  color: string
  size: number
  intensity: number
  blur: number
  spring: { stiffness: number; damping: number }
  containerRef: React.RefObject<HTMLDivElement>
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, spring)
  const springY = useSpring(mouseY, spring)

  // Handle mouse/touch movement
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect()
      let x: number, y: number

      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left
        y = e.touches[0].clientY - rect.top
      } else {
        x = e.clientX - rect.left
        y = e.clientY - rect.top
      }

      mouseX.set(x)
      mouseY.set(y)
    }

    const handleLeave = () => {
      // Move spotlight to center on leave
      const rect = container.getBoundingClientRect()
      mouseX.set(rect.width / 2)
      mouseY.set(rect.height / 2)
    }

    container.addEventListener('mousemove', handleMove, { passive: true })
    container.addEventListener('touchmove', handleMove, { passive: true })
    container.addEventListener('mouseleave', handleLeave)

    // Set initial position to center
    const rect = container.getBoundingClientRect()
    mouseX.set(rect.width / 2)
    mouseY.set(rect.height / 2)

    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('touchmove', handleMove)
      container.removeEventListener('mouseleave', handleLeave)
    }
  }, [containerRef, mouseX, mouseY])

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        opacity: intensity,
        x: springX,
        y: springY,
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: 'none',
        zIndex: 1,
        willChange: 'transform',
      }}
    />
  )
})

// Hover glow effect for cards (simpler, always visible on hover)
const HoverGlow = memo(function HoverGlow({
  color,
  containerRef,
  intensity,
}: {
  color: string
  containerRef: React.RefObject<HTMLDivElement>
  intensity: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const mouseX = useMotionValue(50)
  const mouseY = useMotionValue(50)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleEnter = () => setIsHovered(true)
    const handleLeave = () => setIsHovered(false)

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      mouseX.set(x)
      mouseY.set(y)
    }

    container.addEventListener('mouseenter', handleEnter)
    container.addEventListener('mouseleave', handleLeave)
    container.addEventListener('mousemove', handleMove, { passive: true })

    return () => {
      container.removeEventListener('mouseenter', handleEnter)
      container.removeEventListener('mouseleave', handleLeave)
      container.removeEventListener('mousemove', handleMove)
    }
  }, [containerRef, mouseX, mouseY])

  const backgroundX = useTransform(mouseX, (v) => `${v}%`)
  const backgroundY = useTransform(mouseY, (v) => `${v}%`)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isHovered ? intensity : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        background: useTransform(
          [backgroundX, backgroundY],
          ([x, y]) => `radial-gradient(circle at ${x} ${y}, ${color} 0%, transparent 60%)`
        ),
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
})

export const SpotlightEffect = memo(function SpotlightEffect({
  children,
  color = 'rgba(212, 175, 55, 0.15)',
  size = 300,
  intensity = 0.8,
  blur = 60,
  spring = { stiffness: 100, damping: 30 },
  disabled = false,
  className,
  style,
}: SpotlightEffectProps) {
  const capability = useCapability()
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine if spotlight should be shown
  const showSpotlight = !disabled &&
    capability.canUseHeavyAnimations &&
    !capability.prefersReducedMotion

  // Adjust settings based on tier
  const adjustedBlur = capability.tier === 3 ? blur : blur * 0.5
  const adjustedSize = capability.tier === 3 ? size : size * 0.7
  const adjustedIntensity = capability.tier === 3 ? intensity : intensity * 0.6

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {showSpotlight && (
        <SpotlightOverlay
          color={color}
          size={adjustedSize}
          intensity={adjustedIntensity}
          blur={adjustedBlur}
          spring={spring}
          containerRef={containerRef}
        />
      )}
      {children}
    </div>
  )
})

// Card-specific hover spotlight (simpler, for use in card components)
export const CardSpotlight = memo(function CardSpotlight({
  children,
  color = 'rgba(212, 175, 55, 0.1)',
  intensity = 0.5,
  disabled = false,
  className,
  style,
}: {
  children: React.ReactNode
  color?: string
  intensity?: number
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const capability = useCapability()
  const containerRef = useRef<HTMLDivElement>(null)

  // Only show on Tier 2+
  const showGlow = !disabled && capability.tier >= 2 && !capability.prefersReducedMotion

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {showGlow && (
        <HoverGlow
          color={color}
          containerRef={containerRef}
          intensity={capability.tier === 3 ? intensity : intensity * 0.6}
        />
      )}
      {children}
    </div>
  )
})

// Border gradient that follows mouse
export const GlowBorder = memo(function GlowBorder({
  children,
  color = 'rgba(212, 175, 55, 0.5)',
  width = 1,
  radius = 24,
  className,
  style,
}: {
  children: React.ReactNode
  color?: string
  width?: number
  radius?: number
  className?: string
  style?: React.CSSProperties
}) {
  const capability = useCapability()
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const container = containerRef.current
    if (!container || capability.tier < 2) return

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePos({ x, y })
    }

    container.addEventListener('mousemove', handleMove, { passive: true })
    return () => container.removeEventListener('mousemove', handleMove)
  }, [capability.tier])

  const gradientStyle = capability.tier >= 2
    ? `conic-gradient(from 0deg at ${mousePos.x}% ${mousePos.y}%, ${color}, transparent 60%, transparent 100%)`
    : `linear-gradient(135deg, ${color}, transparent 50%)`

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        borderRadius: radius,
        padding: width,
        background: gradientStyle,
        ...style,
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #141417)',
          borderRadius: radius - width,
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
})

export default SpotlightEffect
