import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileStack } from 'lucide-react'
import { Order } from '../types'
import { OrderCard } from '../components/OrderCard'
import { FilterChip } from '../components/FilterChip'
import { useTelegram } from '../hooks/useUserData'

// ═══════════════════════════════════════════════════════════════════════════
//  ORDERS PAGE — Premium Zero-Latency Touch Optimized
//  All interactive elements use direct DOM manipulation via usePremiumGesture
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  orders: Order[]
}

type Filter = 'all' | 'active' | 'completed'

const FILTERS = [
  { value: 'all' as Filter, label: 'Все' },
  { value: 'active' as Filter, label: 'Активные' },
  { value: 'completed' as Filter, label: 'Готовые' },
]

export function OrdersPage({ orders }: Props) {
  const { haptic } = useTelegram()
  const [filter, setFilter] = useState<Filter>('all')

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'active') {
      return !['completed', 'cancelled', 'rejected'].includes(order.status)
    }
    if (filter === 'completed') {
      return order.status === 'completed'
    }
    return true
  })

  const handleFilterChange = (newFilter: Filter) => {
    haptic('light')
    setFilter(newFilter)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      padding: 24,
      paddingBottom: 140,
    }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--glow-gold)',
          }}>
            <FileStack size={24} color="var(--gold-400)" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              fontWeight: 700,
              background: 'var(--gold-text-shine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}>
              Мои заказы
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {orders.length} {orders.length === 1 ? 'заказ' : orders.length < 5 ? 'заказа' : 'заказов'}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Filters — Premium touch-optimized */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          padding: 6,
          background: 'var(--bg-card)',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            isActive={filter === f.value}
            onClick={() => handleFilterChange(f.value)}
          />
        ))}
      </motion.div>

      {/* Orders List — Premium touch-optimized cards */}
      <div className="orders-list-container">
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border-default)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 20px',
              borderRadius: 20,
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileStack size={36} color="var(--gold-400)" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
              Нет заказов
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {filter === 'active' ? 'Нет активных заказов' : filter === 'completed' ? 'Нет завершённых заказов' : 'Создайте первый заказ'}
            </p>
          </motion.div>
        ) : (
          filteredOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  )
}
