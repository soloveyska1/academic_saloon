import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Shield, ChevronDown, ArrowRight, CheckCircle2,
  BookOpen, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL v5 — Premium legal document viewer
//  Architecture: Hero → Stats → Key Points → Full Legal Text → CTA
//  Design reference: GuaranteesModal (proof wall pattern)
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const

// ═══════════ SECTION HEADER (from GuaranteesModal) ═══════════
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

// ═══════════ KEY POINT CARD (GuaranteeCard pattern with proof badge) ═══════════
const KeyPointCard = memo(function KeyPointCard({ card, index, onJump }: {
  card: typeof SUMMARY_CARDS[0]; index: number; onJump: (idx: number) => void
}) {
  const Icon = card.icon
  const isFeatured = index === 0

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 + index * 0.05, duration: 0.4, ease: EASE }}
      onClick={() => { triggerHaptic('light'); onJump(card.sectionIndex) }}
      style={{
        padding: 14,
        borderRadius: 12,
        background: isFeatured
          ? 'linear-gradient(160deg, rgba(27,22,12,0.7) 0%, rgba(12,12,12,0.8) 100%)'
          : 'var(--bg-glass)',
        border: isFeatured
          ? '1px solid rgba(212,175,55,0.15)'
          : '1px solid var(--border-default)',
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer',
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
          {/* Title + Proof Badge row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, marginBottom: 2,
          }}>
            <div style={{
              fontSize: isFeatured ? 14 : 13.5, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.01em',
            }}>
              {card.title}
            </div>

            {/* Proof badge */}
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
                {card.proof}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'var(--gold-400)',
                whiteSpace: 'nowrap', position: 'relative', zIndex: 1,
              }}>
                {card.proofLabel}
              </span>
            </div>
          </div>

          {/* Hook */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--gold-400)',
            marginBottom: 5, opacity: isFeatured ? 0.7 : 0.5,
          }}>
            {card.hook}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', fontWeight: 600,
          }}>
            {card.text}
          </div>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.03 }}
      style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        background: isOpen
          ? 'linear-gradient(160deg, rgba(27,22,12,0.8) 0%, rgba(12,12,12,0.9) 100%)'
          : 'var(--bg-glass)',
        border: isOpen ? '1px solid rgba(212,175,55,0.18)' : '1px solid var(--border-default)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      id={`offer-section-${section.id}`}
    >
      {isOpen && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
          pointerEvents: 'none',
        }} />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`offer-content-${section.id}`}
        style={{
          width: '100%', padding: 14, minHeight: 50,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          textAlign: 'left', position: 'relative', zIndex: 1,
        }}
      >
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
          lineHeight: 1.4, letterSpacing: '-0.01em',
          transition: 'color 0.3s',
        }}>
          {section.title}
        </span>

        <m.div
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6,
            background: isOpen ? 'rgba(212,175,55,0.10)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
          }}
        >
          <ChevronDown size={14} strokeWidth={2} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} />
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
            <div style={{
              padding: '0 14px 14px', fontSize: 12.5, lineHeight: 1.65,
              color: 'var(--text-muted)', fontWeight: 600, position: 'relative',
            }}>
              <div aria-hidden="true" style={{
                height: 1, marginBottom: 12,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.08), transparent)',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {section.clauses.map((clause, ci) => (
                  <div key={ci} style={{ position: 'relative', paddingLeft: 10 }}>
                    <div aria-hidden="true" style={{
                      position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: 2, borderRadius: 1,
                      background: ci === 0
                        ? 'linear-gradient(180deg, rgba(212,175,55,0.5), rgba(212,175,55,0.0))'
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

        {/* ═══════════ HERO CARD (compact, like GuaranteesModal) ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
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
            {/* Shield + title */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <m.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  position: 'relative',
                }}
              >
                <Shield size={24} color="var(--gold-400)" strokeWidth={1.3} />
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

              <h2 style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.2,
                letterSpacing: '-0.02em', marginBottom: 6, margin: '0 0 6px',
                color: 'var(--gold-200)',
              }}>
                {OFFER_META.title}
              </h2>

              <div style={{
                fontSize: 13, lineHeight: 1.5,
                color: 'var(--text-muted)', fontWeight: 600,
              }}>
                {OFFER_META.intro}
              </div>
            </div>

            {/* Stats grid inside hero (like GuaranteesModal) */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            }}>
              {[
                { value: `v${OFFER_META.version}`, label: 'версия' },
                { value: `${OFFER_META.totalSections}`, label: 'разделов' },
                { value: '152-ФЗ', label: 'ПДн' },
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

        {/* ═══════════ SHIELD COUNTER (like GuaranteesModal) ═══════════ */}
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
            Твой заказ защищён{' '}
            <span style={{ color: 'var(--gold-400)', fontWeight: 800 }}>
              {SUMMARY_CARDS.length} гарантиями
            </span>
          </span>
        </m.div>

        {/* ═══════════ KEY POINTS (summary cards) ═══════════ */}
        <SectionHeader icon={BookOpen} label="Ключевые условия" delay={0.22} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SUMMARY_CARDS.map((card, i) => (
            <KeyPointCard
              key={card.title}
              card={card}
              index={i}
              onJump={jumpToSection}
            />
          ))}
        </div>

        <GoldDivider delay={0.55} />

        {/* ═══════════ FULL LEGAL TEXT (expandable section) ═══════════ */}
        <SectionHeader icon={FileText} label="Полный текст оферты" delay={0.56} />

        {!showFullText ? (
          <m.button
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            onClick={() => { triggerHaptic('medium'); setShowFullText(true) }}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 12,
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <FileText size={14} color="var(--gold-400)" strokeWidth={1.8} />
            <span style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
            }}>
              Развернуть {OFFER_META.totalSections} разделов
            </span>
            <ChevronDown size={14} color="var(--text-muted)" strokeWidth={2} />
          </m.button>
        ) : (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

        {/* ═══════════ LEGAL FOOTER (compact) ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 16, textAlign: 'center',
            fontSize: 10, lineHeight: 1.5, color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          ГК РФ ст. 435-443, 779-783 · ЗоЗПП · 152-ФЗ
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62 }}
          style={{ marginTop: 14 }}
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
          transition={{ delay: 0.65 }}
          style={{
            marginTop: 12, textAlign: 'center',
            fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
          }}
        >
          Нажимая кнопку, ты принимаешь условия оферты (п. 3 ст. 438 ГК РФ)
        </m.div>
      </div>
    </ModalWrapper>
  )
}
