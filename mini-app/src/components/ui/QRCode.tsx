import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Share2, X, Check, Loader2 } from 'lucide-react'

interface Props {
  value: string
  size?: number
  onClose: () => void
}

export function QRCodeModal({ value, size = 200, onClose }: Props) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Using QR Server API - PNG for download, SVG for display
  const qrUrlPng = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(value)}&bgcolor=09090b&color=d4af37&format=png`
  const qrUrlSvg = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=09090b&color=d4af37&format=svg`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Academic Saloon - Реферальный код',
          text: `Присоединяйся к Academic Saloon! Мой реферальный код: ${value}`,
        })
      } catch (e) {
        console.log('Share cancelled')
      }
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Fetch the image
      const response = await fetch(qrUrlPng)
      const blob = await response.blob()

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
      window.open(qrUrlPng, '_blank')
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
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          background: 'linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(20,20,23,0.98) 25%)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 24,
          padding: 24,
          textAlign: 'center',
          maxWidth: 340,
          width: '100%',
          position: 'relative',
        }}
      >
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
            background: 'rgba(255,255,255,0.1)',
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
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 6,
          marginTop: 8,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          Ваш QR-код
        </h3>
        <p style={{ fontSize: 12, color: '#71717a', marginBottom: 24 }}>
          Покажите друзьям для быстрой регистрации
        </p>

        {/* QR Code Container */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            background: '#09090b',
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 0 40px -10px rgba(212,175,55,0.3), inset 0 0 20px rgba(212,175,55,0.05)',
          }}
        >
          <img
            src={qrUrlSvg}
            alt="QR Code"
            style={{
              width: size,
              height: size,
              borderRadius: 12,
              display: 'block',
              margin: '0 auto',
            }}
          />
        </motion.div>

        {/* Referral Code Display */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          border: '1px solid rgba(212,175,55,0.2)',
        }}>
          <div style={{ fontSize: 10, color: '#71717a', marginBottom: 4, letterSpacing: '0.1em' }}>
            РЕФЕРАЛЬНЫЙ КОД
          </div>
          <code style={{
            color: '#d4af37',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
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
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
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
            {downloaded ? 'Сохранено!' : 'Скачать'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #d4af37, #b38728)',
              border: 'none',
              borderRadius: 14,
              color: '#09090b',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(212,175,55,0.3)',
            }}
          >
            <Share2 size={18} />
            Поделиться
          </motion.button>
        </div>

        {/* Tip */}
        <p style={{
          fontSize: 11,
          color: '#52525b',
          marginTop: 16,
          lineHeight: 1.4,
        }}>
          Друзья получат бонус при регистрации, а вы — 5% с их заказов
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
