import { motion } from 'framer-motion'
import {
  Shield, RefreshCw, Sparkles, Gift, CheckCircle2, AlertCircle, Percent
} from 'lucide-react'
import { Order } from '../../types'

interface PremiumBentoGridProps {
  order: Order
  cashbackPercent?: number
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVISION TOKEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function RevisionToken({ used, index }: { used: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.1, type: 'spring' }}
      style={{
        width: 32,
        height: 32,
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
        <CheckCircle2 size={16} color="#6b7280" />
      ) : (
        <Sparkles size={14} color="#22c55e" />
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DECORATIVE CORNER
// ═══════════════════════════════════════════════════════════════════════════

function DecorativeCorner({ position, color = '#D4AF37' }: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  color?: string
}) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 0, left: 0, borderTop: `2px solid ${color}40`, borderLeft: `2px solid ${color}40`, borderRadius: '8px 0 0 0' },
    'top-right': { top: 0, right: 0, borderTop: `2px solid ${color}40`, borderRight: `2px solid ${color}40`, borderRadius: '0 8px 0 0' },
    'bottom-left': { bottom: 0, left: 0, borderBottom: `2px solid ${color}40`, borderLeft: `2px solid ${color}40`, borderRadius: '0 0 0 8px' },
    'bottom-right': { bottom: 0, right: 0, borderBottom: `2px solid ${color}40`, borderRight: `2px solid ${color}40`, borderRadius: '0 0 8px 0' },
  }

  return (
    <div style={{
      position: 'absolute',
      width: 16,
      height: 16,
      ...positionStyles[position],
    }} />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PremiumBentoGrid({ order, cashbackPercent = 5 }: PremiumBentoGridProps) {
  const finalPrice = order.final_price || order.price || 0
  const revisionCount = (order as any).revision_count || 0
  const maxFreeRevisions = 3

  // Calculate cashback
  const cashbackAmount = Math.floor(finalPrice * (cashbackPercent / 100))

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
        gap: 12,
        marginBottom: 20,
      }}
    >
      {/* 1. Guarantees Card */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          gridColumn: 'span 1',
          padding: 18,
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.12) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          boxShadow: '0 8px 30px -8px rgba(34, 197, 94, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative corners */}
        <DecorativeCorner position="top-left" color="#22c55e" />
        <DecorativeCorner position="bottom-right" color="#22c55e" />

        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <Shield size={20} color="#22c55e" />
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(34, 197, 94, 0.8)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}>
          Гарантии
        </div>

        <div style={{
          fontSize: 22,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #22c55e, #4ade80)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          30 дней
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.4,
        }}>
          бесплатных правок
        </div>
      </motion.div>

      {/* 2. Revisions Card */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          gridColumn: 'span 1',
          padding: 18,
          borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.12) 0%, rgba(20, 20, 23, 0.95) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow: '0 8px 30px -8px rgba(139, 92, 246, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative corners */}
        <DecorativeCorner position="top-left" color="#8b5cf6" />
        <DecorativeCorner position="bottom-right" color="#8b5cf6" />

        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <RefreshCw size={20} color="#8b5cf6" />
        </div>

        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(139, 92, 246, 0.8)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}>
          Правки
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}>
          {Array.from({ length: maxFreeRevisions }).map((_, i) => (
            <RevisionToken key={i} used={i < revisionCount} index={i} />
          ))}
        </div>

        <div style={{
          fontSize: 12,
          color: revisionCount >= maxFreeRevisions ? '#f59e0b' : 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          {revisionCount >= maxFreeRevisions ? (
            <>
              <AlertCircle size={12} />
              Следующая платная
            </>
          ) : (
            <>Осталось: {maxFreeRevisions - revisionCount}</>
          )}
        </div>
      </motion.div>

      {/* 3. Cashback Card - Full width */}
      {finalPrice > 0 && (
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            gridColumn: 'span 2',
            padding: '16px 20px',
            borderRadius: 18,
            background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 23, 0.95) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: '0 8px 25px -8px rgba(212, 175, 55, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-200%', '300%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '30%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.1), transparent)',
              transform: 'skewX(-20deg)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 rgba(212,175,55,0)',
                  '0 0 15px rgba(212,175,55,0.3)',
                  '0 0 0 rgba(212,175,55,0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gift size={20} color="#D4AF37" />
            </motion.div>
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: 2,
              }}>
                Кэшбэк с заказа
              </div>
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
              }}>
                Начисляется после завершения
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{
              padding: '5px 10px',
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Percent size={12} color="#D4AF37" />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#D4AF37',
              }}>
                {cashbackPercent}%
              </span>
            </div>
            <motion.span
              animate={{
                textShadow: [
                  '0 0 0 rgba(212,175,55,0)',
                  '0 0 12px rgba(212,175,55,0.4)',
                  '0 0 0 rgba(212,175,55,0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                fontSize: 20,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              +{cashbackAmount.toLocaleString()} ₽
            </motion.span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
