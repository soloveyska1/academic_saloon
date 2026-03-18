import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../../ui/GestureGuard'
import { useModalRegistration } from '../../../contexts/NavigationContext'
import { useThemeValue } from '../../../contexts/ThemeContext'
import { triggerHaptic } from './ModalWrapper'

// ═══════════════════════════════════════════════════════════════════════════
//  THEME-AWARE STYLES
// ═══════════════════════════════════════════════════════════════════════════

function getStyles(isDark: boolean) {
  return {
    backdrop: {
      position: 'fixed' as const,
      inset: 0,
      background: isDark
        ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.96) 100%)'
        : 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
      backdropFilter: isDark ? 'blur(20px) saturate(180%)' : 'blur(16px) saturate(150%)',
      WebkitBackdropFilter: isDark ? 'blur(20px) saturate(180%)' : 'blur(16px) saturate(150%)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    dialog: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: 400,
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      overscrollBehavior: 'contain' as const,
      WebkitOverflowScrolling: 'touch' as const,
      background: isDark
        ? 'linear-gradient(180deg, rgba(18,18,20,0.98) 0%, rgba(12,12,14,0.99) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,249,247,0.99) 100%)',
      borderRadius: 28,
      boxShadow: isDark
        ? '0 30px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)'
        : '0 30px 100px rgba(120,85,40,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
      zIndex: 2001,
    },
    closeButton: {
      position: 'absolute' as const,
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 12,
      background: isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(120,85,40,0.06)',
      border: isDark
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(120,85,40,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 10,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
}

// ═══════════════════════════════════════════════════════════════════════════
//  CENTERED MODAL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

export interface CenteredModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  modalId: string
  title: string
  accentColor?: string
  /** Hide the default close button (for modals with their own) */
  hideCloseButton?: boolean
}

export function CenteredModalWrapper({
  isOpen,
  onClose,
  children,
  modalId,
  title,
  accentColor = '#D4AF37',
  hideCloseButton = false,
}: CenteredModalWrapperProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const theme = useThemeValue()
  const isDark = theme === 'dark'
  const styles = useMemo(() => getStyles(isDark), [isDark])

  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen, modalId)

  // Reset scroll position when modal opens
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.scrollTop = 0
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      dialogRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  const dialogStyle = useMemo(() => ({
    ...styles.dialog,
    border: `1px solid ${isDark ? accentColor + '20' : 'rgba(120,85,40,0.1)'}`,
  }), [accentColor, styles.dialog, isDark])

  const closeIconColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(87,83,78,0.6)'

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* BACKDROP */}
            <m.div
              key={`${modalId}-backdrop`}
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.25 }}
              onClick={handleClose}
              style={styles.backdrop}
              aria-hidden="true"
            >
              {/* DIALOG (inside backdrop for centering, stopPropagation prevents backdrop close) */}
              <m.div
                key={`${modalId}-dialog`}
                ref={dialogRef}
                variants={dialogVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                style={dialogStyle}
                data-scroll-container="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${modalId}-title`}
                tabIndex={-1}
              >
                {/* Close Button */}
                {!hideCloseButton && (
                  <m.button
                    onClick={handleClose}
                    whileTap={{ scale: 0.9 }}
                    style={styles.closeButton}
                    aria-label="Закрыть"
                  >
                    <X size={18} color={closeIconColor} />
                  </m.button>
                )}

                {/* Screen reader title */}
                <h2 id={`${modalId}-title`} className="sr-only">{title}</h2>

                {/* Content */}
                {children}
              </m.div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  )
}
