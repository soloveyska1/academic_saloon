import { motion } from 'framer-motion'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

/* ═══════════════════════════════════════════════════════════════════════════
   AURORA BACKGROUND — Ambient gradient mesh behind the wizard

   Three soft blobs drift slowly:
   - Gold (primary) — top-right, 20s cycle
   - Blue (cool) — bottom-left, 25s cycle
   - Amber (accent) — center, 15s cycle

   Opacity kept extremely low (0.015–0.03) to be subliminal.
   Only renders on tier 2+ devices (GPU-capable).
   Used by: Telegram Premium, Linear, Apple Music.
   ═══════════════════════════════════════════════════════════════════════════ */

export function AuroraBackground() {
  const { tier } = useCapability()

  // Skip on low-end devices
  if (tier < 2) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Primary — gold, slow drift top-right */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-25%',
          width: '75vw',
          height: '75vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.025) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Secondary — cool blue, counter-drift bottom-left */}
      <motion.div
        animate={{
          x: [0, -20, 15, 0],
          y: [0, 25, -20, 0],
          scale: [1, 0.88, 1.08, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-20%',
          width: '65vw',
          height: '65vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100, 130, 180, 0.018) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Tertiary — amber accent, smaller, faster */}
      <motion.div
        animate={{
          x: [0, 35, -25, 0],
          y: [0, -15, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '35%',
          left: '45%',
          width: '35vw',
          height: '35vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 230, 163, 0.012) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}
