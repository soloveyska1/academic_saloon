import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Star, ArrowRight, Clock, CreditCard,
  ArrowUpRight, ArrowDownRight, Gift,
} from 'lucide-react'
import { Transaction } from '../../../types'
import { ModalWrapper, LuxuryCard } from '../shared'

export interface TransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  balance: number
  onViewAll: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
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

function OrbitingSparkles({ color = '#D4AF37', count = 8 }: { color?: string; count?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 8 + i * 0.5, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
          style={{ position: 'absolute', top: '50%', left: '50%', width: 120, height: 120, marginTop: -60, marginLeft: -60 }}
        >
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              position: 'absolute', top: 0, left: '50%',
              width: 4 + (i % 3), height: 4 + (i % 3), marginLeft: -2,
              borderRadius: '50%', background: color, boxShadow: `0 0 ${8 + i * 2}px ${color}`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

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
      style={{ position: 'absolute', width: 20, height: 20, pointerEvents: 'none', ...posStyles[position] }}
    />
  )
}

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

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS MODAL
// ═══════════════════════════════════════════════════════════════════════════

export function TransactionsModal({ isOpen, onClose, transactions, balance, onViewAll }: TransactionsModalProps) {
  const recentTransactions = transactions.slice(0, 5)

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="transactions-modal"
      title="Баланс и транзакции"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '8px 24px 40px' }}>
        {/* Ultra-Premium Balance Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', damping: 20, stiffness: 200 }}
          style={{ position: 'relative', marginBottom: 32 }}
        >
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
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            />

            {/* Shimmer */}
            <motion.div
              animate={{ x: ['-150%', '250%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                transform: 'skewX(-20deg)', zIndex: 1,
              }}
            />

            <DecorativeCorner position="top-left" />
            <DecorativeCorner position="top-right" />
            <DecorativeCorner position="bottom-left" />
            <DecorativeCorner position="bottom-right" />

            {/* Icon with sparkles */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'linear-gradient(145deg, rgba(25,25,28,0.95), rgba(18,18,20,0.98))',
                  border: '2px solid rgba(212,175,55,0.4)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6), 0 0 24px rgba(212,175,55,0.2)',
                  position: 'relative', zIndex: 2,
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }}
              />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(212,175,55,0.9)',
                letterSpacing: '0.25em', textShadow: '0 0 12px rgba(212,175,55,0.3)',
              }}>ВАШ БАЛАНС</span>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }}
              />
            </motion.div>

            {/* Balance */}
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
                fontSize: 64, fontWeight: 800, fontFamily: 'var(--font-serif)',
                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 25%, #B38728 50%, #D4AF37 75%, #FCF6BA 100%)',
                backgroundSize: '300% 100%',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'premium-shimmer-text 5s ease-in-out infinite',
                display: 'flex', alignItems: 'baseline', justifyContent: 'center',
                gap: 6, lineHeight: 1, position: 'relative', zIndex: 2,
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
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))',
                borderRadius: 100, border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
                <Star size={14} color="#D4AF37" fill="rgba(212,175,55,0.3)" />
              </motion.div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(212,175,55,0.9)', letterSpacing: '0.05em' }}>
                Премиум-кошелёк
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={16} color="rgba(212,175,55,0.8)" />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>
              История операций
            </span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Последние {Math.min(5, transactions.length)} из {transactions.length}
            </div>
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
                      <motion.div
                        animate={isCredit ? { y: [0, -3, 0] } : { y: [0, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                        style={{
                          width: 48, height: 48, borderRadius: 14,
                          background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                          border: `1px solid ${color}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, boxShadow: `0 4px 16px -4px ${color}40`,
                        }}
                      >
                        {isCredit
                          ? <ArrowDownRight size={24} color={color} strokeWidth={2} />
                          : <ArrowUpRight size={24} color={color} strokeWidth={2} />}
                      </motion.div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {formatTransactionReason(tx.reason)}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} />
                          {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <motion.div
                        animate={{
                          textShadow: [`0 0 8px ${color}30`, `0 0 16px ${color}50`, `0 0 8px ${color}30`],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <LuxuryCard borderColor="rgba(212,175,55,0.2)" style={{ padding: 48, textAlign: 'center' }}>
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}
              >
                <Gift size={28} color="rgba(212,175,55,0.7)" />
              </motion.div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
                Пока нет операций
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Ваши транзакции появятся здесь
              </div>
            </LuxuryCard>
          </motion.div>
        )}

        {/* View All Button */}
        {transactions.length > 5 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(212,175,55,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { onViewAll(); onClose() }}
            style={{
              width: '100%', padding: '20px 28px',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.1) 100%)',
              border: '1px solid rgba(212,175,55,0.4)', borderRadius: 18,
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(212,175,55,0.15)',
            }}
          >
            <motion.div
              animate={{ x: ['-150%', '250%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transform: 'skewX(-20deg)',
              }}
            />
            <span style={{
              position: 'relative', zIndex: 1,
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Смотреть все операции
            </span>
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

      <style>{`
        @keyframes premium-shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </ModalWrapper>
  )
}
