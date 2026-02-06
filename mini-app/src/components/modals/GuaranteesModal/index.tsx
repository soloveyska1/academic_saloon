import { motion } from 'framer-motion'
import { Shield, RefreshCw, Lock, Clock } from 'lucide-react'
import { ModalWrapper } from '../shared'

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES_GRID = [
  {
    icon: Shield,
    title: 'Уникальность',
    desc: 'Проходим любой Антиплагиат',
    accent: '#D4AF37',
  },
  {
    icon: RefreshCw,
    title: '3 правки',
    desc: 'Включены в стоимость заказа',
    accent: '#22c55e',
  },
  {
    icon: Lock,
    title: 'Анонимно',
    desc: 'Строгая конфиденциальность',
    accent: '#3b82f6',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    desc: 'Бонус или скидка за задержку',
    accent: '#f59e0b',
  },
]

export function GuaranteesModal({ isOpen, onClose }: GuaranteesModalProps) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="guarantees-modal"
      title="Гарантии"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '8px 20px 40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              marginBottom: 16,
            }}
          >
            <Shield size={14} color="#D4AF37" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.05em' }}>
              ВЫСШИЙ СТАНДАРТ
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              fontWeight: 700,
              color: '#f2f2f2',
              marginBottom: 8,
            }}
          >
            Гарантии
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ fontSize: 13, color: '#a1a1aa', maxWidth: 280, margin: '0 auto' }}
          >
            Гарантируем строгий контроль качества на всех этапах
          </motion.p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {GUARANTEES_GRID.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <div
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 20,
                  padding: '20px 16px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '3px',
                    background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`,
                    opacity: 0.5,
                  }}
                />

                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: `${item.accent}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    boxShadow: `0 0 20px ${item.accent}10`,
                  }}
                >
                  <item.icon size={22} color={item.accent} strokeWidth={1.5} />
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f2f2', marginBottom: 6 }}>
                  {item.title}
                </div>

                <div style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.35 }}>{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            textAlign: 'center',
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(212,175,55,0.05)',
            border: '1px dashed rgba(212,175,55,0.2)',
            fontSize: 11,
            color: '#a1a1aa',
          }}
        >
          <span style={{ color: '#D4AF37', fontWeight: 600 }}>Официальный договор</span> оферты при
          оформлении каждого заказа
        </motion.div>
      </div>
    </ModalWrapper>
  )
}
