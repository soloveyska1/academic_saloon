import { motion, AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { useScrollLock, useSheetRegistration, useSwipeToClose } from '../../ui/GestureGuard'
import { useModalRegistration } from '../../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════════════

const DRAG_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 0.4,
} as const

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
//  СТИЛИ (мемоизированные объекты)
// ═══════════════════════════════════════════════════════════════════════════

const styles = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    zIndex: 2000,
  },
  sheet: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '92vh',
    background: 'linear-gradient(180deg, rgba(18,18,20,0.98) 0%, rgba(12,12,14,0.99) 100%)',
    borderRadius: '28px 28px 0 0',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    zIndex: 2001,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    WebkitOverflowScrolling: 'touch' as const,
    touchAction: 'pan-y' as const,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.2)',
    margin: '12px auto 8px',
    cursor: 'grab',
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
//  ANIMATION VARIANTS (оптимизированные)
// ═══════════════════════════════════════════════════════════════════════════

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0 },
  exit: { y: '100%' },
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL WRAPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  /** Уникальный ID для accessibility */
  modalId: string
  /** Заголовок для screen readers */
  title: string
  /** Акцентный цвет (опционально) */
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
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Hooks для интеграции с системой
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen)

  // Native touch gesture
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragOffset,
    isDragging,
  } = useSwipeToClose({
    onClose,
    offsetThreshold: DRAG_CONFIG.offsetThreshold,
    velocityThreshold: DRAG_CONFIG.velocityThreshold,
  })

  // Закрытие с haptic
  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  // ═══════════════════════════════════════════════════════════════════════
  //  ACCESSIBILITY: Focus management
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий фокус
      previousFocusRef.current = document.activeElement as HTMLElement
      // Фокус на модалку
      sheetRef.current?.focus()
    } else {
      // Возвращаем фокус
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Keyboard handler (Escape)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Мемоизированный стиль с акцентом
  const accentBorderStyle = useMemo(() => ({
    ...styles.sheet,
    borderTop: `1px solid ${accentColor}20`,
  }), [accentColor])

  // Динамический transform при drag
  const sheetStyle = useMemo(() => ({
    ...accentBorderStyle,
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  }), [accentBorderStyle, dragOffset, isDragging])

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
            />

            {/* SHEET */}
            <m.div
              key={`${modalId}-sheet`}
              ref={sheetRef}
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={sheetStyle}
              // Accessibility
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${modalId}-title`}
              tabIndex={-1}
              // Touch handlers
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Drag Handle */}
              <div style={styles.handle} aria-hidden="true" />

              {/* Close Button */}
              <m.button
                onClick={handleClose}
                whileTap={{ scale: 0.9 }}
                style={styles.closeButton}
                aria-label="Закрыть"
              >
                <X size={18} color="rgba(255,255,255,0.5)" />
              </m.button>

              {/* Screen reader title (hidden) */}
              <h2 id={`${modalId}-title`} className="sr-only">
                {title}
              </h2>

              {/* Content */}
              {children}
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
      {/* Shine effect */}
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
