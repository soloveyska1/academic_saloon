import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronRight, Check, X, Crown, Flame, Star,
  Zap, GraduationCap, BookOpen, FileText, ArrowRight,
  Sparkles
} from 'lucide-react'
import { ServiceType, ServiceCategory } from './types'
import { SERVICE_TYPES } from './constants'
import {
  useSocialProofBatch,
  formatOrderCount,
  SocialProofData
} from './useSocialProof'

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE TYPE STEP v3.0 — LUXURY EDITION
//
//  Design Philosophy (Jony Ive + Dieter Rams):
//  - "Less but better" — убран визуальный шум
//  - "Breathing cards" — больше воздуха
//  - "Layered glass" — глубина через тени и blur
//  - "Cinematic motion" — каскадные анимации
//  - Premium Hero Cards — выделенный дизайн для VIP-услуг
// ═══════════════════════════════════════════════════════════════════════════

type FilterType = 'all' | 'graduation' | 'study' | 'express'

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
  onUrgentRequest?: () => void
}

export function ServiceTypeStep({
  selected,
  onSelect,
  onAssistRequest,
  onUrgentRequest
}: ServiceTypeStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [showQuiz, setShowQuiz] = useState(false)

  // Social proof
  const socialProofMap = useSocialProofBatch(
    SERVICE_TYPES.map(s => ({ id: s.id, category: s.category, popular: s.popular }))
  )

  // Фильтрация
  const filteredServices = useMemo(() => {
    let services = SERVICE_TYPES

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      services = services.filter(
        s => s.label.toLowerCase().includes(q) ||
             s.description.toLowerCase().includes(q)
      )
    }

    if (activeFilter === 'graduation') {
      services = services.filter(s => s.category === 'premium')
    } else if (activeFilter === 'study') {
      services = services.filter(s => s.category === 'standard')
    } else if (activeFilter === 'express') {
      services = services.filter(s => s.category === 'express')
    }

    return services
  }, [searchQuery, activeFilter])

  // Группировка
  const groupedServices = useMemo(() => {
    if (searchQuery.trim() || activeFilter !== 'all') return null

    return {
      premium: SERVICE_TYPES.filter(s => s.category === 'premium'),
      standard: SERVICE_TYPES.filter(s => s.category === 'standard'),
      express: SERVICE_TYPES.filter(s => s.category === 'express'),
    }
  }, [searchQuery, activeFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Urgent CTA — Refined */}
      <UrgentCTA onPress={onUrgentRequest || onAssistRequest} />

      {/* Search — Minimal */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      {/* Category Tabs — Underline Style */}
      <CategoryTabs
        active={activeFilter}
        onChange={setActiveFilter}
      />

      {/* Quiz Prompt — Subtle */}
      {!searchQuery && activeFilter === 'all' && (
        <QuizPrompt onStart={() => setShowQuiz(true)} />
      )}

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <ServiceQuiz
            onClose={() => setShowQuiz(false)}
            onResult={(serviceId) => {
              setShowQuiz(false)
              onSelect(serviceId)
            }}
          />
        )}
      </AnimatePresence>

      {/* Services */}
      {groupedServices ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Premium Section — Hero Cards */}
          <CategorySection
            category="premium"
            title="Выпускные работы"
            services={groupedServices.premium}
            selected={selected}
            onSelect={onSelect}
            socialProofMap={socialProofMap}
          />

          {/* Standard Section */}
          <CategorySection
            category="standard"
            title="Учебные работы"
            services={groupedServices.standard}
            selected={selected}
            onSelect={onSelect}
            socialProofMap={socialProofMap}
          />

          {/* Express Section — Compact Grid */}
          <CategorySection
            category="express"
            title="Экспресс"
            services={groupedServices.express}
            selected={selected}
            onSelect={onSelect}
            socialProofMap={socialProofMap}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                {service.category === 'premium' ? (
                  <PremiumHeroCard
                    service={service}
                    selected={selected === service.id}
                    onSelect={() => onSelect(service.id)}
                    socialProof={socialProofMap.get(service.id)!}
                  />
                ) : (
                  <StandardCard
                    service={service}
                    selected={selected === service.id}
                    onSelect={() => onSelect(service.id)}
                    socialProof={socialProofMap.get(service.id)!}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredServices.length === 0 && <EmptyState onReset={() => { setSearchQuery(''); setActiveFilter('all') }} />}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT CTA — Refined, Less Aggressive
// ═══════════════════════════════════════════════════════════════════════════

function UrgentCTA({ onPress }: { onPress?: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.04) 100%)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 80,
        height: '100%',
        background: 'radial-gradient(circle at left, rgba(239,68,68,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #ef4444, #f97316)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
      }}>
        <Flame size={22} color="white" />
      </div>

      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: 3,
        }}>
          Срочный заказ
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          Опишите задачу — подберём решение
        </div>
      </div>

      <ArrowRight size={18} color="var(--text-muted)" />
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SEARCH BAR — Minimal
// ═══════════════════════════════════════════════════════════════════════════

function SearchBar({ value, onChange, onClear }: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 18px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 14,
      transition: 'border-color 0.2s',
    }}>
      <Search size={18} color="var(--text-muted)" style={{ opacity: 0.6 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Найти услугу..."
        style={{
          flex: 1,
          fontSize: 15,
          fontFamily: "'Inter', sans-serif",
          color: 'var(--text-main)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
        }}
      />
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'var(--bg-glass)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color="var(--text-muted)" />
        </motion.button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CATEGORY TABS — Clean Underline Style
// ═══════════════════════════════════════════════════════════════════════════

function CategoryTabs({ active, onChange }: {
  active: FilterType
  onChange: (f: FilterType) => void
}) {
  const tabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'graduation', label: 'Выпускные' },
    { id: 'study', label: 'Учебные' },
    { id: 'express', label: 'Быстрые' },
  ]

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-default)',
      marginBottom: 4,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id

        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--gold-400)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--gold-400)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUIZ PROMPT — Subtle & Elegant
// ═══════════════════════════════════════════════════════════════════════════

function QuizPrompt({ onStart }: { onStart: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      whileHover={{ backgroundColor: 'rgba(139,92,246,0.08)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onStart}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '14px 20px',
        background: 'transparent',
        border: '1px dashed rgba(139,92,246,0.3)',
        borderRadius: 12,
        cursor: 'pointer',
      }}
    >
      <Sparkles size={16} color="#8b5cf6" />
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: '#8b5cf6',
      }}>
        Не знаете, что выбрать? Поможем подобрать
      </span>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE QUIZ — Modal
// ═══════════════════════════════════════════════════════════════════════════

function ServiceQuiz({ onClose, onResult }: {
  onClose: () => void
  onResult: (serviceId: string) => void
}) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState({ type: '', urgency: '' })

  const typeOptions = [
    { id: 'graduation', label: 'Выпускная работа', desc: 'Диплом, магистерская', icon: GraduationCap },
    { id: 'semester', label: 'Семестровая', desc: 'Курсовая, практика', icon: BookOpen },
    { id: 'quick', label: 'Небольшая работа', desc: 'Эссе, реферат, задача', icon: FileText },
  ]

  const urgencyOptions = [
    { id: 'urgent', label: 'До 3 дней', color: '#ef4444' },
    { id: 'week', label: 'Неделя', color: '#eab308' },
    { id: 'plenty', label: '2+ недели', color: '#22c55e' },
  ]

  const getRecommendation = (): string => {
    if (answers.type === 'graduation') return answers.urgency === 'urgent' ? 'diploma' : 'masters'
    if (answers.type === 'semester') return answers.urgency === 'urgent' ? 'practice' : 'coursework'
    return answers.urgency === 'urgent' ? 'control' : 'essay'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg-elevated)',
          borderRadius: 24,
          padding: 28,
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--gold-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}>
              Шаг {step} из 2
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
              {step === 1 ? 'Что нужно сделать?' : 'Когда дедлайн?'}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--bg-glass)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="var(--text-muted)" />
          </motion.button>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--gold-400)' }} />
          <div style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: step >= 2 ? 'var(--gold-400)' : 'var(--border-default)',
            transition: 'background 0.3s',
          }} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {typeOptions.map((opt, i) => {
                const Icon = opt.icon
                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ backgroundColor: 'var(--bg-glass)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setAnswers(a => ({ ...a, type: opt.id })); setStep(2) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '18px 20px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--bg-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={22} color="var(--text-muted)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </motion.button>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {urgencyOptions.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setAnswers(a => ({ ...a, urgency: opt.id }))
                    setTimeout(() => onResult(getRecommendation()), 200)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '18px 20px',
                    background: `${opt.color}08`,
                    border: `1px solid ${opt.color}30`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: opt.color,
                    boxShadow: `0 0 12px ${opt.color}40`,
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
                    {opt.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CATEGORY SECTION
// ═══════════════════════════════════════════════════════════════════════════

function CategorySection({
  category,
  title,
  services,
  selected,
  onSelect,
  socialProofMap,
}: {
  category: ServiceCategory
  title: string
  services: ServiceType[]
  selected: string | null
  onSelect: (id: string) => void
  socialProofMap: Map<string, SocialProofData>
}) {
  const isPremium = category === 'premium'
  const isExpress = category === 'express'

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Section Header — Cinzel for Premium */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
      }}>
        {isPremium && (
          <Crown size={16} color="var(--gold-400)" />
        )}
        {isExpress && (
          <Zap size={16} color="#22c55e" />
        )}
        <h3 style={{
          fontSize: isPremium ? 14 : 13,
          fontWeight: 700,
          fontFamily: isPremium ? "'Cinzel', serif" : "'Inter', sans-serif",
          letterSpacing: isPremium ? '0.12em' : '0.05em',
          textTransform: 'uppercase',
          color: isPremium ? 'var(--gold-400)' : 'var(--text-muted)',
          margin: 0,
          background: isPremium ? 'linear-gradient(135deg, #FCF6BA 0%, #D4AF37 50%, #B38728 100%)' : 'none',
          WebkitBackgroundClip: isPremium ? 'text' : 'initial',
          WebkitTextFillColor: isPremium ? 'transparent' : 'initial',
        }}>
          {title}
        </h3>
      </div>

      {/* Cards */}
      <div style={{
        display: isExpress ? 'grid' : 'flex',
        gridTemplateColumns: isExpress ? 'repeat(2, 1fr)' : undefined,
        flexDirection: isExpress ? undefined : 'column',
        gap: isExpress ? 10 : 14,
      }}>
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
          >
            {isPremium ? (
              <PremiumHeroCard
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
                socialProof={socialProofMap.get(service.id)!}
              />
            ) : isExpress ? (
              <ExpressCard
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
                socialProof={socialProofMap.get(service.id)!}
              />
            ) : (
              <StandardCard
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
                socialProof={socialProofMap.get(service.id)!}
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM HERO CARD — Luxury Design
// ═══════════════════════════════════════════════════════════════════════════

function PremiumHeroCard({
  service,
  selected,
  onSelect,
  socialProof,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  socialProof: SocialProofData
}) {
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      whileHover={{
        y: -2,
        boxShadow: '0 12px 40px rgba(212,175,55,0.15)',
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        padding: 0,
        background: selected
          ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 50%, rgba(212,175,55,0.08) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: 'none',
        borderRadius: 20,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected
          ? '0 8px 32px rgba(212,175,55,0.2), inset 0 1px 0 rgba(212,175,55,0.2)'
          : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Gold accent line */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: selected ? 4 : 0,
        background: 'linear-gradient(180deg, #FCF6BA, #D4AF37, #8E6E27)',
        borderRadius: '20px 0 0 20px',
        transition: 'width 0.3s',
      }} />

      {/* Content */}
      <div style={{ padding: '24px 24px 20px' }}>
        {/* Header Row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: selected
              ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))'
              : 'var(--bg-glass)',
            border: `1px solid ${selected ? 'rgba(212,175,55,0.4)' : 'var(--border-default)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: selected ? '0 4px 16px rgba(212,175,55,0.2)' : 'none',
          }}>
            <Icon
              size={26}
              color={selected ? 'var(--gold-300)' : 'var(--text-muted)'}
              strokeWidth={1.5}
            />
          </div>

          {/* Check / Badge */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
                }}
              >
                <Check size={18} color="#050505" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.span
                key="badge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '5px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#050505',
                  background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
                  borderRadius: 6,
                }}
              >
                Premium
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <h4 style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-main)',
          margin: '0 0 8px',
          fontFamily: "'Manrope', sans-serif",
        }}>
          {service.label}
        </h4>

        {/* Benefits — Always visible for Premium */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
        }}>
          {['Консультант', 'Правки', 'Защита'].map((benefit) => (
            <span
              key={benefit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--gold-400)',
                background: 'rgba(212,175,55,0.08)',
                borderRadius: 6,
              }}
            >
              <Check size={10} color="var(--gold-400)" />
              {benefit}
            </span>
          ))}
        </div>

        {/* Footer: Rating & Price */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          {/* Rating */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            <Star size={14} fill="#eab308" color="#eab308" />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{socialProof.rating}</span>
            <span>·</span>
            <span>{formatOrderCount(socialProof.totalOrders)} выполнено</span>
          </div>

          {/* Price */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              background: 'linear-gradient(135deg, #FCF6BA, #D4AF37)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {service.price}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {service.duration}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STANDARD CARD — Clean & Elegant
// ═══════════════════════════════════════════════════════════════════════════

function StandardCard({
  service,
  selected,
  onSelect,
  socialProof,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  socialProof: SocialProofData
}) {
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      whileHover={{ y: -1, backgroundColor: 'rgba(255,255,255,0.02)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        padding: '18px 20px',
        background: selected
          ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))'
          : 'var(--bg-surface)',
        border: 'none',
        borderRadius: 16,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        boxShadow: selected
          ? '0 4px 20px rgba(212,175,55,0.15), inset 0 0 0 1px rgba(212,175,55,0.3)'
          : '0 2px 12px rgba(0,0,0,0.1), inset 0 0 0 1px var(--border-default)',
      }}
    >
      {/* Selection indicator */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: selected ? 3 : 0,
        height: '60%',
        background: 'var(--gold-400)',
        borderRadius: '0 3px 3px 0',
        transition: 'width 0.2s',
      }} />

      {/* Icon */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: selected ? 'rgba(212,175,55,0.1)' : 'var(--bg-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon
          size={22}
          color={selected ? 'var(--gold-300)' : 'var(--text-muted)'}
          strokeWidth={1.5}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-main)',
          }}>
            {service.label}
          </span>
          {service.popular && (
            <span style={{
              padding: '2px 6px',
              fontSize: 9,
              fontWeight: 600,
              color: '#f97316',
              background: 'rgba(249,115,22,0.1)',
              borderRadius: 4,
            }}>
              Топ
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Star size={12} fill="#eab308" color="#eab308" />
            {socialProof.rating}
          </span>
          <span>·</span>
          <span>{service.price}</span>
          <span>·</span>
          <span>{service.duration}</span>
        </div>
      </div>

      {/* Check */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--gold-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={16} color="#050505" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPRESS CARD — Compact Grid Style
// ═══════════════════════════════════════════════════════════════════════════

function ExpressCard({
  service,
  selected,
  onSelect,
  socialProof,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  socialProof: SocialProofData
}) {
  const Icon = service.icon

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '20px 12px',
        background: selected
          ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))'
          : 'var(--bg-surface)',
        border: 'none',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
        boxShadow: selected
          ? '0 4px 20px rgba(34,197,94,0.15), inset 0 0 0 1.5px rgba(34,197,94,0.4)'
          : '0 2px 10px rgba(0,0,0,0.1), inset 0 0 0 1px var(--border-default)',
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </motion.div>
      )}

      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: selected ? 'rgba(34,197,94,0.12)' : 'var(--bg-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon
          size={20}
          color={selected ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={1.5}
        />
      </div>

      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-main)',
          marginBottom: 4,
        }}>
          {service.label}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          <Star size={10} fill="#eab308" color="#eab308" />
          {socialProof.rating}
        </div>
      </div>

      <div style={{
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        color: selected ? '#22c55e' : 'var(--text-muted)',
      }}>
        {service.price}
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '48px 20px', textAlign: 'center' }}
    >
      <Search size={36} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 16 }} />
      <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 6 }}>
        Ничего не найдено
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        style={{
          marginTop: 16,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--gold-400)',
          background: 'transparent',
          border: '1px solid var(--border-gold)',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        Показать все услуги
      </motion.button>
    </motion.div>
  )
}
