import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Gift,
  ShieldCheck,
  Ticket,
  Wallet2,
} from 'lucide-react'
import { UserData, Mission, Reward } from '../types'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { useClub } from '../contexts/ClubContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { ClubRulesSheet, AVAILABLE_REWARDS, CLUB_LEVELS } from '../components/club'
import { getDisplayName } from '../lib/ranks'
import homeStyles from './HomePage.module.css'

interface ClubPageProps {
  user: UserData | null
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function formatProgressLevel(level: string) {
  const map: Record<string, string> = {
    silver: 'Стартовый уровень',
    gold: 'Усиленный уровень',
    platinum: 'Максимальный уровень',
  }

  return map[level] || 'Уровень клуба'
}

function ActionPanel({
  title,
  subtitle,
  icon: Icon,
  accent,
  onClick,
}: {
  title: string
  subtitle: string
  icon: typeof Gift
  accent: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={homeStyles.voidGlass}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          background: `${accent}20`,
          border: `1px solid ${accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={accent} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#a1a1aa' }}>
          {subtitle}
        </div>
      </div>

      <ArrowUpRight size={16} color="rgba(255,255,255,0.32)" />
    </motion.button>
  )
}

function MissionPanel({
  mission,
  onClick,
}: {
  mission: Mission
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={homeStyles.voidGlass}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          minWidth: 52,
          height: 52,
          padding: '0 12px',
          borderRadius: 16,
          background: 'rgba(212,175,55,0.12)',
          border: '1px solid rgba(212,175,55,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37',
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        +{mission.rewardPoints}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>
          {mission.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#a1a1aa' }}>
          {mission.description}
        </div>
      </div>

      <ArrowRight size={16} color="rgba(255,255,255,0.32)" />
    </motion.button>
  )
}

function RewardPanel({
  reward,
  onClick,
}: {
  reward: Reward
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={homeStyles.voidGlass}
      style={{
        width: '100%',
        padding: '18px',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: '#f4f4f5', lineHeight: 1.35 }}>
          {reward.title}
        </div>
        <div
          style={{
            padding: '7px 10px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.16)',
            color: '#d4af37',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {reward.costPoints} баллов
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#a1a1aa', marginBottom: 12 }}>
        {reward.description}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f5d061', fontSize: 12.5, fontWeight: 700 }}>
        Открыть каталог
        <ArrowUpRight size={14} />
      </div>
    </motion.button>
  )
}

function ClubPage({ user }: ClubPageProps) {
  const navigate = useNavigate()
  const club = useClub()
  const handleBack = useSafeBackNavigation('/')
  const [showRules, setShowRules] = useState(false)

  const cashbackPercent = user?.rank.cashback || 0
  const bonusBalance = user?.bonus_balance || 0
  const statusLabel = useMemo(
    () => getDisplayName(user?.rank.name || '') || 'Статус клиента',
    [user?.rank.name]
  )

  const currentLevel = CLUB_LEVELS[club.level]
  const nextLevel = currentLevel.nextLevelXp
    ? Object.values(CLUB_LEVELS).find((level) => level.minXp === currentLevel.nextLevelXp) || null
    : null

  const featuredMissions = useMemo(() => club.pendingMissions.slice(0, 3), [club.pendingMissions])
  const featuredRewards = useMemo(() => AVAILABLE_REWARDS.slice(0, 3), [])

  const handleMissionClick = useCallback((mission: Mission) => {
    if (mission.status === 'pending') {
      club.completeMission(mission.id)
    }

    if (mission.deepLinkTarget) {
      navigate(mission.deepLinkTarget)
    }
  }, [club, navigate])

  const handleOpenRewards = useCallback(() => {
    navigate('/club/rewards')
  }, [navigate])

  const handleOpenVouchers = useCallback(() => {
    navigate('/club/vouchers')
  }, [navigate])

  const handleOpenHistory = useCallback(() => {
    navigate('/club/history')
  }, [navigate])

  const handleOpenPrivileges = useCallback(() => {
    navigate('/club/privileges')
  }, [navigate])

  return (
    <div className="page-full-width" style={{ background: 'var(--bg-main)' }}>
      <div className="page-background">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div className="page-content">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleBack}
              aria-label="Назад"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
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
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(212,175,55,0.72)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Бонусы
              </div>
              <div className={homeStyles.goldAccent} style={{ fontFamily: "'Manrope', sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1.05 }}>
                Бонусы и ваучеры
              </div>
            </div>
          </div>
        </motion.div>

        <motion.section
          className={`${homeStyles.voidGlass} ${homeStyles.primaryActionCard} ${homeStyles.returningOrderActionCard}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'relative',
            width: '100%',
            padding: '26px 22px 22px',
            borderRadius: '28px',
            marginBottom: '22px',
            overflow: 'hidden',
            border: '1px solid rgba(212,175,55,0.16)',
            isolation: 'isolate',
            textAlign: 'left',
          }}
        >
          <div className={homeStyles.primaryActionGlow} aria-hidden="true" />
          <div className={homeStyles.primaryActionShine} aria-hidden="true" />
          <div className={homeStyles.primaryActionOrb} aria-hidden="true" />

          <div style={{ position: 'relative', zIndex: 1, marginBottom: 18 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(9, 9, 11, 0.58)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--gold-100)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#d4af37',
                  boxShadow: '0 0 12px rgba(212,175,55,0.72)',
                  flexShrink: 0,
                }}
              />
              Главное по бонусам
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              className={homeStyles.goldAccent}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 'clamp(30px, 7vw, 40px)',
                fontWeight: 800,
                lineHeight: 1.02,
                marginBottom: 10,
                maxWidth: 440,
              }}
            >
              {statusLabel}
            </div>

            <div
              style={{
                maxWidth: 470,
                color: '#d4d4d8',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: 1.6,
                marginBottom: 18,
              }}
            >
              Кэшбэк {cashbackPercent}%, на бонусном балансе {formatMoney(bonusBalance)} и {club.activeVouchers.length} активных ваучеров.
            </div>

            <div className={homeStyles.heroProofRail}>
              <div className={homeStyles.heroProofItem}>
                <BadgePercent size={15} color="#d4af37" />
                Кэшбэк {cashbackPercent}% после оплаченных заказов
              </div>
              <div className={homeStyles.heroProofItem}>
                <Wallet2 size={15} color="#d4af37" />
                Бонусный баланс: {formatMoney(bonusBalance)}
              </div>
              <div className={homeStyles.heroProofItem}>
                <Gift size={15} color="#d4af37" />
                {club.dailyBonus.status === 'available'
                  ? 'Ежедневный бонус уже можно забрать'
                  : `${club.points} баллов клуба • ${formatProgressLevel(club.level)}`}
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={handleOpenRewards}
              className={homeStyles.heroPrimaryButton}
            >
              <span>Открыть каталог бонусов</span>
              <div className={homeStyles.primaryActionArrow}>
                <ArrowRight size={18} color="#09090b" strokeWidth={2.6} />
              </div>
            </motion.button>

            <div className={homeStyles.heroFootnote}>
              {nextLevel
                ? `До следующего уровня осталось ${Math.max(nextLevel.minXp - club.xp, 0)} баллов прогресса.`
                : 'Максимальный уровень уже открыт.'}
            </div>
          </div>
        </motion.section>

        <div className={homeStyles.sectionTitle}>БЫСТРЫЙ ДОСТУП</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <ActionPanel
            icon={Ticket}
            title="Мои ваучеры"
            subtitle={club.activeVouchers.length > 0 ? `${club.activeVouchers.length} ваучеров уже доступны к применению.` : 'Посмотрите активные и завершённые ваучеры.'}
            accent="#d4af37"
            onClick={handleOpenVouchers}
          />
          <ActionPanel
            icon={Wallet2}
            title="История начислений"
            subtitle="Все движения по баллам, обменам и списаниям в одном журнале."
            accent="#93c5fd"
            onClick={handleOpenHistory}
          />
          <ActionPanel
            icon={ShieldCheck}
            title="Статус и условия"
            subtitle="Проверьте текущий кэшбэк, бонусы и что откроется дальше."
            accent="#86efac"
            onClick={handleOpenPrivileges}
          />
          <ActionPanel
            icon={Gift}
            title="Правила бонусов"
            subtitle="Коротко и по делу: как начисляются баллы и как работают ваучеры."
            accent="#f5d061"
            onClick={() => setShowRules(true)}
          />
        </div>

        <div className={homeStyles.sectionTitle}>КАК ПОЛУЧИТЬ БОЛЬШЕ БАЛЛОВ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {featuredMissions.length > 0 ? (
            featuredMissions.map((mission) => (
              <MissionPanel
                key={mission.id}
                mission={mission}
                onClick={() => handleMissionClick(mission)}
              />
            ))
          ) : (
            <div
              className={homeStyles.voidGlass}
              style={{
                padding: '18px',
                borderRadius: 22,
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#d4d4d8',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Все быстрые шаги уже выполнены. Баллы продолжают копиться через заказы, ежедневный бонус и обмены в каталоге бонусов.
            </div>
          )}
        </div>

        <div className={homeStyles.sectionTitle}>ДОСТУПНО ЗА БАЛЛЫ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 120 }}>
          {featuredRewards.map((reward) => (
            <RewardPanel
              key={reward.id}
              reward={reward}
              onClick={handleOpenRewards}
            />
          ))}
        </div>
      </div>

      <ClubRulesSheet
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  )
}

export default ClubPage
