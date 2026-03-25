import { useCallback, useState, useRef, memo, useEffect } from 'react'
import { m, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Shield, ChevronDown, ChevronRight, BookOpen,
  CheckCircle2, ArrowRight, FileText,
} from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL — Premium dual-layer legal document viewer
//  Layer 1: Summary cards (human-readable key points)
//  Layer 2: Full accordion with all 12 sections
//  v4.0: Premium design system, proper acceptance CTA, accessibility
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
}

type ViewMode = 'summary' | 'full'

const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const

// ═══════════ VIEW TOGGLE ═══════════
const ViewToggle = memo(function ViewToggle({
  mode, onToggle,
}: { mode: ViewMode; onToggle: (m: ViewMode) => void }) {
  return (
    <m.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        display: 'flex', gap: 4, padding: 3,
        borderRadius: 10,
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 16,
      }}
    >
      {([
        { key: 'summary' as const, icon: BookOpen, label: 'Краткое' },
        { key: 'full' as const, icon: FileText, label: 'Полный текст' },
      ]).map(({ key, icon: Icon, label }) => {
        const active = mode === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => { triggerHaptic('light'); onToggle(key) }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '10px 12px', borderRadius: 8,
              background: active
                ? 'var(--gold-glass-medium)'
                : 'transparent',
              border: active ? '1px solid var(--border-gold)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            <Icon
              size={13}
              strokeWidth={2}
              color={active ? 'var(--gold-400)' : 'var(--text-muted)'}
            />
            <span style={{
              fontSize: 12, fontWeight: active ? 700 : 600,
              color: active ? 'var(--gold-300)' : 'var(--text-muted)',
              transition: 'color 0.25s',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </m.div>
  )
})

// ═══════════ SUMMARY CARD ═══════════
const SummaryCard = memo(function SummaryCard({ card, index, onJump }: {
  card: typeof SUMMARY_CARDS[0]; index: number; onJump: (idx: number) => void
}) {
  const Icon = card.icon
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05, duration: 0.4, ease: EASE_PREMIUM }}
      style={{
        position: 'relative', padding: 16, borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--gold-glass-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Top shine */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--gold-glass-subtle), transparent)',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--gold-glass-subtle)',
          border: '1px solid var(--gold-glass-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} color="var(--gold-400)" strokeWidth={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 4, lineHeight: 1.25,
          }}>
            {card.title}
          </div>
          <div style={{
            fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)', fontWeight: 500,
          }}>
            {card.text}
          </div>
          <button
            type="button"
            onClick={() => onJump(card.sectionIndex)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, padding: '6px 10px', borderRadius: 6,
              background: 'transparent', border: '1px solid transparent',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: 'var(--gold-400)',
              transition: 'all 0.2s',
            }}
          >
            Подробнее <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>
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
      transition={{ delay: 0.06 + index * 0.03, duration: 0.4, ease: EASE_PREMIUM }}
      style={{
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: isOpen ? 'var(--bg-card)' : 'var(--bg-glass)',
        border: isOpen
          ? '1px solid var(--gold-glass-medium)'
          : '1px solid var(--border-default)',
        transition: 'all 0.3s ease',
      }}
      id={`offer-section-${section.id}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`offer-content-${section.id}`}
        style={{
          width: '100%', padding: 14, minHeight: 48,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          textAlign: 'left', position: 'relative',
        }}
      >
        {isOpen && (
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, var(--gold-glass-medium), transparent)',
          }} />
        )}

        <div style={{
          width: 30, height: 30, borderRadius: 'var(--radius-md)',
          background: isOpen ? 'var(--gold-glass-medium)' : 'var(--gold-glass-subtle)',
          border: '1px solid var(--gold-glass-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.3s',
        }}>
          <Icon size={14} color="var(--gold-400)" strokeWidth={1.8} />
        </div>

        <span style={{
          flex: 1, fontSize: 13, fontWeight: 700,
          color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: 1.3, letterSpacing: '-0.01em',
          transition: 'color 0.3s',
        }}>
          {section.title}
        </span>

        <m.div
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE_PREMIUM }}
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: 6,
            background: isOpen ? 'var(--gold-glass-subtle)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
          }}
        >
          <ChevronDown
            size={14} strokeWidth={2}
            color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'}
          />
        </m.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            id={`offer-content-${section.id}`}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_PREMIUM }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              <div aria-hidden="true" style={{
                height: 1, marginBottom: 12,
                background: 'linear-gradient(90deg, var(--gold-glass-subtle), transparent)',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.clauses.map((clause, ci) => (
                  <div key={ci} style={{
                    fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-secondary)',
                    fontWeight: 500, position: 'relative', paddingLeft: 10,
                  }}>
                    <div aria-hidden="true" style={{
                      position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: 2, borderRadius: 1,
                      background: ci === 0
                        ? 'linear-gradient(180deg, var(--gold-400), transparent)'
                        : 'var(--border-subtle)',
                    }} />
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
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Progress bar
  const { scrollYProgress } = useScroll({ container: scrollRef })
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setViewMode('summary')
      setOpenSections(new Set())
    }
  }, [isOpen])

  const toggleSection = useCallback((id: string) => {
    triggerHaptic('light')
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    triggerHaptic('light')
    setOpenSections(new Set(OFFER_SECTIONS.map(s => s.id)))
  }, [])

  const collapseAll = useCallback(() => {
    triggerHaptic('light')
    setOpenSections(new Set())
  }, [])

  // Jump from summary card to full section
  const jumpToSection = useCallback((sectionIndex: number) => {
    triggerHaptic('medium')
    setViewMode('full')
    const section = OFFER_SECTIONS[sectionIndex]
    if (!section) return
    setOpenSections(prev => new Set(prev).add(section.id))
    setTimeout(() => {
      const el = document.getElementById(`offer-section-${section.id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  const handleAccept = useCallback(() => {
    triggerHaptic('medium')
    onAccept?.()
    onClose()
  }, [onAccept, onClose])

  const allExpanded = openSections.size === OFFER_SECTIONS.length

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="offer-modal"
      title="Публичная оферта"
      accentColor="var(--gold-400)"
    >
      {/* Progress bar */}
      <m.div
        aria-hidden="true"
        style={{
          position: 'sticky', top: 0, left: 0, right: 0,
          height: 2, zIndex: 10,
          background: 'var(--liquid-gold)',
          transformOrigin: 'left',
          scaleX,
          opacity: 0.6,
        }}
      />

      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════════ HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_PREMIUM }}
          style={{
            position: 'relative', padding: '20px 16px',
            borderRadius: 14,
            background: 'var(--bg-card)',
            border: '1px solid var(--gold-glass-medium)',
            marginBottom: 16, overflow: 'hidden',
          }}
        >
          <div aria-hidden="true" style={{
            position: 'absolute', top: -30, right: -10,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--gold-glass-subtle) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, var(--gold-glass-medium), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <m.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, delay: 0.1 }}
              style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'var(--gold-glass-subtle)',
                border: '1px solid var(--gold-glass-medium)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', position: 'relative',
              }}
            >
              <Shield size={24} color="var(--gold-400)" strokeWidth={1.3} />
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', damping: 10 }}
                style={{
                  position: 'absolute', bottom: -3, right: -3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--gold-metallic)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-void)',
                }}
              >
                <CheckCircle2 size={9} color="var(--text-on-gold)" strokeWidth={2.5} />
              </m.div>
            </m.div>

            <h2 style={{
              fontSize: 18, fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-0.02em', color: 'var(--gold-200)',
              marginBottom: 4, margin: '0 0 4px',
            }}>
              {OFFER_META.title}
            </h2>
            <div style={{
              fontSize: 11.5, lineHeight: 1.4,
              color: 'var(--text-muted)', fontWeight: 600,
            }}>
              {OFFER_META.subtitle}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, marginTop: 10,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--gold-400)',
                padding: '3px 8px', borderRadius: 6,
                background: 'var(--gold-glass-subtle)',
                border: '1px solid var(--gold-glass-medium)',
              }}>
                v{OFFER_META.version}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              }}>
                от {OFFER_META.effectiveDate}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              }}>
                {OFFER_META.totalSections} разделов
              </span>
            </div>

            {/* Intro text */}
            <div style={{
              marginTop: 12, fontSize: 12, lineHeight: 1.5,
              color: 'var(--text-secondary)', fontWeight: 500,
            }}>
              {OFFER_META.intro}
            </div>
          </div>
        </m.div>

        {/* ═══════════ VIEW TOGGLE ═══════════ */}
        <ViewToggle mode={viewMode} onToggle={setViewMode} />

        {/* ═══════════ CONTENT ═══════════ */}
        <AnimatePresence mode="wait">
          {viewMode === 'summary' ? (
            <m.div
              key="summary"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Summary cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUMMARY_CARDS.map((card, i) => (
                  <SummaryCard
                    key={card.title}
                    card={card}
                    index={i}
                    onJump={jumpToSection}
                  />
                ))}
              </div>

              {/* Switch to full */}
              <m.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => { triggerHaptic('medium'); setViewMode('full') }}
                style={{
                  width: '100%', marginTop: 14, padding: '12px',
                  borderRadius: 10, background: 'var(--gold-glass-subtle)',
                  border: '1px solid var(--gold-glass-medium)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <FileText size={13} color="var(--gold-400)" strokeWidth={2} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--gold-400)',
                }}>
                  Читать полный юридический текст
                </span>
              </m.button>
            </m.div>
          ) : (
            <m.div
              key="full"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Expand/Collapse all */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                marginBottom: 10,
              }}>
                <button
                  type="button"
                  onClick={allExpanded ? collapseAll : expandAll}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    minHeight: 36,
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s',
                  }}
                >
                  {allExpanded ? 'Свернуть все' : 'Развернуть все'}
                </button>
              </div>

              {/* Accordion sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
        </AnimatePresence>

        {/* ═══════════ LEGAL REFERENCES ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 16, padding: 12,
            borderRadius: 10,
            background: 'var(--gold-glass-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{
            fontSize: 10.5, lineHeight: 1.6, color: 'var(--text-muted)',
            fontWeight: 600, textAlign: 'center',
          }}>
            Оферта составлена по ГК РФ (ст. 435-443, 779-783),
            ФЗ «О защите прав потребителей», ФЗ № 152-ФЗ «О персональных данных».
          </div>
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{ marginTop: 16 }}
        >
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleAccept}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 'var(--radius-lg)',
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

        {/* ═══════════ TRUST LINE ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 12, textAlign: 'center',
            fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600,
          }}
        >
          Нажимая кнопку, ты принимаешь условия оферты (п. 3 ст. 438 ГК РФ)
        </m.div>
      </div>
    </ModalWrapper>
  )
}
