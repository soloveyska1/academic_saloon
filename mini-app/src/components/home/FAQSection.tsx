import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { HelpCircle, ChevronDown } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  FAQ SECTION — Progressive disclosure accordion.
//  Addresses the top 5 objections students have before ordering.
//  Research: collapsible FAQs reduce scroll fatigue, increase conversions.
//  Each answer is short, reassuring, and action-oriented.
// ═══════════════════════════════════════════════════════════════════════════

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Это безопасно? Никто не узнает?',
    answer: 'Полная конфиденциальность. Мы не храним ваши данные после выполнения заказа, не передаём третьим лицам. О вашем обращении знаете только вы.',
  },
  {
    question: 'Что если преподаватель не примет работу?',
    answer: 'Три раунда правок включены в стоимость. Если работу не приняли — дорабатываем бесплатно, пока не примут. Гарантия возврата средств, если мы не выполним условия.',
  },
  {
    question: 'Как происходит оплата?',
    answer: 'Сначала обсуждаем объём, сроки и стоимость. Вы платите только после полного согласования деталей. Никаких скрытых доплат.',
  },
  {
    question: 'Сколько ждать готовую работу?',
    answer: 'Зависит от типа: реферат — от 1 дня, курсовая — от 3 дней, дипломная — от 7 дней. Срочные заказы — от 24 часов с доплатой.',
  },
  {
    question: 'А антиплагиат покажет заимствования?',
    answer: 'Все работы пишутся с нуля экспертами. Средняя уникальность — от 82% по Antiplagiat. Рекомендуем проверять самостоятельно, чтобы система не запомнила текст раньше сдачи.',
  },
]

function FAQAccordionItem({ item, isOpen, onToggle }: {
  item: FAQItem
  isOpen: boolean
  onToggle: () => void
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      style={{
        borderRadius: 16,
        background: isOpen ? 'var(--gold-glass-subtle)' : 'var(--bg-card)',
        border: `1px solid ${isOpen ? 'var(--border-gold)' : 'var(--border-default)'}`,
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 700,
          color: isOpen ? 'var(--gold-400)' : 'var(--text-primary)',
          lineHeight: 1.4,
          transition: 'color 0.2s',
        }}>
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown
            size={16}
            color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'}
            strokeWidth={2}
          />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 20px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              {item.answer}
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38 }}
      style={{ marginBottom: 24 }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingLeft: 2,
        }}
      >
        <HelpCircle
          size={13}
          color="var(--gold-400)"
          strokeWidth={2}
        />
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Частые вопросы
        </span>
      </div>

      {/* Accordion items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQ_ITEMS.map((item, i) => (
          <FAQAccordionItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
          />
        ))}
      </div>
    </motion.div>
  )
})
