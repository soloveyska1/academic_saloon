import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Percent, Shield, CheckCircle, TrendingUp, Crown, Star,
  ArrowRight, Clock, RefreshCw, Lock, Eye, Zap, Award,
  Sparkles, Gem, CreditCard, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { UserData, Transaction } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  ULTRA-PREMIUM MODAL WRAPPER — Floating Card with Luxury Animations
// ═══════════════════════════════════════════════════════════════════════════

interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  accentColor?: string
}

function ModalWrapper({ isOpen, onClose, children, accentColor = '#D4AF37' }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '88vh',
              overflowY: 'auto',
              overflowX: 'hidden',
              background: 'linear-gradient(180deg, rgba(18,18,22,0.98) 0%, rgba(10,10,12,0.99) 100%)',
              borderRadius: '28px 28px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: `
                0 -20px 60px rgba(0,0,0,0.5),
                0 0 80px -20px ${accentColor}40,
                inset 0 1px 0 rgba(255,255,255,0.08)
              `,
              position: 'relative',
            }}
          >
            {/* Top accent glow */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
            }} />

            {/* Handle bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '14px 0 8px',
            }}>
              <div style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.15)',
              }} />
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Premium icon badge component
function PremiumIconBadge({
  icon: Icon,
  gradient,
  borderColor,
  size = 80
}: {
  icon: typeof Star
  gradient: string
  borderColor: string
  size?: number
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: gradient,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `
          0 8px 32px -8px ${borderColor}80,
          inset 0 2px 0 rgba(255,255,255,0.15)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Inner shine */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
        borderRadius: `${size * 0.28}px ${size * 0.28}px 0 0`,
      }} />
      <Icon size={size * 0.45} color="#fff" strokeWidth={1.5} style={{ position: 'relative', zIndex: 1 }} />
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Ultra-Premium Loyalty Rewards
// ═══════════════════════════════════════════════════════════════════════════

interface CashbackModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

const RANKS_DATA = [
  { name: 'Резидент', cashback: 3, minSpent: 0, icon: Star, color: '#6b7280' },
  { name: 'Партнёр', cashback: 5, minSpent: 5000, icon: TrendingUp, color: '#3b82f6' },
  { name: 'VIP-Клиент', cashback: 7, minSpent: 15000, icon: Crown, color: '#a855f7' },
  { name: 'Премиум', cashback: 10, minSpent: 50000, icon: Gem, color: '#D4AF37' },
]

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#22c55e">
      <div style={{ padding: '8px 24px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <PremiumIconBadge
            icon={Percent}
            gradient="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            borderColor="rgba(34,197,94,0.6)"
          />

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              marginTop: 20,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #22c55e, #86efac)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Система лояльности
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}
          >
            Возврат с каждого заказа на ваш счёт
          </motion.p>
        </div>

        {/* Current cashback — Big Premium Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: '24px 20px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
            border: '1.5px solid rgba(212,175,55,0.35)',
            borderRadius: 20,
            marginBottom: 24,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />

          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            marginBottom: 10,
          }}>
            ВАШ ТЕКУЩИЙ КЕШБЭК
          </div>
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontSize: 52,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(212,175,55,0.3)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {user.rank.cashback}%
          </motion.div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            padding: '6px 14px',
            background: 'rgba(212,175,55,0.15)',
            borderRadius: 100,
            border: '1px solid rgba(212,175,55,0.3)',
          }}>
            <Crown size={14} color="#D4AF37" />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#D4AF37',
            }}>
              {RANKS_DATA[currentRankIndex]?.name || 'Резидент'}
            </span>
          </div>
        </motion.div>

        {/* Ranks ladder */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Sparkles size={12} />
            УРОВНИ ПРОГРАММЫ
          </div>

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
                  transition={{ delay: 0.35 + index * 0.06 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 16,
                    background: isActive
                      ? `linear-gradient(135deg, ${rank.color}18 0%, ${rank.color}08 100%)`
                      : 'rgba(255,255,255,0.02)',
                    border: isActive
                      ? `1.5px solid ${rank.color}50`
                      : '1px solid rgba(255,255,255,0.04)',
                    boxShadow: isActive ? `0 4px 20px -4px ${rank.color}30` : 'none',
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: isPassed || isActive
                      ? `linear-gradient(135deg, ${rank.color}30 0%, ${rank.color}10 100%)`
                      : 'rgba(60,60,60,0.3)',
                    border: `1.5px solid ${isPassed || isActive ? `${rank.color}60` : 'rgba(60,60,60,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isPassed ? (
                      <CheckCircle size={22} color="#22c55e" />
                    ) : (
                      <Icon size={22} color={isActive ? rank.color : '#6b7280'} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: isActive ? 'var(--text-main)' : isPassed ? '#22c55e' : 'var(--text-muted)',
                      marginBottom: 2,
                    }}>{rank.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      от {rank.minSpent.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: isActive ? rank.color : isPassed ? '#22c55e' : 'var(--text-muted)',
                    textShadow: isActive ? `0 0 12px ${rank.color}50` : 'none',
                  }}>
                    {rank.cashback}%
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* How it works — Premium Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            padding: 18,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Zap size={14} color="#22c55e" />
            Как это работает
          </div>
          <ul style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 2,
            margin: 0,
            paddingLeft: 18,
          }}>
            <li>После завершения заказа кешбэк начисляется на баланс</li>
            <li>Баланс можно использовать для оплаты</li>
            <li>Чем выше уровень — тем больше возврат</li>
          </ul>
        </motion.div>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Premium Quality Assurance (NO COWBOY!)
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    description: 'Доработаем по замечаниям преподавателя без доплаты',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  },
  {
    icon: Shield,
    title: 'Оригинальность от 85%',
    description: 'Пишем с нуля, не сливаем в базы антиплагиата',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    description: 'Ваши данные защищены — никому не передаём',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
  },
  {
    icon: Clock,
    title: 'Компенсация задержки',
    description: 'При задержке более 3 дней — бонус 500₽ или скидка 15%',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    icon: Eye,
    title: 'Предпросмотр работы',
    description: 'Покажем часть работы перед финальной оплатой',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    icon: Zap,
    title: 'Возврат до старта',
    description: '100% возврат при отмене до начала работы',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} accentColor="#a855f7">
      <div style={{ padding: '8px 24px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <PremiumIconBadge
            icon={Shield}
            gradient="linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)"
            borderColor="rgba(168,85,247,0.6)"
          />

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              marginTop: 20,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #a855f7, #c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Наши гарантии
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}
          >
            Премиум-сервис с полной защитой
          </motion.p>
        </div>

        {/* Guarantees list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.06 }}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: 16,
                  borderRadius: 18,
                  background: `linear-gradient(135deg, ${item.color}10 0%, ${item.color}04 100%)`,
                  border: `1px solid ${item.color}25`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Subtle glow */}
                <div style={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${item.color}15 0%, transparent 70%)`,
                }} />

                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: item.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 4px 16px -4px ${item.color}50`,
                  position: 'relative',
                }}>
                  {/* Icon shine */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                    borderRadius: '14px 14px 0 0',
                  }} />
                  <Icon size={22} color="#fff" strokeWidth={2} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 4,
                  }}>{item.title}</div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>{item.description}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Premium Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            marginTop: 24,
            padding: 18,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)',
            borderRadius: 16,
            border: '1px solid rgba(212,175,55,0.2)',
            textAlign: 'center',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <Gem size={16} color="#D4AF37" />
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Премиум качество гарантировано
            </span>
          </div>
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
      <div style={{ padding: '8px 24px 36px' }}>
        {/* Balance Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            textAlign: 'center',
            marginBottom: 28,
            padding: '28px 20px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
            borderRadius: 24,
            border: '1.5px solid rgba(212,175,55,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <CreditCard size={16} color="#D4AF37" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.15em',
            }}>ВАШ БАЛАНС</span>
          </div>

          <motion.div
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              fontSize: 48,
              fontWeight: 800,
              fontFamily: "var(--font-serif)",
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {balance.toLocaleString('ru-RU')}
            <span style={{ fontSize: 32 }}>₽</span>
          </motion.div>
        </motion.div>

        {/* Transactions list */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}>
          <Clock size={14} color="var(--text-muted)" />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
          }}>ПОСЛЕДНИЕ ОПЕРАЦИИ</span>
        </div>

        {recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentTransactions.map((tx, index) => {
              const isCredit = tx.type === 'credit'
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 16,
                    background: isCredit
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
                    border: `1px solid ${isCredit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: isCredit
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isCredit ? (
                      <ArrowDownRight size={20} color="#22c55e" />
                    ) : (
                      <ArrowUpRight size={20} color="#ef4444" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{tx.reason}</div>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}>
                      {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 17,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: isCredit ? '#22c55e' : '#ef4444',
                  }}>
                    {isCredit ? '+' : '−'}{Math.abs(tx.amount)} ₽
                  </div>
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
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            Пока нет операций
          </motion.div>
        )}

        {/* View all button */}
        {transactions.length > 5 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onViewAll(); onClose(); }}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              color: 'var(--text-main)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            Все операции
            <ArrowRight size={18} />
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
  // Map backend rank names to premium names
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
      <div style={{ padding: '8px 24px 36px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            style={{
              width: 88,
              height: 88,
              margin: '0 auto',
              borderRadius: 26,
              background: 'linear-gradient(135deg, #D4AF37, #B38728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 40px rgba(212,175,55,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
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
              borderRadius: '26px 26px 0 0',
            }} />
            <Crown size={42} color="#09090b" strokeWidth={1.5} style={{ position: 'relative', zIndex: 1 }} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              marginTop: 20,
              marginBottom: 8,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Путь клиента
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 14, color: 'var(--text-muted)' }}
          >
            Ваш статус: <span style={{ color: '#D4AF37', fontWeight: 600 }}>{displayRankName}</span>
          </motion.p>
        </div>

        {/* Vertical Timeline */}
        <div style={{ position: 'relative', paddingLeft: 26, marginBottom: 28 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: 10,
            top: 24,
            bottom: 24,
            width: 2,
            background: 'linear-gradient(180deg, #D4AF37, rgba(212,175,55,0.2))',
            borderRadius: 1,
          }} />

          {RANKS_DATA.map((rank, index) => {
            const isActive = rank.cashback === user.rank.cashback
            const isPassed = currentRankIndex > index
            const Icon = rank.icon

            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
                style={{
                  position: 'relative',
                  marginBottom: index < RANKS_DATA.length - 1 ? 18 : 0,
                  paddingLeft: 28,
                }}
              >
                {/* Timeline node */}
                <motion.div
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 12px rgba(212,175,55,0.4)',
                      '0 0 24px rgba(212,175,55,0.6)',
                      '0 0 12px rgba(212,175,55,0.4)',
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isPassed || isActive
                      ? 'linear-gradient(135deg, #D4AF37, #B38728)'
                      : 'rgba(60,60,60,0.5)',
                    border: `2px solid ${isPassed || isActive ? '#D4AF37' : 'rgba(80,80,80,0.5)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(isPassed || isActive) && (
                    <CheckCircle size={12} color="#09090b" />
                  )}
                </motion.div>

                {/* Card */}
                <div style={{
                  padding: '16px 18px',
                  borderRadius: 18,
                  background: isActive
                    ? `linear-gradient(135deg, ${rank.color}15 0%, ${rank.color}05 100%)`
                    : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? `1.5px solid ${rank.color}40`
                    : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isActive ? `0 4px 20px -4px ${rank.color}30` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: isPassed || isActive
                        ? `linear-gradient(135deg, ${rank.color}30 0%, ${rank.color}10 100%)`
                        : 'rgba(60,60,60,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={24} color={isPassed ? '#22c55e' : isActive ? rank.color : '#6b7280'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "var(--font-serif)",
                        color: isActive ? rank.color : isPassed ? '#22c55e' : 'var(--text-muted)',
                        marginBottom: 2,
                      }}>{rank.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Кешбэк {rank.cashback}% • от {rank.minSpent.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    {isActive && (
                      <div style={{
                        padding: '5px 12px',
                        background: 'rgba(212,175,55,0.2)',
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#D4AF37',
                        letterSpacing: '0.08em',
                      }}>ВЫ ЗДЕСЬ</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Progress to next */}
        {!user.rank.is_max && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              padding: 18,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>До следующего уровня</span>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#D4AF37',
              }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div style={{
              height: 10,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 5,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${user.rank.progress}%` }}
                transition={{ delay: 0.8, duration: 0.8 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #D4AF37, #FCF6BA)',
                  borderRadius: 5,
                  boxShadow: '0 0 12px rgba(212,175,55,0.5)',
                  position: 'relative',
                }}
              >
                {/* Shimmer on progress bar */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '30%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Max level badge */}
        {user.rank.is_max && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            style={{
              padding: 20,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
              borderRadius: 18,
              border: '1.5px solid rgba(212,175,55,0.4)',
              textAlign: 'center',
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ fontSize: 32, marginBottom: 8 }}
            >
              👑
            </motion.div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-serif)",
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Максимальный уровень!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Вы достигли вершины — кешбэк 10%
            </div>
          </motion.div>
        )}
      </div>
    </ModalWrapper>
  )
}
