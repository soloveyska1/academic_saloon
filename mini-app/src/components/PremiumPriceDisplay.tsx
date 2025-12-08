/**
 * PREMIUM PRICE DISPLAY — Unified Promo Indicator Component
 * =========================================================
 * Use this component EVERYWHERE prices are shown to ensure
 * consistent promo display across the entire app.
 *
 * Variants: 'compact' | 'mini' | 'inline' | 'full' | 'badge'
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Percent, Tag } from 'lucide-react'

export interface PremiumPriceDisplayProps {
  // Core pricing
  price: number                    // Final price to display
  originalPrice?: number           // Original price (before discounts)

  // Promo information
  promoCode?: string | null        // Promo code name (e.g., "WELCOME50")
  promoDiscount?: number           // Promo discount percentage (0-99)

  // Other discounts
  discount?: number                // Loyalty/customer discount percentage
  bonusUsed?: number               // Bonus amount used (in currency)

  // Display options
  variant?: 'compact' | 'mini' | 'inline' | 'full' | 'badge'
  showAnimation?: boolean
  size?: 'sm' | 'md' | 'lg'

  // Styling
  className?: string
  style?: React.CSSProperties
}

// Size configurations
const SIZES = {
  sm: { price: 14, label: 10, badge: 10, gap: 6 },
  md: { price: 18, label: 12, badge: 11, gap: 8 },
  lg: { price: 24, label: 14, badge: 12, gap: 10 },
}

/**
 * BADGE — Compact promo badge only (use alongside price)
 */
function PromoBadge({
  promoCode,
  promoDiscount,
  size = 'md',
  showAnimation = true,
}: PremiumPriceDisplayProps) {
  if (!promoCode || !promoDiscount) return null

  const s = SIZES[size]

  return (
    <motion.div
      initial={showAnimation ? { scale: 0.8, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: `${s.gap / 2}px ${s.gap}px`,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
        border: '1px solid rgba(34,197,94,0.4)',
        borderRadius: 6,
      }}
    >
      <Zap size={s.badge} color="#22c55e" fill="#22c55e" />
      <span style={{
        fontSize: s.badge,
        fontWeight: 700,
        color: '#22c55e',
        fontFamily: 'var(--font-mono)',
      }}>
        {promoCode} −{promoDiscount}%
      </span>
    </motion.div>
  )
}

/**
 * COMPACT — Small badge for list items
 */
function CompactVariant({
  price,
  originalPrice,
  promoCode,
  promoDiscount,
  size = 'md',
  showAnimation = true,
  style,
}: PremiumPriceDisplayProps) {
  const s = SIZES[size]
  const hasPromo = promoCode && promoDiscount && promoDiscount > 0
  const basePrice = originalPrice || price

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, ...style }}>
      {/* Original price crossed out */}
      {hasPromo && basePrice !== price && (
        <span style={{
          fontSize: s.label,
          color: 'var(--text-muted)',
          textDecoration: 'line-through',
          fontFamily: 'var(--font-mono)',
        }}>
          {basePrice.toLocaleString('ru-RU')}
        </span>
      )}

      {/* Final price */}
      <motion.span
        initial={showAnimation ? { scale: 0.95 } : undefined}
        animate={{ scale: 1 }}
        style={{
          fontSize: s.price,
          fontWeight: 700,
          color: hasPromo ? '#22c55e' : 'var(--gold-400)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {price.toLocaleString('ru-RU')} ₽
      </motion.span>

      {/* Promo badge */}
      {hasPromo && (
        <span style={{
          fontSize: s.badge,
          fontWeight: 700,
          color: '#22c55e',
          background: 'rgba(34,197,94,0.15)',
          padding: '2px 6px',
          borderRadius: 4,
        }}>
          −{promoDiscount}%
        </span>
      )}
    </div>
  )
}

/**
 * MINI — Inline price with promo indicator
 */
function MiniVariant({
  price,
  originalPrice,
  promoCode,
  promoDiscount,
  size = 'md',
  showAnimation = true,
  style,
}: PremiumPriceDisplayProps) {
  const s = SIZES[size]
  const hasPromo = promoCode && promoDiscount && promoDiscount > 0
  const basePrice = originalPrice || price

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, flexWrap: 'wrap', ...style }}>
      {/* Original price crossed out */}
      {hasPromo && basePrice !== price && (
        <span style={{
          fontSize: s.label,
          color: 'var(--text-muted)',
          textDecoration: 'line-through',
          fontFamily: 'var(--font-mono)',
        }}>
          {basePrice.toLocaleString('ru-RU')} ₽
        </span>
      )}

      {/* Final price */}
      <motion.span
        initial={showAnimation ? { scale: 0.95 } : undefined}
        animate={{ scale: 1 }}
        style={{
          fontSize: s.price,
          fontWeight: 700,
          background: hasPromo
            ? 'linear-gradient(135deg, #22c55e, #4ade80)'
            : 'linear-gradient(135deg, #d4af37, #f5d061)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {price.toLocaleString('ru-RU')} ₽
      </motion.span>

      {/* Promo badge */}
      {hasPromo && (
        <motion.div
          initial={showAnimation ? { scale: 0.8, opacity: 0 } : undefined}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 6,
          }}
        >
          <Tag size={s.badge} color="#22c55e" />
          <span style={{
            fontSize: s.badge,
            fontWeight: 700,
            color: '#22c55e',
            fontFamily: 'var(--font-mono)',
          }}>
            {promoCode}
          </span>
        </motion.div>
      )}
    </div>
  )
}

/**
 * INLINE — For tables and lists (most compact)
 */
function InlineVariant({
  price,
  originalPrice,
  promoCode,
  promoDiscount,
  size = 'sm',
  style,
}: PremiumPriceDisplayProps) {
  const s = SIZES[size]
  const hasPromo = promoCode && promoDiscount && promoDiscount > 0
  const basePrice = originalPrice || price

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}>
      {hasPromo && basePrice !== price && (
        <span style={{
          fontSize: s.label,
          color: 'var(--text-muted)',
          textDecoration: 'line-through',
        }}>
          {basePrice.toLocaleString('ru-RU')}
        </span>
      )}
      <span style={{
        fontSize: s.price,
        fontWeight: 600,
        color: hasPromo ? '#22c55e' : 'inherit',
      }}>
        {price.toLocaleString('ru-RU')}₽
      </span>
      {hasPromo && (
        <span style={{
          fontSize: s.badge - 1,
          fontWeight: 700,
          color: '#22c55e',
        }}>
          🎟️
        </span>
      )}
    </span>
  )
}

/**
 * FULL — Complete breakdown card
 */
function FullVariant({
  price,
  originalPrice,
  promoCode,
  promoDiscount,
  discount,
  bonusUsed,
  showAnimation = true,
  style,
}: PremiumPriceDisplayProps) {
  const hasPromo = promoCode && promoDiscount && promoDiscount > 0
  const hasAnyDiscount = hasPromo || (discount && discount > 0) || (bonusUsed && bonusUsed > 0)
  const basePrice = originalPrice || price
  const totalSavings = basePrice - price

  if (!hasAnyDiscount) {
    return (
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--gold-400)',
        fontFamily: 'var(--font-mono)',
        ...style
      }}>
        {price.toLocaleString('ru-RU')} ₽
      </div>
    )
  }

  return (
    <motion.div
      initial={showAnimation ? { opacity: 0, y: -5 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 16,
        background: 'rgba(34,197,94,0.05)',
        borderRadius: 16,
        border: '1px solid rgba(34,197,94,0.2)',
        ...style
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 12,
      }}>
        💰 Расчёт стоимости
      </div>

      {/* Base price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Базовая цена:</span>
        <span style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          textDecoration: 'line-through',
          fontFamily: 'var(--font-mono)',
        }}>
          {basePrice.toLocaleString('ru-RU')} ₽
        </span>
      </div>

      {/* Promo discount */}
      {hasPromo && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          padding: '8px 12px',
          background: 'rgba(139,92,246,0.1)',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
            🎟️ <span style={{ fontWeight: 600 }}>{promoCode}</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            −{promoDiscount}%
          </span>
        </div>
      )}

      {/* Loyalty discount */}
      {discount && discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#60a5fa' }}>🎖️ Скидка лояльности:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            −{discount}%
          </span>
        </div>
      )}

      {/* Bonuses */}
      {bonusUsed && bonusUsed > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#fbbf24' }}>⭐ Бонусы:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            −{bonusUsed.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}

      {/* Savings */}
      {totalSavings > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(34,197,94,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>💚 Ваша экономия:</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            {totalSavings.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      )}

      {/* Final price */}
      <div style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ИТОГО</div>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #22c55e, #4ade80)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'var(--font-mono)',
        }}>
          {price.toLocaleString('ru-RU')} ₽
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Main Component
 */
export const PremiumPriceDisplay = React.memo((props: PremiumPriceDisplayProps) => {
  const { variant = 'mini', ...rest } = props

  switch (variant) {
    case 'badge':
      return <PromoBadge {...rest} />
    case 'compact':
      return <CompactVariant {...rest} />
    case 'inline':
      return <InlineVariant {...rest} />
    case 'full':
      return <FullVariant {...rest} />
    case 'mini':
    default:
      return <MiniVariant {...rest} />
  }
})

PremiumPriceDisplay.displayName = 'PremiumPriceDisplay'

// Quick utility for checking if order has promo
export function hasPromoApplied(order: { promo_code?: string | null; promo_discount?: number }): boolean {
  return Boolean(order.promo_code && order.promo_discount && order.promo_discount > 0)
}
