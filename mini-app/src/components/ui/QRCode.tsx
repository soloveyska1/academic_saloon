import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, ExternalLink, Loader2, Share2, X } from 'lucide-react'
import { API_BASE_URL, getAuthHeaders } from '../../api/userApi'
import { CenteredModalWrapper } from '../modals/shared'

interface Props {
  isOpen: boolean
  value: string
  displayValue?: string
  onClose: () => void
  title?: string
  subtitle?: string
  shareTitle?: string
  shareText?: string
  downloadFileName?: string
}

type QrAssetState = {
  cardUrl: string | null
  simpleUrl: string | null
  loading: boolean
}

export function QRCodeModal({
  isOpen,
  value,
  displayValue,
  onClose,
  title = 'QR-код приглашения',
  subtitle = 'Покажите QR, отправьте изображение или откройте ссылку в Telegram.',
  shareTitle = 'Приглашение в Академический Салон',
  shareText = 'Открывай сервис по ссылке ниже.',
  downloadFileName = 'academic-saloon-referral',
}: Props) {
  const [assetState, setAssetState] = useState<QrAssetState>({
    cardUrl: null,
    simpleUrl: null,
    loading: false,
  })
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const normalizedDisplayValue = useMemo(() => displayValue || value, [displayValue, value])
  const visibleImageUrl = assetState.cardUrl || assetState.simpleUrl

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let cancelled = false
    let currentCardUrl: string | null = null
    let currentSimpleUrl: string | null = null

    const loadQrAssets = async () => {
      setAssetState({ cardUrl: null, simpleUrl: null, loading: true })

      const loadStyle = async (style: 'card' | 'simple') => {
        const response = await fetch(`${API_BASE_URL}/qr/referral?style=${style}`, {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error(`Failed to load ${style} QR`)
        }

        const blob = await response.blob()
        return URL.createObjectURL(blob)
      }

      try {
        currentCardUrl = await loadStyle('card')
      } catch {
        currentCardUrl = null
      }

      try {
        currentSimpleUrl = await loadStyle('simple')
      } catch {
        currentSimpleUrl = null
      }

      if (cancelled) {
        if (currentCardUrl) URL.revokeObjectURL(currentCardUrl)
        if (currentSimpleUrl) URL.revokeObjectURL(currentSimpleUrl)
        return
      }

      setAssetState({
        cardUrl: currentCardUrl,
        simpleUrl: currentSimpleUrl,
        loading: false,
      })
    }

    loadQrAssets()

    return () => {
      cancelled = true
      if (currentCardUrl) URL.revokeObjectURL(currentCardUrl)
      if (currentSimpleUrl) URL.revokeObjectURL(currentSimpleUrl)
    }
  }, [isOpen])

  const handleShare = async () => {
    if (!value || !navigator.share) return

    setSharing(true)
    try {
      if (visibleImageUrl) {
        const imageResponse = await fetch(visibleImageUrl)
        const imageBlob = await imageResponse.blob()
        const file = new File([imageBlob], `${downloadFileName}.png`, { type: 'image/png' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: shareTitle,
            text: `${shareText}\n${value}`,
          })
          return
        }
      }

      await navigator.share({
        title: shareTitle,
        text: `${shareText}\n${value}`,
      })
    } catch {
      /* intentionally ignore cancel and share errors */
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = async () => {
    if (!visibleImageUrl) return

    setDownloading(true)
    try {
      const response = await fetch(visibleImageUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${downloadFileName}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setDownloaded(true)
      window.setTimeout(() => setDownloaded(false), 2000)
    } finally {
      setDownloading(false)
    }
  }

  const handleOpenLink = () => {
    if (!value) return
    window.open(value, '_blank', 'noopener,noreferrer')
  }

  return (
    <CenteredModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="qr-code-modal"
      title={title}
      hideCloseButton
    >
      <div style={{ padding: '24px 20px', textAlign: 'center' }}>
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
            color: '#71717a',
          }}
        >
          <X size={16} />
        </motion.button>

        <div style={{ marginTop: 8, marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
            {title}
          </h3>
          <p style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.55, margin: 0 }}>
            {subtitle}
          </p>
        </div>

        <div
          style={{
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {assetState.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Loader2 size={28} color="#d4af37" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: '#71717a' }}>Готовим QR-код…</span>
            </div>
          ) : visibleImageUrl ? (
            <img
              src={visibleImageUrl}
              alt="Реферальный QR-код"
              loading="lazy"
              style={{
                width: '100%',
                maxWidth: assetState.cardUrl ? 320 : 220,
                borderRadius: assetState.cardUrl ? 18 : 16,
                boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '22px 20px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#a1a1aa',
                lineHeight: 1.6,
                fontSize: 13,
              }}
            >
              Не удалось загрузить QR-код. Откройте ссылку напрямую или попробуйте снова чуть позже.
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 16px',
            marginBottom: 16,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#71717a',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Код приглашения
          </div>
          <code
            style={{
              color: '#d4af37',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              overflowWrap: 'anywhere',
              display: 'block',
              lineHeight: 1.5,
            }}
          >
            {normalizedDisplayValue}
          </code>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            disabled={downloading || !visibleImageUrl}
            style={{
              minHeight: 48,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.05)',
              color: downloaded ? '#22c55e' : '#f4f4f5',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: downloading || !visibleImageUrl ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: visibleImageUrl ? 1 : 0.5,
            }}
          >
            {downloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : downloaded ? <Check size={15} /> : <Download size={15} />}
            {downloaded ? 'Готово' : 'Скачать'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            disabled={sharing || !value}
            style={{
              minHeight: 48,
              borderRadius: 14,
              border: 'none',
              background: 'var(--gold-metallic)',
              color: '#09090b',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: sharing || !value ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: value ? 1 : 0.5,
            }}
          >
            {sharing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Share2 size={15} />}
            Поделиться
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenLink}
            disabled={!value}
            style={{
              minHeight: 48,
              borderRadius: 14,
              border: '1px solid rgba(212,175,55,0.18)',
              background: 'rgba(212,175,55,0.1)',
              color: '#d4af37',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: value ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: value ? 1 : 0.5,
            }}
          >
            <ExternalLink size={15} />
            Открыть
          </motion.button>
        </div>

        <p style={{ fontSize: 11, color: '#71717a', lineHeight: 1.6, margin: '14px 4px 0' }}>
          Если QR не сканируется с экрана, можно скачать карточку или сразу открыть ссылку в Telegram.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </CenteredModalWrapper>
  )
}
