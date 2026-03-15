import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Clock,
  Flame,
  Leaf,
  Timer,
  Zap,
  CalendarClock,
  TrendingDown,
} from 'lucide-react'
import { DeadlineOption } from './types'
import { DEADLINES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   DEADLINE STEP — v3 «Понятный выбор сроков»

   Принципы:
   - 2 секции: «Срочные» и «Стандартные» — как ServiceTypeStep
   - Каждая секция — bordered card с цветным accent-баром
   - Строки: иконка → лейбл + описание → множитель → check
   - «Оптимально» бейдж на 2-3 дня
   - Friendly-текст вместо сухих процентов
   ═══════════════════════════════════════════════════════════════════════════ */

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  isDark: boolean
  /** Base price to show real impact (optional) */
  basePrice?: number | null
}

// ── Section metadata ──

type UrgencyCategory = 'urgent' | 'standard'

interface SectionMeta {
  category: UrgencyCategory
  title: string
  subtitle: string
  accent: string
  accentSoft: string
  accentBorder: string
  icon: typeof Flame
}

const SECTION_META: Record<UrgencyCategory, SectionMeta> = {
  urgent: {
    category: 'urgent',
    title: 'Срочные сроки',
    subtitle: 'Приоритет в очереди',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.10)',
    accentBorder: 'rgba(245, 158, 11, 0.25)',
    icon: Flame,
  },
  standard: {
    category: 'standard',
    title: 'Стандартные сроки',
    subtitle: 'Без наценки за срочность',
    accent: '#22c55e',
    accentSoft: 'rgba(34, 197, 94, 0.10)',
    accentBorder: 'rgba(34, 197, 94, 0.20)',
    icon: Leaf,
  },
}

const SECTION_ORDER: UrgencyCategory[] = ['urgent', 'standard']

// ── Deadline enrichment ──

interface DeadlineMeta {
  icon: typeof Clock
  description: string
  recommended: boolean
  category: UrgencyCategory
  priceLabel: string // friendly multiplier text
}

function getDeadlineMeta(value: string): DeadlineMeta {
  switch (value) {
    case 'today':
      return {
        icon: Zap,
        description: 'Максимальный приоритет, работа начнётся сразу',
        recommended: false,
        category: 'urgent',
        priceLabel: '×2',
      }
    case 'tomorrow':
      return {
        icon: Timer,
        description: 'Сдача на следующий день',
        recommended: false,
        category: 'urgent',
        priceLabel: '×1.7',
      }
    case '3days':
      return {
        icon: Clock,
        description: 'Баланс скорости и качества',
        recommended: true,
        category: 'urgent',
        priceLabel: '×1.4',
      }
    case 'week':
      return {
        icon: CalendarClock,
        description: 'Комфортный темп без спешки',
        recommended: false,
        category: 'standard',
        priceLabel: '×1.2',
      }
    case '2weeks':
      return {
        icon: CalendarClock,
        description: 'С запасом на правки и доработки',
        recommended: false,
        category: 'standard',
        priceLabel: '×1.1',
      }
    case 'month':
    default:
      return {
        icon: TrendingDown,
        description: 'Базовая стоимость, без наценок',
        recommended: false,
        category: 'standard',
        priceLabel: '×1',
      }
  }
}

// ── Root component ──

export function DeadlineStep({ selected, onSelect, isDark, basePrice }: DeadlineStepProps) {
  void isDark

  const sections = useMemo(() => {
    return SECTION_ORDER.map((category) => {
      const meta = SECTION_META[category]
      const deadlines = DEADLINES.filter(dl => getDeadlineMeta(dl.value).category === category)
      return { ...meta, deadlines }
    }).filter(section => section.deadlines.length > 0)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Hint */}
      <div style={{
        fontSize: 13,
        lineHeight: 1.5,
        color: 'rgba(255,255,255,0.38)',
        padding: '0 4px',
        marginBottom: 2,
      }}>
        Чем спокойнее сроки — тем ниже стоимость
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
   SECTION — Category group with accent bar (mirrors ServiceTypeStep)
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: sectionIndex * 0.07, type: 'spring', stiffness: 280, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Section header — pill + subtitle */}
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

      {/* Deadline rows inside bordered card */}
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${section.accentBorder}`,
        background: 'rgba(255, 255, 255, 0.015)',
        position: 'relative',
      }}>
        {/* Colored top accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${section.accent}, transparent)`,
          opacity: 0.6,
        }} />

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
   DEADLINE ROW — Mirrors ServiceRow pattern
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
  const Icon = meta.icon

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

      {/* Row layout: [Icon] [Content] [Price/Multiplier] [Check/Chevron] */}
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

        {/* Content: label + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: Label + recommended badge */}
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
              {deadline.label}
            </span>

            {meta.recommended && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(212, 175, 55, 0.12)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
                color: '#d4af37',
                lineHeight: 1,
                flexShrink: 0,
                position: 'relative' as const,
                top: -1,
              }}>
                оптимально
              </span>
            )}
          </div>

          {/* Line 2: Description ··· Price estimate */}
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
              {meta.description}
            </span>

            {estimatedPrice ? (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: selected ? sectionMeta.accent : 'var(--text-secondary)',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'color 0.2s ease',
              }}>
                ~{estimatedPrice.toLocaleString('ru-RU')} ₽
              </span>
            ) : (
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: deadline.multiplierNum === 1.0
                  ? 'rgba(34, 197, 94, 0.70)'
                  : `${deadline.color}aa`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {meta.priceLabel}
              </span>
            )}
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
