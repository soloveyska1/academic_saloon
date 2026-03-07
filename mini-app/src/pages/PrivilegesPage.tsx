import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Gift,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { AVAILABLE_REWARDS, CLUB_LEVELS } from '../components/club/clubData'
import { useClub } from '../contexts/ClubContext'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { useUserData } from '../hooks/useUserData'
import { getDisplayName, getNextRank, RANKS } from '../lib/ranks'

function formatMoney(value: number | undefined | null): string {
  return (value || 0).toLocaleString('ru-RU')
}

function SectionToggle({
  title,
  subtitle,
  icon: Icon,
  open,
  onClick,
}: {
  title: string
  subtitle: string
  icon: typeof ShieldCheck
  open: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        width: '100%',
        padding: 18,
        borderRadius: 22,
        border: open ? '1px solid rgba(212,175,55,0.18)' : '1px solid rgba(255,255,255,0.06)',
        background: open
          ? 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(15,15,18,0.96) 100%)'
          : 'rgba(18,18,21,0.9)',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="#d4af37" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {subtitle}
          </div>
        </div>

        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
        </motion.div>
      </div>
    </motion.button>
  )
}

function ValueCard({
  eyebrow,
  value,
  description,
  accent = '#d4af37',
}: {
  eyebrow: string
  value: string
  description: string
  accent?: string
}) {
  return (
    <div
      style={{
        minHeight: 132,
        padding: 16,
        borderRadius: 20,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.44)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {eyebrow}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.1, marginBottom: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {description}
      </div>
    </div>
  )
}

function BenefitRow({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 700,
          color: '#f5e6a3',
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.16)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function RewardPreview({
  title,
  cost,
  description,
}: {
  title: string
  cost: number
  description: string
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#d4af37',
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.14)',
            flexShrink: 0,
          }}
        >
          {cost} баллов
        </div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {description}
      </div>
    </div>
  )
}

const PrivilegesHeader = memo(function PrivilegesHeader({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 0',
        marginBottom: 8,
      }}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <ArrowLeft size={18} color="rgba(255,255,255,0.72)" />
      </motion.button>

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(212,175,55,0.72)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Привилегии
        </div>
        <div
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
          Что уже работает на вас
        </div>
      </div>
    </motion.div>
  )
})

function PrivilegesPage() {
  const club = useClub()
  const { userData } = useUserData()
  const navigate = useNavigate()
  const handleBack = useSafeBackNavigation('/club')
  const [openSection, setOpenSection] = useState<'now' | 'points' | 'next'>('now')

  const currentCashback = userData?.rank?.cashback || 0
  const currentRankLabel = getDisplayName(userData?.rank?.name || '') || 'Резидент'
  const nextRank = getNextRank(currentCashback)
  const activeVoucherCount = club.activeVouchers.length
  const featuredRewards = useMemo(() => AVAILABLE_REWARDS.slice(0, 3), [])
  const nextLevel = CLUB_LEVELS[club.level]
  const levelLabel = nextLevel?.name || 'Серебряный клуб'
  const nextRankProgress = Math.max(0, Math.min(100, userData?.rank?.progress || 0))
  const nextRankLeft = userData?.rank?.spent_to_next || 0
  const dailyBonusAvailable = club.dailyBonus.status === 'available'

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0a0a0c',
      }}
    >
      <PremiumBackground variant="gold" intensity="subtle" interactive={false} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px 120px',
        }}
      >
        <PrivilegesHeader onBack={handleBack} />

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 20,
            borderRadius: 28,
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.11) 0%, rgba(18,18,21,0.95) 50%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(212,175,55,0.16)',
            boxShadow: '0 20px 44px -32px rgba(212,175,55,0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  marginBottom: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#f5e6a3',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Crown size={14} />
                {currentRankLabel}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
                Кэшбэк {currentCashback}% и понятная выгода по каждому заказу
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: 420 }}>
                Статус клиента влияет на кэшбэк и условия по заказам, а баллы привилегий можно обменять на ваучеры и полезные опции.
              </div>
            </div>

            <div
              style={{
                minWidth: 112,
                padding: '16px 14px',
                borderRadius: 22,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Баллы
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#d4af37', lineHeight: 1 }}>
                {club.points}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)', marginTop: 10 }}>
                можно обменять на ваучеры
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <ValueCard
              eyebrow="Кэшбэк"
              value={`${currentCashback}%`}
              description="Начисляется после оплаченных заказов и остаётся в вашем профиле."
            />
            <ValueCard
              eyebrow="Баланс бонусов"
              value={`${formatMoney(userData?.balance)} ₽`}
              description="Можно использовать в следующих заявках, когда это доступно."
              accent="#7dd3fc"
            />
            <ValueCard
              eyebrow="Активные ваучеры"
              value={String(activeVoucherCount)}
              description={activeVoucherCount > 0 ? 'Открывайте мои ваучеры и применяйте их к новым заказам.' : 'Сейчас активных ваучеров нет, но их можно открыть за баллы.'}
              accent="#86efac"
            />
            <ValueCard
              eyebrow="Ежедневный бонус"
              value={dailyBonusAvailable ? 'Доступен' : `День ${club.dailyBonus.streakDay}`}
              description={dailyBonusAvailable ? 'Заберите баллы сегодня и ускорьте путь к ваучерам.' : 'Серия уже идёт. Возвращайтесь, чтобы не сбить ритм.'}
              accent="#f9a8d4"
            />
          </div>
        </motion.section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionToggle
            title="Что уже доступно сейчас"
            subtitle="Текущий статус клиента, кэшбэк, бонусный баланс и активные выгоды."
            icon={ShieldCheck}
            open={openSection === 'now'}
            onClick={() => setOpenSection('now')}
          />

          {openSection === 'now' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: -4,
                padding: '0 18px 8px',
                borderRadius: 22,
                background: 'rgba(18,18,21,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <BenefitRow
                title="Статус клиента"
                value={currentRankLabel}
                subtitle="Отвечает за кэшбэк и условия по заказам в профиле."
              />
              <BenefitRow
                title="Уровень привилегий"
                value={levelLabel}
                subtitle="Определяет, сколько баллов вы уже накопили и что можно открыть в каталоге."
              />
              <BenefitRow
                title="Активный ваучер"
                value={club.activeVouchers[0]?.title || 'Пока нет'}
                subtitle={club.activeVouchers[0]?.applyRules || 'Откройте ваучер за баллы, чтобы добавить выгоду к следующему заказу.'}
              />
            </motion.section>
          )}

          <SectionToggle
            title="Баллы и ваучеры"
            subtitle="Как быстро превратить баллы в ощутимую выгоду и полезные опции."
            icon={Ticket}
            open={openSection === 'points'}
            onClick={() => setOpenSection('points')}
          />

          {openSection === 'points' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: -4,
                padding: 18,
                borderRadius: 22,
                background: 'rgba(18,18,21,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                Самые полезные варианты на старте
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Баллы привилегий удобнее всего обменивать на ускорение, оформление и скидочные ваучеры под конкретный заказ.
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                {featuredRewards.map(reward => (
                  <RewardPreview
                    key={reward.id}
                    title={reward.title}
                    cost={reward.costPoints}
                    description={reward.description}
                  />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/club/vouchers')}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f4f4f5',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Мои ваучеры
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/club/rewards')}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: 'none',
                    background: 'var(--gold-metallic)',
                    color: '#090909',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Каталог бонусов
                </motion.button>
              </div>
            </motion.section>
          )}

          <SectionToggle
            title="Следующий статус и рост выгоды"
            subtitle="Сколько осталось до следующего уровня и что он добавит к вашей выгоде."
            icon={TrendingUp}
            open={openSection === 'next'}
            onClick={() => setOpenSection('next')}
          />

          {openSection === 'next' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: -4,
                padding: 18,
                borderRadius: 22,
                background: 'rgba(18,18,21,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {nextRank ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Sparkles size={16} color="#d4af37" />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      До статуса «{nextRank.displayName}» осталось {formatMoney(nextRankLeft)} ₽
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Следующий статус повысит кэшбэк до {nextRank.cashback}% и усилит условия по заказам.
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.08)',
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: `${nextRankProgress}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #f5e6a3 0%, #d4af37 100%)',
                      }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  У вас уже максимальный статус. Сейчас лучшее, что можно делать дальше, это использовать баллы привилегий на ваучеры и точечно усиливать новые заказы.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {RANKS.map(rank => (
                  <div
                    key={rank.id}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      background: rank.cashback === currentCashback
                        ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(18,18,21,0.96) 100%)'
                        : 'rgba(255,255,255,0.035)',
                      border: rank.cashback === currentCashback
                        ? '1px solid rgba(212,175,55,0.18)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <rank.icon size={16} color={rank.color} />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
                        {rank.displayName}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: rank.color, marginBottom: 6 }}>
                      {rank.cashback}%
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                      Кэшбэк на оплаченные заказы
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={{
            marginTop: 16,
            padding: 18,
            borderRadius: 24,
            background: 'rgba(18,18,21,0.88)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Gift size={18} color="#d4af37" />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              Как забирать максимум выгоды
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <SurfaceRow
              icon={Wallet}
              title="Оплачивайте заказы через приложение"
              subtitle="Так растёт ваш статус клиента и возвращается кэшбэк."
            />
            <SurfaceRow
              icon={Star}
              title="Забирайте ежедневный бонус и миссии"
              subtitle="Баллы привилегий накапливаются заметно быстрее, когда заходите регулярно."
            />
            <SurfaceRow
              icon={Zap}
              title="Тратьте баллы точечно"
              subtitle="Лучше открывать ваучер под конкретный заказ, когда он даёт понятную пользу здесь и сейчас."
            />
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function SurfaceRow({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Wallet
  title: string
  subtitle: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color="#d4af37" />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {subtitle}
        </div>
      </div>
    </div>
  )
}

export default PrivilegesPage
