import { memo, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, Check, Gift } from 'lucide-react'
import { Reveal } from '../ui/StaggerReveal'

interface ShareDiscountCardProps {
  referralCode: string
  discountPercent?: number
  botUsername: string
  telegramId?: number
  haptic: (type: 'light' | 'medium' | 'heavy' | 'success') => void
}

export const ShareDiscountCard = memo(function ShareDiscountCard({
  referralCode,
  discountPercent = 10,
  botUsername,
  telegramId,
  haptic,
}: ShareDiscountCardProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const shareLink = `https://t.me/${botUsername}?start=ref_${telegramId || referralCode}`
  const shareText = `Скидка ${discountPercent}% на заказ в Академическом Салоне!\n\nПромокод: ${referralCode}\nКурсовые, дипломы, рефераты — от 990₽`

  const handleCopy = useCallback(async () => {
    haptic('light')
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareLink}`)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [haptic, shareText, shareLink])

  const handleShare = useCallback(() => {
    haptic('medium')
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }, [haptic, shareLink, shareText])

  return (
    <Reveal animation="slide" direction="up">
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(27,22,12,0.94) 0%, rgba(12,12,12,0.98) 50%, rgba(9,9,10,1) 100%)',
        border: '1px solid rgba(212,175,55,0.12)',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
      }}>
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top shine */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
          }}
        />

        <div style={{ padding: '18px 16px', position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Gift size={13} strokeWidth={2} color="rgba(212,175,55,0.55)" />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.55)',
            }}>
              Поделиться скидкой
            </span>
          </div>

          {/* Headline */}
          <div style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}>
            Подари другу {discountPercent}% скидку
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}>
            Получите бонус, когда друг сделает заказ
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: 'var(--text-on-gold)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--glow-gold)',
                letterSpacing: '0.02em',
              }}
            >
              <Share2 size={14} strokeWidth={2.2} />
              Отправить в Telegram
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: '1px solid var(--border-default)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Check size={16} strokeWidth={2.5} color="var(--success-text)" />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Copy size={16} strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </Reveal>
  )
})
