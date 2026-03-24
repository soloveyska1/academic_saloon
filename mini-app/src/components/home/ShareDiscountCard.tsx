import { memo, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, Check, Gift } from 'lucide-react'

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
  const [shared, setShared] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const shareText = `🎓 Скидка ${discountPercent}% на заказ в Академическом Салоне!\n\nИспользуй мой промокод: ${referralCode}\n\nКурсовые, дипломы, рефераты — от 990₽ 🔥`

  const shareLink = `https://t.me/${botUsername}?start=ref_${telegramId || referralCode}`

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
    setShared(true)

    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`
    window.open(telegramShareUrl, '_blank')

    setTimeout(() => setShared(false), 3000)
  }, [haptic, shareLink, shareText])

  // Try generating a canvas share card
  const handleGenerateCard = useCallback(async () => {
    haptic('heavy')

    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    const grad = ctx.createLinearGradient(0, 0, 600, 400)
    grad.addColorStop(0, '#1a1410')
    grad.addColorStop(1, '#0a0a0b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 600, 400)

    // Gold accent line
    const lineGrad = ctx.createLinearGradient(100, 0, 500, 0)
    lineGrad.addColorStop(0, 'transparent')
    lineGrad.addColorStop(0.5, '#d4af37')
    lineGrad.addColorStop(1, 'transparent')
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(100, 50)
    ctx.lineTo(500, 50)
    ctx.stroke()

    // Title
    ctx.fillStyle = '#d4af37'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('АКАДЕМИЧЕСКИЙ САЛОН', 300, 90)

    // Discount
    ctx.fillStyle = '#f5f0e0'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(`СКИДКА ${discountPercent}%`, 300, 170)

    // Gift emoji
    ctx.font = '60px serif'
    ctx.fillText('🎁', 300, 250)

    // Promo code
    ctx.fillStyle = '#d4af37'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('Ваш промокод:', 300, 300)

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 28px monospace'
    ctx.fillText(referralCode, 300, 340)

    // Watermark
    ctx.fillStyle = 'rgba(212,175,55,0.3)'
    ctx.font = '11px sans-serif'
    ctx.fillText(shareLink, 300, 380)

    // Download
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return

      // Try native share API first
      if (navigator.share) {
        const file = new File([blob], 'discount-card.png', { type: 'image/png' })
        await navigator.share({ files: [file], text: shareText })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `saloon-${referralCode}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch { /* ignore */ }
  }, [haptic, referralCode, discountPercent, shareLink, shareText])

  return (
    <div style={{
      borderRadius: 12,
      overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(27,22,12,0.94) 0%, rgba(12,12,12,0.98) 50%, rgba(9,9,10,1) 100%)',
      border: '1px solid rgba(212,175,55,0.12)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', position: 'relative' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
          <Gift size={14} color="rgba(212,175,55,0.55)" />
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

        <div style={{
          fontFamily: "var(--font-display, 'Playfair Display', serif)",
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 4,
          position: 'relative',
        }}>
          Подари другу скидку {discountPercent}%
        </div>

        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          position: 'relative',
        }}>
          А сам получи бонус с его заказа
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '0 16px 16px',
      }}>
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
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--gold-metallic)',
            color: 'var(--text-on-gold)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--glow-gold)',
          }}
        >
          <Share2 size={14} />
          {shared ? 'Отправлено!' : 'Отправить'}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span key="check" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                <Check size={14} color="var(--success-text)" />
              </motion.span>
            ) : (
              <motion.span key="copy"><Copy size={14} /></motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerateCard}
          title="Скачать карточку"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text-secondary)',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          🖼
        </motion.button>
      </div>
    </div>
  )
})
