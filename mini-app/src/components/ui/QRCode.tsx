import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Share2, X, Check, Loader2 } from 'lucide-react'
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
      } catch {
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
    } catch {
      /* silent */
    }

    // Fallback to text share
    try {
      await navigator.share({
        title: 'Academic Saloon — Приглашение',
        text: `Присоединяйся к Academic Saloon!\n\n💎 Скидка 5% на первый заказ\n💰 Бонус 100₽ на счёт\n\n👉 t.me/Kladovaya_GIPSR_bot?start=${value}`,
      })
    } catch {
      /* silent */
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
    } catch {
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
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px 16px',
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(12,12,14,0.98)',
          borderRadius: 24,
          padding: '24px 20px',
          textAlign: 'center',
          maxWidth: 360,
          width: '100%',
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          position: 'relative',
          marginTop: 20,
        }}
      >
        {/* Close Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#52525b',
          }}
        >
          <X size={16} />
        </motion.button>

        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#fff',
          marginBottom: 4,
          marginTop: 8,
        }}>
          {title}
        </h3>
        <p style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>
          {subtitle}
        </p>

        {/* QR Card - Clean Display */}
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: cardLoading ? 200 : 'auto',
          }}
        >
          {cardLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Loader2 size={28} color="#d4af37" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: '#52525b' }}>Генерируем...</span>
            </div>
          ) : cardError ? (
            <img
              src={fallbackQrUrl}
              alt="QR Code"
              loading="lazy"
              style={{
                width: size,
                height: size,
                borderRadius: 12,
              }}
            />
          ) : premiumCardUrl ? (
            <img
              src={premiumCardUrl}
              alt="Premium QR Card"
              loading="lazy"
              style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            />
          ) : (
            <img
              src={fallbackQrUrl}
              alt="QR Code"
              loading="lazy"
              style={{
                width: size,
                height: size,
                borderRadius: 12,
              }}
            />
          )}
        </motion.div>

        {/* Referral Code - Minimal */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, color: '#52525b', marginBottom: 4, letterSpacing: '0.1em', fontWeight: 500, textAlign: 'center' }}>
            ВАШ РЕФЕРАЛЬНЫЙ КОД
          </div>
          <code style={{
            color: '#d4af37',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
            display: 'block',
            overflowWrap: 'anywhere',
            wordBreak: 'normal',
            lineHeight: '1.5',
            textAlign: 'center',
            maxWidth: '100%',
          }}>
            {value}
          </code>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 12,
              color: downloaded ? '#22c55e' : '#a1a1aa',
              fontSize: 13,
              fontWeight: 500,
              cursor: downloading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {downloading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : downloaded ? (
              <Check size={16} />
            ) : (
              <Download size={16} />
            )}
            {downloaded ? 'Готово' : 'Скачать'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            disabled={sharing}
            style={{
              flex: 1.2,
              padding: '14px 16px',
              background: '#d4af37',
              border: 'none',
              borderRadius: 12,
              color: '#09090b',
              fontSize: 13,
              fontWeight: 600,
              cursor: sharing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {sharing ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Share2 size={16} />
            )}
            Поделиться
          </motion.button>
        </div>

        {/* Tip */}
        <p style={{
          fontSize: 10,
          color: '#3f3f46',
          marginTop: 14,
          lineHeight: 1.6,
        }}>
          Друзья получат скидку 5% · Вы — 5% роялти
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
