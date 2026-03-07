import { m } from 'framer-motion'
import { Award, Clock, FileCheck, Lock, RefreshCw } from 'lucide-react'
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
  },
  {
    icon: RefreshCw,
    title: '3 бесплатные правки',
    desc: 'Уже включены в стоимость. Если нужно что-то доработать — исправим без доплат в течение 14 дней.',
  },
  {
    icon: Lock,
    title: 'Полная конфиденциальность',
    desc: 'Строгая анонимность. Ваши данные не передаются третьим лицам и не хранятся после выполнения.',
  },
  {
    icon: Clock,
    title: 'Сдача точно в срок',
    desc: 'Гарантируем соблюдение дедлайна. В случае задержки по нашей вине — скидка на следующий заказ.',
  },
  {
    icon: Award,
    title: 'Официальный договор',
    desc: 'Публичная оферта при оформлении каждого заказа. Ваши права защищены юридически.',
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
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ paddingTop: 4, marginBottom: 18 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.16)',
              color: '#d4af37',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            <Award size={12} />
            Гарантии
          </div>

          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
            Чёткие условия на каждом этапе заказа
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Ниже все ключевые гарантии сервиса без маркетингового шума. Тексты сохранены в исходной формулировке.
          </div>
        </m.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.04 }}
              style={{
                padding: 16,
                borderRadius: 18,
                background: `
                  radial-gradient(circle at top right, rgba(212,175,55,0.08), transparent 34%),
                  linear-gradient(180deg, rgba(18,18,21,0.96), rgba(11,11,16,0.96))
                `,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 18px 34px -30px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    background: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={20} color="#d4af37" />
                </div>

                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </ModalWrapper>
  )
}
