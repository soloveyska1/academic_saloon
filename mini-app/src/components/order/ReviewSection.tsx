import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Loader } from 'lucide-react'
import { submitOrderReview } from '../../api/userApi'

const MIN_REVIEW_LENGTH = 10
const MAX_REVIEW_LENGTH = 2000

interface ReviewSectionProps {
    orderId: number
    haptic: (type: 'light' | 'medium' | 'heavy') => void
    onReviewSubmitted: () => void
}

export function ReviewSection({ orderId, haptic, onReviewSubmitted }: ReviewSectionProps) {
    const [rating, setRating] = useState(5)
    // ... rest of state
    const [reviewText, setReviewText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        const normalizedReviewText = reviewText.trim()
        if (normalizedReviewText.length < MIN_REVIEW_LENGTH) {
            setError('Минимум 10 символов')
            return
        }

        haptic('medium')
        setSubmitting(true)
        setError(null)

        try {
            const result = await submitOrderReview(orderId, rating, normalizedReviewText)
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
            transition={{ delay: 0.24 }}
            style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(255,255,255,0.03))',
                borderRadius: 14,
                border: '1px solid rgba(212,175,55,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                padding: 20,
                marginBottom: 16,
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
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
                marginBottom: 14,
                lineHeight: 1.5,
            }}>
                Короткий анонимный отзыв поможет улучшать сервис.
            </p>

            {/* Star Rating */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 14,
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
                            size={28}
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
                maxLength={MAX_REVIEW_LENGTH}
                style={{
                    width: '100%',
                    minHeight: 88,
                    padding: 14,
                    background: 'var(--bg-glass)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: 12,
                    lineHeight: 1.5,
                }}
            />

            <div style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                textAlign: 'right',
            }}>
                {`${reviewText.trim().length}/${MAX_REVIEW_LENGTH}`}
            </div>

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
                disabled={submitting || reviewText.trim().length < MIN_REVIEW_LENGTH}
                style={{
                    width: '100%',
                    height: 48,
                    padding: '0 20px',
                    background: submitting || reviewText.trim().length < MIN_REVIEW_LENGTH
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #d4af37, #b48e26)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#121212',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: submitting || reviewText.trim().length < MIN_REVIEW_LENGTH ? 'not-allowed' : 'pointer',
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
