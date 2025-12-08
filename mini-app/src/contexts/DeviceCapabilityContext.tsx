/**
 * DeviceCapabilityContext - Global access to device capability detection
 *
 * Provides tiered experience settings throughout the app.
 * Use this context to adapt effects based on device performance.
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { useDeviceCapability, DeviceCapability, DeviceTier, TierName } from '../hooks/useDeviceCapability'

interface DeviceCapabilityContextValue extends DeviceCapability {
  // Additional helper methods for components
  getParticleCount: (baseCount: number) => number
  getBlurStyle: (baseBlur: number) => string
  getTransitionDuration: (baseDuration: number) => number
  getShadowStyle: (fullShadow: string, simpleShadow: string) => string
}

const DeviceCapabilityContext = createContext<DeviceCapabilityContextValue | null>(null)

interface DeviceCapabilityProviderProps {
  children: ReactNode
}

export function DeviceCapabilityProvider({ children }: DeviceCapabilityProviderProps) {
  const capability = useDeviceCapability()

  const value = useMemo<DeviceCapabilityContextValue>(() => ({
    ...capability,

    // Scale particle count based on tier
    getParticleCount: (baseCount: number) => {
      if (!capability.canUseParticles) return 0
      const multiplier = capability.tier === 3 ? 1 : capability.tier === 2 ? 0.5 : 0
      return Math.round(baseCount * multiplier)
    },

    // Get blur style or fallback
    getBlurStyle: (baseBlur: number) => {
      if (!capability.canUseBlur) return 'none'
      const blur = capability.tier === 3 ? baseBlur : baseBlur * 0.5
      return `blur(${blur}px)`
    },

    // Adjust transition duration
    getTransitionDuration: (baseDuration: number) => {
      if (capability.prefersReducedMotion) return 0.01
      return baseDuration * capability.animationDuration
    },

    // Get appropriate shadow
    getShadowStyle: (fullShadow: string, simpleShadow: string) => {
      if (capability.shadowComplexity === 'none') return 'none'
      return capability.shadowComplexity === 'full' ? fullShadow : simpleShadow
    },
  }), [capability])

  return (
    <DeviceCapabilityContext.Provider value={value}>
      {children}
    </DeviceCapabilityContext.Provider>
  )
}

export function useDeviceCapabilityContext(): DeviceCapabilityContextValue {
  const context = useContext(DeviceCapabilityContext)
  if (!context) {
    throw new Error('useDeviceCapabilityContext must be used within DeviceCapabilityProvider')
  }
  return context
}

// Convenience hook - works with or without provider (fallback to default)
export function useCapability(): DeviceCapabilityContextValue {
  const context = useContext(DeviceCapabilityContext)

  // If no provider, use the hook directly with default helpers
  const directCapability = useDeviceCapability()

  if (context) return context

  // Provide default implementations when no provider
  return {
    ...directCapability,
    getParticleCount: (baseCount: number) => {
      if (!directCapability.canUseParticles) return 0
      const multiplier = directCapability.tier === 3 ? 1 : directCapability.tier === 2 ? 0.5 : 0
      return Math.round(baseCount * multiplier)
    },
    getBlurStyle: (baseBlur: number) => {
      if (!directCapability.canUseBlur) return 'none'
      const blur = directCapability.tier === 3 ? baseBlur : baseBlur * 0.5
      return `blur(${blur}px)`
    },
    getTransitionDuration: (baseDuration: number) => {
      if (directCapability.prefersReducedMotion) return 0.01
      return baseDuration * directCapability.animationDuration
    },
    getShadowStyle: (fullShadow: string, simpleShadow: string) => {
      if (directCapability.shadowComplexity === 'none') return 'none'
      return directCapability.shadowComplexity === 'full' ? fullShadow : simpleShadow
    },
  }
}

// Type exports
export type { DeviceTier, TierName }
