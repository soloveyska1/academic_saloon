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
import { useThemeValue } from '../../../contexts/ThemeContext'

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

function getTransactionVisual(transaction: Transaction, isDark: boolean) {
  if (transaction.type === 'debit') {
    return {
      icon: CreditCard,
      iconColor: isDark ? '#f59e0b' : '#b45309',
      iconBackground: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.10)',
      iconBorder: isDark ? 'rgba(245, 158, 11, 0.24)' : 'rgba(245, 158, 11, 0.18)',
      amountColor: isDark ? '#fbbf24' : '#b45309',
      directionLabel: 'Списание',
    }
  }

  const visuals: Record<string, { icon: typeof Gift; color: string; darkColor: string; background: string; darkBackground: string; border: string; darkBorder: string }> = {
    order_cashback: {
      icon: Wallet2,
      darkColor: '#93c5fd',
      color: '#1d4ed8',
      darkBackground: 'rgba(147, 197, 253, 0.12)',
      background: 'rgba(29, 78, 216, 0.08)',
      darkBorder: 'rgba(147, 197, 253, 0.22)',
      border: 'rgba(29, 78, 216, 0.15)',
    },
    referral_bonus: {
      icon: Users,
      darkColor: '#c4b5fd',
      color: '#6d28d9',
      darkBackground: 'rgba(196, 181, 253, 0.12)',
      background: 'rgba(109, 40, 217, 0.08)',
      darkBorder: 'rgba(196, 181, 253, 0.22)',
      border: 'rgba(109, 40, 217, 0.15)',
    },
    compensation: {
      icon: Sparkles,
      darkColor: '#f9a8d4',
      color: '#be185d',
      darkBackground: 'rgba(249, 168, 212, 0.12)',
      background: 'rgba(190, 24, 93, 0.08)',
      darkBorder: 'rgba(249, 168, 212, 0.22)',
      border: 'rgba(190, 24, 93, 0.15)',
    },
    promo_code: {
      icon: Tag,
      darkColor: '#86efac',
      color: '#15803d',
      darkBackground: 'rgba(134, 239, 172, 0.12)',
      background: 'rgba(21, 128, 61, 0.08)',
      darkBorder: 'rgba(134, 239, 172, 0.22)',
      border: 'rgba(21, 128, 61, 0.15)',
    },
  }

  const v = visuals[transaction.reason]
  const fallback = {
    icon: ArrowUpRight as typeof Gift,
    darkColor: '#86efac',
    color: '#15803d',
    darkBackground: 'rgba(134, 239, 172, 0.12)',
    background: 'rgba(21, 128, 61, 0.08)',
    darkBorder: 'rgba(134, 239, 172, 0.22)',
    border: 'rgba(21, 128, 61, 0.15)',
  }

  const visual = v || fallback

  return {
    icon: visual.icon,
    iconColor: isDark ? visual.darkColor : visual.color,
    iconBackground: isDark ? visual.darkBackground : visual.background,
    iconBorder: isDark ? visual.darkBorder : visual.border,
    amountColor: isDark ? visual.darkColor : visual.color,
    directionLabel: 'Начисление',
  }
}

function TransactionCard({
  transaction,
  selected,
  onClick,
  isDark,
}: {
  transaction: Transaction
  selected: boolean
  onClick: () => void
  isDark: boolean
}) {
  const visual = getTransactionVisual(transaction, isDark)
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
        borderRadius: 18,
        border: `1px solid ${
          selected
            ? isDark ? 'rgba(212,175,55,0.22)' : 'rgba(158,122,26,0.18)'
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'
        }`,
        background: selected
          ? isDark
            ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(255,255,255,0.03))'
            : 'linear-gradient(135deg, rgba(158,122,26,0.06), rgba(255,255,255,0.92))'
          : isDark
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(255,255,255,0.88)',
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
          borderRadius: 16,
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
          color: isDark ? '#fff' : 'rgba(28,25,23,0.92)',
          marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {REASON_HINTS[transaction.reason] || visual.directionLabel} • {formatDateTime(transaction.created_at)}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: visual.amountColor, marginBottom: 4 }}>
          {transaction.type === 'debit' ? '-' : '+'}{formatMoney(transaction.amount)}
        </div>
        <ChevronRight
          size={16}
          color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(120,113,108,0.5)'}
          style={{ marginLeft: 'auto' }}
        />
      </div>
    </m.button>
  )
}

export function TransactionsModal({ isOpen, onClose, transactions, balance, onViewAll }: TransactionsModalProps) {
  const theme = useThemeValue()
  const isDark = theme === 'dark'

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
  const selectedVisual = selectedTransaction ? getTransactionVisual(selectedTransaction, isDark) : null

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="transactions-modal"
      title="История начислений и списаний"
      accentColor={isDark ? '#D4AF37' : '#9e7a1a'}
    >
      <div style={{ padding: '0 20px 20px' }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ paddingTop: 4, marginBottom: 18 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(158,122,26,0.07)',
              border: isDark ? '1px solid rgba(212,175,55,0.16)' : '1px solid rgba(158,122,26,0.14)',
              color: isDark ? '#d4af37' : '#9e7a1a',
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
            color: isDark ? '#fff' : 'rgba(28,25,23,0.92)',
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
            padding: 18,
            borderRadius: 22,
            background: isDark
              ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,255,255,0.03))'
              : 'linear-gradient(135deg, rgba(158,122,26,0.07), rgba(255,255,255,0.92))',
            border: isDark
              ? '1px solid rgba(212,175,55,0.18)'
              : '1px solid rgba(158,122,26,0.14)',
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: isDark ? 'rgba(212,175,55,0.72)' : 'rgba(158,122,26,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Доступно сейчас
          </div>
          <div style={{
            fontSize: 34,
            fontWeight: 800,
            color: isDark ? '#fff' : 'rgba(28,25,23,0.95)',
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
              borderRadius: 20,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.90)',
              border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(120,85,40,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
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
                  color: isDark ? '#fff' : 'rgba(28,25,23,0.92)',
                  marginBottom: 4,
                }}>
                  {selectedTransaction.description?.trim() || REASON_LABELS[selectedTransaction.reason] || 'Операция'}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {REASON_HINTS[selectedTransaction.reason] || selectedVisual.directionLabel}
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: selectedVisual.amountColor, flexShrink: 0 }}>
                {selectedTransaction.type === 'debit' ? '-' : '+'}{formatMoney(selectedTransaction.amount)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <div style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(120,85,40,0.06)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.44)' : 'rgba(120,113,108,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  Тип
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isDark ? '#fff' : 'rgba(28,25,23,0.90)',
                }}>
                  {selectedVisual.directionLabel}
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(120,85,40,0.06)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.44)' : 'rgba(120,113,108,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  Основание
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isDark ? '#fff' : 'rgba(28,25,23,0.90)',
                }}>
                  {REASON_LABELS[selectedTransaction.reason] || 'Операция'}
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(120,85,40,0.06)',
              }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: isDark ? 'rgba(255,255,255,0.44)' : 'rgba(120,113,108,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  Время
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isDark ? '#fff' : 'rgba(28,25,23,0.90)',
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
              color: isDark ? 'rgba(255,255,255,0.46)' : 'rgba(120,113,108,0.65)',
              fontSize: 12.5,
            }}>
              <Clock3 size={14} />
              {formatDateTime(selectedTransaction.created_at)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {sortedTransactions.length > 0 ? (
            sortedTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                selected={transaction.id === selectedTransaction?.id}
                onClick={() => setSelectedTransactionId(transaction.id)}
                isDark={isDark}
              />
            ))
          ) : (
            <div
              style={{
                padding: '18px 16px',
                borderRadius: 18,
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.88)',
                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(120,85,40,0.08)',
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
            borderRadius: 16,
            border: isDark ? '1px solid rgba(212,175,55,0.18)' : '1px solid rgba(158,122,26,0.16)',
            background: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(158,122,26,0.08)',
            color: isDark ? '#d4af37' : '#9e7a1a',
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
