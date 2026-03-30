import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { DeadlineOption } from './types'
import { DEADLINES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   DEADLINE STEP — v5 «Premium Pricing Selector»

   Redesign based on Revolut/Wise/Apple patterns:
   - Recommended row visually elevated (gold bg + badge + glow)
   - Price color gradient: gold intensity = value
   - Selected state: multi-signal (bg + bar + glow ring + white text)
   - Savings % shown vs express
   - Premium section divider with icon
   - Section cards with gold glass treatment
   ═══════════════════════════════════════════════════════════════════════════ */

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  basePrice?: number | null
}

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
    accent: '#d4af37',
    accentSoft: 'rgba(212, 175, 55, 0.10)',
    accentBorder: 'rgba(212, 175, 55, 0.14)',
  },
  express: {
    category: 'express',
    title: 'Срочное выполнение',
    accent: '#E8C547',
    accentSoft: 'rgba(232, 197, 71, 0.08)',
    accentBorder: 'rgba(232, 197, 71, 0.12)',
  },
}

const SECTION_ORDER: UrgencyCategory[] = ['standard', 'express']

interface DeadlineMeta {
  category: UrgencyCategory
  surchargeLabel: string
  popular: boolean
}

function getDeadlineMeta(value: string): DeadlineMeta {
  switch (value) {
    case 'today':
      return { category: 'express', surchargeLabel: '+100%', popular: false }
    case 'tomorrow':
      return { category: 'express', surchargeLabel: '+70%', popular: false }
    case '3days':
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

/* ── Price color by multiplier (gold = value, dim = expensive) ────────── */
function getPriceColor(mult: number, isSelected: boolean): string {
  if (isSelected) return '#D4AF37'
  if (mult <= 1.0) return 'rgba(212, 175, 55, 0.85)'
  if (mult <= 1.1) return 'rgba(212, 175, 55, 0.65)'
  if (mult <= 1.2) return 'rgba(212, 175, 55, 0.55)'
  if (mult <= 1.4) return 'rgba(255, 255, 255, 0.40)'
  if (mult <= 1.7) return 'rgba(255, 255, 255, 0.35)'
  return 'rgba(255, 200, 170, 0.45)'
}

/* ── Savings vs express (2.0x) ────────────────────────────────────────── */
function getSavings(mult: number): number | null {
  if (mult >= 1.7) return null
  return Math.round((1 - mult / 2.0) * 100)
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════════════════════ */

export function DeadlineStep({ selected, onSelect, basePrice }: DeadlineStepProps) {
  const sections = useMemo(() => {
    return SECTION_ORDER.map((category) => {
      const meta = SECTION_META[category]
      const deadlines = DEADLINES.filter(dl => getDeadlineMeta(dl.value).category === category)
      if (category === 'standard') deadlines.reverse()
      return { ...meta, deadlines }
    }).filter(section => section.deadlines.length > 0)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map((section, sectionIndex) => (
          <div key={section.category}>
            {/* Divider before express */}
            {sectionIndex > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 4px',
                marginBottom: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)' }} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(232, 197, 71, 0.5)',
                }}>
                  <Zap size={9} />
                  {section.title}
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)' }} />
              </div>
            )}

            {/* Section header for first section */}
            {sectionIndex === 0 && (
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(212, 175, 55, 0.50)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                padding: '0 4px 8px',
              }}>
                {section.title}
              </div>
            )}

            {/* Card */}
            <div style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: `1.5px solid ${section.accentBorder}`,
              background: section.category === 'express'
                ? 'rgba(20, 16, 12, 0.92)'
                : 'linear-gradient(160deg, rgba(212, 175, 55, 0.03), rgba(14, 13, 12, 0.92) 20%)',
              boxShadow: [
                'inset 0 1px 0 rgba(255, 248, 214, 0.04)',
                '0 4px 20px -6px rgba(0, 0, 0, 0.35)',
              ].join(', '),
              position: 'relative',
            }}>
              {/* Top gold reflection */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
                pointerEvents: 'none',
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
                  rowIndex={i}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reassurance */}
      <div style={{
        fontSize: 11,
        color: 'rgba(212, 175, 55, 0.45)',
        textAlign: 'center',
        padding: '8px 0 0',
      }}>
        Точную стоимость обсудим после оформления
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEADLINE ROW
   ═══════════════════════════════════════════════════════════════════════════ */

function DeadlineRow({
  deadline,
  sectionMeta,
  selected,
  onSelect,
  isLast,
  basePrice,
  rowIndex,
}: {
  deadline: DeadlineOption
  sectionMeta: SectionMeta
  selected: boolean
  onSelect: () => void
  isLast: boolean
  basePrice?: number | null
  rowIndex: number
}) {
  const meta = getDeadlineMeta(deadline.value)
  const estimatedPrice = basePrice && basePrice > 0
    ? Math.round(basePrice * deadline.multiplierNum / 10) * 10
    : null
  const savings = getSavings(deadline.multiplierNum)
  const priceColor = getPriceColor(deadline.multiplierNum, selected)

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rowIndex * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: meta.popular ? '16px 14px' : '13px 14px',
        background: selected
          ? sectionMeta.accentSoft
          : meta.popular
            ? 'rgba(212, 175, 55, 0.04)'
            : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(212, 175, 55, 0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transition: 'background 0.25s ease',
        touchAction: 'manipulation',
      }}
    >
      {/* Popular badge — top right corner */}
      {meta.popular && (
        <div style={{
          position: 'absolute',
          top: -1,
          right: 14,
          padding: '2px 10px 3px',
          borderRadius: '0 0 8px 8px',
          background: 'var(--gold-metallic)',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: '#0A0A0A',
          boxShadow: '0 2px 8px rgba(212, 175, 55, 0.25)',
        }}>
          лучшая цена / скорость
        </div>
      )}

      {/* Selected accent bar with glow */}
      {selected && (
        <motion.div
          layoutId="deadline-bar"
          initial={false}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: `linear-gradient(180deg, ${sectionMeta.accent}, rgba(212,175,55,0.5))`,
            boxShadow: '2px 0 12px rgba(212, 175, 55, 0.15)',
          }}
        />
      )}

      {/* Row layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Label + savings */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 16,
              fontWeight: selected ? 700 : 600,
              color: selected ? '#FFFFFF' : 'var(--text-primary)',
              letterSpacing: '-0.01em',
              transition: 'color 0.2s, font-weight 0.2s',
            }}>
              {deadline.label}
            </span>
          </div>

          {/* Savings badge — only standard rows */}
          {savings && savings >= 20 && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(212, 175, 55, 0.55)',
              marginTop: 2,
              display: 'block',
            }}>
              экономия {savings}%
            </span>
          )}
        </div>

        {/* Price */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 700,
            color: priceColor,
            letterSpacing: '0.02em',
            transition: 'color 0.3s ease',
          }}>
            {estimatedPrice
              ? <>
                  <span style={{ opacity: 0.5 }}>~</span>
                  {estimatedPrice.toLocaleString('ru-RU')} ₽
                </>
              : meta.surchargeLabel
            }
          </span>
        </div>

        {/* Radio — double-ring with gold glow */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 9999,
          border: `2px solid ${selected ? sectionMeta.accent : 'rgba(255, 255, 255, 0.10)'}`,
          boxShadow: selected ? '0 0 0 3px rgba(212, 175, 55, 0.12)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.2s, box-shadow 0.3s',
        }}>
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 9999,
                  background: sectionMeta.accent,
                  boxShadow: `0 0 8px ${sectionMeta.accent}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={9} color="#0A0A0A" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.button>
  )
}
