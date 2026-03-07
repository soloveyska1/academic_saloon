import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  Clock3,
  FileText,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { glassGoldStyle } from './shared'

interface EmptyStateOnboardingProps {
  onCreateOrder: () => void
  primaryActionLabel?: string
}

const steps = [
  {
    icon: FileText,
    title: 'Нажмите на главную кнопку',
    description: 'Откроется короткая форма первого заказа без длинной переписки.',
    color: 'rgba(212,175,55,0.8)',
  },
  {
    icon: Clock3,
    title: 'Заполните 3 ключевых поля',
    description: 'Нужны предмет, тема и дедлайн. Файлы можно прикрепить сразу или позже.',
    color: 'rgba(147,197,253,0.8)',
  },
  {
    icon: MessageCircleMore,
    title: 'Получите расчёт и сопровождение',
    description: 'Менеджер быстро ответит в чате, уточнит детали и проведёт дальше.',
    color: 'rgba(251,191,36,0.8)',
  },
]

const checklist = ['Предмет', 'Тема работы', 'Дедлайн', 'Файлы при наличии']

const guarantees = [
  {
    icon: ShieldCheck,
    text: 'Безопасная сделка и фиксирование условий',
  },
  {
    icon: MessageCircleMore,
    text: 'Связь с менеджером внутри экосистемы Telegram',
  },
  {
    icon: CheckCircle,
    text: 'Можно начать без полного ТЗ и уточнить детали позже',
  },
]

export function EmptyStateOnboarding({
  onCreateOrder,
  primaryActionLabel = 'Создать первый заказ',
}: EmptyStateOnboardingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card-padding card-radius"
      style={{
        ...glassGoldStyle,
        marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, var(--bg-card) 60%, rgba(212,175,55,0.06) 100%)',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              marginBottom: 18,
              background: 'rgba(9, 9, 11, 0.55)',
              border: '1px solid rgba(212,175,55,0.18)',
              color: 'var(--gold-100)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} color="var(--gold-400)" strokeWidth={2} />
            Понятный старт
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 10,
              lineHeight: 1.1,
            }}
          >
            Как оформить первый заказ
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 16,
              maxWidth: 460,
            }}
          >
            Начните с кнопки <span style={{ color: 'var(--gold-100)', fontWeight: 700 }}>«{primaryActionLabel}»</span>.
            Дальше путь простой: короткая заявка, расчёт от менеджера и сопровождение до результата.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {checklist.map((item) => (
              <div
                key={item}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-main)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item}
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ marginBottom: 28 }}>
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + index * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: index < steps.length - 1 ? 24 : 0,
                position: 'relative',
              }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ delay: 0.55 + index * 0.1, duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    left: 23,
                    top: 48,
                    width: 2,
                    height: 'calc(100% + 24px)',
                    background: `linear-gradient(180deg, ${step.color} 0%, rgba(255,255,255,0.1) 100%)`,
                    opacity: 0.3,
                  }}
                />
              )}

              {/* Step Icon */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${step.color.replace('0.8', '0.2')}, ${step.color.replace('0.8', '0.05')})`,
                  border: `1.5px solid ${step.color.replace('0.8', '0.4')}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: `0 0 20px ${step.color.replace('0.8', '0.15')}`,
                }}
              >
                <step.icon size={22} color={step.color} strokeWidth={2} />
              </motion.div>

              {/* Step Content */}
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 6,
                }}>
                  Шаг {index + 1}. {step.title}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}>
                  {step.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gap: 10,
          marginBottom: 24,
        }}>
          {guarantees.map((item, index) => {
            const Icon = item.icon

            return (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72 + index * 0.08 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} color="var(--gold-400)" strokeWidth={2.1} />
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  {item.text}
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateOrder}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            background: 'rgba(212,175,55,0.12)',
            border: '1px solid rgba(212,175,55,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 10px 28px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              pointerEvents: 'none',
            }}
          />

          <Sparkles size={20} color="var(--gold-100)" strokeWidth={2.5} />
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--gold-100)',
            letterSpacing: '0.02em',
          }}>
            Перейти к первому заказу
          </span>
          <ArrowRight size={18} color="var(--gold-100)" strokeWidth={2.4} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            marginTop: 16,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          Дополнительно действует{' '}
          <span style={{
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
          }}>
            10% бонус на первый заказ
          </span>
          , если оформляете первый заказ в Салуне.
        </motion.div>
      </div>
    </motion.div>
  )
}
