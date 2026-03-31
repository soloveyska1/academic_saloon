import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Shield, RefreshCw, Award, Clock, Lock, ChevronDown, CheckCircle2,
  Sparkles, ArrowRight, FileCheck, Snowflake, Eye, ListChecks, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Proof Wall v3
//  5 core guarantees + 4 bonus perks. Evidence-backed.
//  Hero Card → Shield Counter → Core Cards → Bonus Perks → FAQ → CTA
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

interface BonusPerk {
  icon: LucideIcon
  title: string
  desc: string
}

const GUARANTEES: Guarantee[] = [
  {
    icon: RefreshCw,
    title: 'Доработки по согласованному ТЗ',
    hook: 'Исправление недостатков без доплаты',
    desc: 'Если в результате есть объективные ошибки или несоответствие согласованному ТЗ, Исполнитель устраняет их без дополнительной оплаты.',
    proof: 'ст.29',
    proofLabel: 'ЗоЗПП',
  },
  {
    icon: Zap,
    title: 'Согласовательные правки',
    hook: 'Безлимитно в пределах исходного ТЗ',
    desc: 'Уточнения в рамках изначально согласованного задания выполняются без доплаты. Новые требования после старта оформляются отдельно.',
    proof: '∞',
    proofLabel: 'правок',
  },
  {
    icon: Clock,
    title: 'Срок фиксируется заранее',
    hook: 'Старт после оплаты и полного ТЗ',
    desc: 'Срок начинает течь только после получения оплаты и полного комплекта материалов. При задержке ответа заказчика срок переносится соразмерно.',
    proof: 'ст.28',
    proofLabel: 'ЗоЗПП',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность заказа',
    hook: 'Материалы не публикуются без согласия',
    desc: 'Переписка, файлы и детали заказа не раскрываются третьим лицам без законных оснований или согласия заказчика.',
    proof: 'private',
    proofLabel: 'доступ',
  },
  {
    icon: Award,
    title: '100% возврат до старта',
    hook: 'Дальше — расчёт по закону',
    desc: 'До начала работы возвращается вся сумма. После старта расчёт производится по фактически оказанной части услуги и подтверждённым расходам.',
    proof: 'ст.32',
    proofLabel: 'ЗоЗПП',
  },
]

const BONUS_PERKS: BonusPerk[] = [
  {
    icon: FileCheck,
    title: 'Критерии проверки фиксируются заранее',
    desc: 'Показатели оригинальности действуют только по заранее согласованной системе и методике.',
  },
  {
    icon: Eye,
    title: 'Предварительное согласование',
    desc: 'Цена, срок, объём и этапы согласуются до начала работы и фиксируются в заказе.',
  },
  {
    icon: Snowflake,
    title: 'Заморозка на 7 дней',
    desc: 'Поставьте заказ на паузу — деньги не сгорят.',
  },
  {
    icon: ListChecks,
    title: 'Чек-лист защиты',
    desc: 'К каждой работе — инструкция: что проверить, как отвечать.',
  },
]

const TOTAL_GUARANTEES = GUARANTEES.length + BONUS_PERKS.length

const FAQ = [
  {
    q: 'Что если система антиплагиата покажет совпадения?',
    a: 'Оценка оригинальности имеет значение только по той системе и методике, которые были заранее согласованы по заказу. Если согласованный показатель не достигнут, выполняется доработка в разумный срок.',
  },
  {
    q: 'Что если автор сорвал сроки?',
    a: 'Если срок нарушен по вине исполнителя, права заказчика определяются законом и условиями конкретного заказа. Если задержка вызвана неполным ТЗ или поздними ответами заказчика, срок переносится соразмерно.',
  },
  {
    q: 'Смогу ли я вернуть деньги, если работа уже началась?',
    a: 'Да. После начала работы возврат определяется по фактически оказанной части услуги и подтверждённым расходам. Фиксированные штрафы и произвольные удержания не применяются.',
  },
  {
    q: 'Сколько раз можно просить доработки?',
    a: 'Объективные недостатки устраняются без доплаты. В пределах исходного ТЗ количество согласовательных правок не ограничено; новые требования оформляются отдельно.',
  },
]

// ═══════════ SECTION HEADER ═══════════
const SectionHeader = memo(function SectionHeader({ icon: Icon, label, delay }: {
  icon: LucideIcon; label: string; delay: number
}) {
  return (
    <m.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 7,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
        border: '1px solid rgba(212,175,55,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={11} color="var(--gold-400)" strokeWidth={2} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 800,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'var(--gold-200)',
      }}>
        {label}
      </span>
    </m.div>
  )
})

// ═══════════ GOLD DIVIDER ═══════════
function GoldDivider({ delay }: { delay: number }) {
  return (
    <m.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      style={{
        height: 1, margin: '16px 0',
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
      }}
    />
  )
}

// ═══════════ FAQ ITEM ═══════════
interface FAQItemProps { q: string; a: string; index: number }

const FAQItem = memo(function FAQItem({ q, a, index }: FAQItemProps) {
  const [open, setOpen] = useState(false)
  const contentId = `faq-content-${index}`

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 + index * 0.06 }}
      style={{
        position: 'relative', borderRadius: 12,
        background: open
          ? 'linear-gradient(160deg, rgba(27,22,12,0.8) 0%, rgba(12,12,12,0.9) 100%)'
          : 'var(--bg-glass)',
        border: open ? '1px solid rgba(212,175,55,0.18)' : '1px solid var(--border-default)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {open && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
          pointerEvents: 'none',
        }} />
      )}

      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: '100%', padding: '14px', minHeight: 50,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, textAlign: 'left', position: 'relative', zIndex: 1,
        }}
      >
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: open ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: 1.4, flex: 1, letterSpacing: '-0.01em',
          transition: 'color 0.3s',
        }}>
          {q}
        </span>
        <m.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
            background: open ? 'rgba(212,175,55,0.10)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
          }}
        >
          <ChevronDown size={14} strokeWidth={2} color={open ? 'var(--gold-400)' : 'var(--text-muted)'} />
        </m.div>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            id={contentId} role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '0 14px 14px', fontSize: 12.5, lineHeight: 1.6,
              color: 'var(--text-muted)', fontWeight: 600, position: 'relative',
            }}>
              <div aria-hidden="true" style={{
                position: 'absolute', left: 0, top: 0, bottom: 14,
                width: 2, borderRadius: 1,
                background: 'linear-gradient(180deg, rgba(212,175,55,0.5), rgba(212,175,55,0.0))',
              }} />
              <div style={{ paddingLeft: 10 }}>{a}</div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
})

// ═══════════ GUARANTEE CARD ═══════════
const GuaranteeCard = memo(function GuaranteeCard({ item, index }: { item: Guarantee; index: number }) {
  const Icon = item.icon
  const isFeatured = index === 0

  return (
    <m.div
      role="article"
      aria-label={`${item.title}: ${item.proof} ${item.proofLabel}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: '14px',
        borderRadius: 12,
        background: isFeatured
          ? 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)'
          : 'var(--bg-glass)',
        border: isFeatured
          ? '1px solid rgba(212,175,55,0.15)'
          : '1px solid var(--border-default)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {isFeatured && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: isFeatured
            ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))'
            : 'rgba(212,175,55,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid rgba(212,175,55,0.12)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'rgba(255,255,255,0.10)',
          }} />
          <Icon size={17} color="var(--gold-400)" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1 }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, marginBottom: 2,
          }}>
            <div style={{
              fontSize: isFeatured ? 14 : 13.5, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.01em',
            }}>
              {item.title}
            </div>

            {/* Proof badge — premium */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              flexShrink: 0, padding: '4px 9px', borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
              border: '1px solid rgba(212,175,55,0.20)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div aria-hidden="true" style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              }} />
              <span style={{
                fontSize: 12, fontWeight: 800, color: 'var(--gold-300)',
                letterSpacing: '-0.02em', position: 'relative', zIndex: 1,
              }}>
                {item.proof}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'var(--gold-400)',
                whiteSpace: 'nowrap', position: 'relative', zIndex: 1,
              }}>
                {item.proofLabel}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--gold-400)',
            marginBottom: 5, opacity: isFeatured ? 0.7 : 0.5,
          }}>
            {item.hook}
          </div>

          <div style={{
            fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', fontWeight: 600,
          }}>
            {item.desc}
          </div>
        </div>
      </div>
    </m.div>
  )
})

// ═══════════ BONUS PERK CARD ═══════════
const BonusPerkCard = memo(function BonusPerkCard({ perk, index }: { perk: BonusPerk; index: number }) {
  const Icon = perk.icon

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38 + index * 0.05 }}
      style={{
        position: 'relative',
        padding: '14px 12px',
        borderRadius: 12,
        background: 'linear-gradient(160deg, rgba(27,22,12,0.5) 0%, rgba(12,12,12,0.6) 100%)',
        border: '1px solid rgba(212,175,55,0.08)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
      }} />
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} color="var(--gold-400)" strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: 2, lineHeight: 1.25,
        }}>
          {perk.title}
        </div>
        <div style={{
          fontSize: 11, lineHeight: 1.45, color: 'var(--text-muted)', fontWeight: 600,
        }}>
          {perk.desc}
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

        {/* ═══════════ HERO CARD (unified with stats) ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            padding: '20px 18px 16px',
            borderRadius: 14,
            background: 'linear-gradient(160deg, rgba(27,22,12,0.95) 0%, rgba(12,12,12,0.98) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: -40, right: -20,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Shield + title row */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <m.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                style={{
                  width: 64, height: 64, borderRadius: 14,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                  position: 'relative',
                }}
              >
                <Shield size={28} color="var(--gold-400)" strokeWidth={1.3} />
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', damping: 10 }}
                  style={{
                    position: 'absolute', bottom: -3, right: -3,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-void)',
                  }}
                >
                  <CheckCircle2 size={10} color="var(--text-on-gold)" strokeWidth={2.5} />
                </m.div>
              </m.div>

              <div style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.2,
                letterSpacing: '-0.02em', marginBottom: 6,
                color: 'var(--gold-200)',
              }}>
                Гарантии, которые работают
              </div>

              <div style={{
                fontSize: 13, lineHeight: 1.5,
                color: 'var(--text-muted)', fontWeight: 600,
              }}>
                2 400+ студентов уже получили результат
              </div>
            </div>

            {/* Stats grid inside hero */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            }}>
              {[
                { value: '2 400+', label: 'работ' },
                { value: '98%', label: 'в срок' },
                { value: 'ст.32', label: 'возврат по закону' },
              ].map((stat, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.05 }}
                  style={{
                    padding: '10px 6px 8px', borderRadius: 10,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.10)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: 14, fontWeight: 800, lineHeight: 1.2,
                    background: 'linear-gradient(180deg, var(--gold-150), var(--gold-400))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 2,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {stat.label}
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </m.div>

        {/* ═══════════ SHIELD COUNTER ═══════════ */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '10px 16px', borderRadius: 10,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.08)',
            marginBottom: 14,
          }}
        >
          <Shield size={14} color="var(--gold-400)" strokeWidth={2} />
          <span style={{
            fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)',
          }}>
            Ваш заказ защищён{' '}
            <span style={{ color: 'var(--gold-400)', fontWeight: 800 }}>
              {TOTAL_GUARANTEES} гарантиями
            </span>
          </span>
        </m.div>

        {/* ═══════════ CORE GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GUARANTEES.map((item, index) => (
            <GuaranteeCard key={item.title} item={item} index={index} />
          ))}
        </div>

        <GoldDivider delay={0.35} />

        {/* ═══════════ BONUS PERKS ═══════════ */}
        <SectionHeader icon={Sparkles} label="Бонусы к заказу" delay={0.36} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {BONUS_PERKS.map((perk, i) => (
            <BonusPerkCard key={perk.title} perk={perk} index={i} />
          ))}
        </div>

        <GoldDivider delay={0.45} />

        {/* ═══════════ FAQ ═══════════ */}
        <SectionHeader icon={Sparkles} label="Частые вопросы" delay={0.46} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQ.map((item, i) => (
            <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>

        {/* ═══════════ CTA ═══════════ */}
        {onCreateOrder && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ marginTop: 20 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCTA}
              aria-label="Оформить заказ с гарантией"
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 12,
                background: 'var(--gold-metallic)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, position: 'relative', overflow: 'hidden',
                boxShadow: 'var(--glow-gold)',
              }}
            >
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
                color: 'var(--text-on-gold)', position: 'relative',
              }}>
                Начать под защитой {TOTAL_GUARANTEES} гарантий
              </span>
              <ArrowRight size={15} strokeWidth={2.5} color="var(--text-on-gold)" style={{ position: 'relative' }} />
            </m.button>
          </m.div>
        )}

        {/* ═══════════ TRUST LINE ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 14, textAlign: 'center',
            fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
          }}
        >
          Все гарантии активны сразу после оформления
        </m.div>
      </div>
    </ModalWrapper>
  )
}
