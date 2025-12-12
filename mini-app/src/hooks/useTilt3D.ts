import { useEffect, useRef, useState, useCallback } from 'react'

interface Tilt3DState {
  rotateX: number
  rotateY: number
  scale: number
  shine: { x: number; y: number }
}

interface UseTilt3DOptions {
  maxTilt?: number        // Maximum tilt angle in degrees
  scale?: number          // Scale on hover/touch
  speed?: number          // Transition speed in ms
  glareOpacity?: number   // Shine/glare effect opacity
  gyroscope?: boolean     // Enable gyroscope on mobile
  disabled?: boolean      // Disable the effect
}

const defaultOptions: UseTilt3DOptions = {
  maxTilt: 15,
  scale: 1.02,
  speed: 400,
  glareOpacity: 0.2,
  gyroscope: true,
  disabled: false,
}

export function useTilt3D<T extends HTMLElement>(options: UseTilt3DOptions = {}) {
  const opts = { ...defaultOptions, ...options }
  const ref = useRef<T>(null)
  const [state, setState] = useState<Tilt3DState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    shine: { x: 50, y: 50 },
  })
  const [isActive, setIsActive] = useState(false)
  const requestRef = useRef<number>()
  const gyroPermissionRef = useRef<boolean>(false)

  // Calculate tilt from position
  const calculateTilt = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const percentX = (clientX - centerX) / (rect.width / 2)
    const percentY = (clientY - centerY) / (rect.height / 2)

    const rotateX = -percentY * opts.maxTilt!
    const rotateY = percentX * opts.maxTilt!

    // Shine position (0-100)
    const shineX = ((clientX - rect.left) / rect.width) * 100
    const shineY = ((clientY - rect.top) / rect.height) * 100

    return { rotateX, rotateY, shineX, shineY }
  }, [opts.maxTilt])

  // Mouse handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (opts.disabled || !ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const { rotateX, rotateY, shineX, shineY } = calculateTilt(e.clientX, e.clientY, rect)

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
    }

    requestRef.current = requestAnimationFrame(() => {
      setState({
        rotateX,
        rotateY,
        scale: opts.scale!,
        shine: { x: shineX, y: shineY },
      })
    })
  }, [calculateTilt, opts.disabled, opts.scale])

  const handleMouseEnter = useCallback(() => {
    if (opts.disabled) return
    setIsActive(true)
  }, [opts.disabled])

  const handleMouseLeave = useCallback(() => {
    if (opts.disabled) return
    setIsActive(false)
    setState({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      shine: { x: 50, y: 50 },
    })
  }, [opts.disabled])

  // Touch handlers
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (opts.disabled || !ref.current || e.touches.length === 0) return

    const touch = e.touches[0]
    const rect = ref.current.getBoundingClientRect()
    const { rotateX, rotateY, shineX, shineY } = calculateTilt(touch.clientX, touch.clientY, rect)

    setState({
      rotateX: rotateX * 0.6, // Reduce intensity for touch
      rotateY: rotateY * 0.6,
      scale: opts.scale!,
      shine: { x: shineX, y: shineY },
    })
  }, [calculateTilt, opts.disabled, opts.scale])

  const handleTouchStart = useCallback(() => {
    if (opts.disabled) return
    setIsActive(true)
  }, [opts.disabled])

  const handleTouchEnd = useCallback(() => {
    if (opts.disabled) return
    setIsActive(false)
    setState({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      shine: { x: 50, y: 50 },
    })
  }, [opts.disabled])

  // Gyroscope handler
  const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (opts.disabled || !opts.gyroscope || !gyroPermissionRef.current) return

    const gamma = e.gamma || 0 // Left-right tilt (-90 to 90)
    const beta = e.beta || 0   // Front-back tilt (-180 to 180)

    // Normalize to -1 to 1 range and apply max tilt
    const rotateY = (gamma / 45) * opts.maxTilt! * 0.5
    const rotateX = ((beta - 45) / 45) * opts.maxTilt! * 0.5 // 45 is "neutral" phone angle

    // Clamp values
    const clampedRotateX = Math.max(-opts.maxTilt!, Math.min(opts.maxTilt!, rotateX))
    const clampedRotateY = Math.max(-opts.maxTilt!, Math.min(opts.maxTilt!, rotateY))

    // Shine follows tilt
    const shineX = 50 + (clampedRotateY / opts.maxTilt!) * 30
    const shineY = 50 + (clampedRotateX / opts.maxTilt!) * 30

    setState(prev => ({
      ...prev,
      rotateX: clampedRotateX,
      rotateY: clampedRotateY,
      shine: { x: shineX, y: shineY },
    }))
  }, [opts.disabled, opts.gyroscope, opts.maxTilt])

  // Request gyroscope permission on iOS
  const requestGyroPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        gyroPermissionRef.current = permission === 'granted'
      } catch {
        gyroPermissionRef.current = false
      }
    } else {
      // Non-iOS devices don't need permission
      gyroPermissionRef.current = true
    }
  }, [])

  // Setup event listeners
  useEffect(() => {
    const element = ref.current
    if (!element || opts.disabled) return

    // Mouse events
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    // Touch events
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, handleTouchMove, handleTouchStart, handleTouchEnd, opts.disabled])

  // Setup gyroscope
  useEffect(() => {
    if (!opts.gyroscope || opts.disabled) return

    // Don't auto-request permission on iOS - it must be triggered by user gesture
    // Just check if we already have permission or if it's not iOS
    const setupGyroscope = () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined') {
          // Check if requestPermission exists (iOS 13+)
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            // On iOS, we can't auto-request. User must tap something first.
            // Just don't enable gyroscope by default on iOS
            gyroPermissionRef.current = false
          } else {
            // Non-iOS devices don't need permission
            gyroPermissionRef.current = true
            window.addEventListener('deviceorientation', handleDeviceOrientation)
          }
        }
      } catch {
        gyroPermissionRef.current = false
      }
    }

    setupGyroscope()

    return () => {
      try {
        window.removeEventListener('deviceorientation', handleDeviceOrientation)
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [opts.gyroscope, opts.disabled, handleDeviceOrientation])

  // CSS styles for the element
  const style: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg) scale(${state.scale})`,
    transition: isActive ? `transform ${opts.speed! * 0.5}ms ease-out` : `transform ${opts.speed}ms ease-out`,
    transformStyle: 'preserve-3d',
    willChange: 'transform',
  }

  // CSS custom properties for shine effect
  const shineStyle = {
    '--shine-x': `${state.shine.x}%`,
    '--shine-y': `${state.shine.y}%`,
    '--shine-opacity': isActive ? opts.glareOpacity : 0,
  } as React.CSSProperties

  return {
    ref,
    style,
    shineStyle,
    isActive,
    state,
    requestGyroPermission,
  }
}
