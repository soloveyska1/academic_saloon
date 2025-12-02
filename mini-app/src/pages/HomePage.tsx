import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserData } from '../types'
import { useTelegram } from '../hooks/useUserData'
import { applyPromoCode } from '../api/userApi'
import styles from './HomePage.module.css'

interface Props {
  user: UserData | null
}

export function HomePage({ user }: Props) {
  const navigate = useNavigate()
  const { haptic, hapticSuccess, hapticError, openBot } = useTelegram()
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!user) return null

  const handlePromoSubmit = async () => {
    if (!promoCode.trim()) return

    haptic('medium')
    setPromoLoading(true)
    setPromoResult(null)

    try {
      const result = await applyPromoCode(promoCode)
      setPromoResult(result)
      if (result.success) {
        hapticSuccess()
        setPromoCode('')
      } else {
        hapticError()
      }
    } catch {
      hapticError()
      setPromoResult({ success: false, message: 'Ошибка сервера' })
    } finally {
      setPromoLoading(false)
    }
  }

  const handleNewOrder = () => {
    haptic('medium')
    openBot('new_order')
  }

  const handleChat = () => {
    haptic('light')
    openBot('support')
  }

  // Active orders
  const activeOrders = user.orders.filter(o =>
    !['completed', 'cancelled', 'rejected'].includes(o.status)
  )

  return (
    <div className={styles.container}>
      {/* Header with avatar and name */}
      <header className={styles.header}>
        <div className={styles.avatar}>
          <span className={styles.avatarEmoji}>{user.rank.emoji}</span>
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.name}>{user.fullname}</h1>
          <div className={styles.rank}>
            {user.rank.name} • {user.loyalty.status}
          </div>
        </div>
      </header>

      {/* Stats cards */}
      <section className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{user.balance.toLocaleString()} ₽</span>
          <span className={styles.statLabel}>Баланс</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{user.bonus_balance.toLocaleString()} ₽</span>
          <span className={styles.statLabel}>Бонусы</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{user.orders_count}</span>
          <span className={styles.statLabel}>Заказов</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{user.discount}%</span>
          <span className={styles.statLabel}>Скидка</span>
        </div>
      </section>

      {/* Rank progress */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ранг</h2>
        <div className={styles.rankCard}>
          <div className={styles.rankHeader}>
            <span className={styles.rankEmoji}>{user.rank.emoji}</span>
            <div className={styles.rankInfo}>
              <span className={styles.rankName}>{user.rank.name}</span>
              {user.rank.next_rank && (
                <span className={styles.rankNext}>→ {user.rank.next_rank}</span>
              )}
            </div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${user.rank.progress}%` }}
            />
          </div>
          {user.rank.next_rank && (
            <span className={styles.progressHint}>
              Ещё {user.rank.spent_to_next.toLocaleString()} ₽ до следующего ранга
            </span>
          )}
        </div>
      </section>

      {/* Active orders preview */}
      {activeOrders.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Активные заказы</h2>
            <button className={styles.seeAll} onClick={() => navigate('/orders')}>
              Все →
            </button>
          </div>
          <div className={styles.ordersList}>
            {activeOrders.slice(0, 2).map((order) => (
              <div
                key={order.id}
                className={styles.orderCard}
                onClick={() => navigate(`/order/${order.id}`)}
              >
                <div className={styles.orderHeader}>
                  <span className={styles.orderId}>#{order.id}</span>
                  <span className={styles.orderStatus}>
                    {getStatusBadge(order.status)}
                  </span>
                </div>
                <div className={styles.orderTitle}>{order.work_type_label}</div>
                <div className={styles.orderSubject}>{order.subject}</div>
                {order.progress > 0 && order.progress < 100 && (
                  <div className={styles.orderProgress}>
                    <div
                      className={styles.orderProgressFill}
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Promo code */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Промокод</h2>
        <div className={styles.promoCard}>
          <input
            type="text"
            className={styles.promoInput}
            placeholder="Введите код"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            maxLength={20}
          />
          <button
            className={styles.promoButton}
            onClick={handlePromoSubmit}
            disabled={promoLoading || !promoCode.trim()}
          >
            {promoLoading ? '...' : 'OK'}
          </button>
        </div>
        {promoResult && (
          <div className={`${styles.promoResult} ${promoResult.success ? styles.success : styles.error}`}>
            {promoResult.message}
          </div>
        )}
      </section>

      {/* Action buttons */}
      <section className={styles.actions}>
        <button className={styles.actionPrimary} onClick={handleNewOrder}>
          🤠 Новый заказ
        </button>
        <button className={styles.actionSecondary} onClick={handleChat}>
          💬 Написать
        </button>
      </section>

      {/* Referral */}
      <section className={styles.referral}>
        <div className={styles.referralLabel}>Твой реферальный код</div>
        <div className={styles.referralCode}>{user.referral_code}</div>
        <div className={styles.referralHint}>5% от заказов друзей — тебе на бонусы</div>
      </section>

      {/* Spacer for nav */}
      <div style={{ height: 100 }} />
    </div>
  )
}

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    pending: '⏳ Оценка',
    waiting_estimation: '⏳ Оценка',
    waiting_payment: '💳 К оплате',
    verification_pending: '🔍 Проверка',
    paid: '⚙️ В работе',
    paid_full: '⚙️ В работе',
    in_progress: '⚙️ В работе',
    review: '📋 Проверка',
    completed: '✅ Готово',
    cancelled: '✗ Отменён',
    rejected: '✗ Отклонён',
  }
  return badges[status] || status
}
