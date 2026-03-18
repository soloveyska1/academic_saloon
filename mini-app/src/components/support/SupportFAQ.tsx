import { memo, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  RefreshCcw,
  Search,
  Sparkles,
  X,
  MessageCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import s from '../../pages/SupportPage.module.css'
import { askAssistant } from '../../api/userApi'
import type { AskAssistantResponse } from '../../api/userApi'

interface FaqItemData {
  id: string
  icon: LucideIcon
  title: string
  answer: string
}

const FAQ_ITEMS: FaqItemData[] = [
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
]

interface Props {
  expandedFaq: string
  onToggleFaq: (faqId: string) => void
  onOpenChat: () => void
  onOpenTelegram: () => void
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const SupportFAQ = memo(function SupportFAQ({
  expandedFaq,
  onToggleFaq,
  onOpenChat,
  onOpenTelegram,
}: Props) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [aiResult, setAiResult] = useState<AskAssistantResponse | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setAiResult(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 3) {
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await askAssistant(value.trim())
        setAiResult(result)
      } catch {
        // Silently fail — show default FAQ
      } finally {
        setSearching(false)
      }
    }, 500)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setAiResult(null)
    setSearching(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const showAiAnswer = aiResult?.found && aiResult.answer
  const showDefaultFaq = !query.trim() || query.trim().length < 3

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {/* Search Input */}
      <div style={{
        position: 'relative',
        marginBottom: 4,
      }}>
        <div style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}>
          {searching ? (
            <Sparkles size={17} color="var(--gold-400)" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
          ) : (
            <Search size={17} color="var(--text-muted)" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Задайте вопрос..."
          style={{
            width: '100%',
            padding: '13px 40px 13px 42px',
            borderRadius: 14,
            background: 'var(--surface-hover)',
            border: '1px solid var(--surface-active)',
            color: 'var(--text-main, #f0f0f0)',
            fontSize: 14.5,
            fontWeight: 500,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--gold-glass-strong)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--surface-active)'
          }}
        />
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--border-strong)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} color="var(--text-secondary)" />
          </motion.button>
        )}
      </div>

      {/* AI Answer */}
      <AnimatePresence mode="wait">
        {showAiAnswer && (
          <motion.div
            key="ai-answer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--gold-glass-subtle), rgba(212,175,55,0.02))',
              border: '1px solid var(--border-gold)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}>
              <Sparkles size={15} color="var(--gold-400)" />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#d4af37',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Ответ ассистента
              </span>
            </div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-main, #e8e8e8)',
              whiteSpace: 'pre-line',
            }}>
              {aiResult!.answer}
            </div>

            {/* Related questions */}
            {aiResult!.related.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 8,
                }}>
                  Похожие вопросы:
                </div>
                {aiResult!.related.map((r) => (
                  <motion.button
                    key={r.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSearch(r.question)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      marginBottom: 4,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-secondary, #b8b8b8)',
                      lineHeight: 1.4,
                    }}
                  >
                    {r.question}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Suggest human support */}
            {aiResult!.suggest_human && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onOpenChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  marginTop: 14,
                  padding: '11px 16px',
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.25)',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#d4af37',
                }}
              >
                <MessageCircle size={15} />
                Спросить менеджера
              </motion.button>
            )}
          </motion.div>
        )}

        {/* No results from AI */}
        {!showDefaultFaq && !showAiAnswer && !searching && query.trim().length >= 3 && (
          <motion.div
            key="no-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 14,
              color: 'var(--text-muted, #888)',
              marginBottom: 12,
            }}>
              По вашему запросу ничего не нашлось
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onOpenChat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 12,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.25)',
                cursor: 'pointer',
                fontSize: 13.5,
                fontWeight: 600,
                color: '#d4af37',
              }}
            >
              <MessageCircle size={15} />
              Написать в поддержку
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default FAQ items (show when not searching) */}
      {showDefaultFaq && FAQ_ITEMS.map((item) => (
        <FaqItemRow
          key={item.id}
          item={item}
          expanded={expandedFaq === item.id}
          onToggle={onToggleFaq}
        />
      ))}

      {/* Not found CTA */}
      {showDefaultFaq && (
        <div className={s.notFoundCard}>
          <div className={s.notFoundTitle}>Не нашли свой вопрос?</div>
          <div className={s.notFoundText}>
            Откройте чат поддержки в этом же разделе. Переписка сохранится внутри приложения, а если удобнее, можно перейти в Telegram.
          </div>
          <div className={s.notFoundActions}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={onOpenChat}
              className={s.primaryButton}
            >
              Открыть чат
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={onOpenTelegram}
              className={s.secondaryButton}
            >
              Telegram
            </motion.button>
          </div>
        </div>
      )}
    </motion.section>
  )
})

/* ─── FAQ Item Row ─── */

const FaqItemRow = memo(function FaqItemRow({
  item,
  expanded,
  onToggle,
}: {
  item: FaqItemData
  expanded: boolean
  onToggle: (id: string) => void
}) {
  const Icon = item.icon

  const handleClick = useCallback(() => {
    onToggle(item.id)
  }, [item.id, onToggle])

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={`${s.faqItem} ${expanded ? s.faqItemExpanded : ''}`}
    >
      <div className={s.faqHeader}>
        <div className={s.faqIcon}>
          <Icon size={18} color="var(--gold-400)" />
        </div>
        <div className={s.faqTitle}>{item.title}</div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="rgba(255,255,255,0.55)" />
        </motion.div>
      </div>

      {expanded && (
        <div className={s.faqAnswer}>{item.answer}</div>
      )}
    </motion.button>
  )
})
