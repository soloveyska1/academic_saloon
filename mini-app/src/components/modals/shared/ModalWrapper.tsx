import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration } from '../../ui/GestureGuard'
import { useModalRegistration } from '../../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  HAPTIC FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } }).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : 20)
    }
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPRING CONFIGS — iOS-like feel
// ═══════════════════════════════════════════════════════════════════════════

const SPRING_OPEN = { type: 'spring' as const, stiffness: 340, damping: 32 }
const SPRING_CLOSE = { type: 'spring' as const, stiffness: 440, damping: 38 }
const DISMISS_THRESHOLD = 100 // px
const VELOCITY_THRESHOLD = 500 // px/s

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL WRAPPER — Vaul-inspired bottom sheet
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  modalId: string
  title: string
  accentColor?: string
}

export function ModalWrapper({
  isOpen,
  onClose,
  children,
  modalId,
  title,
  accentColor = '#D4AF37',
}: ModalWrapperProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const dragStartRef = useRef<{ y: number; time: number } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // System hooks
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen)

  // Close with haptic
  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  // ─── Drag-to-dismiss (handle only) ────────────────────────────────
  const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    dragStartRef.current = { y: touch.clientY, time: Date.now() }
    setIsDragging(true)
  }, [])

  const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStartRef.current) return
    const touch = e.touches[0]
    if (!touch) return
    const dy = Math.max(0, touch.clientY - dragStartRef.current.y)
    setDragY(dy)
  }, [])

  const onHandleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragStartRef.current) {
      setIsDragging(false)
      setDragY(0)
      return
    }
    const touch = e.changedTouches[0]
    if (!touch) { setIsDragging(false); setDragY(0); return }

    const totalDy = touch.clientY - dragStartRef.current.y
    const elapsed = Date.now() - dragStartRef.current.time
    const velocity = elapsed > 0 ? (totalDy / elapsed) * 1000 : 0

    if (totalDy > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      triggerHaptic('light')
      onClose()
    }
    setDragY(0)
    setIsDragging(false)
    dragStartRef.current = null
  }, [onClose])

  // ─── Content-scroll-to-dismiss (Vaul pattern) ─────────────────────
  // When content is scrolled to top and user pulls down → dismiss
  const scrollDragRef = useRef<{ y: number; time: number; scrollWas0: boolean } | null>(null)
  const [contentDragY, setContentDragY] = useState(0)
  const [isContentDragging, setIsContentDragging] = useState(false)

  const onContentTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    const el = contentRef.current
    const scrolledToTop = !el || el.scrollTop <= 0
    scrollDragRef.current = { y: touch.clientY, time: Date.now(), scrollWas0: scrolledToTop }
  }, [])

  const onContentTouchMove = useCallback((e: React.TouchEvent) => {
    if (!scrollDragRef.current) return
    const touch = e.touches[0]
    if (!touch) return
    const el = contentRef.current
    const atTop = !el || el.scrollTop <= 0
    const dy = touch.clientY - scrollDragRef.current.y

    // Only activate drag-to-dismiss if scrolled to top and pulling down
    if (scrollDragRef.current.scrollWas0 && atTop && dy > 0) {
      e.preventDefault()
      setIsContentDragging(true)
      setContentDragY(Math.max(0, dy))
    } else {
      // Scrolling normally — deactivate drag
      if (isContentDragging) {
        setIsContentDragging(false)
        setContentDragY(0)
      }
      scrollDragRef.current.scrollWas0 = false
    }
  }, [isContentDragging])

  const onContentTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!scrollDragRef.current || !isContentDragging) {
      scrollDragRef.current = null
      setIsContentDragging(false)
      setContentDragY(0)
      return
    }
    const touch = e.changedTouches[0]
    if (!touch) { setIsContentDragging(false); setContentDragY(0); return }

    const totalDy = touch.clientY - scrollDragRef.current.y
    const elapsed = Date.now() - scrollDragRef.current.time
    const velocity = elapsed > 0 ? (totalDy / elapsed) * 1000 : 0

    if (totalDy > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      triggerHaptic('light')
      onClose()
    }
    setContentDragY(0)
    setIsContentDragging(false)
    scrollDragRef.current = null
  }, [isContentDragging, onClose])

  // Combined drag offset
  const totalDragY = dragY + contentDragY
  const anyDragging = isDragging || isContentDragging

  // ─── Focus management ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      setTimeout(() => sheetRef.current?.focus(), 50)
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  // Reset drag state when closed
  useEffect(() => {
    if (!isOpen) {
      setDragY(0)
      setContentDragY(0)
      setIsDragging(false)
      setIsContentDragging(false)
    }
  }, [isOpen])

  // Backdrop opacity follows drag
  const backdropOpacity = totalDragY > 0
    ? Math.max(0, 1 - totalDragY / 400)
    : 1

  const sheetStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#111113',
    borderRadius: '20px 20px 0 0',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.04), 0 -8px 32px rgba(0,0,0,0.12)',
    zIndex: 2001,
    outline: 'none',
    borderTop: `1px solid ${accentColor}25`,
  }), [accentColor])

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <m.div
              key={`${modalId}-bd`}
              initial={{ opacity: 0 }}
              animate={{ opacity: backdropOpacity }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={handleClose}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 2000,
              }}
              aria-hidden="true"
            />

            {/* Sheet */}
            <m.div
              key={`${modalId}-sh`}
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: totalDragY }}
              exit={{ y: '100%' }}
              transition={anyDragging
                ? { type: 'tween', duration: 0 }
                : isOpen ? SPRING_OPEN : SPRING_CLOSE
              }
              style={sheetStyle}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${modalId}-title`}
              tabIndex={-1}
            >
              {/* Handle — drag to dismiss */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 0 8px',
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                onTouchStart={onHandleTouchStart}
                onTouchMove={onHandleTouchMove}
                onTouchEnd={onHandleTouchEnd}
              >
                <div style={{
                  width: 36,
                  height: 5,
                  borderRadius: 2.5,
                  background: 'rgba(255,255,255,0.25)',
                }} />
              </div>

              {/* Close button */}
              <m.button
                onClick={handleClose}
                whileTap={{ scale: 0.9 }}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                aria-label="Закрыть"
              >
                <X size={16} color="rgba(255,255,255,0.5)" />
              </m.button>

              <h2 id={`${modalId}-title`} className="sr-only">{title}</h2>

              {/* Scrollable content */}
              <div
                ref={contentRef}
                onTouchStart={onContentTouchStart}
                onTouchMove={onContentTouchMove}
                onTouchEnd={onContentTouchEnd}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
                }}
                data-scroll-container="true"
              >
                {children}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LUXURY CARD — Reusable premium card component
// ═══════════════════════════════════════════════════════════════════════════

export interface LuxuryCardProps {
  children: React.ReactNode
  gradient?: string
  borderColor?: string
  glowColor?: string
  isActive?: boolean
  style?: React.CSSProperties
  onClick?: () => void
}

export function LuxuryCard({
  children,
  gradient = 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
  borderColor = 'rgba(255,255,255,0.08)',
  glowColor,
  isActive = false,
  style,
  onClick,
}: LuxuryCardProps) {
  const cardStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    background: gradient,
    border: `1px solid ${borderColor}`,
    borderRadius: 20,
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : undefined,
    boxShadow: glowColor && isActive
      ? `0 8px 32px -8px ${glowColor}40, inset 0 1px 0 rgba(255,255,255,0.06)`
      : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    ...style,
  }), [gradient, borderColor, glowColor, isActive, style, onClick])

  return (
    <div style={cardStyle} onClick={onClick}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HERO ICON — Animated icon with glow
// ═══════════════════════════════════════════════════════════════════════════

export interface HeroIconProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  gradient: string
  glowColor: string
  size?: number
}

export function HeroIcon({ icon: Icon, gradient, glowColor, size = 96 }: HeroIconProps) {
  return (
    <m.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        boxShadow: `0 16px 48px -12px ${glowColor}60`,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
          borderRadius: `${size * 0.3}px ${size * 0.3}px 50% 50%`,
        }}
      />
      <Icon size={size * 0.45} color="#fff" strokeWidth={1.5} />
    </m.div>
  )
}
