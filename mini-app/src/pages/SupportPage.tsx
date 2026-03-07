import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronDown,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Headphones,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { SupportChat } from '../components/support/SupportChat'
import { useTelegram } from '../hooks/useUserData'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'

const FAQ_ITEMS = [
  {
    id: 'payment',
    icon: CreditCard,
    title: 'Как проходит оплата и когда стартует заказ?',
    answer:
      'После расчёта стоимости вы оплачиваете заказ внутри карточки. Как только платёж подтверждён, заказ сразу переходит в работу.',
  },
  {
    id: 'deadline',
    icon: Clock3,
    title: 'Что делать, если срок горит или уже истёк?',
    answer:
      'Для срочных задач лучше сразу написать в чат поддержки. Мы проверим, можно ли сохранить текущую цену и срок, или предложим новый сценарий.',
  },
  {
    id: 'revisions',
    icon: RefreshCcw,
    title: 'Как работают правки и гарантии?',
    answer:
      'В заказ входит 3 бесплатных круга правок. Если работа ещё не начата, можно остановить заказ. После старта доводим результат до согласованного состояния.',
  },
  {
    id: 'files',
    icon: FileText,
    title: 'Куда прикреплять методичку, примеры и требования?',
    answer:
      'Все материалы добавляются прямо в заявке и затем остаются внутри заказа. Если что-то не прикрепилось, напишите в чат поддержки и мы быстро проверим загрузку.',
  },
] as const

function SurfaceCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  title: string
  description: string
  icon: typeof CreditCard
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 14px 15px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="#d4af37" />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function SegmentedButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: typeof MessageCircle
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 46,
        padding: '0 14px',
        borderRadius: 16,
        border: active ? '1px solid rgba(212,175,55,0.24)' : '1px solid rgba(255,255,255,0.06)',
        background: active
          ? 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(18,18,21,0.94) 100%)'
          : 'rgba(255,255,255,0.03)',
        color: active ? '#f5e6a3' : 'var(--text-secondary)',
        fontSize: 13.5,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      <Icon size={16} />
      {label}
    </motion.button>
  )
}

function FaqItem({
  id,
  expanded,
  title,
  answer,
  icon: Icon,
  onToggle,
}: {
  id: string
  expanded: boolean
  title: string
  answer: string
  icon: typeof CreditCard
  onToggle: (id: string) => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={() => onToggle(id)}
      style={{
        width: '100%',
        borderRadius: 20,
        padding: 16,
        background: expanded
          ? 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(18,18,21,0.96) 100%)'
          : 'rgba(255,255,255,0.035)',
        border: expanded ? '1px solid rgba(212,175,55,0.18)' : '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="#d4af37" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
            {title}
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="rgba(255,255,255,0.55)" />
        </motion.div>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
          }}
        >
          {answer}
        </div>
      )}
    </motion.button>
  )
}

export function SupportPage() {
  const { haptic, openSupport } = useTelegram()
  const [searchParams, setSearchParams] = useSearchParams()
  const safeBack = useSafeBackNavigation('/')
  const [expandedFaq, setExpandedFaq] = useState<string>(FAQ_ITEMS[0].id)

  const activeView = useMemo(
    () => (searchParams.get('view') === 'chat' ? 'chat' : 'faq'),
    [searchParams]
  )

  const handleBack = useCallback(() => {
    haptic('light')
    safeBack()
  }, [haptic, safeBack])

  const setView = useCallback((view: 'faq' | 'chat') => {
    setSearchParams({ view })
  }, [setSearchParams])

  const handleOpenTelegram = useCallback(() => {
    haptic('medium')
    openSupport()
  }, [haptic, openSupport])

  const handleOpenFaq = useCallback((faqId: string) => {
    setExpandedFaq(faqId)
    setView('faq')
    haptic('light')
  }, [haptic, setView])

  const handleToggleFaq = useCallback((faqId: string) => {
    setExpandedFaq(current => current === faqId ? '' : faqId)
    haptic('light')
  }, [haptic])

  return (
    <div
      className="page-full-width"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
      }}
    >
      <div className="page-background">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div
        className="page-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          paddingBottom: 120,
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleBack}
              aria-label="Назад"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} color="var(--text-main)" />
            </motion.button>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(212,175,55,0.72)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                Центр помощи
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.05,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Всё по заказу в одном месте
              </h1>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  maxWidth: 360,
                }}
              >
                Быстрые ответы, чат поддержки и прямой переход в Telegram, если нужен внешний канал.
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenTelegram}
            style={{
              minHeight: 44,
              padding: '0 14px',
              borderRadius: 14,
              border: '1px solid rgba(212,175,55,0.18)',
              background: 'rgba(212,175,55,0.1)',
              color: '#d4af37',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <ExternalLink size={16} />
            Telegram
          </motion.button>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(18,18,21,0.97) 55%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.16)',
            boxShadow: '0 20px 42px -36px rgba(212, 175, 55, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Headphones size={22} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Помощь без лишних переходов
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Сначала можно быстро посмотреть готовый ответ, а если вопрос нестандартный или срочный, сразу перейти в чат поддержки.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <SurfaceCard
              icon={CreditCard}
              title="Оплата"
              description="Показываем, где оплатить и что делать, если подтверждение задержалось."
              onClick={() => handleOpenFaq('payment')}
            />
            <SurfaceCard
              icon={Clock3}
              title="Сроки"
              description="Подскажем, как вести срочный заказ и что делать при истечении срока."
              onClick={() => handleOpenFaq('deadline')}
            />
            <SurfaceCard
              icon={RefreshCcw}
              title="Правки"
              description="Коротко объясняем, как идут бесплатные круги правок и когда нужен отдельный расчёт."
              onClick={() => handleOpenFaq('revisions')}
            />
            <SurfaceCard
              icon={FileText}
              title="Файлы"
              description="Помогаем с загрузкой методички, требований, примеров и ссылок."
              onClick={() => handleOpenFaq('files')}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <SegmentedButton
              active={activeView === 'faq'}
              label="Быстрые ответы"
              icon={ShieldCheck}
              onClick={() => setView('faq')}
            />
            <SegmentedButton
              active={activeView === 'chat'}
              label="Чат поддержки"
              icon={MessageCircle}
              onClick={() => setView('chat')}
            />
          </div>
        </motion.section>

        {activeView === 'faq' ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {FAQ_ITEMS.map(item => (
              <FaqItem
                key={item.id}
                id={item.id}
                icon={item.icon}
                title={item.title}
                answer={item.answer}
                expanded={expandedFaq === item.id}
                onToggle={handleToggleFaq}
              />
            ))}

            <div
              style={{
                borderRadius: 24,
                padding: 18,
                background: 'rgba(12,12,15,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 24px 46px -36px rgba(0,0,0,0.9)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Не нашли свой вопрос?
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Откройте чат поддержки в этом же разделе. Переписка сохранится внутри приложения, а если удобнее, можно перейти в Telegram.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10 }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setView('chat')}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: 'none',
                    background: 'var(--gold-metallic)',
                    color: '#090909',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Открыть чат
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={handleOpenTelegram}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f4f4f5',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Telegram
                </motion.button>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              flex: 1,
              minHeight: 0,
              borderRadius: 26,
              overflow: 'hidden',
              background: 'rgba(12,12,15,0.9)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 24px 46px -36px rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '16px 18px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={18} color="#d4af37" />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                    Чат поддержки
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    По оплате, срокам, правкам и файлам
                  </div>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleOpenTelegram}
                style={{
                  minHeight: 38,
                  padding: '0 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(212,175,55,0.16)',
                  background: 'rgba(212,175,55,0.08)',
                  color: '#d4af37',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={14} />
                Telegram
              </motion.button>
            </div>

            <div
              style={{
                padding: '12px 18px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', flex: '1 1 140px' }}>
                Ответ обычно до 10 минут
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', flex: '1 1 160px' }}>
                Можно писать текстом и присылать файлы
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', flex: '1 1 160px' }}>
                Если нужно, переведём разговор в Telegram
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <SupportChat />
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}
