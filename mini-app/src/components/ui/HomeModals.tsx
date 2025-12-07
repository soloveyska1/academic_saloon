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

            {/* Header with handle bar and close button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px 10px',
              position: 'relative',
              zIndex: 2,
            }}>
              {/* Spacer for centering */}
              <div style={{ width: 32 }} />

              {/* Handle bar */}
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.15)',
              }} />

              {/* Close button */}
              <motion.button
                onClick={onClose}
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
        border: `1px solid ${borderColor || 'rgba(212,175,55,0.15)'}`,
        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.5)',
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
  { name: 'Резидент', cashback: 3, minSpent: 0, icon: Star },
  { name: 'Партнёр', cashback: 5, minSpent: 5000, icon: TrendingUp },
  { name: 'VIP-Клиент', cashback: 7, minSpent: 15000, icon: Crown },
  { name: 'Премиум', cashback: 10, minSpent: 50000, icon: Gem },
]

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback)
  const currentRank = RANKS_DATA[currentRankIndex] || RANKS_DATA[0]

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37" showParticles={false}>
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <HeroIcon icon={Percent} />

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 20,
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Система лояльности
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
          >
            Возврат с каждого заказа на ваш баланс
          </motion.p>
        </div>

        {/* Current Cashback */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <LuxuryCard
            borderColor="rgba(212,175,55,0.3)"
            style={{ marginBottom: 24, padding: 24, textAlign: 'center' }}
          >
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.15em',
              marginBottom: 12,
            }}>
              ВАШ ТЕКУЩИЙ КЕШБЭК
            </div>

            <motion.div
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontSize: 48,
                fontWeight: 700,
                fontFamily: "var(--font-serif)",
                color: 'rgba(212,175,55,0.9)',
                lineHeight: 1,
                marginBottom: 14,
              }}
            >
              {user.rank.cashback}%
            </motion.div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'rgba(212,175,55,0.1)',
              borderRadius: 100,
              border: '1px solid rgba(212,175,55,0.2)',
            }}>
              <currentRank.icon size={14} color="rgba(212,175,55,0.7)" strokeWidth={1.5} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.8)',
              }}>
                {currentRank.name}
              </span>
            </div>
          </LuxuryCard>
        </motion.div>

        {/* Ranks List */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.12em',
            marginBottom: 14,
            paddingLeft: 4,
          }}>УРОВНИ ПРОГРАММЫ</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RANKS_DATA.map((rank, index) => {
              const isActive = index === currentRankIndex
              const isPassed = index < currentRankIndex
              const Icon = rank.icon

              return (
                <motion.div
                  key={rank.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                >
                  <LuxuryCard
                    borderColor={isActive ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}
                    style={{ padding: 14 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Icon */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'rgba(212,175,55,0.08)',
                        border: `1px solid ${isActive ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.1)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isPassed ? (
                          <CheckCircle size={18} color="rgba(212,175,55,0.7)" strokeWidth={1.5} />
                        ) : (
                          <Icon size={18} color={isActive ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.25)'} strokeWidth={1.5} />
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isActive ? 'rgba(255,255,255,0.9)' : isPassed ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.4)',
                          marginBottom: 2,
                        }}>{rank.name}</div>
                        <div style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.35)',
                        }}>
                          от {rank.minSpent.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>

                      {/* Cashback */}
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: isActive ? 'rgba(212,175,55,0.9)' : isPassed ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.25)',
                      }}>
                        {rank.cashback}%
                      </div>
                    </div>
                  </LuxuryCard>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Progress to Next Level */}
        {!user.rank.is_max && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ marginBottom: 24 }}
          >
            <LuxuryCard borderColor="rgba(212,175,55,0.2)" style={{ padding: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  До следующего уровня
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(212,175,55,0.8)',
                }}>
                  {user.rank.spent_to_next.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <div style={{
                height: 6,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
                  transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,0.9))',
                    borderRadius: 3,
                  }}
                />
              </div>
            </LuxuryCard>
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <LuxuryCard style={{ padding: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <Zap size={14} color="rgba(212,175,55,0.7)" strokeWidth={1.5} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.8)',
              }}>Как это работает</span>
            </div>
            <ul style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.9,
              margin: 0,
              paddingLeft: 18,
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
//  GUARANTEES MODAL — Monochrome Premium Style
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
  },
  {
    icon: Shield,
    title: 'Оригинальность от 85%',
    description: 'Пишем с нуля, не сливаем в базы',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    description: 'Ваши данные защищены и не передаются',
  },
  {
    icon: Clock,
    title: 'Компенсация задержки',
    description: 'Бонус 500₽ или скидка 15% при задержке',
  },
  {
    icon: Eye,
    title: 'Предпросмотр работы',
    description: 'Покажем часть перед финальной оплатой',
  },
  {
    icon: Zap,
    title: 'Возврат до старта',
    description: '100% возврат при отмене до начала',
  },
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#D4AF37" showParticles={false}>
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <HeroIcon icon={Shield} />

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 700,
              marginTop: 20,
              marginBottom: 8,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Наши гарантии
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}
          >
            Премиум-сервис с полной защитой
          </motion.p>
        </div>

        {/* Guarantees List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            const isTop = index < 2 // Первые 2 — топовые

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
              >
                <LuxuryCard
                  borderColor={isTop ? 'rgba(212,175,55,0.3)' : undefined}
                  style={{ padding: 14 }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Icon */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: isTop ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.06)',
                      border: `1px solid ${isTop ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} color={isTop ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.7)'} strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2,
                      }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isTop ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                        }}>{item.title}</span>
                        {isTop && (
                          <span style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: 'rgba(212,175,55,0.9)',
                            background: 'rgba(212,175,55,0.15)',
                            padding: '2px 5px',
                            borderRadius: 4,
                            letterSpacing: '0.05em',
                          }}>ТОП</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.4)',
                        lineHeight: 1.4,
                      }}>{item.description}</div>
                    </div>

                    {/* Checkmark */}
                    <CheckCircle size={16} color={isTop ? 'rgba(212,175,55,0.7)' : 'rgba(212,175,55,0.4)'} strokeWidth={1.5} />
                  </div>
                </LuxuryCard>
              </motion.div>
            )
          })}
        </div>

        {/* Social Proof Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <LuxuryCard
            borderColor="rgba(212,175,55,0.2)"
            style={{ padding: 16 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <Award size={18} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                  }}>1 200+ заказов</div>
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.4)',
                  }}>выполнено без нареканий</div>
                </div>
              </div>
              <div style={{
                display: 'flex',
                gap: 2,
              }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={12} color="rgba(212,175,55,0.8)" fill="rgba(212,175,55,0.8)" />
                ))}
              </div>
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
