import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Receipt, Timer, CheckCircle, Zap, Shield, CreditCard,
    Smartphone, Copy, Check, Loader, Headphones, Sparkles,
    ChevronDown, Lock, Star, Gift
} from 'lucide-react'
import { Order } from '../../types'
import { PaymentInfo, confirmPayment } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'

interface GoldenInvoiceProps {
    order: Order
    paymentInfo: PaymentInfo | null
    onPaymentConfirmed: () => void
    paymentScheme: 'full' | 'half'
    setPaymentScheme: (scheme: 'full' | 'half') => void
    onChatStart?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
//  FLOATING PARTICLES
// ═══════════════════════════════════════════════════════════════════════════

function FloatingParticles({ color = '#D4AF37', count = 6 }: { color?: string; count?: number }) {
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{
                        opacity: [0, 0.6, 0],
                        y: [-10, -60],
                        x: [0, (i % 2 === 0 ? 15 : -15)],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: 'easeOut',
                    }}
                    style={{
                        position: 'absolute',
                        left: `${15 + (i * 12)}%`,
                        bottom: '10%',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                    }}
                />
            ))}
        </div>
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
        'top-left': { top: 0, left: 0, borderTop: `2px solid ${color}50`, borderLeft: `2px solid ${color}50`, borderRadius: '16px 0 0 0' },
        'top-right': { top: 0, right: 0, borderTop: `2px solid ${color}50`, borderRight: `2px solid ${color}50`, borderRadius: '0 16px 0 0' },
        'bottom-left': { bottom: 0, left: 0, borderBottom: `2px solid ${color}50`, borderLeft: `2px solid ${color}50`, borderRadius: '0 0 0 16px' },
        'bottom-right': { bottom: 0, right: 0, borderBottom: `2px solid ${color}50`, borderRight: `2px solid ${color}50`, borderRadius: '0 0 16px 0' },
    }

    return (
        <div style={{
            position: 'absolute',
            width: 24,
            height: 24,
            ...positionStyles[position],
        }} />
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED TIMER
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedTimer() {
    const [hours, setHours] = useState(24)
    const [minutes, setMinutes] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setMinutes(prev => {
                if (prev === 0) {
                    setHours(h => Math.max(0, h - 1))
                    return 59
                }
                return prev - 1
            })
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <motion.div
            animate={{
                boxShadow: [
                    '0 0 0 rgba(245,158,11,0)',
                    '0 0 20px rgba(245,158,11,0.3)',
                    '0 0 0 rgba(245,158,11,0)',
                ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                borderRadius: 14,
                border: '1px solid rgba(245,158,11,0.3)',
            }}
        >
            <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Timer size={16} color="#f59e0b" />
            </motion.div>
            <span style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: '#f59e0b',
            }}>
                {hours}ч {minutes.toString().padStart(2, '0')}м
            </span>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRICE BREAKDOWN COLLAPSIBLE
// ═══════════════════════════════════════════════════════════════════════════

function PriceBreakdown({ order }: { order: Order }) {
    const [isOpen, setIsOpen] = useState(false)
    const savings = Math.round(order.price - order.final_price)

    if (!order.promo_code && !(order.discount || 0) && !(order.bonus_used || 0)) {
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                marginBottom: 20,
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                border: '1px solid rgba(34,197,94,0.2)',
                overflow: 'hidden',
            }}
        >
            <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Gift size={16} color="#22c55e" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                            Ваша экономия
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                            {order.promo_code ? `Промокод ${order.promo_code}` : 'Скидки и бонусы'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: '#22c55e',
                    }}>
                        −{savings.toLocaleString('ru-RU')} ₽
                    </span>
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={18} color="#22c55e" />
                    </motion.div>
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            borderTop: '1px solid rgba(34,197,94,0.15)',
                            padding: '14px 18px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Базовая цена:</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                                    {order.price?.toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                            {order.promo_code && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: '#a78bfa' }}>🎟️ Промокод:</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                        −{order.promo_discount || 0}%
                                    </span>
                                </div>
                            )}
                            {(order.discount || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: '#60a5fa' }}>🎖️ Лояльность:</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                        −{order.discount}%
                                    </span>
                                </div>
                            )}
                            {(order.bonus_used || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: '#fbbf24' }}>⭐ Бонусы:</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                        −{order.bonus_used?.toLocaleString('ru-RU')} ₽
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SUCCESS SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function PremiumSuccessScreen() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                background: 'linear-gradient(145deg, rgba(34,197,94,0.1), rgba(20,20,23,0.98))',
                borderRadius: 28,
                border: '1px solid rgba(34,197,94,0.3)',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                minHeight: 340,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <FloatingParticles color="#22c55e" count={8} />
            <DecorativeCorner position="top-left" color="#22c55e" />
            <DecorativeCorner position="top-right" color="#22c55e" />
            <DecorativeCorner position="bottom-left" color="#22c55e" />
            <DecorativeCorner position="bottom-right" color="#22c55e" />

            {/* Shimmer */}
            <motion.div
                animate={{ x: ['-200%', '300%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.1), transparent)',
                    transform: 'skewX(-20deg)',
                    pointerEvents: 'none',
                }}
            />

            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 30,
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))',
                    border: '2px solid rgba(34,197,94,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                <motion.div
                    animate={{
                        boxShadow: [
                            '0 0 0 rgba(34,197,94,0)',
                            '0 0 40px rgba(34,197,94,0.4)',
                            '0 0 0 rgba(34,197,94,0)',
                        ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        position: 'absolute',
                        inset: -4,
                        borderRadius: 34,
                    }}
                />
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                >
                    <CheckCircle size={48} color="#22c55e" strokeWidth={1.5} />
                </motion.div>
            </motion.div>

            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 26,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        marginBottom: 12,
                    }}
                >
                    Оплата отправлена!
                </motion.h3>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.6)',
                        margin: 0,
                        lineHeight: 1.7,
                    }}
                >
                    Мы проверим перевод и начнём работу.<br />
                    Обычно это занимает 5-15 минут.
                </motion.p>
            </div>

            {/* Progress indicator */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'rgba(34,197,94,0.1)',
                    borderRadius: 12,
                    border: '1px solid rgba(34,197,94,0.2)',
                }}
            >
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader size={14} color="#22c55e" />
                </motion.div>
                <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
                    Проверяем платёж...
                </span>
            </motion.div>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function GoldenInvoice({ order, paymentInfo, onPaymentConfirmed, paymentScheme, setPaymentScheme, onChatStart }: GoldenInvoiceProps) {
    const { haptic, hapticSuccess, hapticError } = useTelegram()

    const isSecondPayment = (order.paid_amount || 0) > 0
    const remainingAmount = paymentInfo?.remaining || order.final_price - (order.paid_amount || 0)

    const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card')
    const [copied, setCopied] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const amountToPay = isSecondPayment
        ? remainingAmount
        : paymentScheme === 'full'
            ? remainingAmount
            : Math.ceil(remainingAmount / 2)

    const copyToClipboard = useCallback(async (text: string, key: string) => {
        haptic('light')
        try {
            await navigator.clipboard.writeText(text.replace(/\s/g, ''))
            setCopied(key)
            setTimeout(() => setCopied(null), 2000)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = text.replace(/\s/g, '')
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(key)
            setTimeout(() => setCopied(null), 2000)
        }
    }, [haptic])

    const handleConfirmPayment = async () => {
        haptic('medium')
        setProcessing(true)
        setError(null)

        try {
            const result = await confirmPayment(order.id, paymentMethod, paymentScheme)

            if (result.success) {
                hapticSuccess()
                setSuccess(true)
                setTimeout(() => {
                    onPaymentConfirmed()
                }, 2500)
            } else {
                setError(result.message)
                hapticError()
            }
        } catch (err) {
            console.error('[Payment] Error:', err)
            const errorMessage = err instanceof Error ? err.message : 'Ошибка соединения'
            setError(errorMessage)
            hapticError()
        } finally {
            setProcessing(false)
        }
    }

    // Success Screen
    if (success) {
        return <PremiumSuccessScreen />
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                borderRadius: 28,
                background: 'linear-gradient(145deg, rgba(212,175,55,0.08) 0%, rgba(20,20,23,0.98) 100%)',
                border: '1px solid rgba(212,175,55,0.25)',
                boxShadow: '0 20px 60px -15px rgba(212,175,55,0.2)',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Floating particles */}
            <FloatingParticles color="#D4AF37" count={5} />

            {/* Decorative corners */}
            <DecorativeCorner position="top-left" />
            <DecorativeCorner position="top-right" />
            <DecorativeCorner position="bottom-left" />
            <DecorativeCorner position="bottom-right" />

            {/* Premium shimmer effect */}
            <motion.div
                animate={{ x: ['-200%', '300%'] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '30%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
                    transform: 'skewX(-20deg)',
                    pointerEvents: 'none',
                }}
            />

            {/* ═══ HEADER ═══ */}
            <div style={{
                padding: '24px 24px 20px',
                borderBottom: '1px solid rgba(212,175,55,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <motion.div
                        animate={{
                            boxShadow: [
                                '0 0 0 rgba(212,175,55,0)',
                                '0 0 25px rgba(212,175,55,0.3)',
                                '0 0 0 rgba(212,175,55,0)',
                            ],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                            border: '1.5px solid rgba(212,175,55,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Receipt size={24} color="#D4AF37" />
                    </motion.div>
                    <div>
                        <h3 style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 20,
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            margin: 0,
                            marginBottom: 4,
                        }}>
                            {isSecondPayment ? 'Доплата' : 'Счёт на оплату'}
                        </h3>
                        <p style={{
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.5)',
                            margin: 0,
                            fontFamily: "var(--font-mono)",
                        }}>
                            Заказ #{order.id}
                        </p>
                    </div>
                </div>

                <AnimatedTimer />
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div style={{ padding: '24px', position: 'relative', zIndex: 1 }}>

                {/* Price breakdown */}
                <PriceBreakdown order={order} />

                {/* ═══ HERO PRICE ═══ */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                        textAlign: 'center',
                        padding: '28px 20px',
                        marginBottom: 24,
                        borderRadius: 20,
                        background: 'linear-gradient(145deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))',
                        border: '1px solid rgba(212,175,55,0.2)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Inner shimmer */}
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '50%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                            pointerEvents: 'none',
                        }}
                    />

                    <p style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'rgba(212,175,55,0.8)',
                        margin: 0,
                        marginBottom: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                    }}>
                        К оплате
                    </p>

                    <motion.div
                        key={amountToPay}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                    >
                        <motion.span
                            animate={{
                                textShadow: [
                                    '0 0 0 rgba(212,175,55,0)',
                                    '0 0 30px rgba(212,175,55,0.4)',
                                    '0 0 0 rgba(212,175,55,0)',
                                ],
                            }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                            style={{
                                fontSize: 52,
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                background: 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                lineHeight: 1,
                            }}
                        >
                            {amountToPay.toLocaleString('ru-RU')} ₽
                        </motion.span>
                    </motion.div>

                    {/* Remaining amount hint */}
                    {!isSecondPayment && paymentScheme === 'half' && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: 14,
                                padding: '8px 14px',
                                background: 'rgba(139,92,246,0.1)',
                                borderRadius: 10,
                                border: '1px solid rgba(139,92,246,0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <Shield size={14} color="#8b5cf6" />
                            <span style={{ fontSize: 12, color: '#a78bfa' }}>
                                Доплата после: <strong style={{ fontFamily: 'var(--font-mono)' }}>{amountToPay.toLocaleString('ru-RU')} ₽</strong>
                            </span>
                        </motion.div>
                    )}
                </motion.div>

                {/* ═══ PAYMENT SCHEME ═══ */}
                {!isSecondPayment ? (
                    <div style={{ marginBottom: 20 }}>
                        <div style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.4)',
                            marginBottom: 12,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <Sparkles size={12} color="#D4AF37" />
                            Схема оплаты
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { key: 'full' as const, icon: Zap, label: '100%', desc: 'Полная оплата', benefit: 'Приоритет' },
                                { key: 'half' as const, icon: Shield, label: '50%', desc: 'Предоплата', benefit: 'Гарантия' },
                            ].map((scheme) => (
                                <motion.button
                                    key={scheme.key}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => { haptic('light'); setPaymentScheme(scheme.key) }}
                                    style={{
                                        padding: 18,
                                        background: paymentScheme === scheme.key
                                            ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))'
                                            : 'rgba(255,255,255,0.02)',
                                        border: paymentScheme === scheme.key
                                            ? '2px solid rgba(212,175,55,0.5)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 18,
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {paymentScheme === scheme.key && (
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '50%',
                                                height: '100%',
                                                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.1), transparent)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                                        <scheme.icon size={18} color={paymentScheme === scheme.key ? '#D4AF37' : '#52525b'} />
                                        <span style={{
                                            fontSize: 18,
                                            fontWeight: 700,
                                            color: paymentScheme === scheme.key ? '#D4AF37' : '#71717a',
                                        }}>
                                            {scheme.label}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 12, color: paymentScheme === scheme.key ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.4)', margin: 0 }}>
                                        {scheme.desc}
                                    </p>
                                    {paymentScheme === scheme.key && (
                                        <div style={{
                                            marginTop: 8,
                                            padding: '4px 8px',
                                            background: 'rgba(212,175,55,0.15)',
                                            borderRadius: 6,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: '#D4AF37',
                                            display: 'inline-block',
                                        }}>
                                            ✓ {scheme.benefit}
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginBottom: 20,
                            padding: '16px 18px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
                            borderRadius: 16,
                            border: '1px solid rgba(34,197,94,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                        }}
                    >
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: 'rgba(34,197,94,0.15)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <CheckCircle size={22} color="#22c55e" />
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', margin: 0, marginBottom: 4 }}>
                                Предоплата: {order.paid_amount?.toLocaleString('ru-RU')} ₽
                            </p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                                Осталось внести полную сумму остатка
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ═══ PAYMENT METHOD ═══ */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.4)',
                        marginBottom: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <CreditCard size={12} color="#3b82f6" />
                        Способ оплаты
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { key: 'card' as const, icon: CreditCard, label: 'На карту', color: '#3b82f6' },
                            { key: 'sbp' as const, icon: Smartphone, label: 'СБП', color: '#8b5cf6' },
                        ].map((method) => (
                            <motion.button
                                key={method.key}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { haptic('light'); setPaymentMethod(method.key) }}
                                style={{
                                    padding: 18,
                                    background: paymentMethod === method.key
                                        ? `linear-gradient(135deg, ${method.color}20, ${method.color}08)`
                                        : 'rgba(255,255,255,0.02)',
                                    border: paymentMethod === method.key
                                        ? `2px solid ${method.color}60`
                                        : '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 18,
                                    cursor: 'pointer',
                                }}
                            >
                                <method.icon
                                    size={26}
                                    color={paymentMethod === method.key ? method.color : '#52525b'}
                                    style={{ marginBottom: 10 }}
                                />
                                <p style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: paymentMethod === method.key ? method.color : '#71717a',
                                    margin: 0,
                                }}>
                                    {method.label}
                                </p>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* ═══ PAYMENT DETAILS ═══ */}
                <AnimatePresence mode="wait">
                    {paymentMethod === 'card' && paymentInfo && (
                        <motion.div
                            key="card"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))',
                                borderRadius: 18,
                                border: '1px solid rgba(59,130,246,0.2)',
                                padding: 20,
                                marginBottom: 20,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <Lock size={14} color="#3b82f6" />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Реквизиты карты
                                </span>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => copyToClipboard(paymentInfo.card_number, 'card')}
                                style={{
                                    width: '100%',
                                    padding: '16px 18px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(59,130,246,0.2)',
                                    borderRadius: 14,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                }}
                            >
                                <span style={{
                                    fontSize: 19,
                                    fontWeight: 600,
                                    fontFamily: "var(--font-mono)",
                                    color: 'var(--text-main)',
                                    letterSpacing: '0.08em',
                                }}>
                                    {paymentInfo.card_number}
                                </span>
                                <motion.div
                                    animate={copied === 'card' ? { scale: [1, 1.2, 1] } : {}}
                                >
                                    {copied === 'card' ? (
                                        <Check size={20} color="#22c55e" />
                                    ) : (
                                        <Copy size={20} color="#3b82f6" />
                                    )}
                                </motion.div>
                            </motion.button>

                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center' }}>
                                {paymentInfo.card_holder}
                            </p>
                        </motion.div>
                    )}

                    {paymentMethod === 'sbp' && paymentInfo && (
                        <motion.div
                            key="sbp"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
                                borderRadius: 18,
                                border: '1px solid rgba(139,92,246,0.2)',
                                padding: 20,
                                marginBottom: 20,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <Lock size={14} color="#8b5cf6" />
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Реквизиты СБП
                                </span>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => copyToClipboard(paymentInfo.sbp_phone, 'phone')}
                                style={{
                                    width: '100%',
                                    padding: '16px 18px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(139,92,246,0.2)',
                                    borderRadius: 14,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                }}
                            >
                                <span style={{
                                    fontSize: 19,
                                    fontWeight: 600,
                                    fontFamily: "var(--font-mono)",
                                    color: 'var(--text-main)',
                                }}>
                                    {paymentInfo.sbp_phone}
                                </span>
                                <motion.div
                                    animate={copied === 'phone' ? { scale: [1, 1.2, 1] } : {}}
                                >
                                    {copied === 'phone' ? (
                                        <Check size={20} color="#22c55e" />
                                    ) : (
                                        <Copy size={20} color="#8b5cf6" />
                                    )}
                                </motion.div>
                            </motion.button>

                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center' }}>
                                Банк: {paymentInfo.sbp_bank}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══ ERROR ═══ */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            padding: '14px 18px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 14,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 14 }}>⚠️</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
                    </motion.div>
                )}

                {/* ═══ CHAT BUTTON ═══ */}
                {onChatStart && (
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { haptic('light'); onChatStart() }}
                        style={{
                            width: '100%',
                            marginBottom: 16,
                            padding: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                        }}
                    >
                        <Headphones size={18} color="rgba(255,255,255,0.5)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                            Нужна помощь? Написать менеджеру
                        </span>
                    </motion.button>
                )}

                {/* ═══ CONFIRM BUTTON ═══ */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleConfirmPayment}
                    disabled={processing}
                    animate={!processing ? {
                        boxShadow: [
                            '0 8px 30px -8px rgba(212,175,55,0.4)',
                            '0 12px 40px -8px rgba(212,175,55,0.6)',
                            '0 8px 30px -8px rgba(212,175,55,0.4)',
                        ],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                        width: '100%',
                        padding: '20px 24px',
                        fontSize: 17,
                        fontWeight: 700,
                        fontFamily: "var(--font-serif)",
                        color: processing ? '#71717a' : '#0a0a0c',
                        background: processing
                            ? 'rgba(255,255,255,0.08)'
                            : 'linear-gradient(180deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)',
                        border: 'none',
                        borderRadius: 18,
                        cursor: processing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Button shimmer */}
                    {!processing && (
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '50%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    {processing ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            >
                                <Loader size={20} />
                            </motion.div>
                            Проверяем...
                        </>
                    ) : (
                        <>
                            <Check size={20} />
                            Я оплатил {amountToPay.toLocaleString('ru-RU')} ₽
                        </>
                    )}
                </motion.button>

                {/* ═══ TRUST SIGNALS ═══ */}
                <div style={{
                    marginTop: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                }}>
                    {[
                        { icon: Shield, label: 'Безопасно', color: '#22c55e' },
                        { icon: Lock, label: 'Защищено', color: '#3b82f6' },
                        { icon: Star, label: '5-15 мин', color: '#D4AF37' },
                    ].map((badge, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.1 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: `${badge.color}10`,
                                border: `1px solid ${badge.color}20`,
                            }}
                        >
                            <badge.icon size={12} color={badge.color} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: badge.color }}>
                                {badge.label}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
