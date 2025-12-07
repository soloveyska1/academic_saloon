import { motion } from 'framer-motion'
import {
  Coins, Shield, RefreshCw, Sparkles, Gift,
  FileText, CheckCircle2, AlertCircle, Clock, Percent, Tag
} from 'lucide-react'
import { Order } from '../../types'

interface PremiumBentoGridProps {
  order: Order
  cashbackPercent?: number
}

// Revision token component
function RevisionToken({ used, index }: { used: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.1, type: 'spring' }}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: used
          ? 'rgba(107, 114, 128, 0.2)'
          : 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.1))',
        border: used
          ? '2px solid rgba(107, 114, 128, 0.3)'
          : '2px solid rgba(34, 197, 94, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: used
          ? 'none'
          : '0 0 15px -3px rgba(34, 197, 94, 0.4)',
      }}
    >
      {used ? (
        <CheckCircle2 size={14} color="#6b7280" />
      ) : (
        <Sparkles size={12} color="#22c55e" />
      )}
    </motion.div>
  )
}

export function PremiumBentoGrid({ order, cashbackPercent = 5 }: PremiumBentoGridProps) {
  const finalPrice = order.final_price || order.price || 0
  const paidAmount = order.paid_amount || 0
  const paymentProgress = finalPrice > 0 ? (paidAmount / finalPrice) * 100 : 0
  const revisionCount = (order as any).revision_count || 0
  const maxFreeRevisions = 3

  // Promo code info
  const promoCode = order.promo_code
  const promoDiscount = order.promo_discount || 0
  const basePrice = promoDiscount > 0 ? Math.round(finalPrice / (1 - promoDiscount / 100)) : order.price || 0

  // Calculate cashback
  const cashbackAmount = Math.floor(finalPrice * (cashbackPercent / 100))

  // Payment status
  const isFullyPaid = paidAmount >= finalPrice
  const isPartiallyPaid = paidAmount > 0 && paidAmount < finalPrice
  const remainingAmount = finalPrice - paidAmount

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
        marginBottom: 24,
      }}
    >
      {/* 1. Budget Card - Premium */}
      <motion.div
        variants={itemVariants}
        style={{
          gridColumn: 'span 1',
          padding: 20,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.12) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          boxShadow: '0 10px 40px -10px rgba(212, 175, 55, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 160,
        }}
      >
        {/* Gold glow */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }} />

        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Icon + Label */}
          <div>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Coins size={20} color="#d4af37" />
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(212, 175, 55, 0.7)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Бюджет
            </div>
          </div>

          {/* Price */}
          <div>
            {finalPrice > 0 ? (
              <>
                {/* Show original price crossed out if promo applied */}
                {promoCode && promoDiscount > 0 && (
                  <div style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    textDecoration: 'line-through',
                    marginBottom: 2,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {basePrice.toLocaleString('ru-RU')} ₽
                  </div>
                )}
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  background: promoCode
                    ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                    : 'linear-gradient(135deg, #d4af37, #f5d061)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: promoCode ? 4 : 8,
                }}>
                  {finalPrice.toLocaleString('ru-RU')} ₽
                </div>

                {/* Promo code badge */}
                {promoCode && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}>
                    <Tag size={12} color="#22c55e" />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: '#22c55e',
                      letterSpacing: '0.03em',
                    }}>
                      {promoCode} −{promoDiscount}%
                    </span>
                  </div>
                )}

                {/* Payment progress */}
                {(isPartiallyPaid || isFullyPaid) && (
                  <div>
                    <div style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${paymentProgress}%` }}
                        transition={{ duration: 0.8 }}
                        style={{
                          height: '100%',
                          background: isFullyPaid
                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                            : 'linear-gradient(90deg, #d4af37, #f5d061)',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: isFullyPaid ? '#22c55e' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {isFullyPaid ? (
                        <>
                          <CheckCircle2 size={12} />
                          Оплачено полностью
                        </>
                      ) : (
                        <>
                          Оплачено {paidAmount.toLocaleString()} ₽ • Ост. {remainingAmount.toLocaleString()} ₽
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}>
                На оценке...
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 2. Guarantees Card */}
      <motion.div
        variants={itemVariants}
        style={{
          gridColumn: 'span 1',
          padding: 20,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 160,
        }}
      >
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Shield size={20} color="#22c55e" />
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(34, 197, 94, 0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}>
              Гарантии
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#22c55e',
              marginBottom: 4,
            }}>
              30 дней
            </div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.4,
            }}>
              Бесплатных правок после сдачи работы
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Revisions Card - Full width */}
      <motion.div
        variants={itemVariants}
        style={{
          gridColumn: 'span 2',
          padding: 20,
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(20, 20, 23, 0.9), rgba(25, 25, 30, 0.95))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Label + Info */}
          <div className="flex items-center gap-4">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RefreshCw size={22} color="#8b5cf6" />
            </div>
            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: 4,
              }}>
                Бесплатные правки
              </div>
              <div style={{
                fontSize: 12,
                color: revisionCount >= maxFreeRevisions ? '#f59e0b' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {revisionCount >= maxFreeRevisions ? (
                  <>
                    <AlertCircle size={12} />
                    Следующая правка платная
                  </>
                ) : (
                  <>
                    Осталось: {maxFreeRevisions - revisionCount} из {maxFreeRevisions}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Revision tokens */}
          <div className="flex gap-2">
            {Array.from({ length: maxFreeRevisions }).map((_, i) => (
              <RevisionToken key={i} used={i < revisionCount} index={i} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* 4. Cashback Preview Card */}
      {finalPrice > 0 && (
        <motion.div
          variants={itemVariants}
          style={{
            gridColumn: 'span 2',
            padding: 18,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 20, 23, 0.9) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Gift size={18} color="#d4af37" />
            </div>
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-main)',
              }}>
                Ваш кэшбэк с заказа
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                Начисляется после завершения
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Percent size={12} color="#d4af37" />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#d4af37',
              }}>
                {cashbackPercent}%
              </span>
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: '#d4af37',
            }}>
              +{cashbackAmount.toLocaleString()} ₽
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Order Details Mini Card */}
      {order.description && (
        <motion.div
          variants={itemVariants}
          style={{
            gridColumn: 'span 2',
            padding: 20,
            borderRadius: 20,
            background: 'rgba(20, 20, 23, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <FileText size={16} color="var(--text-muted)" />
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Описание заказа
            </span>
          </div>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {order.description.length > 200
              ? order.description.slice(0, 200) + '...'
              : order.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
