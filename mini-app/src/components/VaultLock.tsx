import React, { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Sparkles, User } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

// ═══════════════════════════════════════════════════════════════════════════
//  LEGACY VAULT — 3D Mechanical Safe with Gyroscope Parallax
//  Features: User photo integration, LED indicators, 3D perspective
// ═══════════════════════════════════════════════════════════════════════════

interface VaultLockProps {
  isSpinning: boolean
  isOpen: boolean
  resultValue?: string
  userPhotoUrl?: string
}

export const VaultLock = memo(({ isSpinning, isOpen, resultValue, userPhotoUrl }: VaultLockProps) => {
  const { isDark } = useTheme()
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Gyroscope / Mouse parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientY - rect.top - rect.height / 2) / 20
      const y = (e.clientX - rect.left - rect.width / 2) / -20
      setRotation({
        x: Math.max(-15, Math.min(15, x)),
        y: Math.max(-15, Math.min(15, y))
      })
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!e.beta || !e.gamma) return
      const x = (e.beta - 45) * 0.3
      const y = e.gamma * 0.3
      setRotation({
        x: Math.max(-15, Math.min(15, x)),
        y: Math.max(-15, Math.min(15, y))
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  const colors = {
    vaultBg: isDark
      ? 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1e 100%)'
      : 'linear-gradient(145deg, #f5f4f1 0%, #e5e2dc 100%)',
    vaultShadow: isDark
      ? '0 20px 60px rgba(0,0,0,0.7), inset 0 2px 8px rgba(255,255,255,0.08)'
      : '0 12px 40px rgba(120, 85, 40, 0.2), inset 0 2px 4px rgba(255,255,255,0.9)',
    vaultBorder: isDark ? '#4a4a50' : '#c9a02f',
    dialBg: isDark
      ? 'linear-gradient(145deg, #3a3a40, #25252a)'
      : 'linear-gradient(145deg, #e8e6e1, #d5d2cc)',
    dialBorder: isDark ? '#5a5a60' : '#b48e26',
    goldColor: isDark ? '#d4af37' : '#9e7a1a',
    centerBg: isDark
      ? 'linear-gradient(135deg, #d4af37, #8b6914)'
      : 'linear-gradient(135deg, #c9a02f, #8b6914)',
    handleBg: isDark
      ? 'linear-gradient(180deg, #4a4a50, #35353a)'
      : 'linear-gradient(180deg, #d4af37, #9e7a1a)',
  }

  return (
    <div
      ref={containerRef}
      style={{
        perspective: '800px',
        width: 260,
        height: 260,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* User Photo Overlay (Identity Fusion) */}
      {userPhotoUrl && (
        <div
          className="user-photo-overlay"
          style={{
            backgroundImage: `url(${userPhotoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Main Vault Body */}
      <motion.div
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className={isSpinning ? 'vault-spinning' : ''}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 28,
          background: colors.vaultBg,
          boxShadow: colors.vaultShadow,
          border: `1px solid ${colors.vaultBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* LED Indicators */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            display: 'flex',
            gap: 8,
            transform: 'translateZ(10px)',
          }}
        >
          <div
            className="led-indicator"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isSpinning ? '#eab308' : '#3f3f00',
              boxShadow: isSpinning ? '0 0 10px #eab308' : 'none',
              transition: 'all 0.3s',
            }}
          />
          <div
            className="led-indicator"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isOpen ? '#22c55e' : '#0a3f0a',
              boxShadow: isOpen ? '0 0 10px #22c55e' : 'none',
              transition: 'all 0.3s',
            }}
          />
        </div>

        {/* Dial Ring */}
        <div
          className={isSpinning ? 'vault-dial-spinning' : ''}
          style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: colors.dialBg,
            border: `2px solid ${colors.dialBorder}`,
            transform: 'translateZ(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {/* Dial Markings */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 3,
                height: 12,
                background: colors.goldColor,
                borderRadius: 2,
                transformOrigin: '50% 90px',
                transform: `rotate(${i * 30}deg)`,
                boxShadow: `0 0 6px ${colors.goldColor}40`,
              }}
            />
          ))}

          {/* Minor Markings */}
          {[...Array(60)].map((_, i) => {
            if (i % 5 === 0) return null
            return (
              <div
                key={`minor-${i}`}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 6,
                  background: isDark ? '#555' : '#999',
                  transformOrigin: '50% 90px',
                  transform: `rotate(${i * 6}deg)`,
                }}
              />
            )
          })}

          {/* Center Circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: colors.centerBg,
              boxShadow: `inset 0 2px 8px rgba(0,0,0,0.3), 0 0 20px ${colors.goldColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Knurled texture overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'repeating-conic-gradient(transparent 0deg, rgba(0,0,0,0.1) 5deg, transparent 10deg)',
              }}
            />
          </div>
        </div>

        {/* Handle */}
        <motion.div
          className={isOpen ? 'vault-handle-open' : ''}
          style={{
            position: 'absolute',
            zIndex: 20,
            width: 20,
            height: 80,
            background: colors.handleBg,
            borderRadius: 10,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.4)',
            transform: 'translateZ(40px)',
            transformOrigin: 'center center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Handle bar */}
          <div
            style={{
              position: 'absolute',
              width: 60,
              height: 12,
              background: isDark ? '#35353a' : '#b48e26',
              borderRadius: 6,
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
            }}
          />

          {/* Lock icon */}
          {isOpen ? (
            <Unlock size={24} color="#22c55e" style={{ transform: 'rotate(90deg)' }} />
          ) : (
            <Lock size={24} color={colors.goldColor} style={{ transform: 'rotate(90deg)' }} />
          )}
        </motion.div>

        {/* Result Popup (3D Popout) */}
        {isOpen && resultValue && (
          <motion.div
            initial={{ opacity: 0, z: 0, scale: 0.5 }}
            animate={{ opacity: 1, z: 100, scale: 1, y: -130 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            style={{
              position: 'absolute',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '1px solid #d4af37',
              padding: '12px 20px',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.4), 0 10px 40px rgba(0,0,0,0.6)',
              transformStyle: 'preserve-3d',
              zIndex: 50,
            }}
          >
            <Sparkles size={20} color="#d4af37" />
            <span
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {resultValue}
            </span>
          </motion.div>
        )}

        {/* Scanner line during spin */}
        {isSpinning && <div className="scanner-line" />}
      </motion.div>
    </div>
  )
})

VaultLock.displayName = 'VaultLock'
