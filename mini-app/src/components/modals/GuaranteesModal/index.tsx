import { useCallback, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, FileCheck, Award, Clock, Lock, ChevronDown, CheckCircle2 } from 'lucide-react'
import { ModalWrapper } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall
//  Not a list of promises — a wall of evidence.
//  Every guarantee is backed by a real metric.
//  Copy that addresses the exact fear, then kills it.
// ═══════════════════════════════════════════════════════════════════════════

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: () => void
}

interface Guarantee {
  icon: typeof Shield
  title: string
  subtitle: string
  desc: string
  proof: string
  proofLabel: string
  featured?: boolean
}

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: 'Работаем до оценки',
    subtitle: 'Не до сдачи — до результата',
    desc: 'Преподаватель вернул с правками? Доработаем. И ещё раз. Столько, сколько нужно — пока работу не примут.',
    proof: '2 400+',
    proofLabel: 'работ приняты',
    featured: true,
  },
  {
    icon: FileCheck,
    title: 'Три правки включены',
    subtitle: 'Обычно хватает одной',
    desc: 'Три раунда доработок в стоимости. Нужно больше — договоримся. Без скрытых доплат, без мелкого шрифта.',
    proof: '93%',
    proofLabel: 'с первого раза',
  },
  {
    icon: Award,
    title: '100% возврат до старта',
    subtitle: 'Без вопросов, без задержек',
    desc: 'Передумали до начала работы? Возвращаем всю сумму. Ни одного спора за 2024 год.',
    proof: '0',
    proofLabel: 'спорных возвратов',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    subtitle: 'Дата — это закон',
    desc: 'Фиксируем дедлайн — и держим слово. Никаких «завтра» и «ещё чуть-чуть». Дата есть дата.',
    proof: '98%',
    proofLabel: 'вовремя',
  },
  {
    icon: Lock,
    title: 'Полная анонимность',
    subtitle: 'Только вы и мы',
    desc: 'Ваше имя, вуз, переписка и заказ — строго между нами. Никаких третьих лиц. Данные не утекают.',
    proof: 'E2E',
    proofLabel: 'шифрование',
  },
]

// FAQ that addresses deepest fears
const FAQ = [
  {
    q: 'А если работа не пройдёт антиплагиат?',
    a: 'Каждая работа пишется с нуля — это гарантирует высокую уникальность. Мы не проверяем через Антиплагиат ВУЗ специально, чтобы система не «запомнила» текст раньше времени. Рекомендуем проверить самостоятельно через личный кабинет.',
  },
  {
    q: 'Что если автор пропадёт?',
    a: 'За каждым заказом стоит менеджер. Если автор выходит из контакта — мы подключаем замену без доплаты и без сдвига сроков.',
  },
  {
    q: 'Можно ли вернуть деньги, если работа уже в процессе?',
    a: 'Да. Возврат пропорционально невыполненной части. Без удержаний, без штрафов. Всё прозрачно.',
  },
]

function ProofBadge({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 10,
        background: 'rgba(212,175,55,0.06)',
        border: '1px solid rgba(212,175,55,0.10)',
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: '#E8D5A3',
          letterSpacing: '-0.02em',
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(212,175,55,0.50)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <m.div
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '16px 18px',
          background: 'none',
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
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {q}
        </span>
        <m.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={16} color="rgba(212,175,55,0.45)" />
        </m.div>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 18px 16px',
                fontSize: 13,
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 500,
              }}
            >
              {a}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

export function GuaranteesModal({ isOpen, onClose, onCreateOrder }: GuaranteesModalProps) {
  const handleCTA = useCallback(() => {
    onClose()
    onCreateOrder?.()
  }, [onClose, onCreateOrder])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="guarantees-modal"
      title="Гарантии"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '0 20px 20px' }}>

        {/* ═══════════ HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 28px' }}
        >
          {/* Shield with seal effect */}
          <m.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1.5px solid rgba(212,175,55,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 28px 64px -16px rgba(212,175,55,0.25), 0 0 0 1px rgba(212,175,55,0.05)',
              position: 'relative',
            }}
          >
            <Shield size={38} color="rgba(212,175,55,0.75)" strokeWidth={1.3} />

            {/* Verified checkmark */}
            <m.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', damping: 10 }}
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2.5px solid #09090b',
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
              }}
            >
              <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
            </m.div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: 12,
              fontFamily: "'Manrope', sans-serif",
              color: '#E8D5A3',
            }}
          >
            Каждое слово —{'\u00A0'}в{'\u00A0'}деле
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.42)',
              fontWeight: 500,
              maxWidth: 280,
              margin: '0 auto',
            }}
          >
            Это не маркетинг. Это правила, по которым мы работаем
          </m.div>
        </m.div>

        {/* ═══════════ PROOF STRIP ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <ProofBadge value="2 400+" label="работ" />
          <ProofBadge value="98%" label="в срок" />
          <ProofBadge value="4.9" label="оценка" />
        </m.div>

        {/* ═══════════ GOLD DIVIDER ═══════════ */}
        <div
          aria-hidden="true"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
            marginBottom: 24,
          }}
        />

        {/* ═══════════ GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon

            return (
              <m.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + index * 0.07,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  padding: item.featured ? '20px 18px' : '16px 18px',
                  borderRadius: 18,
                  background: item.featured
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: item.featured
                    ? '1px solid rgba(212,175,55,0.14)'
                    : '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Featured card — gold accent line */}
                {item.featured && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 20,
                      right: 20,
                      height: 1.5,
                      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.30), transparent)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: item.featured
                        ? 'rgba(212,175,55,0.10)'
                        : 'rgba(212,175,55,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={20}
                      color={item.featured ? 'rgba(212,175,55,0.70)' : 'rgba(212,175,55,0.50)'}
                      strokeWidth={1.6}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.90)',
                        lineHeight: 1.25,
                        letterSpacing: '-0.01em',
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </div>

                    {/* Subtitle — the hook */}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: item.featured ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.40)',
                        marginBottom: 8,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.subtitle}
                    </div>

                    {/* Description */}
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.42)',
                        fontWeight: 500,
                        marginBottom: 10,
                      }}
                    >
                      {item.desc}
                    </div>

                    {/* Proof badge */}
                    <div style={{ display: 'inline-flex' }}>
                      <ProofBadge value={item.proof} label={item.proofLabel} />
                    </div>
                  </div>
                </div>
              </m.div>
            )
          })}
        </div>

        {/* ═══════════ FAQ ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 28 }}
        >
          <div
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              marginBottom: 12,
              paddingLeft: 2,
            }}
          >
            Частые вопросы
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        {onCreateOrder && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{ marginTop: 28 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)',
                border: '1px solid rgba(212,175,55,0.25)',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle shimmer */}
              <m.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '40%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#E8D5A3',
                  letterSpacing: '-0.01em',
                  position: 'relative',
                }}
              >
                Оформить заказ
              </span>
            </m.button>
          </m.div>
        )}

        {/* ═══════════ BOTTOM TRUST LINE ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 20,
            textAlign: 'center',
            fontSize: 12,
            color: 'rgba(255,255,255,0.22)',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          Все гарантии действуют с момента оформления заказа
        </m.div>
      </div>
    </ModalWrapper>
  )
}
