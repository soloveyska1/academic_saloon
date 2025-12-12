import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, ChevronRight, Check, X, Crown } from 'lucide-react'
import { ServiceType } from './types'
import { SERVICE_TYPES } from './constants'

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE TYPE STEP — Премиум-каталог услуг
//  Особенности:
//  - Поиск по названию/описанию
//  - "Не знаю что выбрать" карточка с подсказкой
//  - List view для премиум-читаемости (1 колонка)
//  - Premium badge с тултипом
// ═══════════════════════════════════════════════════════════════════════════

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
}

export function ServiceTypeStep({ selected, onSelect, onAssistRequest }: ServiceTypeStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showPremiumInfo, setShowPremiumInfo] = useState<string | null>(null)

  // Фильтрация по поиску
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return SERVICE_TYPES
    const q = searchQuery.toLowerCase()
    return SERVICE_TYPES.filter(
      s => s.label.toLowerCase().includes(q) ||
           s.description.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Поиск */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск: диплом, презентация, редактура..."
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
          {searchQuery && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery('')}
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
      </div>

      {/* Quick Assist Card */}
      {!searchQuery && onAssistRequest && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAssistRequest}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 18px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
            border: '1px solid var(--border-gold)',
            borderRadius: 16,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} color="var(--gold-400)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: 3,
              }}
            >
              Не уверены, что выбрать?
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Ответьте на 2 вопроса — подберём услугу
            </div>
          </div>
          <ChevronRight size={20} color="var(--gold-400)" />
        </motion.button>
      )}

      {/* Список услуг */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence mode="popLayout">
          {filteredServices.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selected === service.id}
              onSelect={() => onSelect(service.id)}
              index={index}
              showPremiumInfo={showPremiumInfo === service.id}
              onPremiumInfoToggle={(show) => setShowPremiumInfo(show ? service.id : null)}
            />
          ))}
        </AnimatePresence>

        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Search size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>Ничего не найдено</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Попробуйте другой запрос</div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVICE CARD — Карточка услуги (List View)
// ═══════════════════════════════════════════════════════════════════════════

interface ServiceCardProps {
  service: ServiceType
  selected: boolean
  onSelect: () => void
  index: number
  showPremiumInfo: boolean
  onPremiumInfoToggle: (show: boolean) => void
}

function ServiceCard({
  service,
  selected,
  onSelect,
  index,
  showPremiumInfo,
  onPremiumInfoToggle,
}: ServiceCardProps) {
  const Icon = service.icon
  const isPremium = service.category === 'premium'

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
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '16px 18px',
          background: selected
            ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))'
            : 'var(--bg-card-solid)',
          border: selected
            ? '2px solid var(--border-gold-strong)'
            : '1px solid var(--border-default)',
          borderRadius: 16,
          cursor: 'pointer',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: selected
            ? '0 0 20px -5px rgba(212,175,55,0.3)'
            : 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Glow effect */}
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.1) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: selected
              ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))'
              : 'var(--bg-glass)',
            border: `1px solid ${selected ? 'var(--border-gold)' : 'var(--border-default)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Icon
            size={24}
            color={selected ? 'var(--gold-300)' : 'var(--text-muted)'}
            strokeWidth={1.5}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: selected ? 'var(--text-main)' : 'var(--text-secondary)',
              }}
            >
              {service.label}
            </span>
            {isPremium && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPremiumInfoToggle(!showPremiumInfo)
                }}
                whileTap={{ scale: 0.9 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#050505',
                  background: 'var(--gold-metallic)',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                <Crown size={9} />
                Premium
              </motion.button>
            )}
            {service.popular && !isPremium && (
              <span
                style={{
                  padding: '2px 6px',
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#22c55e',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 5,
                }}
              >
                Популярно
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            {service.description}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: selected ? 'var(--gold-300)' : 'var(--text-muted)',
              }}
            >
              {service.price}
            </span>
            <span style={{ color: 'var(--border-default)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>{service.duration}</span>
          </div>
        </div>

        {/* Checkmark / Chevron */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--gold-metallic)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(212,175,55,0.4)',
                }}
              >
                <Check size={16} color="#050505" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                key="chevron"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChevronRight size={20} color="var(--text-muted)" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Premium Info Sheet */}
      <AnimatePresence>
        {showPremiumInfo && isPremium && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))',
                border: '1px solid var(--border-gold)',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--gold-400)',
                  marginBottom: 10,
                }}
              >
                Что входит в Premium-сопровождение:
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  paddingLeft: 16,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}
              >
                <li>Персональный консультант</li>
                <li>Приоритетная поддержка 24/7</li>
                <li>Бесплатные доработки до защиты</li>
                <li>Подготовка к защите и речь</li>
                <li>Гарантия уникальности</li>
              </ul>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onPremiumInfoToggle(false)
                }}
                style={{
                  marginTop: 12,
                  padding: '8px 14px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--gold-400)',
                  background: 'transparent',
                  border: '1px solid var(--border-gold)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Понятно
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
