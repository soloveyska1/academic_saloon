import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  Plus, ChevronRight, Zap, Crown, CreditCard,
  Briefcase, Star, Bell, ArrowRight
} from 'lucide-react'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchDailyBonusInfo, claimDailyBonus, DailyBonusInfo } from '../api/userApi'
import { DailyBonusModal } from '../components/ui/DailyBonus'
import { openAdminPanel } from '../components/AdminPanel'
import { useAdmin } from '../contexts/AdminContext'

interface Props {
  user: UserData | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM COMPONENTS & STYLES
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string, prefix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${Math.round(v).toLocaleString('ru-RU')}${suffix}`)
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: [0.16, 1, 0.3, 1] })
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded, suffix, prefix])

  return <span>{displayValue}</span>
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HOMEPAGE
// ═══════════════════════════════════════════════════════════════════════════

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess } = useTelegram()
  const admin = useAdmin()
  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [dailyBonusInfo, setDailyBonusInfo] = useState<DailyBonusInfo | null>(null)

  useEffect(() => {
    fetchDailyBonusInfo().then(setDailyBonusInfo).catch(console.error)
  }, [])

  // Admin secret tap logic
  const tapCountRef = useRef(0)
  const lastTapTimeRef = useRef(0)
  const handleSecretTap = () => {
    if (!admin.isAdmin) return
    const now = Date.now()
    if (now - lastTapTimeRef.current > 500) tapCountRef.current = 1
    else {
      tapCountRef.current += 1
      if (tapCountRef.current >= 5) {
        haptic('heavy')
        openAdminPanel()
        tapCountRef.current = 0
      }
    }
    lastTapTimeRef.current = now
  }

  const handleNewOrder = () => {
    haptic('heavy')
    navigate('/create-order')
  }

  const handlePanicOrder = () => {
    haptic('heavy')
    navigate('/create-order?type=photo_task&urgent=true')
  }

  if (!user) return null

  const activeOrdersCount = user.orders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status)).length
  const canClaimBonus = dailyBonusInfo?.can_claim ?? false

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      paddingBottom: 120,
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ════ HEADER ════ */}
      <header style={{
        padding: '24px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(10,10,12,0.9) 0%, rgba(10,10,12,0) 100%)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div onClick={handleSecretTap}>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 4
          }}>
            {getTimeGreeting()}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#fff',
            fontFamily: "'Playfair Display', serif"
          }}>
            {user.fullname?.split(' ')[0] || 'Гость'}
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/notifications')}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4af37'
          }}
        >
          <Bell size={18} />
        </motion.button>
      </header>

      {/* ════ HERO SECTION ════ */}
      <div style={{ padding: '0 20px', marginBottom: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, #1c1c21 0%, #0f0f13 100%)',
            borderRadius: 24,
            padding: 24,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background Gradient Mesh */}
          <div style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }} />

          <div style={{ fontSize: 12, color: '#d4af37', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
            Concierge Service
          </div>
          <h1 style={{
            fontSize: 28,
            lineHeight: 1.2,
            fontFamily: "'Playfair Display', serif",
            color: '#fff',
            marginBottom: 24,
            maxWidth: '80%'
          }}>
            Готовы принять вашу задачу.
          </h1>

          {/* MAIN ACTION: NEW ORDER */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNewOrder}
            style={{
              width: '100%',
              padding: '18px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #d4af37 0%, #fcf6ba 50%, #b38728 100%)',
              border: 'none',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 20px -5px rgba(212,175,55,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer Effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer 3s infinite'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Plus size={20} color="#000" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#09090b', letterSpacing: '0.05em' }}>
                НОВОЕ ПОРУЧЕНИЕ
              </span>
            </div>
            <ArrowRight size={20} color="#09090b" style={{ position: 'relative', zIndex: 1 }} />
          </motion.button>

          {/* SECONDARY ACTION: PANIC */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePanicOrder}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={16} color="#ef4444" fill="#ef4444" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                  СРОЧНАЯ ЗАДАЧА
                </div>
                <div style={{ fontSize: 10, color: 'rgba(239,68,68,0.7)' }}>
                  Приоритетная обработка
                </div>
              </div>
            </div>
            <ChevronRight size={16} color="#ef4444" />
          </motion.button>
        </motion.div>
      </div>

      {/* ════ ASSET DECK ════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ padding: '0 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
            Активы и Статус
          </span>
        </div>

        <div style={{
          display: 'flex',
          overflowX: 'scroll',
          padding: '0 20px',
          gap: 12,
          paddingBottom: 20, // Hide scrollbar area roughly
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {/* CARD 1: CAPITAL */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            style={{
              minWidth: 260,
              padding: 20,
              borderRadius: 20,
              background: '#14141a',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px 16px', background: 'rgba(212,175,55,0.1)', borderBottomLeftRadius: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#d4af37' }}>+ {user.bonus_balance} B</span>
            </div>
            <CreditCard size={24} color="#52525b" style={{ marginBottom: 24 }} />
            <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>Капитал</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fff', fontFamily: "'Playfair Display', serif" }}>
              <AnimatedCounter value={user.balance} suffix=" ₽" />
            </div>
          </motion.div>

          {/* CARD 2: STATUS */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            style={{
              minWidth: 220,
              padding: 20,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative'
            }}
          >
            <Crown size={24} color="#d4af37" style={{ marginBottom: 24 }} />
            <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>Статус</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#d4af37', fontFamily: "'Playfair Display', serif" }}>
              {user.rank.name}
            </div>
            <div style={{ marginTop: 8, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <div style={{ width: `${user.rank.progress}%`, height: '100%', background: '#d4af37' }} />
            </div>
          </motion.div>

          {/* CARD 3: SYNDICATE */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/referral')}
            style={{
              minWidth: 220,
              padding: 20,
              borderRadius: 20,
              background: '#14141a',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <Briefcase size={24} color="#71717a" style={{ marginBottom: 24 }} />
            <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>Синдикат</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', fontFamily: "'Playfair Display', serif" }}>
              Пригласить
            </div>
            <div style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>+5% доходность</div>
          </motion.div>
        </div>
      </div>

      {/* ════ INTELLIGENCE FEED ════ */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
          Сводка
        </div>

        {/* DAILY BONUS WIDGET */}
        {canClaimBonus && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowDailyBonus(true)}
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'linear-gradient(90deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 12,
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #d4af37 0%, #b38728 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Star size={20} color="#000" fill="#000" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Доступен Ежедневный Бонус</div>
              <div style={{ fontSize: 11, color: '#888' }}>Заберите награду серии</div>
            </div>
            <ChevronRight size={16} color="#666" />
          </motion.div>
        )}

        {/* ACTIVE ORDERS */}
        {activeOrdersCount > 0 ? (
          <motion.div
            onClick={() => navigate('/orders')}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Briefcase size={20} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                В работе: {activeOrdersCount} {activeOrdersCount === 1 ? 'заказ' : 'заказа'}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Нажмите для просмотра</div>
            </div>
            <ChevronRight size={16} color="#666" />
          </motion.div>
        ) : (
          <div style={{
            padding: 24,
            textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 16,
            color: '#666',
            fontSize: 13
          }}>
            Нет активных поручений. <br />
            Мы готовы приступить к работе.
          </div>
        )}
      </div>

      {/* MODALS */}
      {showDailyBonus && dailyBonusInfo && (
        <DailyBonusModal
          streak={dailyBonusInfo.streak}
          canClaim={dailyBonusInfo.can_claim}
          bonuses={dailyBonusInfo.bonuses}
          cooldownRemaining={dailyBonusInfo.cooldown_remaining}
          onClose={() => setShowDailyBonus(false)}
          onClaim={async () => {
            const result = await claimDailyBonus()
            setShowDailyBonus(false)
            hapticSuccess()
            const updated = await fetchDailyBonusInfo()
            setDailyBonusInfo(updated)
            return result
          }}
        />
      )}

      {/* GLOBAL STYLE INJECTION FOR SHIMMER ANIMATION */}
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  )
}
