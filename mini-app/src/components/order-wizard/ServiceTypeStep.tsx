import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Crown,
  Search,
  Star,
  X,
  Zap,
  BookOpen,
} from 'lucide-react'
import { ServiceCategory, ServiceType } from './types'
import { SERVICE_TYPES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TYPE STEP — v3 «Чёткая иерархия»

   Принципы дизайна:
   - Секции ФИЗИЧЕСКИ разделены (gap 32px, category-colored left border)
   - Ряды НЕ в контейнерах — каждый ряд самостоятелен, разделены линиями
   - Хедеры секций — крупный цветной лейбл (не иконка в квадрате)
   - Selected = заливка + бордер, а не едва заметный градиент
   - Цена — крупная, справа, контрастная
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
    accent: '#d4af37',
    accentSoft: 'rgba(212, 175, 55, 0.12)',
    accentBorder: 'rgba(212, 175, 55, 0.30)',
    icon: Crown,
  },
  standard: {
    category: 'standard',
    title: 'Учебные работы',
    subtitle: 'Структура и методичка',
    accent: '#c9a96e',
    accentSoft: 'rgba(201, 169, 110, 0.10)',
    accentBorder: 'rgba(201, 169, 110, 0.25)',
    icon: BookOpen,
  },
  express: {
    category: 'express',
    title: 'Экспресс-форматы',
    subtitle: 'Быстрый запуск',
    accent: '#5cb89a',
    accentSoft: 'rgba(92, 184, 154, 0.10)',
    accentBorder: 'rgba(92, 184, 154, 0.25)',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
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
      borderRadius: 12,
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
          <X size={11} color="var(--text-muted)" />
        </motion.button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SECTION — Category group with colored left accent
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 280, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section header — category pill + subtitle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          borderRadius: 8,
          background: section.accentSoft,
          border: `1px solid ${section.accentBorder}`,
          fontSize: 12,
          fontWeight: 700,
          color: section.accent,
          letterSpacing: '0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {section.title}
        </span>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1,
        }}>
          {section.subtitle}
        </span>
      </div>

      {/* Service rows — inside a bordered card with colored top accent */}
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${section.accentBorder}`,
        background: 'rgba(255, 255, 255, 0.015)',
        position: 'relative',
      }}>
        {/* Colored top line — 2px accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${section.accent}, transparent)`,
          opacity: 0.6,
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
   SERVICE ROW — Clean, readable, with strong selected state
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
          }}
        />
      )}

      {/* Row layout: [Icon] [Content area] [Check/Chevron] */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Icon */}
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: selected
            ? `${sectionMeta.accent}22`
            : 'rgba(255, 255, 255, 0.05)',
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

        {/* Content: two lines */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: Name + badge */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginBottom: 4,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-main)',
              lineHeight: 1.3,
            }}>
              {service.label}
            </span>

            {service.popular && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 6px',
                borderRadius: 999,
                background: 'rgba(212, 175, 55, 0.12)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                color: '#d4af37',
                lineHeight: 1,
                flexShrink: 0,
                position: 'relative',
                top: -1,
              }}>
                <Star size={7} fill="#d4af37" color="#d4af37" />
                хит
              </span>
            )}
          </div>

          {/* Line 2: Duration ··· Price */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}>
              {service.duration}
            </span>

            <span style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: selected ? sectionMeta.accent : 'var(--text-secondary)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'color 0.2s ease',
            }}>
              {service.price}
            </span>
          </div>
        </div>

        {/* Check / Chevron — right edge */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: sectionMeta.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={13} color="#050505" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="chevron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              style={{ flexShrink: 0, display: 'flex' }}
            >
              <ChevronRight size={16} color="var(--text-muted)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   URGENT REQUEST CARD — Stands out from service sections
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
        border: '1px dashed rgba(96, 165, 250, 0.25)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        marginTop: 4,
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'rgba(96, 165, 250, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Zap size={17} color="#60a5fa" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#93bbfc', marginBottom: 2, lineHeight: 1.2 }}>
          Срочная задача?
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
          Отправьте тему — подберём формат
        </div>
      </div>
      <ArrowUpRight size={16} color="#60a5fa" style={{ flexShrink: 0, opacity: 0.6 }} />
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
        border: '1px solid rgba(255, 255, 255, 0.08)',
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
          borderRadius: 10,
          border: '1px solid rgba(212, 175, 55, 0.22)',
          background: 'rgba(212, 175, 55, 0.08)',
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
