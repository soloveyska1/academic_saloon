import { useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Check, Timer, MessageSquare, Shield,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, ICON_BOX, TAP_SCALE, CARD_PADDING, CARD_PADDING_PREMIUM } from './design-tokens'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v12 «Premium Catalog»

   Principles:
   - Premium services (diploma/masters) first — anchoring effect
   - Two visually distinct card tiers: premium vs standard
   - All services visible — no collapse, no hidden inventory
   - Assist prompt at bottom (not mid-catalog)
   - Solid borders everywhere — no dashed = no placeholder feel
   - Selection: gold border + radio circle + trust line
   - Descriptions sell outcomes, not deliverables
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onUrgentRequest?: (serviceId?: string) => void
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

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

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div style={{
        height: 1,
        margin: `${SPACING.xs}px ${SPACING.xl}px`,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
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

      {/* ─── Divider ───────────────────────────────────────────── */}
      <div style={{
        height: 1,
        margin: `${SPACING.xs}px ${SPACING.xl}px`,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
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
              Сложная или нестандартная задача?
            </div>
            <div style={{
              fontSize: FONT.size.sm,
              color: 'var(--text-muted)',
              marginTop: 2,
            }}>
              Напишите — разберёмся вместе
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
        <span>Правки включены · Возврат до начала работы · 93% сдают с первого раза</span>
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
          ? '0 0 24px -8px rgba(212, 175, 55, 0.12), inset 0 1px 0 rgba(212, 175, 55, 0.06)'
          : 'none',
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
        left: 20,
        right: 20,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.35), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon — larger for premium */}
        <div style={{
          width: ICON_BOX.lg,
          height: ICON_BOX.lg,
          borderRadius: 13,
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.20)',
          boxShadow: selected ? COLORS.gold.shadow : '0 0 12px -4px rgba(212, 175, 55, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'box-shadow 0.3s',
        }}>
          <Icon
            size={20}
            color={COLORS.gold.primary}
            strokeWidth={1.5}
          />
        </div>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: FONT.size.xl,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            {service.label}
          </span>
          <div style={{
            fontSize: FONT.size.sm,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            marginTop: 2,
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
          <span style={{
            fontSize: FONT.size.base,
            fontWeight: 700,
            color: 'var(--gold-400)',
            whiteSpace: 'nowrap',
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
          : 'none',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: ICON_BOX.md,
          height: ICON_BOX.md,
          borderRadius: RADIUS.sm,
          background: selected ? 'rgba(212, 175, 55, 0.08)' : COLORS.gold.soft,
          border: `1px solid ${selected ? 'rgba(212, 175, 55, 0.15)' : COLORS.gold.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          <Icon
            size={18}
            color={selected ? COLORS.gold.primary : 'var(--text-muted)'}
            strokeWidth={1.5}
            style={{ opacity: selected ? 1 : 0.7, transition: 'opacity 0.2s' }}
          />
        </div>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: FONT.size.lg,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            {service.label}
          </span>
          <div style={{
            fontSize: FONT.size.sm,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            marginTop: 2,
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

function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <AnimatePresence mode="popLayout">
      {selected ? (
        <motion.div
          key="check"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          style={{
            width: 24,
            height: 24,
            borderRadius: RADIUS.full,
            background: COLORS.gold.primary,
            boxShadow: '0 0 12px -2px rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check size={13} color="#121212" strokeWidth={3} />
        </motion.div>
      ) : (
        <motion.div
          key="ring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            width: 24,
            height: 24,
            borderRadius: RADIUS.full,
            border: '1.5px solid rgba(255, 255, 255, 0.08)',
            background: 'transparent',
            flexShrink: 0,
          }}
        />
      )}
    </AnimatePresence>
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
            <span>Сначала обсудим детали — оплата потом</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
