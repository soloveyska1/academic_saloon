import { useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Check, Timer, MessageSquare, Shield,
  CheckCircle, RefreshCw, Clock, Sparkles, FileText,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, ICON_BOX, TAP_SCALE, CARD_PADDING, CARD_PADDING_PREMIUM } from './design-tokens'
import { PremiumPriceTag } from './PremiumPriceTag'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v13 «Premium Catalog + Trust Features»

   v13 additions:
   - Guarantee badges per service type (trust builders)
   - First-order welcome banner with promo hint
   - Draft recovery card at top (continue where you left off)
   ═══════════════════════════════════════════════════════════════════════════ */

interface DraftInfo {
  serviceTypeId: string
  serviceLabel: string
  timeAgo: string
}

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onUrgentRequest?: (serviceId?: string) => void
  isFirstOrder?: boolean
  draftInfo?: DraftInfo | null
  onContinueDraft?: (serviceTypeId: string) => void
}

/* ── Guarantee badges per service ────────────────────────────────────── */

interface GuaranteeBadge {
  icon: typeof Shield
  text: string
}

const SERVICE_GUARANTEES: Record<string, GuaranteeBadge[]> = {
  diploma: [
    { icon: Shield, text: 'Антиплагиат от 70%' },
    { icon: RefreshCw, text: 'Безлимитные правки' },
    { icon: CheckCircle, text: 'Сопровождение до защиты' },
  ],
  masters: [
    { icon: Shield, text: 'Антиплагиат от 70%' },
    { icon: CheckCircle, text: 'Научная новизна' },
    { icon: RefreshCw, text: 'Безлимитные правки' },
  ],
  coursework: [
    { icon: Shield, text: 'Антиплагиат от 60%' },
    { icon: RefreshCw, text: 'Безлимитные правки' },
    { icon: CheckCircle, text: 'По методичке ВУЗа' },
  ],
  practice: [
    { icon: CheckCircle, text: 'Дневник + отчёт' },
    { icon: RefreshCw, text: 'Безлимитные правки' },
  ],
  presentation: [
    { icon: Sparkles, text: 'Дизайн + речь' },
    { icon: RefreshCw, text: 'Безлимитные правки' },
  ],
  essay: [
    { icon: Shield, text: 'Без воды' },
    { icon: Clock, text: 'Можно за 1 день' },
  ],
  report: [
    { icon: Shield, text: 'По ГОСТу' },
    { icon: CheckCircle, text: 'Реальные источники' },
  ],
  control: [
    { icon: FileText, text: 'Ход решения' },
    { icon: Clock, text: 'Можно за 1 день' },
  ],
  independent: [
    { icon: FileText, text: 'По методичке' },
    { icon: Clock, text: 'Можно за 1 день' },
  ],
}

const CUSTOM_FLOW_IDS = new Set(['photo_task', 'other'])

// All standard/premium services in display order (premium first)
const CATALOG: ServiceType[] = SERVICE_TYPES.filter(s => !CUSTOM_FLOW_IDS.has(s.id))
const CUSTOM_SERVICES: ServiceType[] = SERVICE_TYPES.filter(s => CUSTOM_FLOW_IDS.has(s.id))

// ─── Haptic ──────────────────────────────────────────────────────────

function triggerHaptic(type: 'light' | 'medium' | 'selection' = 'light') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram
    const haptic = tg?.WebApp?.HapticFeedback
    if (!haptic) return
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (type === 'selection' && isIOS && haptic.selectionChanged) {
      haptic.selectionChanged()
    } else {
      haptic.impactOccurred?.(type)
    }
  } catch { /* noop */ }
}

/* Choreographed selection: haptic + subtle sound via Web Audio */
function playSelectFeedback() {
  // 1. Haptic: selection tick
  triggerHaptic('selection')
  // 2. After 50ms: medium impact (feels like "locking in")
  setTimeout(() => triggerHaptic('medium'), 50)

  // 3. Subtle audio chime via Web Audio API (no file needed)
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    // Premium "ding" — two quick sine tones
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.06) // E6
    gain.gain.setValueAtTime(0.03, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
    // Cleanup
    setTimeout(() => ctx.close().catch(() => {}), 200)
  } catch { /* audio optional */ }
}

/* ═════════════════════════════════════════════════════════════════════════
   ROOT
   ═════════════════════════════════════════════════════════════════════════ */

export function ServiceTypeStep({
  selected,
  onSelect,
  onUrgentRequest,
  isFirstOrder,
  draftInfo,
  onContinueDraft,
}: ServiceTypeStepProps) {
  const selectedCardRef = useRef<HTMLDivElement>(null)

  const premiumServices = useMemo(() => CATALOG.filter(s => s.category === 'premium'), [])
  const standardServices = useMemo(() => CATALOG.filter(s => s.category !== 'premium'), [])

  const handleSelect = useCallback((id: string) => {
    playSelectFeedback()
    onSelect(id)
    setTimeout(() => {
      selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [onSelect])

  const handleFastMode = useCallback((serviceId?: string) => {
    triggerHaptic()
    onUrgentRequest?.(serviceId)
  }, [onUrgentRequest])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, position: 'relative' }}>

      {/* ── Noise texture overlay (expensive paper feel) ──────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.015,
        backgroundImage: 'var(--noise-overlay)',
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        borderRadius: RADIUS.md,
      }} />

      {/* ─── Draft recovery card ───────────────────────────────── */}
      {draftInfo && onContinueDraft && !selected && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          whileTap={{ scale: TAP_SCALE.card }}
          onClick={() => { triggerHaptic(); onContinueDraft(draftInfo.serviceTypeId) }}
          style={{
            width: '100%',
            padding: `${SPACING.lg}px ${SPACING.xl}px`,
            borderRadius: RADIUS.md,
            background: 'rgba(212, 175, 55, 0.06)',
            border: '1px solid rgba(212, 175, 55, 0.18)',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: RADIUS.sm,
            background: 'rgba(212, 175, 55, 0.10)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileText size={16} color={COLORS.gold.primary} strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: FONT.size.lg,
              fontWeight: 700,
              color: 'var(--gold-400)',
              lineHeight: 1.3,
            }}>
              Продолжить: {draftInfo.serviceLabel}
            </div>
            <div style={{
              fontSize: FONT.size.xs,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}>
              Черновик · {draftInfo.timeAgo}
            </div>
          </div>
          <ArrowRight size={14} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.6 }} />
        </motion.button>
      )}

      {/* ─── First-order welcome banner ────────────────────────── */}
      {isFirstOrder && !selected && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            padding: `${SPACING.md}px ${SPACING.lg}px`,
            borderRadius: RADIUS.md,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.03))',
            border: '1px solid rgba(212, 175, 55, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Sparkles size={16} color={COLORS.gold.primary} style={{ flexShrink: 0 }} />
          <div>
            <span style={{
              fontSize: FONT.size.sm,
              fontWeight: 700,
              color: 'var(--gold-400)',
            }}>
              Первый заказ?
            </span>
            <span style={{
              fontSize: FONT.size.sm,
              color: 'var(--text-secondary)',
              marginLeft: 6,
            }}>
              Расчёт бесплатно · оплата после согласования
            </span>
          </div>
        </motion.div>
      )}

      {/* ─── Premium section label ──────────────────────────────── */}
      <div style={{
        fontSize: FONT.size['2xs'],
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'rgba(212, 175, 55, 0.45)',
        paddingLeft: 4,
        marginTop: SPACING.xs,
      }}>
        Выпускные работы
      </div>

      {/* ─── Premium services ──────────────────────────────────── */}
      {premiumServices.map((service, i) => (
        <div key={service.id} ref={selected === service.id ? selectedCardRef : undefined}>
          <PremiumServiceCard
            service={service}
            selected={selected === service.id}
            onSelect={() => handleSelect(service.id)}
            index={i}
          />
        </div>
      ))}

      {/* ─── Section divider ─────────────────────────────────── */}
      <div style={{
        height: 1,
        margin: `${SPACING.lg}px ${SPACING.xl}px`,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.06), rgba(180,190,210,0.04), transparent)',
      }} />

      {/* ─── Standard section label ─────────────────────────────── */}
      <div style={{
        fontSize: FONT.size['2xs'],
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'rgba(180, 190, 210, 0.35)',
        paddingLeft: 4,
      }}>
        Учебные задания
      </div>

      {/* ─── Standard + express services ───────────────────────── */}
      {standardServices.map((service, i) => (
        <div key={service.id} ref={selected === service.id ? selectedCardRef : undefined}>
          <ServiceCard
            service={service}
            selected={selected === service.id}
            onSelect={() => handleSelect(service.id)}
            index={premiumServices.length + 1 + i}
          />
        </div>
      ))}

      {/* ─── Section divider ─────────────────────────────────── */}
      <div style={{
        height: 1,
        margin: `${SPACING.lg}px ${SPACING.xl}px`,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.06), rgba(180,190,210,0.04), transparent)',
      }} />

      {/* ─── Custom flow cards (photo + other) ─────────────────── */}
      {onUrgentRequest && CUSTOM_SERVICES.map((service, i) => (
        <CustomFlowCard
          key={service.id}
          service={service}
          onPress={() => handleFastMode(service.id)}
          index={CATALOG.length + i}
        />
      ))}

      {/* ─── Assist prompt (bottom, inline — not a card) ───────── */}
      {onUrgentRequest && (
        <motion.button
          type="button"
          onClick={() => handleFastMode()}
          whileTap={{ scale: TAP_SCALE.card }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.md,
            padding: `${SPACING.lg}px ${SPACING.xl}px`,
            background: COLORS.assist.bg,
            border: `1px solid ${COLORS.assist.border}`,
            borderRadius: RADIUS.md,
            cursor: 'pointer',
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
        >
          <div style={{
            width: ICON_BOX.md,
            height: ICON_BOX.md,
            borderRadius: RADIUS.sm,
            background: COLORS.assist.icon,
            border: `1px solid ${COLORS.gold.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageSquare size={18} color="var(--gold-400)" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: FONT.size.lg,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
            }}>
              Нестандартная задача?
            </div>
            <div style={{
              fontSize: FONT.size.sm,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}>
              Напишите — подберём решение
            </div>
          </div>
          <ArrowRight size={14} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.5 }} />
        </motion.button>
      )}

      {/* ─── Trust footer ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: `${SPACING.xl}px ${SPACING.md}px ${SPACING.sm}px`,
        marginTop: SPACING.sm,
      }}>
        <Shield size={11} color={COLORS.gold.primary} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.4 }} />
        <span style={{
          fontSize: FONT.size['2xs'],
          color: 'var(--text-muted)',
          opacity: 0.5,
          letterSpacing: '0.03em',
          textAlign: 'center',
        }}>
          Безлимитные правки · Возврат до старта · 93% сдают с первого раза
        </span>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   PREMIUM SERVICE CARD — Visually distinct, larger, gold accent
   ═════════════════════════════════════════════════════════════════════════ */

function PremiumServiceCard({
  service,
  selected,
  onSelect,
  index,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  index: number
}) {
  const Icon = service.icon
  const { tier, canUseBlur } = useCapability()

  const entranceTransition = tier === 1
    ? { duration: 0 }
    : { delay: Math.min(index * 0.05, 0.2), type: 'spring' as const, stiffness: 280, damping: 26 }

  const backdropFilter = canUseBlur ? 'blur(24px) saturate(140%)' : 'none'

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 10 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '50px' }}
      transition={entranceTransition}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      animate={{ y: selected ? -1 : 0 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: CARD_PADDING_PREMIUM,
        borderRadius: RADIUS.lg,
        background: selected ? 'rgba(212, 175, 55, 0.06)' : COLORS.card.bgPremium,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        border: selected
          ? `1.5px solid ${COLORS.gold.borderStrong}`
          : `1.5px solid ${COLORS.card.borderPremium}`,
        boxShadow: selected
          ? [
              '0 4px 20px -4px rgba(212, 175, 55, 0.18)',
              '0 0 30px -8px rgba(212, 175, 55, 0.10)',
              'inset 0 1px 0 rgba(255, 248, 214, 0.08)',
            ].join(', ')
          : COLORS.card.insetHighlight,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'manipulation',
        userSelect: 'none',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.3s',
      }}
    >
      {/* Gold accent line at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent 10%, rgba(212, 175, 55, 0.30) 40%, rgba(255, 248, 214, 0.20) 50%, rgba(212, 175, 55, 0.30) 60%, transparent 90%)',
        }} />
      </div>

      {/* Shimmer sweep — plays once on mount */}
      <motion.div
        initial={{ x: '-100%' }}
        whileInView={{ x: '250%' }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 + index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.04), rgba(255, 248, 214, 0.03), transparent)',
          pointerEvents: 'none',
          transform: 'skewX(-15deg)',
        }}
      />

      {/* Radial glow at top-right corner — premium ambient light */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Selected: metallic conic gradient border overlay */}
      {selected && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: RADIUS.lg,
          padding: 1.5,
          background: 'conic-gradient(from 180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.25), rgba(245,230,163,0.15), rgba(212,175,55,0.08))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude' as const,
          pointerEvents: 'none',
        }} />
      )}

      {/* Selected: gold left accent bar */}
      {selected && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'linear-gradient(180deg, rgba(212,175,55,0.9), rgba(245,230,163,0.5), rgba(212,175,55,0.4))',
            transformOrigin: 'top',
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon — larger for premium, with glow on select */}
        <div style={{
          width: ICON_BOX.lg,
          height: ICON_BOX.lg,
          borderRadius: 13,
          background: selected
            ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 70%)'
            : 'rgba(212, 175, 55, 0.08)',
          border: `1px solid rgba(212, 175, 55, ${selected ? 0.25 : 0.20})`,
          boxShadow: selected
            ? '0 0 16px -4px rgba(212, 175, 55, 0.25), inset 0 0 8px rgba(212, 175, 55, 0.06)'
            : '0 0 12px -4px rgba(212, 175, 55, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}>
          {/* Inner shine ring on icon box */}
          <div style={{
            position: 'absolute',
            inset: 1,
            borderRadius: 12,
            border: '1px solid rgba(255, 248, 214, 0.06)',
            pointerEvents: 'none',
          }} />
          <motion.div
            animate={{ scale: selected ? 1.1 : 1, rotate: selected ? -3 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Icon
              size={20}
              color={COLORS.gold.primary}
              strokeWidth={1.5}
              style={{
                filter: selected
                  ? 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5)) drop-shadow(0 0 2px rgba(255, 248, 214, 0.2))'
                  : 'drop-shadow(0 0 2px rgba(212, 175, 55, 0.15))',
                transition: 'filter 0.3s',
              }}
            />
          </motion.div>
        </div>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: FONT.size.xl,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}>
            {service.label}
          </span>
          <div style={{
            fontSize: FONT.size.sm,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            marginTop: SPACING.xs,
            letterSpacing: '0.01em',
          }}>
            {service.description}
          </div>
        </div>

        {/* Price + duration */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: SPACING.xs,
        }}>
          <PremiumPriceTag price={service.price} selected={selected} />
          <span style={{
            fontSize: FONT.size.xs,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: 0.8,
          }}>
            <Timer size={10} />
            {service.duration}
          </span>
        </div>

        {/* Selection indicator — radio circle */}
        <SelectionIndicator selected={selected} />
      </div>

      {/* Post-selection trust line */}
      <TrustLine visible={selected} service={service} />

      {/* Guarantee badges */}
      {!selected && <GuaranteeBadges serviceId={service.id} />}
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   STANDARD SERVICE CARD — Clean, solid, aligned with design system
   ═════════════════════════════════════════════════════════════════════════ */

function ServiceCard({
  service,
  selected,
  onSelect,
  index,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  index: number
}) {
  const Icon = service.icon
  const isCustomPrice = service.priceNum === 0
  const { tier, canUseBlur } = useCapability()

  const entranceTransition = tier === 1
    ? { duration: 0 }
    : { delay: Math.min(index * 0.04, 0.3), type: 'spring' as const, stiffness: 300, damping: 28 }

  const backdropFilter = canUseBlur ? 'blur(20px) saturate(130%)' : 'none'

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 10 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '50px' }}
      transition={entranceTransition}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: CARD_PADDING,
        borderRadius: RADIUS.md,
        background: selected ? 'rgba(212, 175, 55, 0.04)' : COLORS.card.bg,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        border: selected
          ? `1.5px solid ${COLORS.gold.borderStrong}`
          : `1px solid ${COLORS.card.border}`,
        boxShadow: selected
          ? '0 0 24px -8px rgba(212, 175, 55, 0.12), inset 0 1px 0 rgba(212, 175, 55, 0.06)'
          : COLORS.card.insetHighlight,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'manipulation',
        userSelect: 'none',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.3s',
      }}
    >
      {/* Selected: gold left accent bar */}
      {selected && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'linear-gradient(180deg, rgba(212,175,55,0.7), rgba(212,175,55,0.3))',
            transformOrigin: 'top',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: ICON_BOX.md,
          height: ICON_BOX.md,
          borderRadius: RADIUS.sm,
          background: selected
            ? 'radial-gradient(circle at center, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 70%)'
            : COLORS.gold.soft,
          border: `1px solid ${selected ? 'rgba(212, 175, 55, 0.15)' : COLORS.gold.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        }}>
          <Icon
            size={18}
            color={selected ? COLORS.gold.primary : 'var(--text-muted)'}
            strokeWidth={1.5}
            style={{
              opacity: selected ? 1 : 0.7,
              filter: selected ? 'drop-shadow(0 0 3px rgba(212, 175, 55, 0.3))' : 'none',
              transition: 'opacity 0.2s, filter 0.3s',
            }}
          />
        </div>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: FONT.size.lg,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}>
            {service.label}
          </span>
          <div style={{
            fontSize: FONT.size.sm,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            marginTop: SPACING.xs,
            letterSpacing: '0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {service.description}
          </div>
        </div>

        {/* Price + duration */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 3,
        }}>
          <PremiumPriceTag price={service.price} selected={selected} />
          <span style={{
            fontSize: FONT.size.xs,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: 0.8,
          }}>
            <Timer size={10} />
            {service.duration}
          </span>
        </div>

        {/* Selection indicator */}
        <SelectionIndicator selected={selected} />
      </div>

      {/* Post-selection trust line */}
      <TrustLine visible={selected} service={service} />

      {/* Guarantee badges */}
      {!selected && <GuaranteeBadges serviceId={service.id} />}
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   CUSTOM FLOW CARD — photo_task / other (solid border, not dashed)
   ═════════════════════════════════════════════════════════════════════════ */

function CustomFlowCard({
  service,
  onPress,
  index,
}: {
  service: ServiceType
  onPress: () => void
  index: number
}) {
  const { tier } = useCapability()
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 8 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: `${SPACING.md + 2}px ${SPACING.xl}px`,
        background: COLORS.card.bg,
        border: `1px solid ${COLORS.card.border}`,
        borderRadius: RADIUS.md,
        boxShadow: COLORS.card.insetHighlight,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: COLORS.gold.soft,
        border: `1px solid ${COLORS.gold.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} color="var(--gold-400)" strokeWidth={1.5} style={{ opacity: 0.7 }} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{
          fontSize: FONT.size.base,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {service.label}
        </span>
        <span style={{
          fontSize: FONT.size.xs,
          color: 'var(--text-muted)',
          marginLeft: 8,
          letterSpacing: '0.01em',
        }}>
          {service.description}
        </span>
      </div>
      <ArrowRight size={13} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.3 }} />
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═════════════════════════════════════════════════════════════════════════ */

function GuaranteeBadges({ serviceId }: { serviceId: string }) {
  const badges = SERVICE_GUARANTEES[serviceId]
  if (!badges || badges.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: SPACING.md,
      paddingTop: SPACING.sm,
      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    }}>
      {badges.map((badge, i) => {
        const BadgeIcon = badge.icon
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.05)',
              fontSize: FONT.size['2xs'],
              fontWeight: 600,
              color: 'rgba(212, 175, 55, 0.55)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}
          >
            <BadgeIcon size={9} color={COLORS.gold.primary} strokeWidth={2} style={{ opacity: 0.5 }} />
            {badge.text}
          </div>
        )
      })}
    </div>
  )
}

function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: RADIUS.full,
      border: `1.5px solid ${selected ? COLORS.gold.primary : 'rgba(255, 255, 255, 0.10)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'border-color 0.2s ease',
    }}>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.05 }}
            style={{
              width: 14,
              height: 14,
              borderRadius: RADIUS.full,
              background: COLORS.gold.primary,
              boxShadow: '0 0 8px -1px rgba(212, 175, 55, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={9} color="#0A0A0A" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrustLine({ visible, service }: { visible: boolean; service: ServiceType }) {
  const isPremium = service.category === 'premium'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{
            marginTop: SPACING.md,
            paddingTop: SPACING.md,
            borderTop: '1px solid rgba(212, 175, 55, 0.08)',
          }}>
            {/* What's included — expanded info */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 16px',
              marginBottom: SPACING.sm,
            }}>
              <IncludedItem text="Безлимитные правки" />
              <IncludedItem text="Возврат до старта" />
              {isPremium && <IncludedItem text="Личный менеджер" />}
              {isPremium && <IncludedItem text="Антиплагиат" />}
              {!isPremium && <IncludedItem text="Оформление" />}
            </div>

            {/* Bottom trust line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: FONT.size['2xs'],
              color: COLORS.gold.badge,
              opacity: 0.8,
            }}>
              <Shield size={9} strokeWidth={1.5} />
              <span>Оплата после согласования деталей</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function IncludedItem({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: FONT.size['2xs'],
      color: 'rgba(74, 222, 128, 0.7)',
      fontWeight: 500,
    }}>
      <CheckCircle size={9} strokeWidth={2} />
      <span>{text}</span>
    </div>
  )
}
