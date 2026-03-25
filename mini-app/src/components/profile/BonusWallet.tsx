import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Wallet2 } from 'lucide-react'
import s from '../../pages/ProfilePage.module.css'
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
      style={{ marginBottom: 24 }}
    >
      <div className={s.sectionTitle}>Бонусы</div>

      <div className={s.voidGlass} style={{ padding: 16, borderRadius: 12 }}>
        {/* Balance header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 12,
        }}>
          <div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--gold-200)',
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
            borderRadius: 12,
            background: 'var(--gold-glass-subtle)',
            border: '1px solid var(--border-gold)',
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
            gap: 8,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'var(--warning-glass)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning-text)',
            fontSize: 11.5,
            fontWeight: 700,
            marginBottom: 12,
          }}>
            <Clock3 size={12} />
            {formatExpiryHint(user.bonus_expiry!.days_left!)}
          </div>
        )}

        {/* Transaction header */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          marginTop: hasExpiry ? 0 : 4,
        }}>
          Последние операции
        </div>

        {/* Transaction list */}
        {latestTransactions.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
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
            История появится после первого бонуса, кешбэка или списания.
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
