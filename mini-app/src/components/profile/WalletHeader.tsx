import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ChevronDown, ChevronUp, Gift, Percent, Users } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════════
//  WALLET HEADER - Balance display with expandable breakdown
// ═══════════════════════════════════════════════════════════════════════════════

interface WalletBreakdown {
  bonuses: number
  cashback: number
  referralEarnings: number
}

interface WalletHeaderProps {
  balance: number
  bonusBalance: number
  breakdown: WalletBreakdown
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
}

export const WalletHeader = memo(function WalletHeader({
  balance,
  bonusBalance,
  breakdown,
}: WalletHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const totalBalance = balance + bonusBalance

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(18, 18, 21, 0.98) 50%)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
      }}
    >
      {/* Main balance section */}
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={16} color="#22c55e" />
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' }}>
                Ваш баланс
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
              {formatCurrency(totalBalance)}
            </div>
            {bonusBalance > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', marginTop: 4 }}>
                Бонусов: {formatCurrency(bonusBalance)}
              </div>
            )}
          </div>

          {/* Expand toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsExpanded(!isExpanded)}
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
            {isExpanded ? (
              <ChevronUp size={18} color="rgba(255, 255, 255, 0.5)" />
            ) : (
              <ChevronDown size={18} color="rgba(255, 255, 255, 0.5)" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Breakdown section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 20px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: 16,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginBottom: 12 }}>
                Откуда баланс
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Bonuses */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: 'rgba(212, 175, 55, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Gift size={14} color="#D4AF37" />
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                      Бонусы и акции
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#D4AF37' }}>
                    {formatCurrency(breakdown.bonuses)}
                  </span>
                </div>

                {/* Cashback */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: 'rgba(34, 197, 94, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Percent size={14} color="#22c55e" />
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                      Кэшбэк
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>
                    {formatCurrency(breakdown.cashback)}
                  </span>
                </div>

                {/* Referral */}
                {breakdown.referralEarnings > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: 'rgba(167, 139, 250, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Users size={14} color="#A78BFA" />
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                        Реферальные
                      </span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#A78BFA' }}>
                      {formatCurrency(breakdown.referralEarnings)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
