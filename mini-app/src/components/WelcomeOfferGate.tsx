import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink, LockKeyhole, ScrollText, ShieldCheck, Sparkles } from 'lucide-react'
import { acceptTerms, fetchConfig } from '../api/userApi'
import { OfferModal } from './modals/OfferModal'
import type { UserData } from '../types'

interface WelcomeOfferGateProps {
  user: UserData
  onAccepted: () => Promise<unknown> | unknown
  previewMode?: boolean
}

function triggerNotificationHaptic(type: 'success' | 'error') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type)
  } catch {
    // Ignore outside Telegram
  }
}

function openExternalUrl(url: string) {
  try {
    const tg = window.Telegram?.WebApp as { openLink?: (href: string) => void } | undefined
    if (tg?.openLink) {
      tg.openLink(url)
      return
    }
  } catch {
    // Fallback below
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Конфиденциальность',
    text: 'Данные, переписка и материалы остаются внутри сервиса.',
  },
  {
    icon: Sparkles,
    title: 'Прозрачные условия',
    text: 'Сроки, правки, оплата и гарантии фиксируются до старта работы.',
  },
  {
    icon: LockKeyhole,
    title: 'Доступ после акцепта',
    text: 'Заказы, чат, файлы и оплата откроются сразу после принятия оферты.',
  },
]

export function WelcomeOfferGate({ user, onAccepted, previewMode = false }: WelcomeOfferGateProps) {
  const [showOffer, setShowOffer] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offerUrl, setOfferUrl] = useState<string>('https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30')

  useEffect(() => {
    let alive = true

    fetchConfig()
      .then((config) => {
        if (alive && config.offer_url) {
          setOfferUrl(config.offer_url)
        }
      })
      .catch(() => {
        // Keep the default public offer URL
      })

    return () => {
      alive = false
    }
  }, [])

  const firstName = useMemo(() => {
    const trimmed = (user.fullname || '').trim()
    return trimmed ? trimmed.split(/\s+/)[0] : 'друг'
  }, [user.fullname])

  const openOffer = useCallback(() => {
    setError(null)
    setShowOffer(true)
  }, [])

  const handleAccept = useCallback(async () => {
    if (accepting) return

    setAccepting(true)
    setError(null)

    try {
      if (!previewMode) {
        await acceptTerms()
      }
      await onAccepted()
      triggerNotificationHaptic('success')
    } catch (err) {
      triggerNotificationHaptic('error')
      setShowOffer(false)
      setAccepting(false)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить принятие оферты. Попробуйте ещё раз.')
    }
  }, [accepting, onAccepted, previewMode])

  const handleOpenExternalOffer = useCallback(() => {
    openExternalUrl(offerUrl)
  }, [offerUrl])

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top, rgba(212,175,55,0.12) 0%, transparent 34%), linear-gradient(180deg, #09090b 0%, #0d0d10 48%, #080809 100%)',
          padding: 'max(24px, env(safe-area-inset-top, 24px)) 20px max(28px, calc(env(safe-area-inset-bottom, 20px) + 24px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 15% 20%, rgba(212,175,55,0.08) 0%, transparent 30%), radial-gradient(circle at 80% 72%, rgba(212,175,55,0.06) 0%, transparent 28%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: 440,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 28,
              border: '1px solid rgba(212,175,55,0.14)',
              background: 'linear-gradient(180deg, rgba(22,19,14,0.94) 0%, rgba(12,12,14,0.96) 38%, rgba(10,10,12,0.98) 100%)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.42)',
              padding: 28,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -90,
                right: -40,
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 35%, transparent 72%)',
                pointerEvents: 'none',
              }}
            />
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.35, 0.62, 0.35], scale: [1, 1.06, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -1,
                borderRadius: 28,
                border: '1px solid rgba(212,175,55,0.10)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.45 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(212,175,55,0.86)',
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Личный вход
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.42)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Academic Saloon
                  </div>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(212,175,55,0.12)',
                    color: 'rgba(212,175,55,0.88)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                    <LockKeyhole size={14} strokeWidth={1.8} />
                    {previewMode ? 'Предпросмотр первого входа' : 'Обязательный акцепт'}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.45 }}
                style={{ marginBottom: 24 }}
              >
                <div
                  style={{
                    fontSize: 18,
                    color: 'rgba(212,175,55,0.88)',
                    marginBottom: 10,
                    fontWeight: 600,
                  }}
                >
                  Добро пожаловать, {firstName}
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 46,
                    lineHeight: 0.95,
                    letterSpacing: '-0.05em',
                    color: 'var(--text-primary)',
                    marginBottom: 16,
                  }}
                >
                  Вход в салон
                </h1>
                <div
                  style={{
                    width: 92,
                    height: 2,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, rgba(212,175,55,0.95), rgba(212,175,55,0.08))',
                    marginBottom: 18,
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.70)',
                    maxWidth: 340,
                  }}
                >
                  Перед первым входом откроем короткое приветствие и публичную оферту.
                  После акцепта станут доступны заказы, чат, оплата и файлы.
                </p>
                {previewMode && (
                  <p
                    style={{
                      margin: '12px 0 0',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'rgba(212,175,55,0.72)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Это админский просмотр сценария нового клиента. Реальный акцепт в аккаунт не записывается.
                  </p>
                )}
              </motion.div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {featureCards.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + index * 0.06, duration: 0.4 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '46px 1fr',
                        gap: 12,
                        padding: 14,
                        borderRadius: 18,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          background: 'linear-gradient(180deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06))',
                          border: '1px solid rgba(212,175,55,0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} strokeWidth={1.8} color="rgba(212,175,55,0.92)" />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 4,
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: 'rgba(255,255,255,0.58)',
                          }}
                        >
                          {item.text}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: '14px 16px',
                    borderRadius: 16,
                    background: 'rgba(127,29,29,0.22)',
                    border: '1px solid rgba(248,113,113,0.22)',
                    color: '#fecaca',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <motion.button
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.45 }}
                whileTap={{ scale: 0.985 }}
                onClick={openOffer}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  borderRadius: 18,
                  border: 'none',
                  background: 'linear-gradient(180deg, rgba(252,246,186,0.96) 0%, rgba(212,175,55,1) 100%)',
                  color: '#17130b',
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 18px 50px rgba(212,175,55,0.18)',
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                <ScrollText size={18} strokeWidth={2} />
                Ознакомиться с офертой
                <ArrowRight size={18} strokeWidth={2.2} />
              </motion.button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.44)',
                    lineHeight: 1.5,
                  }}
                >
                  Это обязательный шаг перед первым входом в приложение.
                </div>

                <button
                  type="button"
                  onClick={handleOpenExternalOffer}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Полный текст
                  <ExternalLink size={14} strokeWidth={1.9} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <OfferModal
        isOpen={showOffer}
        onClose={() => setShowOffer(false)}
        onAccept={handleAccept}
        dismissible={false}
        accepting={accepting}
      />
    </>
  )
}
