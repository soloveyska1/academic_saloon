import { useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { DEADLINES } from './constants'

/* ═══════════════════════════════════════════════════════════════════════════
   DEADLINE STEP — v5 «Gradient Rail»

   Один спектр, 6 стопов, герой-карта для выбранной опции.

   - Единая горизонтальная полоса с градиентом от красного к зелёному
   - 6 тапабельных стопов на полосе (без иконок, без секций)
   - Карта деталей обновляется при смене выбора (crossfade)
   - Строка экономии: "Экономия ~X ₽ по сравнению с 'Сегодня'"
   - Ни один вариант визуально не "рекомендован" — решает пользователь
   ═══════════════════════════════════════════════════════════════════════════ */

interface DeadlineStepProps {
  selected: string | null
  onSelect: (value: string) => void
  basePrice?: number | null
}

// Enriched deadline data
interface DeadlineStop {
  value: string
  label: string
  shortLabel: string
  multiplierNum: number
  multiplier: string
  urgency: number
  color: string
  description: string
}

const STOPS: DeadlineStop[] = DEADLINES.map((dl) => ({
  ...dl,
  shortLabel: getShortLabel(dl.value),
  description: getDescription(dl.value),
}))

function getShortLabel(value: string): string {
  switch (value) {
    case 'today': return 'Сегодня'
    case 'tomorrow': return 'Завтра'
    case '3days': return '2-3 дня'
    case 'week': return 'Неделя'
    case '2weeks': return '2 нед.'
    case 'month': return 'Месяц+'
    default: return value
  }
}

function getDescription(value: string): string {
  switch (value) {
    case 'today': return 'Максимальный приоритет, работа начнётся сразу'
    case 'tomorrow': return 'Сдача на следующий день'
    case '3days': return 'Баланс скорости и качества'
    case 'week': return 'Комфортный темп без спешки'
    case '2weeks': return 'С запасом на правки и доработки'
    case 'month': return 'Базовая стоимость, без наценок'
    default: return ''
  }
}

// Gradient colors for the rail (left = urgent/red, right = relaxed/green)
const RAIL_GRADIENT = `linear-gradient(90deg, ${STOPS.map((s) => s.color).join(', ')})`

export function DeadlineStep({ selected, onSelect, basePrice }: DeadlineStepProps) {
  const selectedStop = useMemo(
    () => STOPS.find((s) => s.value === selected) ?? null,
    [selected],
  )

  const selectedIndex = useMemo(
    () => STOPS.findIndex((s) => s.value === selected),
    [selected],
  )

  const estimatePrice = useCallback(
    (multiplier: number) => {
      if (!basePrice || basePrice <= 0) return null
      return Math.round((basePrice * multiplier) / 10) * 10
    },
    [basePrice],
  )

  // Savings compared to "Today" (most expensive)
  const savingsVsToday = useMemo(() => {
    if (!selectedStop || !basePrice || basePrice <= 0) return null
    if (selectedStop.value === 'today') return null
    const todayPrice = Math.round((basePrice * 2.0) / 10) * 10
    const thisPrice = Math.round((basePrice * selectedStop.multiplierNum) / 10) * 10
    const diff = todayPrice - thisPrice
    return diff > 0 ? diff : null
  }, [selectedStop, basePrice])

  const selectedPrice = selectedStop ? estimatePrice(selectedStop.multiplierNum) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Hero Detail Card ─── */}
      <AnimatePresence mode="wait">
        {selectedStop ? (
          <motion.div
            key={selectedStop.value}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: '18px 20px',
              borderRadius: 20,
              background: 'rgba(12, 12, 10, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${selectedStop.color}33`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle color accent at top */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, ${selectedStop.color}, transparent)`,
                opacity: 0.5,
              }}
            />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Top row: label + price */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Color dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: selectedStop.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${selectedStop.color}66`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: "var(--font-display, 'Manrope', sans-serif)",
                    }}
                  >
                    {selectedStop.label}
                  </span>
                </div>

                {/* Price */}
                <span
                  style={{
                    fontSize: selectedPrice ? 20 : 16,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: selectedStop.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedPrice
                    ? `~${selectedPrice.toLocaleString('ru-RU')} ₽`
                    : selectedStop.multiplier}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                {selectedStop.description}
              </p>

              {/* Savings line */}
              {savingsVsToday && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{
                    marginTop: 10,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(34, 197, 94, 0.06)',
                    border: '1px solid rgba(34, 197, 94, 0.12)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(34, 197, 94, 0.8)',
                  }}
                >
                  Экономия ~{savingsVsToday.toLocaleString('ru-RU')} ₽ по сравнению
                  с «Сегодня»
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '20px',
              borderRadius: 20,
              background: 'rgba(12, 12, 10, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Выберите срок на шкале ниже
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
                margin: '6px 0 0',
              }}
            >
              Базовая цена — при стандартных сроках. За скорость — наценка.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Gradient Rail ─── */}
      <div style={{ padding: '0 4px' }}>
        {/* The rail track */}
        <div
          style={{
            position: 'relative',
            height: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          {/* Gradient bar */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 10,
              right: 10,
              height: 6,
              borderRadius: 3,
              background: RAIL_GRADIENT,
              opacity: 0.5,
            }}
          />

          {/* Active segment fill (from left edge to selected stop) */}
          {selectedIndex >= 0 && (
            <motion.div
              initial={false}
              animate={{
                width: `${(selectedIndex / (STOPS.length - 1)) * 100}%`,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'absolute',
                top: 14,
                left: 10,
                height: 6,
                borderRadius: 3,
                background: RAIL_GRADIENT,
                opacity: 0.9,
              }}
            />
          )}

          {/* Stop points */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              height: '100%',
            }}
          >
            {STOPS.map((stop) => {
              const isSelected = selected === stop.value
              return (
                <StopPoint
                  key={stop.value}
                  stop={stop}
                  isSelected={isSelected}
                  onSelect={() => onSelect(stop.value)}
                  price={estimatePrice(stop.multiplierNum)}
                />
              )
            })}
          </div>
        </div>

        {/* Spectrum legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 4px 0',
          }}
        >
          <span style={{ fontSize: 10, color: '#ef444488', fontWeight: 600 }}>
            Быстрее
          </span>
          <span style={{ fontSize: 10, color: '#10b98188', fontWeight: 600 }}>
            Дешевле
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   STOP POINT — Individual tap target on the rail
   ───────────────────────────────────────────────────────────────────────── */

function StopPoint({
  stop,
  isSelected,
  onSelect,
  price,
}: {
  stop: DeadlineStop
  isSelected: boolean
  onSelect: () => void
  price: number | null
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 2px',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        // Each stop takes equal width
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* The node circle */}
      <motion.div
        animate={{
          width: isSelected ? 28 : 14,
          height: isSelected ? 28 : 14,
          borderWidth: isSelected ? 3 : 2,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          borderRadius: '50%',
          borderStyle: 'solid',
          borderColor: isSelected ? 'var(--gold-400, #d4af37)' : `${stop.color}66`,
          background: isSelected ? stop.color : `${stop.color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isSelected
            ? `0 0 12px ${stop.color}44, 0 0 24px ${stop.color}22`
            : 'none',
          flexShrink: 0,
        }}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 25, delay: 0.05 }}
          >
            <Check size={13} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </motion.div>

      {/* Label */}
      <span
        style={{
          fontSize: 11,
          fontWeight: isSelected ? 700 : 500,
          color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
          marginTop: 8,
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          transition: 'color 0.2s, font-weight 0.2s',
        }}
      >
        {stop.shortLabel}
      </span>

      {/* Mini price under label */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          color: isSelected ? stop.color : `${stop.color}88`,
          marginTop: 2,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'color 0.2s',
        }}
      >
        {price ? `~${Math.round(price / 1000)}K` : stop.multiplier}
      </span>
    </motion.button>
  )
}
