import { memo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Share2 } from 'lucide-react'
import { haptic } from '../../utils/animation'
import {
  renderShareCard,
  shareCardToBlob,
  shareCardToDataURL,
  type ShareCardAchievement,
  type ShareCardStats,
} from '../../utils/shareCard'

export interface AchievementShareCardProps {
  achievement: ShareCardAchievement
  userName: string
  stats?: ShareCardStats
  onShare: () => void
  onClose: () => void
}

export const AchievementShareCard = memo(function AchievementShareCard({
  achievement,
  userName,
  stats,
  onShare,
  onClose,
}: AchievementShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderShareCard(canvas, { achievement, userName, stats })
  }, [achievement, userName, stats])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const { body } = document
    const previousOverflow = body.style.overflow
    const previousTouchAction = body.style.touchAction
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'

    return () => {
      body.style.overflow = previousOverflow
      body.style.touchAction = previousTouchAction
    }
  }, [])

  const handleShare = useCallback(async () => {
    haptic('medium')
    const canvas = canvasRef.current
    if (!canvas) return

    // Try Telegram WebApp share first
    const tg = (window as any).Telegram?.WebApp
    if (tg?.shareMessage) {
      try {
        const dataUrl = shareCardToDataURL(canvas)
        tg.shareMessage(dataUrl)
        onShare()
        return
      } catch {
        // fall through to clipboard
      }
    }

    // Try native share API with blob
    const blob = await shareCardToBlob(canvas)
    if (blob && navigator.share) {
      try {
        const file = new File([blob], 'achievement.png', { type: 'image/png' })
        await navigator.share({
          title: `${achievement.title} — Академический Салон`,
          files: [file],
        })
        onShare()
        return
      } catch {
        // fall through to clipboard
      }
    }

    // Fallback: copy data URL to clipboard
    try {
      const dataUrl = shareCardToDataURL(canvas)
      await navigator.clipboard.writeText(dataUrl)
      haptic('light')
      onShare()
    } catch {
      // silent fail
    }
  }, [achievement, onShare])

  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          maxWidth: 400,
          width: '100%',
        }}
      >
          {/* Canvas card */}
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: 400,
              height: 'auto',
              aspectRatio: '400 / 560',
              borderRadius: 20,
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.1)',
            }}
          />

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              width: '100%',
              maxWidth: 400,
            }}
          >
            {/* Share button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleShare}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 20px',
                borderRadius: 14,
                border: '1px solid rgba(212,175,55,0.25)',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                color: '#D4AF37',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              <Share2 size={17} strokeWidth={2} />
              Поделиться
            </motion.button>

            {/* Close button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                haptic('light')
                onClose()
              }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                flexShrink: 0,
              }}
            >
              <X size={20} strokeWidth={1.8} />
            </motion.button>
          </div>
      </motion.div>
    </motion.div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(overlay, document.body)
})
