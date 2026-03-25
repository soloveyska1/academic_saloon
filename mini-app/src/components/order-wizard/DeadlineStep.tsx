import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { DeadlineOption } from './types'
import { DEADLINES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   DEADLINE STEP — v4 «Честный выбор»

   Принципы:
   - Стандартные (дешёвые) сверху — якорим на базовую цену
   - "2-3 дня" перенесён в стандартные — это нормальный срок, не срочный
   - Убран "ОПТИМАЛЬНО" бейдж с наценочной опции (тёмный паттерн)
   - Убраны иконки (все были часами — не несли информации)
   - Убраны описания (дублировали заголовок)
   - ChevronRight заменён на radio circle (правильный affordance)
   - Компактные строки ~48px вместо ~70px
   ═══════════════════════════════════════════════════════════════════════════ */

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  /** Base price to show real impact (optional) */
  basePrice?: number | null
}

// ── Section metadata ──

type UrgencyCategory = 'express' | 'standard'

interface SectionMeta {
  category: UrgencyCategory
  title: string
  accent: string
  accentSoft: string
  accentBorder: string
}

const SECTION_META: Record<UrgencyCategory, SectionMeta> = {
  standard: {
    category: 'standard',
    title: 'Стандартные сроки',
    accent: '#22c55e',
    accentSoft: 'rgba(34, 197, 94, 0.08)',
    accentBorder: 'rgba(34, 197, 94, 0.16)',
  },
  express: {
    category: 'express',
    title: 'Экспресс',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.08)',
    accentBorder: 'rgba(245, 158, 11, 0.20)',
  },
}

// Standard first — anchor on base price
const SECTION_ORDER: UrgencyCategory[] = ['standard', 'express']

// ── Deadline enrichment ──

interface DeadlineMeta {
  category: UrgencyCategory
  surchargeLabel: string // "+40%" or "базовая"
  popular: boolean
}

function getDeadlineMeta(value: string): DeadlineMeta {
  switch (value) {
    case 'today':
      return { category: 'express', surchargeLabel: '+100%', popular: false }
    case 'tomorrow':
      return { category: 'express', surchargeLabel: '+70%', popular: false }
    case '3days':
      // Moved to standard — 2-3 days is a normal deadline, not "urgent"
      return { category: 'standard', surchargeLabel: '+40%', popular: false }
    case 'week':
      return { category: 'standard', surchargeLabel: '+20%', popular: true }
    case '2weeks':
      return { category: 'standard', surchargeLabel: '+10%', popular: false }
    case 'month':
    default:
      return { category: 'standard', surchargeLabel: 'базовая', popular: false }
  }
}

// ── Root component ──

export function DeadlineStep({ selected, onSelect, basePrice }: DeadlineStepProps) {
  const sections = useMemo(() => {
    return SECTION_ORDER.map((category) => {
      const meta = SECTION_META[category]
      const deadlines = DEADLINES.filter(dl => getDeadlineMeta(dl.value).category === category)
      // Standard section: cheapest first (reverse — month, 2weeks, week, 3days)
      if (category === 'standard') deadlines.reverse()
      return { ...meta, deadlines }
    }).filter(section => section.deadlines.length > 0)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Hint */}
      <div style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'rgba(255,255,255,0.35)',
        padding: '0 4px',
        marginBottom: 2,
      }}>
        Базовая цена — при стандартных сроках. За скорость — наценка.
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {sections.map((section, sectionIndex) => (
          <DeadlineSection
            key={section.category}
            section={section}
            selected={selected}
            onSelect={onSelect}
            sectionIndex={sectionIndex}
            basePrice={basePrice}
          />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SECTION — Minimal header + compact rows
   ───────────────────────────────────────────────────────────────────────── */

function DeadlineSection({
  section,
  selected,
  onSelect,
  sectionIndex,
  basePrice,
}: {
  section: SectionMeta & { deadlines: DeadlineOption[] }
  selected: string | null
  onSelect: (value: string) => void
  sectionIndex: number
  basePrice?: number | null
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionIndex * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section header — plain colored text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        padding: '0 2px',
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: section.accent,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: section.accent,
          letterSpacing: '0.02em',
        }}>
          {section.title}
        </span>
      </div>

      {/* Rows inside bordered card */}
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${section.accentBorder}`,
        background: 'rgba(255, 255, 255, 0.015)',
      }}>
        {section.deadlines.map((dl, i) => (
          <DeadlineRow
            key={dl.value}
            deadline={dl}
            sectionMeta={section}
            selected={selected === dl.value}
            onSelect={() => onSelect(dl.value)}
            isLast={i === section.deadlines.length - 1}
            basePrice={basePrice}
          />
        ))}
      </div>
    </motion.section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   DEADLINE ROW — Compact: [dot] [label] [popular] ··· [price] [radio]
   ───────────────────────────────────────────────────────────────────────── */

function DeadlineRow({
  deadline,
  sectionMeta,
  selected,
  onSelect,
  isLast,
  basePrice,
}: {
  deadline: DeadlineOption
  sectionMeta: SectionMeta
  selected: boolean
  onSelect: () => void
  isLast: boolean
  basePrice?: number | null
}) {
  const meta = getDeadlineMeta(deadline.value)

  // Calculate real price if base is available
  const estimatedPrice = basePrice && basePrice > 0
    ? Math.round(basePrice * deadline.multiplierNum / 10) * 10
    : null

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '12px 14px',
        background: selected ? sectionMeta.accentSoft : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transition: 'background 0.2s ease',
        touchAction: 'manipulation',
      }}
    >
      {/* Left accent bar when selected */}
      {selected && (
        <motion.div
          layoutId="deadline-selected-bar"
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

      {/* Row layout: [Label + popular] ··· [Price] [Radio] */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Label + popular badge */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: selected ? 'var(--text-primary)' : 'var(--text-main)',
            lineHeight: 1.3,
          }}>
            {deadline.label}
          </span>

          {meta.popular && (
            <span style={{
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(34, 197, 94, 0.10)',
              border: '1px solid rgba(34, 197, 94, 0.18)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              color: '#22c55e',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              лучшая цена/скорость
            </span>
          )}
        </div>

        {/* Price / Surcharge */}
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: estimatedPrice
            ? (selected ? sectionMeta.accent : 'var(--text-secondary)')
            : (deadline.multiplierNum === 1.0
              ? 'rgba(34, 197, 94, 0.70)'
              : `${deadline.color}99`),
          lineHeight: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'color 0.2s ease',
        }}>
          {estimatedPrice
            ? `~${estimatedPrice.toLocaleString('ru-RU')} ₽`
            : meta.surchargeLabel}
        </span>

        {/* Radio circle */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: sectionMeta.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={12} color="#050505" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="radio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                background: 'transparent',
                flexShrink: 0,
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}
