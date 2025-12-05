import { useRef, useCallback } from 'react'
import { useTelegram } from './useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM GESTURE HOOK — Direct DOM Manipulation for Zero-Latency Taps
//  Bypasses React state updates for instant visual feedback
// ═══════════════════════════════════════════════════════════════════════════

interface GestureConfig {
  onTap: () => void
  scale?: number           // How much to shrink (0.88 - 0.95 ideal)
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection'
  tolerance?: number       // Pixel tolerance for micro-movements (default 15)
  pressDelay?: number      // Delay before action to show release animation (default 50)
}

export const usePremiumGesture = ({
  onTap,
  scale = 0.88,
  hapticType = 'light',
  tolerance = 15,
  pressDelay = 40,
}: GestureConfig) => {
  const ref = useRef<HTMLButtonElement>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const isPressed = useRef(false)
  const { haptic } = useTelegram()

  // Direct DOM animation - bypasses React for instant response
  const animatePress = useCallback((pressed: boolean) => {
    const element = ref.current
    if (!element) return

    if (pressed) {
      // Snappy press - fast cubic-bezier for immediate feedback
      element.style.transition = 'transform 0.08s cubic-bezier(0.2, 0, 0, 1), opacity 0.08s ease-out'
      element.style.transform = `scale(${scale})`
      element.style.opacity = '0.75'
    } else {
      // Bouncy release - overshoot for premium spring feel
      element.style.transition = 'transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.15s ease-out'
      element.style.transform = 'scale(1)'
      element.style.opacity = '1'
    }
  }, [scale])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Instant visual feedback BEFORE any logic
    isPressed.current = true
    animatePress(true)
    startPos.current = { x: e.clientX, y: e.clientY }

    // Optional: haptic on press (like mechanical button)
    // try { haptic('soft') } catch {}
  }, [animatePress])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPressed.current) return
    isPressed.current = false

    // Release the spring
    animatePress(false)

    if (!startPos.current) return

    const diffX = Math.abs(e.clientX - startPos.current.x)
    const diffY = Math.abs(e.clientY - startPos.current.y)
    startPos.current = null

    // Tolerance check - forgive micro-movements up to `tolerance` pixels
    if (diffX < tolerance && diffY < tolerance) {
      // Haptic confirmation
      try {
        haptic(hapticType === 'selection' ? 'light' : hapticType)
      } catch {
        // Ignore haptic errors
      }

      // Small delay to let user see the release animation
      // This creates the feeling of "weight" in the button
      setTimeout(() => {
        requestAnimationFrame(() => {
          onTap()
        })
      }, pressDelay)
    }
  }, [onTap, haptic, hapticType, tolerance, pressDelay, animatePress])

  const handlePointerCancel = useCallback(() => {
    if (isPressed.current) {
      isPressed.current = false
      animatePress(false)
    }
    startPos.current = null
  }, [animatePress])

  const handlePointerLeave = useCallback(() => {
    // If finger left the button - cancel (user changed mind)
    if (isPressed.current) {
      isPressed.current = false
      animatePress(false)
    }
    startPos.current = null
  }, [animatePress])

  const preventContextMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
  }, [])

  return {
    ref,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave,
      onContextMenu: preventContextMenu,
    },
  }
}
