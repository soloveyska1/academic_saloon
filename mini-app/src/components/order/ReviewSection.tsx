import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Loader } from 'lucide-react'
import { submitOrderReview } from '../../api/userApi'
import { useTheme } from '../../contexts/ThemeContext'

interface ReviewSectionProps {
    orderId: number
    haptic: (type: 'light' | 'medium' | 'heavy') => void
    onReviewSubmitted: () => void
}

export function ReviewSection({ orderId, haptic, onReviewSubmitted }: ReviewSectionProps) {
    const { isDark } = useTheme()
    const [rating, setRating] = useState(5)
    // ... rest of state
    const [reviewText, setReviewText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (reviewText.length < 10) {
            setError('Минимум 10 символов')
            return
        }

        haptic('medium')
        setSubmitting(true)
        setError(null)

        try {
            const result = await submitOrderReview(orderId, rating, reviewText)
            if (result.success) {
                haptic('heavy')
                onReviewSubmitted()
            } else {
                setError(result.message)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка отправки')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                borderRadius: 20,
                border: '1px solid rgba(212,175,55,0.3)',
                padding: 20,
                marginBottom: 16,
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
            }}>
                <Star size={18} color="#d4af37" fill="#d4af37" />
                <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#d4af37',
                }}>
                    Оставьте отзыв
                </span>
            </div>

            <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                margin: 0,
                marginBottom: 16,
                lineHeight: 1.5,
            }}>
                Поделитесь впечатлениями — ваш отзыв будет опубликован анонимно
            </p>

            {/* Star Rating */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 16,
            }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                        key={star}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { haptic('light'); setRating(star) }}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: 4,
                            cursor: 'pointer',
                        }}
                    >
                        <Star
                            size={32}
                            color="#d4af37"
                            fill={star <= rating ? '#d4af37' : 'transparent'}
                            style={{ transition: 'fill 0.2s' }}
                        />
                    </motion.button>
                ))}
            </div>

            {/* Review Text */}
            <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Напишите, что понравилось..."
                style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 14,
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 12,
                    color: 'var(--text-main)',
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: 12,
                }}
            />

            {error && (
                <p style={{
                    fontSize: 12,
                    color: '#ef4444',
                    margin: '0 0 12px 0',
                }}>
                    {error}
                </p>
            )}

            {/* Submit Button */}
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={submitting || reviewText.length < 10}
                style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: submitting || reviewText.length < 10
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #d4af37, #b48e26)',
                    border: 'none',
                    borderRadius: 14,
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: submitting || reviewText.length < 10 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                }}
            >
                {submitting ? (
                    <>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                            <Loader size={18} />
                        </motion.div>
                        Отправляем...
                    </>
                ) : (
                    <>
                        <Star size={18} />
                        Отправить отзыв
                    </>
                )}
            </motion.button>
        </motion.div>
    )
}
