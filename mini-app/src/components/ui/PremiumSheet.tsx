import { memo, useCallback, useEffect, useRef, ReactNode } from 'react'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from './GestureGuard'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SHEET — Unified Bottom Sheet Component
// ═══════════════════════════════════════════════════════════════════════════
//
//  Особенности:
//  1. Плавный drag-to-close с умными порогами
//  2. Полная блокировка фонового скролла
//  3. Защита от случайного закрытия при скролле контента
//  4. Safe-area поддержка для всех устройств
//  5. Интеграция с GestureGuard системой
//  6. Премиальные анимации и haptic feedback
//
//  Режимы:
//  - default: стандартный sheet с drag-to-close
//  - persistent: без drag-to-close (только кнопка)
//  - expandable: может расширяться на весь экран
// ═══════════════════════════════════════════════════════════════════════════

// Unified drag configuration - одинаковые пороги везде
const DRAG_CONFIG = {
  // Offset threshold - сколько пикселей нужно свайпнуть для закрытия
  offsetThreshold: 120,
  // Velocity threshold - скорость свайпа для мгновенного закрытия
  velocityThreshold: 400,
  // Elasticity - насколько "резиновый" drag
  dragElastic: 0.08,
  // Constraints - ограничения движения
  dragConstraints: { top: 0 },
  // Spring animation config
  spring: { damping: 32, stiffness: 380 },
  // Exit animation
  exitSpring: { damping: 28, stiffness: 350 }
} as const

// Утилита для haptic feedback
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 35)
    }
  } catch (e) {
    // Ignore haptic errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SHEET COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PremiumSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode

  // Конфигурация
  mode?: 'default' | 'persistent' | 'expandable'
  maxHeight?: string // default: '90vh'
  showHandle?: boolean // показывать drag handle
  showCloseButton?: boolean // показывать X кнопку
  closeOnBackdrop?: boolean // закрывать при клике на backdrop

  // Стилизация
  accentColor?: string
  className?: string
  contentStyle?: React.CSSProperties

  // Header
  title?: string
  subtitle?: string
  headerIcon?: ReactNode
  headerRight?: ReactNode

  // Callbacks
  onDragStart?: () => void
  onDragEnd?: () => void
}

export const PremiumSheet = memo(function PremiumSheet({
  isOpen,
  onClose,
  children,
  mode = 'default',
  maxHeight = '90vh',
  showHandle = true,
  showCloseButton = true,
  closeOnBackdrop = true,
  accentColor = 'rgba(212,175,55,0.3)',
  className,
  contentStyle,
  title,
  subtitle,
  headerIcon,
  headerRight,
  onDragStart,
  onDragEnd: onDragEndCallback
}: PremiumSheetProps) {
  const dragControls = useDragControls()
  const contentRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Интеграция с GestureGuard
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)

  // Handle drag end with smart thresholds
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    isDraggingRef.current = false
    onDragEndCallback?.()

    const { offset, velocity } = info
    const shouldClose =
      offset.y > DRAG_CONFIG.offsetThreshold ||
      velocity.y > DRAG_CONFIG.velocityThreshold

    if (shouldClose) {
      triggerHaptic('light')
      onClose()
    }
  }, [onClose, onDragEndCallback])

  // Handle drag start
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true
    onDragStart?.()
  }, [onDragStart])

  // Pointer down for drag controls
  const startDrag = useCallback((e: React.PointerEvent) => {
    if (mode === 'persistent') return
    e.stopPropagation()
    dragControls.start(e)
  }, [dragControls, mode])

  // Backdrop click handler
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      triggerHaptic('light')
      onClose()
    }
  }, [closeOnBackdrop, onClose])

  // Prevent scroll propagation from content
  const handleContentScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    // If at top and trying to scroll up - might conflict with drag
    // This is handled by overscrollBehavior: contain
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              BACKDROP — Dark overlay with blur
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              // Prevent any touch actions on backdrop
              touchAction: 'none',
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════
              SHEET — Main container with drag support
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="sheet"
            drag={mode !== 'persistent' ? 'y' : false}
            dragControls={dragControls}
            dragListener={false} // Only drag from handle/header
            dragConstraints={DRAG_CONFIG.dragConstraints}
            dragElastic={DRAG_CONFIG.dragElastic}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              ...DRAG_CONFIG.spring
            }}
            className={className}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight,
              display: 'flex',
              flexDirection: 'column',
              // Premium glass background
              background: `linear-gradient(180deg,
                rgba(22,22,26,0.98) 0%,
                rgba(14,14,16,0.99) 100%
              )`,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTop: `1px solid ${accentColor}`,
              boxShadow: `
                0 -20px 60px rgba(0,0,0,0.7),
                0 0 0 1px rgba(255,255,255,0.06),
                inset 0 1px 0 rgba(255,255,255,0.08)
              `,
              zIndex: 2001,
              overflow: 'hidden',
            }}
          >
            {/* ═══════════════════════════════════════════════════════════
                DRAG HANDLE — Область для свайпа
                ═══════════════════════════════════════════════════════════ */}
            {showHandle && mode !== 'persistent' && (
              <div
                onPointerDown={startDrag}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 12,
                  paddingBottom: 8,
                  cursor: 'grab',
                  touchAction: 'none',
                }}
              >
                <motion.div
                  whileHover={{ opacity: 0.5 }}
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                  }}
                />
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                HEADER — Title, subtitle, close button
                ═══════════════════════════════════════════════════════════ */}
            {(title || showCloseButton || headerRight) && (
              <div
                onPointerDown={mode !== 'persistent' ? startDrag : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: showHandle ? '4px 20px 16px' : '20px 20px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: mode !== 'persistent' ? 'grab' : 'default',
                  touchAction: mode !== 'persistent' ? 'none' : 'auto',
                }}
              >
                {/* Left side: Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {headerIcon && (
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {headerIcon}
                    </div>
                  )}

                  {title && (
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#f2f2f2',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {title}
                      </div>
                      {subtitle && (
                        <div style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.5)',
                          marginTop: 2,
                        }}>
                          {subtitle}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side: Custom content or Close button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {headerRight}

                  {showCloseButton && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        triggerHaptic('light')
                        onClose()
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={18} color="rgba(255,255,255,0.5)" />
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                CONTENT — Scrollable content area
                ═══════════════════════════════════════════════════════════ */}
            <div
              ref={contentRef}
              data-scroll-container="true"
              onScroll={handleContentScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                // Safe area padding at bottom
                paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
                ...contentStyle,
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  SIMPLE SHEET — Минимальный sheet без header
// ═══════════════════════════════════════════════════════════════════════════

interface SimpleSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxHeight?: string
  accentColor?: string
}

export const SimpleSheet = memo(function SimpleSheet({
  isOpen,
  onClose,
  children,
  maxHeight = '85vh',
  accentColor
}: SimpleSheetProps) {
  return (
    <PremiumSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeight={maxHeight}
      showHandle={true}
      showCloseButton={true}
      closeOnBackdrop={true}
      accentColor={accentColor}
    >
      {children}
    </PremiumSheet>
  )
})

// ═══════════════════════════════════════════════════════════════════════════
//  FULL SHEET — Sheet на весь экран (expandable)
// ═══════════════════════════════════════════════════════════════════════════

interface FullSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  subtitle?: string
  headerIcon?: ReactNode
}

export const FullSheet = memo(function FullSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  headerIcon
}: FullSheetProps) {
  return (
    <PremiumSheet
      isOpen={isOpen}
      onClose={onClose}
      mode="expandable"
      maxHeight="95vh"
      showHandle={true}
      showCloseButton={true}
      title={title}
      subtitle={subtitle}
      headerIcon={headerIcon}
    >
      {children}
    </PremiumSheet>
  )
})

export default PremiumSheet
