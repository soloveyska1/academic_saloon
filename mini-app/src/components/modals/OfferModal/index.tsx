import { useCallback, useState, useRef, memo, useEffect } from 'react'
import { m, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Shield, ChevronDown, ChevronRight, FileText, BookOpen,
  CheckCircle2, ArrowRight, ExternalLink,
} from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL — Premium dual-layer legal document viewer
//  Layer 1: Summary cards (human-readable key points)
//  Layer 2: Full accordion with all 12 sections
//  Features: progress bar, view toggle, section jump, smart acceptance
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
}

type ViewMode = 'summary' | 'full'

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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      {([
        { key: 'summary' as const, icon: BookOpen, label: 'Главное' },
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
              gap: 6, padding: '9px 12px', borderRadius: 8,
              background: active
                ? 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.08))'
                : 'transparent',
              border: active ? '1px solid rgba(212,175,55,0.20)' : '1px solid transparent',
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
      transition={{ delay: 0.08 + index * 0.04 }}
      style={{
        position: 'relative', padding: '14px', borderRadius: 12,
        background: 'linear-gradient(160deg, rgba(27,22,12,0.6) 0%, rgba(12,12,12,0.7) 100%)',
        border: '1px solid rgba(212,175,55,0.08)',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={15} color="var(--gold-400)" strokeWidth={1.6} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
            marginBottom: 3, lineHeight: 1.25,
          }}>
            {card.title}
          </div>
          <div style={{
            fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', fontWeight: 600,
          }}>
            {card.text}
          </div>
          <button
            type="button"
            onClick={() => onJump(card.sectionIndex)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              marginTop: 6, padding: 0, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              color: 'var(--gold-400)', opacity: 0.7,
            }}
          >
            Читать полностью <ChevronRight size={11} strokeWidth={2.5} />
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
      transition={{ delay: 0.06 + index * 0.03 }}
      style={{
        borderRadius: 12, overflow: 'hidden',
        background: isOpen
          ? 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)'
          : 'var(--bg-glass)',
        border: isOpen ? '1px solid rgba(212,175,55,0.15)' : '1px solid var(--border-default)',
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
          width: '100%', padding: '14px', minHeight: 48,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          textAlign: 'left', position: 'relative',
        }}
      >
        {isOpen && (
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
          }} />
        )}

        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: isOpen
            ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))'
            : 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={13} color="var(--gold-400)" strokeWidth={1.8} />
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
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
            background: isOpen ? 'rgba(212,175,55,0.10)' : 'transparent',
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
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              <div aria-hidden="true" style={{
                height: 1, marginBottom: 12,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.08), transparent)',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.clauses.map((clause, ci) => (
                  <div key={ci} style={{
                    fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-muted)',
                    fontWeight: 600, position: 'relative', paddingLeft: 10,
                  }}>
                    <div aria-hidden="true" style={{
                      position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: 2, borderRadius: 1,
                      background: ci === 0
                        ? 'linear-gradient(180deg, rgba(212,175,55,0.4), rgba(212,175,55,0.0))'
                        : 'rgba(255,255,255,0.04)',
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
export function OfferModal({ isOpen, onClose }: OfferModalProps) {
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
    // Scroll to section after mode switch
    setTimeout(() => {
      const el = document.getElementById(`offer-section-${section.id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

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
        style={{
          position: 'sticky', top: 0, left: 0, right: 0,
          height: 2, zIndex: 10,
          background: 'linear-gradient(90deg, var(--gold-400), var(--gold-600))',
          transformOrigin: 'left',
          scaleX,
          opacity: viewMode === 'full' ? 1 : 0.3,
        }}
      />

      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════════ HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'relative', padding: '18px 16px',
            borderRadius: 14,
            background: 'linear-gradient(160deg, rgba(27,22,12,0.95) 0%, rgba(12,12,12,0.98) 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            marginBottom: 14, overflow: 'hidden',
          }}
        >
          <div aria-hidden="true" style={{
            position: 'absolute', top: -30, right: -10,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <m.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, delay: 0.1 }}
              style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.15)',
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
                  background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-void)',
                }}
              >
                <CheckCircle2 size={9} color="var(--text-on-gold)" strokeWidth={2.5} />
              </m.div>
            </m.div>

            <div style={{
              fontSize: 18, fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-0.02em', color: 'var(--gold-200)',
              marginBottom: 4,
            }}>
              {OFFER_META.title}
            </div>
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
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.12)',
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
                  borderRadius: 10, background: 'rgba(212,175,55,0.06)',
                  border: '1px solid rgba(212,175,55,0.10)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ExternalLink size={13} color="var(--gold-400)" strokeWidth={2} />
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
                    padding: '5px 10px', borderRadius: 7,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-muted)',
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
            marginTop: 16, padding: '12px',
            borderRadius: 10,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.06)',
          }}
        >
          <div style={{
            fontSize: 10, lineHeight: 1.6, color: 'var(--text-muted)',
            fontWeight: 600, textAlign: 'center',
          }}>
            Оферта составлена в соответствии с ГК РФ (ст. 435-443, 779-783),
            ФЗ «О защите прав потребителей», ФЗ № 152-ФЗ «О персональных данных».
            Принятие условий равносильно заключению договора (п. 3 ст. 438 ГК РФ).
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
            onClick={() => { triggerHaptic('medium'); onClose() }}
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
              Понятно
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
          Используя сервис, вы принимаете условия настоящей оферты
        </m.div>
      </div>
    </ModalWrapper>
  )
}
