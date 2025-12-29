import { motion, AnimatePresence } from 'framer-motion'
import React, { useEffect, useState, useCallback } from 'react'
import {
  X, Shield, CheckCircle, TrendingUp, Crown, Star,
  ArrowRight, Clock, RefreshCw, Lock, Zap,
  Gem, CreditCard, ArrowUpRight, ArrowDownRight,
  Gift
} from 'lucide-react'
import { UserData, Transaction } from '../../types'
import { useAdmin } from '../../contexts/AdminContext'
import { useScrollLock, useSheetRegistration, useSwipeToClose } from './GestureGuard'
import { useModalRegistration } from '../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════
//  UNIFIED DRAG CONFIGURATION — Same across all sheets
// ═══════════════════════════════════════════════════════════════════════════
const DRAG_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 400,
  dragElastic: 0.08,
} as const

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : 20)
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING PARTICLES — Luxury Background Effect
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles({ color = '#D4AF37', count = 12 }: { color?: string; count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${5 + (i * 8) % 90}%`,
    top: `${10 + (i * 13) % 80}%`,
    size: 2 + (i % 3),
    delay: i * 0.4,
    duration: 6 + (i % 4),
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: -1 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0.3, 0.6, 0],
            scale: [0.5, 1, 0.8, 1, 0.5],
            y: [0, -30, -15, -45, -60],
            x: [0, 10, -5, 15, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ULTRA-PREMIUM MODAL WRAPPER — Glass Card with Luxury Effects
// ═══════════════════════════════════════════════════════════════════════════

interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  accentColor?: string
  showParticles?: boolean
}

function ModalWrapper({ isOpen, onClose, children, accentColor = '#D4AF37', showParticles = true }: ModalWrapperProps) {
  // GestureGuard integration - unified scroll lock and modal registration
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen)

  // Native touch gesture for drag-to-close (replaces framer-motion drag)
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragOffset,
    isDragging,
  } = useSwipeToClose({
    onClose,
    offsetThreshold: DRAG_CONFIG.offsetThreshold,
    velocityThreshold: 0.4, // velocity in px/ms
  })

  // Close with haptic
  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ═══════════════════════════════════════════════════════════════
              BACKDROP — Just an overlay, NOT a flex container
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              zIndex: 2000,
              touchAction: 'none',
            }}
          />

          {/* ═══════════════════════════════════════════════════════════════
              SHEET — Independent fixed element (like working ClubRulesSheet)
              ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            key="modal-sheet"
            initial={{ y: '100%' }}
            animate={{
              opacity: dragOffset > 100 ? 1 - (dragOffset - 100) / 200 : 1,
              y: dragOffset,
            }}
            exit={{ y: '100%' }}
            transition={isDragging ? { duration: 0 } : { type: 'spring', damping: 32, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              // Use dvh for iOS dynamic viewport, fallback to vh
              height: 'min(95dvh, 95vh)',
              maxHeight: 'calc(100% - env(safe-area-inset-top, 20px) - 10px)',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              background: `
                linear-gradient(180deg,
                  rgba(25,25,30,0.97) 0%,
                  rgba(15,15,18,0.98) 50%,
                  rgba(10,10,12,0.99) 100%
                )
              `,
              borderTop: `1px solid ${accentColor}50`,
              boxShadow: `
                0 -30px 100px rgba(0,0,0,0.6),
                0 0 0 1px rgba(255,255,255,0.08),
                0 0 120px -30px ${accentColor}50,
                inset 0 1px 0 rgba(255,255,255,0.1)
              `,
              zIndex: 2001,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top accent line with glow */}
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
                boxShadow: [
                  `0 0 20px ${accentColor}40`,
                  `0 0 40px ${accentColor}80`,
                  `0 0 20px ${accentColor}40`,
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '50%',
                height: 2,
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                borderRadius: 1,
                zIndex: 0, // Behind content
                pointerEvents: 'none',
              }}
            />

            {/* Inner shine sweep */}
            <motion.div
              animate={{ x: ['-150%', '250%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)`,
                transform: 'skewX(-20deg)',
                pointerEvents: 'none',
                zIndex: 0, // Behind content (was 1)
              }}
            />

            {/* Floating particles */}
            {showParticles && <FloatingParticles color={accentColor} />}

            {/* Header with handle bar and close button - DRAG AREA (native touch) */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 10px',
                position: 'relative',
                zIndex: 2,
                cursor: 'grab',
                touchAction: 'none', // Prevent scroll in drag area
                flexShrink: 0,
              }}
            >
              {/* Spacer for centering */}
              <div style={{ width: 32 }} />

              {/* Handle bar */}
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: isDragging ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              }} />

              {/* Close button */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                onTouchStart={(e) => e.stopPropagation()}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />
              </motion.button>
            </div>

            {/* Scrollable Content Area (native scroll - no drag conflict) */}
            <div
              data-scroll-container="true"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                padding: 20,
                paddingBottom: 'max(60px, calc(20px + env(safe-area-inset-bottom)))',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM HERO ICON — With Breathing Animation
// ═══════════════════════════════════════════════════════════════════════════

function HeroIcon({
  icon: Icon,
  size = 72
}: {
  icon: typeof Star
  gradient?: string
  glowColor?: string
  size?: number
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Outer breathing ring */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: -6,
          borderRadius: size * 0.32,
          border: '1px solid rgba(212,175,55,0.2)',
          pointerEvents: 'none',
        }}
      />

      {/* Main icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon
            size={size * 0.4}
            color="rgba(212,175,55,0.85)"
            strokeWidth={1.5}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER — Smooth Number Animation
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedValue({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <>{displayValue.toLocaleString('ru-RU')}{suffix}</>
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINIMAL CARD — Clean Monochrome Style
// ═══════════════════════════════════════════════════════════════════════════

function LuxuryCard({
  children,
  gradient,
  borderColor,
  glowColor,
  isActive = false,
  onClick,
  style = {},
}: {
  children: React.ReactNode
  gradient?: string
  borderColor?: string
  glowColor?: string
  isActive?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{
        position: 'relative',
        padding: 16,
        borderRadius: 16,
        background: gradient || 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
        border: `1px solid ${borderColor || (isActive ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)')}`,
        boxShadow: glowColor
          ? `0 4px 30px -4px ${glowColor}60`
          : isActive
            ? '0 4px 30px -4px rgba(212,175,55,0.2)'
            : '0 4px 20px -4px rgba(0,0,0,0.5)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Subtle top highlight */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Monochrome Premium Style
// ═══════════════════════════════════════════════════════════════════════════

interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

const RANKS_DATA = [
  {
    name: 'Резидент',
    cashback: 3,
    minSpent: 0,
    icon: Star,
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)'
  },
  {
    name: 'Партнёр',
    cashback: 5,
    minSpent: 5000,
    icon: TrendingUp,
    color: '#60a5fa',
    gradient: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%)'
  },
  {
    name: 'VIP-Клиент',
    cashback: 7,
    minSpent: 15000,
    icon: Crown,
    color: '#c084fc',
    gradient: 'linear-gradient(135deg, #e9d5ff 0%, #c084fc 100%)'
  },
  {
    name: 'Премиум',
    cashback: 10,
    minSpent: 50000,
    icon: Gem,
    color: '#D4AF37',
    gradient: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 100%)'
  }
]

// ═══════════════════════════════════════════════════════════════════════════
//  HOLOGRAPHIC CARD — The "Black Card" Effect
// ═══════════════════════════════════════════════════════════════════════════

function HolographicCard({
  rank,
  isLocked,
  onClick
}: {
  rank: typeof RANKS_DATA[0]
  isLocked: boolean
  onClick?: () => void
}) {
  const Icon = rank.icon

  // Dynamic gradient based on rank color but darker/premium
  const cardGradient = `
    linear-gradient(135deg, 
      rgba(20, 20, 23, 1) 0%, 
      rgba(30, 30, 35, 1) 100%
    )
  `

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.6/1',
        borderRadius: 24,
        background: cardGradient,
        border: `1px solid ${isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.3)'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: isLocked
          ? '0 10px 30px -10px rgba(0,0,0,0.5)'
          : `0 20px 50px -20px ${rank.color}40`,
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Holographic Foil Effect */}
      {
        !isLocked && (
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              background: `
              linear-gradient(
                115deg, 
                transparent 20%, 
                ${rank.color}20 40%, 
                ${rank.color}40 50%, 
                ${rank.color}20 60%, 
                transparent 80%
              )
            `,
              backgroundSize: '200% 200%',
              zIndex: 1,
              pointerEvents: 'none',
              mixBlendMode: 'overlay'
            }}
          />
        )
      }

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* Top Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: 8,
              borderRadius: 12,
              background: isLocked ? 'rgba(255,255,255,0.05)' : `${rank.color}20`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isLocked ? 'rgba(255,255,255,0.1)' : rank.color + '40'}`
            }}>
              <Icon size={20} color={isLocked ? '#71717a' : rank.color} />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: isLocked ? '#71717a' : '#fff',
              letterSpacing: '0.05em'
            }}>
              {rank.name.toUpperCase()}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10,
              color: isLocked ? '#52525b' : rank.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              CASHBACK
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: isLocked ? '#71717a' : '#fff',
              textShadow: isLocked ? 'none' : `0 0 20px ${rank.color}60`
            }}>
              {rank.cashback}%
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div>
          <div style={{
            fontSize: 11,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: 6
          }}>
            ACADEMIC SALOON
          </div>
          <div style={{
            fontSize: 14,
            color: isLocked ? '#71717a' : '#e4e4e7',
            fontFamily: 'monospace',
            letterSpacing: '0.1em'
          }}>
            •••• •••• •••• {isLocked ? 'LOCKED' : '8888'}
          </div>
        </div>
      </div>
    </motion.div >
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVILEGE SCANNER — Visual Benefit List
// ═══════════════════════════════════════════════════════════════════════════

function PrivilegeScanner({ rank, isLocked }: { rank: typeof RANKS_DATA[0], isLocked: boolean }) {
  const benefits = [
    { label: 'Кешбэк на все заказы', value: `${rank.cashback}%`, highlight: true },
    { label: 'Доступ к закрытому клубу', value: 'Active', icon: CheckCircle },
    { label: 'Приоритет поддержки', value: rank.cashback >= 7 ? 'High' : 'Standard', icon: Zap },
    { label: 'Персональный менеджер', value: rank.cashback >= 10 ? 'VIP' : '—', icon: Crown }
  ]

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#52525b',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 16,
        paddingLeft: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLocked ? '#52525b' : '#22c55e', boxShadow: isLocked ? 'none' : '0 0 10px #22c55e' }} />
        СКАНИРОВАНИЕ ПРИВИЛЕГИЙ
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {benefits.map((benefit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + (i * 0.1) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 14
            }}
          >
            <span style={{ fontSize: 13, color: '#a1a1aa' }}>{benefit.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {benefit.icon && <benefit.icon size={14} color={isLocked ? '#52525b' : benefit.highlight ? rank.color : '#71717a'} />}
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: isLocked ? '#52525b' : benefit.highlight ? rank.color : '#e4e4e7'
              }}>
                {benefit.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — TRUE PREMIUM REDESIGN
// ═══════════════════════════════════════════════════════════════════════════

export function CashbackModal({ isOpen, onClose, user: realUser }: CashbackModalProps) {
  const admin = useAdmin()
  const [selectedRankIndex, setSelectedRankIndex] = useState<number | null>(null)

  // Simulation Logic
  const effectiveCashback = admin.simulatedRank !== null ? admin.simulatedRank : realUser.rank.cashback

  // Find rank based on effective cashback
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === effectiveCashback)

  // Interaction State: If user clicks a rank, show that one. validDefault is current.
  // If nothing selected, show current.
  const activeDisplayIndex = selectedRankIndex !== null ? selectedRankIndex : (currentRankIndex !== -1 ? currentRankIndex : 0)

  const currentRank = RANKS_DATA[currentRankIndex] || RANKS_DATA[0]
  const displayRank = RANKS_DATA[activeDisplayIndex] || RANKS_DATA[0]

  const isLockedView = activeDisplayIndex > currentRankIndex

  // Progress logic
  const nextRank = RANKS_DATA[currentRankIndex + 1]
  const isMax = !nextRank

  let progress = 0
  let spentToNext = 0
  if (admin.simulatedRank !== null) {
    progress = 45
    spentToNext = nextRank ? (nextRank.minSpent - currentRank.minSpent) * 0.55 : 0
  } else {
    progress = realUser.rank.progress
    spentToNext = realUser.rank.spent_to_next
  }

  // Helper to handle rank click
  const handleRankClick = (index: number) => {
    setSelectedRankIndex(index === activeDisplayIndex ? null : index) // Toggle or switch
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor={displayRank.color} showParticles={true}>
      <div style={{ padding: '8px 20px 40px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
          {admin.simulatedRank !== null && (
            <div style={{
              position: 'absolute', top: -10, right: 0,
              fontSize: 9, fontWeight: 700, color: '#fca5a5',
              padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.2)'
            }}>SIM</div>
          )}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ marginBottom: 12, display: 'inline-block' }}
          >
            <div style={{
              padding: '8px 16px',
              borderRadius: 100,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <CreditCard size={14} color="#D4AF37" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.05em' }}>
                LOYALTY SYSTEM
              </span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}
          >
            {isLockedView ? 'Уровень заблокирован' : 'Ваша карта'}
          </motion.h2>
          <motion.p style={{ fontSize: 13, color: '#a1a1aa' }}>
            {isLockedView ? 'Увеличьте оборот для доступа' : 'Активный статус привилегий'}
          </motion.p>
        </div>

        {/* 3D Holographic Card */}
        <div style={{ marginBottom: 32, perspective: 1000 }}>
          <HolographicCard
            rank={displayRank}
            isLocked={isLockedView}
            onClick={() => { }} // Maybe flip animation in future?
          />
        </div>

        {/* Rank Selector / Timeline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative', padding: '0 10px' }}>
          {/* Connecting Line */}
          <div style={{
            position: 'absolute', top: '50%', left: 20, right: 20, height: 2,
            background: 'rgba(255,255,255,0.1)', zIndex: 0, transform: 'translateY(-50%)'
          }} />

          {RANKS_DATA.map((rank, i) => {
            const isActive = i === activeDisplayIndex
            const isUnlocked = i <= currentRankIndex

            return (
              <motion.div
                key={rank.name}
                onClick={() => handleRankClick(i)}
                whileTap={{ scale: 0.9 }}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  y: isActive ? -4 : 0
                }}
                style={{
                  position: 'relative', zIndex: 1,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                }}
              >
                <motion.div
                  animate={{
                    background: isActive ? rank.color : isUnlocked ? 'rgba(255,255,255,0.2)' : '#18181b', // 18181b is dark zinc
                    borderColor: isActive ? rank.color : isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 15px ${rank.color}60` : 'none'
                  }}
                  style={{
                    width: 44, height: 44,
                    borderRadius: 14,
                    borderWidth: 1, borderStyle: 'solid',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.3s'
                  }}
                >
                  <rank.icon size={18} color={isActive ? '#000' : isUnlocked ? '#fff' : '#52525b'} />
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="rankActiveLabel"
                    style={{
                      position: 'absolute', top: 52,
                      fontSize: 10, fontWeight: 700,
                      color: rank.color, whiteSpace: 'nowrap'
                    }}
                  >
                    {rank.name}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Dynamic Content Switching */}
        <AnimatePresence mode="wait">
          <motion.div
            key={displayRank.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* If looking at current rank: Show Progress & Scanner */}
            {activeDisplayIndex === currentRankIndex && (
              <>
                {!isMax && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>Прогресс до следующего уровня</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${displayRank.color}, #fff)`, borderRadius: 3 }}
                      />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#52525b', textAlign: 'right' }}>
                      Осталось: <span style={{ color: '#e4e4e7' }}>{spentToNext.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                )}

                <PrivilegeScanner rank={displayRank} isLocked={false} />
              </>
            )}

            {/* If looking at unlocked past rank */}
            {activeDisplayIndex < currentRankIndex && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 20 }}>
                <CheckCircle size={32} color={displayRank.color} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>Уровень пройден</h3>
                <p style={{ fontSize: 13, color: '#a1a1aa' }}>Вы уже получили все награды этого уровня</p>
              </div>
            )}

            {/* If looking at locked future rank */}
            {activeDisplayIndex > currentRankIndex && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 20 }}>
                <Lock size={32} color="#52525b" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>Уровень недоступен</h3>
                <p style={{ fontSize: 13, color: '#a1a1aa' }}>Потратьте еще {((RANKS_DATA[activeDisplayIndex].minSpent || 0) - (realUser?.total_spent || 0)).toLocaleString('ru-RU')} ₽ для открытия</p>
                <PrivilegeScanner rank={displayRank} isLocked={true} />
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Monochrome Premium Style
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

// Redefined for Grid Layout
const GUARANTEES_GRID = [
  {
    icon: Shield,
    title: 'Уникальность',
    desc: 'Проходим любой Антиплагиат',
    accent: '#D4AF37'
  },
  {
    icon: RefreshCw,
    title: '3 правки',
    desc: 'Включены в стоимость заказа',
    accent: '#22c55e'
  },
  {
    icon: Lock,
    title: 'Анонимно',
    desc: 'Строгая конфиденциальность',
    accent: '#3b82f6'
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    desc: 'Бонус или скидка за задержку',
    accent: '#f59e0b'
  }
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37" showParticles={true}>
      <div style={{ padding: '8px 20px 40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              marginBottom: 16
            }}
          >
            <Shield size={14} color="#D4AF37" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.05em' }}>ВЫСШИЙ СТАНДАРТ</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 28,
              fontWeight: 700,
              color: '#f2f2f2',
              marginBottom: 8,
            }}
          >
            Гарантии
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ fontSize: 13, color: '#a1a1aa', maxWidth: 280, margin: '0 auto' }}
          >
            Гарантируем строгий контроль качества на всех этапах
          </motion.p>
        </div>

        {/* GRID LAYOUT */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 24
        }}>
          {GUARANTEES_GRID.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <div style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 20,
                padding: '20px 16px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '3px',
                  background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`,
                  opacity: 0.5
                }} />

                <div style={{
                  width: 48, height: 48,
                  borderRadius: 16,
                  background: `${item.accent}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                  boxShadow: `0 0 20px ${item.accent}10`
                }}>
                  <item.icon size={22} color={item.accent} strokeWidth={1.5} />
                </div>

                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#f2f2f2',
                  marginBottom: 6
                }}>
                  {item.title}
                </div>

                <div style={{
                  fontSize: 11,
                  color: '#a1a1aa',
                  lineHeight: 1.35
                }}>
                  {item.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(212,175,55,0.05)',
            border: '1px dashed rgba(212,175,55,0.2)',
            fontSize: 11,
            color: '#a1a1aa'
          }}
        >
          <span style={{ color: '#D4AF37', fontWeight: 600 }}>Официальный договор</span> оферты при оформлении каждого заказа
        </motion.div>
      </div>
    </ModalWrapper>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS MODAL — Ultra-Premium Balance Display
// ═══════════════════════════════════════════════════════════════════════════

interface TransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  balance: number
  onViewAll: () => void
}

// Premium orbiting sparkles component
function OrbitingSparkles({ color = '#D4AF37', count = 8 }: { color?: string; count?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.3,
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 120,
            height: 120,
            marginTop: -60,
            marginLeft: -60,
          }}
        >
          <motion.div
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 4 + (i % 3),
              height: 4 + (i % 3),
              marginLeft: -2,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${8 + i * 2}px ${color}`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// Premium decorative corner
function DecorativeCorner({ position, color = '#D4AF37' }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; color?: string }) {
  const posStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 8, left: 8, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'top-right': { top: 8, right: 8, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    'bottom-left': { bottom: 8, left: 8, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    'bottom-right': { bottom: 8, right: 8, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.6, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      style={{
        position: 'absolute',
        width: 20,
        height: 20,
        pointerEvents: 'none',
        ...posStyles[position],
      }}
    />
  )
}

// Premium transaction reason translations
const TRANSACTION_LABELS: Record<string, string> = {
  order_created: '🎁 Бонус за заказ',
  referral_bonus: '👥 Реферальный бонус',
  admin_adjustment: '⚙️ Корректировка баланса',
  order_discount: '💳 Оплата заказа',
  compensation: '💎 Компенсация',
  order_cashback: '✨ Кешбэк',
  bonus_expired: '⏰ Сгорание бонусов',
  daily_luck: '🎰 Ежедневный бонус',
  coupon: '🎟️ Активация купона',
  order_refund: '↩️ Возврат средств',
  roulette_win: '🎯 Выигрыш в рулетке',
  welcome_bonus: '👋 Приветственный бонус',
  achievement: '🏆 Награда за достижение',
  promo_code: '🎫 Промокод',
}

function formatTransactionReason(reason: string): string {
  return TRANSACTION_LABELS[reason] || reason
}

export function TransactionsModal({ isOpen, onClose, transactions, balance, onViewAll }: TransactionsModalProps) {
  const recentTransactions = transactions.slice(0, 5)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37">
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Ultra-Premium Balance Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 200 }}
          style={{ position: 'relative', marginBottom: 32 }}
        >
          {/* Outer glow ring */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 40px rgba(212,175,55,0.2), inset 0 0 40px rgba(212,175,55,0.1)',
                '0 0 80px rgba(212,175,55,0.4), inset 0 0 60px rgba(212,175,55,0.15)',
                '0 0 40px rgba(212,175,55,0.2), inset 0 0 40px rgba(212,175,55,0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'relative',
              padding: 36,
              borderRadius: 28,
              background: `
                linear-gradient(135deg,
                  rgba(212,175,55,0.18) 0%,
                  rgba(212,175,55,0.06) 25%,
                  rgba(179,135,40,0.12) 50%,
                  rgba(212,175,55,0.08) 75%,
                  rgba(252,246,186,0.15) 100%
                )
              `,
              border: '1px solid rgba(212,175,55,0.5)',
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            {/* Holographic overlay */}
            <motion.div
              animate={{
                background: [
                  'linear-gradient(45deg, rgba(252,246,186,0.1) 0%, transparent 50%, rgba(212,175,55,0.1) 100%)',
                  'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, transparent 50%, rgba(252,246,186,0.1) 100%)',
                  'linear-gradient(225deg, rgba(179,135,40,0.1) 0%, transparent 50%, rgba(212,175,55,0.15) 100%)',
                  'linear-gradient(315deg, rgba(252,246,186,0.1) 0%, transparent 50%, rgba(212,175,55,0.1) 100%)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            />

            {/* Animated premium shimmer */}
            <motion.div
              animate={{ x: ['-150%', '250%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                transform: 'skewX(-20deg)',
                zIndex: 1,
              }}
            />

            {/* Decorative corners */}
            <DecorativeCorner position="top-left" />
            <DecorativeCorner position="top-right" />
            <DecorativeCorner position="bottom-left" />
            <DecorativeCorner position="bottom-right" />

            {/* Premium icon with orbiting sparkles */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
                  border: '2px solid rgba(212,175,55,0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6), 0 0 24px rgba(212,175,55,0.2)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <CreditCard size={32} color="#D4AF37" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
              <OrbitingSparkles />
            </div>

            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 24,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
                }}
              />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(212,175,55,0.9)',
                letterSpacing: '0.25em',
                textShadow: '0 0 12px rgba(212,175,55,0.3)',
              }}>ВАШ БАЛАНС</span>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 24,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)',
                }}
              />
            </motion.div>

            {/* Balance amount - Ultra premium */}
            <motion.div
              animate={{
                textShadow: [
                  '0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.2)',
                  '0 0 50px rgba(212,175,55,0.6), 0 0 100px rgba(212,175,55,0.3)',
                  '0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.2)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                fontSize: 64,
                fontWeight: 800,
                fontFamily: "var(--font-serif)",
                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 25%, #B38728 50%, #D4AF37 75%, #FCF6BA 100%)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'premium-shimmer-text 5s ease-in-out infinite',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 6,
                lineHeight: 1,
                position: 'relative',
                zIndex: 2,
              }}
            >
              <AnimatedValue value={balance} />
              <span style={{ fontSize: 38, opacity: 0.9 }}>₽</span>
            </motion.div>

            {/* Premium badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 16,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
                borderRadius: 100,
                border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <Star size={14} color="#D4AF37" fill="rgba(212,175,55,0.3)" />
              </motion.div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.9)',
                letterSpacing: '0.05em',
              }}>Премиум-кошелёк</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Section Header - История операций */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={16} color="rgba(212,175,55,0.8)" />
          </div>
          <div>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.05em',
            }}>История операций</span>
            <div style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 2,
            }}>Последние {Math.min(5, transactions.length)} из {transactions.length}</div>
          </div>
        </motion.div>

        {recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {recentTransactions.map((tx, index) => {
              const isCredit = tx.type === 'credit'
              const color = isCredit ? '#22c55e' : '#ef4444'
              const gradientStart = isCredit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
              const gradientEnd = isCredit ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)'

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 0.35 + index * 0.08, type: 'spring', damping: 20 }}
                >
                  <LuxuryCard
                    gradient={`linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`}
                    borderColor={`${color}30`}
                    style={{ padding: 18 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Animated Icon */}
                      <motion.div
                        animate={isCredit ? { y: [0, -3, 0] } : { y: [0, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                          border: `1px solid ${color}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: `0 4px 16px -4px ${color}40`,
                        }}
                      >
                        {isCredit ? (
                          <ArrowDownRight size={24} color={color} strokeWidth={2} />
                        ) : (
                          <ArrowUpRight size={24} color={color} strokeWidth={2} />
                        )}
                      </motion.div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#fff',
                          marginBottom: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>{formatTransactionReason(tx.reason)}</div>
                        <div style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Clock size={10} />
                          {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Amount with glow */}
                      <motion.div
                        animate={{
                          textShadow: [
                            `0 0 8px ${color}30`,
                            `0 0 16px ${color}50`,
                            `0 0 8px ${color}30`,
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: color,
                        }}
                      >
                        {isCredit ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('ru-RU')} ₽
                      </motion.div>
                    </div>
                  </LuxuryCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <LuxuryCard
              borderColor="rgba(212,175,55,0.2)"
              style={{ padding: 48, textAlign: 'center' }}
            >
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Gift size={28} color="rgba(212,175,55,0.7)" />
              </motion.div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
                marginBottom: 6,
              }}>Пока нет операций</div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
              }}>Ваши транзакции появятся здесь</div>
            </LuxuryCard>
          </motion.div>
        )}

        {/* Premium View All Button */}
        {transactions.length > 5 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(212,175,55,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onViewAll(); onClose(); }}
            style={{
              width: '100%',
              padding: '20px 28px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.1) 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 18,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(212,175,55,0.15)',
            }}
          >
            {/* Animated shimmer */}
            <motion.div
              animate={{ x: ['-150%', '250%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
            <span style={{
              position: 'relative',
              zIndex: 1,
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Смотреть все операции</span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <ArrowRight size={18} color="#D4AF37" />
            </motion.div>
          </motion.button>
        )}
      </div>

      {/* Premium animations keyframes */}
      <style>{`
        @keyframes premium-shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RANKS MODAL — Premium Client Journey
// ═══════════════════════════════════════════════════════════════════════════

interface RanksModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

export function RanksModal({ isOpen, onClose, user }: RanksModalProps) {
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Головорез': 'VIP-Клиент',
    'Легенда Запада': 'Премиум',
  }
  const displayRankName = rankNameMap[user.rank.name] || user.rank.name
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37">
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <HeroIcon
            icon={Crown}
            gradient="linear-gradient(135deg, #D4AF37 0%, #B38728 100%)"
            glowColor="#D4AF37"
            size={96}
          />

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 28,
              fontWeight: 700,
              marginTop: 24,
              marginBottom: 10,
              background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer-text 3s ease-in-out infinite',
            }}
          >
            Путь клиента
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}
          >
            Ваш статус: <span style={{
              color: '#D4AF37',
              fontWeight: 700,
              textShadow: '0 0 12px rgba(212,175,55,0.4)',
            }}>{displayRankName}</span>
          </motion.p>
        </div>

        {/* Vertical Timeline */}
        <div style={{ position: 'relative', paddingLeft: 32, marginBottom: 28 }}>
          {/* Vertical gradient line */}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'calc(100% - 48px)' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              position: 'absolute',
              left: 13,
              top: 24,
              width: 3,
              background: 'linear-gradient(180deg, #D4AF37 0%, rgba(212,175,55,0.2) 100%)',
              borderRadius: 2,
            }}
          />

          {RANKS_DATA.map((rank, index) => {
            const isActive = rank.cashback === user.rank.cashback
            const isPassed = currentRankIndex > index
            const Icon = rank.icon

            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.1 }}
                style={{
                  position: 'relative',
                  marginBottom: index < RANKS_DATA.length - 1 ? 20 : 0,
                  paddingLeft: 32,
                }}
              >
                {/* Timeline node */}
                <motion.div
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 15px rgba(212,175,55,0.4)',
                      '0 0 30px rgba(212,175,55,0.7)',
                      '0 0 15px rgba(212,175,55,0.4)',
                    ],
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isPassed || isActive
                      ? 'linear-gradient(135deg, #D4AF37, #B38728)'
                      : 'rgba(60,60,60,0.6)',
                    border: `3px solid ${isPassed || isActive ? '#D4AF37' : 'rgba(80,80,80,0.5)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(isPassed || isActive) && (
                    <CheckCircle size={14} color="#09090b" strokeWidth={3} />
                  )}
                </motion.div>

                {/* Card */}
                <LuxuryCard
                  gradient={isActive
                    ? `linear-gradient(135deg, ${rank.color}18 0%, ${rank.color}06 100%)`
                    : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                  }
                  borderColor={isActive ? `${rank.color}45` : 'rgba(255,255,255,0.06)'}
                  glowColor={isActive ? rank.color : undefined}
                  isActive={isActive}
                  style={{ padding: 18 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Icon */}
                    <motion.div
                      animate={isActive ? {
                        rotate: [0, 5, -5, 0],
                      } : {}}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: isPassed || isActive
                          ? rank.gradient
                          : 'rgba(60,60,60,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? `0 8px 24px -6px ${rank.color}60` : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Shine */}
                      {(isPassed || isActive) && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                          borderRadius: '16px 16px 50% 50%',
                        }} />
                      )}
                      <Icon
                        size={26}
                        color={isPassed ? '#fff' : isActive ? '#fff' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={isPassed || isActive ? 2 : 1.5}
                        style={{ position: 'relative', zIndex: 1 }}
                      />
                    </motion.div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 17,
                        fontWeight: 700,
                        fontFamily: "var(--font-serif)",
                        color: isActive ? rank.color : isPassed ? '#22c55e' : 'rgba(255,255,255,0.4)',
                        marginBottom: 4,
                        textShadow: isActive ? `0 0 16px ${rank.color}40` : 'none',
                      }}>{rank.name}</div>
                      <div style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                      }}>
                        Кешбэк {rank.cashback}% • от {rank.minSpent.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    {/* Current badge */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.15))',
                          borderRadius: 100,
                          border: '1px solid rgba(212,175,55,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#D4AF37',
                          letterSpacing: '0.05em',
                          lineHeight: 1,
                        }}>ВЫ ЗДЕСЬ</span>
                      </motion.div>
                    )}
                  </div>
                </LuxuryCard>
              </motion.div>
            )
          })}
        </div>

        {/* Progress to Next Level */}
        {!user.rank.is_max && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <LuxuryCard
              gradient="linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)"
              borderColor="rgba(255,255,255,0.08)"
              style={{ padding: 20 }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>До следующего уровня</span>
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 12,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
                  transition={{ delay: 0.9, duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #B38728, #D4AF37, #FCF6BA)',
                    borderRadius: 6,
                    boxShadow: '0 0 16px rgba(212,175,55,0.6)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer on progress */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '40%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                    }}
                  />
                </motion.div>
              </div>
            </LuxuryCard>
          </motion.div>
        )}

        {/* Max Level Badge */}
        {user.rank.is_max && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
          >
            <LuxuryCard
              gradient="linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)"
              borderColor="rgba(212,175,55,0.45)"
              glowColor="#D4AF37"
              isActive
              style={{ padding: 28, textAlign: 'center' }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ fontSize: 44, marginBottom: 12 }}
              >
                👑
              </motion.div>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "var(--font-serif)",
                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer-text 3s ease-in-out infinite',
                marginBottom: 8,
              }}>
                Максимальный уровень!
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                Вы достигли вершины — кешбэк 10%
              </div>
            </LuxuryCard>
          </motion.div>
        )}
      </div>

      {/* CSS Keyframes for shimmer text */}
      <style>{`
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </ModalWrapper>
  )
}
