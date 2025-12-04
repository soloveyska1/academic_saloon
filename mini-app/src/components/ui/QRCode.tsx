import { motion } from 'framer-motion'
import { Download, Share2 } from 'lucide-react'

interface Props {
  value: string
  size?: number
  onClose: () => void
}

export function QRCodeModal({ value, size = 200, onClose }: Props) {
  // Using QR Server API for simplicity
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=09090b&color=d4af37&format=svg`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Academic Saloon - Реферальный код',
          text: `Присоединяйся к Academic Saloon! Мой код: ${value}`,
          url: `https://t.me/your_bot?start=${value}`,
        })
      } catch (e) {
        console.log('Share cancelled')
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrUrl.replace('format=svg', 'format=png')
    link.download = `referral-${value}.png`
    link.click()
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
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(20,20,23,0.95))',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
          maxWidth: 320,
          width: '100%',
        }}
      >
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 8,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          Ваш QR-код
        </h3>
        <p style={{ fontSize: 12, color: '#71717a', marginBottom: 20 }}>
          Покажите друзьям для быстрой регистрации
        </p>

        {/* QR Code */}
        <div style={{
          background: '#09090b',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          border: '1px solid rgba(212,175,55,0.2)',
        }}>
          <img
            src={qrUrl}
            alt="QR Code"
            style={{
              width: size,
              height: size,
              borderRadius: 8,
            }}
          />
        </div>

        {/* Code */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
        }}>
          <code style={{
            color: '#d4af37',
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.15em',
          }}>
            {value}
          </code>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Download size={16} />
            Скачать
          </motion.button>

          {navigator.share && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #d4af37, #b38728)',
                border: 'none',
                borderRadius: 12,
                color: '#09090b',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Share2 size={16} />
              Поделиться
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
