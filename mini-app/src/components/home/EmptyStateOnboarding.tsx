import { motion } from 'framer-motion'
import { ArrowUpRight, Clock3, FileText, MessageCircleMore, ShieldCheck } from 'lucide-react'
import { glassGoldStyle } from './shared'

interface EmptyStateOnboardingProps {
  onCreateOrder: () => void
  primaryActionLabel?: string
}

const steps = [
  {
    title: 'Нажмите на главное действие',
    description: 'Откроется короткая заявка без длинного брифа и лишних экранов.',
    icon: FileText,
  },
  {
    title: 'Заполните предмет, тему и срок',
    description: 'Этого достаточно для старта. Файлы можно приложить сразу или уже позже.',
    icon: Clock3,
  },
  {
    title: 'Получите расчёт и сопровождение',
    description: 'Менеджер быстро подключится в чате, уточнит детали и поведёт заказ дальше.',
    icon: MessageCircleMore,
  },
] as const

export function EmptyStateOnboarding({
  onCreateOrder,
  primaryActionLabel = 'Открыть первую заявку',
}: EmptyStateOnboardingProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="card-padding card-radius"
      style={{
        ...glassGoldStyle,
        marginBottom: 18,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(212,175,55,0.06) 100%)',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 11px',
              borderRadius: 999,
              marginBottom: 14,
              background: 'rgba(9, 9, 11, 0.58)',
              border: '1px solid rgba(212,175,55,0.16)',
              color: 'var(--gold-100)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Понятный старт
          </div>

          <h2
            style={{
              fontSize: 'clamp(22px, 5vw, 28px)',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: 'var(--text-main)',
              marginBottom: 10,
              lineHeight: 1.12,
            }}
          >
            Как пройдёт первый заказ
          </h2>

          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 0,
              maxWidth: 480,
            }}
          >
            Вся логика сведена к одному главному действию. Дальше путь короткий и прозрачный:
            короткая заявка, расчёт и сопровождение до результата.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          {steps.map((step, index) => {
            const Icon = step.icon

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '42px 1fr',
                  gap: 14,
                  padding: '14px 14px 14px 12px',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color="var(--gold-400)" strokeWidth={2.1} />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      marginBottom: 5,
                    }}
                  >
                    {index + 1}. {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 16,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.14)',
          }}
        >
          <ShieldCheck size={18} color="var(--gold-400)" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            До согласования цены и деталей вы ничем не рискуете. Главная кнопка выше уже ведёт в этот сценарий.
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onCreateOrder}
          whileTap={{ scale: 0.98 }}
          style={{
            marginTop: 14,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--gold-100)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {primaryActionLabel}
          <ArrowUpRight size={16} strokeWidth={2.4} />
        </motion.button>
      </div>
    </motion.section>
  )
}
