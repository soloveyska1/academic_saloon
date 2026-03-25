import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
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

function triggerImpactHaptic(style: 'light' | 'medium' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style)
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

const introSignals = ['Чат с менеджером', 'Статусы без задержек', 'Файлы в одном окне']

const introPanels = [
  {
    icon: MessageCircle,
    eyebrow: 'Персональное сопровождение',
    title: 'Весь заказ живёт в одном диалоге',
    text: 'Вопросы, материалы, комментарии и сдача не распадаются между разными каналами.',
  },
  {
    icon: Clock3,
    eyebrow: 'Контроль сроков',
    title: 'Срок, этапы и оплата видны сразу',
    text: 'Клиент видит следующий шаг, подтверждения и ключевые статусы без переписки вслепую.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Защита клиента',
    title: 'Условия фиксируются до старта',
    text: 'Оферта, гарантии и порядок правок подтверждаются заранее, до открытия функционала.',
  },
]

const termsCards = [
  {
    icon: ShieldCheck,
    title: 'Гарантии',
    text: 'Сроки, этапы, правки и порядок сдачи зафиксированы до начала работы.',
  },
  {
    icon: Sparkles,
    title: 'Прозрачная оплата',
    text: 'Сумма, аванс, доплата и бонусы видны до подтверждения заказа.',
  },
  {
    icon: LockKeyhole,
    title: 'Доступ',
    text: 'После акцепта откроются кабинет, чат, статусы, файлы и приватные функции.',
  },
]

const stageLabels = [
  { id: 1, title: 'Приветствие', subtitle: 'Короткий входной экран' },
  { id: 2, title: 'Оферта', subtitle: 'Ознакомление и акцепт' },
  { id: 3, title: 'Доступ', subtitle: 'Кабинет и рабочие функции' },
]

const sceneTransition = { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const }

export function WelcomeOfferGate({ user, onAccepted, previewMode = false }: WelcomeOfferGateProps) {
  const [showOffer, setShowOffer] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offerUrl, setOfferUrl] = useState<string>('https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-03-25')
  const [hasSeenIntro, setHasSeenIntro] = useState(false)
  const [activeIntro, setActiveIntro] = useState(0)

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

  useEffect(() => {
    if (hasSeenIntro || showOffer || unlocking) return

    const intervalId = window.setInterval(() => {
      setActiveIntro((prev) => (prev + 1) % introPanels.length)
    }, 2600)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasSeenIntro, showOffer, unlocking])

  const firstName = useMemo(() => {
    const trimmed = (user.fullname || '').trim()
    return trimmed ? trimmed.split(/\s+/)[0] : 'друг'
  }, [user.fullname])

  const monogram = useMemo(() => {
    const trimmed = (user.fullname || '').trim()
    if (!trimmed) return 'A'
    return (
      trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2) || 'A'
    )
  }, [user.fullname])

  const currentStep = useMemo(() => {
    if (unlocking || accepting) return 3
    if (hasSeenIntro || showOffer) return 2
    return 1
  }, [accepting, hasSeenIntro, showOffer, unlocking])

  const activePanel = introPanels[activeIntro]

  const proceedToTerms = useCallback(() => {
    if (unlocking) return
    triggerImpactHaptic('light')
    setError(null)
    setHasSeenIntro(true)
  }, [unlocking])

  const openOffer = useCallback(() => {
    if (unlocking) return
    triggerImpactHaptic('light')
    setError(null)
    setHasSeenIntro(true)
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
      await new Promise((resolve) => setTimeout(resolve, 950))
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
    triggerImpactHaptic('light')
    openExternalUrl(offerUrl)
  }, [offerUrl])

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top, rgba(212,175,55,0.14) 0%, transparent 34%), linear-gradient(180deg, #080809 0%, #0d0d10 48%, #070708 100%)',
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
            background:
              'radial-gradient(circle at 16% 18%, rgba(212,175,55,0.08) 0%, transparent 28%), radial-gradient(circle at 82% 72%, rgba(212,175,55,0.08) 0%, transparent 26%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: 448,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 30,
              border: '1px solid rgba(212,175,55,0.14)',
              background:
                'linear-gradient(180deg, rgba(20,18,14,0.96) 0%, rgba(10,10,12,0.98) 40%, rgba(8,8,9,0.98) 100%)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.42)',
              padding: 28,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -100,
                right: -80,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 34%, transparent 74%)',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -110,
                left: -80,
                width: 240,
                height: 240,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 35%, transparent 72%)',
                pointerEvents: 'none',
              }}
            />
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.35, 0.62, 0.35], scale: [1, 1.04, 1] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: -1,
                borderRadius: 30,
                border: '1px solid rgba(212,175,55,0.10)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(212,175,55,0.86)',
                    fontWeight: 700,
                  }}
                >
                  Первый вход
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  <LockKeyhole size={14} strokeWidth={1.8} />
                  Личный доступ
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                {stageLabels.map((stage) => {
                  const isActive = currentStep === stage.id
                  const isCompleted = currentStep > stage.id
                  return (
                    <div
                      key={stage.id}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 18,
                        background: isActive
                          ? 'linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))'
                          : 'rgba(255,255,255,0.03)',
                        border: isActive
                          ? '1px solid rgba(212,175,55,0.22)'
                          : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isActive ? '0 12px 26px rgba(212,175,55,0.08)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCompleted
                            ? 'linear-gradient(180deg, rgba(252,246,186,0.96), rgba(212,175,55,1))'
                            : isActive
                              ? 'rgba(212,175,55,0.16)'
                              : 'rgba(255,255,255,0.06)',
                          color: isCompleted ? '#16120c' : isActive ? 'rgba(252,246,186,0.95)' : 'rgba(255,255,255,0.55)',
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={14} strokeWidth={2.2} /> : stage.id}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: isActive ? 'var(--text-primary)' : 'rgba(255,255,255,0.76)',
                          marginBottom: 4,
                        }}
                      >
                        {stage.title}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          lineHeight: 1.4,
                          color: 'rgba(255,255,255,0.44)',
                        }}
                      >
                        {stage.subtitle}
                      </div>
                    </div>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {!hasSeenIntro ? (
                  <motion.div
                    key="intro-scene"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={sceneTransition}
                  >
                    <div style={{ textAlign: 'center', marginBottom: 22 }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 136,
                          height: 136,
                          margin: '0 auto 22px',
                        }}
                      >
                        <motion.div
                          aria-hidden="true"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '1px solid rgba(212,175,55,0.18)',
                            borderStyle: 'solid',
                            opacity: 0.7,
                          }}
                        />
                        <motion.div
                          aria-hidden="true"
                          animate={{ rotate: -360 }}
                          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                          style={{
                            position: 'absolute',
                            inset: 10,
                            borderRadius: '50%',
                            border: '1px dashed rgba(212,175,55,0.16)',
                            opacity: 0.7,
                          }}
                        />
                        <motion.div
                          animate={{
                            boxShadow: [
                              '0 16px 46px rgba(212,175,55,0.10)',
                              '0 20px 60px rgba(212,175,55,0.18)',
                              '0 16px 46px rgba(212,175,55,0.10)',
                            ],
                            scale: [1, 1.03, 1],
                          }}
                          transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute',
                            inset: 22,
                            borderRadius: '50%',
                            background:
                              'radial-gradient(circle at 30% 30%, rgba(252,246,186,0.24), rgba(212,175,55,0.08) 42%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(212,175,55,0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-display, 'Playfair Display', serif)",
                              fontSize: 40,
                              lineHeight: 1,
                              color: 'var(--text-primary)',
                              textShadow: '0 10px 28px rgba(0,0,0,0.32)',
                            }}
                          >
                            {monogram}
                          </span>
                        </motion.div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'rgba(212,175,55,0.78)',
                          fontWeight: 700,
                          marginBottom: 10,
                        }}
                      >
                        Добро пожаловать
                      </div>
                      <h1
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-display, 'Playfair Display', serif)",
                          fontSize: 56,
                          lineHeight: 0.92,
                          letterSpacing: '-0.06em',
                          color: 'var(--text-primary)',
                          marginBottom: 12,
                        }}
                      >
                        {firstName}
                      </h1>
                      <div
                        style={{
                          width: 92,
                          height: 2,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, rgba(212,175,55,0.1), rgba(212,175,55,0.95), rgba(212,175,55,0.1))',
                          margin: '0 auto 16px',
                        }}
                      />
                      <p
                        style={{
                          margin: '0 auto',
                          maxWidth: 360,
                          fontSize: 16,
                          lineHeight: 1.65,
                          color: 'rgba(255,255,255,0.70)',
                        }}
                      >
                        Внутри салона откроются личный кабинет, рабочий чат, прозрачные статусы и все материалы по заказу.
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 10,
                        marginBottom: 18,
                      }}
                    >
                      {introSignals.map((signal, index) => (
                        <motion.div
                          key={signal}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 + index * 0.06, duration: 0.35 }}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textAlign: 'center',
                            fontSize: 11.5,
                            lineHeight: 1.4,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.82)',
                          }}
                        >
                          {signal}
                        </motion.div>
                      ))}
                    </div>

                    <div
                      style={{
                        padding: 20,
                        borderRadius: 24,
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                        border: '1px solid rgba(212,175,55,0.10)',
                        marginBottom: 18,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'radial-gradient(circle at top right, rgba(212,175,55,0.08) 0%, transparent 34%)',
                          pointerEvents: 'none',
                        }}
                      />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeIntro}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          style={{ position: 'relative', zIndex: 1 }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '9px 12px',
                              borderRadius: 999,
                              background: 'rgba(212,175,55,0.12)',
                              border: '1px solid rgba(212,175,55,0.14)',
                              color: 'rgba(252,246,186,0.94)',
                              fontSize: 12,
                              fontWeight: 700,
                              marginBottom: 14,
                            }}
                          >
                            <activePanel.icon size={14} strokeWidth={1.9} />
                            {activePanel.eyebrow}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-display, 'Playfair Display', serif)",
                              fontSize: 34,
                              lineHeight: 0.98,
                              letterSpacing: '-0.05em',
                              color: 'var(--text-primary)',
                              marginBottom: 12,
                            }}
                          >
                            {activePanel.title}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              lineHeight: 1.65,
                              color: 'rgba(255,255,255,0.62)',
                            }}
                          >
                            {activePanel.text}
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginTop: 18,
                        }}
                      >
                        {introPanels.map((panel, index) => (
                          <button
                            key={panel.title}
                            type="button"
                            onClick={() => {
                              triggerImpactHaptic('light')
                              setActiveIntro(index)
                            }}
                            aria-label={`Показать блок ${panel.title}`}
                            style={{
                              width: index === activeIntro ? 28 : 10,
                              height: 10,
                              borderRadius: 999,
                              border: 'none',
                              background:
                                index === activeIntro
                                  ? 'linear-gradient(90deg, rgba(212,175,55,0.64), rgba(252,246,186,0.96))'
                                  : 'rgba(255,255,255,0.10)',
                              transition: 'width 0.24s ease, background 0.24s ease',
                              padding: 0,
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
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
                      transition={{ delay: 0.18, duration: 0.45 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={proceedToTerms}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        borderRadius: 18,
                        border: 'none',
                        background:
                          'linear-gradient(180deg, rgba(252,246,186,0.96) 0%, rgba(212,175,55,1) 100%)',
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
                      Продолжить
                      <ArrowRight size={18} strokeWidth={2.2} />
                    </motion.button>

                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: 'rgba(255,255,255,0.46)',
                      }}
                    >
                      Дальше покажем условия сервиса и откроем доступ после акцепта.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="terms-scene"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={sceneTransition}
                  >
                    <div style={{ marginBottom: 24 }}>
                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'rgba(212,175,55,0.78)',
                          fontWeight: 700,
                          marginBottom: 10,
                        }}
                      >
                        Оферта
                      </div>
                      <h1
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-display, 'Playfair Display', serif)",
                          fontSize: 44,
                          lineHeight: 0.94,
                          letterSpacing: '-0.06em',
                          color: 'var(--text-primary)',
                          marginBottom: 14,
                        }}
                      >
                        Зафиксируем условия перед входом
                      </h1>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15.5,
                          lineHeight: 1.68,
                          color: 'rgba(255,255,255,0.68)',
                        }}
                      >
                        Один обязательный шаг перед открытием приложения. Внутри оферты закреплены гарантии,
                        порядок оплаты, правок и доступа к материалам.
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 12,
                        marginBottom: 22,
                      }}
                    >
                      {termsCards.map((item, index) => {
                        const Icon = item.icon
                        return (
                          <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 + index * 0.06, duration: 0.36 }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '46px 1fr',
                              gap: 12,
                              padding: 14,
                              borderRadius: 18,
                              background:
                                'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <div
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                background:
                                  'linear-gradient(180deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06))',
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
                      transition={{ delay: 0.22, duration: 0.45 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={openOffer}
                      disabled={unlocking}
                      style={{
                        width: '100%',
                        padding: '18px 20px',
                        borderRadius: 18,
                        border: 'none',
                        background:
                          'linear-gradient(180deg, rgba(252,246,186,0.96) 0%, rgba(212,175,55,1) 100%)',
                        color: '#17130b',
                        fontSize: 16,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        boxShadow: '0 18px 50px rgba(212,175,55,0.18)',
                        cursor: unlocking ? 'default' : 'pointer',
                        opacity: unlocking ? 0.7 : 1,
                        marginBottom: 12,
                      }}
                    >
                      <ScrollText size={18} strokeWidth={2} />
                      Открыть оферту
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
                          maxWidth: 230,
                        }}
                      >
                        Без акцепта доступ к заказам, чату, оплате и файлам не открывается.
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {unlocking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 4,
                    background: 'linear-gradient(180deg, rgba(12,12,14,0.72) 0%, rgba(9,9,11,0.92) 100%)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 28,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      textAlign: 'center',
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0.88, opacity: 0.7 }}
                      animate={{ scale: [0.96, 1.04, 0.98], opacity: 1 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        width: 92,
                        height: 92,
                        margin: '0 auto 18px',
                        borderRadius: 28,
                        background:
                          'linear-gradient(180deg, rgba(252,246,186,0.18), rgba(212,175,55,0.08))',
                        border: '1px solid rgba(212,175,55,0.22)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 22px 50px rgba(212,175,55,0.10)',
                      }}
                    >
                      <CheckCircle2 size={38} strokeWidth={1.9} color="rgba(252,246,186,0.95)" />
                    </motion.div>

                    <div
                      style={{
                        fontFamily: "var(--font-display, 'Playfair Display', serif)",
                        fontSize: 36,
                        lineHeight: 0.96,
                        letterSpacing: '-0.05em',
                        color: 'var(--text-primary)',
                        marginBottom: 12,
                      }}
                    >
                      Доступ открывается
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.62)',
                        marginBottom: 16,
                      }}
                    >
                      Акцепт зафиксирован. Подготавливаем кабинет, чат, статусы и рабочие инструменты.
                    </div>
                    <div
                      style={{
                        height: 3,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.95, ease: 'easeInOut' }}
                        style={{
                          height: '100%',
                          borderRadius: 999,
                          background:
                            'linear-gradient(90deg, rgba(212,175,55,0.52), rgba(252,246,186,0.96))',
                        }}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
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
