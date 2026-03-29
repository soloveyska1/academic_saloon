import { useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Check, Timer, MessageSquare, Shield,
  CheckCircle, RefreshCw, Clock, Sparkles, FileText,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, ICON_BOX, TAP_SCALE, CARD_PADDING, CARD_PADDING_PREMIUM } from './design-tokens'
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
    { icon: RefreshCw, text: '3 бесплатные правки' },
    { icon: CheckCircle, text: 'Сопровождение до защиты' },
  ],
  masters: [
    { icon: Shield, text: 'Антиплагиат от 70%' },
    { icon: CheckCircle, text: 'Научная новизна' },
    { icon: RefreshCw, text: 'Правки до защиты' },
  ],
  coursework: [
    { icon: Shield, text: 'Антиплагиат от 60%' },
    { icon: RefreshCw, text: 'Бесплатные правки' },
    { icon: CheckCircle, text: 'По методичке ВУЗа' },
  ],
  practice: [
    { icon: CheckCircle, text: 'Дневник + отчёт' },
    { icon: RefreshCw, text: 'Правки включены' },
  ],
  presentation: [
    { icon: Sparkles, text: 'Дизайн + речь' },
    { icon: RefreshCw, text: 'Правки включены' },
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

function triggerHaptic() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram
    const haptic = tg?.WebApp?.HapticFeedback
    if (!haptic) return
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && haptic.selectionChanged) {
      haptic.selectionChanged()
    } else {
      haptic.impactOccurred?.('light')
    }
  } catch { /* noop */ }
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
    triggerHaptic()
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>

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
        gap: 8,
        padding: `${SPACING.lg}px ${SPACING.md}px ${SPACING.sm}px`,
        fontSize: FONT.size.xs,
        color: 'var(--text-muted)',
        opacity: 0.7,
        letterSpacing: '0.01em',
        textAlign: 'center',
      }}>
        <Shield size={12} color={COLORS.gold.primary} strokeWidth={1.5} style={{ flexShrink: 0 }} />
        <span>Правки включены · Возврат до старта · 93% сдают с первого раза</span>
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
      onClick={onSelect}
      style={{
        width: '100%',
        padding: CARD_PADDING_PREMIUM,
        borderRadius: RADIUS.lg,
        background: selected ? 'rgba(212, 175, 55, 0.05)' : COLORS.card.bgPremium,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        border: selected
          ? `1.5px solid ${COLORS.gold.borderStrong}`
          : `1.5px solid ${COLORS.card.borderPremium}`,
        boxShadow: selected
          ? '0 0 24px -8px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(212, 175, 55, 0.08)'
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
      {/* Gold accent line at top — animated shimmer */}
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
          background: 'linear-gradient(90deg, transparent 15%, rgba(212, 175, 55, 0.35) 50%, transparent 85%)',
        }} />
      </div>

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
            background: 'linear-gradient(180deg, rgba(212,175,55,0.8), rgba(212,175,55,0.4))',
            transformOrigin: 'top',
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
          <motion.div
            animate={{ scale: selected ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Icon
              size={20}
              color={COLORS.gold.primary}
              strokeWidth={1.5}
              style={{
                filter: selected ? 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))' : 'none',
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
          <span style={{
            fontSize: FONT.size.base,
            fontWeight: 600,
            color: 'var(--gold-400)',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            {service.price}
          </span>
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
      <TrustLine visible={selected} />

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
          {isCustomPrice ? (
            <span style={{
              fontSize: FONT.size.sm,
              fontWeight: 600,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}>
              По запросу
            </span>
          ) : (
            <span style={{
              fontSize: FONT.size.md,
              fontWeight: 700,
              color: selected ? 'var(--gold-400)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}>
              {service.price}
            </span>
          )}
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
      <TrustLine visible={selected} />

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
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      <Icon size={18} color="var(--gold-400)" strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.7 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: FONT.size.lg, fontWeight: 600, color: 'var(--text-primary)' }}>
          {service.label}
        </span>
        <span style={{
          fontSize: FONT.size.sm,
          color: 'var(--text-muted)',
          marginLeft: 8,
        }}>
          {service.description}
        </span>
      </div>
      <ArrowRight size={14} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.35 }} />
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
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    }}>
      {badges.map((badge, i) => {
        const BadgeIcon = badge.icon
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 8,
              background: 'rgba(212, 175, 55, 0.04)',
              border: '1px solid rgba(212, 175, 55, 0.06)',
              fontSize: FONT.size['2xs'],
              fontWeight: 600,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            <BadgeIcon size={9} color={COLORS.gold.primary} strokeWidth={2} style={{ opacity: 0.7 }} />
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

function TrustLine({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: SPACING.sm,
            paddingTop: SPACING.sm,
            borderTop: '1px solid rgba(212, 175, 55, 0.08)',
            fontSize: FONT.size['2xs'],
            color: COLORS.gold.badge,
          }}>
            <Shield size={10} strokeWidth={1.5} />
            <span>Оплата после согласования деталей</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
