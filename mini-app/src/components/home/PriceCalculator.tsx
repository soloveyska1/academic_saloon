import { memo, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, GraduationCap, PenTool, FileSpreadsheet,
  ClipboardList, Building, BarChart3, Award, ArrowRight, Calendar,
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { Reveal } from '../ui/StaggerReveal'
import { GoldText } from '../ui/GoldText'

interface WorkTypeOption {
  id: string
  label: string
  basePrice: number
  icon: LucideIcon
}

const WORK_TYPES: WorkTypeOption[] = [
  { id: 'coursework', label: 'Курсовая', basePrice: 990, icon: FileText },
  { id: 'diploma', label: 'Дипломная', basePrice: 4990, icon: GraduationCap },
  { id: 'essay', label: 'Эссе', basePrice: 490, icon: PenTool },
  { id: 'report', label: 'Реферат', basePrice: 590, icon: FileSpreadsheet },
  { id: 'control', label: 'Контрольная', basePrice: 690, icon: ClipboardList },
  { id: 'practice', label: 'Практика', basePrice: 1490, icon: Building },
  { id: 'presentation', label: 'Презентация', basePrice: 490, icon: BarChart3 },
  { id: 'masters', label: 'Магистерская', basePrice: 7990, icon: Award },
]

const DEADLINES = [
  { days: 1, label: '24ч', multiplier: 2.0 },
  { days: 3, label: '3 дня', multiplier: 1.5 },
  { days: 7, label: 'Неделя', multiplier: 1.2 },
  { days: 14, label: '2 нед.', multiplier: 1.0 },
  { days: 30, label: 'Месяц', multiplier: 0.9 },
]

interface PriceCalculatorProps {
  onCreateOrder: (workType: string) => void
  haptic: (type: 'light' | 'medium' | 'heavy') => void
  cashbackPercent?: number
}

function formatDeliveryDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const PriceCalculator = memo(function PriceCalculator({
  onCreateOrder,
  haptic,
  cashbackPercent = 0,
}: PriceCalculatorProps) {
  const [selectedType, setSelectedType] = useState(0)
  const [deadlineIndex, setDeadlineIndex] = useState(3)

  const workType = WORK_TYPES[selectedType]
  const deadline = DEADLINES[deadlineIndex]

  const estimatedPrice = useMemo(
    () => Math.round(workType.basePrice * deadline.multiplier / 10) * 10,
    [workType.basePrice, deadline.multiplier],
  )

  const cashbackAmount = useMemo(
    () => Math.round(estimatedPrice * cashbackPercent / 100),
    [estimatedPrice, cashbackPercent],
  )

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
          boxShadow: 'var(--card-shadow)',
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
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top shine line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.55)',
            marginBottom: 16,
          }}>
            Рассчитать стоимость
          </div>

          {/* Work type pills */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              margin: '0 -18px 18px',
              padding: '0 18px 2px',
            }}
          >
            {WORK_TYPES.map((type, i) => {
              const Icon = type.icon
              const isSelected = i === selectedType
              return (
                <motion.button
                  key={type.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptic('light'); setSelectedType(i) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: 'none',
                    background: isSelected
                      ? 'var(--gold-glass-medium)'
                      : 'rgba(255,255,255,0.04)',
                    outline: isSelected
                      ? '1px solid rgba(212,175,55,0.25)'
                      : '1px solid var(--border-default)',
                    color: isSelected
                      ? 'var(--gold-300)'
                      : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s var(--ease-out)',
                  }}
                >
                  <Icon size={13} strokeWidth={2} />
                  {type.label}
                </motion.button>
              )
            })}
          </div>

          {/* Deadline selector — discrete steps */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                Срок
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} strokeWidth={2} color="var(--gold-400)" style={{ opacity: 0.6 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-300)' }}>
                  {deadline.label} · к {formatDeliveryDate(deadline.days)}
                </span>
              </div>
            </div>

            {/* Stepped deadline buttons */}
            <div style={{
              display: 'flex',
              gap: 4,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              padding: 3,
              border: '1px solid var(--border-subtle)',
            }}>
              {DEADLINES.map((d, i) => (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptic('light'); setDeadlineIndex(i) }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: 'none',
                    background: i === deadlineIndex
                      ? 'var(--gold-glass-medium)'
                      : 'transparent',
                    color: i === deadlineIndex
                      ? 'var(--gold-300)'
                      : 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s var(--ease-out)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Price result + CTA */}
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
              <motion.div
                key={estimatedPrice}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}
              >
                <GoldText
                  variant="liquid"
                  weight={700}
                  style={{
                    fontFamily: "var(--font-display, 'Playfair Display', serif)",
                    fontSize: 26,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  от {estimatedPrice.toLocaleString('ru-RU')} ₽
                </GoldText>
              </motion.div>
              {cashbackPercent > 0 && cashbackAmount > 0 && (
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
              whileTap={{ scale: 0.97 }}
              onClick={handleOrder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--gold-metallic)',
                color: 'var(--text-on-gold)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--glow-gold)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              Заказать
              <ArrowRight size={14} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </Reveal>
  )
})
