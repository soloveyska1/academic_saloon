import { useEffect, useCallback, createContext, useContext, useState, ReactNode, memo, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  GESTURE GUARD — Premium Protection System for Mobile Navigation
// ═══════════════════════════════════════════════════════════════════════════
//
//  Защита от:
//  1. Случайного back-swipe браузера (свайп с левого края)
//  2. Случайного forward-swipe (свайп с правого края)
//  3. Pull-to-refresh при скролле вверх
//  4. Случайного закрытия приложения через жесты
//  5. Rubber-banding на iOS при overscroll
//
//  Особенности:
//  - Adaptive edge zones based on screen size
//  - Smart detection: не блокирует намеренные жесты
//  - Интеграция с modal/sheet системой
//  - Haptic feedback при блокировке опасного жеста
// ═══════════════════════════════════════════════════════════════════════════

interface GestureGuardContextType {
  // Состояние защиты
  isProtectionActive: boolean
  setProtectionActive: (active: boolean) => void

  // Модальные окна открыты
  activeSheets: number
  registerSheet: () => () => void

  // Блокировка скролла
  lockScroll: () => () => void
  isScrollLocked: boolean

  // Edge protection zones (в пикселях)
  edgeZoneLeft: number
  edgeZoneRight: number

  // Статистика blocked gestures (для отладки)
  blockedGestures: number
}

const GestureGuardContext = createContext<GestureGuardContextType | null>(null)

// Утилита для haptic feedback
const triggerHaptic = (style: 'light' | 'medium' | 'rigid' = 'light') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 25 : 50)
    }
  } catch (e) {
    // Ignore haptic errors
  }
}

// Сохранение позиции скролла при блокировке
let savedScrollY = 0
let scrollLockCount = 0

export function GestureGuardProvider({ children }: { children: ReactNode }) {
  const [isProtectionActive, setProtectionActive] = useState(true)
  const [activeSheets, setActiveSheets] = useState(0)
  const [isScrollLocked, setIsScrollLocked] = useState(false)
  const [blockedGestures, setBlockedGestures] = useState(0)

  // Adaptive edge zones based on screen width
  const edgeZoneLeft = Math.min(35, window.innerWidth * 0.08) // 8% or max 35px
  const edgeZoneRight = Math.min(35, window.innerWidth * 0.08)

  // Refs для touch tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isBlockingRef = useRef(false)

  // Регистрация активного sheet/modal
  const registerSheet = useCallback(() => {
    setActiveSheets(prev => prev + 1)

    return () => {
      setActiveSheets(prev => Math.max(0, prev - 1))
    }
  }, [])

  // Блокировка скролла с сохранением позиции (iOS-friendly)
  const lockScroll = useCallback(() => {
    scrollLockCount++

    if (scrollLockCount === 1) {
      savedScrollY = window.scrollY

      // Фиксируем body для предотвращения скролла
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      setIsScrollLocked(true)
    }

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1)

      if (scrollLockCount === 0) {
        // Восстанавливаем скролл
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''

        // Возвращаем позицию скролла
        window.scrollTo(0, savedScrollY)

        setIsScrollLocked(false)
      }
    }
  }, [])

  // Основной обработчик защиты от edge swipes
  useEffect(() => {
    if (!isProtectionActive) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }

      // Проверяем опасную зону (левый или правый край экрана)
      const isLeftEdge = touch.clientX < edgeZoneLeft
      const isRightEdge = touch.clientX > window.innerWidth - edgeZoneRight

      if (isLeftEdge || isRightEdge) {
        isBlockingRef.current = true
      } else {
        isBlockingRef.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || !isBlockingRef.current) return

      const touch = e.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const timeDelta = Date.now() - touchStartRef.current.time

      // Определяем направление свайпа
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5
      const velocityX = Math.abs(deltaX) / timeDelta

      // Блокируем только быстрые горизонтальные свайпы с края
      // которые явно направлены на back/forward navigation
      if (isHorizontalSwipe && velocityX > 0.3) {
        const wasLeftEdge = touchStartRef.current.x < edgeZoneLeft
        const wasRightEdge = touchStartRef.current.x > window.innerWidth - edgeZoneRight

        // Левый край + свайп вправо = back gesture
        // Правый край + свайп влево = forward gesture
        if ((wasLeftEdge && deltaX > 15) || (wasRightEdge && deltaX < -15)) {
          e.preventDefault()

          // Subtle haptic feedback
          triggerHaptic('light')

          setBlockedGestures(prev => prev + 1)
        }
      }
    }

    const handleTouchEnd = () => {
      touchStartRef.current = null
      isBlockingRef.current = false
    }

    // Защита от pull-to-refresh
    const handleOverscroll = (e: TouchEvent) => {
      // Если мы в top и пытаемся скроллить вверх - блокируем
      if (window.scrollY === 0) {
        const touch = e.touches[0]
        if (!touch || !touchStartRef.current) return

        const deltaY = touch.clientY - touchStartRef.current.y

        // Пользователь тянет вниз при scrollY = 0
        if (deltaY > 10) {
          // Проверяем что это не внутри scrollable container
          const target = e.target as HTMLElement
          if (!target.closest('[data-scroll-container]')) {
            e.preventDefault()
          }
        }
      }
    }

    // Добавляем слушатели с правильными опциями
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    // Pull-to-refresh protection только на body
    document.body.addEventListener('touchmove', handleOverscroll, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
      document.body.removeEventListener('touchmove', handleOverscroll)
    }
  }, [isProtectionActive, edgeZoneLeft, edgeZoneRight])

  // CSS overscroll protection
  useEffect(() => {
    // Базовые CSS защиты
    const style = document.createElement('style')
    style.id = 'gesture-guard-styles'
    style.textContent = `
      html, body {
        overscroll-behavior: none;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
      }

      /* Prevent text selection during gestures */
      .gesture-active {
        user-select: none;
        -webkit-user-select: none;
      }

      /* Safe scrollable areas */
      [data-scroll-container] {
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('gesture-guard-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  return (
    <GestureGuardContext.Provider
      value={{
        isProtectionActive,
        setProtectionActive,
        activeSheets,
        registerSheet,
        lockScroll,
        isScrollLocked,
        edgeZoneLeft,
        edgeZoneRight,
        blockedGestures
      }}
    >
      {children}
    </GestureGuardContext.Provider>
  )
}

// Hook для использования GestureGuard
export function useGestureGuard() {
  const context = useContext(GestureGuardContext)
  if (!context) {
    throw new Error('useGestureGuard must be used within GestureGuardProvider')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCROLL LOCK HOOK — Для модалок и sheets
// ═══════════════════════════════════════════════════════════════════════════

export function useScrollLock(isActive: boolean) {
  const { lockScroll } = useGestureGuard()

  useEffect(() => {
    if (!isActive) return

    const unlock = lockScroll()
    return unlock
  }, [isActive, lockScroll])
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHEET REGISTRATION HOOK — Для отслеживания открытых sheets
// ═══════════════════════════════════════════════════════════════════════════

export function useSheetRegistration(isOpen: boolean) {
  const { registerSheet } = useGestureGuard()

  useEffect(() => {
    if (!isOpen) return

    const unregister = registerSheet()
    return unregister
  }, [isOpen, registerSheet])
}

// ═══════════════════════════════════════════════════════════════════════════
//  SAFE SCROLL CONTAINER — Wrapper для скроллируемых областей
// ═══════════════════════════════════════════════════════════════════════════

interface SafeScrollContainerProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  direction?: 'vertical' | 'horizontal' | 'both'
}

export const SafeScrollContainer = memo(function SafeScrollContainer({
  children,
  className,
  style,
  direction = 'vertical'
}: SafeScrollContainerProps) {
  const overflowStyle: React.CSSProperties = {
    overflowY: direction === 'horizontal' ? 'hidden' : 'auto',
    overflowX: direction === 'vertical' ? 'hidden' : 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    touchAction: direction === 'horizontal' ? 'pan-x' : 'pan-y',
    ...style
  }

  return (
    <div
      data-scroll-container="true"
      className={className}
      style={overflowStyle}
    >
      {children}
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  USE SWIPE TO CLOSE — Native touch gesture detection for sheets
// ═══════════════════════════════════════════════════════════════════════════
//
//  Replaces framer-motion drag="y" which conflicts with iOS native scroll.
//  Uses native touch events and only triggers close when:
//  1. User drags from the handle/header area (not scroll content)
//  2. Drag distance exceeds threshold OR velocity is high enough
//
//  Usage:
//    const { handleTouchStart, handleTouchMove, handleTouchEnd, dragOffset } = useSwipeToClose({
//      onClose,
//      offsetThreshold: 120,
//      velocityThreshold: 400,
//    })
//
// ═══════════════════════════════════════════════════════════════════════════

interface SwipeToCloseConfig {
  onClose: () => void
  offsetThreshold?: number   // Distance in px to trigger close (default: 120)
  velocityThreshold?: number // Velocity in px/ms to trigger instant close (default: 0.4)
  onDragStart?: () => void
  onDragEnd?: (closed: boolean) => void
}

interface SwipeToCloseResult {
  // Attach these to the drag handle element
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: (e: React.TouchEvent) => void
  // Current drag offset for animations
  dragOffset: number
  // Is currently dragging
  isDragging: boolean
}

export function useSwipeToClose({
  onClose,
  offsetThreshold = 120,
  velocityThreshold = 0.4,
  onDragStart,
  onDragEnd,
}: SwipeToCloseConfig): SwipeToCloseResult {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const touchStartRef = useRef<{ y: number; time: number } | null>(null)
  const lastTouchRef = useRef<{ y: number; time: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    touchStartRef.current = { y: touch.clientY, time: Date.now() }
    lastTouchRef.current = { y: touch.clientY, time: Date.now() }
    setIsDragging(true)
    onDragStart?.()
  }, [onDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.touches[0]
    if (!touch) return

    lastTouchRef.current = { y: touch.clientY, time: Date.now() }

    // Calculate offset (only allow downward drag)
    const offset = Math.max(0, touch.clientY - touchStartRef.current.y)
    setDragOffset(offset)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !lastTouchRef.current) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }

    const touch = e.changedTouches[0]
    if (!touch) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }

    const totalOffset = touch.clientY - touchStartRef.current.y
    const timeDelta = Date.now() - touchStartRef.current.time
    const velocity = timeDelta > 0 ? totalOffset / timeDelta : 0

    // Determine if we should close
    const shouldClose = totalOffset > offsetThreshold || velocity > velocityThreshold

    if (shouldClose) {
      // Trigger haptic feedback
      try {
        const tg = (window as any).Telegram?.WebApp
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('light')
        } else if (navigator.vibrate) {
          navigator.vibrate(10)
        }
      } catch (e) {}

      onClose()
      onDragEnd?.(true)
    } else {
      // Snap back
      setDragOffset(0)
      onDragEnd?.(false)
    }

    setIsDragging(false)
    touchStartRef.current = null
    lastTouchRef.current = null
  }, [onClose, offsetThreshold, velocityThreshold, onDragEnd])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragOffset,
    isDragging,
  }
}

export default GestureGuardProvider
