import { m } from 'framer-motion'
import { Award, Clock, FileCheck, Lock, RefreshCw, Shield } from 'lucide-react'
import { ModalWrapper } from '../shared'

// ═══════════════════════════════════════════════════════════════════════════
//  GUARANTEES MODAL — Premium trust-building screen
//  Quiet Luxury style: warm gold monochrome, generous spacing,
//  static typography, no shimmer/animation noise.
//  Copy: confident, selling, but honest. No meta-language ("без обещаний").
// ═══════════════════════════════════════════════════════════════════════════

export interface GuaranteesModalProps {
  isOpen: boolean
  onClose: () => void
}

const GUARANTEES = [
  {
    icon: RefreshCw,
    title: 'Работаем до результата',
    desc: 'Преподаватель вернул с правками? Доработаем. И ещё раз — пока работу не примут.',
    featured: true,
  },
  {
    icon: FileCheck,
    title: 'Три правки бесплатно',
    desc: 'Три раунда доработок включены в стоимость. Нужно больше — договоримся без скрытых доплат.',
  },
  {
    icon: Award,
    title: 'Возврат 100% до старта',
    desc: 'Передумали до начала? Вернём всю сумму. Без вопросов, без задержек, без мелкого шрифта.',
  },
  {
    icon: Clock,
    title: 'Точно в срок',
    desc: 'Фиксируем дату — и держим слово. Никаких «завтра будет» и «ещё чуть-чуть».',
  },
  {
    icon: Lock,
    title: 'Полная конфиденциальность',
    desc: 'Ваши данные, переписка и детали заказа — строго между нами. Никаких третьих лиц.',
  },
] as const

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

        {/* ═══════════ HERO ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 32px' }}
        >
          {/* Shield icon — warm gold, ambient glow */}
          <m.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14, delay: 0.1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.04) 100%)',
              border: '1px solid rgba(212,175,55,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 24px 60px -12px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.05)',
            }}
          >
            <Shield size={34} color="rgba(212,175,55,0.7)" strokeWidth={1.4} />
          </m.div>

          {/* Title — static warm gold, Manrope */}
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 12,
              fontFamily: "'Manrope', sans-serif",
              color: '#E8D5A3',
            }}
          >
            Ваши гарантии
          </m.div>

          {/* Subtitle — confident, warm */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
              maxWidth: 260,
              margin: '0 auto',
            }}
          >
            Каждый пункт действует с момента оформления заказа
          </m.div>
        </m.div>

        {/* ═══════════ GOLD DIVIDER ═══════════ */}
        <div
          aria-hidden="true"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)',
            marginBottom: 24,
          }}
        />

        {/* ═══════════ GUARANTEE CARDS ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {GUARANTEES.map((item, index) => {
            const Icon = item.icon
            const isFeatured = 'featured' in item && item.featured

            return (
              <m.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.18 + index * 0.06,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  padding: '18px 18px',
                  borderRadius: 18,
                  background: isFeatured
                    ? 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.015) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  border: isFeatured
                    ? '1px solid rgba(212,175,55,0.10)'
                    : '1px solid rgba(255,255,255,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Featured card — subtle gold accent line on top */}
                {isFeatured && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 24,
                      right: 24,
                      height: 1,
                      background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Icon — warm gold, no glass overlay */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: isFeatured
                        ? 'rgba(212,175,55,0.08)'
                        : 'rgba(212,175,55,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={20}
                      color={isFeatured ? 'rgba(212,175,55,0.65)' : 'rgba(212,175,55,0.5)'}
                      strokeWidth={1.6}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.88)',
                        lineHeight: 1.25,
                        letterSpacing: '-0.01em',
                        marginBottom: 5,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.42)',
                        fontWeight: 500,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              </m.div>
            )
          })}
        </div>

        {/* ═══════════ BOTTOM TRUST ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 24,
            textAlign: 'center',
            padding: '20px 16px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
            border: '1px solid rgba(212,175,55,0.08)',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#E8D5A3',
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            Нас рекомендуют друзьям
          </div>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.38)',
              fontWeight: 500,
            }}
          >
            Каждый довольный клиент — лучшая реклама.
            <br />
            Мы работаем так, чтобы вы вернулись
          </div>
        </m.div>

      </div>
    </ModalWrapper>
  )
}
