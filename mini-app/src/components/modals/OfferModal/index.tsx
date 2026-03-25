import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Shield, ChevronDown, ArrowRight, CheckCircle2,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL v6 — Radical redesign
//  Architecture: Compact Hero → 2-col Grid (top 4) → Compact List (rest) →
//                Expandable Legal → CTA
//  No more boring vertical card list. Mixed layouts for visual variety.
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

// Split cards: first 4 as grid, rest as compact rows
const GRID_CARDS = SUMMARY_CARDS.slice(0, 4)
const LIST_CARDS = SUMMARY_CARDS.slice(4)

// ═══════════ GRID CARD (2-col, compact, like BonusPerkCard) ═══════════
const GridCard = memo(function GridCard({ card, index, onJump }: {
  card: typeof SUMMARY_CARDS[0]; index: number; onJump: (idx: number) => void
}) {
  const Icon = card.icon
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 + index * 0.05 }}
      onClick={() => { triggerHaptic('light'); onJump(card.sectionIndex) }}
      style={{
        position: 'relative',
        padding: '14px 12px',
        borderRadius: 12,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-default)',
        display: 'flex', flexDirection: 'column', gap: 10,
        overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color="var(--gold-400)" strokeWidth={1.8} />
        </div>

        {/* Proof badge */}
        <div style={{
          padding: '3px 7px', borderRadius: 6,
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.12)',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 800, color: 'var(--gold-300)',
            letterSpacing: '-0.02em',
          }}>
            {card.proof}
          </span>
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: 3, lineHeight: 1.25,
        }}>
          {card.title}
        </div>
        <div style={{
          fontSize: 11, lineHeight: 1.45, color: 'var(--text-muted)', fontWeight: 600,
        }}>
          {card.hook}
        </div>
      </div>
    </m.div>
  )
})

// ═══════════ COMPACT ROW (for remaining cards) ═══════════
const CompactRow = memo(function CompactRow({ card, index, onJump }: {
  card: typeof SUMMARY_CARDS[0]; index: number; onJump: (idx: number) => void
}) {
  const Icon = card.icon
  return (
    <m.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38 + index * 0.04 }}
      onClick={() => { triggerHaptic('light'); onJump(card.sectionIndex) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-default)',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(212,175,55,0.06)',
        border: '1px solid rgba(212,175,55,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} color="var(--gold-400)" strokeWidth={1.8} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {card.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {card.hook}
        </div>
      </div>

      <span style={{
        fontSize: 12, fontWeight: 800, color: 'var(--gold-400)',
        flexShrink: 0,
      }}>
        {card.proof}
      </span>
    </m.div>
  )
})

// ═══════════ SECTION HEADER ═══════════
const SectionLabel = memo(function SectionLabel({ icon: Icon, label, delay }: {
  icon: LucideIcon; label: string; delay: number
}) {
  return (
    <m.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: 'rgba(212,175,55,0.08)',
        border: '1px solid rgba(212,175,55,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={10} color="var(--gold-400)" strokeWidth={2} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 800,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'var(--gold-200)',
      }}>
        {label}
      </span>
    </m.div>
  )
})

// ═══════════ ACCORDION SECTION ═══════════
const AccordionSection = memo(function AccordionSection({ section, index, isOpen, onToggle }: {
  section: OfferSection; index: number; isOpen: boolean; onToggle: () => void
}) {
  const Icon = section.icon

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.02 }}
      style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        background: isOpen ? 'var(--bg-glass)' : 'transparent',
        border: isOpen
          ? '1px solid rgba(212,175,55,0.12)'
          : '1px solid var(--border-subtle)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      id={`offer-section-${section.id}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`offer-content-${section.id}`}
        style={{
          width: '100%', padding: '12px', minHeight: 44,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: isOpen ? 'rgba(212,175,55,0.08)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.3s',
        }}>
          <Icon size={12} color="var(--gold-400)" strokeWidth={1.8} />
        </div>

        <span style={{
          flex: 1, fontSize: 12.5, fontWeight: 700,
          color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: 1.3, transition: 'color 0.3s',
        }}>
          {section.title}
        </span>

        <m.div
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={13} strokeWidth={2} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} />
        </m.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            id={`offer-content-${section.id}`}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 12px' }}>
              <div aria-hidden="true" style={{
                height: 1, marginBottom: 10,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.06), transparent)',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.clauses.map((clause, ci) => (
                  <div key={ci} style={{
                    fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)',
                    fontWeight: 500, paddingLeft: 8,
                    borderLeft: ci === 0
                      ? '2px solid rgba(212,175,55,0.3)'
                      : '2px solid rgba(255,255,255,0.03)',
                  }}>
                    {clause}
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
})

// ═══════════ MAIN MODAL ═══════════
export function OfferModal({ isOpen, onClose, onAccept }: OfferModalProps) {
  const [showFullText, setShowFullText] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  const toggleSection = useCallback((id: string) => {
    triggerHaptic('light')
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const jumpToSection = useCallback((sectionIndex: number) => {
    triggerHaptic('medium')
    setShowFullText(true)
    const section = OFFER_SECTIONS[sectionIndex]
    if (!section) return
    setOpenSections(prev => new Set(prev).add(section.id))
    setTimeout(() => {
      document.getElementById(`offer-section-${section.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
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

        {/* ═══════════ HERO (compact — no giant shield) ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            position: 'relative',
            padding: '16px',
            borderRadius: 14,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Title row with shield */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 12,
            }}>
              <m.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}
              >
                <Shield size={18} color="var(--gold-400)" strokeWidth={1.3} />
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35, type: 'spring', damping: 10 }}
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-void)',
                  }}
                >
                  <CheckCircle2 size={8} color="var(--text-on-gold)" strokeWidth={2.5} />
                </m.div>
              </m.div>

              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: 16, fontWeight: 700, lineHeight: 1.2,
                  letterSpacing: '-0.02em', margin: 0,
                  color: 'var(--gold-200)',
                }}>
                  {OFFER_META.title}
                </h2>
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2,
                }}>
                  {OFFER_META.intro}
                </div>
              </div>
            </div>

            {/* Stats row (inline, not grid) */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {[
                { label: `v${OFFER_META.version}` },
                { label: `${OFFER_META.totalSections} разделов` },
                { label: 'ГК РФ · ЗоЗПП · 152-ФЗ' },
              ].map((stat, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 700,
                  color: i === 2 ? 'var(--text-muted)' : 'var(--gold-400)',
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.08)',
                  whiteSpace: 'nowrap',
                }}>
                  {stat.label}
                </span>
              ))}
            </div>
          </div>
        </m.div>

        {/* ═══════════ TOP 4 AS 2-COL GRID ═══════════ */}
        <SectionLabel icon={Shield} label="Ключевые гарантии" delay={0.15} />

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
          marginBottom: 8,
        }}>
          {GRID_CARDS.map((card, i) => (
            <GridCard key={card.title} card={card} index={i} onJump={jumpToSection} />
          ))}
        </div>

        {/* ═══════════ REST AS COMPACT ROWS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {LIST_CARDS.map((card, i) => (
            <CompactRow key={card.title} card={card} index={i} onJump={jumpToSection} />
          ))}
        </div>

        {/* ═══════════ DIVIDER ═══════════ */}
        <m.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ height: 1, margin: '16px 0', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.10), transparent)' }}
        />

        {/* ═══════════ FULL LEGAL TEXT ═══════════ */}
        <SectionLabel icon={FileText} label="Полный текст" delay={0.52} />

        {!showFullText ? (
          <m.button
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54 }}
            onClick={() => { triggerHaptic('medium'); setShowFullText(true) }}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FileText size={13} color="var(--gold-400)" strokeWidth={1.8} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Развернуть {OFFER_META.totalSections} разделов
            </span>
            <ChevronDown size={13} color="var(--text-muted)" strokeWidth={2} />
          </m.button>
        ) : (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {OFFER_SECTIONS.map((section, i) => (
                <AccordionSection
                  key={section.id}
                  section={section}
                  index={i}
                  isOpen={openSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                />
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════ CTA ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58 }}
          style={{ marginTop: 20 }}
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

        {/* Trust line */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.62 }}
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
