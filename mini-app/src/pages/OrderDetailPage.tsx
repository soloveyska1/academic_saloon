import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Order } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { fetchOrderDetail } from '../api/userApi'
import styles from './OrderDetailPage.module.css'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic, openBot } = useTelegram()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrder() {
      if (!id) return
      try {
        const data = await fetchOrderDetail(parseInt(id))
        setOrder(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id])

  const handleBack = () => {
    haptic('light')
    navigate('/orders')
  }

  const handleChat = () => {
    haptic('medium')
    openBot(`chat_order_${order?.id}`)
  }

  const handlePay = () => {
    haptic('medium')
    openBot(`pay_order_${order?.id}`)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>Загрузка...</span>
      </div>
    )
  }

  if (!order) {
    return (
      <div className={styles.error}>
        <span>Заказ не найден</span>
        <button onClick={handleBack}>Назад</button>
      </div>
    )
  }

  const isPaid = order.paid_amount >= order.final_price
  const isActive = !['completed', 'cancelled', 'rejected'].includes(order.status)
  const needsPayment = ['waiting_payment', 'verification_pending'].includes(order.status)

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>
          ← Назад
        </button>
        <span className={styles.orderId}>Заказ #{order.id}</span>
      </header>

      {/* Status banner */}
      <div className={`${styles.statusBanner} ${styles[getStatusClass(order.status)]}`}>
        <span className={styles.statusIcon}>{getStatusIcon(order.status)}</span>
        <div className={styles.statusInfo}>
          <span className={styles.statusLabel}>{getStatusLabel(order.status)}</span>
          {order.progress > 0 && order.progress < 100 && (
            <span className={styles.statusProgress}>{order.progress}% выполнено</span>
          )}
        </div>
      </div>

      {/* Progress bar for active orders */}
      {isActive && order.progress > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${order.progress}%` }}
            />
          </div>
          <div className={styles.progressSteps}>
            <span className={order.progress >= 25 ? styles.stepDone : ''}>Старт</span>
            <span className={order.progress >= 50 ? styles.stepDone : ''}>Работа</span>
            <span className={order.progress >= 75 ? styles.stepDone : ''}>Финал</span>
            <span className={order.progress >= 100 ? styles.stepDone : ''}>Готово</span>
          </div>
        </div>
      )}

      {/* Order details */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Детали</h2>
        <div className={styles.detailsCard}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Тип работы</span>
            <span className={styles.detailValue}>{order.work_type_label}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Предмет</span>
            <span className={styles.detailValue}>{order.subject}</span>
          </div>
          {order.deadline && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Дедлайн</span>
              <span className={styles.detailValue}>{order.deadline}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Создан</span>
            <span className={styles.detailValue}>
              {new Date(order.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
      </section>

      {/* Payment details */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Оплата</h2>
        <div className={styles.paymentCard}>
          <div className={styles.paymentRow}>
            <span>Стоимость</span>
            <span>{order.price.toLocaleString()} ₽</span>
          </div>
          {order.discount > 0 && (
            <div className={`${styles.paymentRow} ${styles.discount}`}>
              <span>Скидка {order.discount}%</span>
              <span>−{Math.round(order.price * order.discount / 100).toLocaleString()} ₽</span>
            </div>
          )}
          {order.bonus_used > 0 && (
            <div className={`${styles.paymentRow} ${styles.discount}`}>
              <span>Бонусы</span>
              <span>−{order.bonus_used.toLocaleString()} ₽</span>
            </div>
          )}
          <div className={styles.paymentDivider} />
          <div className={styles.paymentRow}>
            <span className={styles.totalLabel}>Итого</span>
            <span className={styles.totalValue}>{order.final_price.toLocaleString()} ₽</span>
          </div>
          {order.paid_amount > 0 && (
            <div className={`${styles.paymentRow} ${styles.paid}`}>
              <span>Оплачено</span>
              <span>{order.paid_amount.toLocaleString()} ₽ ✓</span>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className={styles.actions}>
        {needsPayment && !isPaid && (
          <button className={styles.actionPrimary} onClick={handlePay}>
            💳 Оплатить
          </button>
        )}
        {isActive && (
          <button className={styles.actionSecondary} onClick={handleChat}>
            💬 Написать по заказу
          </button>
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
    waiting_payment: 'Ожидает оплаты',
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

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '⏳',
    waiting_estimation: '⏳',
    waiting_payment: '💳',
    verification_pending: '🔍',
    paid: '⚙️',
    paid_full: '⚙️',
    in_progress: '⚙️',
    review: '📋',
    completed: '✅',
    cancelled: '✗',
    rejected: '✗',
  }
  return icons[status] || '📋'
}

function getStatusClass(status: string): string {
  if (['completed'].includes(status)) return 'statusSuccess'
  if (['cancelled', 'rejected'].includes(status)) return 'statusError'
  if (['paid', 'paid_full', 'in_progress'].includes(status)) return 'statusWork'
  if (['waiting_payment', 'verification_pending'].includes(status)) return 'statusPayment'
  return 'statusPending'
}
