import { m } from 'framer-motion'
import { Shield, RefreshCw, Lock, Clock, FileCheck, Award } from 'lucide-react'
import { ModalWrapper } from '../shared'

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: FileCheck,
    title: 'Уникальность от 75%',
    desc: 'Все работы проходят внутреннюю проверку на оригинальность. Минимальный порог — 75%, как правило выше.',
    accent: '#D4AF37',
    accentBg: 'rgba(212,175,55,0.08)',
    accentBorder: 'rgba(212,175,55,0.15)',
  },
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    desc: 'Уже включены в стоимость. Если нужно что-то доработать — исправим без доплат в течение 14 дней.',
    accent: '#22c55e',
    accentBg: 'rgba(34,197,94,0.08)',
    accentBorder: 'rgba(34,197,94,0.15)',
  },
  {
    icon: Lock,
    title: 'Полная конфиденциальность',
    desc: 'Строгая анонимность. Ваши данные не передаются третьим лицам и не хранятся после выполнения.',
    accent: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.08)',
    accentBorder: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Clock,
    title: 'Сдача точно в срок',
    desc: 'Гарантируем соблюдение дедлайна. В случае задержки по нашей вине — скидка на следующий заказ.',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.08)',
    accentBorder: 'rgba(245,158,11,0.15)',
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
      <div style={{ padding: '0 20px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
              border: '1px solid rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px -8px rgba(212,175,55,0.25)',
            }}
          >
            <Shield size={26} color="#D4AF37" strokeWidth={1.5} />
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f2', marginBottom: 6 }}
          >
            Наши гарантии
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 13, color: '#71717a', maxWidth: 280, margin: '0 auto' }}
          >
            Контроль качества на каждом этапе выполнения заказа
          </m.div>
        </div>

        {/* Guarantee cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              style={{
                padding: '16px',
                borderRadius: 16,
                background: item.accentBg,
                border: `1px solid ${item.accentBorder}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${item.accent}15`,
                    border: `1px solid ${item.accent}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon size={20} color={item.accent} strokeWidth={1.5} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', marginBottom: 5 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
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
            padding: '16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))',
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(212,175,55,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Award size={18} color="#D4AF37" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#D4AF37', marginBottom: 2 }}>
              Официальный договор
            </div>
            <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.4 }}>
              Публичная оферта при оформлении каждого заказа
            </div>
          </div>
        </m.div>
      </div>
    </ModalWrapper>
  )
}
