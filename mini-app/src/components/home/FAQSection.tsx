import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HelpCircle, ChevronDown } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  FAQ — Accordion with unified card style.
// ═══════════════════════════════════════════════════════════════════════════

const FAQ_ITEMS = [
  {
    question: 'Как обеспечивается конфиденциальность?',
    answer: 'Полная защита данных. Информация не передаётся третьим лицам. О заказе знаете только вы.',
  },
  {
    question: 'Что входит в гарантию доработки?',
    answer: 'Бесплатные правки до полного соответствия требованиям. Гарантия возврата средств.',
  },
  {
    question: 'Как происходит оплата?',
    answer: 'Сначала обсуждаем объём, сроки и стоимость. Оплата — только после согласования всех условий.',
  },
  {
    question: 'Каковы сроки выполнения?',
    answer: 'Реферат — от 1 дня, курсовая — от 3, дипломная — от 7. Срочные заказы — от 24 часов.',
  },
  {
    question: 'Какая уникальность текста?',
    answer: 'Каждая работа выполняется с нуля. Уникальность — от 80% по системе Antiplagiat.',
  },
] as const

function FAQAccordionItem({ question, answer, isOpen, onToggle }: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        background: isOpen ? 'rgba(201, 162, 39, 0.04)' : 'rgba(12, 12, 10, 0.6)',
        backdropFilter: 'blur(16px) saturate(120%)',
        WebkitBackdropFilter: 'blur(16px) saturate(120%)',
        border: `1px solid ${isOpen ? 'rgba(201, 162, 39, 0.06)' : 'rgba(255, 255, 255, 0.04)'}`,
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: 16,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{
          flex: 1,
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
          color: isOpen ? 'var(--gold-400)' : 'var(--text-primary)',
          lineHeight: 1.4,
          transition: 'color 0.2s',
        }}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={15} color="var(--text-muted)" strokeWidth={2} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 16px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
            }}>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const FAQSection = memo(function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = useCallback((index: number) => {
    setOpenIndex(prev => prev === index ? null : index)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38 }}
      style={{ marginBottom: 24 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <HelpCircle size={12} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Частые вопросы
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQ_ITEMS.map((item, i) => (
          <FAQAccordionItem
            key={i}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
          />
        ))}
      </div>
    </motion.div>
  )
})
