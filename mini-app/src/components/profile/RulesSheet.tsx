import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Percent, Gift, Crown, TrendingUp, Star, Check } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  RULES SHEET - Bottom sheet explaining how the loyalty program works
// ═══════════════════════════════════════════════════════════════════════════════

interface RulesSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface RuleItemProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  description: string
  index: number
}

const RuleItem = memo(function RuleItem({ icon, iconColor, iconBg, title, description, index }: RuleItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      style={{
        display: 'flex',
        gap: 14,
        padding: 16,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.03)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </motion.div>
  )
})

export const RulesSheet = memo(function RulesSheet({
  isOpen,
  onClose,
}: RulesSheetProps) {
  const rules = [
    {
      icon: <Percent size={20} />,
      iconColor: '#22c55e',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      title: 'Кэшбэк',
      description: 'Получайте процент от суммы каждого заказа обратно на баланс. Чем выше ваш уровень — тем больше кэшбэк.',
    },
    {
      icon: <Gift size={20} />,
      iconColor: '#D4AF37',
      iconBg: 'rgba(212, 175, 55, 0.15)',
      title: 'Бонусы',
      description: 'Бонусы начисляются за активность: заказы, приглашение друзей, участие в акциях. Используйте их для оплаты.',
    },
    {
      icon: <Crown size={20} />,
      iconColor: '#A78BFA',
      iconBg: 'rgba(167, 139, 250, 0.15)',
      title: 'Уровни членства',
      description: 'Повышайте уровень, набирая XP за заказы и активность. Каждый уровень даёт новые привилегии и скидки.',
    },
    {
      icon: <TrendingUp size={20} />,
      iconColor: '#3B82F6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      title: 'Реферальная программа',
      description: 'Приглашайте друзей по вашей ссылке. Вы получаете бонусы с каждого их заказа, а они — приветственную скидку.',
    },
    {
      icon: <Star size={20} />,
      iconColor: '#F472B6',
      iconBg: 'rgba(244, 114, 182, 0.15)',
      title: 'Клуб привилегий',
      description: 'Выполняйте ежедневные задания, собирайте баллы и обменивайте их на эксклюзивные награды в магазине.',
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#0f0f12',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              zIndex: 101,
              maxHeight: '85vh',
              overflow: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  Как это работает
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
                  Программа лояльности
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="rgba(255, 255, 255, 0.5)" />
              </motion.button>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              {/* Rules list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {rules.map((rule, idx) => (
                  <RuleItem key={idx} {...rule} index={idx} />
                ))}
              </div>

              {/* Key points */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37', marginBottom: 12 }}>
                  Важно знать
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Бонусы можно использовать для оплаты до 30% заказа',
                    'Кэшбэк зачисляется после завершения заказа',
                    'Уровень повышается автоматически при достижении порога XP',
                    'Баллы клуба не сгорают, пока вы активны',
                  ].map((point, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          background: 'rgba(212, 175, 55, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Check size={10} color="#D4AF37" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom padding */}
              <div style={{ height: 20 }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
