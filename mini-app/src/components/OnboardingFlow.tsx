import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronRight, ExternalLink, FileCheck, RefreshCcw, Shield } from 'lucide-react'
import { acceptTerms, fetchConfig } from '../api/userApi'
import { glassGoldStyle } from './home/shared'
import { EASE_PREMIUM, TIMING, TAP_SCALE, haptic } from '../utils/animation'
import { useReducedMotion } from '../hooks/useDeviceCapability'

/* ─── Types ─── */

interface OnboardingFlowProps {
  user: { first_name?: string; has_accepted_terms?: boolean } | null
  onAccepted: () => void
  previewMode?: boolean
}

type Phase = 'reveal' | 'value' | 'offer' | 'exit'

/* ─── Haptics ─── */

function hapticNotification(type: 'success' | 'error') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type)
  } catch { /* ignore */ }
}

function openExternalUrl(url: string) {
  try {
    const tg = window.Telegram?.WebApp as { openLink?: (href: string) => void } | undefined
    if (tg?.openLink) { tg.openLink(url); return }
  } catch { /* fallback */ }
  window.open(url, '_blank', 'noopener,noreferrer')
}

/* ─── Constants ─── */

const LIQUID_GOLD = 'linear-gradient(135deg, #f0d060 0%, #d4af37 40%, #c9a227 60%, #f0d060 100%)'
const LIQUID_GOLD_TEXT: React.CSSProperties = {
  background: LIQUID_GOLD,
  backgroundSize: '200% 200%',
  animation: 'liquid-gold-shift 3s ease infinite',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const FONT_DISPLAY = "var(--font-display, 'Playfair Display', serif)"
const FONT_BODY = "var(--font-body, 'Manrope', sans-serif)"

const SAFE_PAD = 'max(24px, env(safe-area-inset-top, 24px))'
const SAFE_PAD_BOTTOM = 'max(28px, calc(env(safe-area-inset-bottom, 20px) + 24px))'
const SAFE_PAD_X = 'max(20px, env(safe-area-inset-left, 20px))'

const VALUE_CARDS = [
  { icon: FileCheck, title: 'Только оригинал', badge: '80%+ уникальность' },
  { icon: RefreshCcw, title: 'Правки включены', badge: '∞ итераций' },
  { icon: Shield, title: 'Полная защита', badge: '100% возврат' },
] as const

const STAT_BLOCKS = [
  { value: '100%', label: 'возврат' },
  { value: '∞', label: 'правок' },
  { value: '24ч', label: 'поддержка' },
] as const

const EASE = EASE_PREMIUM as unknown as number[]

/* ─── Keyframes style tag ─── */

const keyframeStyle = `
@keyframes liquid-gold-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes shimmer-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`

/* ─── Transition variants ─── */

const phaseTransitions = {
  revealExit: { y: -30, scale: 0.95, opacity: 0 },
  valueEnter: { y: 20, opacity: 0 },
  valueExit: { x: -40, opacity: 0 },
  offerEnter: { x: 40, opacity: 0 },
  visible: { x: 0, y: 0, scale: 1, opacity: 1 },
}

/* ─── Component ─── */

export const OnboardingFlow = memo(function OnboardingFlow({
  user,
  onAccepted,
  previewMode = false,
}: OnboardingFlowProps) {
  const reduced = useReducedMotion()

  /* Skip entirely if already onboarded */
  const alreadySeen = useRef(false)
  useEffect(() => {
    try {
      if (localStorage.getItem('as_onboarding_seen') && user?.has_accepted_terms) {
        alreadySeen.current = true
        onAccepted()
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [phase, setPhase] = useState<Phase>('reveal')
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offerUrl, setOfferUrl] = useState('https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30')

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  /* Cleanup all timers on unmount */
  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout) }
  }, [])

  /* Fetch config for offer URL */
  useEffect(() => {
    let alive = true
    fetchConfig().then((c) => {
      if (alive && c.offer_url) setOfferUrl(c.offer_url)
    }).catch(() => { /* keep default */ })
    return () => { alive = false }
  }, [])

  const firstName = useMemo(() => {
    const name = (user?.first_name || '').trim()
    return name || 'друг'
  }, [user?.first_name])

  /* ─── Phase auto-transitions ─── */

  useEffect(() => {
    if (reduced) {
      // Skip auto transitions for reduced motion — go straight to offer
      setPhase('offer')
      return
    }
    if (phase === 'reveal') {
      addTimer(() => haptic('light'), 500)
      addTimer(() => haptic('medium'), 1500)
      addTimer(() => setPhase('value'), 2000)
    }
    if (phase === 'value') {
      addTimer(() => haptic('light'), 400)
      addTimer(() => setPhase('offer'), 3000)
    }
  }, [phase, reduced, addTimer])

  /* ─── Handlers ─── */

  const advanceFromValue = useCallback(() => {
    if (phase === 'value') setPhase('offer')
  }, [phase])

  const handleSkip = useCallback(() => {
    haptic('light')
    if (user?.has_accepted_terms) {
      try { localStorage.setItem('as_onboarding_seen', '1') } catch { /* */ }
      onAccepted()
    } else {
      setPhase('offer')
    }
  }, [user?.has_accepted_terms, onAccepted])

  const handleAccept = useCallback(async () => {
    if (accepting) return
    haptic('medium')
    setAccepting(true)
    setError(null)

    try {
      if (!previewMode) await acceptTerms()
      hapticNotification('success')
      setPhase('exit')
      addTimer(() => {
        try { localStorage.setItem('as_onboarding_seen', '1') } catch { /* */ }
        onAccepted()
      }, 600)
    } catch (err) {
      hapticNotification('error')
      setAccepting(false)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить. Попробуйте ещё раз.')
    }
  }, [accepting, previewMode, onAccepted, addTimer])

  const handleOpenOffer = useCallback(() => {
    haptic('light')
    openExternalUrl(offerUrl)
  }, [offerUrl])

  if (alreadySeen.current) return null

  const dur = reduced ? 0 : 0.4

  /* ─── Render ─── */

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: keyframeStyle }} />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0A0A0A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${SAFE_PAD} ${SAFE_PAD_X} ${SAFE_PAD_BOTTOM}`,
          overflow: 'hidden',
          fontFamily: FONT_BODY,
        }}
      >
        {/* ─── Background gold glow ─── */}
        {phase === 'reveal' && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0 : 1.5, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* ─── Skip button ─── */}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.8, duration: 0.3 }}
          whileTap={{ scale: TAP_SCALE }}
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: `calc(${SAFE_PAD} + 4px)`,
            right: `calc(${SAFE_PAD_X} + 4px)`,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: 'rgba(255,255,255,0.50)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT_BODY,
            cursor: 'pointer',
          }}
        >
          Пропустить
          <ChevronRight size={14} strokeWidth={2} />
        </motion.button>

        {/* ─── Phase content ─── */}
        <AnimatePresence mode="wait">
          {/* ═══ PHASE: REVEAL ═══ */}
          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={phaseTransitions.revealExit}
              transition={{ duration: dur, ease: EASE }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 0,
                width: '100%',
                maxWidth: 360,
              }}
            >
              {/* Monogram box 88x88 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 24,
                  ...glassGoldStyle,
                  border: '1px solid rgba(212,175,55,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <span style={{ ...LIQUID_GOLD_TEXT, fontFamily: FONT_DISPLAY, fontSize: 32, lineHeight: 1, fontWeight: 400 }}>
                  АС
                </span>
              </motion.div>

              {/* Gold divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.3, ease: EASE }}
                style={{
                  width: 48,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.50), transparent)',
                  marginBottom: 16,
                  transformOrigin: 'center',
                }}
              />

              {/* Brand name */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.5, ease: EASE }}
                style={{
                  fontSize: 10,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.45)',
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                  marginBottom: 20,
                }}
              >
                АКАДЕМИЧЕСКИЙ САЛОН
              </motion.div>

              {/* Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.7, ease: EASE }}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 26,
                  lineHeight: 1.2,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary, #f5f5f0)',
                }}
              >
                Добро пожаловать, {firstName}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ PHASE: VALUE ═══ */}
          {phase === 'value' && (
            <motion.div
              key="value"
              initial={phaseTransitions.valueEnter}
              animate={phaseTransitions.visible}
              exit={phaseTransitions.valueExit}
              transition={{ duration: dur, ease: EASE }}
              onClick={advanceFromValue}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                width: '100%',
                maxWidth: 360,
                cursor: 'pointer',
              }}
            >
              {/* Small monogram 48x48 */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  ...glassGoldStyle,
                  border: '1px solid rgba(212,175,55,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <span style={{ ...LIQUID_GOLD_TEXT, fontFamily: FONT_DISPLAY, fontSize: 18, lineHeight: 1 }}>
                  АС
                </span>
              </div>

              {/* Badge */}
              <div style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.45)',
                fontWeight: 700,
                fontFamily: FONT_BODY,
                marginBottom: 20,
              }}>
                Академический Салон
              </div>

              {/* Headline */}
              <h2 style={{
                margin: '0 0 8px',
                fontFamily: FONT_DISPLAY,
                fontSize: 'clamp(24px, 6.5vw, 32px)',
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary, #f5f5f0)',
              }}>
                Сложные работы. Простой путь.
              </h2>

              {/* Subtitle */}
              <p style={{
                margin: '0 0 28px',
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.5,
                color: 'var(--text-secondary, rgba(176,176,176,1))',
                fontFamily: FONT_BODY,
                maxWidth: 310,
              }}>
                Курсовые, дипломные, научные работы. Индивидуально. С гарантией результата.
              </p>

              {/* 3 value cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginBottom: 28 }}>
                {VALUE_CARDS.map((card, i) => {
                  const Icon = card.icon
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: reduced ? 0 : 0.3 + i * 0.12,
                        duration: reduced ? 0 : TIMING.entrance,
                        ease: EASE,
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 12,
                        ...glassGoldStyle,
                        position: 'relative' as const,
                        overflow: 'hidden' as const,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'linear-gradient(145deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))',
                          border: '1px solid rgba(212,175,55,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={20} strokeWidth={1.6} color="var(--gold-400, #d4af37)" />
                        </div>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--text-primary, #f5f5f0)',
                          fontFamily: FONT_BODY,
                        }}>
                          {card.title}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(212,175,55,0.65)',
                        fontFamily: FONT_BODY,
                        whiteSpace: 'nowrap',
                      }}>
                        {card.badge}
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: i === 1 ? 20 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: i === 1 ? 'var(--gold-400, #d4af37)' : 'rgba(255,255,255,0.12)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ PHASE: OFFER ═══ */}
          {phase === 'offer' && (
            <motion.div
              key="offer"
              initial={phaseTransitions.offerEnter}
              animate={phaseTransitions.visible}
              exit={{ opacity: 0 }}
              transition={{ duration: dur, ease: EASE }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                width: '100%',
                maxWidth: 360,
              }}
            >
              {/* Shield icon */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  ...glassGoldStyle,
                  border: '1px solid rgba(212,175,55,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Shield size={24} strokeWidth={1.6} color="var(--gold-400, #d4af37)" />
              </motion.div>

              {/* Title */}
              <h2 style={{
                margin: '0 0 4px',
                fontFamily: FONT_BODY,
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary, #f5f5f0)',
                lineHeight: 1.3,
              }}>
                Условия и гарантии
              </h2>

              <p style={{
                margin: '0 0 24px',
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                fontFamily: FONT_BODY,
              }}>
                Ваши права зафиксированы юридически
              </p>

              {/* 3 stat blocks */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 28,
                marginBottom: 24,
              }}>
                {STAT_BLOCKS.map((stat) => (
                  <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{
                      ...LIQUID_GOLD_TEXT,
                      fontSize: 28,
                      fontWeight: 800,
                      fontFamily: FONT_BODY,
                      lineHeight: 1.1,
                    }}>
                      {stat.value}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.40)',
                      fontFamily: FONT_BODY,
                      marginTop: 4,
                    }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Offer link */}
              <motion.button
                type="button"
                whileTap={{ scale: TAP_SCALE }}
                onClick={handleOpenOffer}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  color: 'rgba(212,175,55,0.45)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  marginBottom: 32,
                }}
              >
                Полный текст оферты
                <ExternalLink size={12} strokeWidth={1.8} />
              </motion.button>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'rgba(127,29,29,0.18)',
                      border: '1px solid rgba(248,113,113,0.18)',
                      color: '#fecaca',
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: FONT_BODY,
                      overflow: 'hidden',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sticky CTA area */}
              <div style={{
                width: '100%',
                paddingTop: 8,
                background: 'linear-gradient(to bottom, transparent 0%, #0A0A0A 20%)',
              }}>
                {/* Legal note */}
                <p style={{
                  margin: '0 0 12px',
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: FONT_BODY,
                }}>
                  Нажимая, вы принимаете публичную оферту (ст. 438 ГК РФ)
                </p>

                {/* Accept button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: accepting ? 1 : TAP_SCALE }}
                  onClick={handleAccept}
                  disabled={accepting}
                  style={{
                    width: '100%',
                    padding: '18px 28px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #D4AF37 50%, #B38728 75%, #FBF5B7 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'liquid-gold-shift 4s ease-in-out infinite',
                    color: '#050505',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: FONT_BODY,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    boxShadow: '0 0 30px -5px rgba(212,175,55,0.5), 0 10px 30px -10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.1)',
                    cursor: accepting ? 'default' : 'pointer',
                    opacity: accepting ? 0.7 : 1,
                    transition: 'opacity 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer overlay */}
                  {!accepting && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                        animation: 'shimmer-sweep 2.5s ease-in-out infinite',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {accepting ? 'Открываем кабинет...' : 'Принять и войти'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ PHASE: EXIT ═══ */}
          {phase === 'exit' && (
            <motion.div
              key="exit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10,
                background: '#0A0A0A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 28,
              }}
            >
              <div style={{ width: '100%', maxWidth: 280, textAlign: 'center' }}>
                {/* Checkmark icon with spring bounce */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  style={{
                    width: 72,
                    height: 72,
                    margin: '0 auto 20px',
                    borderRadius: 20,
                    ...glassGoldStyle,
                    border: '1px solid rgba(212,175,55,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={30} strokeWidth={1.6} color="var(--gold-400, #d4af37)" />
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.1, ease: EASE }}
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 24,
                    lineHeight: 1.2,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-primary, #f5f5f0)',
                    marginBottom: 20,
                  }}
                >
                  Ваш кабинет готов
                </motion.div>

                {/* Thin progress bar */}
                <div style={{
                  height: 2,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, rgba(212,175,55,0.40), var(--gold-400, #d4af37))',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
})
