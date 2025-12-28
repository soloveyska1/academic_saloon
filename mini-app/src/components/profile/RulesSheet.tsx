import { memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Percent, Gift, Crown, TrendingUp, Star, Check } from 'lucide-react'
import { useScrollLock, useSheetRegistration, useSwipeToClose } from '../ui/GestureGuard'
import { useModalRegistration } from '../../contexts/NavigationContext'

// ═══════════════════════════════════════════════════════════════════════════════
//  RULES SHEET - Bottom sheet explaining how the loyalty program works
//  v2: Native touch gestures for smooth iOS scrolling
// ═══════════════════════════════════════════════════════════════════════════════

// Unified configuration
const SHEET_CONFIG = {
  offsetThreshold: 120,
  velocityThreshold: 0.4,
  spring: { damping: 32, stiffness: 380 },
} as const

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style)
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'light' ? 10 : 20)
    }
  } catch (e) {}
}

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
  // GestureGuard integration
  useScrollLock(isOpen)
  useSheetRegistration(isOpen)
  useModalRegistration(isOpen, 'rules-sheet')

  // Native touch gesture for drag-to-close
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragOffset,
    isDragging,
  } = useSwipeToClose({
    onClose,
    offsetThreshold: SHEET_CONFIG.offsetThreshold,
    velocityThreshold: SHEET_CONFIG.velocityThreshold,
  })

  const handleClose = useCallback(() => {
    triggerHaptic('light')
    onClose()
  }, [onClose])

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
            key="rules-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 2000,
              touchAction: 'none',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="rules-sheet"
            initial={{ y: '100%' }}
            animate={{
              y: dragOffset,
              opacity: dragOffset > 100 ? 1 - (dragOffset - 100) / 200 : 1,
            }}
            exit={{ y: '100%' }}
            transition={isDragging ? { duration: 0 } : {
              type: 'spring',
              ...SHEET_CONFIG.spring
            }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#0f0f12',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              zIndex: 2001,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
              borderTop: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            {/* Drag Handle */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                padding: '12px 0',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: isDragging ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
                }}
              />
            </div>

            {/* Header */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'grab',
                touchAction: 'none',
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
                onClick={handleClose}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
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

            {/* Content - Scrollable (native scroll) */}
            <div
              data-scroll-container="true"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                padding: 20,
                paddingBottom: 'max(40px, calc(20px + env(safe-area-inset-bottom)))',
              }}
            >
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
