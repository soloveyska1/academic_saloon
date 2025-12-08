import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, CheckCircle2, X, Loader, Sparkles, Gift, Percent, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react'
import { usePromo } from '../../contexts/PromoContext'

// ═══════════════════════════════════════════════════════════════════════════════
//  PREMIUM PROMO CODE SECTION
//  A beautiful, premium component for entering and displaying promo codes
// ═══════════════════════════════════════════════════════════════════════════════

// Helper function to format expiration date
function formatExpiryDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = timestamp - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Истёк'
  if (diffDays === 0) return 'Истекает сегодня'
  if (diffDays === 1) return 'Истекает завтра'
  if (diffDays <= 7) return `Истекает через ${diffDays} дн.`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface PromoCodeSectionProps {
  // Display mode
  variant?: 'compact' | 'full' | 'inline'

  // For showing price calculations
  basePrice?: number
  onPriceChange?: (finalPrice: number, discount: number) => void

  // Styling
  className?: string

  // Collapsible behavior (for home page)
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function PromoCodeSection({
  variant = 'full',
  basePrice,
  onPriceChange,
  className = '',
  collapsible = false,
  defaultExpanded = false,
}: PromoCodeSectionProps) {
  const { activePromo, isValidating, validationError, validateAndSetPromo, clearPromo } = usePromo()
  const [inputCode, setInputCode] = useState('')
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Use ref to avoid onPriceChange dependency issue
  const onPriceChangeRef = useRef(onPriceChange)
  useEffect(() => {
    onPriceChangeRef.current = onPriceChange
  }, [onPriceChange])

  // Calculate discounted price when promo changes
  useEffect(() => {
    if (basePrice && onPriceChangeRef.current) {
      if (activePromo) {
        const discount = activePromo.discount
        const finalPrice = Math.round(basePrice * (1 - discount / 100))
        onPriceChangeRef.current(finalPrice, discount)
      } else {
        onPriceChangeRef.current(basePrice, 0)
      }
    }
  }, [activePromo, basePrice])

  // Show success animation when promo is applied
  useEffect(() => {
    if (activePromo && !showSuccess) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [activePromo])

  const handleSubmit = async () => {
    if (!inputCode.trim() || isValidating) return

    // Optimistic UI - show loading immediately
    const success = await validateAndSetPromo(inputCode)
    if (success) {
      setInputCode('')
      if (collapsible) {
        // Don't collapse - keep it open to show the active promo
      }
    } else {
      // Shake animation on error
      if (inputRef.current) {
        inputRef.current.style.animation = 'shake 0.4s'
        setTimeout(() => {
          if (inputRef.current) inputRef.current.style.animation = ''
        }, 400)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleClear = () => {
    clearPromo()
    setInputCode('')
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Calculate savings for display
  const savings = basePrice && activePromo
    ? Math.round(basePrice * (activePromo.discount / 100))
    : 0

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPACT VARIANT — Small badge/pill showing active promo
  // ═══════════════════════════════════════════════════════════════════════════
  if (variant === 'compact') {
    if (!activePromo) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08))',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 20,
        }}
      >
        <Tag size={12} color="#22c55e" />
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: '#22c55e',
          letterSpacing: '0.03em',
        }}>
          {activePromo.code}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(34, 197, 94, 0.8)',
        }}>
          -{activePromo.discount}%
        </span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleClear}
          style={{
            background: 'none',
            border: 'none',
            padding: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4,
          }}
        >
          <X size={12} color="rgba(34, 197, 94, 0.6)" />
        </motion.button>
      </motion.div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INLINE VARIANT — Shows in order summary with price calculation
  // ═══════════════════════════════════════════════════════════════════════════
  if (variant === 'inline') {
    return (
      <div className={className}>
        {/* Active Promo Display */}
        <AnimatePresence>
          {activePromo ? (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 16,
                marginBottom: 12,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 20px -4px rgba(34, 197, 94, 0.25)',
              }}
            >
              {/* Success glow animation */}
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0.6, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={18} color="#22c55e" strokeWidth={2.5} />
                </motion.div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: '#22c55e',
                      letterSpacing: '0.03em',
                    }}>
                      {activePromo.code}
                    </span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(34, 197, 94, 0.25)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#22c55e',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      −{activePromo.discount}%
                    </motion.div>
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexWrap: 'wrap',
                  }}>
                    {savings > 0 && (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>
                        Экономия {savings.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    {activePromo.expiresAt && (
                      <>
                        {savings > 0 && <span>•</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {formatExpiryDate(activePromo.expiresAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClear}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={14} color="var(--text-muted)" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                width: '100%',
              }}
            >
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
              }}>
                <Tag size={16} color="var(--text-muted)" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Промокод"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-main)',
                    letterSpacing: '0.05em',
                  }}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isValidating || !inputCode.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: inputCode.trim()
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: inputCode.trim()
                    ? '1px solid rgba(212, 175, 55, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: inputCode.trim() && !isValidating ? 'pointer' : 'default',
                  opacity: isValidating ? 0.7 : (inputCode.trim() ? 1 : 0.5),
                  flexShrink: 0,
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isValidating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader size={16} color="#d4af37" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: inputCode.trim() ? '#d4af37' : 'var(--text-muted)',
                  }}>
                    ОК
                  </span>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Error */}
        <AnimatePresence>
          {validationError && !activePromo && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              style={{
                fontSize: 12,
                color: '#ef4444',
                marginTop: -8,
                marginBottom: 12,
                paddingLeft: 4,
              }}
            >
              {validationError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FULL VARIANT — Premium card with input/display (for home page)
  // ═══════════════════════════════════════════════════════════════════════════

  const content = (
    <>
      {/* Active Promo Display */}
      <AnimatePresence mode="wait">
        {activePromo ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              padding: 20,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.12), rgba(20, 20, 23, 0.95))',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Success glow effect */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Icon */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle2 size={24} color="#22c55e" />
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontSize: 17,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#22c55e',
                    letterSpacing: '0.05em',
                  }}>
                    {activePromo.code}
                  </span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(34, 197, 94, 0.25)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#22c55e',
                    }}
                  >
                    -{activePromo.discount}%
                  </motion.span>
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  marginBottom: activePromo.expiresAt ? 8 : 0,
                }}>
                  Промокод активирован и будет применён к вашему следующему заказу
                </div>
                {activePromo.expiresAt && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#22c55e',
                      width: 'fit-content',
                    }}
                  >
                    <Calendar size={12} />
                    Действует до: {formatExpiryDate(activePromo.expiresAt)}
                  </motion.div>
                )}
              </div>

              {/* Clear button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClear}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={16} color="var(--text-muted)" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              padding: 20,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08), rgba(20, 20, 23, 0.95))',
              border: '1px solid rgba(212, 175, 55, 0.15)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
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
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                }}>
                  Есть промокод?
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}>
                  Введите для получения скидки
                </div>
              </div>
            </div>

            {/* Input Row */}
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
              }
            `}</style>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: validationError
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 14,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isValidating ? '0 0 0 2px rgba(212,175,55,0.2)' : 'none',
              }}>
                <Tag size={18} color="var(--text-muted)" />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="ПРОМОКОД"
                  disabled={isValidating}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-main)',
                    letterSpacing: '0.08em',
                    opacity: isValidating ? 0.6 : 1,
                  }}
                />
                {isValidating && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader size={16} color="var(--gold-400)" />
                  </motion.div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: inputCode.trim() && !isValidating ? 0.95 : 1 }}
                onClick={handleSubmit}
                disabled={isValidating || !inputCode.trim()}
                style={{
                  height: 48,
                  padding: '0 20px',
                  borderRadius: 14,
                  background: inputCode.trim()
                    ? 'linear-gradient(135deg, #d4af37, #b8962e)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  cursor: inputCode.trim() && !isValidating ? 'pointer' : 'default',
                  opacity: isValidating ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  flexShrink: 0,
                  boxShadow: inputCode.trim() ? '0 4px 20px rgba(212, 175, 55, 0.35)' : 'none',
                  transition: 'opacity 0.2s, box-shadow 0.3s',
                  whiteSpace: 'nowrap',
                }}
              >
                <AnimatePresence mode="wait">
                  {isValidating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1, rotate: 360 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        rotate: { duration: 0.8, repeat: Infinity, ease: 'linear' },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader size={20} color="#0a0a0c" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="apply"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Sparkles size={18} color={inputCode.trim() ? '#0a0a0c' : 'var(--text-muted)'} />
                      <span style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: inputCode.trim() ? '#0a0a0c' : 'var(--text-muted)',
                      }}>
                        Применить
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Validation Error */}
            <AnimatePresence>
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: 13,
                    color: '#ef4444',
                  }}
                >
                  {validationError}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  // Collapsible wrapper
  if (collapsible) {
    return (
      <div className={className}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: activePromo
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))'
              : 'rgba(255, 255, 255, 0.03)',
            border: activePromo
              ? '1px solid rgba(34, 197, 94, 0.2)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: isExpanded ? '16px 16px 0 0' : 16,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activePromo ? (
              <CheckCircle2 size={18} color="#22c55e" />
            ) : (
              <Tag size={18} color="var(--text-muted)" />
            )}
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: activePromo ? '#22c55e' : 'var(--text-secondary)',
            }}>
              {activePromo ? `${activePromo.code} (-${activePromo.discount}%)` : 'Есть промокод?'}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp size={18} color="var(--text-muted)" />
          ) : (
            <ChevronDown size={18} color="var(--text-muted)" />
          )}
        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                overflow: 'hidden',
                borderRadius: '0 0 16px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ padding: 16 }}>
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return <div className={className}>{content}</div>
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROMO PRICE DISPLAY — Shows original and discounted price
// ═══════════════════════════════════════════════════════════════════════════════

interface PromoPriceDisplayProps {
  originalPrice: number
  className?: string
}

export function PromoPriceDisplay({ originalPrice, className = '' }: PromoPriceDisplayProps) {
  const { activePromo } = usePromo()

  if (!activePromo || originalPrice <= 0) {
    return (
      <span className={className} style={{
        fontSize: 24,
        fontWeight: 800,
        fontFamily: 'var(--font-mono)',
        background: 'linear-gradient(135deg, #d4af37, #f5d061)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        {originalPrice > 0 ? `${originalPrice.toLocaleString('ru-RU')} ₽` : 'На оценке...'}
      </span>
    )
  }

  const finalPrice = Math.round(originalPrice * (1 - activePromo.discount / 100))
  const savings = originalPrice - finalPrice

  return (
    <div className={className}>
      {/* Original price crossed out */}
      <div style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        textDecoration: 'line-through',
        fontFamily: 'var(--font-mono)',
        marginBottom: 4,
      }}>
        {originalPrice.toLocaleString('ru-RU')} ₽
      </div>

      {/* Final price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 24,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          background: 'linear-gradient(135deg, #22c55e, #4ade80)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {finalPrice.toLocaleString('ru-RU')} ₽
        </span>

        {/* Savings badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
          }}
        >
          <Percent size={12} color="#22c55e" />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#22c55e',
          }}>
            -{activePromo.discount}%
          </span>
        </motion.div>
      </div>

      {/* Savings text */}
      <div style={{
        fontSize: 12,
        color: '#22c55e',
        marginTop: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <Gift size={12} />
        Экономия {savings.toLocaleString('ru-RU')} ₽
      </div>
    </div>
  )
}
