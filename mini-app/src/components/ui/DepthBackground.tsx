import { memo, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════════════════
//  DEPTH BACKGROUND — Multi-layer Parallax with Blur
//  Creates the "floating in space" premium feeling
// ═══════════════════════════════════════════════════════════════════════════

interface DepthBackgroundProps {
  enableGyro?: boolean
  intensity?: 'subtle' | 'medium' | 'intense'
}

const INTENSITY_CONFIG = {
  subtle: { parallax: 10, blur: 60, opacity: 0.4 },
  medium: { parallax: 20, blur: 40, opacity: 0.6 },
  intense: { parallax: 30, blur: 30, opacity: 0.8 },
}

export const DepthBackground = memo(function DepthBackground({
  enableGyro = true,
  intensity = 'medium',
}: DepthBackgroundProps) {
  const config = INTENSITY_CONFIG[intensity]

  // Motion values for gyroscope/mouse movement
  const gyroX = useMotionValue(0)
  const gyroY = useMotionValue(0)

  // Smooth springs
  const smoothX = useSpring(gyroX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(gyroY, { stiffness: 50, damping: 20 })

  // Transform for each layer (different speeds for parallax)
  const layer1X = useTransform(smoothX, v => v * config.parallax * 0.3)
  const layer1Y = useTransform(smoothY, v => v * config.parallax * 0.3)
  const layer2X = useTransform(smoothX, v => v * config.parallax * 0.6)
  const layer2Y = useTransform(smoothY, v => v * config.parallax * 0.6)
  const layer3X = useTransform(smoothX, v => v * config.parallax * 1.0)
  const layer3Y = useTransform(smoothY, v => v * config.parallax * 1.0)

  // Gyroscope handler
  useEffect(() => {
    if (!enableGyro) return

    let gyroEnabled = false

    const handleOrientation = (e: DeviceOrientationEvent) => {
      try {
        const gamma = (e.gamma || 0) / 45 // -1 to 1
        const beta = ((e.beta || 0) - 45) / 45 // Normalize around 45 degrees
        gyroX.set(gamma)
        gyroY.set(beta)
      } catch {
        // Ignore orientation errors
      }
    }

    // Setup gyroscope - DON'T auto-request permission on iOS (causes crashes)
    const setupGyroscope = () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined') {
          // Check if requestPermission exists (iOS 13+)
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            // On iOS, permission must be requested by user gesture
            // Skip gyroscope on iOS - just use mouse fallback
            gyroEnabled = false
          } else {
            // Non-iOS devices don't need permission
            gyroEnabled = true
            window.addEventListener('deviceorientation', handleOrientation)
          }
        }
      } catch {
        gyroEnabled = false
      }
    }

    setupGyroscope()

    // Mouse fallback for desktop (works everywhere)
    const handleMouseMove = (e: MouseEvent) => {
      try {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        gyroX.set(x * 0.5)
        gyroY.set(y * 0.5)
      } catch {
        // Ignore mouse errors
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      try {
        if (gyroEnabled) {
          window.removeEventListener('deviceorientation', handleOrientation)
        }
        window.removeEventListener('mousemove', handleMouseMove)
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [enableGyro, gyroX, gyroY])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {/* Layer 1: Deep background — Large blurred orbs */}
      <motion.div
        style={{
          x: layer1X,
          y: layer1Y,
          position: 'absolute',
          inset: '-20%',
        }}
      >
        {/* Gold orb top-left */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '10%',
            width: '40vw',
            height: '40vw',
            maxWidth: 400,
            maxHeight: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
            filter: `blur(${config.blur * 1.5}px)`,
            opacity: config.opacity * 0.6,
          }}
        />

        {/* Purple orb bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            right: '5%',
            width: '35vw',
            height: '35vw',
            maxWidth: 350,
            maxHeight: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
            filter: `blur(${config.blur * 1.5}px)`,
            opacity: config.opacity * 0.4,
          }}
        />
      </motion.div>

      {/* Layer 2: Mid-ground — Medium orbs */}
      <motion.div
        style={{
          x: layer2X,
          y: layer2Y,
          position: 'absolute',
          inset: '-10%',
        }}
      >
        {/* Gold accent center-right */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '20%',
            width: '25vw',
            height: '25vw',
            maxWidth: 250,
            maxHeight: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 60%)',
            filter: `blur(${config.blur}px)`,
            opacity: config.opacity * 0.8,
          }}
        />

        {/* Blue accent bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '35%',
            left: '15%',
            width: '20vw',
            height: '20vw',
            maxWidth: 200,
            maxHeight: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)',
            filter: `blur(${config.blur}px)`,
            opacity: config.opacity * 0.5,
          }}
        />
      </motion.div>

      {/* Layer 3: Foreground — Small bright accents */}
      <motion.div
        style={{
          x: layer3X,
          y: layer3Y,
          position: 'absolute',
          inset: 0,
        }}
      >
        {/* Bright gold spark */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            right: '30%',
            width: '15vw',
            height: '15vw',
            maxWidth: 150,
            maxHeight: 150,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,245,183,0.2) 0%, rgba(212,175,55,0.1) 40%, transparent 70%)',
            filter: `blur(${config.blur * 0.5}px)`,
            opacity: config.opacity,
          }}
        />

        {/* Warm accent bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            left: '40%',
            width: '12vw',
            height: '12vw',
            maxWidth: 120,
            maxHeight: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,200,100,0.15) 0%, transparent 60%)',
            filter: `blur(${config.blur * 0.5}px)`,
            opacity: config.opacity * 0.7,
          }}
        />
      </motion.div>

      {/* Animated aurora streaks */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(
              45deg,
              transparent 0%,
              rgba(212,175,55,0.03) 25%,
              transparent 50%,
              rgba(139,92,246,0.02) 75%,
              transparent 100%
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'aurora-drift 15s ease-in-out infinite',
          opacity: config.opacity * 0.5,
        }}
      />

      {/* Noise texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.5,
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  CSS KEYFRAMES (add to global.css)
// ═══════════════════════════════════════════════════════════════════════════

/*
@keyframes aurora-drift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
*/
