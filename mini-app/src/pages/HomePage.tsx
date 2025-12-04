import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Plus, Copy, Check, ChevronRight, TrendingUp,
  Wallet, Star, Zap, Crown, CreditCard, Briefcase
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

  return <span>{displayValue}</span>
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLASS PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  delay?: number
  onClick?: () => void
  variant?: 'default' | 'gold' | 'accent'
}

function GlassPanel({ children, className = '', delay = 0, onClick, variant = 'default' }: GlassPanelProps) {
  const variants = {
    default: 'bg-white/5 border-white/10',
    gold: 'bg-gradient-to-br from-gold-400/10 via-transparent to-gold-400/5 border-gold-400/20',
    accent: 'bg-gradient-to-b from-gold-400/15 to-transparent border-gold-400/25',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-5
        backdrop-blur-xl border
        shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
        ${variants[variant]}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE COMPONENT — HEAVY LUXURY / INTELLIGENT CLUB
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess } = useTelegram()
  const [copied, setCopied] = useState(false)

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

  const activeOrders = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length

  return (
    <div className="min-h-screen pb-28 px-5 pt-6 overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — INTELLIGENT CLUB BRANDING
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h2 className="text-[10px] tracking-[0.3em] uppercase mb-1 font-bold text-gold-400">
            Intelligent Club
          </h2>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Academic Saloon
          </h1>
        </div>

        {/* Logo Monogram */}
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #BF953F, #FCF6BA, #D4AF37, #B38728, #FBF5B7, #BF953F)',
              filter: 'blur(0.5px)',
            }}
          />
          <div className="relative w-12 h-12 rounded-full bg-onyx flex items-center justify-center border border-gold-500/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <span className="font-display font-bold text-lg gold-gradient-text">AS</span>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID: BALANCE & STATUS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 mb-5">

        {/* BALANCE CARD */}
        <GlassPanel delay={0.1} variant="gold">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <CreditCard size={14} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Счёт</span>
          </div>

          <div className="text-3xl font-display font-bold text-white mb-1">
            <AnimatedCounter value={user.balance} />
            <span className="text-gold-400 text-2xl ml-1">₽</span>
          </div>

          <div className="text-[10px] text-zinc-500">
            +{user.bonus_balance} бонусов
          </div>
        </GlassPanel>

        {/* STATUS / LEVEL CARD */}
        <GlassPanel delay={0.15}>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 border border-gold-500/10 rounded-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-3 text-zinc-400">
            <Crown size={14} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Уровень</span>
          </div>

          <div className="text-lg font-display font-bold gold-gradient-text mb-2">
            {user.rank.name}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.rank.progress}%` }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-gold-400 rounded-full shadow-[0_0_10px_#D4AF37]"
            />
          </div>

          <div className="text-[10px] text-zinc-500 mt-2">
            Уровень {user.rank.level}
          </div>
        </GlassPanel>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO CTA — ПОРУЧИТЬ ЗАДАЧУ (Liquid Gold Button)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.button
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNewOrder}
        className="w-full rounded-xl py-5 flex items-center justify-between px-6 mb-5 group relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #B38728 0%, #D4AF37 30%, #FBF5B7 50%, #D4AF37 70%, #B38728 100%)',
          backgroundSize: '200% auto',
          boxShadow: '0 0 30px -5px rgba(212, 175, 55, 0.5), 0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
        }}
      >
        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 blur-md" />

        <div className="flex flex-col items-start z-10">
          <span className="text-lg font-black text-onyx tracking-wide font-display">
            ПОРУЧИТЬ ЗАДАЧУ
          </span>
          <span className="text-[11px] text-onyx/70 font-semibold tracking-wide">
            Персональный менеджер
          </span>
        </div>

        <div className="w-12 h-12 bg-onyx/10 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform z-10">
          <Plus size={24} className="text-onyx" strokeWidth={2.5} />
        </div>
      </motion.button>

      {/* ═══════════════════════════════════════════════════════════════════
          PANIC BUTTON — СРОЧНО
          ═══════════════════════════════════════════════════════════════════ */}
      <GlassPanel delay={0.25} onClick={handlePanicOrder} className="mb-5">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0)',
                '0 0 20px 4px rgba(239, 68, 68, 0.3)',
                '0 0 0 0 rgba(239, 68, 68, 0)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
          >
            <Zap size={22} className="text-white" strokeWidth={2} />
          </motion.div>

          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-red-400 mb-0.5">Срочно?</h3>
            <p className="text-[11px] text-zinc-500">Скинь фото — оценим за 5 минут</p>
          </div>

          <ChevronRight size={20} className="text-red-400" />
        </div>
      </GlassPanel>

      {/* ═══════════════════════════════════════════════════════════════════
          REPUTATION CARD (Referral as "Репутация")
          ═══════════════════════════════════════════════════════════════════ */}
      <GlassPanel delay={0.3} variant="gold" className="mb-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Star size={14} className="text-gold-400 fill-gold-400" />
              РЕПУТАЦИЯ
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[85%]">
              Пригласите партнёра в клуб и получайте{' '}
              <span className="text-gold-400 font-bold">5% роялти</span> с каждого заказа.
            </p>
          </div>
        </div>

        {/* Referral Code */}
        <motion.button
          onClick={(e) => { e.stopPropagation(); copyReferralCode() }}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-onyx/60 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-gold-500/30 transition-colors"
        >
          <code className="text-gold-400 font-mono tracking-widest text-sm font-bold">
            {user.referral_code}
          </code>
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} className="text-zinc-500" />
          )}
        </motion.button>

        {user.referrals_count > 0 && (
          <div className="mt-3 text-[11px] text-zinc-500">
            Приглашено: <span className="text-gold-400 font-semibold">{user.referrals_count}</span> партнёров
          </div>
        )}
      </GlassPanel>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS TO NEXT LEVEL
          ═══════════════════════════════════════════════════════════════════ */}
      {user.rank.next_rank && (
        <GlassPanel delay={0.35} className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400/20 to-gold-400/5 border border-gold-400/30 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(212,175,55,0.3)]">
              <TrendingUp size={18} className="text-gold-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                Следующий уровень
              </div>
              <div className="text-[11px] text-zinc-500">
                {user.rank.next_rank}
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-gold-400 font-semibold">
                {user.rank.progress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.rank.progress}%` }}
              transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #8b6914, #d4af37, #f5d061)',
                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
              }}
            />
          </div>

          <div className="text-[11px] text-zinc-500 text-center">
            Осталось <span className="text-gold-400 font-semibold">{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
          </div>
        </GlassPanel>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK STATS ROW
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        <GlassPanel delay={0.4} onClick={() => navigate('/orders')}>
          <div className="flex items-center gap-2 mb-2 text-zinc-400">
            <Briefcase size={16} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wider font-medium">Заказы</span>
          </div>
          <div className="text-2xl font-display font-bold text-white">
            {activeOrders}
          </div>
          <div className="text-[10px] text-zinc-500">активных</div>
        </GlassPanel>

        <GlassPanel delay={0.45} onClick={() => navigate('/orders')}>
          <div className="flex items-center gap-2 mb-2 text-zinc-400">
            <Star size={16} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wider font-medium">Всего</span>
          </div>
          <div className="text-2xl font-display font-bold text-gold-400">
            {user.orders_count}
          </div>
          <div className="text-[10px] text-zinc-500">выполнено</div>
        </GlassPanel>
      </div>
    </div>
  )
}
