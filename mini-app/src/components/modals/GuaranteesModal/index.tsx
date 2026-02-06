import { m } from 'framer-motion'
import { Shield, RefreshCw, Lock, Clock, CheckCircle } from 'lucide-react'
import { ModalWrapper } from '../shared'

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: Shield,
    title: 'Уникальность',
    desc: 'Каждая работа проходит проверку на Антиплагиат. Гарантируем уникальность от 70% и выше.',
    accent: '#D4AF37',
  },
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    desc: 'Включены в стоимость. Если что-то нужно доработать — исправим без доплат.',
    accent: '#22c55e',
  },
  {
    icon: Lock,
    title: 'Конфиденциальность',
    desc: 'Строгая анонимность. Ваши данные никогда не передаются третьим лицам.',
    accent: '#3b82f6',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    desc: 'Сдаём работу вовремя. В случае задержки — скидка или бонус на следующий заказ.',
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
      <div style={{ padding: '4px 20px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Shield size={26} color="#D4AF37" strokeWidth={1.5} />
          </m.div>

          <m.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#f2f2f2',
              marginBottom: 6,
            }}
          >
            Наши гарантии
          </m.h2>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 13, color: '#71717a', maxWidth: 260, margin: '0 auto' }}
          >
            Строгий контроль качества на каждом этапе
          </m.p>
        </div>

        {/* Guarantee cards — vertical list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: `${item.accent}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={20} color={item.accent} strokeWidth={1.5} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>

              <CheckCircle size={16} color={item.accent} style={{ flexShrink: 0, marginTop: 2, opacity: 0.6 }} />
            </m.div>
          ))}
        </div>

        {/* Bottom note */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 20,
            textAlign: 'center',
            padding: '14px',
            borderRadius: 14,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.12)',
            fontSize: 12,
            color: '#71717a',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: '#D4AF37', fontWeight: 600 }}>Официальный договор</span> оферты
          при оформлении каждого заказа
        </m.div>
      </div>
    </ModalWrapper>
  )
}
