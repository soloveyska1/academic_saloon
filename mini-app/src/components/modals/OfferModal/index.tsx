import { useCallback, useState, memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Shield, ChevronDown, ArrowRight, Check,
  FileText, Star,
} from 'lucide-react'
import { ModalWrapper, triggerHaptic } from '../shared'
import { SUMMARY_CARDS, OFFER_SECTIONS, OFFER_META } from './offerData'
import type { OfferSection } from './offerData'

// ═══════════════════════════════════════════════════════════════════════════
//  OFFER MODAL v8 — Client-centric elite design
//  Focus: what matters to the CLIENT, not document metadata
//  Hero: social proof + 3 key stats (100% возврат, ∞ правок, 24ч помощь)
//  Body: interactive checklist with gold progress
//  Footer: expandable legal text + elite CTA
// ═══════════════════════════════════════════════════════════════════════════

export interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
  dismissible?: boolean
  accepting?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

// ═══════════ CHECKLIST ITEM ═══════════
const ChecklistItem = memo(function ChecklistItem({ card, index, checked, onToggle }: {
  card: typeof SUMMARY_CARDS[0]; index: number; checked: boolean; onToggle: () => void
}) {
  const Icon = card.icon

  return (
    <m.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.04, ease: EASE }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '13px 14px',
        cursor: 'pointer',
        borderBottom: index < SUMMARY_CARDS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        transition: 'background 0.15s',
      }}
    >
      {/* Checkbox */}
      <m.div
        animate={{
          background: checked
            ? 'linear-gradient(135deg, var(--gold-400), var(--gold-600))'
            : 'transparent',
          borderColor: checked ? 'transparent' : 'rgba(255,255,255,0.12)',
        }}
        transition={{ duration: 0.15 }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: '1.5px solid rgba(255,255,255,0.12)',
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
              transition={{ type: 'spring', damping: 15, stiffness: 500 }}
            >
              <Check size={11} strokeWidth={3} color="var(--text-on-gold)" />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>

      {/* Icon + text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
        }}>
          <Icon size={12} color="var(--gold-400)" strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.7 }} />
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'color 0.2s', lineHeight: 1.3,
          }}>
            {card.title}
          </span>
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)',
          fontWeight: 500, paddingLeft: 18,
        }}>
          {card.text}
        </div>
      </div>

      {/* Proof — right-aligned */}
      <span style={{
        fontSize: 11, fontWeight: 800,
        color: checked ? 'var(--gold-400)' : 'var(--text-muted)',
        flexShrink: 0, marginTop: 2,
        transition: 'color 0.2s',
      }}>
        {card.proof}
      </span>
    </m.div>
  )
})

// ═══════════ LEGAL ACCORDION ═══════════
const LegalSection = memo(function LegalSection({ section, isOpen, onToggle }: {
  section: OfferSection; isOpen: boolean; onToggle: () => void
}) {
  const Icon = section.icon

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} id={`offer-section-${section.id}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%', padding: '10px 0', minHeight: 38,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        }}
      >
        <Icon size={11} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 12, fontWeight: 600,
          color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color 0.2s',
        }}>
          {section.title}
        </span>
        <m.div aria-hidden="true" animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} strokeWidth={2} color={isOpen ? 'var(--gold-400)' : 'var(--text-muted)'} />
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
            <div style={{ paddingBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {section.clauses.map((clause, ci) => (
                <div key={ci} style={{
                  fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted)',
                  fontWeight: 500, paddingLeft: 8,
                  borderLeft: ci === 0
                    ? '2px solid rgba(212,175,55,0.25)'
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
export function OfferModal({ isOpen, onClose, onAccept, dismissible = true, accepting = false }: OfferModalProps) {
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
    if (accepting) return
    triggerHaptic('medium')
    onAccept?.()
    if (dismissible) onClose()
  }, [accepting, onAccept, onClose, dismissible])

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="offer-modal"
      title="Условия сервиса"
      accentColor="var(--gold-400)"
      dismissible={dismissible}
    >
      <div style={{ padding: '0 20px 24px' }}>

        {/* ═══════════ HERO — client-centric, not doc-centric ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{
            position: 'relative', textAlign: 'center',
            padding: '20px 16px 16px',
            borderRadius: 14,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 100, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.12), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Shield icon */}
            <m.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.05 }}
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Shield size={20} color="var(--gold-400)" strokeWidth={1.4} />
            </m.div>

            {/* Main headline — what the client cares about */}
            <h2 style={{
              fontSize: 18, fontWeight: 700, lineHeight: 1.25,
              letterSpacing: '-0.02em', margin: '0 0 4px',
              color: 'var(--text-primary)',
            }}>
              Условия и гарантии
            </h2>
            <div style={{
              fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
              marginBottom: 14,
            }}>
              Ваши права зафиксированы юридически
            </div>

            {/* 3 KEY STATS — what matters to client */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            }}>
              {[
                { value: '100%', label: 'возврат до старта' },
                { value: '∞', label: 'бесплатных правок' },
                { value: '24ч', label: 'экстренная помощь' },
              ].map((stat, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.05 }}
                  style={{
                    padding: '10px 4px 8px', borderRadius: 10,
                    background: 'rgba(212,175,55,0.04)',
                    border: '1px solid rgba(212,175,55,0.08)',
                  }}
                >
                  <div style={{
                    fontSize: 16, fontWeight: 800, lineHeight: 1,
                    background: 'var(--gold-metallic)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 3,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    lineHeight: 1.2,
                  }}>
                    {stat.label}
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </m.div>

        {/* ═══════════ SOCIAL PROOF ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} fill="var(--gold-400)" color="var(--gold-400)" strokeWidth={0} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            Более 2 400 выполненных проектов
          </span>
        </m.div>

        {/* ═══════════ PROGRESS ═══════════ */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 8 }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 5,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Ключевые условия
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: progress === 1 ? 'var(--gold-400)' : 'var(--text-muted)',
            }}>
              {checkedItems.size} из {SUMMARY_CARDS.length}
            </span>
          </div>
          <div style={{
            height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
          }}>
            <m.div
              animate={{ width: `${Math.max(progress * 100, 1)}%` }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{
                height: '100%', borderRadius: 2,
                background: progress === 1
                  ? 'var(--gold-400)'
                  : 'linear-gradient(90deg, rgba(212,175,55,0.3), var(--gold-400))',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {progress > 0 && progress < 1 && (
                <m.div
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
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
          marginBottom: 12,
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

        {/* ═══════════ FULL LEGAL TEXT ═══════════ */}
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setShowFullText(prev => !prev) }}
            style={{
              width: '100%', padding: '10px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FileText size={11} color="var(--text-muted)" strokeWidth={2} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              {showFullText ? 'Скрыть юридический текст' : `Юридический текст · ${OFFER_META.totalSections} разделов`}
            </span>
            <m.div animate={{ rotate: showFullText ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={11} color="var(--text-muted)" strokeWidth={2} />
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
                <div style={{
                  padding: '8px 0',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {OFFER_SECTIONS.map((section) => (
                    <LegalSection
                      key={section.id}
                      section={section}
                      isOpen={openSections.has(section.id)}
                      onToggle={() => toggleSection(section.id)}
                    />
                  ))}
                  <div style={{
                    marginTop: 8, textAlign: 'center',
                    fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, opacity: 0.6,
                  }}>
                    ГК РФ ст. 435-443, 779-783 · ЗоЗПП · 152-ФЗ
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* ═══════════ CTA ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 16 }}
        >
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleAccept}
            aria-label="Принять условия оферты"
            disabled={accepting}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 12,
              background: 'var(--gold-metallic)',
              border: 'none', cursor: accepting ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, position: 'relative', overflow: 'hidden',
              boxShadow: 'var(--glow-gold)',
              opacity: accepting ? 0.72 : 1,
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
                {accepting ? 'Подготавливаем кабинет...' : 'Принять и продолжить'}
              </span>
            <ArrowRight size={15} strokeWidth={2.5} color="var(--text-on-gold)" style={{ position: 'relative' }} />
          </m.button>
        </m.div>

        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{
            marginTop: 8, textAlign: 'center',
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, opacity: 0.7,
          }}
        >
          Нажимая, вы принимаете публичную оферту (ст. 438 ГК РФ)
        </m.div>
      </div>
    </ModalWrapper>
  )
}
