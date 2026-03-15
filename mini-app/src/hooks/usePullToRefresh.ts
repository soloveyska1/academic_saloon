import { useRef, useState, useCallback, useEffect, createElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTelegram } from './useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  PULL-TO-REFRESH HOOK — Gold-themed pull indicator for Telegram Mini App
//  Tracks touch gestures, activates only at scroll-top, fires async refresh
// ═══════════════════════════════════════════════════════════════════════════

const GOLD = '#d4af37'
const VOID_BG = 'rgba(9,9,11,0.95)'
const GOLD_BORDER = 'rgba(212,175,55,0.3)'
const INDICATOR_SIZE = 40
const PULL_THRESHOLD = 60
const MAX_PULL = 120
const STROKE_WIDTH = 2.5
const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

interface PullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  isRefreshing: boolean
  pullProgress: number
  PullIndicator: React.FC
}

function usePullToRefresh({
  onRefresh,
  threshold = PULL_THRESHOLD,
  disabled = false,
}: UsePullToRefreshOptions): PullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef<number>(0)
  const isTouching = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const { haptic } = useTelegram()

  // Progress normalized to 0..1 based on threshold
  const pullProgress = Math.min(pullDistance / threshold, 1)

  // Whether the pull has crossed the activation threshold
  const hasReachedThreshold = useRef(false)

  const resetState = useCallback(() => {
    setPullDistance(0)
    setIsVisible(false)
    hasReachedThreshold.current = false
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } catch {
      // Consumer handles errors; hook stays resilient
    } finally {
      setIsRefreshing(false)
      resetState()
    }
  }, [onRefresh, resetState])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    const onTouchStart = (e: TouchEvent) => {
      // Only activate when scrolled to the very top
      if (container.scrollTop > 0 || isRefreshing) return

      isTouching.current = true
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouching.current || isRefreshing) return

      const currentY = e.touches[0].clientY
      const delta = currentY - touchStartY.current

      // Only react to downward pulls
      if (delta <= 0) {
        if (isVisible) resetState()
        return
      }

      // Prevent native scroll while pulling
      if (container.scrollTop <= 0 && delta > 0) {
        e.preventDefault()
      }

      // Apply rubber-band damping: the further you pull, the harder it gets
      const dampened = Math.min(delta * 0.5, MAX_PULL)
      setPullDistance(dampened)
      setIsVisible(true)

      // Haptic feedback when crossing threshold
      if (dampened >= threshold && !hasReachedThreshold.current) {
        hasReachedThreshold.current = true
        try {
          haptic('medium')
        } catch {
          // Ignore haptic errors
        }
      } else if (dampened < threshold && hasReachedThreshold.current) {
        hasReachedThreshold.current = false
      }
    }

    const onTouchEnd = () => {
      if (!isTouching.current) return
      isTouching.current = false

      if (pullDistance >= threshold && !isRefreshing) {
        try {
          haptic('success')
        } catch {
          // Ignore haptic errors
        }
        handleRefresh()
      } else {
        resetState()
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [disabled, isRefreshing, pullDistance, threshold, haptic, handleRefresh, resetState, isVisible])

  // ── PullIndicator Component ──────────────────────────────────────────
  const PullIndicator: React.FC = useCallback(() => {
    const showIndicator = isVisible || isRefreshing
    const dashOffset = CIRCUMFERENCE * (1 - pullProgress)

    return createElement(
      AnimatePresence,
      null,
      showIndicator &&
        createElement(
          motion.div,
          {
            key: 'pull-indicator',
            initial: { opacity: 0, y: -INDICATOR_SIZE, scale: 0.6 },
            animate: {
              opacity: 1,
              y: 12,
              scale: 1,
            },
            exit: { opacity: 0, y: -INDICATOR_SIZE, scale: 0.6 },
            transition: { type: 'spring', stiffness: 300, damping: 25 },
            style: {
              position: 'fixed' as const,
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              borderRadius: '50%',
              background: VOID_BG,
              border: `1px solid ${GOLD_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 24px rgba(212,175,55,0.15), 0 0 0 1px ${GOLD_BORDER}`,
              pointerEvents: 'none' as const,
            },
          },
          // SVG progress ring
          createElement(
            'svg',
            {
              width: INDICATOR_SIZE - 8,
              height: INDICATOR_SIZE - 8,
              viewBox: '0 0 36 36',
              style: { display: 'block' },
            },
            // Background track
            createElement('circle', {
              cx: 18,
              cy: 18,
              r: RADIUS,
              fill: 'none',
              stroke: 'rgba(212,175,55,0.12)',
              strokeWidth: STROKE_WIDTH,
            }),
            // Progress arc / spinning arc
            isRefreshing
              ? createElement(motion.circle, {
                  cx: 18,
                  cy: 18,
                  r: RADIUS,
                  fill: 'none',
                  stroke: GOLD,
                  strokeWidth: STROKE_WIDTH,
                  strokeLinecap: 'round' as const,
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: CIRCUMFERENCE * 0.7,
                  style: {
                    transformOrigin: 'center',
                  },
                  animate: { rotate: 360 },
                  transition: {
                    rotate: {
                      duration: 0.8,
                      ease: 'linear',
                      repeat: Infinity,
                    },
                  },
                })
              : createElement('circle', {
                  cx: 18,
                  cy: 18,
                  r: RADIUS,
                  fill: 'none',
                  stroke: GOLD,
                  strokeWidth: STROKE_WIDTH,
                  strokeLinecap: 'round' as const,
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: dashOffset,
                  style: {
                    transition: 'stroke-dashoffset 0.1s ease-out',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                  },
                })
          )
        )
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, isRefreshing, pullProgress]) as React.FC

  return {
    containerRef,
    isRefreshing,
    pullProgress,
    PullIndicator,
  }
}

export { usePullToRefresh }
export default usePullToRefresh
