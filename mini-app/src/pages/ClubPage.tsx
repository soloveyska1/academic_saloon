import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  BadgePercent,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Flame,
  Gift,
  GraduationCap,
  Check,
  MessageCircle,
  Receipt,
  Send,
  Sparkles,
  Star,
  Tag,
  UserPlus,
  Users,
  Wallet2,
  Lock,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AchievementRarity, UserAchievement, UserData, Transaction } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { GoldSkeleton, Skeleton, SkeletonCard } from '../components/ui/Skeleton'
import { AchievementShareCard } from '../components/ui/AchievementShareCard'
import { useToast } from '../components/ui/Toast'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { useTelegram } from '../hooks/useUserData'
import { RANKS, getRankByCashback, getNextRank, isMaxRank, getRankIndexByCashback } from '../lib/ranks'
import { buildReferralLink, buildReferralShareText } from '../lib/appLinks'
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

function formatAchievementDate(isoDate?: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function pluralizeRu(value: number, one: string, few: string, many: string): string {
  const abs = Math.abs(value) % 100
  const rest = abs % 10
  if (abs > 10 && abs < 20) return many
  if (rest === 1) return one
  if (rest >= 2 && rest <= 4) return few
  return many
}

type AchievementFilter = 'all' | 'unlocked' | 'progress' | 'locked' | 'legendary'

const RARITY_WEIGHT: Record<AchievementRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
}

const RARITY_META: Record<AchievementRarity, {
  label: string
  tint: string
  border: string
  glow: string
  description: string
}> = {
  common: {
    label: 'Обычное',
    tint: 'rgba(212,175,55,0.55)',
    border: 'rgba(212,175,55,0.12)',
    glow: 'rgba(212,175,55,0.10)',
    description: 'Базовое достижение с быстрым входом в систему прогресса.',
  },
  rare: {
    label: 'Редкое',
    tint: 'rgba(212,175,55,0.72)',
    border: 'rgba(212,175,55,0.18)',
    glow: 'rgba(212,175,55,0.16)',
    description: 'Требует заметной активности и осмысленных действий.',
  },
  epic: {
    label: 'Эпическое',
    tint: 'rgba(255,236,170,0.82)',
    border: 'rgba(255,236,170,0.22)',
    glow: 'rgba(255,236,170,0.22)',
    description: 'Выдаётся за устойчивую привычку или серию сильных результатов.',
  },
  legendary: {
    label: 'Легендарное',
    tint: 'rgba(255,248,214,0.96)',
    border: 'rgba(255,248,214,0.28)',
    glow: 'rgba(255,248,214,0.26)',
    description: 'Редкий трофей для самых активных клиентов клуба.',
  },
}

const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  award: Award,
  crown: Crown,
  flame: Flame,
  users: Users,
  'user-plus': UserPlus,
  star: Star,
  zap: Zap,
  tag: Tag,
  'graduation-cap': GraduationCap,
  'check-circle': CheckCircle,
  'message-circle': MessageCircle,
}

const ACHIEVEMENT_EMOJI_MAP: Record<string, string> = {
  award: '🏆',
  crown: '👑',
  flame: '🔥',
  users: '👥',
  'user-plus': '🤝',
  star: '⭐',
  zap: '⚡',
  tag: '🏷️',
  'graduation-cap': '🎓',
  'check-circle': '✅',
  'message-circle': '💬',
}

const ACHIEVEMENT_FILTERS: Array<{ key: AchievementFilter; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'unlocked', label: 'Открытые' },
  { key: 'progress', label: 'В процессе' },
  { key: 'locked', label: 'Закрытые' },
  { key: 'legendary', label: 'Легенды' },
]

function sortAchievements(items: UserAchievement[]): UserAchievement[] {
  return [...items].sort((a, b) => {
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1
    }

    if (a.unlocked && b.unlocked) {
      const timeDiff = new Date(b.unlocked_at || 0).getTime() - new Date(a.unlocked_at || 0).getTime()
      if (timeDiff !== 0) return timeDiff
    }

    if (RARITY_WEIGHT[a.rarity] !== RARITY_WEIGHT[b.rarity]) {
      return RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity]
    }

    if (!a.unlocked || !b.unlocked) {
      if (a.progress !== b.progress) return b.progress - a.progress
      if (a.current !== b.current) return b.current - a.current
    }

    return a.sort_order - b.sort_order
  })
}

// ─── Hero Card ──────────────────────────────────────────────────────────────

function HeroCard({ user }: { user: UserData }) {
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
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
        border: '1px solid var(--border-gold)',
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
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--gold-200)',
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--gold-400)',
              boxShadow: 'var(--glow-gold)',
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
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {cashback}%
        </div>
        <div
          style={{
            color: 'var(--gold-200)',
            opacity: 0.7,
            fontFamily: "'Manrope', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          кешбэк с каждого заказа
        </div>

        {/* Stats row */}
        <div className={homeStyles.heroProofRail}>
          <div className={homeStyles.heroProofItem}>
            <Wallet2 size={15} color="var(--gold-400)" />
            На балансе: {formatMoney(balance)}
          </div>
          <div className={homeStyles.heroProofItem}>
            <BadgePercent size={15} color="var(--gold-400)" />
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
                color: 'var(--gold-200)',
                opacity: 0.6,
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
                background: 'var(--surface-hover)',
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
                  background: 'var(--gold-metallic)',
                }}
              />
            </div>
          </div>
        )}

        {maxRank && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gold-400)', opacity: 0.7, fontWeight: 600 }}>
            Максимальный ранг достигнут
          </div>
        )}
      </div>
    </motion.section>
  )
}

// ─── Referral Block ─────────────────────────────────────────────────────────

function ReferralBlock({ user }: { user: UserData }) {
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
        borderRadius: 12,
        border: '1px solid var(--surface-hover)',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--gold-glass-medium)',
            border: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={20} color="var(--gold-400)" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-200)', fontFamily: "'Manrope', sans-serif" }}>
            Пригласи друга
          </div>
          <div style={{ fontSize: 13, color: 'var(--gold-200)', opacity: 0.55, marginTop: 2 }}>
            Вы оба получите бонус
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: '13px 16px',
            borderRadius: 12,
            background: copied
              ? 'rgba(34,197,94,0.15)'
              : 'var(--gold-glass-subtle)',
            border: `1px solid ${copied
              ? 'rgba(34,197,94,0.25)'
              : 'var(--border-gold)'}`,
            color: copied ? 'var(--success-text)' : 'var(--gold-200)',
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
            borderRadius: 12,
            background: 'var(--gold-glass-medium)',
            border: '1px solid var(--gold-glass-strong)',
            color: 'var(--gold-200)',
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
            borderRadius: 12,
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-default)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-200)', fontFamily: "'Manrope', sans-serif" }}>
            {user.referrals_count || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.45, marginTop: 2 }}>
            приглашено
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-default)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-200)', fontFamily: "'Manrope', sans-serif" }}>
            {formatMoney(user.referral_earnings || 0)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.45, marginTop: 2 }}>
            заработано
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ─── Achievement Center ────────────────────────────────────────────────────

function AchievementOverview({
  achievements,
  onSelect,
}: {
  achievements: UserAchievement[]
  onSelect: (achievement: UserAchievement) => void
}) {
  const unlocked = useMemo(() => achievements.filter((achievement) => achievement.unlocked), [achievements])
  const inProgress = useMemo(
    () => achievements.filter((achievement) => !achievement.unlocked && achievement.current > 0),
    [achievements]
  )
  const completion = achievements.length > 0 ? unlocked.length / achievements.length : 0
  const rewardsEarned = unlocked.reduce((sum, achievement) => sum + (achievement.reward_amount || 0), 0)
  const spotlight = useMemo(() => {
    return unlocked.reduce<UserAchievement | null>((best, current) => {
      if (!best) return current
      if (RARITY_WEIGHT[current.rarity] !== RARITY_WEIGHT[best.rarity]) {
        return RARITY_WEIGHT[current.rarity] > RARITY_WEIGHT[best.rarity] ? current : best
      }
      return new Date(current.unlocked_at || 0).getTime() > new Date(best.unlocked_at || 0).getTime()
        ? current
        : best
    }, null)
  }, [unlocked])

  return (
    <>
      <div className={homeStyles.sectionTitle}>ЗАЛ ДОСТИЖЕНИЙ</div>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className={homeStyles.voidGlass}
        style={{
          padding: '22px 18px',
          borderRadius: 12,
          border: '1px solid var(--surface-hover)',
          marginBottom: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 'auto -50px -60px auto',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18), rgba(212,175,55,0))',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--gold-glass-medium)',
              border: '1px solid var(--border-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 24px rgba(212,175,55,0.12)',
            }}
          >
            <Sparkles size={21} color="var(--gold-400)" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--gold-200)',
                fontFamily: "'Manrope', sans-serif",
                marginBottom: 4,
              }}
            >
              Коллекция клуба
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--gold-200)',
                opacity: 0.56,
                lineHeight: 1.5,
              }}
            >
              {unlocked.length} из {achievements.length} достижений уже открыто. Остальные привязаны к реальным действиям: оплатам, отзывам, рефералам и стрикам.
            </div>
          </div>

          <div
            style={{
              minWidth: 56,
              textAlign: 'right',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--gold-400)',
              fontFamily: "'Manrope', sans-serif",
              flexShrink: 0,
            }}
          >
            {Math.round(completion * 100)}%
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            overflow: 'hidden',
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(completion * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(255,248,214,0.95))',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            marginBottom: spotlight ? 16 : 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            {
              label: 'Открыто',
              value: `${unlocked.length}`,
              note: `${pluralizeRu(unlocked.length, 'трофей', 'трофея', 'трофеев')}`,
            },
            {
              label: 'Награды',
              value: formatMoney(rewardsEarned),
              note: 'получено бонусами',
            },
            {
              label: 'В прогрессе',
              value: `${inProgress.length}`,
              note: 'почти готовы',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '12px 10px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.42, marginBottom: 8 }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--gold-200)',
                  fontFamily: "'Manrope', sans-serif",
                  lineHeight: 1.15,
                  marginBottom: 4,
                }}
              >
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.46, lineHeight: 1.4 }}>
                {item.note}
              </div>
            </div>
          ))}
        </div>

        {spotlight && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(spotlight)}
            style={{
              width: '100%',
              padding: '14px 14px 15px',
              borderRadius: 14,
              border: `1px solid ${RARITY_META[spotlight.rarity].border}`,
              background: `linear-gradient(135deg, ${RARITY_META[spotlight.rarity].glow}, rgba(255,255,255,0.02))`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(0,0,0,0.24)',
                border: `1px solid ${RARITY_META[spotlight.rarity].border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 20px ${RARITY_META[spotlight.rarity].glow}`,
              }}
            >
              {(() => {
                const Icon = ACHIEVEMENT_ICON_MAP[spotlight.icon] || Award
                return <Icon size={18} color={RARITY_META[spotlight.rarity].tint} />
              })()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--gold-400)', opacity: 0.7, marginBottom: 4 }}>
                Лучшее открытие
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {spotlight.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {spotlight.description}
              </div>
            </div>

            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: RARITY_META[spotlight.rarity].tint, marginBottom: 4 }}>
                {RARITY_META[spotlight.rarity].label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {formatAchievementDate(spotlight.unlocked_at)}
              </div>
            </div>
          </motion.button>
        )}
      </motion.section>
    </>
  )
}

function RecentUnlocks({
  achievements,
  onSelect,
}: {
  achievements: UserAchievement[]
  onSelect: (achievement: UserAchievement) => void
}) {
  const recent = useMemo(() => {
    return sortAchievements(achievements.filter((achievement) => achievement.unlocked)).slice(0, 3)
  }, [achievements])

  if (recent.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className={homeStyles.voidGlass}
        style={{
          padding: '20px 18px',
          borderRadius: 12,
          border: '1px solid var(--surface-hover)',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Gift size={18} color="var(--gold-400)" />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-200)' }}>
            Недавние открытия
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--gold-200)', opacity: 0.5, lineHeight: 1.55 }}>
          Пока список пуст. Как только откроется первая ачивка, здесь останется её история и награда.
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className={homeStyles.voidGlass}
      style={{
        padding: '18px 16px',
        borderRadius: 12,
        border: '1px solid var(--surface-hover)',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          padding: '0 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gift size={18} color="var(--gold-400)" />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-200)' }}>
            Недавние открытия
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.42 }}>
          последние 3
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.map((achievement) => {
          const Icon = ACHIEVEMENT_ICON_MAP[achievement.icon] || Award
          const rarity = RARITY_META[achievement.rarity]

          return (
            <motion.button
              key={achievement.key}
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelect(achievement)}
              style={{
                padding: '13px 12px',
                borderRadius: 14,
                border: `1px solid ${rarity.border}`,
                background: `linear-gradient(135deg, ${rarity.glow}, rgba(255,255,255,0.02))`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.24)',
                  border: `1px solid ${rarity.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 18px ${rarity.glow}`,
                }}
              >
                <Icon size={18} color={rarity.tint} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: "'Manrope', sans-serif",
                    marginBottom: 4,
                  }}
                >
                  {achievement.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, lineHeight: 1.45 }}>
                  {achievement.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Открыто {formatAchievementDate(achievement.unlocked_at)}
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--gold-400)', marginBottom: 6 }}>
                  +{formatMoney(achievement.reward_amount)}
                </div>
                <div style={{ fontSize: 10, color: rarity.tint }}>
                  {rarity.label}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.section>
  )
}

function matchesAchievementFilter(achievement: UserAchievement, filter: AchievementFilter): boolean {
  switch (filter) {
    case 'unlocked':
      return achievement.unlocked
    case 'progress':
      return !achievement.unlocked && achievement.current > 0
    case 'locked':
      return !achievement.unlocked && achievement.current === 0
    case 'legendary':
      return achievement.rarity === 'legendary'
    case 'all':
    default:
      return true
  }
}

function AchievementCollection({
  achievements,
  activeFilter,
  onFilterChange,
  onSelect,
}: {
  achievements: UserAchievement[]
  activeFilter: AchievementFilter
  onFilterChange: (filter: AchievementFilter) => void
  onSelect: (achievement: UserAchievement) => void
}) {
  const visible = useMemo(() => {
    return sortAchievements(achievements.filter((achievement) => matchesAchievementFilter(achievement, activeFilter)))
  }, [achievements, activeFilter])

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className={homeStyles.voidGlass}
      style={{
        padding: '18px 16px',
        borderRadius: 12,
        border: '1px solid var(--surface-hover)',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '0 2px' }}>
        <Award size={18} color="var(--gold-400)" />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-200)' }}>
          Полная коллекция
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 14,
          scrollbarWidth: 'none',
        }}
      >
        {ACHIEVEMENT_FILTERS.map((filter) => {
          const active = filter.key === activeFilter

          return (
            <motion.button
              key={filter.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onFilterChange(filter.key)}
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                borderRadius: 999,
                border: active ? '1px solid var(--border-gold)' : '1px solid var(--border-default)',
                background: active ? 'var(--gold-glass-subtle)' : 'rgba(255,255,255,0.03)',
                color: active ? 'var(--gold-200)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </motion.button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            padding: '18px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-200)', marginBottom: 6 }}>
            Ничего не найдено
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            В этом фильтре пока пусто. Переключите категорию или откройте новые достижения действиями в приложении.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((achievement) => {
            const Icon = ACHIEVEMENT_ICON_MAP[achievement.icon] || Award
            const rarity = RARITY_META[achievement.rarity]
            const progress = Math.max(0, Math.min(100, Math.round(achievement.progress * 100)))

            return (
              <motion.button
                key={achievement.key}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelect(achievement)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 16,
                  border: `1px solid ${achievement.unlocked ? rarity.border : 'rgba(255,255,255,0.06)'}`,
                  background: achievement.unlocked
                    ? `linear-gradient(135deg, ${rarity.glow}, rgba(255,255,255,0.025))`
                    : 'rgba(255,255,255,0.02)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: achievement.unlocked ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${achievement.unlocked ? rarity.border : 'rgba(255,255,255,0.05)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: achievement.unlocked ? `0 0 20px ${rarity.glow}` : 'none',
                    }}
                  >
                    <Icon size={19} color={achievement.unlocked ? rarity.tint : 'var(--text-muted)'} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: achievement.unlocked ? 'var(--text-primary)' : 'var(--gold-200)',
                          opacity: achievement.unlocked ? 1 : 0.88,
                          fontFamily: "'Manrope', sans-serif",
                        }}
                      >
                        {achievement.title}
                      </div>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          color: achievement.unlocked ? rarity.tint : 'var(--text-muted)',
                          background: achievement.unlocked ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${achievement.unlocked ? rarity.border : 'rgba(255,255,255,0.05)'}`,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {achievement.unlocked ? rarity.label : 'Закрыто'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                      {achievement.description}
                    </div>

                    {achievement.unlocked ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Открыто {formatAchievementDate(achievement.unlocked_at)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-400)' }}>
                          +{formatMoney(achievement.reward_amount)}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {achievement.hint || 'Продолжайте пользоваться приложением'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--gold-200)', opacity: 0.7 }}>
                            {achievement.current}/{achievement.target}
                          </div>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 6,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.05)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: 'linear-gradient(90deg, rgba(212,175,55,0.45), rgba(212,175,55,0.9))',
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Открыли {achievement.owners_percent.toFixed(1)}% участников
                  </div>
                  <div style={{ fontSize: 11, color: achievement.unlocked ? 'var(--gold-400)' : 'var(--text-muted)' }}>
                    {achievement.unlocked ? 'Подробности' : 'Смотреть прогресс'}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </motion.section>
  )
}

function AchievementDetailModal({
  achievement,
  onClose,
  onShare,
}: {
  achievement: UserAchievement
  onClose: () => void
  onShare: (achievement: UserAchievement) => void
}) {
  const Icon = ACHIEVEMENT_ICON_MAP[achievement.icon] || Award
  const rarity = RARITY_META[achievement.rarity]
  const progress = Math.max(0, Math.min(100, Math.round(achievement.progress * 100)))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={(event) => event.stopPropagation()}
          className={homeStyles.voidGlass}
          style={{
            width: '100%',
            maxWidth: 460,
            borderRadius: 24,
            border: `1px solid ${rarity.border}`,
            padding: '22px 18px 18px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-20px auto auto -20px',
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rarity.glow}, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18, position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: 'rgba(0,0,0,0.26)',
                border: `1px solid ${rarity.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 28px ${rarity.glow}`,
              }}
            >
              <Icon size={22} color={achievement.unlocked ? rarity.tint : 'var(--text-muted)'} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase' as const,
                    color: achievement.unlocked ? rarity.tint : 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${achievement.unlocked ? rarity.border : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  {achievement.unlocked ? rarity.label : 'Не открыто'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Открыли {achievement.owners_percent.toFixed(1)}% пользователей
                </span>
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--gold-200)',
                  fontFamily: "'Manrope', sans-serif",
                  marginBottom: 6,
                  lineHeight: 1.15,
                }}
              >
                {achievement.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {achievement.description}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {[
              {
                label: 'Награда',
                value: achievement.reward_amount > 0 ? formatMoney(achievement.reward_amount) : 'Без бонуса',
              },
              {
                label: 'Прогресс',
                value: `${achievement.current}/${achievement.target}`,
              },
              {
                label: 'Редкость',
                value: rarity.label,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px 10px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 7 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.35,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-200)' }}>
                {achievement.unlocked ? 'Достижение получено' : 'Что осталось'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gold-400)' }}>
                {progress}%
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: 7,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: achievement.unlocked
                    ? 'linear-gradient(90deg, rgba(255,248,214,0.9), rgba(212,175,55,0.9))'
                    : 'linear-gradient(90deg, rgba(212,175,55,0.45), rgba(212,175,55,0.9))',
                }}
              />
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {achievement.unlocked
                ? `Открыто ${formatAchievementDate(achievement.unlocked_at)}. ${rarity.description}`
                : achievement.hint || 'Продолжайте пользоваться приложением, чтобы выполнить условие.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1 }}>
            {achievement.unlocked && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onShare(achievement)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  border: '1px solid var(--border-gold)',
                  background: 'var(--gold-glass-medium)',
                  color: 'var(--gold-200)',
                  fontSize: 14,
                  fontWeight: 700,
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
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                flex: achievement.unlocked ? 0.8 : 1,
                minHeight: 48,
                borderRadius: 14,
                border: '1px solid var(--border-default)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Transaction History ────────────────────────────────────────────────────

function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
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
          borderRadius: 12,
          border: '1px solid var(--surface-hover)',
          marginBottom: 24,
          textAlign: 'center',
          fontFamily: "'Manrope', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <Receipt size={40} color="var(--gold-400)" style={{ opacity: 0.3, marginBottom: 12 }} />
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--gold-200)',
            opacity: 0.65,
            marginBottom: 8,
          }}
        >
          Пока нет операций
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--gold-200)',
            opacity: 0.35,
            lineHeight: 1.5,
            maxWidth: 220,
            marginBottom: 16,
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
            borderRadius: 12,
            border: 'none',
            background: 'var(--gold-metallic)',
            color: 'var(--text-on-gold)',
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
        borderRadius: 12,
        border: '1px solid var(--surface-hover)',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--gold-200)',
          fontFamily: "'Manrope', sans-serif",
          marginBottom: 12,
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
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tx.description || tx.reason}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {formatTransactionDate(tx.created_at)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Manrope', sans-serif",
                  color: tx.type === 'credit' ? 'var(--success-text)' : 'var(--error-text)',
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
            color: 'var(--gold-400)',
            opacity: 0.7,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
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

function HowItWorks({ userCashback }: { userCashback: number }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { num: '1', title: 'Заказывай', desc: 'Каждый оплаченный заказ приносит кешбэк на бонусный баланс' },
          { num: '2', title: 'Получай кешбэк', desc: 'Чем больше потрачено — тем выше ранг и процент кешбэка' },
          { num: '3', title: 'Приглашай друзей', desc: 'Реферальная ссылка — бонус вам обоим при первом заказе друга' },
        ].map((step) => (
          <div
            key={step.num}
            className={homeStyles.voidGlass}
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid var(--surface-hover)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--gold-glass-subtle)',
                border: '1px solid var(--border-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--gold-400)',
                flexShrink: 0,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {step.num}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-200)', marginBottom: 3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--gold-200)', opacity: 0.5, lineHeight: 1.5 }}>
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
                borderRadius: 12,
                border: isCurrent
                  ? '1px solid var(--gold-glass-strong)'
                  : '1px solid var(--surface-hover)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: isCurrent
                    ? 'var(--gold-glass-medium)'
                    : 'var(--bg-glass)',
                  border: isCurrent
                    ? '1px solid var(--gold-glass-strong)'
                    : '1px solid var(--surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isLocked ? (
                  <Lock size={18} color="var(--text-muted)" />
                ) : (
                  <RankIcon size={18} color={isCurrent ? 'var(--gold-400)' : 'var(--gold-200)'} style={{ opacity: isCurrent ? 1 : 0.5 }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isCurrent ? 'var(--gold-200)' : 'var(--gold-200)',
                      opacity: isCurrent ? 1 : 0.65,
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
                        color: 'var(--gold-400)',
                        background: 'var(--gold-glass-subtle)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                      }}
                    >
                      Сейчас
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gold-200)', opacity: 0.4, marginTop: 3 }}>
                  {rank.minSpent > 0 ? `от ${formatMoney(rank.minSpent)} потрачено` : 'Начальный уровень'}
                </div>
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isCurrent ? 'var(--gold-400)' : 'var(--gold-200)',
                  opacity: isCurrent ? 1 : 0.4,
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
  const { haptic } = useTelegram()
  const { showToast } = useToast()
  const [activeFilter, setActiveFilter] = useState<AchievementFilter>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<UserAchievement | null>(null)
  const [shareAchievement, setShareAchievement] = useState<UserAchievement | null>(null)
  const achievements = useMemo(() => sortAchievements(user?.achievements || []), [user?.achievements])
  const shareStats = useMemo(() => {
    if (!user) return undefined
    return {
      streak: user.daily_bonus_streak || undefined,
      orders: user.orders_count || undefined,
      savings: user.bonus_balance ? Math.max(0, Math.round(user.bonus_balance)) : undefined,
    }
  }, [user])

  const handleAchievementSelect = useCallback((achievement: UserAchievement) => {
    haptic('light')
    setSelectedAchievement(achievement)
  }, [haptic])

  const handleAchievementClose = useCallback(() => {
    haptic('light')
    setSelectedAchievement(null)
  }, [haptic])

  const handleAchievementShare = useCallback((achievement: UserAchievement) => {
    haptic('medium')
    setShareAchievement(achievement)
  }, [haptic])

  const handleShareClose = useCallback(() => {
    setShareAchievement(null)
  }, [])

  const handleShareComplete = useCallback(() => {
    setShareAchievement(null)
    showToast({
      type: 'achievement',
      title: 'Карточка готова',
      message: 'Telegram, системный share-sheet или буфер обмена уже получили карточку достижения.',
    })
  }, [showToast])

  if (!user) {
    return (
      <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
        <div style={{ padding: '24px 20px 120px' }}>
          {/* Hero skeleton */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <GoldSkeleton width={80} height={80} borderRadius={24} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
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
            marginBottom: 16,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleBack}
            aria-label="Назад"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'var(--border-default)',
              border: '1px solid var(--border-strong)',
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
                color: 'var(--gold-400)',
                opacity: 0.72,
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
                fontWeight: 700,
                lineHeight: 1.05,
              }}
            >
              Бонусы
            </div>
          </div>
        </motion.div>

        <HeroCard user={user} />
        <AchievementOverview achievements={achievements} onSelect={handleAchievementSelect} />
        <RecentUnlocks achievements={achievements} onSelect={handleAchievementSelect} />
        <AchievementCollection
          achievements={achievements}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onSelect={handleAchievementSelect}
        />
        <ReferralBlock user={user} />
        <TransactionHistory transactions={user.transactions || []} />
        <HowItWorks userCashback={user.rank.cashback || 0} />
      </div>

      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={handleAchievementClose}
          onShare={handleAchievementShare}
        />
      )}

      {shareAchievement && (
        <AchievementShareCard
          achievement={{
            title: shareAchievement.title,
            description: shareAchievement.description,
            icon: ACHIEVEMENT_EMOJI_MAP[shareAchievement.icon] || '🏆',
          }}
          userName={user.fullname || user.username || 'Клиент клуба'}
          stats={shareStats}
          onShare={handleShareComplete}
          onClose={handleShareClose}
        />
      )}
    </div>
  )
}

export default ClubPage
