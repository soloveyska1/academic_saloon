import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, Timer, Zap } from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import { SPACING, RADIUS, COLORS, FONT, ICON_BOX, TAP_SCALE } from './design-tokens'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v7 «Совет Салуна»

   Architecture: ONE list, ONE card component, THREE size tiers.
   Hierarchy through sizing, background, and spacing — not section headers.

   Fixes from v6:
   - Design tokens integrated (zero magic numbers)
   - CSS variables for theme support (var(--text-main), var(--text-muted))
   - Stronger visual tier differentiation
   - Compact cards show description + duration
   - Stronger selection state
   - Fake social proof replaced with value descriptors
   - AssistCard moved between row/compact tiers
   - AnimatePresence mode="popLayout" for snappy selection
   - CATALOG auto-syncs with SERVICE_TYPES (no silent drops)
   - Dead props removed
   - Wild West flavor in header + AssistCard

   Tiers:
     hero    → diploma, masters (large cards, prominent)
     row     → coursework, practice, presentation (medium)
     compact → essay, control, independent, report, photo_task, other
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onUrgentRequest?: () => void
}

// ─── Tier assignment ─────────────────────────────────────────────────────

type CardTier = 'hero' | 'row' | 'compact'

const TIER_BY_CATEGORY: Record<string, CardTier> = {
  premium: 'hero',
  standard: 'row',
}

// Express services that deserve row treatment
const ROW_OVERRIDES = new Set(['presentation'])

function getTier(s: ServiceType): CardTier {
  if (ROW_OVERRIDES.has(s.id)) return 'row'
  return TIER_BY_CATEGORY[s.category] ?? 'compact'
}

// ─── Value descriptors (replace fake social proof) ───────────────────────

const VALUE_DESCRIPTORS: Record<string, string> = {
  diploma: 'Сопровождаем до защиты',
  masters: 'С научной новизной',
  coursework: 'Теория + практика',
  presentation: 'Слайды + речь для выступления',
}

// ─── Ordered catalog — auto-synced with SERVICE_TYPES ────────────────────

const PREFERRED_ORDER: string[] = [
  'diploma', 'masters',
  'coursework', 'practice', 'presentation',
  'essay', 'control', 'independent', 'report',
  'photo_task', 'other',
]

const CATALOG: { service: ServiceType; tier: CardTier }[] = (() => {
  const byId = new Map(SERVICE_TYPES.map(s => [s.id, s]))
  const result: { service: ServiceType; tier: CardTier }[] = []
  const seen = new Set<string>()

  // Add in preferred order
  for (const id of PREFERRED_ORDER) {
    const service = byId.get(id)
    if (service) {
      result.push({ service, tier: getTier(service) })
      seen.add(id)
    }
  }

  // Add any new services not in PREFERRED_ORDER (fallback — never silently drop)
  for (const service of SERVICE_TYPES) {
    if (!seen.has(service.id)) {
      result.push({ service, tier: getTier(service) })
    }
  }

  return result
})()

// Index where AssistCard should appear (between row and compact tiers)
const ASSIST_INSERT_INDEX = CATALOG.findIndex(
  (item, i) => i > 0 && item.tier === 'compact' && CATALOG[i - 1].tier !== 'compact'
)

/* ═════════════════════════════════════════════════════════════════════════
   ROOT
   ═════════════════════════════════════════════════════════════════════════ */

export function ServiceTypeStep({
  selected,
  onSelect,
  onUrgentRequest,
}: ServiceTypeStepProps) {
  // Determine tier breaks for visual spacing
  const tierBreaks = useMemo(() => {
    const set = new Set<number>()
    for (let i = 1; i < CATALOG.length; i++) {
      if (CATALOG[i].tier !== CATALOG[i - 1].tier) set.add(i)
    }
    return set
  }, [])

  // Section labels for tier transitions
  const tierLabels: Record<number, string> = useMemo(() => {
    const labels: Record<number, string> = {}
    for (const idx of tierBreaks) {
      const tier = CATALOG[idx].tier
      if (tier === 'row') labels[idx] = 'Популярное'
      if (tier === 'compact') labels[idx] = 'Быстрые работы'
    }
    return labels
  }, [tierBreaks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
      {/* Header */}
      <div style={{
        fontSize: FONT.size.md,
        color: 'var(--text-secondary, rgba(255,255,255,0.45))',
        padding: `0 ${SPACING.xs}px`,
        marginBottom: SPACING.xs,
        fontWeight: 500,
      }}>
        Что закажем, партнёр?
      </div>

      {CATALOG.map(({ service, tier }, i) => (
        <div key={service.id}>
          {/* Tier section label */}
          {tierLabels[i] && (
            <div style={{
              fontSize: FONT.size['2xs'],
              fontWeight: 700,
              color: 'var(--text-muted, rgba(255,255,255,0.22))',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: `0 ${SPACING.xs}px`,
              marginTop: SPACING.lg,
              marginBottom: SPACING.sm,
            }}>
              {tierLabels[i]}
            </div>
          )}

          <ServiceCard
            service={service}
            tier={tier}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            index={i}
            descriptor={VALUE_DESCRIPTORS[service.id]}
          />

          {/* AssistCard between row and compact tiers */}
          {i === ASSIST_INSERT_INDEX - 1 && onUrgentRequest && (
            <div style={{ marginTop: SPACING.md }}>
              <AssistCard onPress={onUrgentRequest} index={i + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SERVICE CARD — One component, three visual tiers
   ═════════════════════════════════════════════════════════════════════════ */

const TIER_CONFIG = {
  hero: {
    padding: `${SPACING.xl}px ${SPACING.lg + 2}px`,
    iconSize: ICON_BOX.xl,
    iconRadius: RADIUS['2xl'],
    titleSize: FONT.size['2xl'],
    titleWeight: 800,
    priceSize: FONT.size.xl,
    cardRadius: RADIUS['3xl'],
    showDuration: true,
    cardBg: COLORS.card.bgSubtle,
    cardBorder: COLORS.card.border,
  },
  row: {
    padding: `${SPACING.lg - 2}px ${SPACING.lg}px`,
    iconSize: ICON_BOX.md,
    iconRadius: RADIUS.lg,
    titleSize: FONT.size.base,
    titleWeight: 700,
    priceSize: FONT.size.md,
    cardRadius: RADIUS.xl,
    showDuration: true,
    cardBg: COLORS.card.bg,
    cardBorder: COLORS.card.border,
  },
  compact: {
    padding: `${SPACING.md}px ${SPACING.lg - 2}px`,
    iconSize: ICON_BOX.sm + 2,
    iconRadius: RADIUS.sm,
    titleSize: FONT.size.md,
    titleWeight: 600,
    priceSize: FONT.size.sm,
    cardRadius: RADIUS.lg,
    showDuration: true,
    cardBg: 'transparent',
    cardBorder: COLORS.card.borderSubtle,
  },
} as const

function ServiceCard({
  service,
  tier,
  selected,
  onSelect,
  index,
  descriptor,
}: {
  service: ServiceType
  tier: CardTier
  selected: boolean
  onSelect: () => void
  index: number
  descriptor?: string
}) {
  const Icon = service.icon
  const cfg = TIER_CONFIG[tier]
  const isPopular = !!service.popular
  const isCustomPrice = service.priceNum === 0

  // Stagger: visible for hero/row, compact appears together
  const delay = tier === 'compact'
    ? Math.min(0.22 + (index - ASSIST_INSERT_INDEX) * 0.02, 0.4)
    : index * 0.06

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 28 }}
      whileTap={{ scale: tier === 'compact' ? TAP_SCALE.tile : TAP_SCALE.card }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: cfg.padding,
        borderRadius: cfg.cardRadius,
        background: selected
          ? COLORS.gold.soft
          : cfg.cardBg,
        border: selected
          ? `2px solid ${COLORS.gold.borderStrong}`
          : `1px solid ${cfg.cardBorder}`,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
        boxShadow: selected
          ? `0 6px 24px -4px ${COLORS.gold.shadow}`
          : 'none',
        transition: 'border-color 0.25s ease, background 0.25s ease, box-shadow 0.3s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: tier === 'compact' ? SPACING.md : SPACING.lg - 2,
      }}>

        {/* Icon */}
        <div style={{
          width: cfg.iconSize,
          height: cfg.iconSize,
          borderRadius: cfg.iconRadius,
          background: selected
            ? COLORS.gold.soft
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${selected ? COLORS.gold.border : 'transparent'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}>
          <Icon
            size={tier === 'hero' ? 22 : tier === 'row' ? 18 : 15}
            color={selected ? COLORS.gold.primary : 'var(--text-muted, rgba(255,255,255,0.50))'}
            strokeWidth={1.6}
            style={{ transition: 'color 0.2s ease' }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
          }}>
            <span style={{
              fontSize: cfg.titleSize,
              fontWeight: cfg.titleWeight,
              color: selected
                ? 'var(--text-main, #fff)'
                : `var(--text-main, rgba(255,255,255,${tier === 'compact' ? '0.75' : '0.90'}))`,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              transition: 'color 0.2s ease',
            }}>
              {service.label}
            </span>

            {/* Popular badge */}
            {isPopular && tier !== 'compact' && (
              <span style={{
                padding: `2px ${SPACING.sm}px`,
                borderRadius: RADIUS.sm - 2,
                background: COLORS.gold.soft,
                color: COLORS.gold.badge,
                fontSize: FONT.size['2xs'],
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}>
                Хит
              </span>
            )}
          </div>

          {/* Description — all tiers now (compact: single line) */}
          <div style={{
            fontSize: tier === 'hero' ? FONT.size.md : FONT.size.sm,
            color: 'var(--text-muted, rgba(255,255,255,0.40))',
            lineHeight: 1.45,
            marginTop: 3,
            fontWeight: 500,
            ...(tier === 'compact' ? {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            } : {}),
          }}>
            {service.description}
          </div>

          {/* Value descriptor — hero only */}
          {descriptor && tier === 'hero' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm - 2,
              marginTop: SPACING.sm,
              fontSize: FONT.size.xs,
              fontWeight: 600,
              color: COLORS.gold.badge,
              lineHeight: 1,
            }}>
              <span>{descriptor}</span>
            </div>
          )}

          {/* Duration + Price — hero and row */}
          {tier !== 'compact' && cfg.showDuration && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: SPACING.md - 2,
            }}>
              <span style={{
                fontSize: FONT.size['2xs'],
                color: 'var(--text-muted, rgba(255,255,255,0.25))',
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.xs,
              }}>
                <Timer size={10} color="var(--text-muted, rgba(255,255,255,0.20))" />
                {service.duration}
              </span>
              <PriceDisplay
                price={service.price}
                isCustom={isCustomPrice}
                selected={selected}
                size={cfg.priceSize}
              />
            </div>
          )}
        </div>

        {/* Right side — compact: duration + price + indicator */}
        {tier === 'compact' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: FONT.size.xs,
              color: 'var(--text-muted, rgba(255,255,255,0.22))',
              whiteSpace: 'nowrap',
            }}>
              {service.duration}
            </span>
            <PriceDisplay
              price={service.price}
              isCustom={isCustomPrice}
              selected={selected}
              size={cfg.priceSize}
            />
          </div>
        )}

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
  size,
}: {
  price: string
  isCustom: boolean
  selected: boolean
  size: number
}) {
  if (isCustom) {
    return (
      <span style={{
        fontSize: size - 1,
        fontWeight: 600,
        color: selected ? COLORS.gold.badge : 'var(--text-muted, rgba(255,255,255,0.28))',
        whiteSpace: 'nowrap',
        transition: 'color 0.2s ease',
      }}>
        По запросу
      </span>
    )
  }

  return (
    <span style={{
      fontSize: size,
      fontWeight: 800,
      fontFamily: FONT.family.sans,
      color: selected ? COLORS.gold.light : 'var(--text-secondary, rgba(255,255,255,0.50))',
      letterSpacing: '-0.02em',
      whiteSpace: 'nowrap',
      transition: 'color 0.2s ease',
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
            width: SPACING['2xl'],
            height: SPACING['2xl'],
            borderRadius: RADIUS.full,
            background: COLORS.gold.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 14px ${COLORS.gold.shadow}`,
          }}
        >
          <Check size={13} color="#09090b" strokeWidth={3} />
        </motion.div>
      ) : (
        <motion.div
          key="chevron"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronRight size={16} color="var(--text-muted, rgba(255,255,255,0.30))" />
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
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: TAP_SCALE.card }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        padding: `${SPACING.md + 1}px ${SPACING.lg}px`,
        background: `linear-gradient(135deg, ${COLORS.assist.bg}, rgba(139,92,246,0.02))`,
        border: `1px dashed ${COLORS.assist.border}`,
        borderRadius: RADIUS.xl,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: ICON_BOX.md - 2,
        height: ICON_BOX.md - 2,
        borderRadius: RADIUS.md,
        background: COLORS.assist.icon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={15} color={COLORS.assist.primary} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: FONT.size.md, fontWeight: 700, color: COLORS.assist.text, lineHeight: 1.3 }}>
          Не нашли нужное, партнёр?
        </div>
        <div style={{ fontSize: FONT.size.xs + 0.5, color: 'var(--text-muted, rgba(255,255,255,0.28))', fontWeight: 500, marginTop: 2 }}>
          Опишите задачу — рассчитаем за 5 минут
        </div>
      </div>
      <ArrowUpRight size={15} color={COLORS.assist.primary} style={{ flexShrink: 0, opacity: 0.35 }} />
    </motion.button>
  )
}
