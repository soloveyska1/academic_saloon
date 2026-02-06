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
  },
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    desc: 'Уже включены в стоимость. Если нужно что-то доработать — исправим без доплат в течение 14 дней.',
    accent: '#22c55e',
  },
  {
    icon: Lock,
    title: 'Полная конфиденциальность',
    desc: 'Строгая анонимность. Ваши данные не передаются третьим лицам и не хранятся после выполнения.',
    accent: '#3b82f6',
  },
  {
    icon: Clock,
    title: 'Сдача точно в срок',
    desc: 'Гарантируем соблюдение дедлайна. В случае задержки по нашей вине — скидка на следующий заказ.',
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
      <div style={{ padding: '0 20px 20px' }}>

        {/* ── Header (unified pattern) ── */}
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #D4AF37 0%, #b8962e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px -4px rgba(212,175,55,0.35)',
            flexShrink: 0,
          }}>
            <Shield size={22} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f5', lineHeight: 1.2 }}>
              Наши гарантии
            </div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>
              Контроль качества на каждом этапе
            </div>
          </div>
        </m.div>

        {/* ── Guarantee cards (unified card pattern) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + index * 0.04 }}
              style={{
                padding: 16,
                borderRadius: 16,
                background: `${item.accent}0a`,
                border: `1px solid ${item.accent}1a`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${item.accent}15`,
                  border: `1px solid ${item.accent}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <item.icon size={20} color={item.accent} strokeWidth={1.5} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </div>

        {/* ── Bottom note ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Award size={20} color="#D4AF37" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
              Официальный договор
            </div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>
              Публичная оферта при оформлении каждого заказа
            </div>
          </div>
        </m.div>
      </div>
    </ModalWrapper>
  )
}
