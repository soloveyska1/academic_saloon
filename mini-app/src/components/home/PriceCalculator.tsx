import { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calculator, ArrowRight } from 'lucide-react'
import { Reveal } from '../ui/StaggerReveal'

const WORK_TYPES = [
  { id: 'coursework', label: 'Курсовая', basePrice: 990, icon: '📝' },
  { id: 'diploma', label: 'Дипломная', basePrice: 4990, icon: '🎓' },
  { id: 'essay', label: 'Эссе', basePrice: 490, icon: '✍️' },
  { id: 'report', label: 'Реферат', basePrice: 590, icon: '📄' },
  { id: 'control', label: 'Контрольная', basePrice: 690, icon: '📋' },
  { id: 'practice', label: 'Практика', basePrice: 1490, icon: '🏢' },
  { id: 'presentation', label: 'Презентация', basePrice: 490, icon: '📊' },
  { id: 'masters', label: 'Магистерская', basePrice: 7990, icon: '🏆' },
]

const DEADLINE_MULTIPLIERS = [
  { days: 1, label: '1 день', multiplier: 2.0 },
  { days: 3, label: '3 дня', multiplier: 1.5 },
  { days: 7, label: 'Неделя', multiplier: 1.2 },
  { days: 14, label: '2 недели', multiplier: 1.0 },
  { days: 28, label: 'Месяц', multiplier: 0.9 },
]

interface PriceCalculatorProps {
  onCreateOrder: (workType: string) => void
  haptic: (type: 'light' | 'medium' | 'heavy') => void
  cashbackPercent?: number
}

export const PriceCalculator = memo(function PriceCalculator({
  onCreateOrder,
  haptic,
  cashbackPercent = 0,
}: PriceCalculatorProps) {
  const [selectedType, setSelectedType] = useState(0)
  const [deadlineIndex, setDeadlineIndex] = useState(3) // default 2 weeks

  const workType = WORK_TYPES[selectedType]
  const deadline = DEADLINE_MULTIPLIERS[deadlineIndex]

  const estimatedPrice = useMemo(() => {
    return Math.round(workType.basePrice * deadline.multiplier / 10) * 10
  }, [workType.basePrice, deadline.multiplier])

  const cashbackAmount = useMemo(() => {
    return Math.round(estimatedPrice * cashbackPercent / 100)
  }, [estimatedPrice, cashbackPercent])

  const handleTypeSelect = useCallback((index: number) => {
    haptic('light')
    setSelectedType(index)
  }, [haptic])

  const handleOrder = useCallback(() => {
    haptic('heavy')
    onCreateOrder(workType.id)
  }, [haptic, onCreateOrder, workType.id])

  return (
    <Reveal animation="slide" direction="up">
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 12,
          background: 'linear-gradient(160deg, rgba(27,22,12,0.94) 0%, rgba(12,12,12,0.98) 46%, rgba(9,9,10,1) 100%)',
          border: '1px solid rgba(212,175,55,0.12)',
          padding: '20px 18px',
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            left: -30,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calculator size={14} color="rgba(212,175,55,0.55)" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(212,175,55,0.55)',
            }}>
              Калькулятор
            </span>
          </div>

          {/* Work type pills - horizontal scroll */}
          <div style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            marginBottom: 16,
            paddingBottom: 2,
            margin: '0 -18px 16px',
            padding: '0 18px 2px',
          }}>
            {WORK_TYPES.map((type, i) => (
              <motion.button
                key={type.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTypeSelect(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: 'none',
                  background: i === selectedType
                    ? 'rgba(212,175,55,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  color: i === selectedType
                    ? 'var(--gold-300)'
                    : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  outline: i === selectedType
                    ? '1px solid rgba(212,175,55,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ fontSize: 13 }}>{type.icon}</span>
                {type.label}
              </motion.button>
            ))}
          </div>

          {/* Deadline slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                Срок выполнения
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-300)' }}>
                {deadline.label}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={DEADLINE_MULTIPLIERS.length - 1}
              value={deadlineIndex}
              onChange={e => {
                haptic('light')
                setDeadlineIndex(Number(e.target.value))
              }}
              style={{
                width: '100%',
                height: 4,
                borderRadius: 2,
                appearance: 'none',
                background: `linear-gradient(to right, var(--gold-400) ${(deadlineIndex / (DEADLINE_MULTIPLIERS.length - 1)) * 100}%, rgba(255,255,255,0.08) ${(deadlineIndex / (DEADLINE_MULTIPLIERS.length - 1)) * 100}%)`,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
            }}>
              {DEADLINE_MULTIPLIERS.map((d, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: i === deadlineIndex ? 'var(--gold-400)' : 'var(--text-muted)',
                    opacity: i === deadlineIndex ? 1 : 0.5,
                  }}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          {/* Price display */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: 4,
              }}>
                Примерная стоимость
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <motion.span
                  key={estimatedPrice}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    color: 'var(--gold-200)',
                    lineHeight: 1,
                  }}
                >
                  от {estimatedPrice.toLocaleString('ru-RU')} ₽
                </motion.span>
              </div>
              {cashbackPercent > 0 && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--success-text)',
                  marginTop: 4,
                }}>
                  +{cashbackAmount} ₽ кешбэк
                </div>
              )}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleOrder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: 'var(--text-on-gold)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--glow-gold)',
                whiteSpace: 'nowrap',
              }}
            >
              Заказать
              <ArrowRight size={14} />
            </motion.button>
          </div>
        </div>
      </div>
    </Reveal>
  )
})
