import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Percent, Shield, CheckCircle, TrendingUp, Crown, Star,
  ArrowRight, Clock, RefreshCw, Lock, Eye, Zap, Award
} from 'lucide-react'
import { UserData, Transaction } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED MODAL WRAPPER — Premium Glass Style
// ═══════════════════════════════════════════════════════════════════════════

interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

function ModalWrapper({ isOpen, onClose, children }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(20,20,23,0.98) 0%, rgba(12,12,14,0.99) 100%)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(212,175,55,0.2)',
              borderBottom: 'none',
              boxShadow: '0 -10px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Handle bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px 0 8px',
            }}>
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
              }} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASHBACK MODAL — Explains cashback system
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
  { name: 'Премиум', cashback: 10, minSpent: 50000, icon: Award },
]

export function CashbackModal({ isOpen, onClose, user }: CashbackModalProps) {
  const currentRankIndex = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '8px 24px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 16px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.1))',
              border: '1px solid rgba(34,197,94,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Percent size={36} color="#22c55e" strokeWidth={1.5} />
          </motion.div>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>Система кешбэка</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Получай возврат с каждого заказа на баланс
          </p>
        </div>

        {/* Current status */}
        <div style={{
          padding: 16,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 16,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            ВАШ ТЕКУЩИЙ КЕШБЭК
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "var(--font-serif)",
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {user.rank.cashback}%
          </div>
        </div>

        {/* Ranks ladder */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginBottom: 12,
          }}>УРОВНИ КЕШБЭКА</div>

          {RANKS_DATA.map((rank, index) => {
            const isActive = index === currentRankIndex
            const isPassed = index < currentRankIndex
            const Icon = rank.icon

            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  marginBottom: 8,
                  borderRadius: 12,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'
                    : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? '1px solid rgba(212,175,55,0.5)'
                    : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: isPassed || isActive
                    ? `linear-gradient(135deg, ${isActive ? 'rgba(212,175,55,0.3)' : 'rgba(34,197,94,0.2)'}, transparent)`
                    : 'rgba(60,60,60,0.3)',
                  border: `1px solid ${isPassed ? 'rgba(34,197,94,0.4)' : isActive ? 'rgba(212,175,55,0.5)' : 'rgba(60,60,60,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isPassed ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <Icon size={20} color={isActive ? '#D4AF37' : '#6b7280'} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isActive ? 'var(--text-main)' : isPassed ? '#22c55e' : 'var(--text-muted)',
                  }}>{rank.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    от {rank.minSpent.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: isActive ? '#D4AF37' : isPassed ? '#22c55e' : 'var(--text-muted)',
                }}>
                  {rank.cashback}%
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* How it works */}
        <div style={{
          padding: 16,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: 10,
          }}>Как это работает:</div>
          <ul style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 16,
          }}>
            <li>После завершения заказа кешбэк начисляется на баланс</li>
            <li>Баланс можно использовать для оплаты следующих заказов</li>
            <li>Чем выше уровень — тем больше возврат</li>
          </ul>
        </div>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Quality guarantees
// ═══════════════════════════════════════════════════════════════════════════

interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    description: 'Доработаем по замечаниям преподавателя без дополнительной оплаты',
    color: '#3b82f6',
  },
  {
    icon: Shield,
    title: 'Оригинальность от 85%',
    description: 'Пишем с нуля, не сливаем в базы антиплагиата',
    color: '#22c55e',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    description: 'Что в Салуне — остаётся в Салуне. Никому не передаём данные',
    color: '#a855f7',
  },
  {
    icon: Clock,
    title: 'Точные сроки',
    description: 'Задержка более 3 дней — скидка 15% или полный возврат',
    color: '#f59e0b',
  },
  {
    icon: Eye,
    title: 'Предпросмотр работы',
    description: 'Показываем часть работы перед финальной оплатой',
    color: '#06b6d4',
  },
  {
    icon: Zap,
    title: '100% возврат',
    description: 'Полный возврат при отмене до начала работы',
    color: '#ef4444',
  },
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '8px 24px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 16px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={36} color="#a855f7" strokeWidth={1.5} />
          </motion.div>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>Наши гарантии</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Работаем честно и держим слово
          </p>
        </div>

        {/* Guarantees list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${item.color}10, transparent)`,
                  border: `1px solid ${item.color}30`,
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${item.color}20`,
                  border: `1px solid ${item.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} color={item.color} strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{
                    fontSize: 14,
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

        {/* Footer note */}
        <div style={{
          marginTop: 20,
          padding: 14,
          background: 'rgba(212,175,55,0.08)',
          borderRadius: 12,
          border: '1px solid rgba(212,175,55,0.2)',
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            🤠 <i>«Хороший ковбой всегда держит слово»</i>
          </span>
        </div>
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS MODAL — Recent transactions
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
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '8px 24px 32px' }}>
        {/* Header with balance */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}>ВАШ БАЛАНС</div>
          <div style={{
            fontSize: 42,
            fontWeight: 800,
            fontFamily: "var(--font-serif)",
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 8,
          }}>
            {balance.toLocaleString('ru-RU')}
            <span style={{ fontSize: 28 }}>₽</span>
          </div>
        </div>

        {/* Transactions list */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          marginBottom: 12,
        }}>ПОСЛЕДНИЕ ОПЕРАЦИИ</div>

        {recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: tx.type === 'credit'
                    ? 'rgba(34,197,94,0.08)'
                    : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${tx.type === 'credit' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}
              >
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 2,
                  }}>{tx.reason}</div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}>
                    {new Date(tx.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: tx.type === 'credit' ? '#22c55e' : '#ef4444',
                }}>
                  {tx.type === 'credit' ? '+' : '−'}{Math.abs(tx.amount)} ₽
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}>
            Пока нет операций
          </div>
        )}

        {/* View all button */}
        {transactions.length > 5 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { onViewAll(); onClose(); }}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: 'var(--text-main)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Все операции
            <ArrowRight size={16} />
          </motion.button>
        )}
      </div>
    </ModalWrapper>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RANKS MODAL — Client journey / ranks ladder
// ═══════════════════════════════════════════════════════════════════════════

interface RanksModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
}

export function RanksModal({ isOpen, onClose, user }: RanksModalProps) {
  // Map backend rank names
  const rankNameMap: Record<string, string> = {
    'Салага': 'Резидент',
    'Ковбой': 'Партнёр',
    'Головорез': 'VIP-Клиент',
    'Легенда Запада': 'Премиум',
  }
  const displayRankName = rankNameMap[user.rank.name] || user.rank.name

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '8px 24px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring' }}
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              borderRadius: 24,
              background: 'linear-gradient(135deg, #D4AF37, #B38728)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(212,175,55,0.4)',
            }}
          >
            <Crown size={40} color="#09090b" strokeWidth={1.5} />
          </motion.div>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 700,
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>Путь клиента</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Ваш текущий статус: <span style={{ color: '#D4AF37', fontWeight: 600 }}>{displayRankName}</span>
          </p>
        </div>

        {/* Ranks ladder */}
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: 9,
            top: 20,
            bottom: 20,
            width: 2,
            background: 'linear-gradient(180deg, #D4AF37, rgba(212,175,55,0.2))',
          }} />

          {RANKS_DATA.map((rank, index) => {
            const isActive = rank.cashback === user.rank.cashback
            const isPassed = RANKS_DATA.findIndex(r => r.cashback === user.rank.cashback) > index
            const Icon = rank.icon

            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                style={{
                  position: 'relative',
                  marginBottom: index < RANKS_DATA.length - 1 ? 16 : 0,
                  paddingLeft: 24,
                }}
              >
                {/* Node */}
                <motion.div
                  animate={isActive ? {
                    boxShadow: [
                      '0 0 10px rgba(212,175,55,0.4)',
                      '0 0 20px rgba(212,175,55,0.6)',
                      '0 0 10px rgba(212,175,55,0.4)',
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 20,
                    height: 20,
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
                  padding: 16,
                  borderRadius: 16,
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                    : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? '1px solid rgba(212,175,55,0.4)'
                    : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: isPassed || isActive
                        ? `linear-gradient(135deg, ${isActive ? 'rgba(212,175,55,0.3)' : 'rgba(34,197,94,0.2)'}, transparent)`
                        : 'rgba(60,60,60,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={24} color={isPassed ? '#22c55e' : isActive ? '#D4AF37' : '#6b7280'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "var(--font-serif)",
                        color: isActive ? '#D4AF37' : isPassed ? '#22c55e' : 'var(--text-muted)',
                      }}>{rank.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Кешбэк {rank.cashback}% • от {rank.minSpent.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    {isActive && (
                      <div style={{
                        padding: '4px 10px',
                        background: 'rgba(212,175,55,0.2)',
                        borderRadius: 100,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#D4AF37',
                        letterSpacing: '0.05em',
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
          <div style={{
            marginTop: 24,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>До следующего уровня</span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#D4AF37',
              }}>{user.rank.spent_to_next.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${user.rank.progress}%` }}
                transition={{ delay: 0.3, duration: 0.8 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #D4AF37, #FCF6BA)',
                  borderRadius: 4,
                  boxShadow: '0 0 10px rgba(212,175,55,0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  )
}
