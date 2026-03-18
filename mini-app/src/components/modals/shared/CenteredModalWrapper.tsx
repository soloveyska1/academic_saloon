import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../../ui/GestureGuard'
import { useModalRegistration } from '../../../contexts/NavigationContext'
import { triggerHaptic } from './ModalWrapper'

// ═══════════════════════════════════════════════════════════════════════════
//  THEME-AWARE STYLES
// ═══════════════════════════════════════════════════════════════════════════

const STYLES = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'var(--overlay-bg)',
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
    background: 'var(--bg-elevated)',
    borderRadius: 28,
    boxShadow: 'var(--modal-shadow)',
    zIndex: 2001,
  },
  closeButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 12,
    background: 'var(--surface-hover)',
    border: '1px solid var(--border-strong)',
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
  accentColor: _accentColor = '#D4AF37',
  hideCloseButton = false,
}: CenteredModalWrapperProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

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
    ...STYLES.dialog,
    border: '1px solid var(--border-gold)',
  }), [])

  const closeIconColor = 'var(--text-muted)'

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
              style={STYLES.backdrop}
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
                    style={STYLES.closeButton}
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
