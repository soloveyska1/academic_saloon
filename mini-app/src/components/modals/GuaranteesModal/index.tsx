import { useCallback, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, Award, Clock, Lock, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react'
import { ModalWrapper } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall
//  Evidence-backed guarantees. Each card has a proof metric.
//  Structured: Hero → Stats → Proof Cards → FAQ → CTA
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
        borderRadius: 12,
        background: open
          ? 'var(--gold-glass-subtle)'
          : 'var(--bg-glass)',
        border: open
          ? '1px solid var(--gold-glass-subtle)'
          : '1px solid var(--border-default)',
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
          color: open
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
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
          <ChevronDown
            size={15}
            color={open
              ? 'var(--gold-400)'
              : 'var(--text-muted)'
            }
          />
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
              color: 'var(--text-muted)',
              fontWeight: 600,
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
        borderRadius: 12,
        background: isFeatured
          ? 'linear-gradient(135deg, var(--gold-glass-subtle) 0%, transparent 100%)'
          : 'var(--bg-glass)',
        border: isFeatured
          ? '1px solid var(--gold-glass-medium)'
          : '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top shine on featured card */}
      {isFeatured && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 16, right: 16, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--gold-glass-strong), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: isFeatured
            ? 'linear-gradient(135deg, var(--gold-glass-medium), var(--gold-glass-subtle))'
            : 'var(--gold-glass-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: isFeatured
            ? '1px solid var(--gold-glass-subtle)'
            : 'none',
        }}>
          <Icon
            size={18}
            color="var(--gold-400)"
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
              color: 'var(--text-primary)',
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
              background: isFeatured
                ? 'var(--gold-glass-subtle)'
                : 'var(--bg-glass)',
              border: `1px solid ${isFeatured
                ? 'var(--gold-glass-subtle)'
                : 'var(--border-subtle)'}`,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: isFeatured
                  ? 'var(--gold-200)'
                  : 'var(--gold-400)',
                letterSpacing: '-0.02em',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {item.proof}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {item.proofLabel}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--gold-400)',
            marginBottom: 8,
            opacity: isFeatured ? 0.7 : 0.5,
          }}>
            {item.hook}
          </div>

          <div style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}>
            {item.desc}
          </div>
        </div>
      </div>
    </m.div>
  )
}

// ═══════════ STAT PILL ═══════════
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--success, #4ade80)',
        letterSpacing: '-0.02em',
        fontFamily: "'Manrope', sans-serif",
      }}>
        {value}
      </span>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--success, #4ade80)',
        opacity: 0.6,
      }}>
        {label}
      </span>
    </div>
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
      accentColor="var(--gold-400)"
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
              borderRadius: 12,
              background: 'linear-gradient(145deg, var(--gold-glass-medium) 0%, var(--gold-glass-subtle) 100%)',
              border: '1.5px solid var(--gold-glass-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: 'var(--glow-gold)',
              position: 'relative',
            }}
          >
            <Shield
              size={32}
              color="var(--gold-400)"
              strokeWidth={1.3}
            />
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
                border: '2.5px solid var(--bg-void)',
                boxShadow: '0 4px 12px rgba(34,197,94,0.30)',
              }}
            >
              <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />
            </m.div>
          </m.div>

          <div style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            marginBottom: 8,
            fontFamily: "'Manrope', sans-serif",
            color: 'var(--gold-200)',
          }}>
            Гарантии, а не обещания
          </div>

          <div style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-muted)',
            fontWeight: 600,
            maxWidth: 260,
            margin: '0 auto',
          }}>
            2 400+ работ выполнено по этим правилам
          </div>
        </m.div>

        {/* ═══════════ HERO STATS ═══════════ */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, type: 'spring', damping: 20 }}
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)',
            border: '1px solid rgba(34,197,94,0.12)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <StatPill value="2 400+" label="работ" />
          <div style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.20)',
            flexShrink: 0,
          }} />
          <StatPill value="98%" label="в срок" />
          <div style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.20)',
            flexShrink: 0,
          }} />
          <StatPill value="93%" label="с 1-го раза" />
        </m.div>

        {/* ═══════════ DIVIDER ═══════════ */}
        <div
          aria-hidden="true"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--gold-glass-medium), transparent)',
            marginBottom: 16,
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
          style={{ marginTop: 24 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            paddingLeft: 2,
          }}>
            <Sparkles
              size={10}
              color="var(--gold-400)"
              strokeWidth={2}
            />
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              Частые вопросы
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            style={{ marginTop: 24 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              style={{
                width: '100%',
                padding: '15px 24px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--gold-glass-medium) 0%, var(--gold-glass-subtle) 100%)',
                border: '1px solid var(--gold-glass-strong)',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--glow-gold)',
              }}
            >
              {/* Shimmer */}
              <m.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '40%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, var(--gold-glass-subtle), transparent)',
                }}
              />
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--gold-200)',
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
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          Все гарантии действуют с момента оформления заказа
        </m.div>
      </div>
    </ModalWrapper>
  )
}
