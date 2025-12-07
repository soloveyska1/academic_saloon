import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp, Gift, QrCode,
  Star, Zap, Crown, CreditCard, Briefcase, Award, Target, Sparkles, Flame,
  GraduationCap, Clock, Percent, FileText, ChevronDown, ArrowRight, Medal, Gem, Shield
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode, fetchDailyBonusInfo, claimDailyBonus, DailyBonusInfo } from '../api/userApi'
import { QRCodeModal } from '../components/ui/QRCode'
import { Confetti } from '../components/ui/Confetti'
import { DailyBonusModal } from '../components/ui/DailyBonus'
import { CashbackModal, GuaranteesModal, TransactionsModal, RanksModal } from '../components/ui/HomeModals'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix])

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  ULTRA-PREMIUM GLASS CARD STYLES
//  Rule: Never flat backgrounds, always gradient borders, gold-tinted shadows
// ═══════════════════════════════════════════════════════════════════════════

const glassStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  padding: 20,
  // Glass background
  background: 'var(--bg-card)',
  // Heavy blur
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  // Gradient border simulating light on edges
  border: '1px solid var(--card-border)',
  // Gold-tinted shadow (THE SECRET)
  boxShadow: 'var(--card-shadow)',
}

const glassGoldStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  padding: 20,
  // Premium gold gradient background
  background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(212,175,55,0.04) 100%)',
  // Heavy blur
  backdropFilter: 'blur(24px) saturate(130%)',
  WebkitBackdropFilter: 'blur(24px) saturate(130%)',
  // Gold gradient border
  border: '1px solid var(--border-gold)',
  // Gold aura shadow
  boxShadow: 'var(--card-shadow), inset 0 0 60px rgba(212, 175, 55, 0.03)',
}

// Inner shine effect component for cards
const CardInnerShine = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)',
    pointerEvents: 'none',
    borderRadius: 'inherit',
  }} />
)

// ═══════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT BADGE COMPONENT — Glass Pills Style
// ═══════════════════════════════════════════════════════════════════════════

function AchievementBadge({ icon: Icon, label, unlocked, glow }: {
  icon: typeof Star
  label: string
  unlocked: boolean
  glow?: boolean
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={unlocked ? { scale: 1.05 } : {}}
      whileTap={unlocked ? { scale: 0.95 } : {}}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Premium Badge */}
      <motion.div
        animate={unlocked && glow ? {
          boxShadow: [
            '0 0 15px rgba(212,175,55,0.4)',
            '0 0 25px rgba(212,175,55,0.6)',
            '0 0 15px rgba(212,175,55,0.4)'
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: 16,
          background: unlocked
            ? 'linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.15) 50%, rgba(212,175,55,0.2) 100%)'
            : 'rgba(40,40,40,0.5)',
          border: unlocked
            ? '1.5px solid rgba(212,175,55,0.6)'
            : '1px solid rgba(80,80,80,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: unlocked
            ? '0 4px 20px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
            : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Inner shine for unlocked */}
        {unlocked && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
            borderRadius: '16px 16px 0 0',
          }} />
        )}
        <Icon
          size={24}
          color={unlocked ? '#D4AF37' : 'rgba(100,100,100,0.5)'}
          strokeWidth={unlocked ? 2 : 1.5}
          fill={unlocked ? 'rgba(212,175,55,0.2)' : 'none'}
          style={{
            position: 'relative',
            zIndex: 1,
            filter: unlocked ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none',
          }}
        />
      </motion.div>
      <span style={{
        fontSize: 9,
        color: unlocked ? 'var(--text-secondary)' : 'rgba(100,100,100,0.5)',
        textAlign: 'center',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM TIPS CAROUSEL — Monochrome Luxury Style
// ═══════════════════════════════════════════════════════════════════════════

const tipsData = [
  {
    id: 1,
    icon: GraduationCap,
    title: 'Курсовые',
    subtitle: 'от 14 000 ₽',
    action: 'navigate' as const,
    route: '/create-order?type=coursework',
  },
  {
    id: 2,
    icon: Clock,
    title: 'Срочные',
    subtitle: 'за 24 часа',
    action: 'navigate' as const,
    route: '/create-order?urgent=true',
  },
  {
    id: 3,
    icon: Percent,
    title: 'Кешбэк',
    subtitle: 'до 10%',
    action: 'modal' as const,
    modal: 'cashback',
  },
  {
    id: 4,
    icon: Shield,
    title: 'Гарантии',
    subtitle: '100% качество',
    action: 'modal' as const,
    modal: 'guarantees',
  },
]

function TipsCarousel({ onNavigate, onOpenModal, haptic }: {
  onNavigate: (route: string) => void
  onOpenModal: (modal: 'cashback' | 'guarantees') => void
  haptic: (style: 'light' | 'medium' | 'heavy') => void
}) {
  const handleClick = (tip: typeof tipsData[0]) => {
    haptic('light')
    if (tip.action === 'navigate' && tip.route) {
      onNavigate(tip.route)
    } else if (tip.action === 'modal' && tip.modal) {
      onOpenModal(tip.modal as 'cashback' | 'guarantees')
    }
  }

  return (
    <div style={{
      margin: '0 -20px 24px',
      padding: '8px 20px',
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      <style>{`.tips-scroll::-webkit-scrollbar { display: none; }`}</style>
      <motion.div
        className="tips-scroll"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'flex',
          gap: 12,
          paddingBottom: 8,
        }}
      >
        {tipsData.map((tip, index) => (
          <motion.div
            key={tip.id}
            onClick={() => handleClick(tip)}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flexShrink: 0,
              width: 110,
              padding: '16px 14px',
              borderRadius: 18,
              cursor: 'pointer',
              position: 'relative',
              // Dark glass background
              background: 'linear-gradient(145deg, rgba(25,25,28,0.95) 0%, rgba(18,18,20,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              // Subtle gold border
              border: '1px solid rgba(212,175,55,0.2)',
              // Minimal shadow
              boxShadow: '0 4px 20px -4px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Subtle top highlight */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Icon — thin outline, no background badge */}
              <tip.icon
                size={26}
                color="rgba(212,175,55,0.85)"
                strokeWidth={1.5}
                style={{
                  marginBottom: 12,
                  opacity: 0.9,
                }}
              />

              {/* Title */}
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                marginBottom: 3,
                letterSpacing: '0.01em',
              }}>
                {tip.title}
              </div>

              {/* Subtitle */}
              <div style={{
                fontSize: 10,
                color: 'rgba(212,175,55,0.6)',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}>
                {tip.subtitle}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAST ORDER CARD — Premium Style with Work Type Icons
// ═══════════════════════════════════════════════════════════════════════════

// Work type to icon mapping for visual distinction
const workTypeIconMap: Record<string, typeof GraduationCap> = {
  'Курсовая работа': GraduationCap,
  'Дипломная работа': Award,
  'Реферат': FileText,
  'Контрольная работа': Target,
  'Эссе': FileText,
  'Отчёт по практике': Briefcase,
  'Диссертация': Crown,
  'Презентация': Sparkles,
  'Задача': Zap,
  'Лабораторная работа': Flame,
  'Чертёж': Target,
  'Фото задания': Zap,
}

const orderStatusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'draft': { label: 'Черновик', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  'pending': { label: 'Ожидает', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'waiting_estimation': { label: 'Оценка', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'waiting_payment': { label: 'К оплате', color: '#D4AF37', bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.4)' },
  'verification_pending': { label: 'Проверка', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  'confirmed': { label: 'Подтверждён', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'paid': { label: 'Оплачен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'paid_full': { label: 'Оплачен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'in_progress': { label: 'В работе', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
  'review': { label: 'На проверке', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' },
  'revision': { label: 'Доработка', color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  'completed': { label: 'Выполнен', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  'cancelled': { label: 'Отменён', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  'rejected': { label: 'Отклонён', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
}

function LastOrderCard({ order, onClick }: { order: { id: number; work_type_label: string; subject: string; status: string; created_at: string }; onClick: () => void }) {
  const status = orderStatusMap[order.status] || { label: order.status, color: '#888', bg: 'rgba(136,136,136,0.15)', border: 'rgba(136,136,136,0.3)' }
  const title = order.subject || order.work_type_label || `Заказ #${order.id}`
  // Get work type icon or fallback to FileText
  const WorkTypeIcon = workTypeIconMap[order.work_type_label] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26 }}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        ...glassStyle,
        marginBottom: 16,
        cursor: 'pointer',
        border: `1px solid ${status.border}`,
        background: `linear-gradient(135deg, ${status.bg} 0%, var(--bg-card) 50%)`,
      }}
    >
      <CardInnerShine />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
        <motion.div
          animate={['pending', 'in_progress', 'review', 'waiting_payment'].includes(order.status) ? {
            boxShadow: [
              `0 0 12px ${status.color}40`,
              `0 0 20px ${status.color}60`,
              `0 0 12px ${status.color}40`,
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: status.bg,
            border: `1px solid ${status.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WorkTypeIcon size={22} color={status.color} strokeWidth={1.5} />
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
            }}>ПОСЛЕДНИЙ ЗАКАЗ</span>
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-main)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title}
          </div>
          <div style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            background: status.bg,
            border: `1px solid ${status.border}`,
            borderRadius: 100,
          }}>
            <motion.div
              animate={['pending', 'in_progress'].includes(order.status) ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: status.color,
                boxShadow: `0 0 8px ${status.color}`,
              }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: status.color,
            }}>
              {status.label}
            </span>
          </div>
        </div>
        <ArrowRight size={20} color="var(--text-muted)" strokeWidth={1.5} />
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  COLLAPSIBLE PROMO CODE — Premium Accordion with Active Badge
// ═══════════════════════════════════════════════════════════════════════════

function CollapsiblePromoCode({
  promoCode,
  setPromoCode,
  promoLoading,
  promoMessage,
  onSubmit,
  activePromo,
}: {
  promoCode: string
  setPromoCode: (v: string) => void
  promoLoading: boolean
  promoMessage: { type: 'success' | 'error'; text: string } | null
  onSubmit: () => void
  activePromo?: { code: string; discount: number } | null
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      style={{
        ...glassStyle,
        marginBottom: 16,
        padding: 0,
        overflow: 'hidden',
        border: activePromo ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--card-border)',
        background: activePromo
          ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, var(--bg-card) 50%)'
          : 'var(--bg-card)',
      }}
    >
      <CardInnerShine />
      {/* Collapsed Header */}
      <motion.div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={activePromo ? {
              boxShadow: [
                '0 0 12px rgba(34,197,94,0.3)',
                '0 0 20px rgba(34,197,94,0.5)',
                '0 0 12px rgba(34,197,94,0.3)',
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: activePromo
                ? 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))'
                : 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              border: activePromo
                ? '1px solid rgba(34,197,94,0.5)'
                : '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={18} color={activePromo ? '#22c55e' : 'var(--gold-400)'} strokeWidth={1.5} />
          </motion.div>
          <div>
            {activePromo ? (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#22c55e',
                    letterSpacing: '0.05em',
                  }}>{activePromo.code}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#22c55e',
                    background: 'rgba(34,197,94,0.15)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>−{activePromo.discount}%</span>
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'rgba(34,197,94,0.7)',
                  marginTop: 2,
                }}>Промокод активен</div>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}>Есть промокод?</div>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}>Активируйте скидку</div>
              </>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} color="var(--text-muted)" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 18px 18px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 16,
            }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Введите код"
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    color: 'var(--text-main)',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-gold)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.1), var(--glow-gold)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-default)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onSubmit}
                  disabled={promoLoading}
                  style={{
                    padding: '14px 22px',
                    background: promoLoading ? 'var(--text-muted)' : 'var(--gold-metallic)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#09090b',
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    cursor: promoLoading ? 'wait' : 'pointer',
                    boxShadow: promoLoading ? 'none' : '0 0 20px -5px rgba(212,175,55,0.4)',
                  }}
                >
                  {promoLoading ? '...' : 'OK'}
                </motion.button>
              </div>
              {promoMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    color: promoMessage.type === 'success' ? 'var(--success-text)' : 'var(--error-text)',
                  }}
                >
                  {promoMessage.text}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPACT ACHIEVEMENTS ROW — Single Line Premium with Next Preview
// ═══════════════════════════════════════════════════════════════════════════

function CompactAchievements({ achievements, onViewAll }: {
  achievements: { icon: typeof Star; label: string; unlocked: boolean; glow?: boolean; description?: string }[]
  onViewAll: () => void
}) {
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const lastUnlocked = [...achievements].reverse().find(a => a.unlocked)
  const nextToUnlock = achievements.find(a => !a.unlocked)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      onClick={onViewAll}
      whileTap={{ scale: 0.98 }}
      style={{
        ...glassStyle,
        marginBottom: 16,
        cursor: 'pointer',
        padding: '16px 18px',
      }}
    >
      <CardInnerShine />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Achievement icons stack - last unlocked + next to unlock */}
          <div style={{ position: 'relative', width: 52, height: 44 }}>
            {/* Last unlocked (main) */}
            <motion.div
              animate={lastUnlocked?.glow ? {
                boxShadow: [
                  '0 0 12px rgba(212,175,55,0.3)',
                  '0 0 20px rgba(212,175,55,0.5)',
                  '0 0 12px rgba(212,175,55,0.3)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: lastUnlocked
                  ? 'linear-gradient(145deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.15) 100%)'
                  : 'rgba(40,40,40,0.5)',
                border: lastUnlocked
                  ? '1.5px solid rgba(212,175,55,0.6)'
                  : '1px solid rgba(80,80,80,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {lastUnlocked ? (
                <lastUnlocked.icon
                  size={22}
                  color="#D4AF37"
                  strokeWidth={2}
                  fill="rgba(212,175,55,0.2)"
                />
              ) : (
                <Award size={22} color="rgba(100,100,100,0.5)" strokeWidth={1.5} />
              )}
            </motion.div>
            {/* Next to unlock (preview - smaller, offset) */}
            {nextToUnlock && (
              <motion.div
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: 'rgba(40,40,40,0.8)',
                  border: '1px dashed rgba(212,175,55,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                }}
              >
                <nextToUnlock.icon
                  size={12}
                  color="rgba(212,175,55,0.5)"
                  strokeWidth={1.5}
                />
              </motion.div>
            )}
          </div>
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}>ДОСТИЖЕНИЯ</div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-main)',
            }}>
              {lastUnlocked ? lastUnlocked.label : 'Начните путь'}
            </div>
            {/* Next to unlock hint */}
            {nextToUnlock && (
              <div style={{
                fontSize: 10,
                color: 'rgba(212,175,55,0.6)',
                marginTop: 2,
              }}>
                Далее: {nextToUnlock.label}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4 }}>
            {achievements.map((a, i) => (
              <motion.div
                key={i}
                animate={!a.unlocked && i === unlockedCount ? {
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 0.8, 0.4],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: a.unlocked
                    ? 'var(--gold-metallic)'
                    : 'rgba(80,80,80,0.4)',
                  boxShadow: a.unlocked ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
                  border: !a.unlocked && i === unlockedCount ? '1px solid rgba(212,175,55,0.4)' : 'none',
                }}
              />
            ))}
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>{unlockedCount}/{achievements.length}</span>
          <ChevronRight size={18} color="var(--text-muted)" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE — HEAVY LUXURY PREMIUM
// ═══════════════════════════════════════════════════════════════════════════

// Floating Gold Particles Component (kept for extra sparkle)
const FloatingParticles = () => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + (i * 12) % 80}%`,
    top: `${15 + (i * 15) % 70}%`,
    delay: `${i * 0.9}s`,
    size: 2 + (i % 2),
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {particles.map(p => (
        <div
          key={p.id}
          className="gold-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: `${8 + p.id % 3}s`,
          }}
        />
      ))}
    </div>
  )
}

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, tg } = useTelegram()
  const admin = useAdmin()
  const [copied, setCopied] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [dailyBonusInfo, setDailyBonusInfo] = useState<DailyBonusInfo | null>(null)
  const [dailyBonusError, setDailyBonusError] = useState(false)
  // New modals
  const [showCashbackModal, setShowCashbackModal] = useState(false)
  const [showGuaranteesModal, setShowGuaranteesModal] = useState(false)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [showRanksModal, setShowRanksModal] = useState(false)

  // Fetch daily bonus info on mount with retry
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3

    const loadDailyBonus = async () => {
      try {
        const info = await fetchDailyBonusInfo()
        setDailyBonusInfo(info)
        setDailyBonusError(false)
      } catch (err) {
        console.error('Failed to load daily bonus:', err)
        retryCount++
        if (retryCount < maxRetries) {
          // Retry with exponential backoff
          setTimeout(loadDailyBonus, 1000 * retryCount)
        } else {
          setDailyBonusError(true)
        }
      }
    }

    loadDailyBonus()
  }, [])

  // Secret admin activation (5 quick taps on logo badge)
  const tapCountRef = useRef(0)
  const lastTapTimeRef = useRef(0)

  const handleSecretTap = useCallback(() => {
    if (!admin.isAdmin) return // Only for admins

    const now = Date.now()
    // Reset if more than 500ms between taps
    if (now - lastTapTimeRef.current > 500) {
      tapCountRef.current = 1
    } else {
      tapCountRef.current += 1
      if (tapCountRef.current >= 5) {
        haptic('heavy')
        openAdminPanel() // Open the admin panel via global function
        tapCountRef.current = 0
      }
    }
    lastTapTimeRef.current = now
  }, [admin.isAdmin, haptic])

  // Use real daily bonus data from API
  const canClaimBonus = dailyBonusInfo?.can_claim ?? false
  const dailyStreak = dailyBonusInfo?.streak ?? 1

  if (!user) return null

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const handlePanicOrder = () => {
    haptic('heavy')
    navigate('/create-order?type=photo_task&urgent=true')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referral_code)
    setCopied(true)
    hapticSuccess()
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePromoSubmit = async () => {
    if (!promoCode.trim() || promoLoading) return
    setPromoLoading(true)
    setPromoMessage(null)
    try {
      const result = await applyPromoCode(promoCode.trim())
      if (result.success) {
        setPromoMessage({ type: 'success', text: result.message || 'Промокод активирован!' })
        setPromoCode('')
        hapticSuccess()
      } else {
        setPromoMessage({ type: 'error', text: result.message || 'Неверный промокод' })
      }
    } catch {
      setPromoMessage({ type: 'error', text: 'Ошибка сети' })
    }
    setPromoLoading(false)
    setTimeout(() => setPromoMessage(null), 3000)
  }

  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  // Premium rank name mapping (backend rank names → display names)
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Головорез': 'VIP-Клиент',
    'Легенда Запада': 'Премиум',
  }
  const displayRankName = rankNameMap[user.rank.name] || user.rank.name
  const displayNextRank = user.rank.next_rank ? (rankNameMap[user.rank.next_rank] || user.rank.next_rank) : null

  // Achievement badges based on user data
  // Dynamic achievements based on real user data
  const allAchievements = [
    { icon: Star, label: 'Первый шаг', unlocked: user.orders_count >= 1, description: 'Первый заказ' },
    { icon: Medal, label: 'Постоянный', unlocked: user.orders_count >= 5, description: '5 заказов' },
    { icon: Crown, label: 'VIP статус', unlocked: user.rank.level >= 3, description: 'VIP уровень' },
    { icon: Zap, label: 'Молниеносный', unlocked: user.orders_count >= 1, description: 'Быстрый заказ' }, // Assume true if has orders
    { icon: Gem, label: 'Щедрая душа', unlocked: user.total_spent >= 10000, description: '10 000₽ потрачено' },
    { icon: Target, label: 'Рефералы', unlocked: user.referrals_count >= 3, description: '3+ приглашённых' },
    { icon: Flame, label: 'Джекпот', unlocked: false, description: 'Выигрыш в рулетке', glow: true },
    { icon: Sparkles, label: 'Легенда', unlocked: user.rank.level >= 4, description: 'Макс. уровень', glow: true },
  ]
  const achievements = allAchievements // Pass all for accurate count

  // User's Telegram photo
  const userPhoto = tg?.initDataUnsafe?.user?.photo_url
  const [avatarError, setAvatarError] = useState(false)

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 100px', background: 'var(--bg-main)', position: 'relative' }}>
      {/* Background particles */}
      <FloatingParticles />

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER WITH AVATAR — Ultra-Premium
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* User Avatar with Spinning Gold Ring + VIP Glow */}
          <div style={{ position: 'relative' }}>
            {/* VIP Glow Effect for Max Rank */}
            {user.rank.is_max && (
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)',
                  filter: 'blur(4px)',
                }}
              />
            )}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
              }}
            />
            <div style={{
              position: 'relative',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {userPhoto && !avatarError ? (
                <img
                  src={userPhoto}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 20,
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {user.fullname?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>

          {/* Greeting — Premium Serif + Gold Name */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              {getTimeGreeting()},
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              letterSpacing: '0.02em',
              background: user.rank.is_max
                ? 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #BF953F 100%)'
                : 'var(--text-main)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: user.rank.is_max ? 'transparent' : 'var(--text-main)',
              filter: user.rank.is_max ? 'drop-shadow(0 0 8px rgba(212,175,55,0.3))' : 'none',
            }}>
              {user.fullname?.split(' ')[0] || 'Гость'}
            </div>
            {/* Premium Streak Badge */}
            {user.daily_bonus_streak > 0 && (
              <div style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 100,
              }}>
                <span style={{ fontSize: 10 }}>🔥</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#fb923c',
                  letterSpacing: '0.03em',
                }}>
                  {user.daily_bonus_streak} {user.daily_bonus_streak === 1 ? 'день' : user.daily_bonus_streak < 5 ? 'дня' : 'дней'} подряд
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Logo Badge — Premium with Subtle Shimmer (5 taps opens admin panel) */}
        <motion.div
          onClick={handleSecretTap}
          whileTap={{ scale: 0.97 }}
          animate={{
            boxShadow: [
              '0 0 15px rgba(212,175,55,0.2)',
              '0 0 25px rgba(212,175,55,0.35)',
              '0 0 15px rgba(212,175,55,0.2)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, rgba(30,28,20,0.95), rgba(20,18,12,0.95))',
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.5)',
            cursor: 'default',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Shimmer — passes through occasionally */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
              zIndex: 1,
            }}
          />
          <span style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.12em',
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>ЭЛИТНЫЙ КЛУБ</span>
        </motion.div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          TIPS CAROUSEL — Premium Horizontal Scroll
          ═══════════════════════════════════════════════════════════════════ */}
      <TipsCarousel
        onNavigate={navigate}
        onOpenModal={(modal) => {
          if (modal === 'cashback') setShowCashbackModal(true)
          else if (modal === 'guarantees') setShowGuaranteesModal(true)
        }}
        haptic={haptic}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID: BALANCE & LEVEL — Ultra-Premium Glass Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* BALANCE — Vault Style with Gold Gradient Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { haptic('light'); setShowTransactionsModal(true) }}
          className="breathing-card pulse-border-gold"
          style={{ ...glassGoldStyle, boxShadow: 'var(--card-shadow), 0 0 50px -15px rgba(212,175,55,0.25)', cursor: 'pointer' }}
        >
          {/* Inner Shine Effect */}
          <CardInnerShine />
          {/* Gold Radial Glow */}
          <div
            className="radial-glow"
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CreditCard size={14} color="var(--gold-400)" strokeWidth={1.5} className="glow-pulse" />
              <span className="float-label" style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: 700,
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>СЧЁТ</span>
            </div>
            {/* Balance with Gold Gradient Currency Symbol */}
            <div style={{
              fontSize: 30,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'baseline',
            }}>
              <AnimatedCounter value={user.balance} />
              <span style={{
                marginLeft: 6,
                fontSize: 24,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.4))',
              }}>₽</span>
            </div>
            {/* Cashback Badge — Glass Pill */}
            <div style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 12px',
              background: user.rank.is_max
                ? 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.25) 100%)'
                : 'var(--success-glass)',
              border: user.rank.is_max
                ? '1px solid rgba(212,175,55,0.5)'
                : '1px solid var(--success-border)',
              borderRadius: 100,
            }}>
              {user.rank.is_max && <span style={{ fontSize: 12 }}>👑</span>}
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.03em',
                background: user.rank.is_max ? 'var(--gold-metallic)' : 'none',
                WebkitBackgroundClip: user.rank.is_max ? 'text' : 'unset',
                WebkitTextFillColor: user.rank.is_max ? 'transparent' : 'var(--success-text)',
                color: user.rank.is_max ? 'transparent' : 'var(--success-text)',
              }}>
                Кешбэк {user.rank.cashback}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* LEVEL — Glass Card with Serif Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { haptic('light'); setShowRanksModal(true) }}
          className="breathing-card shimmer-wave"
          style={{ ...glassStyle, cursor: 'pointer' }}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-muted)' }}>
              <Crown size={14} strokeWidth={1.5} />
              <span style={{ fontSize: 10, letterSpacing: '0.15em', fontWeight: 700 }}>УРОВЕНЬ</span>
            </div>
            {/* Rank Name — Serif with Gold Gradient */}
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              marginBottom: 10,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.02em',
            }}>
              {displayRankName}
            </div>
            {/* Progress Bar or MAX indicator */}
            {user.rank.is_max ? (
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(212,175,55,0.3)',
                    '0 0 20px rgba(212,175,55,0.5)',
                    '0 0 10px rgba(212,175,55,0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(180,140,40,0.15) 100%)',
                  borderRadius: 100,
                  border: '1px solid rgba(212,175,55,0.5)',
                  width: 'fit-content',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer Effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    zIndex: 1,
                  }}
                />
                <span style={{
                  position: 'relative',
                  zIndex: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #BF953F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  ★ MAX
                </span>
              </motion.div>
            ) : (
              <div style={{
                height: 5,
                background: 'var(--bg-glass)',
                borderRadius: 100,
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(user.rank.progress, 5)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="progress-shimmer"
                  style={{
                    height: '100%',
                    borderRadius: 100,
                    boxShadow: '0 0 10px rgba(212,175,55,0.4)',
                  }}
                />
              </div>
            )}
            {/* Bonus perk or Level info */}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
              {user.rank.bonus || `Уровень ${user.rank.level}`}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO BUTTON — Liquid Gold Premium CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNewOrder}
        className="shimmer-gold"
        style={{
          position: 'relative',
          width: '100%',
          padding: '22px 26px',
          borderRadius: 18,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Liquid Gold Metallic Gradient
          background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)',
          backgroundSize: '200% 200%',
          // Gold glow + inset highlights
          boxShadow: `
            0 0 50px -10px rgba(212,175,55,0.6),
            0 15px 35px -10px rgba(0,0,0,0.4),
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.1)
          `,
          marginBottom: 16,
          overflow: 'hidden',
          animation: 'liquid-gold-shift 4s ease-in-out infinite',
        }}
      >
        {/* Shimmer shine sweep effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          animation: 'shimmer-pass 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#09090b',
            fontFamily: "var(--font-serif)",
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Поручить задачу
          </div>
          <div style={{ fontSize: 11, color: 'rgba(9,9,11,0.65)', marginTop: 4, fontWeight: 500 }}>
            Персональный менеджер
          </div>
        </div>
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'rgba(9,9,11,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <Plus size={26} color="#09090b" strokeWidth={2.5} />
        </div>
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════════════
          PANIC BUTTON — Premium Urgent Style (Gold-Red Elegance)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={handlePanicOrder}
        whileTap={{ scale: 0.98 }}
        style={{
          ...glassStyle,
          marginBottom: 16,
          cursor: 'pointer',
          border: '1px solid rgba(239,115,68,0.35)',
          background: 'linear-gradient(135deg, rgba(239,115,68,0.12) 0%, rgba(212,175,55,0.06) 50%, var(--bg-card) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated gradient sweep */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(239,115,68,0.1), transparent)',
            transform: 'skewX(-20deg)',
            pointerEvents: 'none',
          }}
        />
        <CardInnerShine />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(239,115,68,0.3)',
                '0 0 35px rgba(239,115,68,0.5)',
                '0 0 20px rgba(239,115,68,0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #D4AF37 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <Zap size={22} color="#fff" strokeWidth={2} fill="rgba(255,255,255,0.2)" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #fb923c, #f97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Срочно?</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>Скинь фото — оценим за 5 минут</div>
          </div>
          <div style={{
            padding: '6px 12px',
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 8,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#fb923c',
              letterSpacing: '0.05em',
            }}>24ч</span>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          LAST ORDER CARD — Quick Access to Recent Order
          ═══════════════════════════════════════════════════════════════════ */}
      {user.orders.length > 0 && (
        <LastOrderCard
          order={user.orders[0]}
          onClick={() => navigate(`/order/${user.orders[0].id}`)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PROMO CODE — Collapsible Premium Accordion
          ═══════════════════════════════════════════════════════════════════ */}
      <CollapsiblePromoCode
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        promoLoading={promoLoading}
        promoMessage={promoMessage}
        onSubmit={handlePromoSubmit}
        activePromo={user.discount > 0 ? { code: 'АКТИВЕН', discount: user.discount } : null}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          ACHIEVEMENTS — Compact Single Line Premium
          ═══════════════════════════════════════════════════════════════════ */}
      <CompactAchievements
        achievements={achievements}
        onViewAll={() => navigate('/achievements')}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION (Referral) — Premium Gold Card
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="breathing-card pulse-border-gold inner-shine-sweep"
        style={{ ...glassGoldStyle, marginBottom: 16 }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Star size={14} color="var(--gold-400)" fill="var(--gold-400)" strokeWidth={1.5} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.1em',
            }}>РЕПУТАЦИЯ</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Пригласите партнёра и получайте{' '}
            <span style={{
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}>5% роялти</span>{' '}
            с каждого заказа.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.12em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {user.referral_code}
              </code>
              {copied ? (
                <Check size={18} color="var(--success-text)" strokeWidth={2} />
              ) : (
                <Copy size={18} color="var(--text-muted)" strokeWidth={1.5} />
              )}
            </motion.button>
            <motion.button
              onClick={(e) => { e.stopPropagation(); setShowQR(true); haptic('light') }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 52,
                height: 52,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                border: '1px solid var(--border-gold)',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px -5px rgba(212,175,55,0.2)',
              }}
            >
              <QrCode size={22} color="var(--gold-400)" strokeWidth={1.5} />
            </motion.button>
          </div>
          {user.referrals_count > 0 && (
            <div style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--success-glass)',
              border: '1px solid var(--success-border)',
              borderRadius: 100,
            }}>
              <span style={{ fontSize: 10, color: 'var(--success-text)', fontWeight: 600 }}>
                Приглашено: {user.referrals_count}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL — Glass Card
          ═══════════════════════════════════════════════════════════════════ */}
      {displayNextRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="breathing-card shimmer-wave"
          style={{ ...glassStyle, marginBottom: 16 }}
        >
          <CardInnerShine />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px -5px rgba(212,175,55,0.2)',
              }}>
                <TrendingUp size={22} color="var(--gold-400)" strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Следующий уровень</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-serif)',
                  background: 'var(--gold-text-shine)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginTop: 2,
                }}>{displayNextRank}</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 16,
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{user.rank.progress}%</span>
            </div>
            <div style={{
              height: 10,
              background: 'var(--bg-glass)',
              borderRadius: 100,
              overflow: 'hidden',
              marginBottom: 12,
              border: '1px solid var(--border-subtle)',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(user.rank.progress, 3)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="progress-shimmer"
                style={{
                  height: '100%',
                  borderRadius: 100,
                  boxShadow: '0 0 15px rgba(212,175,55,0.5)',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Осталось{' '}
              <span style={{
                background: 'var(--gold-text-shine)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
              }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS — Premium Dashboard Style
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate('/orders')}
        whileTap={{ scale: 0.98 }}
        style={{
          ...glassStyle,
          cursor: 'pointer',
          padding: '20px 24px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, var(--bg-card) 40%, rgba(59,130,246,0.04) 100%)',
        }}
      >
        <CardInnerShine />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))',
                border: '1px solid rgba(212,175,55,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Briefcase size={20} color="#D4AF37" strokeWidth={1.5} />
              </div>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.1em',
                }}>МОИ ЗАКАЗЫ</div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                }}>Статистика выполнения</div>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Active */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: activeOrders > 0
                ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeOrders > 0 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
              textAlign: 'center',
            }}>
              <motion.div
                animate={activeOrders > 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  fontFamily: 'var(--font-serif)',
                  color: activeOrders > 0 ? '#3b82f6' : 'var(--text-muted)',
                  textShadow: activeOrders > 0 ? '0 0 20px rgba(59,130,246,0.4)' : 'none',
                  marginBottom: 4,
                }}
              >
                {activeOrders}
              </motion.div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: activeOrders > 0 ? '#3b82f6' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}>
                {activeOrders > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      boxShadow: '0 0 8px #3b82f6',
                    }}
                  />
                )}
                Активных
              </div>
            </div>

            {/* Completed */}
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
              border: '1px solid rgba(34,197,94,0.25)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 36,
                fontWeight: 800,
                fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 4,
              }}>
                {user.orders.filter(o => o.status === 'completed').length}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}>
                <Check size={12} />
                Выполнено
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          SUBTLE FOOTER — Tagline
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          textAlign: 'center',
          padding: '16px 0 8px',
        }}
      >
        <span style={{
          fontSize: 10,
          color: 'rgba(100,100,100,0.5)',
          letterSpacing: '0.05em',
        }}>
          ✨ Премиум сервис для студентов
        </span>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          DAILY BONUS FLOATING BUTTON — Premium Gold
          ═══════════════════════════════════════════════════════════════════ */}
      {canClaimBonus && !dailyBonusError && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowDailyBonus(true); haptic('medium') }}
          style={{
            position: 'fixed',
            bottom: 110,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--gold-metallic)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.6), 0 10px 30px -10px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <Gift size={26} color="#09090b" strokeWidth={2} />
          {/* Notification badge */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239,68,68,0.5)',
              border: '2px solid var(--bg-main)',
            }}
          >
            <Flame size={12} color="#fff" />
          </motion.div>
        </motion.button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showQR && (
          <QRCodeModal
            value={user.referral_code}
            onClose={() => setShowQR(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyBonus && dailyBonusInfo && (
          <DailyBonusModal
            streak={dailyStreak}
            canClaim={canClaimBonus}
            bonuses={dailyBonusInfo.bonuses}
            cooldownRemaining={dailyBonusInfo.cooldown_remaining}
            onClaim={async () => {
              const result = await claimDailyBonus()
              if (result.won) {
                setShowConfetti(true)
              }
              // Refresh daily bonus info after claim
              setDailyBonusInfo(prev => prev ? { ...prev, can_claim: false, cooldown_remaining: '24ч' } : null)
              return result
            }}
            onClose={() => setShowDailyBonus(false)}
          />
        )}
      </AnimatePresence>

      {/* Confetti Effect */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* ═══════════════════════════════════════════════════════════════════
          NEW PREMIUM MODALS
          ═══════════════════════════════════════════════════════════════════ */}
      <CashbackModal
        isOpen={showCashbackModal}
        onClose={() => setShowCashbackModal(false)}
        user={user}
      />
      <GuaranteesModal
        isOpen={showGuaranteesModal}
        onClose={() => setShowGuaranteesModal(false)}
      />
      <TransactionsModal
        isOpen={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        transactions={user.transactions}
        balance={user.balance}
        onViewAll={() => navigate('/profile')}
      />
      <RanksModal
        isOpen={showRanksModal}
        onClose={() => setShowRanksModal(false)}
        user={user}
      />
    </div>
  )
}
