import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Crown,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  X,
  Zap,
  BookOpen,
  Camera,
} from 'lucide-react'
import type { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v5 «Curated Catalog»

   Architecture: Each category renders with its OWN layout:
   - Premium  → Standalone hero cards with social proof
   - Standard → Clean rows in a shared container
   - Express  → 2-column tile grid for same-priced items + full-width specials

   This creates visual rhythm and hierarchy that guides the eye.
   Premium feels premium. Express feels fast. Standard feels reliable.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
  onUrgentRequest?: () => void
  minimal?: boolean
}

// ─── Deterministic daily "random" (same value all day, changes daily) ───
function dailySeed(): number {
  const now = new Date()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  )
  return ((dayOfYear * 2654435761) >>> 0) % 1000
}

// Social proof numbers — deterministic, change daily, feel real
const SOCIAL_PROOF: Record<string, { count: number; label: string }> = (() => {
  const seed = dailySeed()
  return {
    diploma: { count: 38 + (seed % 15), label: 'заказов за месяц' },
    coursework: { count: 52 + (seed % 20), label: 'заказов за месяц' },
    presentation: { count: 24 + (seed % 12), label: 'заказов за месяц' },
  }
})()

function getSearchableText(service: ServiceType) {
  return `${service.label} ${service.description} ${service.price} ${service.duration}`.toLowerCase()
}

/* ═════════════════════════════════════════════════════════════════════════
   ROOT
   ═════════════════════════════════════════════════════════════════════════ */

export function ServiceTypeStep({
  selected,
  onSelect,
  onAssistRequest,
  onUrgentRequest,
  minimal = false,
}: ServiceTypeStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const search = searchQuery.trim().toLowerCase()
  const handleUrgentRequest = onUrgentRequest || onAssistRequest

  // When searching, flatten everything into a simple list
  const filteredServices = useMemo(() => {
    if (!search) return null
    return SERVICE_TYPES.filter(s => getSearchableText(s).includes(search))
  }, [search])

  const premiumServices = useMemo(
    () => SERVICE_TYPES.filter(s => s.category === 'premium'),
    [],
  )
  const standardServices = useMemo(
    () => SERVICE_TYPES.filter(s => s.category === 'standard'),
    [],
  )
  const expressServices = useMemo(
    () => SERVICE_TYPES.filter(s => s.category === 'express'),
    [],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Search ── */}
      {!minimal && (
        <CatalogSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      )}

      {/* ── Flat search results ── */}
      {filteredServices ? (
        filteredServices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredServices.map(service => (
              <FlatSearchRow
                key={service.id}
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
              />
            ))}
          </div>
        ) : (
          <EmptySearchState onReset={() => setSearchQuery('')} />
        )
      ) : (
        /* ── Curated catalog ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* ══════ PREMIUM — Hero cards ══════ */}
          <PremiumSection
            services={premiumServices}
            selected={selected}
            onSelect={onSelect}
          />

          {/* ── Trust divider ── */}
          {!minimal && <TrustDivider />}

          {/* ══════ STANDARD — Clean rows ══════ */}
          <StandardSection
            services={standardServices}
            selected={selected}
            onSelect={onSelect}
          />

          {/* ══════ EXPRESS — Tile grid + specials ══════ */}
          <ExpressSection
            services={expressServices}
            selected={selected}
            onSelect={onSelect}
          />
        </div>
      )}

      {/* ── Assist CTA ── */}
      {handleUrgentRequest && !search && (
        <AssistCard onPress={handleUrgentRequest} />
      )}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   PREMIUM SECTION — Each service is a standalone hero card
   ═════════════════════════════════════════════════════════════════════════ */

function PremiumSection({
  services,
  selected,
  onSelect,
}: {
  services: ServiceType[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}
    >
      {/* Section label */}
      <SectionLabel
        icon={Crown}
        title="Дипломные и диссертации"
        accent="#d4af37"
      />

      {services.map((service, i) => (
        <PremiumCard
          key={service.id}
          service={service}
          selected={selected === service.id}
          onSelect={() => onSelect(service.id)}
          index={i}
          isFlagship={!!service.popular}
        />
      ))}
    </motion.div>
  )
}

function PremiumCard({
  service,
  selected,
  onSelect,
  index,
  isFlagship,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  index: number
  isFlagship: boolean
}) {
  const Icon = service.icon
  const proof = SOCIAL_PROOF[service.id]

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: isFlagship ? '20px 18px' : '16px 16px',
        borderRadius: 18,
        background: selected
          ? 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.03) 100%)'
          : 'rgba(255,255,255,0.02)',
        border: selected
          ? '1.5px solid rgba(212,175,55,0.30)'
          : `1px solid rgba(212,175,55,${isFlagship ? '0.15' : '0.08'})`,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        boxShadow: selected
          ? '0 8px 32px -8px rgba(212,175,55,0.15)'
          : 'none',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: isFlagship ? 16 : 24,
        right: isFlagship ? 16 : 24,
        height: selected ? 2 : 1,
        background: `linear-gradient(90deg, transparent, rgba(212,175,55,${selected ? '0.5' : '0.20'}), transparent)`,
        transition: 'height 0.2s ease',
      }} />

      {/* Flagship shimmer */}
      {isFlagship && !selected && (
        <motion.div
          animate={{ x: ['-100%', '250%'] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '30%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.03), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: isFlagship ? 48 : 42,
          height: isFlagship ? 48 : 42,
          borderRadius: isFlagship ? 16 : 13,
          background: selected
            ? 'rgba(212,175,55,0.14)'
            : 'rgba(212,175,55,0.06)',
          border: `1px solid rgba(212,175,55,${selected ? '0.25' : '0.10'})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}>
          <Icon
            size={isFlagship ? 22 : 18}
            color={selected ? '#d4af37' : 'rgba(212,175,55,0.55)'}
            strokeWidth={1.5}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 5,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: isFlagship ? 16 : 15,
              fontWeight: 700,
              color: selected ? '#fff' : 'rgba(255,255,255,0.88)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}>
              {service.label}
            </span>

            {isFlagship && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 8px',
                borderRadius: 999,
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.15)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#d4af37',
                lineHeight: 1,
              }}>
                <Star size={7} fill="#d4af37" color="#d4af37" />
                частый выбор
              </span>
            )}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.42)',
            lineHeight: 1.5,
            marginBottom: 10,
            fontWeight: 500,
          }}>
            {service.description}
          </div>

          {/* Bottom row: duration + price + social proof */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Timer size={10} color="rgba(255,255,255,0.18)" />
                {service.duration}
              </span>

              {proof && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'rgba(34,197,94,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}>
                  <TrendingUp size={9} />
                  {proof.count} {proof.label}
                </span>
              )}
            </div>

            <span style={{
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Manrope', sans-serif",
              color: selected ? '#E8D5A3' : 'rgba(255,255,255,0.55)',
              letterSpacing: '-0.02em',
              transition: 'color 0.2s ease',
            }}>
              {service.price}
            </span>
          </div>
        </div>

        {/* Selection indicator */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(212,175,55,0.35)',
                marginTop: 2,
              }}
            >
              <Check size={14} color="#09090b" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chevron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.25 }}
              exit={{ opacity: 0 }}
              style={{ flexShrink: 0, marginTop: 4 }}
            >
              <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   TRUST DIVIDER — Micro-guarantees between premium and standard
   ═════════════════════════════════════════════════════════════════════════ */

function TrustDivider() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        marginBottom: 14,
      }}
    >
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        {[
          { icon: ShieldCheck, text: '3 правки' },
          { icon: Timer, text: '98% в срок' },
          { icon: Sparkles, text: 'С нуля' },
        ].map(item => {
          const Ic = item.icon
          return (
            <span
              key={item.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.22)',
                whiteSpace: 'nowrap',
              }}
            >
              <Ic size={10} color="rgba(212,175,55,0.30)" strokeWidth={2} />
              {item.text}
            </span>
          )
        })}
      </div>
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      }} />
    </motion.div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   STANDARD SECTION — Reliable rows in a shared container
   ═════════════════════════════════════════════════════════════════════════ */

function StandardSection({
  services,
  selected,
  onSelect,
}: {
  services: ServiceType[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, type: 'spring', stiffness: 280, damping: 28 }}
      style={{ marginBottom: 24 }}
    >
      <SectionLabel
        icon={BookOpen}
        title="Учебные работы"
        accent="#c9a96e"
      />

      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(201,169,110,0.18)',
        background: 'rgba(255,255,255,0.015)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 1.5,
          background: 'linear-gradient(90deg, rgba(201,169,110,0.4), transparent)',
        }} />

        {services.map((service, i) => (
          <StandardRow
            key={service.id}
            service={service}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            isLast={i === services.length - 1}
          />
        ))}
      </div>
    </motion.div>
  )
}

function StandardRow({
  service,
  selected,
  onSelect,
  isLast,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  isLast: boolean
}) {
  const Icon = service.icon
  const proof = SOCIAL_PROOF[service.id]

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: selected ? 'rgba(201,169,110,0.07)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transition: 'background 0.2s',
        touchAction: 'pan-y',
      }}
    >
      {selected && (
        <motion.div
          layoutId="std-bar"
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 3,
            background: '#c9a96e',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: selected ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${selected ? 'rgba(201,169,110,0.20)' : 'transparent'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
        }}>
          <Icon size={18} color={selected ? '#c9a96e' : 'rgba(255,255,255,0.35)'} strokeWidth={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginBottom: 4, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.80)',
              letterSpacing: '-0.01em',
            }}>
              {service.label}
            </span>
            {service.popular && (
              <span style={{
                padding: '2px 6px', borderRadius: 999,
                background: 'rgba(201,169,110,0.10)',
                fontSize: 9, fontWeight: 700, color: '#c9a96e',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                <Sparkles size={7} color="#c9a96e" style={{ marginRight: 2, verticalAlign: -1 }} />
                популярное
              </span>
            )}
          </div>

          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.4, marginBottom: 5, fontWeight: 500,
          }}>
            {service.description}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.22)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Timer size={10} color="rgba(255,255,255,0.16)" />
                {service.duration}
              </span>
              {proof && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'rgba(34,197,94,0.50)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <TrendingUp size={9} />
                  {proof.count}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 13, fontWeight: 800,
              fontFamily: "'Manrope', sans-serif",
              color: selected ? '#c9a96e' : 'rgba(255,255,255,0.45)',
              transition: 'color 0.2s',
            }}>
              {service.price}
            </span>
          </div>
        </div>

        <SelectionIndicator selected={selected} color="#c9a96e" />
      </div>
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   EXPRESS SECTION — Compact tiles + special cards
   ═════════════════════════════════════════════════════════════════════════ */

function ExpressSection({
  services,
  selected,
  onSelect,
}: {
  services: ServiceType[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  // Split: regular tiles (same price) vs special items
  const tiles = services.filter(s =>
    s.priceNum === 2500 && s.id !== 'photo_task',
  )
  const specials = services.filter(s =>
    s.priceNum !== 2500 || s.id === 'photo_task',
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, type: 'spring', stiffness: 280, damping: 28 }}
      style={{ marginBottom: 16 }}
    >
      <SectionLabel
        icon={Zap}
        title="Быстрые задачи"
        accent="#5cb89a"
        subtitle="от 1 дня"
      />

      {/* 2-column tile grid */}
      {tiles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginBottom: specials.length > 0 ? 10 : 0,
        }}>
          {tiles.map((service, i) => (
            <ExpressTile
              key={service.id}
              service={service}
              selected={selected === service.id}
              onSelect={() => onSelect(service.id)}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Special full-width items */}
      {specials.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {specials.map(service => (
            service.id === 'photo_task'
              ? <PhotoTaskCard
                  key={service.id}
                  service={service}
                  selected={selected === service.id}
                  onSelect={() => onSelect(service.id)}
                />
              : <ExpressSpecialRow
                  key={service.id}
                  service={service}
                  selected={selected === service.id}
                  onSelect={() => onSelect(service.id)}
                />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function ExpressTile({
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

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 + index * 0.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      style={{
        padding: '16px 14px',
        borderRadius: 14,
        background: selected
          ? 'rgba(92,184,154,0.08)'
          : 'rgba(255,255,255,0.02)',
        border: selected
          ? '1.5px solid rgba(92,184,154,0.30)'
          : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Selection checkmark — top right */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          style={{
            position: 'absolute',
            top: 10, right: 10,
            width: 22, height: 22, borderRadius: '50%',
            background: '#5cb89a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(92,184,154,0.30)',
          }}
        >
          <Check size={11} color="#09090b" strokeWidth={3} />
        </motion.div>
      )}

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: selected ? 'rgba(92,184,154,0.12)' : 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        <Icon
          size={17}
          color={selected ? '#5cb89a' : 'rgba(255,255,255,0.35)'}
          strokeWidth={1.6}
        />
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
          marginBottom: 3, lineHeight: 1.3,
        }}>
          {service.label}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 4,
        }}>
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Timer size={9} color="rgba(255,255,255,0.16)" />
            {service.duration}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: "'Manrope', sans-serif",
            color: selected ? '#5cb89a' : 'rgba(255,255,255,0.40)',
            transition: 'color 0.2s',
          }}>
            {service.price}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

function ExpressSpecialRow({
  service,
  selected,
  onSelect,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
}) {
  const Icon = service.icon
  const proof = SOCIAL_PROOF[service.id]

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        background: selected ? 'rgba(92,184,154,0.07)' : 'rgba(255,255,255,0.02)',
        border: selected
          ? '1.5px solid rgba(92,184,154,0.25)'
          : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        touchAction: 'pan-y',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: selected ? 'rgba(92,184,154,0.12)' : 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color={selected ? '#5cb89a' : 'rgba(255,255,255,0.35)'} strokeWidth={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          marginBottom: 4, flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.78)',
          }}>
            {service.label}
          </span>
          {service.popular && (
            <span style={{
              padding: '2px 6px', borderRadius: 999,
              background: 'rgba(92,184,154,0.10)',
              fontSize: 9, fontWeight: 700, color: '#5cb89a',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              <Sparkles size={7} color="#5cb89a" style={{ marginRight: 2, verticalAlign: -1 }} />
              популярное
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.4, marginBottom: 5, fontWeight: 500,
        }}>
          {service.description}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Timer size={10} color="rgba(255,255,255,0.16)" />
              {service.duration}
            </span>
            {proof && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'rgba(34,197,94,0.50)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <TrendingUp size={9} />
                {proof.count}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 800,
            fontFamily: "'Manrope', sans-serif",
            color: selected ? '#5cb89a' : 'rgba(255,255,255,0.45)',
          }}>
            {service.price}
          </span>
        </div>
      </div>
      <SelectionIndicator selected={selected} color="#5cb89a" />
    </motion.button>
  )
}

function PhotoTaskCard({
  service,
  selected,
  onSelect,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '16px 16px',
        borderRadius: 14,
        background: selected
          ? 'rgba(92,184,154,0.07)'
          : 'linear-gradient(135deg, rgba(96,165,250,0.04), rgba(139,92,246,0.03))',
        border: selected
          ? '1.5px solid rgba(92,184,154,0.25)'
          : '1px solid rgba(96,165,250,0.12)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 13,
        background: selected
          ? 'rgba(92,184,154,0.12)'
          : 'linear-gradient(135deg, rgba(96,165,250,0.10), rgba(139,92,246,0.08))',
        border: `1px solid ${selected ? 'rgba(92,184,154,0.20)' : 'rgba(96,165,250,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Camera size={19} color={selected ? '#5cb89a' : '#60a5fa'} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.78)',
          marginBottom: 3,
        }}>
          {service.label}
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.4, fontWeight: 500,
        }}>
          {service.description}
        </div>
      </div>
      <SelectionIndicator selected={selected} color="#5cb89a" />
    </motion.button>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═════════════════════════════════════════════════════════════════════════ */

function SectionLabel({
  icon: Icon,
  title,
  accent,
  subtitle,
}: {
  icon: typeof Crown
  title: string
  accent: string
  subtitle?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10,
    }}>
      <Icon size={14} color={accent} strokeWidth={1.8} />
      <span style={{
        fontSize: 13, fontWeight: 700, color: accent,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </span>
      {subtitle && (
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.25)',
          fontWeight: 500,
        }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function SelectionIndicator({ selected, color }: { selected: boolean; color: string }) {
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
            width: 26, height: 26, borderRadius: '50%',
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${color}30`,
          }}
        >
          <Check size={13} color="#09090b" strokeWidth={3} />
        </motion.div>
      ) : (
        <motion.div
          key="chevron"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          exit={{ opacity: 0 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CatalogSearch({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
    }}>
      <Search size={16} color="rgba(255,255,255,0.22)" style={{ flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Найти услугу..."
        style={{
          flex: 1, border: 'none', outline: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 14, fontFamily: "'Manrope', sans-serif",
        }}
      />
      {value && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          style={{
            width: 22, height: 22, borderRadius: 999, border: 'none',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={11} color="rgba(255,255,255,0.4)" />
        </motion.button>
      )}
    </div>
  )
}

function FlatSearchRow({
  service,
  selected,
  onSelect,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
}) {
  const Icon = service.icon
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 14,
        background: selected ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
        border: selected ? '1px solid rgba(212,175,55,0.20)' : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        touchAction: 'pan-y',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color="rgba(255,255,255,0.40)" strokeWidth={1.6} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.82)', marginBottom: 2 }}>
          {service.label}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', display: 'flex', gap: 8 }}>
          <span>{service.duration}</span>
          <span style={{ fontWeight: 700 }}>{service.price}</span>
        </div>
      </div>
      <SelectionIndicator selected={selected} color="#d4af37" />
    </motion.button>
  )
}

function AssistCard({ onPress }: { onPress: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(96,165,250,0.05), rgba(139,92,246,0.03))',
        border: '1px dashed rgba(96,165,250,0.18)',
        borderRadius: 16,
        cursor: 'pointer', textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        marginTop: 6,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: 'rgba(96,165,250,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={17} color="#60a5fa" strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#93bbfc', marginBottom: 3 }}>
          Не нашли нужное?
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>
          Опишите задачу — подберём формат и автора
        </div>
      </div>
      <ArrowUpRight size={16} color="#60a5fa" style={{ flexShrink: 0, opacity: 0.4 }} />
    </motion.button>
  )
}

function EmptySearchState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '32px 20px', borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Search size={20} color="rgba(255,255,255,0.25)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.80)', marginBottom: 6 }}>
        Ничего не найдено
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
        Попробуйте другой запрос или посмотрите весь каталог
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onReset}
        style={{
          padding: '10px 18px', borderRadius: 12,
          border: '1px solid rgba(212,175,55,0.20)',
          background: 'rgba(212,175,55,0.06)',
          color: '#d4af37', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Показать все
      </motion.button>
    </motion.div>
  )
}
