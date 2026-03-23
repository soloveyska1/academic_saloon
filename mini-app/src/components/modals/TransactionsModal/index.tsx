import { useEffect, useMemo, useState, useRef } from 'react'
import { m } from 'framer-motion'
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  CreditCard,
  Gift,
  Sparkles,
  Tag,
  Users,
  Wallet2,
} from 'lucide-react'
import { Transaction } from '../../../types'
import { ModalWrapper } from '../shared'

export interface TransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  balance: number
  onViewAll: () => void
}

const REASON_LABELS: Record<string, string> = {
  order_created: 'Бонус за заказ',
  referral_bonus: 'Реферальный бонус',
  admin_adjustment: 'Корректировка баланса',
  order_discount: 'Оплата заказа',
  compensation: 'Компенсация',
  order_cashback: 'Кэшбэк за заказ',
  bonus_expired: 'Сгорание бонусов',
  coupon: 'Активация купона',
  order_refund: 'Возврат средств',
  welcome_bonus: 'Приветственный бонус',
  achievement: 'Награда за достижение',
  promo_code: 'Применение промокода',
}

const REASON_HINTS: Record<string, string> = {
  order_created: 'Начисление',
  referral_bonus: 'Приглашение друга',
  admin_adjustment: 'Ручная корректировка',
  order_discount: 'Списание в оплату',
  compensation: 'Начисление',
  order_cashback: 'Начисление за оплаченный заказ',
  bonus_expired: 'Сгорание',
  coupon: 'Начисление',
  order_refund: 'Возврат',
  welcome_bonus: 'Стартовый бонус',
  achievement: 'Начисление',
  promo_code: 'Начисление',
}

function formatMoney(value: number): string {
  return `${Math.round(Math.abs(value)).toLocaleString('ru-RU')} ₽`
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTransactionVisual(transaction: Transaction) {
  if (transaction.type === 'debit') {
    return {
      icon: CreditCard,
      iconColor: 'var(--warning-text)',
      iconBackground: 'var(--warning-glass)',
      iconBorder: 'var(--warning-border)',
      amountColor: 'var(--warning-text)',
      directionLabel: 'Списание',
    }
  }

  const visuals: Record<string, { icon: typeof Gift; color: string; background: string; border: string }> = {
    order_cashback: {
      icon: Wallet2,
      color: 'var(--accent-blue)',
      background: 'var(--accent-blue-glass)',
      border: 'var(--accent-blue-border)',
    },
    referral_bonus: {
      icon: Users,
      color: 'var(--accent-purple)',
      background: 'var(--accent-purple-glass)',
      border: 'var(--accent-purple-border)',
    },
    compensation: {
      icon: Sparkles,
      color: 'var(--error-text)',
      background: 'var(--error-glass)',
      border: 'var(--error-border)',
    },
    promo_code: {
      icon: Tag,
      color: 'var(--accent-green)',
      background: 'var(--accent-green-glass)',
      border: 'var(--accent-green-border)',
    },
  }

  const v = visuals[transaction.reason]
  const fallback = {
    icon: ArrowUpRight as typeof Gift,
    color: 'var(--accent-green)',
    background: 'var(--accent-green-glass)',
    border: 'var(--accent-green-border)',
  }

  const visual = v || fallback

  return {
    icon: visual.icon,
    iconColor: visual.color,
    iconBackground: visual.background,
    iconBorder: visual.border,
    amountColor: visual.color,
    directionLabel: 'Начисление',
  }
}

function TransactionCard({
  transaction,
  selected,
  onClick,
}: {
  transaction: Transaction
  selected: boolean
  onClick: () => void
}) {
  const visual = getTransactionVisual(transaction)
  const Icon = visual.icon
  const title = transaction.description?.trim() || REASON_LABELS[transaction.reason] || 'Операция'

  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${
          selected
            ? 'var(--border-gold)'
            : 'var(--surface-hover)'
        }`,
        background: selected
          ? 'linear-gradient(135deg, var(--gold-glass-subtle), var(--bg-glass))'
          : 'var(--bg-glass)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: visual.iconBackground,
          border: `1px solid ${visual.iconBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={visual.iconColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {REASON_HINTS[transaction.reason] || visual.directionLabel} • {formatDateTime(transaction.created_at)}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: visual.amountColor, marginBottom: 4 }}>
          {transaction.type === 'debit' ? '-' : '+'}{formatMoney(transaction.amount)}
        </div>
        <ChevronRight
          size={16}
          color="var(--text-muted)"
          style={{ marginLeft: 'auto' }}
        />
      </div>
    </m.button>
  )
}

export function TransactionsModal({ isOpen, onClose, transactions, balance, onViewAll }: TransactionsModalProps) {
  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions]
  )

  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null)

  // Only reset selection when the modal opens, not on every transactions change
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setSelectedTransactionId(sortedTransactions[0]?.id ?? null)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, sortedTransactions])

  const selectedTransaction = sortedTransactions.find((transaction) => transaction.id === selectedTransactionId) || sortedTransactions[0] || null
  const selectedVisual = selectedTransaction ? getTransactionVisual(selectedTransaction) : null

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="transactions-modal"
      title="История начислений и списаний"
      accentColor="var(--gold-400)"
    >
      <div style={{ padding: '0 20px 20px' }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ paddingTop: 4, marginBottom: 16 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'var(--gold-glass-subtle)',
              border: '1px solid var(--gold-glass-medium)',
              color: 'var(--gold-400)',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            <Wallet2 size={12} />
            Баланс
          </div>

          <div style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            marginBottom: 8,
          }}>
            Все начисления и списания по бонусному балансу
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Откройте любую операцию, чтобы посмотреть детали: тип, дату, основание и сумму.
          </div>
        </m.div>

        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--gold-glass-subtle), var(--bg-glass))',
            border: '1px solid var(--gold-glass-medium)',
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gold-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Доступно сейчас
          </div>
          <div style={{
            fontSize: 34,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
            marginBottom: 8,
          }}>
            {Math.round(balance).toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            Этот баланс можно использовать при оплате заказов и в бонусных механиках сервиса.
          </div>
        </div>

        {selectedTransaction && selectedVisual && (
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              borderRadius: 12,
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: selectedVisual.iconBackground,
                  border: `1px solid ${selectedVisual.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <selectedVisual.icon size={20} color={selectedVisual.iconColor} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}>
                  {selectedTransaction.description?.trim() || REASON_LABELS[selectedTransaction.reason] || 'Операция'}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {REASON_HINTS[selectedTransaction.reason] || selectedVisual.directionLabel}
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: selectedVisual.amountColor, flexShrink: 0 }}>
                {selectedTransaction.type === 'debit' ? '-' : '+'}{formatMoney(selectedTransaction.amount)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  Тип
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  {selectedVisual.directionLabel}
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  Основание
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  {REASON_LABELS[selectedTransaction.reason] || 'Операция'}
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}>
                  Время
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  {new Date(selectedTransaction.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
              color: 'var(--text-muted)',
              fontSize: 12.5,
            }}>
              <Clock3 size={14} />
              {formatDateTime(selectedTransaction.created_at)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {sortedTransactions.length > 0 ? (
            sortedTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                selected={transaction.id === selectedTransaction?.id}
                onClick={() => setSelectedTransactionId(transaction.id)}
              />
            ))
          ) : (
            <div
              style={{
                padding: '18px 16px',
                borderRadius: 12,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              История пока пуста. После первой бонусной операции здесь появятся начисления и списания.
            </div>
          )}
        </div>

        <m.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onViewAll}
          style={{
            width: '100%',
            minHeight: 46,
            borderRadius: 12,
            border: '1px solid var(--gold-glass-medium)',
            background: 'var(--gold-glass-subtle)',
            color: 'var(--gold-400)',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Перейти в профиль
        </m.button>
      </div>
    </ModalWrapper>
  )
}
