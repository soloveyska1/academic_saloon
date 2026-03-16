import { useCallback, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, Award, Clock, Lock, ChevronDown, CheckCircle2 } from 'lucide-react'
import { ModalWrapper } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall
//  Compact, evidence-backed guarantees. No fluff.
// ═══════════════════════════════════════════════════════════════════════════

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: () => void
}

interface Guarantee {
  icon: typeof Shield
  title: string
  hook: string
  desc: string
}

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: 'Работаем до оценки',
    hook: 'Не до сдачи — до результата',
    desc: 'Преподаватель вернул с правками? Доработаем столько, сколько нужно. Три раунда включены в стоимость.',
  },
  {
    icon: Award,
    title: '100% возврат до старта',
    hook: 'Без вопросов и задержек',
    desc: 'Передумали до начала работы — возвращаем всю сумму. В процессе — пропорционально.',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    hook: 'Дата — это закон',
    desc: 'Фиксируем дедлайн и держим слово. За каждым заказом стоит менеджер — если автор пропал, подключаем замену.',
  },
  {
    icon: Lock,
    title: 'Полная анонимность',
    hook: 'Только вы и мы',
    desc: 'Имя, вуз, переписка — строго между нами. Никаких третьих лиц, E2E-шифрование.',
  },
]

const STATS = [
  { value: '2 400+', label: 'работ' },
  { value: '98%', label: 'в срок' },
  { value: '93%', label: 'с 1-го раза' },
] as const

const FAQ = [
  {
    q: 'А если не пройдёт антиплагиат?',
    a: 'Каждая работа пишется с нуля — уникальность высокая. Мы не прогоняем через систему заранее, чтобы она не «запомнила» текст. Рекомендуем проверить самостоятельно.',
  },
  {
    q: 'Что если автор пропадёт?',
    a: 'За каждым заказом стоит менеджер. Если автор выходит из контакта — подключаем замену без доплаты и без сдвига сроков.',
  },
  {
    q: 'Можно вернуть деньги, если работа в процессе?',
    a: 'Да. Возврат пропорционально невыполненной части. Без удержаний, без штрафов.',
  },
]

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.05 }}
      style={{
        borderRadius: 14,
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
          padding: '14px 16px',
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.70)', lineHeight: 1.4, flex: 1 }}>
          {q}
        </span>
        <m.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={15} color="rgba(212,175,55,0.40)" />
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
            <div style={{ padding: '0 16px 14px', fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>
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

        {/* ═══════════ COMPACT HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '4px 0 20px' }}
        >
          <m.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1.5px solid rgba(212,175,55,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 16px 40px -12px rgba(212,175,55,0.20)',
              position: 'relative',
            }}
          >
            <Shield size={28} color="rgba(212,175,55,0.70)" strokeWidth={1.4} />
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 10 }}
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #09090b',
              }}
            >
              <CheckCircle2 size={11} color="#fff" strokeWidth={2.5} />
            </m.div>
          </m.div>

          <div style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            marginBottom: 8,
            fontFamily: "'Manrope', sans-serif",
            color: '#E8D5A3',
          }}>
            Каждое слово —{'\u00A0'}в{'\u00A0'}деле
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.38)', fontWeight: 500, maxWidth: 260, margin: '0 auto' }}>
            Правила, по которым мы работаем
          </div>
        </m.div>

        {/* ═══════════ STATS STRIP ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 20,
          }}
        >
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.08)',
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: '#E8D5A3', letterSpacing: '-0.02em', fontFamily: "'Manrope', sans-serif" }}>
                {value}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(212,175,55,0.45)' }}>
                {label}
              </span>
            </div>
          ))}
        </m.div>

        {/* ═══════════ DIVIDER ═══════════ */}
        <div
          aria-hidden="true"
          style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)', marginBottom: 18 }}
        />

        {/* ═══════════ GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            return (
              <m.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: index === 0
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: index === 0
                    ? '1px solid rgba(212,175,55,0.12)'
                    : '1px solid rgba(255,255,255,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {index === 0 && (
                  <div aria-hidden="true" style={{
                    position: 'absolute', top: 0, left: 20, right: 20, height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: index === 0 ? 'rgba(212,175,55,0.10)' : 'rgba(212,175,55,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} color={index === 0 ? 'rgba(212,175,55,0.65)' : 'rgba(212,175,55,0.45)'} strokeWidth={1.6} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.25, letterSpacing: '-0.01em', marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: index === 0 ? 'rgba(212,175,55,0.50)' : 'rgba(212,175,55,0.35)', marginBottom: 6 }}>
                      {item.hook}
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              </m.div>
            )
          })}
        </div>

        {/* ═══════════ FAQ ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ marginTop: 22 }}
        >
          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.24)',
            marginBottom: 10,
            paddingLeft: 2,
          }}>
            Частые вопросы
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FAQ.map((item, i) => (
              <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
            ))}
          </div>
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        {onCreateOrder && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ marginTop: 22 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.07) 100%)',
                border: '1px solid rgba(212,175,55,0.22)',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <m.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.06), transparent)',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.01em', position: 'relative' }}>
                Оформить заказ
              </span>
            </m.button>
          </m.div>
        )}

        {/* ═══════════ TRUST LINE ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', fontWeight: 500 }}
        >
          Все гарантии действуют с момента оформления заказа
        </m.div>
      </div>
    </ModalWrapper>
  )
}
