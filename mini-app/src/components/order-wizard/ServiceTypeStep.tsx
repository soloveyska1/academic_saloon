import { ReactNode, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Crown,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react'
import { ServiceCategory, ServiceType } from './types'
import { SERVICE_TYPES } from './constants'
import {
  formatOrderCount,
  SocialProofData,
  useSocialProofBatch,
} from './useSocialProof'

interface ServiceTypeStepProps {
  selected: string | null
  onSelect: (id: string) => void
  onAssistRequest?: () => void
  onUrgentRequest?: () => void
  minimal?: boolean
}

type SectionMeta = {
  category: ServiceCategory
  title: string
  subtitle: string
  eyebrow: string
  accent: string
  accentSoft: string
  accentBorder: string
  icon: typeof Crown
}

const SECTION_ORDER: ServiceCategory[] = ['premium', 'standard', 'express']

const SECTION_META: Record<ServiceCategory, SectionMeta> = {
  premium: {
    category: 'premium',
    title: 'Выпускные работы',
    subtitle: 'Долгие проекты с сопровождением, правками и спокойной защитой.',
    eyebrow: 'Флагманские форматы',
    accent: 'var(--gold-400)',
    accentSoft: 'rgba(212, 175, 55, 0.14)',
    accentBorder: 'rgba(212, 175, 55, 0.28)',
    icon: Crown,
  },
  standard: {
    category: 'standard',
    title: 'Учебные работы',
    subtitle: 'Курсовые и практика с точным сценарием, структурой и понятным сроком.',
    eyebrow: 'Основной академический поток',
    accent: '#d9c09a',
    accentSoft: 'rgba(217, 192, 154, 0.10)',
    accentBorder: 'rgba(217, 192, 154, 0.22)',
    icon: BookOpen,
  },
  express: {
    category: 'express',
    title: 'Экспресс-форматы',
    subtitle: 'Короткие задачи и быстрый запуск, когда результат нужен без лишних кругов.',
    eyebrow: 'Срочные и компактные задачи',
    accent: '#76c5ab',
    accentSoft: 'rgba(118, 197, 171, 0.10)',
    accentBorder: 'rgba(118, 197, 171, 0.24)',
    icon: Zap,
  },
}

const SERVICE_ORDER = new Map(SERVICE_TYPES.map((service, index) => [service.id, index]))

function getOrderedServices(services: ServiceType[], category: ServiceCategory) {
  return [...services].sort((left, right) => {
    if (category !== 'premium') {
      const popularityDiff = Number(Boolean(right.popular)) - Number(Boolean(left.popular))
      if (popularityDiff !== 0) {
        return popularityDiff
      }
    }

    return (SERVICE_ORDER.get(left.id) ?? 0) - (SERVICE_ORDER.get(right.id) ?? 0)
  })
}

function getCategoryStatusLabel(category: ServiceCategory) {
  if (category === 'premium') {
    return 'Сопровождение и правки'
  }

  if (category === 'standard') {
    return 'Структура и методичка'
  }

  return 'Быстрый запуск'
}

function getSearchableText(service: ServiceType) {
  return `${service.label} ${service.description} ${service.price} ${service.duration}`.toLowerCase()
}

export function ServiceTypeStep({
  selected,
  onSelect,
  onAssistRequest,
  onUrgentRequest,
  minimal = false,
}: ServiceTypeStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const search = searchQuery.trim().toLowerCase()
  const handleUrgentRequest = onUrgentRequest || onAssistRequest

  const proofTargets = useMemo(
    () => SERVICE_TYPES.map(service => ({
      id: service.id,
      category: service.category,
      popular: service.popular,
    })),
    []
  )

  const socialProofMap = useSocialProofBatch(proofTargets)

  const sections = useMemo(() => {
    return SECTION_ORDER.map((category) => {
      const meta = SECTION_META[category]
      const baseServices = SERVICE_TYPES.filter(service => service.category === category)
      const visibleServices = search
        ? baseServices.filter(service => getSearchableText(service).includes(search))
        : baseServices

      return {
        ...meta,
        services: getOrderedServices(visibleServices, category),
      }
    }).filter(section => section.services.length > 0)
  }, [search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: minimal ? 22 : 20 }}>
      <SelectionPrelude
        minimal={minimal}
        onUrgentRequest={handleUrgentRequest}
      />

      {!minimal && (
        <CatalogSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      )}

      {sections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {sections.map((section, index) => (
            <ServiceSection
              key={section.category}
              section={section}
              selected={selected}
              onSelect={onSelect}
              socialProofMap={socialProofMap}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptySearchState onReset={() => setSearchQuery('')} />
      )}
    </div>
  )
}

function SelectionPrelude({
  minimal,
  onUrgentRequest,
}: {
  minimal: boolean
  onUrgentRequest?: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: minimal ? '18px 18px 16px' : '20px 20px 18px',
        borderRadius: 24,
        background: `
          radial-gradient(circle at top right, rgba(212, 175, 55, 0.16), transparent 34%),
          linear-gradient(145deg, rgba(255, 255, 255, 0.03), transparent 55%),
          linear-gradient(145deg, var(--bg-elevated), var(--bg-surface))
        `,
        border: '1px solid rgba(212, 175, 55, 0.16)',
        boxShadow: `
          0 18px 48px -30px rgba(0, 0, 0, 0.75),
          inset 0 1px 0 rgba(255, 255, 255, 0.04)
        `,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -40,
          bottom: -60,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.14), transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            padding: '7px 12px',
            borderRadius: 999,
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.18)',
          }}>
            <Sparkles size={14} color="var(--gold-300)" />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold-300)',
            }}>
              Основной маршрут
            </span>
          </div>

          <div>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: 1.2,
              fontFamily: "'Manrope', sans-serif",
              marginBottom: 8,
            }}>
              Выберите формат работы, а остальное соберём дальше.
            </div>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: 540,
            }}>
              На следующем шаге уточним тему, требования и срок. Если в процессе окажется,
              что нужен другой формат, его можно сменить без потери логики заявки.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <PreludeFact icon={Clock3} label="3 спокойных шага" />
          <PreludeFact icon={ShieldCheck} label="менеджер проверит детали" />
          <PreludeFact icon={Sparkles} label="цена станет точнее дальше" />
        </div>

        {onUrgentRequest && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onUrgentRequest}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              alignSelf: 'flex-start',
              padding: '13px 16px',
              minWidth: minimal ? '100%' : undefined,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 18,
              color: 'var(--text-main)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                Срочная задача без выбора формата?
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Перейдите в быстрый запрос и отправьте тему сразу.
              </span>
            </div>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.14)',
              border: '1px solid rgba(212, 175, 55, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ArrowUpRight size={16} color="var(--gold-300)" />
            </div>
          </motion.button>
        )}
      </div>
    </motion.section>
  )
}

function PreludeFact({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles
  label: string
}) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 12px',
      borderRadius: 999,
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      color: 'var(--text-secondary)',
    }}>
      <Icon size={14} color="var(--gold-300)" />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function CatalogSearch({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '15px 18px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 18,
      boxShadow: '0 12px 30px -28px rgba(0, 0, 0, 0.65)',
    }}>
      <Search size={18} color="var(--text-muted)" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Найти нужную услугу"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-main)',
          fontSize: 15,
          fontFamily: "'Manrope', sans-serif",
        }}
      />
      {value && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onClear}
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} color="var(--text-muted)" />
        </motion.button>
      )}
    </div>
  )
}

function ServiceSection({
  section,
  selected,
  onSelect,
  socialProofMap,
  index,
}: {
  section: SectionMeta & { services: ServiceType[] }
  selected: string | null
  onSelect: (id: string) => void
  socialProofMap: Map<string, SocialProofData>
  index: number
}) {
  const SectionIcon = section.icon

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 28 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            color: section.accent,
          }}>
            <SectionIcon size={16} color={section.accent} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: section.accent,
            }}>
              {section.eyebrow}
            </span>
          </div>
          <div style={{
            fontSize: section.category === 'premium' ? 22 : 18,
            lineHeight: 1.15,
            fontWeight: 700,
            color: 'var(--text-main)',
            fontFamily: section.category === 'premium' ? "'Cinzel', serif" : "'Manrope', sans-serif",
            marginBottom: 6,
          }}>
            {section.title}
          </div>
          <div style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            maxWidth: 560,
          }}>
            {section.subtitle}
          </div>
        </div>

        <div style={{
          flexShrink: 0,
          padding: '8px 12px',
          borderRadius: 999,
          background: section.accentSoft,
          border: `1px solid ${section.accentBorder}`,
          color: section.accent,
          fontSize: 12,
          fontWeight: 700,
        }}>
          {section.services.length} услуг
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {section.services.map((service) => (
          <ServiceChoiceCard
            key={service.id}
            service={service}
            category={section.category}
            selected={selected === service.id}
            onSelect={() => onSelect(service.id)}
            socialProof={socialProofMap.get(service.id)!}
          />
        ))}
      </div>
    </motion.section>
  )
}

function ServiceChoiceCard({
  service,
  category,
  selected,
  onSelect,
  socialProof,
}: {
  service: ServiceType
  category: ServiceCategory
  selected: boolean
  onSelect: () => void
  socialProof: SocialProofData
}) {
  const palette = SECTION_META[category]
  const Icon = service.icon

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '18px 18px 18px 16px',
        borderRadius: 24,
        border: `1px solid ${selected ? palette.accentBorder : 'var(--border-default)'}`,
        background: selected
          ? `linear-gradient(145deg, ${palette.accentSoft}, var(--bg-surface))`
          : 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: selected
          ? `0 18px 44px -28px ${palette.accentSoft}, inset 0 1px 0 rgba(255, 255, 255, 0.06)`
          : '0 14px 34px -28px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        position: 'relative',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: selected
            ? `radial-gradient(circle at top right, ${palette.accentSoft}, transparent 35%)`
            : 'none',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: selected ? palette.accentSoft : 'var(--bg-glass)',
          border: `1px solid ${selected ? palette.accentBorder : 'var(--border-default)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon
            size={26}
            color={selected ? palette.accent : 'var(--text-secondary)'}
            strokeWidth={1.65}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {(service.popular || category === 'premium') && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 9px',
                    borderRadius: 999,
                    background: selected ? 'rgba(255, 255, 255, 0.08)' : palette.accentSoft,
                    border: `1px solid ${selected ? 'rgba(255, 255, 255, 0.08)' : palette.accentBorder}`,
                    color: selected ? 'var(--text-main)' : palette.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    <Sparkles size={11} color={selected ? 'var(--gold-300)' : palette.accent} />
                    {service.popular ? 'Часто выбирают' : 'Премиум'}
                  </span>
                )}
                {selected && (
                  <span style={{
                    padding: '5px 9px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-main)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    Выбрано
                  </span>
                )}
              </div>

              <div style={{
                fontSize: category === 'premium' ? 24 : 18,
                lineHeight: 1.15,
                fontWeight: 700,
                color: 'var(--text-main)',
                fontFamily: category === 'premium' ? "'Manrope', sans-serif" : "'Manrope', sans-serif",
                marginBottom: 6,
              }}>
                {service.label}
              </div>

              <div style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                maxWidth: 520,
              }}>
                {service.description}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontSize: category === 'premium' ? 22 : 18,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: selected ? palette.accent : 'var(--text-main)',
                marginBottom: 4,
              }}>
                {service.price}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {service.duration}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <MetaPill>
                <Star size={12} fill="var(--gold-300)" color="var(--gold-300)" />
                {socialProof.rating}
              </MetaPill>
              <MetaPill>{formatOrderCount(socialProof.totalOrders)} завершено</MetaPill>
              <MetaPill>{getCategoryStatusLabel(category)}</MetaPill>
            </div>

            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: palette.accent,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: palette.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 18px ${palette.accentSoft}`,
                  }}>
                    <Check size={15} color="#050505" strokeWidth={2.8} />
                  </div>
                  Готово к продолжению
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Нажмите, чтобы выбрать
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 10px',
      borderRadius: 999,
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      color: 'var(--text-secondary)',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1,
    }}>
      {children}
    </span>
  )
}

function EmptySearchState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '36px 20px',
        borderRadius: 22,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.04)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Search size={22} color="var(--text-muted)" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
        Не нашли нужный формат
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 18 }}>
        Сбросьте поиск и посмотрите весь каталог. Если задача нестандартная, подойдёт пункт «Другое».
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onReset}
        style={{
          padding: '11px 16px',
          borderRadius: 14,
          border: '1px solid var(--border-gold)',
          background: 'transparent',
          color: 'var(--gold-300)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Показать все услуги
      </motion.button>
    </motion.div>
  )
}
