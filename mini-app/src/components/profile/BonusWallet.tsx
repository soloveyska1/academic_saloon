import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Wallet2 } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
import { useThemeValue } from '../../contexts/ThemeContext'
import {
  formatExpiryHint,
  formatMoney,
  getTransactionPresentation,
  prefersReducedMotion,
  toSafeNumber,
} from './profileHelpers'
import type { Transaction, UserData } from '../../types'

interface Props {
  user: UserData
  onOpenTransactions: () => void
}

export const BonusWallet = memo(function BonusWallet({ user, onOpenTransactions }: Props) {
  const theme = useThemeValue()
  const isDark = theme === 'dark'
  const bonusBalance = toSafeNumber(user.balance)

  const latestTransactions = useMemo(
    () =>
      [...user.transactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3),
    [user.transactions],
  )

  const hasExpiry = user.bonus_expiry?.has_expiry && user.bonus_expiry.days_left !== undefined

  return (
    <motion.section
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.20, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20 }}
    >
      <div className={s.sectionTitle}>Бонусы</div>

      <div className={s.voidGlass} style={{ padding: 18, borderRadius: 24 }}>
        {/* Balance header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        }}>
          <div>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: isDark ? '#E8D5A3' : '#7d5c12',
              fontFamily: "'Manrope', sans-serif",
              marginBottom: 2,
            }}>
              {formatMoney(bonusBalance)}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Доступно для списания
            </div>
          </div>

          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: isDark ? 'rgba(212, 175, 55, 0.10)' : 'rgba(158, 122, 26, 0.08)',
            border: isDark ? '1px solid rgba(212, 175, 55, 0.16)' : '1px solid rgba(158, 122, 26, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Wallet2 size={20} color="var(--gold-300)" />
          </div>
        </div>

        {/* Expiry warning */}
        {hasExpiry && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            background: isDark ? 'rgba(251, 191, 36, 0.10)' : 'rgba(180, 130, 10, 0.08)',
            border: isDark ? '1px solid rgba(251, 191, 36, 0.18)' : '1px solid rgba(180, 130, 10, 0.16)',
            color: isDark ? '#fbbf24' : '#92600a',
            fontSize: 11.5,
            fontWeight: 700,
            marginBottom: 14,
          }}>
            <Clock3 size={12} />
            {formatExpiryHint(user.bonus_expiry!.days_left!)}
          </div>
        )}

        {/* Transaction header */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: isDark ? 'rgba(255,255,255,0.44)' : 'rgba(87,83,78,0.65)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          marginTop: hasExpiry ? 0 : 4,
        }}>
          Последние операции
        </div>

        {/* Transaction list */}
        {latestTransactions.length > 0 ? (
          <div style={{ marginBottom: 14 }}>
            {latestTransactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} onTap={onOpenTransactions} />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '14px 0',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}>
            История появится после первого бонуса, кэшбэка или списания.
          </div>
        )}

        {/* View all button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenTransactions}
          className={s.goldButton}
          style={{ width: '100%' }}
        >
          Вся история
        </motion.button>
      </div>
    </motion.section>
  )
})

/* ─── Transaction Row ─── */

const TransactionRow = memo(function TransactionRow({
  transaction,
  onTap,
}: {
  transaction: Transaction
  onTap: () => void
}) {
  const p = getTransactionPresentation(transaction)
  const Icon = p.icon
  const isCredit = transaction.type === 'credit'

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onTap}
      style={{
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div className={s.transactionRow}>
        <div
          className={s.transactionIcon}
          style={{
            background: p.iconBackground,
            border: `1px solid ${p.iconBorder}`,
          }}
        >
          <Icon size={16} color={p.iconColor} />
        </div>

        <div className={s.transactionInfo}>
          <div className={s.transactionTitle}>{p.title}</div>
          <div className={s.transactionSub}>{p.subtitle}</div>
        </div>

        <div className={s.transactionAmount} style={{ color: p.amountColor }}>
          {isCredit ? '+' : '-'}{formatMoney(transaction.amount).replace(' ₽', '')}
        </div>
      </div>
    </motion.button>
  )
})
