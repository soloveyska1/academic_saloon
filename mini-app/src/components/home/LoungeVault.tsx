import { memo, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Crown, QrCode, Send, Award, Flame, Users, Star, Zap, Lock, Tag, GraduationCap, CheckCircle, ChevronDown, UserPlus } from 'lucide-react'
import { PromoCodeSection } from '../ui/PromoCodeSection'
import { formatMoney } from '../../lib/utils'
import type { Order } from '../../types'

interface Rank {
  name: string
  emoji: string
  cashback: number
  progress: number
  next_rank: string | null
  spent_to_next: number
  is_max: boolean
}

interface LoungeVaultProps {
  rank: Rank
  bonusBalance?: number
  referralCode: string
  referralsCount: number
  referralEarnings: number
  ordersCount: number
  totalSpent: number
  dailyStreak: number
  orders?: Order[]
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare: () => void
}

/* ─── Achievement / Milestone definitions ─── */
interface Achievement {
  id: string
  icon: typeof Award
  label: string
  description: string
  unlocked: boolean
  progress?: number // 0-1
  hint?: string // мотивационный текст для заблокированных
  current?: number // текущее значение
  target?: number // целевое значение
}

function useAchievements(
  ordersCount: number,
  totalSpent: number,
  referralsCount: number,
  dailyStreak: number,
  isMaxRank: boolean,
  orders: Order[],
): Achievement[] {
  return useMemo(() => {
    const hasUsedPromo = orders.some(o => o.promo_code)
    const completedOrders = orders.filter(o => o.status === 'completed')
    const perfectOrders = completedOrders.filter(o => (o.revision_count || 0) === 0).length

    return [
      {
        id: 'first',
        icon: Star,
        label: 'Дебют',
        description: 'Первый заказ',
        unlocked: ordersCount >= 1,
        progress: Math.min(1, ordersCount / 1),
        hint: 'Оформите первый заказ',
        current: Math.min(ordersCount, 1),
        target: 1,
      },
      {
        id: 'five',
        icon: Zap,
        label: 'Завсегдатай',
        description: '5 заказов',
        unlocked: ordersCount >= 5,
        progress: Math.min(1, ordersCount / 5),
        hint: ordersCount > 0 ? `Ещё ${Math.max(0, 5 - ordersCount)} ${5 - ordersCount === 1 ? 'заказ' : 5 - ordersCount < 5 ? 'заказа' : 'заказов'}` : 'Закажите 5 работ',
        current: Math.min(ordersCount, 5),
        target: 5,
      },
      {
        id: 'referrer',
        icon: Users,
        label: 'Амбассадор',
        description: 'Пригласить друга',
        unlocked: referralsCount >= 1,
        progress: Math.min(1, referralsCount / 1),
        hint: 'Пригласите друга по реферальной ссылке',
        current: Math.min(referralsCount, 1),
        target: 1,
      },
      {
        id: 'streak',
        icon: Flame,
        label: 'Марафонец',
        description: 'Серия 7 дней',
        unlocked: dailyStreak >= 7,
        progress: Math.min(1, dailyStreak / 7),
        hint: dailyStreak > 0 ? `Ещё ${7 - dailyStreak} ${7 - dailyStreak === 1 ? 'день' : 7 - dailyStreak < 5 ? 'дня' : 'дней'}` : 'Заходите 7 дней подряд',
        current: Math.min(dailyStreak, 7),
        target: 7,
      },
      {
        id: 'whale',
        icon: Crown,
        label: 'Патрон',
        description: 'Потрачено 10K₽',
        unlocked: totalSpent >= 10000,
        progress: Math.min(1, totalSpent / 10000),
        hint: totalSpent > 0 ? `Ещё ${formatMoney(Math.max(0, 10000 - totalSpent))}` : 'Потратьте 10 000₽',
        current: Math.min(Math.round(totalSpent), 10000),
        target: 10000,
      },
      {
        id: 'promo',
        icon: Tag,
        label: 'Щедрость',
        description: 'Применить промокод',
        unlocked: hasUsedPromo,
        progress: hasUsedPromo ? 1 : 0,
        hint: 'Используйте промокод при заказе',
        current: hasUsedPromo ? 1 : 0,
        target: 1,
      },
      {
        id: 'perfect',
        icon: GraduationCap,
        label: 'Отличник',
        description: '3 без доработок',
        unlocked: perfectOrders >= 3,
        progress: Math.min(1, perfectOrders / 3),
        hint: perfectOrders > 0 ? `Ещё ${3 - perfectOrders} без правок` : 'Получите 3 работы без правок',
        current: Math.min(perfectOrders, 3),
        target: 3,
      },
      {
        id: 'max',
        icon: Award,
        label: 'Легенда',
        description: 'Высший ранг',
        unlocked: isMaxRank,
        progress: isMaxRank ? 1 : 0,
        hint: 'Достигните высшего ранга',
        current: isMaxRank ? 1 : 0,
        target: 1,
      },
    ]
  }, [ordersCount, totalSpent, referralsCount, dailyStreak, isMaxRank, orders])
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERALL PROGRESS RING — Mini-кольцо для header секции (thin stroke)
   ═══════════════════════════════════════════════════════════════════════════ */
const HEADER_RING_SIZE = 32
const HEADER_RING_R = 12
const HEADER_RING_C = 2 * Math.PI * HEADER_RING_R

function OverallProgressRing({ progress }: { progress: number }) {
  return (
    <svg
      width={HEADER_RING_SIZE}
      height={HEADER_RING_SIZE}
      viewBox={`0 0 ${HEADER_RING_SIZE} ${HEADER_RING_SIZE}`}
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      <circle
        cx={HEADER_RING_SIZE / 2}
        cy={HEADER_RING_SIZE / 2}
        r={HEADER_RING_R}
        fill="none"
        stroke="rgba(212,175,55,0.08)"
        strokeWidth={1.5}
      />
      <motion.circle
        cx={HEADER_RING_SIZE / 2}
        cy={HEADER_RING_SIZE / 2}
        r={HEADER_RING_R}
        fill="none"
        stroke="#D4AF37"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={HEADER_RING_C}
        initial={{ strokeDashoffset: HEADER_RING_C }}
        animate={{ strokeDashoffset: HEADER_RING_C * (1 - progress) }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM ACHIEVEMENT CARD — Dark glass tile with gold accents
   ═══════════════════════════════════════════════════════════════════════════ */
const AchievementCard = memo(function AchievementCard({
  achievement,
  index,
}: {
  achievement: Achievement
  index: number
}) {
  const Icon = achievement.icon
  const unlocked = achievement.unlocked
  const progress = achievement.progress ?? 0
  const [expanded, setExpanded] = useState(false)

  const handleTap = useCallback(() => {
    setExpanded(v => !v)
    setTimeout(() => setExpanded(false), 3000)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.12 + index * 0.06,
        type: 'spring',
        stiffness: 140,
        damping: 20,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={handleTap}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 8px 14px',
        borderRadius: 14,
        cursor: 'pointer',
        overflow: 'hidden',
        background: unlocked ? '#0E0D0C' : '#0A0A0A',
        border: `1px solid ${unlocked ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)'}`,
        boxShadow: unlocked
          ? '0 2px 12px rgba(0,0,0,0.4)'
          : '0 1px 4px rgba(0,0,0,0.2)',
      }}
    >
      {/* ─── Top shine line для unlocked ─── */}
      {unlocked && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.15) 50%, transparent 90%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ─── Icon with subtle circular glow ─── */}
      <div
        style={{
          width: 52,
          height: 52,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* Icon circle background */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: unlocked
              ? 'rgba(212,175,55,0.08)'
              : 'rgba(255,255,255,0.04)',
          }}
        >
          {/* Icon */}
          <Icon
            size={24}
            strokeWidth={unlocked ? 1.8 : 1.5}
            style={{
              color: unlocked ? '#D4AF37' : 'rgba(255,255,255,0.12)',
              filter: unlocked ? 'drop-shadow(0 0 6px rgba(212,175,55,0.3))' : 'none',
              position: 'relative',
              zIndex: 1,
            }}
          />

          {/* Lock overlay для locked без прогресса */}
          {!unlocked && progress === 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#0A0A0A',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <Lock size={8} strokeWidth={2.5} color="rgba(255,255,255,0.25)" />
            </div>
          )}

          {/* Checkmark для unlocked */}
          {unlocked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.8 + index * 0.07,
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #B38728)',
                border: '1.5px solid #0E0D0C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                boxShadow: '0 2px 6px rgba(212,175,55,0.3)',
              }}
            >
              <Check size={9} strokeWidth={3} color="#0A0A0A" />
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── Label (Manrope, clean) ─── */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: unlocked ? 'var(--text-primary, rgba(255,255,255,0.92))' : 'rgba(255,255,255,0.28)',
          textAlign: 'center',
          maxWidth: 110,
          lineHeight: 1.25,
          fontFamily: 'inherit',
        }}
      >
        {achievement.label}
      </span>

      {/* ─── Description / Progress ─── */}
      {unlocked ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted, rgba(255,255,255,0.45))',
            textAlign: 'center',
            lineHeight: 1.3,
            maxWidth: 110,
          }}
        >
          {achievement.description}
        </span>
      ) : progress > 0 && achievement.current !== undefined && achievement.target !== undefined ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: '100%', padding: '0 4px' }}>
          {/* Thin progress bar at bottom */}
          <div
            style={{
              width: '100%',
              maxWidth: 80,
              height: 2,
              borderRadius: 1,
              background: 'rgba(212,175,55,0.06)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{
                delay: 0.3 + index * 0.06,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                height: '100%',
                borderRadius: 1,
                background: '#D4AF37',
              }}
            />
          </div>
          {/* Progress text */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--gold-400, #D4AF37)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {achievement.hint || `${achievement.current} из ${achievement.target}`}
          </span>
        </div>
      ) : (
        /* Locked без прогресса — подсказка */
        <AnimatePresence>
          {expanded ? (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.25)',
                textAlign: 'center',
                lineHeight: 1.3,
                maxWidth: 110,
              }}
            >
              {achievement.hint || 'Как открыть?'}
            </motion.span>
          ) : (
            <motion.span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
                letterSpacing: '0.04em',
              }}
            >
              ???
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   REFERRAL CARD — Compact collapsible with stats, code, share, promo
   ═══════════════════════════════════════════════════════════════════════════ */
const ReferralCard = memo(function ReferralCard({
  referralCode,
  referralsCount,
  referralEarnings,
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
}: {
  referralCode: string
  referralsCount: number
  referralEarnings: number
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasStats = referralsCount > 0 || referralEarnings > 0

  return (
    <div
      style={{
        borderRadius: 14,
        background: '#0E0D0C',
        border: '1px solid rgba(255,255,255,0.04)',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* ─── Compact header row (always visible) ─── */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <UserPlus size={16} strokeWidth={1.8} color="#D4AF37" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Приглашения
            {hasStats && (
              <span style={{ color: 'var(--gold-400)', marginLeft: 8, fontSize: 11, fontWeight: 600 }}>
                {referralsCount > 0 && `${referralsCount}`}
                {referralsCount > 0 && referralEarnings > 0 && ' · '}
                {referralEarnings > 0 && `${formatMoney(referralEarnings)}`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.2 }}>
            {expanded ? 'Поделитесь ссылкой с друзьями' : 'Рекомендуйте — получайте привилегии'}
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={16} strokeWidth={2} color="var(--text-muted)" />
        </motion.div>
      </motion.button>

      {/* ─── Expandable content ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 14px' }}>
              {/* Referral code + action buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                gap: 6,
                marginBottom: 10,
              }}>
                {/* Code button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={onCopy}
                  style={{
                    minWidth: 0, padding: '9px 12px', borderRadius: 10,
                    border: '1px solid rgba(212,175,55,0.14)',
                    background: 'rgba(212,175,55,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 6, cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.08em', color: 'var(--gold-300)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {referralCode}
                  </span>
                  {copied ? (
                    <Check size={14} color="var(--success-text)" strokeWidth={2} />
                  ) : (
                    <Copy size={14} color="var(--text-secondary)" strokeWidth={2} />
                  )}
                </motion.button>

                {/* Share button */}
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onTelegramShare}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text-secondary)',
                  }}
                >
                  <Send size={14} strokeWidth={1.8} />
                </motion.button>

                {/* QR button */}
                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onShowQR}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--text-secondary)',
                  }}
                >
                  <QrCode size={14} strokeWidth={1.8} />
                </motion.button>
              </div>

              {/* PromoCode section */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                <PromoCodeSection variant="full" collapsible defaultExpanded={false} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export const LoungeVault = memo(function LoungeVault({
  rank,
  // bonusBalance no longer displayed (shown in HomeHeader)
  referralCode,
  referralsCount,
  referralEarnings,
  ordersCount,
  totalSpent,
  dailyStreak,
  orders = [],
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
}: LoungeVaultProps) {
  const achievements = useAchievements(ordersCount, totalSpent, referralsCount, dailyStreak, rank.is_max, orders)
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const overallProgress = unlockedCount / achievements.length

  // Сортировка: unlocked первыми, потом с прогрессом, потом locked
  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1
      if (!a.unlocked && b.unlocked) return 1
      if (!a.unlocked && !b.unlocked) {
        return (b.progress ?? 0) - (a.progress ?? 0)
      }
      return 0
    })
  }, [achievements])

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20, display: 'grid', gap: 6 }}
    >
      {/* ═══ Card B — КОЛЛЕКЦИЯ (Premium Achievement Grid) ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        style={{
          padding: 16,
          borderRadius: 14,
          background: '#0E0D0C',
          border: '1px solid rgba(255,255,255,0.04)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px -4px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top accent line — thin gold */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.08) 50%, transparent 90%)',
            pointerEvents: 'none',
          }}
        />

        {/* ─── Header с progress ring ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {/* Overall progress ring */}
          <div style={{ position: 'relative', width: HEADER_RING_SIZE, height: HEADER_RING_SIZE }}>
            <OverallProgressRing progress={overallProgress} />
            {/* Число внутри кольца */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--gold-300, #D4AF37)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {unlockedCount}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--gold-400, #D4AF37)',
                lineHeight: 1,
              }}
            >
              КОЛЛЕКЦИЯ
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted, rgba(255,255,255,0.45))',
                marginTop: 3,
                lineHeight: 1,
              }}
            >
              {unlockedCount} из {achievements.length} собрано
            </div>
          </div>

          {/* Все открыты — золотая галочка */}
          {unlockedCount === achievements.length && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 12 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #FFF8D6, #B38728)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(212,175,55,0.3)',
              }}
            >
              <CheckCircle size={16} strokeWidth={2.5} color="#0A0A0A" />
            </motion.div>
          )}
        </motion.div>

        {/* ─── 2-column premium grid ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          {sortedAchievements.map((a, i) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              index={i}
            />
          ))}
        </div>
      </motion.div>

      {/* ═══ Card C — Referral (collapsible, compact) ═══ */}
      <ReferralCard
        referralCode={referralCode}
        referralsCount={referralsCount}
        referralEarnings={referralEarnings}
        copied={copied}
        onCopy={onCopy}
        onShowQR={onShowQR}
        onTelegramShare={onTelegramShare}
      />
      {/* Old inline Card C removed — replaced by ReferralCard above */}
    </motion.section>
  )
})
