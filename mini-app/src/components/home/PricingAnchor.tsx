import { memo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  PenLine,
  FileText,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Briefcase,
  Presentation,
  ScrollText,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  PRICING ANCHOR — Clean horizontal carousel of work types.
//  Premium gold+black cards with staggered entrance.
// ═══════════════════════════════════════════════════════════════════════════

interface PricingItem {
  icon: LucideIcon
  workType: string
  workTypeKey: string
  price: string
  timeline: string
}

const PRICING_ITEMS: PricingItem[] = [
  { icon: PenLine, workType: 'Реферат', workTypeKey: 'report', price: 'от 990 ₽', timeline: 'от 1 дня' },
  { icon: FileText, workType: 'Курсовая', workTypeKey: 'coursework', price: 'от 2 990 ₽', timeline: 'от 5 дней' },
  { icon: GraduationCap, workType: 'Дипломная', workTypeKey: 'diploma', price: 'от 9 990 ₽', timeline: 'от 14 дней' },
  { icon: BookOpen, workType: 'Эссе', workTypeKey: 'essay', price: 'от 1 490 ₽', timeline: 'от 1 дня' },
  { icon: ClipboardList, workType: 'Контрольная', workTypeKey: 'control', price: 'от 1 290 ₽', timeline: 'от 2 дней' },
  { icon: Briefcase, workType: 'Отчёт по практике', workTypeKey: 'practice', price: 'от 2 490 ₽', timeline: 'от 3 дней' },
  { icon: Presentation, workType: 'Презентация', workTypeKey: 'presentation', price: 'от 990 ₽', timeline: 'от 2 дней' },
  { icon: ScrollText, workType: 'Диссертация', workTypeKey: 'masters', price: 'от 29 990 ₽', timeline: 'от 30 дней' },
]

const EASE = [0.16, 1, 0.3, 1] as unknown as number[]
const CARD_WIDTH = 152
const CARD_GAP = 10

interface PricingAnchorProps {
  onNavigateToOrder: (workType: string) => void
  haptic?: (style: 'light' | 'medium' | 'heavy') => void
}

export const PricingAnchor = memo(function PricingAnchor({
  onNavigateToOrder,
  haptic,
}: PricingAnchorProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const constraintsRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 50
    const velocityThreshold = 300
    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      setActiveIndex(prev => Math.min(prev + 1, PRICING_ITEMS.length - 1))
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      setActiveIndex(prev => Math.max(prev - 1, 0))
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Направления
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(212,175,55,0.50)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
          onClick={() => {
            haptic?.('light')
            onNavigateToOrder('')
          }}
        >
          Все виды работ
          <ArrowRight size={11} strokeWidth={2} />
        </span>
      </div>

      {/* Carousel */}
      <div ref={constraintsRef} style={{ overflow: 'hidden', margin: '0 -20px', padding: '0 20px' }}>
        <motion.div
          drag="x"
          dragConstraints={{ left: -(PRICING_ITEMS.length - 1) * (CARD_WIDTH + CARD_GAP), right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          animate={{ x: -activeIndex * (CARD_WIDTH + CARD_GAP) }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            display: 'flex',
            gap: CARD_GAP,
            cursor: 'grab',
          }}
        >
          {PRICING_ITEMS.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.button
                key={item.workTypeKey}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: EASE }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  haptic?.('light')
                  onNavigateToOrder(item.workTypeKey)
                }}
                style={{
                  width: CARD_WIDTH,
                  flexShrink: 0,
                  padding: 16,
                  borderRadius: 16,
                  background: '#0E0D0C',
                  border: '1px solid rgba(212,175,55,0.08)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  appearance: 'none',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top shine line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                  background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.10) 50%, transparent 90%)',
                  pointerEvents: 'none',
                }} />

                {/* Gold icon circle */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(212,175,55,0.10)',
                    border: '1px solid rgba(212,175,55,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Icon size={18} color="var(--gold-400)" strokeWidth={1.8} />
                </div>

                {/* Work type name */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.25,
                  marginBottom: 10,
                }}>
                  {item.workType}
                </div>

                {/* Price */}
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--gold-400)',
                  marginBottom: 4,
                  opacity: 0.8,
                }}>
                  {item.price}
                </div>

                {/* Timeline */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                }}>
                  {item.timeline}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14, minHeight: 44,
      }}>
        {PRICING_ITEMS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === activeIndex ? 18 : 6,
              background: i === activeIndex ? 'var(--gold-400, #D4AF37)' : 'rgba(212,175,55,0.12)',
            }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{
              height: 6, borderRadius: 3,
              cursor: 'pointer',
            }}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 10,
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text-muted)',
        textAlign: 'center',
        opacity: 0.5,
      }}>
        Стоимость рассчитывается индивидуально
      </div>
    </motion.div>
  )
})
