import { useState, useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Check, ChevronRight, Timer, MessageSquare, Shield,
  Camera, HelpCircle, ChevronDown,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, TAP_SCALE } from './design-tokens'
import { useCapability } from '../../contexts/DeviceCapabilityContext'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v11 «Clean Selection»

   Design principles:
   - Top 3 visible immediately (covers 80% of users)
   - Rest collapsed under "Ещё N услуг" — discoverable, not noisy
   - Assist card at position 4 (before fatigue)
   - photo_task / other → fast mode (dashed cards at bottom)
   - 5 elements per card: icon, title, description, price+duration, indicator
   - No fabricated social proof, no badges, no section labels
   - Trust footer at bottom — earns trust after showing value
   - Selection: border + check + single haptic. Nothing else.
   - All copy in Вы-form

   Card order: popular first, then by natural flow
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  /** Triggers fast mode — optionally with a specific service id */
  onUrgentRequest?: (serviceId?: string) => void
}

// ─── Services excluded from standard catalog (route to fast mode) ─────
const CUSTOM_FLOW_IDS = new Set(['photo_task', 'other'])

// ─── Display order: popular first ─────────────────────────────────────
const DISPLAY_ORDER: string[] = [
  'coursework', 'report', 'essay',           // Top 3 — always visible
  'presentation', 'practice', 'control',      // Expandable
  'independent',                              // Expandable
  'diploma', 'masters',                       // Premium (expandable)
]

const TOP_COUNT = 3 // How many cards shown before "Ещё"

const CATALOG: ServiceType[] = (() => {
  const byId = new Map(SERVICE_TYPES.map(s => [s.id, s]))
  const result: ServiceType[] = []
  const seen = new Set<string>()

  for (const id of DISPLAY_ORDER) {
    const service = byId.get(id)
    if (service) {
      result.push(service)
      seen.add(id)
    }
  }

  for (const service of SERVICE_TYPES) {
    if (!seen.has(service.id) && !CUSTOM_FLOW_IDS.has(service.id)) {
      result.push(service)
    }
  }

  return result
})()

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
  const { tier } = useCapability()
  const [expanded, setExpanded] = useState(false)
  const selectedCardRef = useRef<HTMLDivElement>(null)

  // If user already selected something in the collapsed section, keep it expanded
  const hasSelectedInCollapsed = useMemo(() => {
    if (!selected) return false
    const collapsedIds = CATALOG.slice(TOP_COUNT).map(s => s.id)
    return collapsedIds.includes(selected)
  }, [selected])

  const isExpanded = expanded || hasSelectedInCollapsed

  const topServices = CATALOG.slice(0, TOP_COUNT)
  const moreServices = CATALOG.slice(TOP_COUNT)

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

  const toggleExpanded = useCallback(() => {
    triggerHaptic()
    setExpanded(prev => !prev)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>

      {/* ─── Top services (always visible) ──────────────────── */}
      {topServices.map((service, i) => (
        <div key={service.id} ref={selected === service.id ? selectedCardRef : undefined}>
          <ServiceCard
            service={service}
            selected={selected === service.id}
            onSelect={() => handleSelect(service.id)}
            index={i}
          />
        </div>
      ))}

      {/* ─── Assist card at position 4 ──────────────────────── */}
      {onUrgentRequest && (
        <AssistCard onPress={() => handleFastMode()} index={TOP_COUNT} />
      )}

      {/* ─── "Ещё N услуг" expander ────────────────────────── */}
      {moreServices.length > 0 && (
        <>
          <motion.button
            type="button"
            onClick={toggleExpanded}
            whileTap={{ scale: tier >= 2 ? 0.98 : 1 }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: `${SPACING.md}px`,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: FONT.size.sm,
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.01em',
            }}>
              {isExpanded ? 'Свернуть' : `Ещё ${moreServices.length} услуг`}
            </span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} color="var(--text-muted)" />
            </motion.div>
          </motion.button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                  {moreServices.map((service, i) => (
                    <div
                      key={service.id}
                      ref={selected === service.id ? selectedCardRef : undefined}
                    >
                      <ServiceCard
                        service={service}
                        selected={selected === service.id}
                        onSelect={() => handleSelect(service.id)}
                        index={TOP_COUNT + 1 + i}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ─── Custom flow cards (fast mode) ──────────────────── */}
      {onUrgentRequest && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.sm,
          marginTop: SPACING.sm,
        }}>
          <PhotoTaskCard
            onPress={() => handleFastMode('photo_task')}
            index={CATALOG.length}
          />
          <CustomRequestCard
            onPress={() => handleFastMode('other')}
            index={CATALOG.length + 1}
          />
        </div>
      )}

      {/* ─── Trust footer ───────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: `${SPACING.lg}px ${SPACING.md}px ${SPACING.sm}px`,
        fontSize: FONT.size['2xs'],
        color: 'var(--text-muted)',
        opacity: 0.5,
        letterSpacing: '0.01em',
        textAlign: 'center',
      }}>
        <Shield size={9} color={COLORS.gold.primary} strokeWidth={1.5} style={{ flexShrink: 0 }} />
        <span>Бесплатные правки · Возврат до старта · 93% сдают с 1 раза</span>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SERVICE CARD — Clean, 5-element design
   icon | title + description | price + duration | indicator
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
  const isPremium = service.category === 'premium'
  const { tier, canUseBlur } = useCapability()

  const entranceTransition = tier === 1
    ? { duration: 0 }
    : {
        delay: Math.min(index * 0.04, 0.3),
        type: 'spring' as const,
        stiffness: 300,
        damping: 28,
      }

  const backdropFilter = canUseBlur ? 'blur(16px) saturate(140%)' : 'none'
  const cardBg = canUseBlur ? COLORS.card.bg : 'rgba(12, 12, 10, 0.92)'

  // Premium gradient border (subtle distinction for diploma/masters)
  const premiumBorderStyle = isPremium && !selected ? {
    border: '1.5px solid transparent',
    backgroundImage: `linear-gradient(${cardBg}, ${cardBg}), linear-gradient(135deg, rgba(201,162,39,0.25), rgba(201,162,39,0.05))`,
    backgroundOrigin: 'border-box' as const,
    backgroundClip: 'padding-box, border-box' as const,
  } : {}

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
        padding: `${SPACING.lg}px`,
        borderRadius: RADIUS.md,
        background: selected ? 'rgba(201, 162, 39, 0.06)' : cardBg,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        border: selected
          ? `1.5px solid ${COLORS.gold.borderStrong}`
          : `1px solid ${COLORS.card.border}`,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        ...premiumBorderStyle,
      }}
    >
      {/* Premium inner glow */}
      {isPremium && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: RADIUS.md,
          background: 'radial-gradient(ellipse at top right, rgba(201,162,39,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
        {/* Icon */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: RADIUS.sm,
          background: selected
            ? 'rgba(201, 162, 39, 0.08)'
            : isPremium ? 'rgba(201, 162, 39, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          <Icon
            size={16}
            color={selected ? COLORS.gold.primary : isPremium ? COLORS.gold.badge : 'var(--text-muted)'}
            strokeWidth={1.7}
          />
        </div>

        {/* Title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: FONT.size.base,
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
            lineHeight: 1.3,
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
          gap: 2,
        }}>
          {isCustomPrice ? (
            <span style={{
              fontSize: FONT.size.xs,
              fontWeight: 500,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}>
              По запросу
            </span>
          ) : (
            <span style={{
              fontSize: FONT.size.sm,
              fontWeight: 700,
              color: selected ? 'var(--gold-400)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}>
              {service.price}
            </span>
          )}
          <span style={{
            fontSize: FONT.size['2xs'],
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            opacity: 0.6,
          }}>
            <Timer size={9} />
            {service.duration}
          </span>
        </div>

        {/* Selection indicator */}
        <AnimatePresence mode="popLayout">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: RADIUS.full,
                background: COLORS.gold.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={12} color="#09090b" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chevron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              style={{ flexShrink: 0 }}
            >
              <ChevronRight size={14} color="var(--text-muted)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post-selection trust line */}
      <AnimatePresence>
        {selected && (
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
              gap: 6,
              marginTop: SPACING.sm,
              paddingTop: SPACING.sm,
              borderTop: '1px solid rgba(201,162,39,0.08)',
              fontSize: FONT.size['2xs'],
              color: COLORS.gold.badge,
            }}>
              <Shield size={10} strokeWidth={1.5} />
              <span>Оплата после обсуждения деталей</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SPECIAL FLOW CARDS — Route to fast mode
   ═════════════════════════════════════════════════════════════════════════ */

function PhotoTaskCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

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
        gap: SPACING.md,
        padding: `${SPACING.md + 2}px ${SPACING.lg}px`,
        background: 'rgba(201, 162, 39, 0.015)',
        border: '1.5px dashed rgba(201, 162, 39, 0.1)',
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <Camera size={16} color="var(--gold-400)" strokeWidth={1.7} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: FONT.size.sm, fontWeight: 600, color: 'var(--text-primary)' }}>
          Задача по фото
        </span>
        <span style={{
          fontSize: FONT.size.xs,
          color: 'var(--text-muted)',
          marginLeft: 8,
        }}>
          Сфотографируйте — решим
        </span>
      </div>
      <ArrowRight size={13} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.3 }} />
    </motion.button>
  )
}

function CustomRequestCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

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
        gap: SPACING.md,
        padding: `${SPACING.md + 2}px ${SPACING.lg}px`,
        background: 'none',
        border: '1px dashed rgba(255, 255, 255, 0.05)',
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <HelpCircle size={16} color="var(--text-muted)" strokeWidth={1.7} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: FONT.size.sm, fontWeight: 600, color: 'var(--text-primary)' }}>
          Другое
        </span>
        <span style={{
          fontSize: FONT.size.xs,
          color: 'var(--text-muted)',
          marginLeft: 8,
        }}>
          Опишите задачу — подберём формат
        </span>
      </div>
      <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.2 }} />
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   ASSIST CARD — "Не уверены?" at position 4
   ═════════════════════════════════════════════════════════════════════════ */

function AssistCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

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
        gap: SPACING.md,
        padding: `${SPACING.lg}px`,
        background: 'rgba(201, 162, 39, 0.02)',
        border: '1.5px dashed rgba(201, 162, 39, 0.12)',
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 34,
        height: 34,
        borderRadius: RADIUS.md,
        background: 'rgba(201, 162, 39, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MessageSquare size={16} color="var(--gold-400)" strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: FONT.size.sm,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
        }}>
          Не уверены, что выбрать?
        </div>
        <div style={{
          fontSize: FONT.size.xs,
          color: 'var(--text-muted)',
          marginTop: 1,
        }}>
          Напишите — подберём вместе
        </div>
      </div>
      <ArrowRight size={13} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.4 }} />
    </motion.button>
  )
}
