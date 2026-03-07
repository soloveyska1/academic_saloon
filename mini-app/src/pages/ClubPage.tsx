import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
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

interface ClubPageProps {
  user: UserData | null
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function formatLevelLabel(level: string) {
  const levelMap: Record<string, string> = {
    silver: 'Стартовый уровень',
    gold: 'Усиленный уровень',
    platinum: 'Максимальный уровень',
  }

  return levelMap[level] || 'Уровень привилегий'
}

function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        background: `
          radial-gradient(circle at top right, rgba(212,175,55,0.08), transparent 34%),
          linear-gradient(180deg, rgba(18,18,21,0.97), rgba(11,11,16,0.96))
        `,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 22px 42px -36px rgba(0,0,0,0.85)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({
  title,
  caption,
}: {
  title: string
  caption: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {caption}
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  helper,
  accent,
}: {
  label: string
  value: string
  helper: string
  accent: string
}) {
  return (
    <SurfaceCard style={{ padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.44)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {helper}
      </div>
    </SurfaceCard>
  )
}

function MissionCard({
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
      style={{
        width: '100%',
        padding: 16,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: 'rgba(212,175,55,0.12)',
          border: '1px solid rgba(212,175,55,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d4af37',
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        +{mission.rewardPoints}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {mission.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {mission.description}
        </div>
      </div>

      <ChevronRight size={18} color="rgba(255,255,255,0.32)" />
    </motion.button>
  )
}

function RewardCard({
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
      style={{
        width: '100%',
        padding: 16,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
          {reward.title}
        </div>
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.14)',
            color: '#d4af37',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {reward.costPoints} баллов
        </div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {reward.description}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f4f4f5', fontSize: 12.5, fontWeight: 700 }}>
        Открыть каталог
        <ArrowUpRight size={14} />
      </div>
    </motion.button>
  )
}

function ActionLink({
  icon: Icon,
  label,
  hint,
  onClick,
  accent = '#d4af37',
}: {
  icon: typeof Ticket
  label: string
  hint: string
  onClick: () => void
  accent?: string
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 16,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          background: `${accent}18`,
          border: `1px solid ${accent}28`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {hint}
        </div>
      </div>
      <ChevronRight size={18} color="rgba(255,255,255,0.32)" />
    </motion.button>
  )
}

function ClubPage({ user }: ClubPageProps) {
  const navigate = useNavigate()
  const club = useClub()
  const handleBack = useSafeBackNavigation('/')
  const [showRules, setShowRules] = useState(false)

  const cashbackRankName = useMemo(
    () => getDisplayName(user?.rank.name || ''),
    [user?.rank.name]
  )

  const currentLevel = CLUB_LEVELS[club.level]
  const nextLevel = currentLevel.nextLevelXp
    ? Object.values(CLUB_LEVELS).find((level) => level.minXp === currentLevel.nextLevelXp) || null
    : null

  const featuredRewards = useMemo(
    () => AVAILABLE_REWARDS.slice(0, 3),
    []
  )

  const featuredMissions = useMemo(
    () => club.pendingMissions.slice(0, 3),
    [club.pendingMissions]
  )

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
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
                Привилегии
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.05,
                  fontWeight: 700,
                  fontFamily: "'Playfair Display', serif",
                  background: 'var(--gold-metallic)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Баллы, ваучеры и ваш статус
              </h1>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 360 }}>
                Здесь собраны все клиентские привилегии: кэшбэк, баллы, доступные ваучеры и понятные шаги, как открыть больше выгоды.
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenPrivileges}
            style={{
              minHeight: 44,
              padding: '0 14px',
              borderRadius: 14,
              border: '1px solid rgba(212,175,55,0.18)',
              background: 'rgba(212,175,55,0.1)',
              color: '#d4af37',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            Все условия
          </motion.button>
        </motion.header>

        <SurfaceCard style={{ padding: 18, marginBottom: 18, border: '1px solid rgba(212,175,55,0.16)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(212,175,55,0.72)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Текущий статус
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {cashbackRankName || 'Клиент'}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                В профиле и в системе кэшбэка отображается один и тот же статус. Сейчас активен кэшбэк {user?.rank.cashback || 0}%.
              </div>
            </div>

            <div style={{ minWidth: 92, padding: '10px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Баллы
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#d4af37' }}>
                {club.points}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <SummaryTile
              label="Кэшбэк"
              value={`${user?.rank.cashback || 0}%`}
              helper="Начисляется после оплаченных заказов."
              accent="#d4af37"
            />
            <SummaryTile
              label="Уровень привилегий"
              value={formatLevelLabel(club.level)}
              helper={nextLevel ? `До следующего уровня привилегий осталось ${Math.max(nextLevel.minXp - club.xp, 0)} баллов прогресса.` : 'Максимальный уровень привилегий уже открыт.'}
              accent="#93c5fd"
            />
            <SummaryTile
              label="Ваучеры"
              value={String(club.activeVouchers.length)}
              helper={club.activeVouchers.length > 0 ? 'Можно применять в новой заявке при подходящих условиях.' : 'Активных ваучеров пока нет.'}
              accent="#86efac"
            />
          </div>
        </SurfaceCard>

        <section style={{ marginBottom: 18 }}>
          <SectionTitle
            title="Что уже доступно"
            caption="Быстрый срез по текущей выгоде: баланс, ежедневный бонус и защита условий."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <SummaryTile
              label="Бонусный баланс"
              value={formatMoney(user?.bonus_balance || 0)}
              helper="Эти бонусы можно использовать при оплате заказов."
              accent="#d4af37"
            />
            <SummaryTile
              label="Ежедневный бонус"
              value={club.dailyBonus.status === 'available' ? 'Доступен' : `День ${club.dailyBonus.streakDay}`}
              helper={club.dailyBonus.status === 'available' ? 'Можно забрать на главной уже сейчас.' : 'Серия сохраняет темп начислений и помогает копить быстрее.'}
              accent="#fcd34d"
            />
            <SummaryTile
              label="Прозрачность"
              value="Все видно"
              helper="История начислений, ваучеры и правила собраны в отдельных разделах."
              accent="#c4b5fd"
            />
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <SectionTitle
            title="Как получить больше"
            caption="Это не абстрактные миссии. Ниже конкретные действия, которые дают баллы и ускоряют рост привилегий."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {featuredMissions.length > 0 ? (
              featuredMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onClick={() => handleMissionClick(mission)}
                />
              ))
            ) : (
              <SurfaceCard style={{ padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  Все быстрые шаги уже выполнены
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  Сейчас баллы продолжают копиться через ежедневный бонус, оплату заказов и ваучеры из каталога привилегий.
                </div>
              </SurfaceCard>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <SectionTitle
            title="На что можно потратить баллы"
            caption="Выберите полезную выгоду: оформление, скорость или скидку на опции. Все варианты открываются в каталоге."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {featuredRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                onClick={handleOpenRewards}
              />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <SectionTitle
            title="Сервисные разделы"
            caption="Здесь всё, что помогает пользоваться привилегиями без путаницы."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionLink
              icon={Ticket}
              label="Мои ваучеры"
              hint={club.activeVouchers.length > 0 ? `${club.activeVouchers.length} ваучеров уже доступны для применения.` : 'Смотрите активные, использованные и завершившиеся ваучеры.'}
              onClick={handleOpenVouchers}
            />
            <ActionLink
              icon={Wallet2}
              label="История начислений"
              hint="Все бонусы, обмены и движения по баллам в одном журнале."
              onClick={handleOpenHistory}
              accent="#93c5fd"
            />
            <ActionLink
              icon={ShieldCheck}
              label="Правила и условия"
              hint="Коротко и по делу: как работают баллы, уровни и применение ваучеров."
              onClick={() => setShowRules(true)}
              accent="#86efac"
            />
          </div>
        </section>

        <SurfaceCard style={{ padding: 18, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Gift size={20} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                Логика привилегий стала проще
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Статус клиента отвечает за кэшбэк и условия в профиле. Баллы привилегий отвечают за ваучеры, каталог бонусов и дополнительные опции. Эти две механики теперь разведены по смыслу и читаются отдельно.
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <ClubRulesSheet
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  )
}

export default ClubPage
