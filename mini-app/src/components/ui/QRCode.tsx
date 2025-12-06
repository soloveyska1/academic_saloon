import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Share2, X, Check, Loader2, Sparkles } from 'lucide-react'
import { API_BASE_URL, getAuthHeaders } from '../../api/userApi'

interface Props {
  value: string
  size?: number
  onClose: () => void
  title?: string
  subtitle?: string
}

export function QRCodeModal({
  value,
  size = 220,
  onClose,
  title = 'Ваш QR-код',
  subtitle = 'Покажите друзьям для быстрой регистрации'
}: Props) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [premiumCardUrl, setPremiumCardUrl] = useState<string | null>(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [cardError, setCardError] = useState(false)

  // Fallback QR using external service (for display only)
  const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(value)}&bgcolor=09090b&color=d4af37&format=png`

  // Load premium card from our API
  useEffect(() => {
    const loadPremiumCard = async () => {
      try {
        setCardLoading(true)
        setCardError(false)

        const response = await fetch(`${API_BASE_URL}/qr/referral?style=card`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Failed to load premium QR')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPremiumCardUrl(url)
      } catch (err) {
        console.error('Premium QR load failed:', err)
        setCardError(true)
      } finally {
        setCardLoading(false)
      }
    }

    loadPremiumCard()

    return () => {
      if (premiumCardUrl) {
        URL.revokeObjectURL(premiumCardUrl)
      }
    }
  }, [])

  const handleShare = async () => {
    if (!navigator.share) return
    setSharing(true)

    try {
      // Try to share the premium card
      let blob: Blob | null = null

      if (premiumCardUrl) {
        const response = await fetch(premiumCardUrl)
        blob = await response.blob()
      } else {
        // Fallback to external QR
        const response = await fetch(fallbackQrUrl)
        blob = await response.blob()
      }

      const file = new File([blob], 'academic-saloon-invite.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Academic Saloon — Приглашение',
          text: `Присоединяйся к Academic Saloon!\n\n💎 Скидка 5% на первый заказ\n💰 Бонус 100₽ на счёт\n\n👉 t.me/Kladovaya_GIPSR_bot?start=${value}`,
        })
        setSharing(false)
        return
      }
    } catch (e) {
      console.warn('Image share failed, falling back to text:', e)
    }

    // Fallback to text share
    try {
      await navigator.share({
        title: 'Academic Saloon — Приглашение',
        text: `Присоединяйся к Academic Saloon!\n\n💎 Скидка 5% на первый заказ\n💰 Бонус 100₽ на счёт\n\n👉 t.me/Kladovaya_GIPSR_bot?start=${value}`,
      })
    } catch (e) {
      console.log('Share cancelled')
    }
    setSharing(false)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Prefer premium card for download
      let blob: Blob

      if (premiumCardUrl) {
        const response = await fetch(premiumCardUrl)
        blob = await response.blob()
      } else {
        // Fetch premium card directly for download
        const response = await fetch(`${API_BASE_URL}/qr/referral?style=card`, {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          blob = await response.blob()
        } else {
          // Ultimate fallback
          const fallbackResponse = await fetch(fallbackQrUrl)
          blob = await fallbackResponse.blob()
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `academic-saloon-${value}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback: open in new tab
      window.open(fallbackQrUrl, '_blank')
    }
    setDownloading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(20,20,23,0.98) 30%)',
          border: '1px solid rgba(212,175,55,0.35)',
          borderRadius: 28,
          padding: 28,
          textAlign: 'center',
          maxWidth: 380,
          width: '100%',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 0 60px -20px rgba(212,175,55,0.4)',
        }}
      >
        {/* Premium Badge */}
        <div style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #d4af37, #f5d061)',
          padding: '6px 16px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
        }}>
          <Sparkles size={14} color="#09090b" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#09090b', letterSpacing: '0.05em' }}>
            PREMIUM
          </span>
        </div>

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#71717a',
          }}
        >
          <X size={18} />
        </motion.button>

        <h3 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 6,
          marginTop: 16,
          fontFamily: "'Playfair Display', serif",
          letterSpacing: '0.02em',
        }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>
          {subtitle}
        </p>

        {/* QR Code Container */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            background: '#09090b',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 0 50px -15px rgba(212,175,55,0.4), inset 0 0 30px rgba(212,175,55,0.05)',
            minHeight: size + 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 size={32} color="#d4af37" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#71717a' }}>Генерируем карточку...</span>
            </div>
          ) : cardError ? (
            // Fallback to simple QR
            <img
              src={fallbackQrUrl}
              alt="QR Code"
              style={{
                width: size,
                height: size,
                borderRadius: 12,
                display: 'block',
              }}
            />
          ) : premiumCardUrl ? (
            <img
              src={premiumCardUrl}
              alt="Premium QR Card"
              style={{
                maxWidth: '100%',
                maxHeight: 350,
                borderRadius: 12,
                display: 'block',
              }}
            />
          ) : (
            <img
              src={fallbackQrUrl}
              alt="QR Code"
              style={{
                width: size,
                height: size,
                borderRadius: 12,
                display: 'block',
              }}
            />
          )}
        </motion.div>

        {/* Referral Code Display */}
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 20,
          border: '1px solid rgba(212,175,55,0.25)',
        }}>
          <div style={{ fontSize: 10, color: '#71717a', marginBottom: 6, letterSpacing: '0.12em', fontWeight: 600 }}>
            ВАШ РЕФЕРАЛЬНЫЙ КОД
          </div>
          <code style={{
            color: '#d4af37',
            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textShadow: '0 0 20px rgba(212,175,55,0.3)',
          }}>
            {value}
          </code>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14,
              color: downloaded ? '#22c55e' : '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: downloading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            {downloading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : downloaded ? (
              <Check size={18} />
            ) : (
              <Download size={18} />
            )}
            {downloaded ? 'Готово!' : 'Скачать'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            disabled={sharing}
            style={{
              flex: 1,
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #d4af37, #b38728)',
              border: 'none',
              borderRadius: 14,
              color: '#09090b',
              fontSize: 14,
              fontWeight: 700,
              cursor: sharing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
            }}
          >
            {sharing ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Share2 size={18} />
            )}
            Поделиться
          </motion.button>
        </div>

        {/* Tip */}
        <p style={{
          fontSize: 11,
          color: '#52525b',
          marginTop: 18,
          lineHeight: 1.5,
        }}>
          💎 Друзья получат скидку 5% на первый заказ
          <br />
          💰 Вы — пожизненные 5% роялти с их оплат
        </p>
      </motion.div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  )
}
