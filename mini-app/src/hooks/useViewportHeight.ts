import { useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  USE VIEWPORT HEIGHT — Telegram WebApp Compatible Viewport Hook
// ═══════════════════════════════════════════════════════════════════════════
//
//  Problem: CSS vh units and percentages don't work correctly in Telegram WebApp
//  on iOS because they include the hidden browser chrome / address bar area.
//
//  Solution: Use Telegram.WebApp.viewportHeight for actual visible area height,
//  with fallback to window.innerHeight for non-Telegram environments.
//
//  Usage:
//    const { height, cssHeight } = useViewportHeight()
//    // height = 700 (number in pixels)
//    // cssHeight = '700px' (string for CSS)
//
// ═══════════════════════════════════════════════════════════════════════════

interface ViewportHeightResult {
  height: number
  stableHeight: number
  cssHeight: string
  cssStableHeight: string
  isExpanded: boolean
}

export function useViewportHeight(): ViewportHeightResult {
  const getHeight = useCallback((): { height: number; stableHeight: number; isExpanded: boolean } => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.viewportHeight) {
        return {
          height: tg.viewportHeight,
          stableHeight: tg.viewportStableHeight || tg.viewportHeight,
          isExpanded: tg.isExpanded || false,
        }
      }
    } catch (e) {
      // Ignore errors
    }

    // Fallback to window.innerHeight
    return {
      height: window.innerHeight,
      stableHeight: window.innerHeight,
      isExpanded: true,
    }
  }, [])

  const [viewport, setViewport] = useState(getHeight)

  useEffect(() => {
    const updateHeight = () => {
      setViewport(getHeight())
    }

    // Initial update
    updateHeight()

    // Listen for resize events
    window.addEventListener('resize', updateHeight)

    // Listen for Telegram viewport changes
    try {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.onEvent) {
        tg.onEvent('viewportChanged', updateHeight)
      }
    } catch (e) {
      // Ignore errors
    }

    return () => {
      window.removeEventListener('resize', updateHeight)
      try {
        const tg = (window as any).Telegram?.WebApp
        if (tg?.offEvent) {
          tg.offEvent('viewportChanged', updateHeight)
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [getHeight])

  return {
    height: viewport.height,
    stableHeight: viewport.stableHeight,
    cssHeight: `${viewport.height}px`,
    cssStableHeight: `${viewport.stableHeight}px`,
    isExpanded: viewport.isExpanded,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CALCULATE MODAL HEIGHT — Helper for bottom sheets
// ═══════════════════════════════════════════════════════════════════════════

export function calculateModalHeight(
  viewportHeight: number,
  percentage: number = 90
): number {
  // Calculate percentage of viewport, capped at a reasonable value
  const calculated = Math.floor(viewportHeight * (percentage / 100))
  // Minimum height of 300px for usability
  return Math.max(300, calculated)
}

export default useViewportHeight
