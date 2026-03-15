import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronRight, Timer, Zap } from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v6 «Unified Catalog»

   Architecture: ONE list, ONE card component, THREE size tiers.
   Hierarchy is communicated through sizing and spacing — not through
   section headers, color systems, or layout modes.

   Tiers:
     hero    → diploma, masters (large cards with descriptions + proof)
     row     → coursework, practice, presentation (medium rows)
     compact → essay, control, independent, report, photo_task, other
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
  onUrgentRequest?: () => void
  minimal?: boolean
}

// ─── Tier assignment ─────────────────────────────────────────────────────

type CardTier = 'hero' | 'row' | 'compact'

function getTier(s: ServiceType): CardTier {
  if (s.category === 'premium') return 'hero'
  if (s.category === 'standard' || s.id === 'presentation') return 'row'
  return 'compact'
}

// ─── Deterministic daily seed (stable per day) ───────────────────────────

function dailySeed(): number {
  const d = new Date()
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return ((day * 2654435761) >>> 0) % 1000
}

// Social proof — varied per service, not repetitive
const SOCIAL_PROOF: Record<string, string> = (() => {
  const s = dailySeed()
  return {
    diploma: `${340 + (s % 30)}+ студентов сдали`,
    masters: `${12 + (s % 6)} магистерских в этом месяце`,
    coursework: `${52 + (s % 20)} курсовых за 30 дней`,
    presentation: `${45 + (s % 15)} на этой неделе`,
  }
})()

// ─── Ordered catalog — hero → row → compact, popular first in tier ──────

const CATALOG: { service: ServiceType; tier: CardTier }[] = (() => {
  const order: string[] = [
    'diploma', 'masters',
    'coursework', 'practice', 'presentation',
    'essay', 'control', 'independent', 'report',
    'photo_task', 'other',
  ]
  return order.map(id => {
    const service = SERVICE_TYPES.find(s => s.id === id)!
    return { service, tier: getTier(service) }
  })
})()

/* ═════════════════════════════════════════════════════════════════════════
   ROOT
   ═════════════════════════════════════════════════════════════════════════ */

export function ServiceTypeStep({
  selected,
  onSelect,
  onAssistRequest,
  onUrgentRequest,
}: ServiceTypeStepProps) {
  const assistHandler = onUrgentRequest || onAssistRequest

  // Determine gap breaks between tiers
  const tierBreaks = useMemo(() => {
    const set = new Set<number>()
    for (let i = 1; i < CATALOG.length; i++) {
      if (CATALOG[i].tier !== CATALOG[i - 1].tier) set.add(i)
    }
    return set
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {CATALOG.map(({ service, tier }, i) => (
        <ServiceCard
          key={service.id}
          service={service}
          tier={tier}
          selected={selected === service.id}
          onSelect={() => onSelect(service.id)}
          index={i}
          proof={SOCIAL_PROOF[service.id]}
          extraGapAbove={tierBreaks.has(i)}
        />
      ))}

      {/* Assist CTA — for users who can't decide */}
      {assistHandler && (
        <AssistCard onPress={assistHandler} />
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SERVICE CARD — One component, three visual tiers
   ═════════════════════════════════════════════════════════════════════════ */

const TIER_CONFIG = {
  hero: {
    padding: '18px 16px',
    iconSize: 44,
    iconRadius: 14,
    titleSize: 16,
    titleWeight: 700,
    priceSize: 15,
    cardRadius: 18,
    showDescription: true,
    showDuration: true,
  },
  row: {
    padding: '14px 16px',
    iconSize: 38,
    iconRadius: 12,
    titleSize: 14.5,
    titleWeight: 700,
    priceSize: 13,
    cardRadius: 16,
    showDescription: true,
    showDuration: true,
  },
  compact: {
    padding: '12px 14px',
    iconSize: 34,
    iconRadius: 10,
    titleSize: 14,
    titleWeight: 600,
    priceSize: 12,
    cardRadius: 14,
    showDescription: false,
    showDuration: false,
  },
} as const

function ServiceCard({
  service,
  tier,
  selected,
  onSelect,
  index,
  proof,
  extraGapAbove,
}: {
  service: ServiceType
  tier: CardTier
  selected: boolean
  onSelect: () => void
  index: number
  proof?: string
  extraGapAbove: boolean
}) {
  const Icon = service.icon
  const cfg = TIER_CONFIG[tier]
  const isPopular = !!service.popular
  const isCustomPrice = service.priceNum === 0

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 28 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: cfg.padding,
        borderRadius: cfg.cardRadius,
        marginTop: extraGapAbove ? 10 : 0,
        background: selected
          ? 'rgba(212,175,55,0.06)'
          : 'rgba(255,255,255,0.015)',
        border: selected
          ? '1.5px solid rgba(212,175,55,0.30)'
          : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
        boxShadow: selected
          ? '0 6px 24px -6px rgba(212,175,55,0.12)'
          : 'none',
        transition: 'border-color 0.25s ease, background 0.25s ease, box-shadow 0.3s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: tier === 'compact' ? 'center' : 'flex-start',
        gap: tier === 'compact' ? 12 : 14,
      }}>

        {/* Icon */}
        <div style={{
          width: cfg.iconSize,
          height: cfg.iconSize,
          borderRadius: cfg.iconRadius,
          background: selected
            ? 'rgba(212,175,55,0.10)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selected ? 'rgba(212,175,55,0.18)' : 'transparent'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.25s ease',
        }}>
          <Icon
            size={tier === 'hero' ? 21 : tier === 'row' ? 18 : 16}
            color={selected ? '#d4af37' : 'rgba(255,255,255,0.35)'}
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
            gap: 8,
            flexWrap: tier === 'compact' ? 'nowrap' : 'wrap',
          }}>
            <span style={{
              fontSize: cfg.titleSize,
              fontWeight: cfg.titleWeight,
              color: selected ? '#fff' : `rgba(255,255,255,${tier === 'compact' ? '0.72' : '0.88'})`,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              transition: 'color 0.2s ease',
            }}>
              {service.label}
            </span>
          </div>

          {/* Description — hero and row only */}
          {cfg.showDescription && (
            <div style={{
              fontSize: tier === 'hero' ? 13 : 12.5,
              color: 'rgba(255,255,255,0.38)',
              lineHeight: 1.45,
              marginTop: 4,
              fontWeight: 500,
            }}>
              {service.description}
            </div>
          )}

          {/* Popular annotation + social proof — hero and row only */}
          {(isPopular || proof) && tier !== 'compact' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              fontSize: 10.5,
              fontWeight: 600,
              color: 'rgba(212,175,55,0.50)',
              lineHeight: 1,
            }}>
              {isPopular && (
                <span>Частый выбор</span>
              )}
              {isPopular && proof && (
                <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
              )}
              {proof && (
                <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>
                  {proof}
                </span>
              )}
            </div>
          )}

          {/* Duration + Price — hero and row */}
          {cfg.showDuration && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
            }}>
              <span style={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.20)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Timer size={10} color="rgba(255,255,255,0.16)" />
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

        {/* Right side — compact: price + indicator; hero/row: just indicator */}
        {tier === 'compact' && (
          <PriceDisplay
            price={service.price}
            isCustom={isCustomPrice}
            selected={selected}
            size={cfg.priceSize}
          />
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
        color: selected ? 'rgba(212,175,55,0.60)' : 'rgba(255,255,255,0.28)',
        whiteSpace: 'nowrap',
        transition: 'color 0.2s ease',
      }}>
        Узнать цену
      </span>
    )
  }

  return (
    <span style={{
      fontSize: size,
      fontWeight: 800,
      fontFamily: "'Manrope', sans-serif",
      color: selected ? '#E8D5A3' : 'rgba(255,255,255,0.45)',
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
    <AnimatePresence mode="wait">
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
            borderRadius: '50%',
            background: '#d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(212,175,55,0.30)',
          }}
        >
          <Check size={13} color="#09090b" strokeWidth={3} />
        </motion.div>
      ) : (
        <motion.div
          key="chevron"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AssistCard({ onPress }: { onPress: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        background: 'linear-gradient(135deg, rgba(96,165,250,0.04), rgba(139,92,246,0.02))',
        border: '1px dashed rgba(96,165,250,0.15)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        marginTop: 4,
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'rgba(96,165,250,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={15} color="#60a5fa" strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#93bbfc', lineHeight: 1.3 }}>
          Сложно выбрать?
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', fontWeight: 500, marginTop: 2 }}>
          Опишите задачу — поможем определиться
        </div>
      </div>
      <ArrowUpRight size={15} color="#60a5fa" style={{ flexShrink: 0, opacity: 0.35 }} />
    </motion.button>
  )
}
