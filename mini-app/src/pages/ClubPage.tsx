import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Receipt,
  Send,
  Users,
  Wallet2,
  Lock,
} from 'lucide-react'
import { UserData, Transaction } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { GoldSkeleton, Skeleton, SkeletonCard } from '../components/ui/Skeleton'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { useTelegram } from '../hooks/useUserData'
import { RANKS, getRankByCashback, getNextRank, isMaxRank, getRankIndexByCashback } from '../lib/ranks'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'
import { useThemeValue } from '../contexts/ThemeContext'
import homeStyles from './HomePage.module.css'

interface ClubPageProps {
  user: UserData | null
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function formatTransactionDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ─── Hero Card ──────────────────────────────────────────────────────────────

function HeroCard({ user, isDark }: { user: UserData; isDark: boolean }) {
  const cashback = user.rank.cashback || 0
  const balance = user.bonus_balance || 0
  const rank = getRankByCashback(cashback)
  const nextRank = getNextRank(cashback)
  const maxRank = isMaxRank(cashback)
  const progress = Math.min(100, Math.max(0, user.rank.progress || 0))

  return (
    <motion.section
      className={`${homeStyles.voidGlass} ${homeStyles.primaryActionCard} ${homeStyles.returningOrderActionCard}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        width: '100%',
        padding: '26px 22px 22px',
        borderRadius: 28,
        marginBottom: 22,
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(212,175,55,0.16)' : 'rgba(158,122,26,0.18)'}`,
        isolation: 'isolate',
        textAlign: 'left',
      }}
    >
      <div className={homeStyles.primaryActionGlow} aria-hidden="true" />
      <div className={homeStyles.primaryActionShine} aria-hidden="true" />
      <div className={homeStyles.primaryActionOrb} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 999,
            background: isDark ? 'rgba(9, 9, 11, 0.58)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,85,40,0.12)'}`,
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: isDark ? 'var(--gold-100)' : '#7d5c12',
            marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isDark ? '#d4af37' : '#9e7a1a',
              boxShadow: isDark ? '0 0 12px rgba(212,175,55,0.72)' : '0 0 12px rgba(158,122,26,0.5)',
              flexShrink: 0,
            }}
          />
          {rank?.displayName || 'Статус клиента'}
        </div>

        {/* Cashback % */}
        <div
          className={homeStyles.goldAccent}
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 'clamp(36px, 9vw, 48px)',
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          {cashback}%
        </div>
        <div
          style={{
            color: isDark ? 'rgba(228,213,163,0.7)' : 'rgba(125,92,18,0.7)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          кэшбэк с каждого заказа
        </div>

        {/* Stats row */}
        <div className={homeStyles.heroProofRail}>
          <div className={homeStyles.heroProofItem}>
            <Wallet2 size={15} color={isDark ? '#d4af37' : '#9e7a1a'} />
            На балансе: {formatMoney(balance)}
          </div>
          <div className={homeStyles.heroProofItem}>
            <BadgePercent size={15} color={isDark ? '#d4af37' : '#9e7a1a'} />
            Потрачено: {formatMoney(user.total_spent || 0)}
          </div>
        </div>

        {/* Progress bar */}
        {!maxRank && nextRank && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 600,
                color: isDark ? 'rgba(228,213,163,0.6)' : 'rgba(125,92,18,0.6)',
                marginBottom: 8,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              <span>До {nextRank.displayName}</span>
              <span>{formatMoney(user.rank.spent_to_next || 0)}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  borderRadius: 3,
                  background: isDark
                    ? 'linear-gradient(90deg, #D4AF37, #F5D061)'
                    : 'linear-gradient(90deg, #9e7a1a, #b8922d)',
                }}
              />
            </div>
          </div>
        )}

        {maxRank && (
          <div style={{ marginTop: 12, fontSize: 13, color: isDark ? 'rgba(212,175,55,0.7)' : 'rgba(158,122,26,0.7)', fontWeight: 600 }}>
            Максимальный ранг достигнут
          </div>
        )}
      </div>
    </motion.section>
  )
}

// ─── Referral Block ─────────────────────────────────────────────────────────

function ReferralBlock({ user, isDark }: { user: UserData; isDark: boolean }) {
  const { botUsername, haptic } = useTelegram()
  const [copied, setCopied] = useState(false)

  const inviteLink = useMemo(
    () => buildReferralLink(botUsername, user.telegram_id),
    [botUsername, user.telegram_id]
  )

  const shareText = useMemo(
    () => buildReferralShareText(user.referral_code || ''),
    [user.referral_code]
  )

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      haptic('error')
    }
  }, [inviteLink, haptic])

  const handleShare = useCallback(() => {
    if (!inviteLink) return
    haptic('light')
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      const encoded = encodeURIComponent(`${shareText}\n${inviteLink}`)
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encoded}`)
    }
  }, [inviteLink, shareText, haptic])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={homeStyles.voidGlass}
      style={{
        padding: '22px 20px',
        borderRadius: 24,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            background: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(158,122,26,0.10)',
            border: `1px solid ${isDark ? 'rgba(212,175,55,0.18)' : 'rgba(158,122,26,0.16)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={20} color={isDark ? '#d4af37' : '#9e7a1a'} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#E8D5A3' : '#7d5c12', fontFamily: "'Manrope', sans-serif" }}>
            Пригласи друга
          </div>
          <div style={{ fontSize: 13, color: isDark ? 'rgba(228,213,163,0.55)' : 'rgba(125,92,18,0.55)', marginTop: 2 }}>
            Вы оба получите бонус
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: '13px 16px',
            borderRadius: 16,
            background: copied
              ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(21,128,61,0.10)')
              : (isDark ? 'rgba(212,175,55,0.1)' : 'rgba(158,122,26,0.08)'),
            border: `1px solid ${copied
              ? (isDark ? 'rgba(34,197,94,0.25)' : 'rgba(21,128,61,0.20)')
              : (isDark ? 'rgba(212,175,55,0.18)' : 'rgba(158,122,26,0.16)')}`,
            color: copied ? (isDark ? '#22c55e' : '#15803d') : (isDark ? '#E8D5A3' : '#7d5c12'),
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Скопировано' : 'Скопировать'}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          style={{
            flex: 1,
            padding: '13px 16px',
            borderRadius: 16,
            background: isDark ? 'rgba(212,175,55,0.18)' : 'rgba(158,122,26,0.14)',
            border: `1px solid ${isDark ? 'rgba(212,175,55,0.28)' : 'rgba(158,122,26,0.22)'}`,
            color: isDark ? '#E8D5A3' : '#7d5c12',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Send size={16} />
          Поделиться
        </motion.button>
      </div>

      {/* Referral stats */}
      <div
        style={{
          display: 'flex',
          gap: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 14,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.08)'}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#E8D5A3' : '#7d5c12', fontFamily: "'Manrope', sans-serif" }}>
            {user.referrals_count || 0}
          </div>
          <div style={{ fontSize: 11, color: isDark ? 'rgba(228,213,163,0.45)' : 'rgba(125,92,18,0.45)', marginTop: 2 }}>
            приглашено
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 14,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.08)'}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#E8D5A3' : '#7d5c12', fontFamily: "'Manrope', sans-serif" }}>
            {formatMoney(user.referral_earnings || 0)}
          </div>
          <div style={{ fontSize: 11, color: isDark ? 'rgba(228,213,163,0.45)' : 'rgba(125,92,18,0.45)', marginTop: 2 }}>
            заработано
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ─── Transaction History ────────────────────────────────────────────────────

function TransactionHistory({ transactions, isDark }: { transactions: Transaction[]; isDark: boolean }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions]
  )
  const visible = expanded ? sorted : sorted.slice(0, 5)

  if (sorted.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={homeStyles.voidGlass}
        style={{
          padding: '28px 20px',
          borderRadius: 24,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
          marginBottom: 22,
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <Receipt size={40} color={isDark ? 'rgba(212,175,55,0.3)' : 'rgba(158,122,26,0.3)'} style={{ marginBottom: 14 }} />
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: isDark ? 'rgba(228,213,163,0.65)' : 'rgba(125,92,18,0.65)',
            marginBottom: 6,
          }}
        >
          Пока нет операций
        </div>
        <div
          style={{
            fontSize: 12,
            color: isDark ? 'rgba(228,213,163,0.35)' : 'rgba(125,92,18,0.35)',
            lineHeight: 1.5,
            maxWidth: 220,
            marginBottom: 18,
          }}
        >
          Совершите заказ — и здесь появится история бонусов
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/create-order')}
          style={{
            height: 40,
            padding: '0 22px',
            borderRadius: 14,
            border: 'none',
            background: isDark
              ? 'linear-gradient(135deg, #C9A227, #D4AF37)'
              : 'linear-gradient(135deg, #9e7a1a, #b8922d)',
            color: isDark ? '#090909' : '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Manrope', sans-serif",
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Создать заказ
        </motion.button>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={homeStyles.voidGlass}
      style={{
        padding: '18px 16px',
        borderRadius: 24,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: isDark ? '#E8D5A3' : '#7d5c12',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 14,
          padding: '0 4px',
        }}
      >
        История операций
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <AnimatePresence initial={false}>
          {visible.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 6px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.06)'}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: isDark ? 'rgba(228,213,163,0.85)' : 'rgba(28,25,23,0.85)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tx.description || tx.reason}
                </div>
                <div style={{ fontSize: 11, color: isDark ? 'rgba(228,213,163,0.35)' : 'rgba(120,113,108,0.55)', marginTop: 3 }}>
                  {formatTransactionDate(tx.created_at)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Manrope', sans-serif",
                  color: tx.type === 'credit' ? (isDark ? '#22c55e' : '#15803d') : '#ef4444',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                {tx.type === 'credit' ? '+' : '−'}{formatMoney(Math.abs(tx.amount))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sorted.length > 5 && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '12px 0 4px',
            background: 'none',
            border: 'none',
            color: isDark ? 'rgba(212,175,55,0.7)' : 'rgba(158,122,26,0.7)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          {expanded ? (
            <>Свернуть <ChevronUp size={14} /></>
          ) : (
            <>Показать все ({sorted.length}) <ChevronDown size={14} /></>
          )}
        </motion.button>
      )}
    </motion.section>
  )
}

// ─── How It Works ───────────────────────────────────────────────────────────

function HowItWorks({ userCashback, isDark }: { userCashback: number; isDark: boolean }) {
  const userRankIndex = getRankIndexByCashback(userCashback)

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{ marginBottom: 120 }}
    >
      <div className={homeStyles.sectionTitle}>КАК ЭТО РАБОТАЕТ</div>

      {/* 3 steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {[
          { num: '1', title: 'Заказывай', desc: 'Каждый оплаченный заказ приносит кэшбэк на бонусный баланс' },
          { num: '2', title: 'Получай кэшбэк', desc: 'Чем больше потрачено — тем выше ранг и процент кэшбэка' },
          { num: '3', title: 'Приглашай друзей', desc: 'Реферальная ссылка — бонус вам обоим при первом заказе друга' },
        ].map((step) => (
          <div
            key={step.num}
            className={homeStyles.voidGlass}
            style={{
              padding: '16px 18px',
              borderRadius: 20,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(158,122,26,0.08)',
                border: `1px solid ${isDark ? 'rgba(212,175,55,0.16)' : 'rgba(158,122,26,0.14)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 800,
                color: isDark ? '#d4af37' : '#9e7a1a',
                flexShrink: 0,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {step.num}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#E8D5A3' : '#7d5c12', marginBottom: 3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 12.5, color: isDark ? 'rgba(228,213,163,0.5)' : 'rgba(125,92,18,0.5)', lineHeight: 1.5 }}>
                {step.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ranks grid */}
      <div className={homeStyles.sectionTitle}>СИСТЕМА РАНГОВ</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RANKS.map((rank, idx) => {
          const isCurrent = idx === userRankIndex
          const isLocked = idx > userRankIndex
          const RankIcon = rank.icon

          return (
            <div
              key={rank.id}
              className={homeStyles.voidGlass}
              style={{
                padding: '16px 18px',
                borderRadius: 20,
                border: isCurrent
                  ? `1px solid ${isDark ? 'rgba(212,175,55,0.3)' : 'rgba(158,122,26,0.28)'}`
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: isCurrent
                    ? (isDark ? 'rgba(212,175,55,0.15)' : 'rgba(158,122,26,0.12)')
                    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(120,85,40,0.05)'),
                  border: isCurrent
                    ? `1px solid ${isDark ? 'rgba(212,175,55,0.25)' : 'rgba(158,122,26,0.22)'}`
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(120,85,40,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isLocked ? (
                  <Lock size={18} color={isDark ? 'rgba(228,213,163,0.3)' : 'rgba(120,113,108,0.4)'} />
                ) : (
                  <RankIcon size={18} color={isCurrent ? (isDark ? '#d4af37' : '#9e7a1a') : (isDark ? 'rgba(228,213,163,0.5)' : 'rgba(125,92,18,0.5)')} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isCurrent ? (isDark ? '#E8D5A3' : '#7d5c12') : (isDark ? 'rgba(228,213,163,0.65)' : 'rgba(125,92,18,0.65)'),
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    {rank.displayName}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: isDark ? '#d4af37' : '#9e7a1a',
                        background: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(158,122,26,0.10)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                      }}
                    >
                      Сейчас
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: isDark ? 'rgba(228,213,163,0.4)' : 'rgba(125,92,18,0.4)', marginTop: 3 }}>
                  {rank.minSpent > 0 ? `от ${formatMoney(rank.minSpent)} потрачено` : 'Начальный уровень'}
                </div>
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: isCurrent ? (isDark ? '#d4af37' : '#9e7a1a') : (isDark ? 'rgba(228,213,163,0.4)' : 'rgba(125,92,18,0.4)'),
                  fontFamily: "'Manrope', sans-serif",
                  flexShrink: 0,
                }}
              >
                {rank.cashback}%
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function ClubPage({ user }: ClubPageProps) {
  const handleBack = useSafeBackNavigation('/')
  const theme = useThemeValue()
  const isDark = theme === 'dark'

  if (!user) {
    return (
      <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
        <div style={{ padding: '24px 20px 120px' }}>
          {/* Hero skeleton */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <GoldSkeleton width={80} height={80} borderRadius={24} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <Skeleton width={200} height={24} borderRadius={8} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Skeleton width={140} height={16} borderRadius={6} />
            </div>
          </div>
          {/* Rank progress skeleton */}
          <div style={{ marginBottom: 16 }}>
            <SkeletonCard />
          </div>
          {/* Referral skeleton */}
          <div style={{ marginBottom: 16 }}>
            <SkeletonCard />
          </div>
          {/* Transactions skeleton */}
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div className="page-content">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleBack}
            aria-label="Назад"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(120,85,40,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,85,40,0.10)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="var(--text-main)" />
          </motion.button>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isDark ? 'rgba(212,175,55,0.72)' : 'rgba(158,122,26,0.72)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              Программа лояльности
            </div>
            <div
              className={homeStyles.goldAccent}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1.05,
              }}
            >
              Бонусы
            </div>
          </div>
        </motion.div>

        <HeroCard user={user} isDark={isDark} />
        <ReferralBlock user={user} isDark={isDark} />
        <TransactionHistory transactions={user.transactions || []} isDark={isDark} />
        <HowItWorks userCashback={user.rank.cashback || 0} isDark={isDark} />
      </div>
    </div>
  )
}

export default ClubPage
