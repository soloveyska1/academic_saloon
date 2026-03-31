// deploy-trigger
import { memo, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useInView } from 'framer-motion'
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  FAQ — Premium accordion with gold+black style.
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
    answer: 'Реферат — от 1 дня, курсовая — от 5, дипломная — от 14. Срочные заказы — от 24 часов.',
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
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '16px 2px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{
          flex: 1,
          fontSize: 15,
          fontWeight: 700,
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
          <ChevronDown size={15} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} strokeWidth={2} />
        </motion.div>
      </motion.button>

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
              padding: '0 2px 8px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
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
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  const handleToggle = useCallback((index: number) => {
    setOpenIndex(prev => prev === index ? null : index)
  }, [])

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 32 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 18,
          paddingLeft: 2,
        }}
      >
        <HelpCircle size={12} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(212,175,55,0.50)',
          }}
        >
          Частые вопросы
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQ_ITEMS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <FAQAccordionItem
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
            {i < FAQ_ITEMS.length - 1 && (
              <div style={{
                height: 1,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.06) 0%, transparent 100%)',
              }} />
            )}
          </motion.div>
        ))}
      </div>

      {/* ─── "Не нашли ответ?" CTA ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        <a
          href="https://t.me/academicsaloon"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.10)',
            textDecoration: 'none',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <MessageCircle size={14} color="var(--gold-400)" strokeWidth={1.8} />
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--gold-400)',
          }}>
            Не нашли ответ?
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
          }}>
            Напишите нам
          </span>
        </a>
      </motion.div>
    </motion.div>
  )
})
