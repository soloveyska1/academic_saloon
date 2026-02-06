import { m } from 'framer-motion'
import { RefreshCw, Lock, Clock, FileCheck, Award } from 'lucide-react'
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

        {/* ── Section label (Cinzel serif) ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.03 }}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 12,
            fontWeight: 600,
            color: '#52525b',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          Гарантии
          <div style={{
            flex: 1, height: 1,
            background: 'linear-gradient(90deg, rgba(82,82,91,0.3), transparent)',
          }} />
        </m.div>

        {/* ── Subtitle ── */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06 }}
          style={{ fontSize: 13, color: '#71717a', marginBottom: 20 }}
        >
          Контроль качества на каждом этапе выполнения
        </m.div>

        {/* ── Guarantee cards (voidGlass) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.04 }}
              style={{
                padding: 16,
                borderRadius: 16,
                background: 'rgba(9,9,11,0.6)',
                backdropFilter: 'blur(12px) saturate(150%)',
                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                border: '1px solid rgba(255,255,255,0.04)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top highlight */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  flexShrink: 0,
                  width: 42, height: 42, borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.15))',
                }}>
                  <item.icon size={20} color="#d4af37" strokeWidth={1.5} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f2', marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
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
