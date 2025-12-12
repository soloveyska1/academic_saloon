import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  CLUB RULES SHEET - Bottom sheet with club terms
// ═══════════════════════════════════════════════════════════════════════════════

interface ClubRulesSheetProps {
  isOpen: boolean
  onClose: () => void
}

const rules = [
  {
    icon: <CheckCircle2 size={18} color="#22c55e" />,
    title: 'Начисление баллов',
    text: 'Баллы начисляются за ежедневный check-in, выполнение заданий и оформление заказов. Баллы не являются деньгами и не подлежат выводу.',
  },
  {
    icon: <Shield size={18} color="#D4AF37" />,
    title: 'Уровни членства',
    text: 'Уровень повышается за набор XP. XP начисляется за активность в клубе и оплаченные заказы. Чем выше уровень — тем больше привилегий.',
  },
  {
    icon: <Info size={18} color="#3B82F6" />,
    title: 'Награды и ваучеры',
    text: 'Награды обмениваются на баллы. Каждый ваучер имеет срок действия и условия применения. Скидочные ваучеры не суммируются между собой.',
  },
  {
    icon: <AlertTriangle size={18} color="#F59E0B" />,
    title: 'Ограничения скидок',
    text: 'Скидки могут иметь минимальный порог заказа, ограниченный срок действия и не применяются к срочным заказам. Максимальная скидка по ваучеру — 10%.',
  },
]

export const ClubRulesSheet = memo(function ClubRulesSheet({
  isOpen,
  onClose,
}: ClubRulesSheetProps) {
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
              zIndex: 1000,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '85vh',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              background: '#121215',
              zIndex: 1001,
              overflow: 'hidden',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                margin: '12px auto',
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 20px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(212, 175, 55, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={18} color="#D4AF37" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
                  Правила клуба
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="rgba(255, 255, 255, 0.6)" />
              </motion.button>
            </div>

            {/* Content */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                maxHeight: 'calc(85vh - 100px)',
              }}
            >
              {rules.map((rule, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {rule.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 6,
                      }}
                    >
                      {rule.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'rgba(255, 255, 255, 0.6)',
                        lineHeight: 1.5,
                      }}
                    >
                      {rule.text}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Footer note */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.5,
                  }}
                >
                  Условия клуба могут изменяться. Накопленные баллы и ваучеры сохраняются при изменении условий.
                </div>
              </div>

              {/* Safe area padding */}
              <div style={{ height: 40 }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
