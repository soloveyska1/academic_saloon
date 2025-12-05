import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Lock, Unlock, Sparkles } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useSound } from '../hooks/useSound'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM VAULT LOCK — 3D Parallax with Gyroscope Support
//  Mechanical animations, real physics, premium haptics
// ═══════════════════════════════════════════════════════════════════════════

interface VaultLockProps {
  isSpinning: boolean
  isOpen: boolean
  onOpenComplete?: () => void
  prizeValue?: number
  isJackpot?: boolean
}

// Vault dial markings
const DIAL_MARKINGS = Array.from({ length: 60 }, (_, i) => i)
const MAJOR_MARKINGS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export const VaultLock = React.memo(({
  isSpinning,
  isOpen,
  onOpenComplete,
  prizeValue,
  isJackpot,
}: VaultLockProps) => {
  const { isDark } = useTheme()
  const sound = useSound()

  // Motion values for 3D effect
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const dialRotation = useMotionValue(0)
  const handleRotation = useMotionValue(0)

  // Transform 3D perspective
  const transform = useTransform(
    [rotateX, rotateY],
    ([x, y]) => `perspective(800px) rotateX(${x}deg) rotateY(${y}deg)`
  )

  // Gyroscope support
  const [hasGyroscope, setHasGyroscope] = useState(false)
  const gyroPermissionRef = useRef(false)

  // Request gyroscope permission (iOS 13+)
  const requestGyroscope = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        gyroPermissionRef.current = permission === 'granted'
        setHasGyroscope(permission === 'granted')
      } catch {
        // Permission denied or error
      }
    } else {
      // Non-iOS or older iOS - gyro might work without permission
      setHasGyroscope(true)
      gyroPermissionRef.current = true
    }
  }, [])

  // Handle device orientation
  useEffect(() => {
    requestGyroscope()

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!gyroPermissionRef.current) return

      const gamma = e.gamma || 0 // Left-right tilt (-90 to 90)
      const beta = e.beta || 0   // Front-back tilt (-180 to 180)

      // Clamp values for smooth parallax
      const clampedX = Math.max(-15, Math.min(15, (beta - 45) * 0.3))
      const clampedY = Math.max(-15, Math.min(15, gamma * 0.3))

      rotateX.set(clampedX)
      rotateY.set(clampedY)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [rotateX, rotateY, requestGyroscope])

  // Fallback: mouse/touch parallax
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (hasGyroscope) return // Prefer gyroscope when available

    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const x = (e.clientY - centerY) / rect.height * 20
    const y = (e.clientX - centerX) / rect.width * -20

    rotateX.set(Math.max(-15, Math.min(15, x)))
    rotateY.set(Math.max(-15, Math.min(15, y)))
  }, [hasGyroscope, rotateX, rotateY])

  const handlePointerLeave = useCallback(() => {
    if (hasGyroscope) return

    animate(rotateX, 0, { duration: 0.5, ease: 'easeOut' })
    animate(rotateY, 0, { duration: 0.5, ease: 'easeOut' })
  }, [hasGyroscope, rotateX, rotateY])

  // Spinning animation for dial
  useEffect(() => {
    if (isSpinning) {
      sound.play('spin_start')

      // Dial spins with easing
      const dialAnim = animate(dialRotation, [0, 360 * 5], {
        duration: 3,
        ease: [0.25, 0.1, 0.25, 1],
        onUpdate: (value) => {
          // Play tick sound at intervals
          if (Math.floor(value) % 30 === 0) {
            sound.play('tick')
          }
        },
        onComplete: () => {
          sound.play('latch')
        }
      })

      return () => dialAnim.stop()
    }
  }, [isSpinning, dialRotation, sound])

  // Opening animation for handle
  useEffect(() => {
    if (isOpen) {
      sound.play('open')

      // Handle rotates down
      animate(handleRotation, 90, {
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1], // Spring overshoot
        onComplete: () => {
          if (isJackpot) {
            sound.play('jackpot')
          } else if (prizeValue && prizeValue > 0) {
            sound.play('win')
          }
          onOpenComplete?.()
        }
      })
    } else {
      animate(handleRotation, 0, { duration: 0.3 })
    }
  }, [isOpen, handleRotation, onOpenComplete, isJackpot, prizeValue, sound])

  // Theme-aware colors
  const colors = {
    vaultBody: isDark
      ? 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 100%)'
      : 'linear-gradient(145deg, #f5f4f1 0%, #e5e2dc 100%)',
    vaultBorder: isDark ? '#4a4a50' : '#c9a02f',
    vaultShadow: isDark
      ? '0 20px 60px rgba(0, 0, 0, 0.7), inset 0 2px 8px rgba(255,255,255,0.08)'
      : '0 12px 40px rgba(120, 85, 40, 0.2), inset 0 2px 4px rgba(255,255,255,0.9)',
    dialBg: isDark
      ? 'linear-gradient(145deg, #3a3a40, #25252a)'
      : 'linear-gradient(145deg, #e8e6e1, #d5d2cc)',
    dialBorder: isDark ? '#5a5a60' : '#b48e26',
    goldColor: isDark ? '#d4af37' : '#9e7a1a',
    goldGlow: isDark
      ? 'rgba(212, 175, 55, 0.4)'
      : 'rgba(180, 142, 38, 0.3)',
    markingColor: isDark ? '#6a6a70' : '#8a7a6a',
    handleBg: isDark
      ? 'linear-gradient(180deg, #4a4a50, #35353a)'
      : 'linear-gradient(180deg, #d4af37, #9e7a1a)',
    handleShadow: isDark
      ? 'inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)'
      : 'inset 0 2px 4px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.2)',
    centerBg: isDark
      ? 'radial-gradient(circle, #3a3a40, #25252a)'
      : 'radial-gradient(circle, #d4af37, #9e7a1a)',
    prizeText: isDark ? '#d4af37' : '#6b4f0f',
  }

  return (
    <motion.div
      style={{
        position: 'relative',
        width: 220,
        height: 220,
        margin: '0 auto 32px',
        transformStyle: 'preserve-3d',
        transform,
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Ambient glow */}
      <motion.div
        animate={{
          opacity: isSpinning ? [0.3, 0.7, 0.3] : 0.2,
          scale: isSpinning ? [1, 1.15, 1] : 1,
        }}
        transition={{
          duration: 0.8,
          repeat: isSpinning ? Infinity : 0,
        }}
        style={{
          position: 'absolute',
          inset: -50,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.goldGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Vault body */}
      <motion.div
        animate={isSpinning ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.3, repeat: isSpinning ? Infinity : 0 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 28,
          background: colors.vaultBody,
          border: `4px solid ${colors.vaultBorder}`,
          boxShadow: colors.vaultShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Dial ring */}
        <motion.div
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: colors.dialBg,
            border: `3px solid ${colors.dialBorder}`,
            boxShadow: `inset 0 4px 12px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            rotate: dialRotation,
          }}
        >
          {/* Dial markings */}
          {DIAL_MARKINGS.map((i) => {
            const isMajor = MAJOR_MARKINGS.includes(i)
            const angle = (i / 60) * 360 - 90

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: isMajor ? 3 : 1,
                  height: isMajor ? 14 : 8,
                  background: isMajor ? colors.goldColor : colors.markingColor,
                  borderRadius: 1,
                  transform: `rotate(${angle}deg) translateY(-65px)`,
                  transformOrigin: '50% 50%',
                  boxShadow: isMajor ? `0 0 6px ${colors.goldGlow}` : 'none',
                }}
              />
            )
          })}

          {/* Center hub */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: colors.centerBg,
              border: `2px solid ${colors.dialBorder}`,
              boxShadow: `inset 0 2px 8px rgba(0,0,0,0.3), 0 0 20px ${colors.goldGlow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Lock/Prize display */}
            {isOpen && prizeValue !== undefined ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {prizeValue > 0 ? (
                  <>
                    <Sparkles size={20} color="#fff" />
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#fff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}>
                      {prizeValue.toLocaleString('ru-RU')}₽
                    </span>
                  </>
                ) : (
                  <span style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    Пусто
                  </span>
                )}
              </motion.div>
            ) : (
              <motion.div
                animate={isSpinning ? { rotate: 360 } : {}}
                transition={{
                  duration: 2,
                  repeat: isSpinning ? Infinity : 0,
                  ease: 'linear',
                }}
              >
                {isOpen ? (
                  <Unlock size={32} color="#22c55e" strokeWidth={1.5} />
                ) : (
                  <Lock size={32} color="#fff" strokeWidth={1.5} />
                )}
              </motion.div>
            )}

            {/* Handle (for opening) */}
            <motion.div
              style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                width: 12,
                height: 45,
                marginLeft: -6,
                borderRadius: 6,
                background: colors.handleBg,
                boxShadow: colors.handleShadow,
                transformOrigin: '50% 100%',
                rotate: handleRotation,
              }}
            >
              {/* Handle knob */}
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  marginLeft: -10,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: colors.handleBg,
                  boxShadow: colors.handleShadow,
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating particles during spin/jackpot */}
      {(isSpinning || isJackpot) && (
        <>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 0.9, 0.3],
                scale: [0.8, 1.3, 0.8],
                y: isJackpot ? [0, -30, 0] : 0,
              }}
              transition={{
                duration: isJackpot ? 1 : 0.6,
                delay: i * 0.1,
                repeat: Infinity,
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: isJackpot ? 10 : 6,
                height: isJackpot ? 10 : 6,
                borderRadius: '50%',
                background: colors.goldColor,
                boxShadow: `0 0 12px ${colors.goldGlow}`,
                transform: `rotate(${angle}deg) translateY(-120px)`,
              }}
            />
          ))}
        </>
      )}

      {/* Jackpot rays */}
      {isJackpot && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5], rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: -80,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent, ${colors.goldGlow}, transparent, ${colors.goldGlow}, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  )
})

VaultLock.displayName = 'VaultLock'
