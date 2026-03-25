import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, Award, Clock, Lock, ChevronDown, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall
//  Evidence-backed guarantees. Each card has a proof metric.
//  Structured: Hero → Stats Grid → Proof Cards → FAQ → CTA
// ═══════════════════════════════════════════════════════════════════════════

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateOrder?: () => void
}

interface Guarantee {
  icon: LucideIcon
  title: string
  hook: string
  desc: string
  proof: string
  proofLabel: string
}

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: 'Работаем до вашей оценки',
    hook: 'Не до сдачи — до результата',
    desc: 'Преподаватель вернул с правками? Исправим бесплатно, столько раз, сколько нужно.',
    proof: '93%',
    proofLabel: 'без пересдач',
  },
  {
    icon: Award,
    title: '100% возврат до старта',
    hook: 'Без вопросов и задержек',
    desc: 'Передумали до начала — вернём всю сумму. Даже в процессе — платите только за сделанное.',
    proof: '0',
    proofLabel: 'споров за 2024',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    hook: 'Вы выбираете дату — мы гарантируем',
    desc: 'Фиксируем дедлайн в договоре. Если автор задерживает — менеджер берёт на себя без доплаты.',
    proof: '98%',
    proofLabel: 'в назначенный срок',
  },
  {
    icon: Lock,
    title: 'Полная анонимность',
    hook: 'Только вы и мы — больше никто',
    desc: 'Имя, вуз, переписка — строго между нами. Защита на уровне банка, никаких утечек.',
    proof: 'E2E',
    proofLabel: 'защита',
  },
]

const FAQ = [
  {
    q: 'Что если система антиплагиата покажет совпадения?',
    a: 'Каждая работа пишется авторами с нуля — уникальность 90%+. Если процент ниже ожидаемого, переделаем бесплатно. Это включено в гарантию.',
  },
  {
    q: 'Что если автор сорвал сроки?',
    a: 'За каждым заказом следит менеджер. Если автор задерживает — мы сразу подключаем другого специалиста. Сроки и цена не меняются.',
  },
  {
    q: 'Смогу ли я вернуть деньги, если работа уже началась?',
    a: 'Да. Вы платите только за выполненную часть — мы считаем честно. Никаких штрафов и удержаний.',
  },
]

// ═══════════ FAQ ITEM ═══════════
interface FAQItemProps {
  q: string
  a: string
  index: number
}

const FAQItem = memo(function FAQItem({ q, a, index }: FAQItemProps) {
  const [open, setOpen] = useState(false)
  const contentId = `faq-content-${index}`

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.05 }}
      style={{
        borderRadius: 10,
        background: open ? 'var(--gold-glass-subtle)' : 'var(--bg-glass)',
        border: open ? '1px solid var(--gold-glass-subtle)' : '1px solid var(--border-default)',
        overflow: 'hidden',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: '100%',
          padding: '14px 14px',
          minHeight: 48,
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
          fontSize: 13, fontWeight: 600,
          color: open ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: 1.4, flex: 1,
          transition: 'color 0.2s',
        }}>
          {q}
        </span>
        <m.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={14} color={open ? 'var(--gold-400)' : 'var(--text-muted)'} />
        </m.div>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            id={contentId}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 14px',
              fontSize: 12, lineHeight: 1.6,
              color: 'var(--text-muted)', fontWeight: 600,
            }}>
              {a}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
})

// ═══════════ GUARANTEE CARD ═══════════
interface GuaranteeCardProps {
  item: Guarantee
  index: number
}

const GuaranteeCard = memo(function GuaranteeCard({ item, index }: GuaranteeCardProps) {
  const Icon = item.icon
  const isFeatured = index === 0

  return (
    <m.div
      role="article"
      aria-label={`${item.title}: ${item.proof} ${item.proofLabel}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: '14px 14px',
        borderRadius: 12,
        background: isFeatured
          ? 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)'
          : 'var(--bg-glass)',
        border: isFeatured
          ? '1px solid rgba(212,175,55,0.15)'
          : '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top shine on featured card */}
      {isFeatured && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: isFeatured
            ? 'var(--gold-glass-medium)'
            : 'var(--gold-glass-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          border: isFeatured ? '1px solid rgba(212,175,55,0.12)' : 'none',
        }}>
          <Icon size={16} color="var(--gold-400)" strokeWidth={1.6} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, marginBottom: 2,
          }}>
            <div style={{
              fontSize: isFeatured ? 14 : 13.5,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}>
              {item.title}
            </div>

            {/* Proof badge */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 3,
              flexShrink: 0, padding: '3px 7px', borderRadius: 7,
              background: isFeatured
                ? 'rgba(212,175,55,0.08)'
                : 'var(--bg-glass)',
              border: `1px solid ${isFeatured ? 'rgba(212,175,55,0.12)' : 'var(--border-subtle)'}`,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: 'var(--gold-400)',
                letterSpacing: '-0.02em',
              }}>
                {item.proof}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>
                {item.proofLabel}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--gold-400)',
            marginBottom: 6,
            opacity: isFeatured ? 0.7 : 0.5,
          }}>
            {item.hook}
          </div>

          <div style={{
            fontSize: 12, lineHeight: 1.5,
            color: 'var(--text-muted)', fontWeight: 600,
          }}>
            {item.desc}
          </div>
        </div>
      </div>
    </m.div>
  )
})

// ═══════════ MAIN MODAL ═══════════
export function GuaranteesModal({ isOpen, onClose, onCreateOrder }: GuaranteesModalProps) {
  const handleCTA = useCallback(() => {
    triggerHaptic('medium')
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
      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════════ HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '4px 0 20px' }}
        >
          {/* Shield icon with verified badge */}
          <m.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 72, height: 72, borderRadius: 14,
              background: 'linear-gradient(160deg, rgba(27,22,12,0.9) 0%, rgba(12,12,12,0.95) 100%)',
              border: '1px solid rgba(212,175,55,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 24px -8px rgba(212,175,55,0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top shine */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.20), transparent)',
            }} />
            <Shield size={30} color="var(--gold-400)" strokeWidth={1.3} />
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 10 }}
              style={{
                position: 'absolute', bottom: -3, right: -3,
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-void)',
                boxShadow: '0 2px 8px rgba(212,175,55,0.25)',
              }}
            >
              <CheckCircle2 size={11} color="var(--text-on-gold)" strokeWidth={2.5} />
            </m.div>
          </m.div>

          <div style={{
            fontSize: 21, fontWeight: 700, lineHeight: 1.2,
            letterSpacing: '-0.02em', marginBottom: 6,
            color: 'var(--gold-200)',
          }}>
            Гарантии, которые работают
          </div>

          <div style={{
            fontSize: 13, lineHeight: 1.5,
            color: 'var(--text-muted)', fontWeight: 600,
            maxWidth: 260, margin: '0 auto',
          }}>
            2 400+ студентов уже получили результат
          </div>
        </m.div>

        {/* ═══════════ STATS GRID (gold, matching CashbackModal) ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            { value: '2 400+', label: 'работ' },
            { value: '98%', label: 'в срок' },
            { value: '93%', label: 'без пересдач' },
          ].map((stat, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + i * 0.05 }}
              style={{
                position: 'relative',
                padding: '12px 8px 10px',
                borderRadius: 12,
                background: 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)',
                border: '1px solid rgba(212,175,55,0.10)',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Subtle top shine */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
              }} />
              <div style={{
                fontSize: 14, fontWeight: 800, lineHeight: 1.2,
                background: 'linear-gradient(180deg, var(--gold-150), var(--gold-400))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 3,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {stat.label}
              </div>
            </m.div>
          ))}
        </m.div>

        {/* ═══════════ GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <GuaranteeCard key={item.title} item={item} index={index} />
          ))}
        </div>

        {/* ═══════════ FAQ ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginTop: 20 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 8, paddingLeft: 2,
          }}>
            <Sparkles size={10} color="var(--gold-400)" strokeWidth={2} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-muted)',
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
            transition={{ delay: 0.5 }}
            style={{ marginTop: 20 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              aria-label="Оформить заказ с гарантией"
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                background: 'var(--gold-metallic)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--glow-gold)',
              }}
            >
              {/* Shimmer */}
              <m.div
                aria-hidden="true"
                animate={{ x: ['-100%', '250%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '35%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                }}
              />
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: 'var(--text-on-gold)',
                position: 'relative',
              }}>
                Начать с гарантией
              </span>
              <ArrowRight size={15} strokeWidth={2.5} color="var(--text-on-gold)" style={{ position: 'relative' }} />
            </m.button>
          </m.div>
        )}

        {/* ═══════════ TRUST LINE ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{
            marginTop: 14,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          Гарантии начинают работать сразу после оформления
        </m.div>
      </div>
    </ModalWrapper>
  )
}
