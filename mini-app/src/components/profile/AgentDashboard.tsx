import { memo } from 'react'
import { motion } from 'framer-motion'
import { Users, UserCheck, ShoppingBag, Wallet, Percent, TrendingUp } from 'lucide-react'
import { AgentStats } from '../../types'

// ═══════════════════════════════════════════════════════════════════════════════
//  AGENT DASHBOARD - Statistics for referral agents
// ═══════════════════════════════════════════════════════════════════════════════

interface AgentDashboardProps {
  stats: AgentStats
  agentSince: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

interface StatCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string | number
  suffix?: string
  index: number
}

const StatCard = memo(function StatCard({ icon, iconColor, iconBg, label, value, suffix, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: 16,
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
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
          {value}
        </span>
        {suffix && (
          <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)' }}>
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  )
})

export const AgentDashboard = memo(function AgentDashboard({
  stats,
  agentSince,
}: AgentDashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(18, 18, 21, 0.95) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.2)',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: 3,
            background: 'linear-gradient(90deg, #A78BFA 0%, #C4B5FD 50%, #A78BFA 100%)',
            marginTop: -20,
            marginLeft: -20,
            marginRight: -20,
            marginBottom: 16,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            animate={{
              boxShadow: [
                '0 0 15px rgba(167, 139, 250, 0.2)',
                '0 0 25px rgba(167, 139, 250, 0.4)',
                '0 0 15px rgba(167, 139, 250, 0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={24} color="#1a1a1d" />
          </motion.div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Агент-партнёр
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
              С {formatDate(agentSince)}
            </div>
          </div>

          {/* Commission badge */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}
          >
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 2 }}>
              Комиссия
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
              {stats.commissionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Earnings highlight */}
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.15)',
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
          Всего заработано
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
          {formatCurrency(stats.earnedAmount)}
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        <StatCard
          icon={<Users size={18} />}
          iconColor="#A78BFA"
          iconBg="rgba(167, 139, 250, 0.15)"
          label="Приглашено"
          value={stats.invitedCount}
          suffix="чел."
          index={0}
        />
        <StatCard
          icon={<UserCheck size={18} />}
          iconColor="#22c55e"
          iconBg="rgba(34, 197, 94, 0.15)"
          label="Активных"
          value={stats.activeCount}
          suffix="чел."
          index={1}
        />
        <StatCard
          icon={<ShoppingBag size={18} />}
          iconColor="#3B82F6"
          iconBg="rgba(59, 130, 246, 0.15)"
          label="Заказов"
          value={stats.ordersCount}
          index={2}
        />
        <StatCard
          icon={<Percent size={18} />}
          iconColor="#D4AF37"
          iconBg="rgba(212, 175, 55, 0.15)"
          label="Конверсия"
          value={stats.invitedCount > 0 ? Math.round((stats.activeCount / stats.invitedCount) * 100) : 0}
          suffix="%"
          index={3}
        />
      </div>
    </motion.div>
  )
})
