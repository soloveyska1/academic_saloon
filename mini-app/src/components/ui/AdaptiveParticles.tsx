/**
 * AdaptiveParticles - Performance-Optimized Particle System
 *
 * Provides luxurious floating particles that adapt to device capability:
 * - ULTRA: Canvas-based with glow effects and smooth motion
 * - PREMIUM: CSS-based particles with optimized animations
 * - ELEGANT: Static shimmer overlay (no particles)
 */

import React, { memo, useRef, useEffect, useMemo, useCallback } from 'react'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

interface AdaptiveParticlesProps {
  color?: string
  secondaryColor?: string
  count?: number // Base count, will be adjusted by tier
  speed?: number
  minSize?: number
  maxSize?: number
  glow?: boolean
  className?: string
  style?: React.CSSProperties
}

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  pulseOffset: number
}

// Canvas-based particles for Tier 3
const CanvasParticles = memo(function CanvasParticles({
  color = 'rgba(212, 175, 55, 1)',
  secondaryColor = 'rgba(251, 245, 183, 1)',
  count,
  speed = 0.3,
  minSize = 2,
  maxSize = 4,
  glow = true,
}: AdaptiveParticlesProps & { count: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width
    canvas.height = height

    // Create particles
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: minSize + Math.random() * (maxSize - minSize),
      speedX: (Math.random() - 0.5) * speed,
      speedY: (Math.random() - 0.5) * speed,
      opacity: 0.3 + Math.random() * 0.5,
      pulseOffset: Math.random() * Math.PI * 2,
    }))

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [count, minSize, maxSize, speed])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (currentTime: number) => {
      // Limit to ~30fps for performance
      if (currentTime - lastTimeRef.current < 33) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTimeRef.current = currentTime

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Update and draw particles
      particlesRef.current.forEach((p, i) => {
        // Update position
        p.x += p.speedX
        p.y += p.speedY

        // Wrap around edges
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10

        // Pulsing opacity
        const time = currentTime * 0.001
        const pulse = Math.sin(time + p.pulseOffset) * 0.3 + 0.7
        const currentOpacity = p.opacity * pulse

        // Draw particle
        if (glow) {
          // Glow effect
          const gradient = ctx.createRadialGradient(
            p.x, p.y, 0,
            p.x, p.y, p.size * 3
          )
          gradient.addColorStop(0, color.replace('1)', `${currentOpacity})`))
          gradient.addColorStop(0.4, secondaryColor.replace('1)', `${currentOpacity * 0.5})`))
          gradient.addColorStop(1, 'transparent')

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Core particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = color.replace('1)', `${currentOpacity})`)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [color, secondaryColor, glow])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
})

// CSS-based particles for Tier 2
const CSSParticles = memo(function CSSParticles({
  color = 'rgba(212, 175, 55, 0.6)',
  count,
  minSize = 2,
  maxSize = 4,
}: AdaptiveParticlesProps & { count: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${5 + (i * 13) % 90}%`,
      top: `${10 + (i * 17) % 80}%`,
      size: minSize + (i % 3) * ((maxSize - minSize) / 2),
      delay: `${(i * 0.7) % 5}s`,
      duration: `${6 + (i % 4)}s`,
    }))
  }, [count, minSize, maxSize])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="floating-particle"
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animation: `float-particle ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-15px) scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
})

// Static shimmer for Tier 1
const StaticShimmer = memo(function StaticShimmer({
  color = 'rgba(212, 175, 55, 0.05)',
}: { color?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: `
          radial-gradient(ellipse 50% 30% at 20% 20%, ${color} 0%, transparent 50%),
          radial-gradient(ellipse 40% 40% at 80% 70%, ${color} 0%, transparent 50%),
          radial-gradient(ellipse 60% 25% at 50% 90%, ${color} 0%, transparent 50%)
        `,
      }}
    />
  )
})

export const AdaptiveParticles = memo(function AdaptiveParticles(props: AdaptiveParticlesProps) {
  const capability = useCapability()
  const { count: baseCount = 30, className, style, ...rest } = props

  // Adjust particle count based on tier
  const adjustedCount = capability.getParticleCount(baseCount)

  // Render appropriate component based on tier
  if (capability.tier === 1 || adjustedCount === 0) {
    return <StaticShimmer color={props.color?.replace('1)', '0.05)')} />
  }

  if (capability.tier === 2) {
    return <CSSParticles count={adjustedCount} {...rest} />
  }

  return <CanvasParticles count={adjustedCount} {...rest} />
})

// Simplified floating gold particles (drop-in replacement for existing FloatingParticles)
export const FloatingGoldParticles = memo(function FloatingGoldParticles({
  count = 8,
}: { count?: number }) {
  const capability = useCapability()
  const adjustedCount = capability.getParticleCount(count)

  // Tier 1: No particles
  if (adjustedCount === 0) {
    return null
  }

  const particles = useMemo(() => {
    return Array.from({ length: adjustedCount }, (_, i) => ({
      id: i,
      left: `${10 + (i * 12) % 80}%`,
      top: `${15 + (i * 15) % 70}%`,
      delay: `${i * 0.9}s`,
      size: 2 + (i % 2),
      duration: 8 + (i % 3),
    }))
  }, [adjustedCount])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="gold-particle"
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.8) 0%, rgba(212,175,55,0.3) 50%, transparent 70%)',
            boxShadow: '0 0 6px rgba(212,175,55,0.5)',
            animation: `gold-float ${p.duration}s ease-in-out infinite`,
            animationDelay: p.delay,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      <style>{`
        @keyframes gold-float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.5;
          }
          25% {
            transform: translateY(-8px) translateX(4px) scale(1.05);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-12px) translateX(0) scale(1.1);
            opacity: 0.9;
          }
          75% {
            transform: translateY(-6px) translateX(-4px) scale(1.05);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
})

export default AdaptiveParticles
