import { memo, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Crown, QrCode, Send, Gift, Award, Flame, Users, Star, Zap, Lock, Tag, GraduationCap, CheckCircle } from 'lucide-react'
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
   PREMIUM SVG PROGRESS RING — Circular progress indicator (Starbucks-style)
   ═══════════════════════════════════════════════════════════════════════════ */
const RING_SIZE = 56
const RING_RADIUS = 24
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_STROKE = 2.5

function ProgressRing({
  progress,
  unlocked,
  index,
}: {
  progress: number
  unlocked: boolean
  index: number
}) {
  const offset = RING_CIRCUMFERENCE * (1 - progress)

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        transform: 'rotate(-90deg)',
      }}
    >
      {/* Трек (фоновое кольцо) */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={unlocked ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.06)'}
        strokeWidth={RING_STROKE}
      />
      {/* Прогресс (заполненная дуга) */}
      {progress > 0 && (
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={unlocked ? 'url(#goldGrad)' : 'rgba(212,175,55,0.45)'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            delay: 0.2 + index * 0.07,
            duration: 1.0,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      )}
      {/* SVG градиент для золотого кольца */}
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#FFF8D6" />
          <stop offset="100%" stopColor="#B38728" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERALL PROGRESS RING — Mini-кольцо для header секции
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
        stroke="rgba(212,175,55,0.10)"
        strokeWidth={2}
      />
      <motion.circle
        cx={HEADER_RING_SIZE / 2}
        cy={HEADER_RING_SIZE / 2}
        r={HEADER_RING_R}
        fill="none"
        stroke="url(#headerGoldGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={HEADER_RING_C}
        initial={{ strokeDashoffset: HEADER_RING_C }}
        animate={{ strokeDashoffset: HEADER_RING_C * (1 - progress) }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <defs>
        <linearGradient id="headerGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#FFF8D6" />
          <stop offset="100%" stopColor="#B38728" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM ACHIEVEMENT CARD — 2-column grid card component
   Вдохновлено: Nike Run Club trophies + Starbucks Rewards challenges
   ═══════════════════════════════════════════════════════════════════════════ */
const AchievementCard = memo(function AchievementCard({
  achievement,
  index,
  isRecent,
}: {
  achievement: Achievement
  index: number
  isRecent: boolean
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
        background: unlocked
          ? 'linear-gradient(145deg, rgba(212,175,55,0.08) 0%, rgba(183,142,38,0.03) 100%)'
          : 'rgba(255,255,255,0.015)',
        border: `1px solid ${unlocked ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: unlocked
          ? '0 4px 20px -4px rgba(212,175,55,0.10), 0 1px 3px rgba(0,0,0,0.2)'
          : '0 2px 8px -2px rgba(0,0,0,0.15)',
      }}
    >
      {/* ─── "Недавно открыто" ribbon ─── */}
      {isRecent && unlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + index * 0.06, type: 'spring', stiffness: 200 }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #FFF8D6)',
            boxShadow: '0 0 8px rgba(212,175,55,0.5)',
          }}
        />
      )}

      {/* ─── Background shimmer для unlocked ─── */}
      {unlocked && (
        <motion.div
          animate={{
            opacity: [0.03, 0.08, 0.03],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 30% 20%, rgba(212,175,55,0.15), transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ─── Top shine line для unlocked ─── */}
      {unlocked && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.20) 50%, transparent 90%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ─── Icon с SVG progress ring ─── */}
      <div
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* Circular progress ring */}
        <ProgressRing progress={progress} unlocked={unlocked} index={index} />

        {/* Inner circle background */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: unlocked
              ? 'linear-gradient(145deg, rgba(212,175,55,0.18) 0%, rgba(142,110,39,0.12) 100%)'
              : 'rgba(255,255,255,0.03)',
            boxShadow: unlocked
              ? '0 0 20px rgba(212,175,55,0.12), inset 0 1px 1px rgba(255,248,214,0.15)'
              : 'inset 0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          {/* Gold shimmer sweep для unlocked (one-shot) */}
          {unlocked && (
            <motion.div
              initial={{ x: '-120%' }}
              animate={{ x: '220%' }}
              transition={{
                delay: 0.6 + index * 0.07,
                duration: 0.8,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,248,214,0.35), transparent)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Icon */}
          <Icon
            size={unlocked ? 20 : 18}
            strokeWidth={unlocked ? 1.8 : 1.5}
            style={{
              color: unlocked ? '#D4AF37' : 'rgba(255,255,255,0.18)',
              filter: unlocked ? 'drop-shadow(0 1px 4px rgba(212,175,55,0.4))' : 'none',
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
                background: 'rgba(20,18,14,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <Lock size={8} strokeWidth={2.5} color="rgba(255,255,255,0.3)" />
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
                border: '1.5px solid rgba(20,18,14,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                boxShadow: '0 2px 6px rgba(212,175,55,0.3)',
              }}
            >
              <Check size={9} strokeWidth={3} color="#1a1810" />
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── Label (премиальный шрифт) ─── */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: unlocked ? '0.03em' : '0.01em',
          color: unlocked ? 'var(--gold-300, #D4AF37)' : 'rgba(255,255,255,0.35)',
          textAlign: 'center',
          maxWidth: 110,
          lineHeight: 1.25,
          fontFamily: unlocked ? "var(--font-display, 'Playfair Display', serif)" : 'inherit',
        }}
      >
        {achievement.label}
      </span>

      {/* ─── Description / Progress ─── */}
      {unlocked ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
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
          {/* Progress bar (вместо сухих цифр) */}
          <div
            style={{
              width: '100%',
              maxWidth: 80,
              height: 3,
              borderRadius: 2,
              background: 'rgba(212,175,55,0.08)',
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
                borderRadius: 2,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.8))',
              }}
            />
          </div>
          {/* Мотивационный текст */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(212,175,55,0.50)',
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
                color: 'rgba(255,255,255,0.30)',
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
                color: 'rgba(255,255,255,0.18)',
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

  // Определяем самый "свежий" разблокированный (последний в списке unlocked)
  // Для простоты считаем "недавним" последний unlocked, если не все открыты
  const recentUnlockedId = useMemo(() => {
    if (unlockedCount === 0 || unlockedCount === achievements.length) return null
    const lastUnlocked = [...achievements].reverse().find(a => a.unlocked)
    return lastUnlocked?.id ?? null
  }, [achievements, unlockedCount])

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
          padding: '20px 16px 18px',
          borderRadius: 14,
          background: 'linear-gradient(180deg, rgba(20,18,14,0.97) 0%, rgba(16,14,10,0.95) 100%)',
          border: '1px solid rgba(212,175,55,0.10)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {/* Gold orb top-right (усиленный) */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        {/* Gold orb bottom-left (новый) */}
        <div
          style={{
            position: 'absolute',
            bottom: -50,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
        {/* Top shine line (ярче) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.18) 30%, rgba(255,248,214,0.12) 50%, rgba(212,175,55,0.18) 70%, transparent 95%)',
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
              <CheckCircle size={16} strokeWidth={2.5} color="#1a1810" />
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
              isRecent={a.id === recentUnlockedId}
            />
          ))}
        </div>
      </motion.div>

      {/* ═══ Card C — Referral (LIGHT visual weight) ═══ */}
      <div
        className="glass-card"
        style={{
          padding: 16,
          borderRadius: 12,
          background: 'rgba(20,18,14,0.95)',
          border: '1px solid rgba(212,175,55,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Gift size={14} color="var(--gold-400)" strokeWidth={1.9} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Приглашения
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.35,
                color: 'var(--text-secondary)',
              }}
            >
              Рекомендуйте Салон — получайте привилегии
              {(referralsCount > 0 || referralEarnings > 0) && (
                <span style={{ color: 'var(--gold-300)', marginLeft: 6, fontSize: 11 }}>
                  {referralsCount > 0 && `${referralsCount} ${referralsCount === 1 ? 'друг' : referralsCount < 5 ? 'друга' : 'друзей'}`}
                  {referralsCount > 0 && referralEarnings > 0 && ' · '}
                  {referralEarnings > 0 && `${formatMoney(referralEarnings)} заработано`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Referral code + action buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {/* Code button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onCopy}
            style={{
              minWidth: 0,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid rgba(212,175,55,0.14)',
              background: 'rgba(212,175,55,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--gold-300)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {referralCode}
            </span>
            {copied ? (
              <Check size={14} color="var(--success-text)" strokeWidth={2} />
            ) : (
              <Copy size={14} color="var(--text-secondary)" strokeWidth={2} />
            )}
          </motion.button>

          {/* Share button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onTelegramShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <Send size={15} strokeWidth={1.8} />
          </motion.button>

          {/* QR button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onShowQR}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <QrCode size={16} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* PromoCode section — collapsible, separated */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: 10,
          }}
        >
          <PromoCodeSection variant="full" collapsible defaultExpanded={false} />
        </div>
      </div>
    </motion.section>
  )
})
