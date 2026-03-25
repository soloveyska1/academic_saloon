import { memo } from 'react'
import { ShieldCheck, RefreshCcw, EyeOff, Banknote } from 'lucide-react'
import { StaggerGrid } from '../ui/StaggerReveal'

const GUARANTEES = [
  {
    icon: RefreshCcw,
    title: 'Доработка включена',
    description: 'Бесплатные правки до полного соответствия.',
  },
  {
    icon: ShieldCheck,
    title: 'Оригинальный текст',
    description: 'Каждая работа — с нуля. От 80% уникальности.',
  },
  {
    icon: Banknote,
    title: 'Безопасная оплата',
    description: 'Оплата только после согласования условий.',
  },
  {
    icon: EyeOff,
    title: 'Конфиденциальность',
    description: 'Полная защита ваших данных.',
  },
] as const

export const GuaranteesShowcase = memo(function GuaranteesShowcase() {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          paddingLeft: 2,
        }}
      >
        <ShieldCheck size={12} color="var(--gold-400)" strokeWidth={2} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Гарантии
        </span>
      </div>

      <StaggerGrid columns={2} gap={8} animation="scale">
        {GUARANTEES.map((g) => {
          const Icon = g.icon
          return (
            <div
              key={g.title}
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Icon size={16} color="var(--gold-400)" strokeWidth={1.8} />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  marginBottom: 4,
                }}
              >
                {g.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                }}
              >
                {g.description}
              </div>
            </div>
          )
        })}
      </StaggerGrid>
    </div>
  )
})
