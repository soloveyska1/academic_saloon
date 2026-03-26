import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ExternalLink, FileCheck, RefreshCcw, Shield } from 'lucide-react'
import {
  acceptTerms,
  DEFAULT_OFFER_URL,
  fetchConfig,
  DEFAULT_EXECUTOR_INFO_URL,
  DEFAULT_PRIVACY_POLICY_URL,
} from '../api/userApi'
import { OfferModal } from './modals/OfferModal'
import { glassGoldStyle } from './home/shared'
import { EASE_PREMIUM, TIMING, TAP_SCALE, haptic } from '../utils/animation'
import type { UserData } from '../types'

/* ─── Types ─── */

interface WelcomeOfferGateProps {
  user: UserData
  onAccepted: () => Promise<unknown> | unknown
  previewMode?: boolean
}

/* ─── Haptics ─── */

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

/* ─── Value cards ─── */

const valueCards = [
  {
    icon: FileCheck,
    title: 'Работа с нуля',
    text: 'Уникальность от 80%',
  },
  {
    icon: RefreshCcw,
    title: 'Правки без ограничений',
    text: 'До полного соответствия',
  },
  {
    icon: Shield,
    title: 'Возврат до старта',
    text: 'Полная конфиденциальность',
  },
]

/* ─── Animation presets ─── */

const stagger = {
  container: {
    animate: { transition: { staggerChildren: TIMING.stagger } },
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: TIMING.entrance, ease: EASE_PREMIUM as unknown as number[] },
    },
  },
}

/* ─── Component ─── */

export function WelcomeOfferGate({ user, onAccepted, previewMode = false }: WelcomeOfferGateProps) {
  const [showOffer, setShowOffer] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offerUrl, setOfferUrl] = useState<string>(DEFAULT_OFFER_URL)
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState<string>(DEFAULT_PRIVACY_POLICY_URL)
  const [executorInfoUrl, setExecutorInfoUrl] = useState<string>(DEFAULT_EXECUTOR_INFO_URL)

  useEffect(() => {
    let alive = true

    fetchConfig()
      .then((config) => {
        if (!alive) return
        if (config.offer_url) setOfferUrl(config.offer_url)
        if (config.privacy_policy_url) setPrivacyPolicyUrl(config.privacy_policy_url)
        if (config.executor_info_url) setExecutorInfoUrl(config.executor_info_url)
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

  const monogram = useMemo(() => {
    const trimmed = (user.fullname || '').trim()
    if (!trimmed) return 'A'
    return trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'A'
  }, [user.fullname])

  const openOffer = useCallback(() => {
    if (unlocking) return
    haptic('light')
    setError(null)
    setShowOffer(true)
  }, [unlocking])

  const handleAccept = useCallback(async () => {
    if (accepting) return

    setAccepting(true)
    setError(null)

    try {
      if (!previewMode) {
        await acceptTerms()
      }
      setShowOffer(false)
      setUnlocking(true)
      await new Promise((resolve) => setTimeout(resolve, 400))
      await onAccepted()
      triggerNotificationHaptic('success')
    } catch (err) {
      triggerNotificationHaptic('error')
      setShowOffer(false)
      setAccepting(false)
      setUnlocking(false)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить принятие оферты. Попробуйте ещё раз.')
    }
  }, [accepting, onAccepted, previewMode])

  const handleOpenExternalOffer = useCallback(() => {
    haptic('light')
    openExternalUrl(offerUrl)
  }, [offerUrl])

  const handleOpenPrivacyPolicy = useCallback(() => {
    haptic('light')
    openExternalUrl(privacyPolicyUrl)
  }, [privacyPolicyUrl])

  const handleOpenExecutorInfo = useCallback(() => {
    haptic('light')
    openExternalUrl(executorInfoUrl)
  }, [executorInfoUrl])

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-void, #07070a)',
          padding: 'max(24px, env(safe-area-inset-top, 24px)) 20px max(28px, calc(env(safe-area-inset-bottom, 20px) + 24px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Subtle radial gold glow at top */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: TIMING.entrance, ease: EASE_PREMIUM as unknown as number[] }}
          style={{
            width: '100%',
            maxWidth: 400,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {/* ─── Top area: monogram + greeting ─── */}
            <motion.div
              variants={stagger.item}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginBottom: 28,
              }}
            >
              {/* Monogram */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  ...glassGoldStyle,
                  border: '1px solid rgba(212,175,55,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 26,
                    lineHeight: 1,
                    color: 'var(--gold-400, #d4af37)',
                  }}
                >
                  {monogram}
                </span>
              </div>

              {/* Badge */}
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.60)',
                  fontWeight: 700,
                  fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                  marginBottom: 8,
                }}
              >
                Академический Салон
              </div>

              {/* Greeting */}
              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 28,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary, #f5f5f0)',
                }}
              >
                Добро пожаловать, {firstName}
              </div>
            </motion.div>

            {/* ─── Value proposition ─── */}
            <motion.div
              variants={stagger.item}
              style={{
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              <h1
                style={{
                  margin: '0 0 10px',
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 22,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary, #f5f5f0)',
                  fontWeight: 400,
                }}
              >
                Ваш академический ассистент
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                  maxWidth: 320,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                Курсовые, дипломные и учебные материалы — от запроса до готового результата.
                Каждый проект ведётся индивидуально.
              </p>
            </motion.div>

            {/* ─── 3 compact value cards ─── */}
            <motion.div
              variants={stagger.item}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 28,
              }}
            >
              {valueCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.2 + index * TIMING.stagger,
                      duration: TIMING.entrance,
                      ease: EASE_PREMIUM as unknown as number[],
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      borderRadius: 16,
                      ...glassGoldStyle,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'linear-gradient(145deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))',
                        border: '1px solid rgba(212,175,55,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} strokeWidth={1.6} color="var(--gold-400, #d4af37)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text-primary, #f5f5f0)',
                          fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                          marginBottom: 2,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'rgba(255,255,255,0.45)',
                          fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                        }}
                      >
                        {card.text}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* ─── Error ─── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: EASE_PREMIUM as unknown as number[] }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: 'rgba(127,29,29,0.18)',
                    border: '1px solid rgba(248,113,113,0.18)',
                    color: '#fecaca',
                    fontSize: 13,
                    lineHeight: 1.5,
                    fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                    overflow: 'hidden',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── CTA ─── */}
            <motion.div variants={stagger.item}>
              <motion.button
                type="button"
                whileTap={{ scale: TAP_SCALE }}
                onClick={openOffer}
                disabled={unlocking}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(180deg, var(--liquid-gold, #f0d060) 0%, var(--gold-metallic, #c9a227) 100%)',
                  color: '#17130b',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 12px 36px rgba(212,175,55,0.16)',
                  cursor: unlocking ? 'default' : 'pointer',
                  opacity: unlocking ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Продолжить
                <ArrowRight size={16} strokeWidth={2.2} />
              </motion.button>

              {/* Subtle note */}
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 14,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                }}
              >
                Для начала работы потребуется принять условия сервиса
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  marginTop: 10,
                }}
              >
                {[
                  { label: 'Полный текст оферты', onClick: handleOpenExternalOffer },
                  { label: 'Политика ПД', onClick: handleOpenPrivacyPolicy },
                  { label: 'Исполнитель', onClick: handleOpenExecutorInfo },
                ].map((link) => (
                  <motion.button
                    key={link.label}
                    type="button"
                    whileTap={{ scale: TAP_SCALE }}
                    onClick={link.onClick}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      color: 'rgba(212,175,55,0.50)',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                      cursor: 'pointer',
                    }}
                  >
                    {link.label}
                    <ExternalLink size={12} strokeWidth={1.8} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Unlock animation overlay ─── */}
          <AnimatePresence>
            {unlocking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 50,
                  background: 'var(--bg-void, #07070a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 28,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: EASE_PREMIUM as unknown as number[] }}
                  style={{
                    width: '100%',
                    maxWidth: 280,
                    textAlign: 'center',
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.04, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 72,
                      height: 72,
                      margin: '0 auto 20px',
                      borderRadius: 20,
                      ...glassGoldStyle,
                      border: '1px solid rgba(212,175,55,0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={30} strokeWidth={1.6} color="var(--gold-400, #d4af37)" />
                  </motion.div>

                  <div
                    style={{
                      fontFamily: "var(--font-display, 'Playfair Display', serif)",
                      fontSize: 26,
                      lineHeight: 1.1,
                      letterSpacing: '-0.03em',
                      color: 'var(--text-primary, #f5f5f0)',
                      marginBottom: 8,
                    }}
                  >
                    Салон открывается
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: "var(--font-body, 'Manrope', sans-serif)",
                      marginBottom: 20,
                    }}
                  >
                    Подготавливаем ваш кабинет...
                  </div>

                  {/* Progress bar: 0 -> 100% in 400ms */}
                  <div
                    style={{
                      height: 2,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(212,175,55,0.40), var(--gold-400, #d4af37))',
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
