/**
 * WelcomePromoModal — Premium Welcome Experience for New Users
 */

import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import {
  Gift, Sparkles, Copy, Check, Crown, Star,
  ArrowRight, Zap, PartyPopper
} from 'lucide-react'
import { CenteredModalWrapper, triggerHaptic } from '../modals/shared'

// ═══════════════════════════════════════════════════════════════════════════
//  CONFETTI PARTICLES — Celebration Effect
// ═══════════════════════════════════════════════════════════════════════════

function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    size: 4 + Math.random() * 6,
    color: ['#D4AF37', '#FCF6BA', '#B38728', '#f5d485', '#fff'][Math.floor(Math.random() * 5)],
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: -20, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, 200, 400, 600],
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
            rotate: [0, 360, 720],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: p.left,
            top: -20,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}60`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GOLDEN SHIMMER EFFECT
// ═══════════════════════════════════════════════════════════════════════════

function GoldenShimmer() {
  return (
    <motion.div
      animate={{ x: ['-150%', '250%'] }}
      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        transform: 'skewX(-20deg)',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROMO CODE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

interface PromoCodeDisplayProps {
  code: string
  discount: number
  onCopy: () => void
  copied: boolean
}

function PromoCodeDisplay({ code, discount, onCopy, copied }: PromoCodeDisplayProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        position: 'relative',
        padding: 24,
        marginBottom: 24,
        borderRadius: 20,
        background: 'linear-gradient(145deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
        border: '2px solid rgba(212,175,55,0.5)',
        boxShadow: '0 0 60px rgba(212,175,55,0.3), inset 0 0 30px rgba(212,175,55,0.1)',
        overflow: 'hidden',
      }}
    >
      <GoldenShimmer />

      {/* Discount Badge */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 20px rgba(212,175,55,0.4)',
            '0 0 40px rgba(212,175,55,0.7)',
            '0 0 20px rgba(212,175,55,0.4)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          marginBottom: 16,
          background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
          borderRadius: 100,
        }}
      >
        <Sparkles size={16} color="#0a0a0c" />
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#0a0a0c',
          letterSpacing: '0.05em',
        }}>СКИДКА {discount}%</span>
      </motion.div>

      {/* Promo Code */}
      <motion.div
        animate={{
          textShadow: [
            '0 0 30px rgba(212,175,55,0.5)',
            '0 0 60px rgba(212,175,55,0.8)',
            '0 0 30px rgba(212,175,55,0.5)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          fontSize: 40,
          fontWeight: 800,
          fontFamily: "var(--font-mono)",
          letterSpacing: '0.15em',
          background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 30%, #B38728 60%, #FCF6BA 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer-text 3s ease-in-out infinite',
          marginBottom: 16,
        }}
      >
        {code}
      </motion.div>

      {/* Copy Button */}
      <motion.button
        onClick={onCopy}
        whileTap={{ scale: 0.95 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 24px',
          background: copied
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
          border: `1px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        {copied ? (
          <>
            <Check size={18} color="#fff" />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Скопировано!</span>
          </>
        ) : (
          <>
            <Copy size={18} color="rgba(255,255,255,0.8)" />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>
              Скопировать код
            </span>
          </>
        )}
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface WelcomePromoModalProps {
  isOpen: boolean
  onClose: () => void
  promoCode?: string
  discount?: number
  onApplyPromo?: (code: string) => void
}

export function WelcomePromoModal({
  isOpen,
  onClose,
  promoCode = 'WELCOME10',
  discount = 10,
  onApplyPromo
}: WelcomePromoModalProps) {
  const [copied, setCopied] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Delayed content reveal for dramatic effect
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 300)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(promoCode)
    setCopied(true)
    triggerHaptic('medium')
    setTimeout(() => setCopied(false), 2000)
  }, [promoCode])

  const handleApply = useCallback(() => {
    triggerHaptic('medium')
    if (onApplyPromo) {
      onApplyPromo(promoCode)
    }
    onClose()
  }, [onApplyPromo, promoCode, onClose])

  return (
    <CenteredModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="welcome-promo-modal"
      title="Приветственный промокод"
      accentColor="#D4AF37"
    >
      {/* Confetti inside the dialog */}
      <ConfettiParticles />

      {/* Top golden border glow */}
      <motion.div
        animate={{
          opacity: [0.5, 1, 0.5],
          boxShadow: [
            '0 0 30px rgba(212,175,55,0.4)',
            '0 0 60px rgba(212,175,55,0.8)',
            '0 0 30px rgba(212,175,55,0.4)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
        }}
      />

      {/* Content */}
      <div style={{ padding: '48px 28px', paddingBottom: 'max(36px, calc(20px + env(safe-area-inset-bottom)))', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        {/* Gift Icon with Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          style={{ marginBottom: 24 }}
        >
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              borderRadius: 28,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
              border: '2px solid rgba(212,175,55,0.4)',
              boxShadow: '0 0 50px rgba(212,175,55,0.3)',
              position: 'relative',
            }}
          >
            {/* Pulsing ring */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: 32,
                border: '2px solid rgba(212,175,55,0.3)',
              }}
            />
            <Gift size={48} color="#D4AF37" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Title */}
        {showContent && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <PartyPopper size={20} color="#D4AF37" />
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(212,175,55,0.9)',
                letterSpacing: '0.1em',
              }}>ДОБРО ПОЖАЛОВАТЬ!</span>
              <PartyPopper size={20} color="#D4AF37" style={{ transform: 'scaleX(-1)' }} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 12,
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              Ваш приветственный
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>подарок</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 28,
                lineHeight: 1.5,
              }}
            >
              Специально для вас — скидка {discount}% на первый заказ
            </motion.p>

            {/* Promo Code Card */}
            <PromoCodeDisplay
              code={promoCode}
              discount={discount}
              onCopy={handleCopy}
              copied={copied}
            />

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 24,
                marginBottom: 28,
              }}
            >
              {[
                { icon: Crown, text: 'Премиум' },
                { icon: Zap, text: 'Быстро' },
                { icon: Star, text: '4.9\u2605' },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                  }}>
                    <item.icon size={20} color="rgba(212,175,55,0.8)" strokeWidth={1.5} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleApply}
              style={{
                width: '100%',
                padding: '18px 28px',
                background: 'linear-gradient(135deg, #D4AF37, #f5d485)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 40px -10px rgba(212,175,55,0.5)',
              }}
            >
              <GoldenShimmer />
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0a0a0c',
                position: 'relative',
                zIndex: 1,
              }}>Оформить первый заказ</span>
              <ArrowRight size={20} color="#0a0a0c" style={{ position: 'relative', zIndex: 1 }} />
            </motion.button>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 16,
              }}
            >
              Код будет применён автоматически
            </motion.p>
          </>
        )}
      </div>

      {/* CSS Keyframes */}
      <style>{`
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </CenteredModalWrapper>
  )
}

export default WelcomePromoModal
