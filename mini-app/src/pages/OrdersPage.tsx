import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import styles from './OrdersPage.module.css'

interface Props {
  orders: Order[]
}

type Filter = 'all' | 'active' | 'completed'

export function OrdersPage({ orders }: Props) {
  const navigate = useNavigate()
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

  const handleOrderClick = (orderId: number) => {
    haptic('light')
    navigate(`/order/${orderId}`)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Мои заказы</h1>
        <span className={styles.count}>{orders.length}</span>
      </header>

      {/* Filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          Все
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
          onClick={() => handleFilterChange('active')}
        >
          Активные
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => handleFilterChange('completed')}
        >
          Завершённые
        </button>
      </div>

      {/* Orders list */}
      <div className={styles.ordersList}>
        {filteredOrders.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <p>Нет заказов</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className={styles.orderCard}
              onClick={() => handleOrderClick(order.id)}
            >
              <div className={styles.orderHeader}>
                <span className={styles.orderId}>#{order.id}</span>
                <span className={`${styles.orderStatus} ${styles[getStatusClass(order.status)]}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className={styles.orderBody}>
                <div className={styles.orderTitle}>{order.work_type_label}</div>
                <div className={styles.orderSubject}>{order.subject}</div>
              </div>

              <div className={styles.orderFooter}>
                {order.deadline && (
                  <span className={styles.orderDeadline}>📅 {order.deadline}</span>
                )}
                <span className={styles.orderPrice}>
                  {order.final_price.toLocaleString()} ₽
                </span>
              </div>

              {order.progress > 0 && order.progress < 100 && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${order.progress}%` }}
                  />
                  <span className={styles.progressText}>{order.progress}%</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Spacer for nav */}
      <div style={{ height: 100 }} />
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'На оценке',
    waiting_estimation: 'На оценке',
    waiting_payment: 'К оплате',
    verification_pending: 'Проверка оплаты',
    paid: 'В работе',
    paid_full: 'В работе',
    in_progress: 'В работе',
    review: 'На проверке',
    completed: 'Завершён',
    cancelled: 'Отменён',
    rejected: 'Отклонён',
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  if (['completed'].includes(status)) return 'statusSuccess'
  if (['cancelled', 'rejected'].includes(status)) return 'statusError'
  if (['paid', 'paid_full', 'in_progress'].includes(status)) return 'statusWork'
  if (['waiting_payment'].includes(status)) return 'statusPayment'
  return 'statusPending'
}
