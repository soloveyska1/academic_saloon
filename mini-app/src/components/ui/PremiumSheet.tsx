import { memo, useCallback, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration, useSwipeToClose } from './GestureGuard'
import { useViewportHeight } from '../../hooks/useViewportHeight'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SHEET — Unified Bottom Sheet Component (v2 - Native Gestures)
// ═══════════════════════════════════════════════════════════════════════════
//
//  Особенности v2:
//  1. Native touch gestures for drag-to-close (no framer-motion drag)
//  2. Smooth scrolling on iOS without gesture conflicts
//  3. Smart detection: only drags from handle/header area
//  4. Full integration with GestureGuard system
//  5. Premium animations and haptic feedback
//
//  Режимы:
//  - default: стандартный sheet с drag-to-close
//  - persistent: без drag-to-close (только кнопка)
//  - expandable: может расширяться на весь экран
// ═══════════════════════════════════════════════════════════════════════════

// Unified configuration
const SHEET_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 0.4,
  spring: { damping: 32, stiffness: 380 },
} as const

// Utility for haptic feedback
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

  // Configuration
  mode?: 'default' | 'persistent' | 'expandable'
  maxHeight?: string // default: '90vh'
  showHandle?: boolean // show drag handle
  showCloseButton?: boolean // show X button
  closeOnBackdrop?: boolean // close on backdrop click

  // Styling
  accentColor?: string
  className?: string
  contentStyle?: React.CSSProperties

  // Header
  title?: string
  subtitle?: string
  headerIcon?: ReactNode
  headerRight?: ReactNode
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
}: PremiumSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Get actual viewport height (works correctly in Telegram WebApp on iOS)
  const { height: viewportHeight } = useViewportHeight()

  // Parse maxHeight and calculate in pixels
  const maxHeightPx = (() => {
    if (typeof maxHeight === 'string') {
      if (maxHeight.endsWith('vh')) {
        const percentage = parseInt(maxHeight, 10)
        return Math.floor(viewportHeight * (percentage / 100))
      }
      if (maxHeight.endsWith('%')) {
        const percentage = parseInt(maxHeight, 10)
        return Math.floor(viewportHeight * (percentage / 100))
      }
    }
    return Math.floor(viewportHeight * 0.9) // Default to 90%
  })()

  // GestureGuard integration
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)

  // Native touch gesture for drag-to-close
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragOffset,
    isDragging,
  } = useSwipeToClose({
    onClose,
    offsetThreshold: SHEET_CONFIG.offsetThreshold,
    velocityThreshold: SHEET_CONFIG.velocityThreshold,
  })

  // Backdrop click handler
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) {
      triggerHaptic('light')
      onClose()
    }
  }, [closeOnBackdrop, onClose])

  // Close button handler
  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic('light')
    onClose()
  }, [onClose])

  // Determine if drag is enabled
  const isDragEnabled = mode !== 'persistent'

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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: viewportHeight,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              touchAction: 'none',
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════
              SHEET — Main container with native touch gestures
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="sheet"
            initial={{ y: maxHeightPx }}
            animate={{
              y: dragOffset,
              opacity: dragOffset > 100 ? 1 - (dragOffset - 100) / 200 : 1,
            }}
            exit={{ y: maxHeightPx }}
            transition={isDragging ? { duration: 0 } : {
              type: 'spring',
              ...SHEET_CONFIG.spring
            }}
            className={className}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              // Use calculated pixel height instead of vh/percentage
              maxHeight: maxHeightPx,
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
                DRAG HANDLE — Native touch area for swipe-to-close
                ═══════════════════════════════════════════════════════════ */}
            {showHandle && isDragEnabled && (
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    background: isDragging ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                  }}
                />
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                HEADER — Title, subtitle, close button (also draggable)
                ═══════════════════════════════════════════════════════════ */}
            {(title || showCloseButton || headerRight) && (
              <div
                onTouchStart={isDragEnabled ? handleTouchStart : undefined}
                onTouchMove={isDragEnabled ? handleTouchMove : undefined}
                onTouchEnd={isDragEnabled ? handleTouchEnd : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: showHandle ? '4px 20px 16px' : '20px 20px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: isDragEnabled ? 'grab' : 'default',
                  touchAction: isDragEnabled ? 'none' : 'auto',
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
                      onClick={handleCloseClick}
                      onTouchStart={(e) => e.stopPropagation()}
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
                CONTENT — Scrollable content area (native scroll)
                ═══════════════════════════════════════════════════════════ */}
            <div
              ref={contentRef}
              data-scroll-container="true"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
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
//  SIMPLE SHEET — Minimal sheet without header
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
//  FULL SHEET — Full screen expandable sheet
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
