import { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { GoldText } from '../ui/GoldText'
import { Reveal } from '../ui/StaggerReveal'

interface WorkType {
  id: string
  label: string
  price: number
}

const WORK_TYPES: WorkType[] = [
  { id: 'coursework', label: 'Курсовая', price: 990 },
  { id: 'diploma', label: 'Дипломная', price: 4990 },
  { id: 'essay', label: 'Эссе', price: 490 },
  { id: 'report', label: 'Реферат', price: 590 },
  { id: 'control', label: 'Контрольная', price: 690 },
  { id: 'practice', label: 'Практика', price: 1490 },
  { id: 'presentation', label: 'Презентация', price: 490 },
  { id: 'masters', label: 'Магистерская', price: 7990 },
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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const selected = WORK_TYPES[selectedIndex]

  const cashback = useMemo(
    () => cashbackPercent > 0 ? Math.round(selected.price * cashbackPercent / 100) : 0,
    [selected.price, cashbackPercent],
  )

  const handleSelect = useCallback((i: number) => {
    haptic('light')
    setSelectedIndex(i)
    setIsOpen(false)
  }, [haptic])

  const handleOrder = useCallback(() => {
    haptic('heavy')
    onCreateOrder(selected.id)
  }, [haptic, onCreateOrder, selected.id])

  return (
    <Reveal animation="slide" direction="up">
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          background: 'linear-gradient(160deg, rgba(22,18,10,0.98) 0%, rgba(10,10,11,0.99) 100%)',
          border: '1px solid rgba(212,175,55,0.10)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Top shine */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: '20%', right: '20%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
            borderRadius: '12px 12px 0 0',
          }}
        />

        <div style={{ padding: '18px 16px' }}>
          {/* Top row: price + CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}>
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.price}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GoldText
                    variant="liquid"
                    weight={700}
                    style={{
                      fontFamily: "var(--font-display, 'Playfair Display', serif)",
                      fontSize: 24,
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    от {selected.price.toLocaleString('ru-RU')} ₽
                  </GoldText>
                </motion.div>
              </AnimatePresence>
              {cashback > 0 && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--success-text)',
                  marginTop: 3,
                }}>
                  +{cashback}₽ кешбэк
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
                boxShadow: '0 8px 20px -8px rgba(212,175,55,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              Заказать
              <ArrowRight size={14} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* Type selector trigger */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => { haptic('light'); setIsOpen(!isOpen) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              width: '100%',
              padding: '10px 12px',
              borderRadius: isOpen ? '10px 10px 0 0' : 10,
              border: 'none',
              background: 'var(--gold-glass-subtle)',
              outline: '1px solid rgba(212,175,55,0.12)',
              color: 'var(--gold-300)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-radius 0.15s ease',
            }}
          >
            <span>{selected.label}</span>
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              style={{
                flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                opacity: 0.5,
              }}
            />
          </motion.button>

          {/* Inline dropdown — expands below the trigger, no overflow issues */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  overflow: 'hidden',
                  borderRadius: '0 0 10px 10px',
                  background: 'rgba(18,16,12,0.98)',
                  border: '1px solid rgba(212,175,55,0.10)',
                  borderTop: 'none',
                  marginTop: -1,
                }}
              >
                {WORK_TYPES.map((type, i) => (
                  <motion.button
                    key={type.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      background: i === selectedIndex
                        ? 'rgba(212,175,55,0.08)'
                        : 'transparent',
                      color: i === selectedIndex
                        ? 'var(--gold-300)'
                        : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: i < WORK_TYPES.length - 1
                        ? '1px solid rgba(255,255,255,0.03)'
                        : 'none',
                    }}
                  >
                    <span>{type.label}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                    }}>
                      от {type.price.toLocaleString('ru-RU')}₽
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Reveal>
  )
})
