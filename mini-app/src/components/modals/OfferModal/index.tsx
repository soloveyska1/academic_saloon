import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Shield, ChevronDown, ArrowRight, CheckCircle2, Check,
  FileText,
} from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL v7 — "The Pact" design
//  Concept: Big hero with metallic number → interactive checklist →
//           expandable legal → CTA that activates on scroll/progress
//  Inspired by CashbackModal's dramatic hero treatment
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

// ═══════════ CHECKLIST ITEM ═══════════
const ChecklistItem = memo(function ChecklistItem({ card, index, checked, onToggle }: {
  card: typeof SUMMARY_CARDS[0]; index: number; checked: boolean; onToggle: () => void
}) {
  const Icon = card.icon

  return (
    <m.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.04 }}
      onClick={onToggle}
      style={{
        width: '100%', padding: '12px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Checkbox */}
      <m.div
        animate={{
          background: checked ? 'var(--gold-400)' : 'transparent',
          borderColor: checked ? 'var(--gold-400)' : 'rgba(255,255,255,0.15)',
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1,
        }}
      >
        <AnimatePresence>
          {checked && (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 400 }}
            >
              <Check size={12} strokeWidth={3} color="var(--text-on-gold)" />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
        }}>
          <Icon size={13} color="var(--gold-400)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'color 0.2s',
          }}>
            {card.title}
          </span>
          {/* Proof badge inline */}
          <span style={{
            fontSize: 10, fontWeight: 800, color: 'var(--gold-400)',
            marginLeft: 'auto', flexShrink: 0,
          }}>
            {card.proof}
          </span>
        </div>
        <div style={{
          fontSize: 11.5, lineHeight: 1.45, color: 'var(--text-muted)', fontWeight: 500,
          paddingLeft: 19,
        }}>
          {card.text}
        </div>
      </div>
    </m.button>
  )
})

// ═══════════ ACCORDION SECTION (compact) ═══════════
const LegalSection = memo(function LegalSection({ section, isOpen, onToggle }: {
  section: OfferSection; isOpen: boolean; onToggle: () => void
}) {
  const Icon = section.icon

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'all 0.2s',
      }}
      id={`offer-section-${section.id}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%', padding: '10px 0', minHeight: 40,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left',
        }}
      >
        <Icon size={12} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 12.5, fontWeight: 600,
          color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color 0.2s',
        }}>
          {section.title}
        </span>
        <m.div
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={13} strokeWidth={2} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} />
        </m.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {section.clauses.map((clause, ci) => (
                <div key={ci} style={{
                  fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)',
                  fontWeight: 500, paddingLeft: 10,
                  borderLeft: ci === 0
                    ? '2px solid rgba(212,175,55,0.3)'
                    : '2px solid rgba(255,255,255,0.03)',
                }}>
                  {clause}
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ═══════════ MAIN MODAL ═══════════
export function OfferModal({ isOpen, onClose, onAccept }: OfferModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [showFullText, setShowFullText] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const progress = checkedItems.size / SUMMARY_CARDS.length

  const toggleCheck = useCallback((index: number) => {
    triggerHaptic('light')
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const toggleSection = useCallback((id: string) => {
    triggerHaptic('light')
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleAccept = useCallback(() => {
    triggerHaptic('medium')
    onAccept?.()
    onClose()
  }, [onAccept, onClose])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="offer-modal"
      title="Публичная оферта"
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════════ HERO — dramatic, like CashbackModal ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{
            position: 'relative',
            padding: '20px 16px 16px',
            borderRadius: 14,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: -40, right: -20,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Shield + big number row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <m.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Shield size={17} color="var(--gold-400)" strokeWidth={1.4} />
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35, type: 'spring', damping: 10 }}
                    style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 14, height: 14, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid var(--bg-void)',
                    }}
                  >
                    <CheckCircle2 size={7} color="var(--text-on-gold)" strokeWidth={3} />
                  </m.div>
                </m.div>

                <div>
                  <h2 style={{
                    fontSize: 15, fontWeight: 700, lineHeight: 1.2,
                    letterSpacing: '-0.02em', margin: 0,
                    color: 'var(--text-primary)',
                  }}>
                    Кодекс Салуна
                  </h2>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {OFFER_META.intro}
                  </div>
                </div>
              </div>

              {/* Big hero number — like CashbackModal's "34%" */}
              <div style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 32, fontWeight: 700, lineHeight: 1,
                letterSpacing: '-0.04em',
                background: 'var(--gold-metallic)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.20))',
              }}>
                {SUMMARY_CARDS.length}
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            }}>
              {[
                { value: `v${OFFER_META.version}`, label: 'версия' },
                { value: '∞', label: 'правок' },
                { value: '80%+', label: 'уникальность' },
              ].map((stat, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.04 }}
                  style={{
                    padding: '8px 6px 6px', borderRadius: 8,
                    background: 'rgba(212,175,55,0.04)',
                    border: '1px solid rgba(212,175,55,0.06)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 800, lineHeight: 1.2,
                    background: 'linear-gradient(180deg, var(--gold-150, #FCF6BA), var(--gold-400))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {stat.label}
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </m.div>

        {/* ═══════════ PROGRESS BAR ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 14 }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Ознакомься с условиями
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-400)' }}>
              {checkedItems.size}/{SUMMARY_CARDS.length}
            </span>
          </div>
          <div style={{
            height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
          }}>
            <m.div
              animate={{ width: `${Math.max(progress * 100, 2)}%` }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.4), var(--gold-400))',
                boxShadow: progress > 0 ? '0 0 8px rgba(212,175,55,0.25)' : 'none',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {progress > 0 && (
                <m.div
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '30%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                  }}
                />
              )}
            </m.div>
          </div>
        </m.div>

        {/* ═══════════ INTERACTIVE CHECKLIST ═══════════ */}
        <div style={{
          borderRadius: 12,
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          {SUMMARY_CARDS.map((card, i) => (
            <ChecklistItem
              key={card.title}
              card={card}
              index={i}
              checked={checkedItems.has(i)}
              onToggle={() => toggleCheck(i)}
            />
          ))}
        </div>

        {/* ═══════════ FULL LEGAL TEXT (expandable) ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setShowFullText(prev => !prev) }}
            style={{
              width: '100%', padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FileText size={12} color="var(--gold-400)" strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              {showFullText ? 'Скрыть полный текст' : `Полный текст · ${OFFER_META.totalSections} разделов`}
            </span>
            <m.div
              animate={{ rotate: showFullText ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={13} color="var(--text-muted)" strokeWidth={2} />
            </m.div>
          </button>

          <AnimatePresence>
            {showFullText && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 4px' }}>
                  {OFFER_SECTIONS.map((section) => (
                    <LegalSection
                      key={section.id}
                      section={section}
                      isOpen={openSections.has(section.id)}
                      onToggle={() => toggleSection(section.id)}
                    />
                  ))}
                </div>

                {/* Legal footer */}
                <div style={{
                  marginTop: 12, textAlign: 'center',
                  fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                }}>
                  ГК РФ ст. 435-443, 779-783 · ЗоЗПП · 152-ФЗ
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          style={{ marginTop: 16 }}
        >
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleAccept}
            aria-label="Принять условия оферты"
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
              Принять условия
            </span>
            <ArrowRight size={15} strokeWidth={2.5} color="var(--text-on-gold)" style={{ position: 'relative' }} />
          </m.button>
        </m.div>

        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 10, textAlign: 'center',
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          }}
        >
          Нажимая кнопку, ты принимаешь условия оферты (п. 3 ст. 438 ГК РФ)
        </m.div>
      </div>
    </ModalWrapper>
  )
}
