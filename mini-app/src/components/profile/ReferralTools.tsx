import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, Copy, Share2, Check, QrCode, MessageCircle, Send, Users } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  REFERRAL TOOLS - Sharing tools for agents
// ═══════════════════════════════════════════════════════════════════════════════

interface ReferralToolsProps {
  referralCode: string
  referralLink: string
  onShare: (platform: 'telegram' | 'copy' | 'qr') => void
}

export const ReferralTools = memo(function ReferralTools({
  referralCode,
  referralLink,
  onShare,
}: ReferralToolsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    onShare('copy')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [onShare])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
          Инструменты приглашения
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)' }}>
          Делитесь ссылкой и получайте комиссию с заказов
        </div>
      </div>

      {/* Referral code card */}
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: 'rgba(18, 18, 21, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(167, 139, 250, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Link size={18} color="#A78BFA" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
              Ваш реферальный код
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.05em' }}>
              {referralCode}
            </div>
          </div>
        </div>

        {/* Referral link */}
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', marginBottom: 4 }}>
            Реферальная ссылка
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.7)',
              wordBreak: 'break-all',
              lineHeight: 1.4,
            }}
          >
            {referralLink}
          </div>
        </div>

        {/* Copy button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(167, 139, 250, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Check size={18} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>
                  Скопировано!
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Copy size={18} color="#A78BFA" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#A78BFA' }}>
                  Скопировать ссылку
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Share options */}
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: 'rgba(18, 18, 21, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)', marginBottom: 14 }}>
          Поделиться
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Telegram */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onShare('telegram')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              border: 'none',
              background: 'rgba(0, 136, 204, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(0, 136, 204, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} color="#0088CC" />
            </div>
            <span style={{ fontSize: 12, color: '#0088CC', fontWeight: 500 }}>
              Telegram
            </span>
          </motion.button>

          {/* QR Code */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onShare('qr')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={20} color="rgba(255, 255, 255, 0.7)" />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
              QR-код
            </span>
          </motion.button>
        </div>
      </div>

      {/* Tips */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Users size={16} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
            <strong style={{ color: '#D4AF37' }}>Совет:</strong> Делитесь ссылкой в группах и чатах.
            Вы получаете комиссию с каждого заказа приглашённого пользователя!
          </div>
        </div>
      </div>
    </motion.div>
  )
})
