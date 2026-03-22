import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, Check, ChevronRight, Timer, MessageSquare, Shield,
  Star, Eye, Camera, HelpCircle,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, TAP_SCALE } from './design-tokens'
import { useCapability } from '../../contexts/DeviceCapabilityContext'
import { useSocialProofBatch, formatOrderCount } from './useSocialProof'
import type { SocialProofData, ServiceMetaForProof, ActivityEvent } from './useSocialProof'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v10 «Quiet Luxury + Trust + Smart Flows»

   Principles:
   - ONE card size for all academic services
   - Popular services FIRST (80% of users)
   - photo_task / other / assist → fast mode (different wizard flow)
   - Live activity ticker for ambient social proof
   - Smart default: highlight last ordered / coursework for new users
   - Gold celebration on selection + haptic
   - Device-adaptive animations (tier 1/2/3)
   - Premium cards get subtle visual distinction
   - All copy in Вы-form (professional tone)

   Order: Popular → Standard → Express → [section] Premium → [special] Custom
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  /** Triggers fast mode — optionally with a specific service id (photo_task, other) */
  onUrgentRequest?: (serviceId?: string) => void
}

// ─── Services that go through standard wizard ────────────────────────────
// photo_task and other are routed to fast mode instead
const CUSTOM_FLOW_IDS = new Set(['photo_task', 'other'])

const DISPLAY_ORDER: string[] = [
  // Popular / high-conversion
  'coursework', 'report', 'essay',
  // Mid-tier
  'presentation', 'practice', 'control', 'independent',
  // Premium
  'diploma', 'masters',
]

// Section breaks
const SECTIONS: { afterId: string; label: string }[] = [
  { afterId: 'essay', label: 'Быстрые работы' },
  { afterId: 'independent', label: 'Дипломы и диссертации' },
]

interface CatalogItem {
  service: ServiceType
  sectionBefore?: string
}

const CATALOG: CatalogItem[] = (() => {
  const byId = new Map(SERVICE_TYPES.map(s => [s.id, s]))
  const sectionMap = new Map(SECTIONS.map(s => [s.afterId, s.label]))
  const result: CatalogItem[] = []
  const seen = new Set<string>()

  for (let i = 0; i < DISPLAY_ORDER.length; i++) {
    const id = DISPLAY_ORDER[i]
    const service = byId.get(id)
    if (!service) continue

    const prevId = i > 0 ? DISPLAY_ORDER[i - 1] : null
    const sectionBefore = prevId ? sectionMap.get(prevId) : undefined

    result.push({ service, sectionBefore })
    seen.add(id)
  }

  // Catch any new services not in DISPLAY_ORDER (excluding custom flow)
  for (const service of SERVICE_TYPES) {
    if (!seen.has(service.id) && !CUSTOM_FLOW_IDS.has(service.id)) {
      result.push({ service })
    }
  }

  return result
})()

// Service metas for social proof batch hook (all services, including custom)
const SERVICE_METAS: ServiceMetaForProof[] = SERVICE_TYPES.map(s => ({
  id: s.id,
  category: s.category,
  popular: s.popular,
}))

// ─── Smart default: remember last ordered service ────────────────────────
const LAST_SERVICE_KEY = 'last_ordered_service_v1'

function getSmartDefault(): string | null {
  try {
    return localStorage.getItem(LAST_SERVICE_KEY)
  } catch {
    return null
  }
}

// ─── Haptic helpers ──────────────────────────────────────────────────────

interface TelegramHaptic {
  selectionChanged?: () => void
  impactOccurred?: (style: string) => void
  notificationOccurred?: (type: string) => void
}

function getHaptic(): TelegramHaptic | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram
    return tg?.WebApp?.HapticFeedback ?? null
  } catch {
    return null
  }
}

function triggerHaptic(type: 'selection' | 'light' | 'success' | 'warning') {
  const haptic = getHaptic()
  if (!haptic) return

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  switch (type) {
    case 'selection':
      if (isIOS && haptic.selectionChanged) {
        haptic.selectionChanged()
      } else {
        haptic.impactOccurred?.('light')
      }
      break
    case 'light':
      haptic.impactOccurred?.('light')
      break
    case 'success':
      haptic.notificationOccurred?.('success')
      break
    case 'warning':
      haptic.notificationOccurred?.('warning')
      break
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   TRUST STRIP — Compact trust signals at the top
   ═════════════════════════════════════════════════════════════════════════ */

function TrustStrip() {
  const { tier } = useCapability()

  return (
    <motion.div
      initial={tier >= 2 ? { opacity: 0, y: 8 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: `${SPACING.sm}px ${SPACING.md}px`,
        fontSize: FONT.size['2xs'],
        color: 'var(--text-muted)',
        letterSpacing: '0.02em',
        lineHeight: 1.4,
        textAlign: 'center',
      }}
    >
      <Shield size={10} color={COLORS.gold.primary} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <span>Бесплатные правки · Возврат до старта · 93% сдают с 1 раза</span>
    </motion.div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   LIVE TICKER — Rotating activity events for ambient social proof
   ═════════════════════════════════════════════════════════════════════════ */

function LiveTicker({ events }: { events: (ActivityEvent | null)[] }) {
  const { tier } = useCapability()
  const validEvents = useMemo(() => events.filter(Boolean) as ActivityEvent[], [events])
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    if (validEvents.length === 0) return
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % validEvents.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [validEvents.length])

  if (validEvents.length === 0) return null

  const event = validEvents[currentIdx]
  if (!event) return null

  return (
    <div style={{
      overflow: 'hidden',
      height: 28,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: `0 ${SPACING.sm}px`,
      marginBottom: SPACING.xs,
    }}>
      {/* Pulsing green dot */}
      <motion.div
        animate={tier >= 2 ? {
          scale: [1, 1.4, 1],
          opacity: [0.6, 1, 0.6],
        } : undefined}
        transition={tier >= 2 ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: '#22c55e',
          flexShrink: 0,
        }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={tier >= 2 ? { y: 16, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={tier >= 2 ? { y: -16, opacity: 0 } : undefined}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: FONT.size['2xs'],
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {event.text}
          <span style={{ opacity: 0.4, marginLeft: 6 }}>· {event.timeAgo}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
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
  const socialProofMap = useSocialProofBatch(SERVICE_METAS)
  const [justSelected, setJustSelected] = useState<string | null>(null)
  const selectedCardRef = useRef<HTMLDivElement>(null)

  // Smart default: what to suggest
  const smartDefault = useMemo(() => getSmartDefault() || 'coursework', [])

  // Find index to insert assist card (before "Дипломы и диссертации")
  const assistIndex = useMemo(() => {
    return CATALOG.findIndex(item => item.sectionBefore === 'Дипломы и диссертации')
  }, [])

  // Collect activity events for live ticker
  const activityEvents = useMemo(() => {
    return Array.from(socialProofMap.values()).map(sp => sp.recentActivity)
  }, [socialProofMap])

  const handleSelect = useCallback((id: string) => {
    triggerHaptic('selection')
    setTimeout(() => triggerHaptic('light'), 150)

    setJustSelected(id)
    setTimeout(() => setJustSelected(null), 600)

    // Save for smart default on next visit
    try { localStorage.setItem(LAST_SERVICE_KEY, id) } catch { /* noop */ }

    onSelect(id)

    setTimeout(() => {
      selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [onSelect])

  const handleFastMode = useCallback((serviceId?: string) => {
    triggerHaptic('light')
    onUrgentRequest?.(serviceId)
  }, [onUrgentRequest])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
      {/* Trust strip */}
      <TrustStrip />

      {/* Live activity ticker */}
      <LiveTicker events={activityEvents} />

      {/* Standard service cards */}
      {CATALOG.map(({ service, sectionBefore }, i) => (
        <div key={service.id} ref={selected === service.id ? selectedCardRef : undefined}>
          {/* Section label */}
          {sectionBefore && (
            <motion.div
              initial={tier >= 2 ? { opacity: 0, x: -8 } : false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: FONT.size.xs,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: `0 2px`,
                marginTop: SPACING.lg,
                marginBottom: SPACING.sm,
              }}
            >
              {sectionBefore}
            </motion.div>
          )}

          {/* Assist card before "Дипломы и диссертации" */}
          {i === assistIndex && onUrgentRequest && (
            <div style={{ marginBottom: SPACING.sm }}>
              <AssistCard onPress={() => handleFastMode()} index={i} />
            </div>
          )}

          <ServiceCard
            service={service}
            selected={selected === service.id}
            justSelected={justSelected === service.id}
            isSuggested={!selected && service.id === smartDefault}
            onSelect={() => handleSelect(service.id)}
            index={i}
            socialProof={socialProofMap.get(service.id)}
          />
        </div>
      ))}

      {/* ─── Custom flow cards (fast mode routing) ──────────────── */}
      {onUrgentRequest && (
        <>
          <motion.div
            initial={tier >= 2 ? { opacity: 0, x: -8 } : false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: FONT.size.xs,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: `0 2px`,
              marginTop: SPACING.lg,
              marginBottom: SPACING.sm,
            }}
          >
            Особые запросы
          </motion.div>

          <PhotoTaskCard
            onPress={() => handleFastMode('photo_task')}
            index={CATALOG.length}
          />

          <div style={{ height: SPACING.sm }} />

          <CustomRequestCard
            onPress={() => handleFastMode('other')}
            index={CATALOG.length + 1}
          />
        </>
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SERVICE CARD — Standard wizard flow
   ═════════════════════════════════════════════════════════════════════════ */

function ServiceCard({
  service,
  selected,
  justSelected,
  isSuggested,
  onSelect,
  index,
  socialProof,
}: {
  service: ServiceType
  selected: boolean
  justSelected: boolean
  isSuggested: boolean
  onSelect: () => void
  index: number
  socialProof?: SocialProofData
}) {
  const Icon = service.icon
  const isPopular = !!service.popular
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

  // Premium gradient border
  const premiumBorderStyle = isPremium && !selected ? {
    border: '1.5px solid transparent',
    backgroundImage: `linear-gradient(${cardBg}, ${cardBg}), linear-gradient(135deg, rgba(201,162,39,0.25), rgba(201,162,39,0.05))`,
    backgroundOrigin: 'border-box' as const,
    backgroundClip: 'padding-box, border-box' as const,
  } : {}

  // Suggested pulse border (subtle)
  const suggestedBorder = isSuggested && !selected
    ? `1px solid rgba(201, 162, 39, 0.12)`
    : undefined

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
        padding: `${SPACING.lg}px ${SPACING.lg}px`,
        borderRadius: RADIUS.md,
        background: selected
          ? 'rgba(201, 162, 39, 0.06)'
          : cardBg,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        border: selected
          ? `1.5px solid ${COLORS.gold.borderStrong}`
          : suggestedBorder || `1px solid ${COLORS.card.border}`,
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
      {/* Gold ripple celebration overlay */}
      <AnimatePresence>
        {justSelected && tier >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.3, 1.2, 1.5],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', times: [0, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: RADIUS.md,
              background: 'radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Premium inner glow */}
      {isPremium && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: RADIUS.md,
            background: 'radial-gradient(ellipse at top right, rgba(201,162,39,0.04) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
      }}>
        {/* Icon with bounce on selection */}
        <motion.div
          animate={justSelected ? {
            scale: [1, 1.25, 0.95, 1.05, 1],
            rotate: [0, -8, 5, -2, 0],
          } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            width: 36,
            height: 36,
            borderRadius: RADIUS.sm,
            background: selected
              ? 'rgba(201, 162, 39, 0.08)'
              : isPremium
                ? 'rgba(201, 162, 39, 0.04)'
                : 'rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}>
          <Icon
            size={17}
            color={selected ? COLORS.gold.primary : isPremium ? COLORS.gold.badge : 'var(--text-muted)'}
            strokeWidth={1.7}
          />
        </motion.div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
          }}>
            <span style={{
              fontSize: FONT.size.base,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}>
              {service.label}
            </span>

            {isPopular && (
              <span style={{
                padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(201, 162, 39, 0.08)',
                color: COLORS.gold.badge,
                fontSize: FONT.size['2xs'],
                fontWeight: 700,
                lineHeight: 1,
              }}>
                Топ
              </span>
            )}

            {isSuggested && !selected && !isPopular && (
              <span style={{
                padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(34, 197, 94, 0.06)',
                color: '#22c55e',
                fontSize: FONT.size['2xs'],
                fontWeight: 600,
                lineHeight: 1,
              }}>
                Для вас
              </span>
            )}
          </div>

          {/* Description — 2-line capable */}
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

          {/* Social proof line */}
          {socialProof && socialProof.totalOrders > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
              fontSize: FONT.size['2xs'],
              color: 'var(--text-muted)',
              opacity: 0.7,
            }}>
              <Star size={8} color={COLORS.gold.primary} fill={COLORS.gold.primary} />
              <span>{socialProof.rating}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{formatOrderCount(socialProof.totalOrders)} заказов</span>
              {socialProof.viewersNow > 2 && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Eye size={8} />
                    {socialProof.viewersNow}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: price + duration */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 2,
        }}>
          <PriceDisplay price={service.price} isCustom={isCustomPrice} selected={selected} />
          <span style={{
            fontSize: FONT.size['2xs'],
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            opacity: 0.7,
          }}>
            <Timer size={9} />
            {service.duration}
          </span>
        </div>

        {/* Selection indicator */}
        <SelectionIndicator selected={selected} />
      </div>

      {/* Inline confirmation after selection */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: SPACING.sm,
              paddingTop: SPACING.sm,
              borderTop: `1px solid rgba(201,162,39,0.08)`,
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
   SHARED ATOMS
   ═════════════════════════════════════════════════════════════════════════ */

function PriceDisplay({
  price,
  isCustom,
  selected,
}: {
  price: string
  isCustom: boolean
  selected: boolean
}) {
  if (isCustom) {
    return (
      <span style={{
        fontSize: FONT.size.xs,
        fontWeight: 500,
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        По запросу
      </span>
    )
  }

  return (
    <span style={{
      fontSize: FONT.size.sm,
      fontWeight: 700,
      color: selected ? 'var(--gold-400)' : 'var(--text-secondary)',
      whiteSpace: 'nowrap',
    }}>
      {price}
    </span>
  )
}

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
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronRight size={15} color="var(--text-muted)" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SPECIAL CARDS — Route to fast mode (different wizard flow)
   ═════════════════════════════════════════════════════════════════════════ */

/** "Задача по фото" — opens fast mode with photo_task service id */
function PhotoTaskCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 8 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.lg}px ${SPACING.lg}px`,
        background: 'rgba(201, 162, 39, 0.02)',
        border: `1.5px dashed rgba(201, 162, 39, 0.12)`,
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        background: 'rgba(201, 162, 39, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Camera size={17} color="var(--gold-400)" strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: FONT.size.base, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          Задача по фото
        </div>
        <div style={{ fontSize: FONT.size.sm, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
          Сфотографируйте задание — пришлём решение
        </div>
      </div>
      <ArrowRight size={14} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.4 }} />
    </motion.button>
  )
}

/** "Другое" — opens fast mode with other service id */
function CustomRequestCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 8 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.lg}px ${SPACING.lg}px`,
        background: 'rgba(255, 255, 255, 0.01)',
        border: `1px dashed rgba(255, 255, 255, 0.06)`,
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        background: 'rgba(255, 255, 255, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <HelpCircle size={17} color="var(--text-muted)" strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: FONT.size.base, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          Другое
        </div>
        <div style={{ fontSize: FONT.size.sm, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
          Опишите задачу — подберём формат и автора
        </div>
      </div>
      <ArrowRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.3 }} />
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   ASSIST CARD — "Не уверены?" → fast mode
   ═════════════════════════════════════════════════════════════════════════ */

function AssistCard({ onPress, index }: { onPress: () => void; index: number }) {
  const { tier } = useCapability()

  return (
    <motion.button
      type="button"
      initial={tier >= 2 ? { opacity: 0, y: 8 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: tier >= 2 ? TAP_SCALE.card : 1 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.lg}px ${SPACING.lg}px`,
        background: 'rgba(201, 162, 39, 0.02)',
        border: `1.5px dashed rgba(201, 162, 39, 0.15)`,
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      {/* Pulsing icon */}
      <motion.div
        animate={tier >= 2 ? {
          scale: [1, 1.08, 1],
          opacity: [0.8, 1, 0.8],
        } : undefined}
        transition={tier >= 2 ? {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        } : undefined}
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.md,
          background: 'rgba(201, 162, 39, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <MessageSquare size={18} color="var(--gold-400)" strokeWidth={1.7} />
      </motion.div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: FONT.size.base,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
        }}>
          Не уверены, что выбрать?
        </div>
        <div style={{
          fontSize: FONT.size.xs,
          color: 'var(--text-muted)',
          fontWeight: 500,
          marginTop: 2,
        }}>
          Просто напишите — разберёмся вместе
        </div>
      </div>
      <ArrowRight size={14} color="var(--gold-400)" style={{ flexShrink: 0, opacity: 0.5 }} />
    </motion.button>
  )
}
