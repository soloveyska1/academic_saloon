import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  ExternalLink,
  Headphones,
  FileText,
  CreditCard,
  Truck,
  Shield,
  Send
} from 'lucide-react'
import { useTelegram } from '../hooks/useUserData'

// FAQ data
const FAQ_ITEMS = [
  {
    category: 'Заказы',
    icon: FileText,
    questions: [
      {
        q: 'Как сделать заказ?',
        a: 'Нажмите на кнопку "+" или "Новый заказ" на главной странице. Заполните форму с типом работы, предметом, сроками и требованиями. После отправки менеджер свяжется с вами для уточнения деталей и расчёта стоимости.',
      },
      {
        q: 'Сколько стоит работа?',
        a: 'Стоимость зависит от типа работы, объёма, сложности и сроков. Базовые цены указаны при создании заказа, но точная стоимость рассчитывается индивидуально после анализа требований.',
      },
      {
        q: 'Какие сроки выполнения?',
        a: 'Минимальный срок — 1 день для простых работ. Стандартные сроки: курсовая — 5-7 дней, диплом — 2-3 недели. Срочные заказы выполняются быстрее, но стоят дороже.',
      },
    ],
  },
  {
    category: 'Оплата',
    icon: CreditCard,
    questions: [
      {
        q: 'Какие способы оплаты?',
        a: 'Мы принимаем банковские карты (Visa, MasterCard, МИР), переводы по СБП, оплату через Telegram Bot. Также доступна оплата в рассрочку для крупных заказов.',
      },
      {
        q: 'Можно ли оплатить частями?',
        a: 'Да, для заказов свыше 3000₽ доступна оплата частями: 50% предоплата и 50% после выполнения. Для постоянных клиентов условия могут быть гибче.',
      },
      {
        q: 'Как использовать бонусы?',
        a: 'Бонусы автоматически применяются при оформлении заказа. Вы можете выбрать сколько бонусов использовать — до 30% от стоимости заказа.',
      },
    ],
  },
  {
    category: 'Доставка',
    icon: Truck,
    questions: [
      {
        q: 'Как получить готовую работу?',
        a: 'Готовая работа отправляется в чат заказа в формате PDF и исходном формате (Word/Excel). Вы получите уведомление в Telegram о готовности.',
      },
      {
        q: 'Есть ли проверка на антиплагиат?',
        a: 'Да, все работы проверяются на уникальность. По запросу предоставляем отчёт Antiplagiat.ru с нужным процентом оригинальности.',
      },
    ],
  },
  {
    category: 'Гарантии',
    icon: Shield,
    questions: [
      {
        q: 'Есть ли гарантия на работу?',
        a: 'Да, бесплатные доработки в течение 14 дней после сдачи. Если работа не соответствует требованиям ТЗ — полный возврат средств.',
      },
      {
        q: 'Что если работа не понравится?',
        a: 'Мы предоставляем неограниченное количество правок в рамках первоначального ТЗ. Если требуется существенное изменение — обсуждаем условия индивидуально.',
      },
    ],
  },
]

// FAQ Item component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { haptic } = useTelegram()

  const toggleOpen = () => {
    haptic('light')
    setIsOpen(!isOpen)
  }

  return (
    <motion.div
      initial={false}
      style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={toggleOpen}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-main)',
            lineHeight: 1.4,
          }}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={18} color="var(--text-muted)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                padding: '0 16px 14px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// FAQ Category component
function FAQCategory({
  category,
  icon: Icon,
  questions,
  index,
}: {
  category: string
  icon: React.ElementType
  questions: { q: string; a: string }[]
  index: number
}) {
  const [isExpanded, setIsExpanded] = useState(index === 0)
  const { haptic } = useTelegram()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-default)',
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => {
          haptic('light')
          setIsExpanded(!isExpanded)
        }}
        style={{
          width: '100%',
          padding: 18,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color="#d4af37" />
        </div>
        <span
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-main)',
            textAlign: 'left',
          }}
        >
          {category}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} color="var(--text-muted)" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                padding: '0 16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {questions.map((item, i) => (
                <FAQItem key={i} question={item.q} answer={item.a} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SupportPage() {
  const { haptic, openSupport } = useTelegram()

  const handleContactSupport = () => {
    haptic('medium')
    openSupport()
  }

  return (
    <div
      className="app-content"
      style={{
        padding: '16px 16px 120px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          textAlign: 'center',
          marginBottom: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: 24,
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d061 50%, #8b6914 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
          }}
        >
          <Headphones size={40} color="#0a0a0c" strokeWidth={1.5} />
        </motion.div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
            background: 'linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ПОДДЕРЖКА
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
          }}
        >
          Мы всегда готовы помочь
        </p>
      </motion.header>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <motion.button
          onClick={handleContactSupport}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: 20,
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, var(--bg-card-solid) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 18,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #d4af37, #8b6914)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={24} color="#0a0a0c" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            Написать в чат
          </span>
        </motion.button>

        <motion.button
          onClick={() => {
            haptic('light')
            window.open('tel:+79999999999', '_self')
          }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: 20,
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, var(--bg-card-solid) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 18,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Phone size={24} color="#fff" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            Позвонить
          </span>
        </motion.button>
      </motion.div>

      {/* Working Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          padding: 18,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--bg-card-solid) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 16,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={22} color="#3b82f6" />
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: 2,
            }}
          >
            Время работы
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Ежедневно с 9:00 до 22:00 (МСК)
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#22c55e',
          }}
        >
          Онлайн
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <HelpCircle size={20} color="#d4af37" />
          Частые вопросы
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {FAQ_ITEMS.map((category, index) => (
            <FAQCategory
              key={category.category}
              category={category.category}
              icon={category.icon}
              questions={category.questions}
              index={index}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 32,
          padding: 24,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, var(--bg-card-solid) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: 20,
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 8,
          }}
        >
          Не нашли ответ?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          Наша команда поддержки ответит на любой вопрос в течение 5 минут
        </p>
        <motion.button
          onClick={handleContactSupport}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
            border: 'none',
            borderRadius: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 15,
            fontWeight: 600,
            color: '#0a0a0c',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
          }}
        >
          <Send size={18} />
          Написать в поддержку
        </motion.button>
      </motion.div>
    </div>
  )
}
