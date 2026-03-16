import { useCallback, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, Award, Clock, Lock, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react'
import { ModalWrapper } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall
//  Evidence-backed guarantees. Each card has a proof metric.
//  Structured: Hero → Proof Cards → FAQ → CTA
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
  proof: string
  proofLabel: string
}

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: 'Работаем до оценки',
    hook: 'Не до сдачи — до результата',
    desc: 'Преподаватель вернул с правками? Доработаем столько раз, сколько нужно. Три раунда включены в стоимость.',
    proof: '93%',
    proofLabel: 'сдают с 1-го раза',
  },
  {
    icon: Award,
    title: '100% возврат до старта',
    hook: 'Без вопросов и задержек',
    desc: 'Передумали до начала работы — возвращаем всю сумму. В процессе — пропорционально.',
    proof: '0',
    proofLabel: 'споров за 2024',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    hook: 'Дата — это закон',
    desc: 'Фиксируем дедлайн и держим слово. Если автор пропал — менеджер подключает замену без доплаты.',
    proof: '98%',
    proofLabel: 'вовремя',
  },
  {
    icon: Lock,
    title: 'Полная анонимность',
    hook: 'Только вы и мы',
    desc: 'Имя, вуз, переписка — строго между нами. Никаких третьих лиц, E2E-шифрование.',
    proof: 'E2E',
    proofLabel: 'шифрование',
  },
]

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

// ═══════════ FAQ ITEM ═══════════
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 + index * 0.05 }}
      style={{
        borderRadius: 14,
        background: open ? 'rgba(212,175,55,0.03)' : 'rgba(255,255,255,0.02)',
        border: open ? '1px solid rgba(212,175,55,0.08)' : '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
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
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: open ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.55)',
          lineHeight: 1.4,
          flex: 1,
          transition: 'color 0.2s',
        }}>
          {q}
        </span>
        <m.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={15} color={open ? 'rgba(212,175,55,0.60)' : 'rgba(212,175,55,0.30)'} />
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
            <div style={{
              padding: '0 16px 14px',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
            }}>
              {a}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

// ═══════════ GUARANTEE CARD ═══════════
function GuaranteeCard({ item, index }: { item: Guarantee; index: number }) {
  const Icon = item.icon
  const isFeatured = index === 0

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: isFeatured ? '16px 16px 14px' : '14px 16px',
        borderRadius: 16,
        background: isFeatured
          ? 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)'
          : 'rgba(255,255,255,0.02)',
        border: isFeatured
          ? '1px solid rgba(212,175,55,0.14)'
          : '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top shine on featured card */}
      {isFeatured && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 16, right: 16, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.30), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: isFeatured
            ? 'linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.06))'
            : 'rgba(212,175,55,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: isFeatured ? '1px solid rgba(212,175,55,0.10)' : 'none',
        }}>
          <Icon
            size={18}
            color={isFeatured ? 'rgba(212,175,55,0.75)' : 'rgba(212,175,55,0.45)'}
            strokeWidth={1.6}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 2,
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: isFeatured ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.82)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}>
              {item.title}
            </div>

            {/* Proof badge */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 3,
              flexShrink: 0,
              padding: '3px 8px',
              borderRadius: 8,
              background: isFeatured ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isFeatured ? 'rgba(212,175,55,0.10)' : 'rgba(255,255,255,0.04)'}`,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: isFeatured ? '#E8D5A3' : 'rgba(212,175,55,0.60)',
                letterSpacing: '-0.02em',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {item.proof}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: isFeatured ? 'rgba(212,175,55,0.50)' : 'rgba(212,175,55,0.30)',
                whiteSpace: 'nowrap',
              }}>
                {item.proofLabel}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: isFeatured ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.35)',
            marginBottom: 6,
          }}>
            {item.hook}
          </div>

          <div style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.40)',
            fontWeight: 500,
          }}>
            {item.desc}
          </div>
        </div>
      </div>
    </m.div>
  )
}

// ═══════════ MAIN MODAL ═══════════
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '4px 0 22px' }}
        >
          {/* Shield icon with verified badge */}
          <m.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1.5px solid rgba(212,175,55,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 20px 48px -14px rgba(212,175,55,0.25)',
              position: 'relative',
            }}
          >
            <Shield size={32} color="rgba(212,175,55,0.75)" strokeWidth={1.3} />
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 10 }}
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2.5px solid #09090b',
                boxShadow: '0 4px 12px rgba(34,197,94,0.30)',
              }}
            >
              <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />
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
            Гарантии, а не обещания
          </div>

          <div style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.42)',
            fontWeight: 500,
            maxWidth: 260,
            margin: '0 auto',
          }}>
            2 400+ работ выполнено по этим правилам
          </div>
        </m.div>

        {/* ═══════════ HERO STAT ═══════════ */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, type: 'spring', damping: 20 }}
          style={{
            padding: '14px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)',
            border: '1px solid rgba(34,197,94,0.12)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {[
            { value: '2 400+', label: 'работ' },
            { value: '98%', label: 'в срок' },
            { value: '93%', label: 'с 1-го раза' },
          ].map(({ value, label }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {i > 0 && (
                <div style={{
                  position: 'absolute',
                  marginLeft: -12,
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'rgba(34,197,94,0.20)',
                }} />
              )}
              <span style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#4ade80',
                letterSpacing: '-0.02em',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {value}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(34,197,94,0.50)',
              }}>
                {label}
              </span>
            </div>
          ))}
        </m.div>

        {/* ═══════════ DIVIDER ═══════════ */}
        <div
          aria-hidden="true"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
            marginBottom: 18,
          }}
        />

        {/* ═══════════ GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GUARANTEES.map((item, index) => (
            <GuaranteeCard key={item.title} item={item} index={index} />
          ))}
        </div>

        {/* ═══════════ FAQ ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ marginTop: 22 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10,
            paddingLeft: 2,
          }}>
            <Sparkles size={10} color="rgba(212,175,55,0.40)" strokeWidth={2} />
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
            }}>
              Частые вопросы
            </span>
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
                padding: '15px 24px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 100%)',
                border: '1px solid rgba(212,175,55,0.25)',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 24px -8px rgba(212,175,55,0.15)',
              }}
            >
              {/* Shimmer */}
              <m.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
                }}
              />
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#E8D5A3',
                letterSpacing: '-0.01em',
                position: 'relative',
              }}>
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
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
            fontWeight: 500,
          }}
        >
          Все гарантии действуют с момента оформления заказа
        </m.div>
      </div>
    </ModalWrapper>
  )
}
