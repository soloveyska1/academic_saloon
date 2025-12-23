import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Sparkles, ChevronRight, Check, X, Crown, Flame, Star,
  Users, Clock, Zap, GraduationCap, BookOpen, FileText, ArrowRight,
  HelpCircle, Eye
} from 'lucide-react'
import { ServiceType, ServiceCategory } from './types'
import { SERVICE_TYPES } from './constants'
import {
  useSocialProofBatch,
  useAnimatedNumber,
  formatOrderCount,
  SocialProofData
} from './useSocialProof'

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE TYPE STEP v2.0 — Полностью переработанный каталог услуг
//
//  Улучшения:
//  - Визуальная категоризация (острова)
//  - Social Proof с динамическими метриками
//  - "Горит дедлайн" CTA
//  - Sticky category pills (фильтры)
//  - Progressive disclosure для Premium
//  - Интерактивный Quiz
// ═══════════════════════════════════════════════════════════════════════════

// Категории с метаданными
const CATEGORY_CONFIG = {
  premium: {
    title: 'Выпускные работы',
    icon: Crown,
    color: 'var(--gold-400)',
    gradient: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
    border: 'var(--border-gold)',
  },
  standard: {
    title: 'Учебные работы',
    icon: BookOpen,
    color: 'var(--text-main)',
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    border: 'var(--border-default)',
  },
  express: {
    title: 'Экспресс',
    icon: Zap,
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
    border: 'rgba(34,197,94,0.3)',
  },
}

type FilterType = 'all' | 'popular' | 'premium' | 'express'

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
  const [expandedPremium, setExpandedPremium] = useState<string | null>(null)

  // Social proof для всех услуг
  const socialProofMap = useSocialProofBatch(
    SERVICE_TYPES.map(s => ({ id: s.id, category: s.category, popular: s.popular }))
  )

  // Фильтрация услуг
  const filteredServices = useMemo(() => {
    let services = SERVICE_TYPES

    // Поиск
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      services = services.filter(
        s => s.label.toLowerCase().includes(q) ||
             s.description.toLowerCase().includes(q)
      )
    }

    // Фильтр по категории
    if (activeFilter === 'popular') {
      services = services.filter(s => s.popular)
    } else if (activeFilter === 'premium') {
      services = services.filter(s => s.category === 'premium')
    } else if (activeFilter === 'express') {
      services = services.filter(s => s.category === 'express')
    }

    return services
  }, [searchQuery, activeFilter])

  // Группировка по категориям
  const groupedServices = useMemo(() => {
    if (searchQuery.trim() || activeFilter !== 'all') {
      return null // Плоский список при поиске/фильтрации
    }

    return {
      premium: SERVICE_TYPES.filter(s => s.category === 'premium'),
      standard: SERVICE_TYPES.filter(s => s.category === 'standard'),
      express: SERVICE_TYPES.filter(s => s.category === 'express'),
    }
  }, [searchQuery, activeFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Urgent CTA */}
      <UrgentCTA onPress={onUrgentRequest || onAssistRequest} />

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      {/* Category Pills */}
      <CategoryPills
        active={activeFilter}
        onChange={setActiveFilter}
        counts={{
          all: SERVICE_TYPES.length,
          popular: SERVICE_TYPES.filter(s => s.popular).length,
          premium: SERVICE_TYPES.filter(s => s.category === 'premium').length,
          express: SERVICE_TYPES.filter(s => s.category === 'express').length,
        }}
      />

      {/* Quiz Prompt */}
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

      {/* Services List */}
      {groupedServices ? (
        // Grouped view (острова)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(['premium', 'standard', 'express'] as ServiceCategory[]).map(category => (
            <CategoryIsland
              key={category}
              category={category}
              services={groupedServices[category]}
              selected={selected}
              onSelect={onSelect}
              socialProofMap={socialProofMap}
              expandedPremium={expandedPremium}
              onExpandPremium={setExpandedPremium}
            />
          ))}
        </div>
      ) : (
        // Flat filtered view
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
                index={index}
                socialProof={socialProofMap.get(service.id)!}
                expanded={expandedPremium === service.id}
                onExpand={(show) => setExpandedPremium(show ? service.id : null)}
              />
            ))}
          </AnimatePresence>

          {filteredServices.length === 0 && (
            <EmptyState onReset={() => { setSearchQuery(''); setActiveFilter('all') }} />
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  URGENT CTA — "Горит дедлайн?"
// ═══════════════════════════════════════════════════════════════════════════

function UrgentCTA({ onPress }: { onPress?: () => void }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.08))',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated glow */}
      <motion.div
        animate={{
          opacity: pulse ? 0.6 : 0.2,
          scale: pulse ? 1.05 : 1,
        }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 10% 50%, rgba(239,68,68,0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        animate={{ rotate: pulse ? [0, -10, 10, 0] : 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Flame size={22} color="white" />
      </motion.div>

      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#ef4444',
          marginBottom: 2,
        }}>
          Горит дедлайн?
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          Опишите задачу — подберём решение за 2 минуты
        </div>
      </div>

      <ArrowRight size={18} color="#ef4444" />
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SEARCH BAR
// ═══════════════════════════════════════════════════════════════════════════

function SearchBar({
  value,
  onChange,
  onClear
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--bg-card-solid)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
      }}
    >
      <Search size={18} color="var(--text-muted)" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск услуги..."
        style={{
          flex: 1,
          fontSize: 15,
          fontFamily: "'Inter', 'Manrope', sans-serif",
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
//  CATEGORY PILLS
// ═══════════════════════════════════════════════════════════════════════════

function CategoryPills({
  active,
  onChange,
  counts
}: {
  active: FilterType
  onChange: (f: FilterType) => void
  counts: Record<FilterType, number>
}) {
  const pills: { id: FilterType; label: string; icon?: any; color?: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'popular', label: 'Топ', icon: Flame, color: '#f97316' },
    { id: 'express', label: 'Экспресс', icon: Zap, color: '#22c55e' },
    { id: 'premium', label: 'Premium', icon: Crown, color: 'var(--gold-400)' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {pills.map(pill => {
        const isActive = active === pill.id
        const Icon = pill.icon

        return (
          <motion.button
            key={pill.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(pill.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? (pill.color || 'var(--text-main)') : 'var(--text-muted)',
              background: isActive
                ? pill.color
                  ? `${pill.color}15`
                  : 'var(--bg-glass)'
                : 'transparent',
              border: `1px solid ${isActive ? (pill.color || 'var(--border-default)') : 'var(--border-default)'}`,
              borderRadius: 20,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {Icon && <Icon size={14} color={isActive ? pill.color : 'var(--text-muted)'} />}
            {pill.label}
            <span style={{
              fontSize: 11,
              opacity: 0.7,
              fontWeight: 500,
            }}>
              {counts[pill.id]}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUIZ PROMPT & MODAL
// ═══════════════════════════════════════════════════════════════════════════

function QuizPrompt({ onStart }: { onStart: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onStart}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.04))',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <HelpCircle size={20} color="#8b5cf6" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 1 }}>
          Не знаете, что выбрать?
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Ответьте на 2 вопроса — подберём услугу
        </div>
      </div>
      <ChevronRight size={18} color="#8b5cf6" />
    </motion.button>
  )
}

function ServiceQuiz({
  onClose,
  onResult
}: {
  onClose: () => void
  onResult: (serviceId: string) => void
}) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState({ type: '', urgency: '' })

  const typeOptions = [
    { id: 'graduation', label: 'Выпускная работа', desc: 'Диплом, магистерская', icon: GraduationCap },
    { id: 'semester', label: 'Семестровая работа', desc: 'Курсовая, практика', icon: BookOpen },
    { id: 'quick', label: 'Что-то небольшое', desc: 'Эссе, реферат, задача', icon: FileText },
  ]

  const urgencyOptions = [
    { id: 'urgent', label: 'Срочно (до 3 дней)', color: '#ef4444' },
    { id: 'week', label: 'Есть неделя', color: '#eab308' },
    { id: 'plenty', label: '2+ недели', color: '#22c55e' },
  ]

  const getRecommendation = (): string => {
    if (answers.type === 'graduation') {
      return answers.urgency === 'urgent' ? 'diploma' : 'masters'
    }
    if (answers.type === 'semester') {
      return answers.urgency === 'urgent' ? 'practice' : 'coursework'
    }
    // quick
    if (answers.urgency === 'urgent') return 'control'
    return 'essay'
  }

  const handleTypeSelect = (type: string) => {
    setAnswers(a => ({ ...a, type }))
    setStep(2)
  }

  const handleUrgencySelect = (urgency: string) => {
    setAnswers(a => ({ ...a, urgency }))
    setTimeout(() => {
      onResult(getRecommendation())
    }, 300)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: 360,
          background: 'var(--bg-surface)',
          borderRadius: 20,
          padding: 24,
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
              {step === 1 ? 'Что нужно сделать?' : 'Когда дедлайн?'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Шаг {step} из 2
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
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
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: 'var(--gold-400)',
          }} />
          <div style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: step >= 2 ? 'var(--gold-400)' : 'var(--border-default)',
            transition: 'background 0.3s',
          }} />
        </div>

        {/* Options */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {typeOptions.map(opt => {
                const Icon = opt.icon
                return (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTypeSelect(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      background: 'var(--bg-card-solid)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--bg-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={20} color="var(--text-muted)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {opt.desc}
                      </div>
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
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {urgencyOptions.map(opt => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUrgencySelect(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    background: `${opt.color}10`,
                    border: `1px solid ${opt.color}40`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: opt.color,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
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
//  CATEGORY ISLAND — Визуальная группа услуг
// ═══════════════════════════════════════════════════════════════════════════

function CategoryIsland({
  category,
  services,
  selected,
  onSelect,
  socialProofMap,
  expandedPremium,
  onExpandPremium,
}: {
  category: ServiceCategory
  services: ServiceType[]
  selected: string | null
  onSelect: (id: string) => void
  socialProofMap: Map<string, SocialProofData>
  expandedPremium: string | null
  onExpandPremium: (id: string | null) => void
}) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: config.gradient,
        border: `1px solid ${config.border}`,
        borderRadius: 18,
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${config.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={18} color={config.color} />
        </div>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: config.color,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}>
          {config.title}
        </span>
      </div>

      {/* Services */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: category === 'express' ? 8 : 10,
      }}>
        {category === 'express' ? (
          // Compact grid for express
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}>
            {services.map((service, index) => (
              <CompactServiceCard
                key={service.id}
                service={service}
                selected={selected === service.id}
                onSelect={() => onSelect(service.id)}
                socialProof={socialProofMap.get(service.id)!}
              />
            ))}
          </div>
        ) : (
          // Full cards for premium/standard
          services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selected === service.id}
              onSelect={() => onSelect(service.id)}
              index={index}
              socialProof={socialProofMap.get(service.id)!}
              expanded={expandedPremium === service.id}
              onExpand={(show) => onExpandPremium(show ? service.id : null)}
            />
          ))
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE CARD — Полная карточка услуги
// ═══════════════════════════════════════════════════════════════════════════

function ServiceCard({
  service,
  selected,
  onSelect,
  index,
  socialProof,
  expanded,
  onExpand,
}: {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  index: number
  socialProof: SocialProofData
  expanded: boolean
  onExpand: (show: boolean) => void
}) {
  const Icon = service.icon
  const isPremium = service.category === 'premium'

  // Animated viewers count
  const animatedViewers = useAnimatedNumber(socialProof.viewersNow)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onSelect}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          padding: 0,
          background: selected
            ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
            : 'var(--bg-card-solid)',
          border: selected
            ? '2px solid var(--border-gold-strong)'
            : '1px solid var(--border-default)',
          borderRadius: 14,
          cursor: 'pointer',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: selected ? '0 0 20px -5px rgba(212,175,55,0.3)' : 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Main content */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          padding: '14px 16px',
        }}>
          {/* Icon */}
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: selected
                ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))'
                : 'var(--bg-glass)',
              border: `1px solid ${selected ? 'var(--border-gold)' : 'var(--border-default)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon
              size={22}
              color={selected ? 'var(--gold-300)' : 'var(--text-muted)'}
              strokeWidth={1.5}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: selected ? 'var(--text-main)' : 'var(--text-secondary)',
              }}>
                {service.label}
              </span>

              {isPremium && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: '#050505',
                  background: 'var(--gold-metallic)',
                  borderRadius: 4,
                }}>
                  <Crown size={9} />
                  Premium
                </span>
              )}

              {service.popular && !isPremium && (
                <span style={{
                  padding: '2px 6px',
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#f97316',
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.25)',
                  borderRadius: 4,
                }}>
                  Топ
                </span>
              )}
            </div>

            {/* Social proof row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              fontSize: 11,
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                color: '#eab308',
                fontWeight: 600,
              }}>
                <Star size={12} fill="#eab308" />
                {socialProof.rating}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {formatOrderCount(socialProof.totalOrders)} заказов
              </span>
              {socialProof.viewersNow > 1 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  color: '#22c55e',
                }}>
                  <Eye size={11} />
                  {animatedViewers} смотрят
                </span>
              )}
            </div>

            {/* Price & duration */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}>
              <span style={{
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: selected ? 'var(--gold-300)' : 'var(--text-muted)',
              }}>
                {service.price}
              </span>
              <span style={{ color: 'var(--border-default)' }}>•</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {service.duration}
              </span>
            </div>
          </div>

          {/* Checkmark / Chevron */}
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'var(--gold-metallic)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(212,175,55,0.4)',
                  }}
                >
                  <Check size={14} color="#050505" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div
                  key="chevron"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ChevronRight size={18} color="var(--text-muted)" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Premium benefits (progressive disclosure) */}
        {isPremium && (
          <div
            style={{
              borderTop: '1px solid var(--border-default)',
              padding: '10px 16px',
              background: 'rgba(212,175,55,0.03)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onExpand(!expanded)
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} color="var(--gold-400)" />
                  Консультант
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} color="var(--gold-400)" />
                  Правки
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} color="var(--gold-400)" />
                  Защита
                </span>
              </div>
              <motion.div
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={14} color="var(--gold-400)" />
              </motion.div>
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <ul style={{
                    margin: 0,
                    marginTop: 10,
                    padding: 0,
                    paddingLeft: 16,
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.8,
                  }}>
                    <li>Персональный консультант на связи</li>
                    <li>Приоритетная поддержка 24/7</li>
                    <li>Бесплатные доработки до защиты</li>
                    <li>Подготовка к защите и речь</li>
                    <li>Гарантия уникальности от 85%</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPACT SERVICE CARD — Для express-услуг
// ═══════════════════════════════════════════════════════════════════════════

function CompactServiceCard({
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
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '14px 10px',
        background: selected
          ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))'
          : 'var(--bg-card-solid)',
        border: selected
          ? '2px solid rgba(34,197,94,0.5)'
          : '1px solid var(--border-default)',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={11} color="white" strokeWidth={3} />
        </motion.div>
      )}

      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: selected ? 'rgba(34,197,94,0.15)' : 'var(--bg-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon
          size={18}
          color={selected ? '#22c55e' : 'var(--text-muted)'}
          strokeWidth={1.5}
        />
      </div>

      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? 'var(--text-main)' : 'var(--text-secondary)',
          marginBottom: 2,
        }}>
          {service.label}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: 10,
          color: 'var(--text-muted)',
        }}>
          <Star size={10} fill="#eab308" color="#eab308" />
          <span>{socialProof.rating}</span>
        </div>
      </div>

      <div style={{
        fontSize: 11,
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
      style={{
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <Search size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 12 }} />
      <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>
        Ничего не найдено
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        style={{
          marginTop: 12,
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--gold-400)',
          background: 'transparent',
          border: '1px solid var(--border-gold)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Сбросить фильтры
      </motion.button>
    </motion.div>
  )
}
