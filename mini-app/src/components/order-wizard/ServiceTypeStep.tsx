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
  Timer,
  X,
  Zap,
  BookOpen,
} from 'lucide-react'
import { ServiceCategory, ServiceType } from './types'
import { SERVICE_TYPES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v4 «Guru-level catalog»

   Principles:
   - Premium services get flagship treatment (expanded card, social proof)
   - Smart hierarchy: popular items bubble up, categories feel distinct
   - Every service row sells, not just lists
   - Selection is visually satisfying (color, animation, haptic)
   - Trust signals embedded: guarantees, speed, quality metrics
   ═══════════════════════════════════════════════════════════════════════════ */

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
  onUrgentRequest?: () => void
  minimal?: boolean
}

type SectionMeta = {
  category: ServiceCategory
  title: string
  subtitle: string
  accent: string
  accentSoft: string
  accentBorder: string
  icon: typeof Crown
}

const SECTION_ORDER: ServiceCategory[] = ['premium', 'standard', 'express']

const SECTION_META: Record<ServiceCategory, SectionMeta> = {
  premium: {
    category: 'premium',
    title: 'Дипломные и диссертации',
    subtitle: 'Полное сопровождение до защиты',
    accent: '#d4af37',
    accentSoft: 'rgba(212, 175, 55, 0.10)',
    accentBorder: 'rgba(212, 175, 55, 0.25)',
    icon: Crown,
  },
  standard: {
    category: 'standard',
    title: 'Учебные работы',
    subtitle: 'Надёжно и в срок',
    accent: '#c9a96e',
    accentSoft: 'rgba(201, 169, 110, 0.08)',
    accentBorder: 'rgba(201, 169, 110, 0.20)',
    icon: BookOpen,
  },
  express: {
    category: 'express',
    title: 'Быстрые задачи',
    subtitle: 'От 1 дня',
    accent: '#5cb89a',
    accentSoft: 'rgba(92, 184, 154, 0.08)',
    accentBorder: 'rgba(92, 184, 154, 0.20)',
    icon: Zap,
  },
}

const SERVICE_ORDER = new Map(SERVICE_TYPES.map((service, index) => [service.id, index]))

function getOrderedServices(services: ServiceType[], category: ServiceCategory) {
  return [...services].sort((left, right) => {
    if (category !== 'premium') {
      const popularityDiff = Number(Boolean(right.popular)) - Number(Boolean(left.popular))
      if (popularityDiff !== 0) return popularityDiff
    }
    return (SERVICE_ORDER.get(left.id) ?? 0) - (SERVICE_ORDER.get(right.id) ?? 0)
  })
}

function getSearchableText(service: ServiceType) {
  return `${service.label} ${service.description} ${service.price} ${service.duration}`.toLowerCase()
}

/* ─────────────────────────────────────────────────────────────────────────
   ROOT
   ───────────────────────────────────────────────────────────────────────── */

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

  const sections = useMemo(() => {
    return SECTION_ORDER.map((category) => {
      const meta = SECTION_META[category]
      const baseServices = SERVICE_TYPES.filter(service => service.category === category)
      const visibleServices = search
        ? baseServices.filter(service => getSearchableText(service).includes(search))
        : baseServices

      return {
        ...meta,
        services: getOrderedServices(visibleServices, category),
      }
    }).filter(section => section.services.length > 0)
  }, [search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* ── Trust strip — mini guarantees above catalog ── */}
      {!minimal && !search && <TrustStrip />}

      {/* ── Search ── */}
      {!minimal && (
        <CatalogSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      )}

      {/* ── Sections ── */}
      {sections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {sections.map((section, index) => (
            <ServiceSection
              key={section.category}
              section={section}
              selected={selected}
              onSelect={onSelect}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptySearchState onReset={() => setSearchQuery('')} />
      )}

      {/* ── Urgent request CTA ── */}
      {handleUrgentRequest && (
        <UrgentRequestCard onPress={handleUrgentRequest} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   TRUST STRIP — 3 mini-guarantees for confidence
   ───────────────────────────────────────────────────────────────────────── */

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, text: '3 правки бесплатно' },
    { icon: Timer, text: '98% в срок' },
    { icon: Sparkles, text: 'Пишем с нуля' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '10px 0 6px',
      }}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon size={12} color="rgba(212, 175, 55, 0.45)" strokeWidth={2} />
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.32)',
              whiteSpace: 'nowrap',
            }}>
              {item.text}
            </span>
          </div>
        )
      })}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SEARCH
   ───────────────────────────────────────────────────────────────────────── */

function CatalogSearch({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 14px',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 14,
    }}>
      <Search size={16} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Найти услугу..."
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 14,
          fontFamily: "'Manrope', sans-serif",
        }}
      />
      {value && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={11} color="rgba(255,255,255,0.4)" />
        </motion.button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SECTION — Category group with distinct visual identity
   ───────────────────────────────────────────────────────────────────────── */

function ServiceSection({
  section,
  selected,
  onSelect,
  index,
}: {
  section: SectionMeta & { services: ServiceType[] }
  selected: string | null
  onSelect: (id: string) => void
  index: number
}) {
  const SectionIcon = section.icon

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 280, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 10,
          background: section.accentSoft,
          border: `1px solid ${section.accentBorder}`,
        }}>
          <SectionIcon size={13} color={section.accent} strokeWidth={1.8} />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: section.accent,
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}>
            {section.title}
          </span>
        </div>
        <span style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.30)',
          lineHeight: 1,
          fontWeight: 500,
        }}>
          {section.subtitle}
        </span>
      </div>

      {/* Service rows */}
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${section.accentBorder}`,
        background: 'rgba(255, 255, 255, 0.015)',
        position: 'relative',
      }}>
        {/* Colored top accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${section.accent}90, transparent)`,
        }} />

        {section.services.map((service, i) => (
          <ServiceRow
            key={service.id}
            service={service}
            sectionMeta={section}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            isLast={i === section.services.length - 1}
          />
        ))}
      </div>
    </motion.section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SERVICE ROW — Rich, informative, with satisfying selection
   ───────────────────────────────────────────────────────────────────────── */

function ServiceRow({
  service,
  sectionMeta,
  selected,
  onSelect,
  isLast,
}: {
  service: ServiceType
  sectionMeta: SectionMeta
  selected: boolean
  onSelect: () => void
  isLast: boolean
}) {
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '14px 14px',
        background: selected
          ? sectionMeta.accentSoft
          : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid rgba(255, 255, 255, ${selected ? 0 : 0.06})`,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transition: 'background 0.2s ease',
        touchAction: 'pan-y',
      }}
    >
      {/* Left accent bar when selected */}
      {selected && (
        <motion.div
          layoutId="service-selected-bar"
          initial={false}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: sectionMeta.accent,
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      {/* Row layout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: selected
            ? `${sectionMeta.accent}20`
            : 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          border: selected
            ? `1px solid ${sectionMeta.accent}25`
            : '1px solid transparent',
        }}>
          <Icon
            size={18}
            color={selected ? sectionMeta.accent : 'rgba(255,255,255,0.40)'}
            strokeWidth={1.6}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: Name + badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: selected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}>
              {service.label}
            </span>

            {service.popular && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(212, 175, 55, 0.10)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
                color: '#d4af37',
                lineHeight: 1,
                flexShrink: 0,
              }}>
                <Sparkles size={7} color="#d4af37" />
                популярное
              </span>
            )}
          </div>

          {/* Line 2: Description (only when not selected to keep it clean) */}
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.4,
            marginBottom: 6,
            fontWeight: 500,
          }}>
            {service.description}
          </div>

          {/* Line 3: Duration + Price */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.25)',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Timer size={10} color="rgba(255,255,255,0.20)" />
              {service.duration}
            </span>

            <span style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: selected ? sectionMeta.accent : 'rgba(255,255,255,0.50)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'color 0.2s ease',
            }}>
              {service.price}
            </span>
          </div>
        </div>

        {/* Check / Chevron */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: sectionMeta.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${sectionMeta.accent}30`,
              }}
            >
              <Check size={13} color="#050505" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chevron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              style={{ flexShrink: 0, display: 'flex' }}
            >
              <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   URGENT REQUEST CARD
   ───────────────────────────────────────────────────────────────────────── */

function UrgentRequestCard({ onPress }: { onPress: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.06), rgba(96, 165, 250, 0.02))',
        border: '1px dashed rgba(96, 165, 250, 0.22)',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        marginTop: 4,
      }}
    >
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: 'rgba(96, 165, 250, 0.10)',
        border: '1px solid rgba(96, 165, 250, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={17} color="#60a5fa" strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#93bbfc', marginBottom: 3, lineHeight: 1.2 }}>
          Не нашли нужное?
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3, fontWeight: 500 }}>
          Опишите задачу — подберём формат и автора
        </div>
      </div>
      <ArrowUpRight size={16} color="#60a5fa" style={{ flexShrink: 0, opacity: 0.5 }} />
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   EMPTY SEARCH
   ───────────────────────────────────────────────────────────────────────── */

function EmptySearchState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '32px 20px',
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.04)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Search size={20} color="rgba(255,255,255,0.25)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.80)', marginBottom: 6 }}>
        Ничего не найдено
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
        Попробуйте другой запрос или посмотрите весь каталог
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onReset}
        style={{
          padding: '10px 18px',
          borderRadius: 12,
          border: '1px solid rgba(212, 175, 55, 0.20)',
          background: 'rgba(212, 175, 55, 0.06)',
          color: '#d4af37',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Показать все
      </motion.button>
    </motion.div>
  )
}
