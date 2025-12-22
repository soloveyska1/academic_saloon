import { motion } from 'framer-motion'
import { FileText, UserCheck, Clock, CheckCircle, Sparkles } from 'lucide-react'
import { glassGoldStyle, CardInnerShine } from './shared'

interface EmptyStateOnboardingProps {
  onCreateOrder: () => void
}

const steps = [
  {
    icon: FileText,
    title: 'Создать задачу',
    description: 'Опишите ваш заказ',
    color: 'rgba(212,175,55,0.8)',
  },
  {
    icon: UserCheck,
    title: 'Менеджер назначен',
    description: 'Свяжемся с вами',
    color: 'rgba(147,197,253,0.8)',
  },
  {
    icon: Clock,
    title: 'Работа в процессе',
    description: 'Выполнение заказа',
    color: 'rgba(251,191,36,0.8)',
  },
  {
    icon: CheckCircle,
    title: 'Заказ завершён',
    description: 'Получите результат',
    color: 'rgba(34,197,94,0.8)',
  },
]

export function EmptyStateOnboarding({ onCreateOrder }: EmptyStateOnboardingProps) {
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
      <CardInnerShine />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Welcome Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))',
              border: '2px solid var(--border-gold)',
              marginBottom: 20,
              boxShadow: '0 0 40px rgba(212,175,55,0.2)',
            }}
          >
            <Sparkles size={36} color="var(--gold-400)" strokeWidth={1.5} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 8,
            }}
          >
            Добро пожаловать!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            Начните свой путь с первого заказа
          </motion.p>
        </div>

        {/* Progress Steps */}
        <div style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
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
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
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
                  marginBottom: 4,
                }}>
                  {index + 1}. {step.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}>
                  {step.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateOrder}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            background: 'var(--gold-metallic)',
            border: '2px solid var(--border-gold)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 8px 32px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Button shine effect */}
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

          <Sparkles size={20} color="#09090b" strokeWidth={2.5} />
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#09090b',
            letterSpacing: '0.02em',
          }}>
            Создать первый заказ
          </span>
        </motion.button>

        {/* Bottom hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          Получите{' '}
          <span style={{
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
          }}>
            10% кэшбэк
          </span>
          {' '}на первый заказ
        </motion.div>
      </div>
    </motion.div>
  )
}
