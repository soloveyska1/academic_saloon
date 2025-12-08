/**
 * useDeviceCapability - Smart Device Detection for Tiered Premium Experience
 *
 * Determines device capability tier for adaptive premium effects:
 * - TIER 3 (ULTRA): High-end devices - all effects maxed
 * - TIER 2 (PREMIUM): Mid-range - balanced effects
 * - TIER 1 (ELEGANT): Low-end / reduced motion - minimal but still beautiful
 *
 * Detection factors:
 * - Hardware concurrency (CPU cores)
 * - Device memory (if available)
 * - Screen refresh rate hints
 * - User preference (reduced motion)
 * - Connection quality
 * - GPU capability estimation
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

export type DeviceTier = 1 | 2 | 3
export type TierName = 'elegant' | 'premium' | 'ultra'

export interface DeviceCapability {
  tier: DeviceTier
  tierName: TierName

  // Specific capabilities
  canUseHeavyAnimations: boolean
  canUseParticles: boolean
  canUseBlur: boolean
  canUse3D: boolean
  canUseWebGL: boolean

  // Recommended settings
  particleCount: number
  animationDuration: number // multiplier (1 = normal, 1.5 = slower)
  blurAmount: number // px
  shadowComplexity: 'none' | 'simple' | 'full'

  // Raw metrics
  cpuCores: number
  memoryGB: number | null
  prefersReducedMotion: boolean
  isLowEndDevice: boolean
  isMobile: boolean

  // Methods
  shouldAnimate: (type: 'essential' | 'decorative' | 'heavy') => boolean
}

// Feature detection utilities
function getCPUCores(): number {
  return navigator.hardwareConcurrency || 4
}

function getDeviceMemory(): number | null {
  // @ts-ignore - deviceMemory is not in standard types
  return navigator.deviceMemory || null
}

function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function checkLowEndDevice(): boolean {
  const cores = getCPUCores()
  const memory = getDeviceMemory()

  // Low-end heuristics
  if (cores <= 2) return true
  if (memory !== null && memory <= 2) return true

  // Check for slow connection
  // @ts-ignore - connection is not in standard types
  const connection = navigator.connection
  if (connection) {
    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true
    if (connection.saveData) return true
  }

  return false
}

function checkIsMobile(): boolean {
  if (typeof window === 'undefined') return false

  // Check for touch capability and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.innerWidth <= 768

  // Check user agent for mobile indicators
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return (hasTouch && isSmallScreen) || mobileUA
}

function estimateGPUCapability(): 'low' | 'medium' | 'high' {
  if (typeof window === 'undefined') return 'medium'

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

    if (!gl) return 'low'

    // @ts-ignore
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      // @ts-ignore
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

      // Check for integrated/low-end GPU indicators
      if (/Intel|Mali-4|Adreno [1-3]/i.test(renderer)) return 'medium'
      if (/SwiftShader|llvmpipe/i.test(renderer)) return 'low'

      // High-end indicators
      if (/NVIDIA|AMD|Radeon|GeForce|Apple GPU|Mali-G/i.test(renderer)) return 'high'
    }

    return 'medium'
  } catch {
    return 'medium'
  }
}

function determineTier(
  cpuCores: number,
  memoryGB: number | null,
  reducedMotion: boolean,
  isLowEnd: boolean,
  gpuCapability: 'low' | 'medium' | 'high'
): DeviceTier {
  // User preference takes highest priority
  if (reducedMotion) return 1

  // Definite low-end
  if (isLowEnd) return 1
  if (gpuCapability === 'low') return 1

  // Score-based determination
  let score = 0

  // CPU scoring (0-3)
  if (cpuCores >= 8) score += 3
  else if (cpuCores >= 6) score += 2
  else if (cpuCores >= 4) score += 1

  // Memory scoring (0-3)
  if (memoryGB !== null) {
    if (memoryGB >= 8) score += 3
    else if (memoryGB >= 4) score += 2
    else if (memoryGB >= 3) score += 1
  } else {
    score += 1.5 // Unknown memory, assume mid
  }

  // GPU scoring (0-3)
  if (gpuCapability === 'high') score += 3
  else if (gpuCapability === 'medium') score += 1.5

  // Determine tier based on score
  if (score >= 7) return 3 // Ultra
  if (score >= 4) return 2 // Premium
  return 1 // Elegant
}

// Tier-specific configurations
const TIER_CONFIG: Record<DeviceTier, {
  particleCount: number
  animationDuration: number
  blurAmount: number
  shadowComplexity: 'none' | 'simple' | 'full'
}> = {
  1: {
    particleCount: 0,
    animationDuration: 0.01, // Essentially instant for reduced motion
    blurAmount: 0,
    shadowComplexity: 'simple',
  },
  2: {
    particleCount: 15,
    animationDuration: 1,
    blurAmount: 12,
    shadowComplexity: 'full',
  },
  3: {
    particleCount: 30,
    animationDuration: 1,
    blurAmount: 24,
    shadowComplexity: 'full',
  },
}

const TIER_NAMES: Record<DeviceTier, TierName> = {
  1: 'elegant',
  2: 'premium',
  3: 'ultra',
}

/**
 * Main hook for device capability detection
 */
export function useDeviceCapability(): DeviceCapability {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => checkReducedMotion())

  // Listen for reduced motion preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Memoize device detection (only runs once)
  const deviceMetrics = useMemo(() => {
    const cpuCores = getCPUCores()
    const memoryGB = getDeviceMemory()
    const isLowEndDevice = checkLowEndDevice()
    const isMobile = checkIsMobile()
    const gpuCapability = estimateGPUCapability()

    return {
      cpuCores,
      memoryGB,
      isLowEndDevice,
      isMobile,
      gpuCapability,
    }
  }, [])

  // Determine tier (reactive to reduced motion changes)
  const tier = useMemo(() => {
    return determineTier(
      deviceMetrics.cpuCores,
      deviceMetrics.memoryGB,
      prefersReducedMotion,
      deviceMetrics.isLowEndDevice,
      deviceMetrics.gpuCapability
    )
  }, [deviceMetrics, prefersReducedMotion])

  const config = TIER_CONFIG[tier]

  // Animation decision helper
  const shouldAnimate = useCallback((type: 'essential' | 'decorative' | 'heavy'): boolean => {
    if (prefersReducedMotion) return type === 'essential'

    switch (tier) {
      case 1:
        return type === 'essential'
      case 2:
        return type !== 'heavy'
      case 3:
        return true
      default:
        return false
    }
  }, [tier, prefersReducedMotion])

  return useMemo(() => ({
    tier,
    tierName: TIER_NAMES[tier],

    // Capability flags
    canUseHeavyAnimations: tier >= 3,
    canUseParticles: tier >= 2,
    canUseBlur: tier >= 2,
    canUse3D: tier >= 2,
    canUseWebGL: tier >= 3 && deviceMetrics.gpuCapability !== 'low',

    // Recommended settings
    particleCount: config.particleCount,
    animationDuration: prefersReducedMotion ? 0.01 : config.animationDuration,
    blurAmount: config.blurAmount,
    shadowComplexity: config.shadowComplexity,

    // Raw metrics
    cpuCores: deviceMetrics.cpuCores,
    memoryGB: deviceMetrics.memoryGB,
    prefersReducedMotion,
    isLowEndDevice: deviceMetrics.isLowEndDevice,
    isMobile: deviceMetrics.isMobile,

    // Methods
    shouldAnimate,
  }), [tier, config, deviceMetrics, prefersReducedMotion, shouldAnimate])
}

/**
 * Standalone hook for just reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => checkReducedMotion())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Helper to get motion-safe animation props for Framer Motion
 */
export function useMotionSafe() {
  const { shouldAnimate, animationDuration, prefersReducedMotion } = useDeviceCapability()

  return useMemo(() => ({
    // Use these props directly on motion components
    transition: prefersReducedMotion
      ? { duration: 0 }
      : undefined,

    // Helper to conditionally apply animations
    animate: (animation: object, type: 'essential' | 'decorative' | 'heavy' = 'decorative') =>
      shouldAnimate(type) ? animation : {},

    // Helper for infinite animations (disable on reduced motion)
    infiniteAnimation: (animation: object) =>
      prefersReducedMotion ? {} : { ...animation, transition: { repeat: Infinity } },

    // Duration multiplier
    duration: (base: number) => base * animationDuration,
  }), [shouldAnimate, animationDuration, prefersReducedMotion])
}
