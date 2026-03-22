import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, Timer, MessageSquare } from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, TAP_SCALE } from './design-tokens'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v8 «Quiet Luxury»

   Principles:
   - ONE card size for all services (no hero/row/compact tiers)
   - Popular services FIRST (what 80% of users need)
   - Unified glass style matching homepage
   - Price whispered, not screamed
   - No "партнёр" — professional tone

   Order: Popular → Standard → Express → Custom
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onUrgentRequest?: () => void
}

// ─── Display order: popular first, then by natural flow ──────────────────

const DISPLAY_ORDER: string[] = [
  // Popular / high-conversion
  'coursework', 'report', 'essay',
  // Mid-tier
  'presentation', 'practice', 'control', 'independent',
  // Premium
  'diploma', 'masters',
  // Custom
  'photo_task', 'other',
]

// Section breaks
const SECTIONS: { afterId: string; label: string }[] = [
  { afterId: 'essay', label: 'Ещё' },
  { afterId: 'independent', label: 'Крупные проекты' },
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

    // Check if previous item triggers a section break
    const prevId = i > 0 ? DISPLAY_ORDER[i - 1] : null
    const sectionBefore = prevId ? sectionMap.get(prevId) : undefined

    result.push({ service, sectionBefore })
    seen.add(id)
  }

  // Catch any new services not in DISPLAY_ORDER
  for (const service of SERVICE_TYPES) {
    if (!seen.has(service.id)) {
      result.push({ service })
    }
  }

  return result
})()

/* ═════════════════════════════════════════════════════════════════════════
   ROOT
   ═════════════════════════════════════════════════════════════════════════ */

export function ServiceTypeStep({
  selected,
  onSelect,
  onUrgentRequest,
}: ServiceTypeStepProps) {
  // Find index to insert assist card (before "Крупные проекты")
  const assistIndex = useMemo(() => {
    return CATALOG.findIndex(item => item.sectionBefore === 'Крупные проекты')
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
      {CATALOG.map(({ service, sectionBefore }, i) => (
        <div key={service.id}>
          {/* Section label */}
          {sectionBefore && (
            <div style={{
              fontSize: FONT.size.xs,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: `0 2px`,
              marginTop: SPACING.lg,
              marginBottom: SPACING.sm,
            }}>
              {sectionBefore}
            </div>
          )}

          {/* Assist card before "Крупные проекты" */}
          {i === assistIndex && onUrgentRequest && (
            <div style={{ marginBottom: SPACING.sm }}>
              <AssistCard onPress={onUrgentRequest} index={i} />
            </div>
          )}

          <ServiceCard
            service={service}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            index={i}
          />
        </div>
      ))}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SERVICE CARD — Unified size, glass style
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
  const isPopular = !!service.popular
  const isCustomPrice = service.priceNum === 0

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), type: 'spring', stiffness: 300, damping: 28 }}
      whileTap={{ scale: TAP_SCALE.card }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: `${SPACING.lg}px ${SPACING.lg}px`,
        borderRadius: RADIUS.md,
        background: selected
          ? 'rgba(201, 162, 39, 0.06)'
          : COLORS.card.bg,
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
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
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
      }}>

        {/* Icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.sm,
          background: selected
            ? 'rgba(201, 162, 39, 0.08)'
            : 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          <Icon
            size={17}
            color={selected ? COLORS.gold.primary : 'var(--text-muted)'}
            strokeWidth={1.7}
          />
        </div>

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
              color: selected ? 'var(--text-primary)' : 'var(--text-primary)',
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
                Хит
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{
            fontSize: FONT.size.sm,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}>
            {service.description}
          </div>
        </div>

        {/* Right: duration + price */}
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

function AssistCard({ onPress, index }: { onPress: () => void; index: number }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: TAP_SCALE.card }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.md}px ${SPACING.lg}px`,
        background: COLORS.assist.bg,
        border: `1px solid ${COLORS.assist.border}`,
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
        background: COLORS.assist.icon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MessageSquare size={16} color="var(--gold-400)" strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: FONT.size.base, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          Не нашли нужное?
        </div>
        <div style={{ fontSize: FONT.size.xs, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
          Опишите задачу — рассчитаем за 5 минут
        </div>
      </div>
      <ArrowRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.3 }} />
    </motion.button>
  )
}
