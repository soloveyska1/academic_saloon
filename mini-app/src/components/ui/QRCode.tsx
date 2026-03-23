import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, ExternalLink, Loader2, Share2 } from 'lucide-react'
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
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '24px 22px 22px', textAlign: 'center' }}>
        <div style={{ marginTop: 6, marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.72)',
              marginBottom: 8,
            }}
          >
            Приглашение
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: 32,
              lineHeight: 0.96,
              letterSpacing: '-0.05em',
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            {subtitle}
          </p>
        </div>

        <div
          style={{
            position: 'relative',
            minHeight: 236,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            padding: 18,
            borderRadius: 26,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(16,14,11,0.58) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -54,
              right: -26,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 28%, transparent 72%)',
              pointerEvents: 'none',
            }}
          />

          {assetState.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Loader2 size={28} color="var(--gold-400)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Готовим QR-код…</span>
            </div>
          ) : visibleImageUrl ? (
            <img
              src={visibleImageUrl}
              alt="Реферальный QR-код"
              loading="lazy"
              style={{
                width: '100%',
                maxWidth: assetState.cardUrl ? 320 : 220,
                borderRadius: assetState.cardUrl ? 22 : 18,
                boxShadow: '0 20px 42px rgba(0,0,0,0.4)',
                position: 'relative',
                zIndex: 1,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '22px 20px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-secondary)',
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
            marginBottom: 18,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Код приглашения
          </div>
          <code
            style={{
              color: 'var(--gold-400)',
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            disabled={downloading || !visibleImageUrl}
            style={{
              minHeight: 50,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.04)',
              color: downloaded ? 'var(--success-text)' : 'var(--text-primary)',
              fontSize: 12.5,
              fontWeight: 700,
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
              minHeight: 50,
              borderRadius: 16,
              border: 'none',
              background: 'var(--gold-metallic)',
              color: 'var(--text-on-gold)',
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
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleOpenLink}
          disabled={!value}
          style={{
            width: '100%',
            minHeight: 50,
            borderRadius: 16,
            border: '1px solid rgba(212,175,55,0.16)',
            background: 'rgba(212,175,55,0.08)',
            color: 'var(--gold-400)',
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
          Открыть ссылку
        </motion.button>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: '14px 4px 0' }}>
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
