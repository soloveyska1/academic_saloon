import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Copy, Check, Users, Wallet, Percent, FileText, MessageCircle,
  Calendar, Award, ChevronRight, FolderClosed, Shield, TrendingUp
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '', prefix = '' }: {
  value: number
  suffix?: string
  prefix?: string
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, prefix, suffix])

  return <span className="text-mono">{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  BENTO CELL COMPONENT — THE BUILDING BLOCK
// ═══════════════════════════════════════════════════════════════════════════

interface BentoCellProps {
  children: React.ReactNode
  span?: 1 | 2
  variant?: 'default' | 'vault' | 'gold' | 'archive'
  delay?: number
  onClick?: () => void
  className?: string
}

function BentoCell({ children, span = 1, variant = 'default', delay = 0, onClick, className = '' }: BentoCellProps) {
  const variants = {
    default: {
      background: 'rgba(20, 20, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
    },
    vault: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 23, 0.9) 40%, rgba(212, 175, 55, 0.05) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.2)',
      boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    gold: {
      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(180, 142, 38, 0.08) 100%)',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      boxShadow: '0 15px 40px -15px rgba(0, 0, 0, 0.5), 0 0 40px -15px rgba(212, 175, 55, 0.2)',
    },
    archive: {
      background: 'linear-gradient(180deg, rgba(30, 28, 25, 0.9) 0%, rgba(25, 22, 18, 0.95) 100%)',
      border: '1px solid rgba(196, 165, 116, 0.2)',
      boxShadow: '0 15px 40px -15px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(139, 69, 19, 0.08)',
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={className}
      style={{
        gridColumn: span === 2 ? 'span 2' : 'span 1',
        ...variants[variant],
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 18,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        minHeight: span === 2 ? 'auto' : 100,
      }}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, suffix = '', color, delay, onClick }: {
  icon: typeof FileText
  label: string
  value: number | string
  suffix?: string
  color: string
  delay: number
  onClick?: () => void
}) {
  return (
    <BentoCell delay={delay} onClick={onClick}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "'Playfair Display', serif",
            color: 'var(--text-primary)',
            lineHeight: 1,
            marginBottom: 4,
          }}>
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} suffix={suffix} />
            ) : value}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {label}
          </div>
        </div>
      </div>
    </BentoCell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PROFILE PAGE — "THE DOSSIER"
// ═══════════════════════════════════════════════════════════════════════════

export function ProfilePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, openSupport } = useTelegram()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  // Calculate "money saved" from discount
  const moneySaved = Math.round(user.total_spent * (user.discount / 100))

  // Mock member since date (using first order or current date - 30 days)
  const memberSince = user.orders.length > 0
    ? new Date(user.orders[user.orders.length - 1].created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  // Completed orders count
  const completedOrders = user.orders.filter(o => o.status === 'completed').length

  const copyInviteLink = () => {
    const inviteLink = `https://t.me/AcademicSaloonBot?start=ref_${user.telegram_id}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSupportClick = () => {
    haptic('medium')
    openSupport()
  }

  const handleArchiveClick = () => {
    haptic('medium')
    navigate('/orders?status=completed')
  }

  return (
    <div className="app-content" style={{ paddingBottom: 110 }}>
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Shield size={20} color="#d4af37" />
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24,
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--gold-200), var(--gold-400))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Личное Досье
        </h1>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID LAYOUT
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK A — IDENTITY CARD (Wide Top Block)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="default" delay={0}>
          {/* Animated gradient background */}
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(212,175,55,0.06) 0%, transparent 50%)',
              backgroundSize: '200% 200%',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            {/* Avatar */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(20, 20, 23, 0.9) 100%)',
              border: '2px solid rgba(212, 175, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              boxShadow: '0 0 30px -10px rgba(212, 175, 55, 0.4), inset 0 2px 8px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              {user.rank.emoji}
            </div>

            {/* Name & Status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.fullname}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-gold" style={{ padding: '3px 10px', fontSize: 9 }}>
                  <Award size={10} />
                  {user.rank.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Уровень {user.loyalty.level}
                </span>
              </div>
            </div>
          </div>

          {/* Member Since Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <Calendar size={12} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Агент с <span style={{ color: 'var(--gold-400)' }}>{memberSince}</span>
            </span>
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK B — THE NETWORK (Referral System) — PROMINENT GOLD
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="gold" delay={0.1}>
          {/* Gold ambient glow */}
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px -5px rgba(212, 175, 55, 0.4)',
                }}>
                  <Users size={20} color="#d4af37" />
                </div>
                <div>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--gold-400)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 600,
                  }}>
                    Сеть Агентов
                  </span>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Реферальная программа
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{
              display: 'flex',
              gap: 20,
              marginBottom: 18,
              padding: '14px 16px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 12,
              border: '1px solid rgba(212, 175, 55, 0.15)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Приглашённых
                </div>
                <div className="text-mono" style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
                }}>
                  {user.orders_count > 0 ? Math.floor(user.orders_count / 3) : 0}
                </div>
              </div>
              <div style={{
                width: 1,
                background: 'rgba(212, 175, 55, 0.2)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Заработано
                </div>
                <div className="text-mono" style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--gold-300)',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
                }}>
                  {user.bonus_balance} <span style={{ fontSize: 14 }}>₽</span>
                </div>
              </div>
            </div>

            {/* Invite Link Input */}
            <div style={{
              display: 'flex',
              gap: 10,
              alignItems: 'stretch',
            }}>
              <div style={{
                flex: 1,
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
              }}>
                <span className="text-mono" style={{
                  fontSize: 12,
                  color: 'var(--gold-300)',
                  letterSpacing: '0.05em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  t.me/AcademicSaloonBot?start=ref_{user.telegram_id}
                </span>
              </div>
              <motion.button
                onClick={copyInviteLink}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '14px 20px',
                  background: copied
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
                    : 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))',
                  border: copied
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(212, 175, 55, 0.4)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: copied
                    ? '0 0 20px -5px rgba(34, 197, 94, 0.3)'
                    : '0 0 20px -5px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} color="#22c55e" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>Готово</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} color="#d4af37" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d4af37' }}>Копировать</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Referral Info */}
            <div style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              Получай <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>5%</span> от каждого заказа приглашённых агентов
            </div>
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK C — SERVICE RECORD (2x2 Stats Grid)
            ═══════════════════════════════════════════════════════════════════ */}

        {/* Card A: Total Orders */}
        <StatCard
          icon={FileText}
          label="Всего заказов"
          value={user.orders_count}
          color="#3b82f6"
          delay={0.2}
        />

        {/* Card B: Money Saved */}
        <StatCard
          icon={Wallet}
          label="Сэкономлено"
          value={moneySaved}
          suffix=" ₽"
          color="#22c55e"
          delay={0.25}
        />

        {/* Card C: Personal Discount */}
        <BentoCell variant="vault" delay={0.3}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: '0 0 15px -5px rgba(212, 175, 55, 0.3)',
            }}>
              <Percent size={18} color="#d4af37" />
            </div>
            <div>
              <div className="gold-gradient-text" style={{
                fontSize: 32,
                fontWeight: 800,
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1,
                marginBottom: 4,
              }}>
                <AnimatedCounter value={user.discount} suffix="%" />
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Скидка
              </div>
            </div>

            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>
        </BentoCell>

        {/* Card D: Support */}
        <BentoCell delay={0.35} onClick={handleSupportClick}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <MessageCircle size={18} color="#a855f7" />
            </div>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                marginBottom: 4,
              }}>
                Поддержка
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                color: '#a855f7',
              }}>
                <span>Написать</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK D — PROGRESS TO NEXT LEVEL
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="default" delay={0.4}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              {user.loyalty.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                {user.loyalty.status}
              </div>
              {user.loyalty.orders_to_next > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={10} color="var(--gold-400)" />
                  До повышения: {user.loyalty.orders_to_next} заказов
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="text-mono" style={{ fontSize: 16, color: 'var(--gold-400)', fontWeight: 600 }}>
                +{user.loyalty.discount}%
              </span>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>скидка</div>
            </div>
          </div>

          {/* Progress Bar */}
          {user.loyalty.orders_to_next > 0 && (
            <div style={{
              height: 6,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 100,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(10, 100 - (user.loyalty.orders_to_next * 10))}%` }}
                transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                  borderRadius: 100,
                  boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
                }}
              />
            </div>
          )}
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            BLOCK E — THE ARCHIVE (Completed Contracts)
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="archive" delay={0.45} onClick={handleArchiveClick}>
          {/* Paper texture overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 69, 19, 0.02) 2px, rgba(139, 69, 19, 0.02) 4px)',
            pointerEvents: 'none',
            opacity: 0.5,
          }} />

          {/* Folder tabs */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 30,
            width: 60,
            height: 8,
            background: 'rgba(196, 165, 116, 0.15)',
            borderRadius: '0 0 8px 8px',
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 100,
            width: 40,
            height: 6,
            background: 'rgba(196, 165, 116, 0.1)',
            borderRadius: '0 0 6px 6px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(196, 165, 116, 0.15), rgba(139, 69, 19, 0.1))',
              border: '1px solid rgba(196, 165, 116, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FolderClosed size={26} color="#c4a574" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 700,
                color: '#c4a574',
                marginBottom: 4,
              }}>
                Архив Контрактов
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--gold-400)' }}>{completedOrders}</span> выполненных заказов
              </p>
            </div>
            <ChevronRight size={22} color="#c4a574" />
          </div>

          {/* "CLASSIFIED" stamp effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -15 }}
            animate={{ opacity: 0.08, scale: 1, rotate: -12 }}
            transition={{ delay: 0.8 }}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 20,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 32,
              fontWeight: 700,
              color: '#8b4513',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}
          >
            АРХИВ
          </motion.div>
        </BentoCell>

        {/* ═══════════════════════════════════════════════════════════════════
            LIFETIME STATS ROW
            ═══════════════════════════════════════════════════════════════════ */}
        <BentoCell span={2} variant="default" delay={0.5}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: 4,
              }}>
                Всего инвестировано в знания
              </div>
              <div className="text-mono" style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}>
                <AnimatedCounter value={user.total_spent} suffix=" ₽" />
              </div>
            </div>
            <div style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
              borderRadius: 12,
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}>
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                -{moneySaved.toLocaleString('ru-RU')} ₽
              </span>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                сэкономлено
              </div>
            </div>
          </div>
        </BentoCell>
      </div>
    </div>
  )
}
