import { ReactNode, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Search,
  Sparkles,
  Star,
  X,
  Zap,
  BookOpen,
} from 'lucide-react'
import { ServiceCategory, ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import {
  formatOrderCount,
  SocialProofData,
  useSocialProofBatch,
} from './useSocialProof'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — «Золотая Печать» Design v2
   Premium service catalog with category sections and compact service rows.
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
    title: 'Выпускные работы',
    subtitle: 'Сопровождение до защиты',
    accent: 'var(--gold-400)',
    accentSoft: 'rgba(212, 175, 55, 0.14)',
    accentBorder: 'rgba(212, 175, 55, 0.28)',
    icon: Crown,
  },
  standard: {
    category: 'standard',
    title: 'Учебные работы',
    subtitle: 'Структура и методичка',
    accent: '#d9c09a',
    accentSoft: 'rgba(217, 192, 154, 0.10)',
    accentBorder: 'rgba(217, 192, 154, 0.22)',
    icon: BookOpen,
  },
  express: {
    category: 'express',
    title: 'Экспресс-форматы',
    subtitle: 'Быстрый запуск',
    accent: '#76c5ab',
    accentSoft: 'rgba(118, 197, 171, 0.10)',
    accentBorder: 'rgba(118, 197, 171, 0.24)',
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

  const proofTargets = useMemo(
    () => SERVICE_TYPES.map(service => ({
      id: service.id,
      category: service.category,
      popular: service.popular,
    })),
    []
  )

  const socialProofMap = useSocialProofBatch(proofTargets)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
              socialProofMap={socialProofMap}
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
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: 14,
    }}>
      <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
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
          color: 'var(--text-main)',
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
            width: 24,
            height: 24,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={12} color="var(--text-muted)" />
        </motion.button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SECTION (Premium / Standard / Express)
   ───────────────────────────────────────────────────────────────────────── */

function ServiceSection({
  section,
  selected,
  onSelect,
  socialProofMap,
  index,
}: {
  section: SectionMeta & { services: ServiceType[] }
  selected: string | null
  onSelect: (id: string) => void
  socialProofMap: Map<string, SocialProofData>
  index: number
}) {
  const SectionIcon = section.icon

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 30 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        paddingLeft: 2,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: section.accentSoft,
          border: `1px solid ${section.accentBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <SectionIcon size={14} color={section.accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.2,
          }}>
            {section.title}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.3,
          }}>
            {section.subtitle}
          </div>
        </div>
      </div>

      {/* Service list — unified card container */}
      <div style={{
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(255, 255, 255, 0.02)',
      }}>
        {section.services.map((service, i) => (
          <ServiceRow
            key={service.id}
            service={service}
            category={section.category}
            sectionMeta={section}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            socialProof={socialProofMap.get(service.id)!}
            isLast={i === section.services.length - 1}
          />
        ))}
      </div>
    </motion.section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SERVICE ROW — Compact, elegant row for each service
   ───────────────────────────────────────────────────────────────────────── */

function ServiceRow({
  service,
  category,
  sectionMeta,
  selected,
  onSelect,
  socialProof,
  isLast,
}: {
  service: ServiceType
  category: ServiceCategory
  sectionMeta: SectionMeta
  selected: boolean
  onSelect: () => void
  socialProof: SocialProofData
  isLast: boolean
}) {
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '13px 14px',
        background: selected
          ? `linear-gradient(135deg, ${sectionMeta.accentSoft}, transparent 60%)`
          : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transition: 'background 0.2s ease',
      }}
    >
      {/* Left edge accent when selected */}
      {selected && (
        <motion.div
          layoutId="service-selected-edge"
          initial={false}
          style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: sectionMeta.accent,
            boxShadow: `0 0 12px ${sectionMeta.accentSoft}`,
          }}
        />
      )}

      {/* Top line: Icon + Name + Badge + Check */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        marginBottom: 6,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: selected ? sectionMeta.accentSoft : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${selected ? sectionMeta.accentBorder : 'rgba(255, 255, 255, 0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}>
          <Icon
            size={18}
            color={selected ? sectionMeta.accent : 'var(--text-secondary)'}
            strokeWidth={1.6}
          />
        </div>

        <span style={{
          flex: 1,
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-main)',
          lineHeight: 1.25,
          minWidth: 0,
        }}>
          {service.label}
        </span>

        {service.popular && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '3px 7px',
            borderRadius: 999,
            background: 'rgba(212, 175, 55, 0.10)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--gold-300)',
            lineHeight: 1,
            flexShrink: 0,
          }}>
            <Star size={8} fill="var(--gold-300)" color="var(--gold-300)" />
            хит
          </span>
        )}

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
                background: `linear-gradient(135deg, ${sectionMeta.accent}, ${sectionMeta.accent}cc)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 12px ${sectionMeta.accentSoft}`,
                flexShrink: 0,
              }}
            >
              <Check size={13} color="#050505" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chevron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ChevronRight size={13} color="var(--text-muted)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom line: meta info + price (aligned right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingLeft: 47, /* 36px icon + 11px gap */
        minWidth: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1,
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.duration}</span>
          <span style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <Star size={9} fill="var(--gold-300)" color="var(--gold-300)" />
            {socialProof.rating}
          </span>
          <span style={{ opacity: 0.3, flexShrink: 0 }}>·</span>
          <span style={{ flexShrink: 0 }}>{formatOrderCount(socialProof.totalOrders)}</span>
        </div>

        <span style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: selected ? sectionMeta.accent : 'var(--text-secondary)',
          lineHeight: 1,
          transition: 'color 0.2s ease',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {service.price}
        </span>
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
      transition={{ delay: 0.2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'rgba(96, 165, 250, 0.10)',
        border: '1px solid rgba(96, 165, 250, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={18} color="#60a5fa" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
          Срочная задача?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Отправьте тему без выбора формата
        </div>
      </div>
      <div style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'rgba(96, 165, 250, 0.10)',
        border: '1px solid rgba(96, 165, 250, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <ArrowUpRight size={14} color="#60a5fa" />
      </div>
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
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.04)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Search size={20} color="var(--text-muted)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
        Ничего не найдено
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Попробуйте другой запрос или посмотрите весь каталог
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onReset}
        style={{
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid rgba(212, 175, 55, 0.20)',
          background: 'rgba(212, 175, 55, 0.08)',
          color: 'var(--gold-300)',
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
