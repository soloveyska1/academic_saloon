import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../../ui/GestureGuard'
import { useModalRegistration } from '../../../contexts/NavigationContext'
import { triggerHaptic } from './ModalWrapper'

// ═══════════════════════════════════════════════════════════════════════════
//  СТИЛИ
// ═══════════════════════════════════════════════════════════════════════════

const styles = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.96) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
    background: 'linear-gradient(180deg, rgba(18,18,20,0.98) 0%, rgba(12,12,14,0.99) 100%)',
    borderRadius: 28,
    boxShadow: '0 30px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    zIndex: 2001,
  },
  closeButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
  },
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

  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen)

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
    border: `1px solid ${accentColor}20`,
  }), [accentColor])

  return (
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
                    <X size={18} color="rgba(255,255,255,0.5)" />
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
    </LazyMotion>
  )
}
