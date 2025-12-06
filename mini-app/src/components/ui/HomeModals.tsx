import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  X, Percent, Shield, CheckCircle, TrendingUp, Crown, Star,
  ArrowRight, Clock, RefreshCw, Lock, Eye, Zap, Award,
  Sparkles, Gem, CreditCard, ArrowUpRight, ArrowDownRight,
  Gift, Flame, Trophy
} from 'lucide-react'
import { UserData, Transaction } from '../../types'

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
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          {/* Ambient glow behind modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120%',
              height: '70%',
              background: `radial-gradient(ellipse at center, ${accentColor}15 0%, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 150, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '90vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              // Ultra-premium glass background
              background: `
                linear-gradient(180deg,
                  rgba(25,25,30,0.97) 0%,
                  rgba(15,15,18,0.98) 50%,
                  rgba(10,10,12,0.99) 100%
                )
              `,
              borderRadius: '32px 32px 0 0',
              // Gradient border simulation
              border: '1px solid transparent',
              backgroundClip: 'padding-box',
              position: 'relative',
              // Heavy luxury shadows
              boxShadow: `
                0 -30px 100px rgba(0,0,0,0.6),
                0 0 0 1px rgba(255,255,255,0.08),
                0 0 120px -30px ${accentColor}50,
                inset 0 1px 0 rgba(255,255,255,0.1),
                inset 0 0 80px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Gradient border overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '32px 32px 0 0',
              padding: 1,
              background: `linear-gradient(180deg, ${accentColor}40 0%, ${accentColor}10 30%, transparent 60%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none',
            }} />

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
                zIndex: 1,
              }}
            />

            {/* Floating particles */}
            {showParticles && <FloatingParticles color={accentColor} />}

            {/* Handle bar with glow */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '16px 0 10px',
              position: 'relative',
              zIndex: 2,
            }}>
              <motion.div
                animate={{
                  boxShadow: [
                    `0 0 8px ${accentColor}30`,
                    `0 0 16px ${accentColor}50`,
                    `0 0 8px ${accentColor}30`,
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: 48,
                  height: 5,
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}90, ${accentColor}60)`,
                }}
              />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM HERO ICON — 3D Floating Badge with Glow
// ═══════════════════════════════════════════════════════════════════════════

function HeroIcon({
  icon: Icon,
  gradient,
  glowColor,
  size = 88
}: {
  icon: typeof Star
  gradient: string
  glowColor: string
  size?: number
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Outer glow ring */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: -12,
          borderRadius: size * 0.35,
          background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
        }}
      />

      {/* Main badge */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: size * 0.3,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `
            0 12px 40px -8px ${glowColor}80,
            0 4px 20px rgba(0,0,0,0.4),
            inset 0 2px 0 rgba(255,255,255,0.25),
            inset 0 -3px 0 rgba(0,0,0,0.15)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Glass shine overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 100%)',
          borderRadius: `${size * 0.3}px ${size * 0.3}px 50% 50%`,
        }} />

        {/* Shimmer pass effect */}
        <motion.div
          animate={{ x: ['-150%', '250%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            transform: 'skewX(-20deg)',
          }}
        />

        <Icon
          size={size * 0.45}
          color="#fff"
          strokeWidth={1.8}
          style={{
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />
      </motion.div>

      {/* Sparkle effects */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          style={{
            position: 'absolute',
            top: i === 0 ? -8 : i === 1 ? '20%' : '70%',
            right: i === 0 ? '20%' : i === 1 ? -10 : -6,
            width: 8 - i * 2,
            height: 8 - i * 2,
          }}
        >
          <Sparkles size={8 - i * 2} color={glowColor} />
        </motion.div>
      ))}
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
//  LUXURY CARD — Reusable Premium Card Component
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
  gradient: string
  borderColor: string
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
        padding: 18,
        borderRadius: 20,
        background: gradient,
        border: `1.5px solid ${borderColor}`,
        boxShadow: isActive && glowColor
          ? `0 8px 32px -8px ${glowColor}60, inset 0 1px 0 rgba(255,255,255,0.1)`
          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Inner shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
        borderRadius: '20px 20px 50% 50%',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Ultra-Premium Loyalty System
// ═══════════════════════════════════════════════════════════════════════════

interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

const RANKS_DATA = [
  { name: 'Резидент', cashback: 3, minSpent: 0, icon: Star, color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' },
  { name: 'Партнёр', cashback: 5, minSpent: 5000, icon: TrendingUp, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  { name: 'VIP-Клиент', cashback: 7, minSpent: 15000, icon: Crown, color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  { name: 'Премиум', cashback: 10, minSpent: 50000, icon: Gem, color: '#D4AF37', gradient: 'linear-gradient(135deg, #D4AF37, #B38728)' },
]

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback)
  const currentRank = RANKS_DATA[currentRankIndex] || RANKS_DATA[0]

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#22c55e">
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <HeroIcon
            icon={Percent}
            gradient="linear-gradient(135deg, #22c55e 0%, #15803d 100%)"
            glowColor="#22c55e"
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
              background: 'linear-gradient(135deg, #22c55e 0%, #86efac 50%, #22c55e 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer-text 3s ease-in-out infinite',
            }}
          >
            Система лояльности
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}
          >
            Возврат с каждого заказа на ваш баланс
          </motion.p>
        </div>

        {/* Current Cashback — Hero Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LuxuryCard
            gradient="linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 50%, rgba(212,175,55,0.1) 100%)"
            borderColor="rgba(212,175,55,0.4)"
            glowColor="#D4AF37"
            isActive
            style={{ marginBottom: 28, padding: 28, textAlign: 'center' }}
          >
            {/* Shimmer overlay */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                transform: 'skewX(-20deg)',
                zIndex: 0,
              }}
            />

            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.2em',
              marginBottom: 14,
            }}>
              ВАШ ТЕКУЩИЙ КЕШБЭК
            </div>

            <motion.div
              animate={{
                textShadow: [
                  '0 0 30px rgba(212,175,55,0.3)',
                  '0 0 60px rgba(212,175,55,0.5)',
                  '0 0 30px rgba(212,175,55,0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 64,
                fontWeight: 800,
                fontFamily: "var(--font-serif)",
                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer-text 4s ease-in-out infinite',
                lineHeight: 1,
              }}
            >
              {user.rank.cashback}%
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 16,
                padding: '8px 18px',
                background: `linear-gradient(135deg, ${currentRank.color}30, ${currentRank.color}15)`,
                borderRadius: 100,
                border: `1px solid ${currentRank.color}50`,
              }}
            >
              <currentRank.icon size={16} color={currentRank.color} />
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: currentRank.color,
              }}>
                {currentRank.name}
              </span>
            </motion.div>
          </LuxuryCard>
        </motion.div>

        {/* Ranks Ladder */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 18,
          }}>
            <Trophy size={14} color="#D4AF37" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.15em',
            }}>УРОВНИ ПРОГРАММЫ</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {RANKS_DATA.map((rank, index) => {
              const isActive = index === currentRankIndex
              const isPassed = index < currentRankIndex
              const Icon = rank.icon

              return (
                <motion.div
                  key={rank.name}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                >
                  <LuxuryCard
                    gradient={isActive
                      ? `linear-gradient(135deg, ${rank.color}20 0%, ${rank.color}08 100%)`
                      : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                    }
                    borderColor={isActive ? `${rank.color}50` : 'rgba(255,255,255,0.06)'}
                    glowColor={isActive ? rank.color : undefined}
                    isActive={isActive}
                    style={{ padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Icon Badge */}
                      <motion.div
                        animate={isActive ? {
                          boxShadow: [
                            `0 0 15px ${rank.color}40`,
                            `0 0 25px ${rank.color}60`,
                            `0 0 15px ${rank.color}40`,
                          ]
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: isPassed || isActive
                            ? rank.gradient
                            : 'rgba(60,60,60,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Shine on active */}
                        {isActive && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                            borderRadius: '14px 14px 50% 50%',
                          }} />
                        )}
                        {isPassed ? (
                          <CheckCircle size={24} color="#fff" />
                        ) : (
                          <Icon size={24} color={isActive ? '#fff' : 'rgba(255,255,255,0.3)'} />
                        )}
                      </motion.div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: "var(--font-serif)",
                          color: isActive ? '#fff' : isPassed ? '#22c55e' : 'rgba(255,255,255,0.4)',
                          marginBottom: 3,
                        }}>{rank.name}</div>
                        <div style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.4)',
                        }}>
                          от {rank.minSpent.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>

                      {/* Cashback Value */}
                      <motion.div
                        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          background: isActive
                            ? `linear-gradient(135deg, ${rank.color}, #fff)`
                            : isPassed ? 'linear-gradient(135deg, #22c55e, #86efac)' : 'none',
                          WebkitBackgroundClip: isActive || isPassed ? 'text' : 'unset',
                          WebkitTextFillColor: isActive || isPassed ? 'transparent' : 'rgba(255,255,255,0.3)',
                          textShadow: isActive ? `0 0 20px ${rank.color}50` : 'none',
                        }}
                      >
                        {rank.cashback}%
                      </motion.div>
                    </div>
                  </LuxuryCard>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <LuxuryCard
            gradient="linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 100%)"
            borderColor="rgba(34,197,94,0.25)"
            style={{ padding: 20 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}>
              <Zap size={16} color="#22c55e" />
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#22c55e',
              }}>Как это работает</span>
            </div>
            <ul style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 2,
              margin: 0,
              paddingLeft: 20,
            }}>
              <li>Кешбэк начисляется после завершения заказа</li>
              <li>Баланс можно использовать для оплаты</li>
              <li>Чем выше уровень — тем больше возврат</li>
            </ul>
          </LuxuryCard>
        </motion.div>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Premium Quality Assurance
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    description: 'Доработаем по замечаниям без доплаты',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  },
  {
    icon: Shield,
    title: 'Оригинальность от 85%',
    description: 'Пишем с нуля, не сливаем в базы',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e, #15803d)',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    description: 'Ваши данные защищены и не передаются',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  },
  {
    icon: Clock,
    title: 'Компенсация задержки',
    description: 'Бонус 500₽ или скидка 15% при задержке',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    icon: Eye,
    title: 'Предпросмотр работы',
    description: 'Покажем часть перед финальной оплатой',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  },
  {
    icon: Zap,
    title: 'Возврат до старта',
    description: '100% возврат при отмене до начала',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
  },
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#a855f7">
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <HeroIcon
            icon={Shield}
            gradient="linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)"
            glowColor="#a855f7"
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
              background: 'linear-gradient(135deg, #a855f7 0%, #e9d5ff 50%, #a855f7 100%)',
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer-text 3s ease-in-out infinite',
            }}
          >
            Наши гарантии
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}
          >
            Премиум-сервис с полной защитой
          </motion.p>
        </div>

        {/* Guarantees Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.07 }}
              >
                <LuxuryCard
                  gradient={`linear-gradient(135deg, ${item.color}12 0%, ${item.color}04 100%)`}
                  borderColor={`${item.color}30`}
                  style={{ padding: 18 }}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: item.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 8px 24px -6px ${item.color}60`,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Shine */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
                        borderRadius: '16px 16px 50% 50%',
                      }} />
                      <Icon size={24} color="#fff" strokeWidth={2} style={{ position: 'relative', zIndex: 1 }} />
                    </motion.div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: 4,
                      }}>{item.title}</div>
                      <div style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.5,
                      }}>{item.description}</div>
                    </div>
                  </div>
                </LuxuryCard>
              </motion.div>
            )
          })}
        </div>

        {/* Premium Footer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <LuxuryCard
            gradient="linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)"
            borderColor="rgba(212,175,55,0.3)"
            glowColor="#D4AF37"
            isActive
            style={{ padding: 20, textAlign: 'center' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Gem size={18} color="#D4AF37" />
              </motion.div>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #D4AF37, #FCF6BA, #D4AF37)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer-text 3s ease-in-out infinite',
              }}>
                Премиум качество гарантировано
              </span>
            </div>
          </LuxuryCard>
        </motion.div>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS MODAL — Premium Financial History
// ═══════════════════════════════════════════════════════════════════════════

interface TransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  balance: number
  onViewAll: () => void
}

export function TransactionsModal({ isOpen, onClose, transactions, balance, onViewAll }: TransactionsModalProps) {
  const recentTransactions = transactions.slice(0, 5)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37">
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Balance Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <LuxuryCard
            gradient="linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 50%, rgba(212,175,55,0.1) 100%)"
            borderColor="rgba(212,175,55,0.4)"
            glowColor="#D4AF37"
            isActive
            style={{ marginBottom: 28, padding: 32, textAlign: 'center' }}
          >
            {/* Animated shimmer */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                transform: 'skewX(-20deg)',
                zIndex: 0,
              }}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <CreditCard size={18} color="#D4AF37" />
              </motion.div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.2em',
              }}>ВАШ БАЛАНС</span>
            </div>

            <motion.div
              animate={{
                textShadow: [
                  '0 0 30px rgba(212,175,55,0.3)',
                  '0 0 60px rgba(212,175,55,0.5)',
                  '0 0 30px rgba(212,175,55,0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 56,
                fontWeight: 800,
                fontFamily: "var(--font-serif)",
                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer-text 4s ease-in-out infinite',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 8,
                lineHeight: 1,
              }}
            >
              <AnimatedValue value={balance} />
              <span style={{ fontSize: 36 }}>₽</span>
            </motion.div>
          </LuxuryCard>
        </motion.div>

        {/* Transactions List */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}>
          <Clock size={14} color="rgba(255,255,255,0.4)" />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.15em',
          }}>ПОСЛЕДНИЕ ОПЕРАЦИИ</span>
        </div>

        {recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {recentTransactions.map((tx, index) => {
              const isCredit = tx.type === 'credit'
              const color = isCredit ? '#22c55e' : '#ef4444'

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                >
                  <LuxuryCard
                    gradient={`linear-gradient(135deg, ${color}10 0%, ${color}03 100%)`}
                    borderColor={`${color}25`}
                    style={{ padding: 16 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Icon */}
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isCredit ? (
                          <ArrowDownRight size={22} color={color} />
                        ) : (
                          <ArrowUpRight size={22} color={color} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#fff',
                          marginBottom: 3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>{tx.reason}</div>
                        <div style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.4)',
                        }}>
                          {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: color,
                        textShadow: `0 0 12px ${color}40`,
                      }}>
                        {isCredit ? '+' : '−'}{Math.abs(tx.amount)} ₽
                      </div>
                    </div>
                  </LuxuryCard>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              padding: 50,
              textAlign: 'center',
            }}
          >
            <Gift size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              Пока нет операций
            </div>
          </motion.div>
        )}

        {/* View All Button */}
        {transactions.length > 5 && (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onViewAll(); onClose(); }}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
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
            }}
          >
            {/* Hover shimmer */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Все операции</span>
            <ArrowRight size={18} style={{ position: 'relative', zIndex: 1 }} />
          </motion.button>
        )}
      </div>
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
                          padding: '6px 14px',
                          background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.15))',
                          borderRadius: 100,
                          border: '1px solid rgba(212,175,55,0.4)',
                        }}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#D4AF37',
                          letterSpacing: '0.1em',
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
