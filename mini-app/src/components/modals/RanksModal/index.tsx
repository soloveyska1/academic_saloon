import { useMemo } from 'react'
import { m } from 'framer-motion'
import { ArrowRight, CheckCircle2, Crown, Lock } from 'lucide-react'
import { ModalWrapper } from '../shared'
import { RANKS, getRankIndexByCashback, getDisplayName } from '../../../lib/ranks'
import type { UserData } from '../../../types'

// ═══════════════════════════════════════════════════════════════════════════
//  RANKS MODAL — Achievement Journey
//  Not a boring timeline — a story of your progress.
//  Each rank is a destination with tangible benefits.
//  Active rank celebrates, locked ranks create desire.
// ═══════════════════════════════════════════════════════════════════════════

export interface RanksModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserData
  onCreateOrder?: () => void
}

// Per-rank flavor text — what makes each level special
const RANK_FLAVOR: Record<string, { tagline: string; perks: string[] }> = {
  resident: {
    tagline: 'Добро пожаловать в Салон',
    perks: ['Кэшбэк 3% на все заказы', 'Доступ к программе лояльности', 'Бесплатные правки'],
  },
  partner: {
    tagline: 'Вас уже знают по имени',
    perks: ['Кэшбэк 5% на все заказы', 'Приоритет при распределении авторов', 'Расширенные правки'],
  },
  vip: {
    tagline: 'Привилегии, которые чувствуются',
    perks: ['Кэшбэк 7% на все заказы', 'Высокий приоритет поддержки', 'Персональный менеджер'],
  },
  premium: {
    tagline: 'Максимум. Во всём',
    perks: ['Кэшбэк 10% на все заказы', 'VIP-поддержка 24/7', 'Индивидуальные условия'],
  },
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString('ru-RU')} ₽`
}

export function RanksModal({ isOpen, onClose, user, onCreateOrder }: RanksModalProps) {
  const displayRankName = useMemo(() => getDisplayName(user.rank.name), [user.rank.name])
  const currentRankIndex = useMemo(
    () => Math.max(getRankIndexByCashback(user.rank.cashback), 0),
    [user.rank.cashback],
  )
  const nextRank = RANKS[currentRankIndex + 1] || null
  const progress = Math.max(0, Math.min(user.rank.progress, 100))

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      modalId="ranks-modal"
      title="Путь клиента"
      accentColor="#D4AF37"
    >
      <div style={{ padding: '0 20px 20px' }}>

        {/* ═══════ HERO ═══════ */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', padding: '8px 0 28px' }}
        >
          <m.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              background: 'linear-gradient(145deg, rgba(212,175,55,0.16), rgba(212,175,55,0.04))',
              border: '1.5px solid rgba(212,175,55,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 22px',
              boxShadow: '0 24px 56px -14px rgba(212,175,55,0.22)',
            }}
          >
            <Crown size={36} color="rgba(212,175,55,0.72)" strokeWidth={1.3} />
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              fontFamily: "'Manrope', sans-serif",
              color: '#E8D5A3',
              marginBottom: 10,
            }}
          >
            Ваш путь в Салоне
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.42)',
              fontWeight: 500,
            }}
          >
            Сейчас вы —{' '}
            <span style={{ color: '#E8D5A3', fontWeight: 700 }}>
              {displayRankName}
            </span>
          </m.div>
        </m.div>

        {/* ═══════ RANK CARDS ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RANKS.map((rank, index) => {
            const Icon = rank.icon
            const isActive = index === currentRankIndex
            const isPassed = index < currentRankIndex
            const isLocked = index > currentRankIndex
            const flavor = RANK_FLAVOR[rank.id] || RANK_FLAVOR.resident

            return (
              <m.div
                key={rank.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2 + index * 0.08,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  padding: isActive ? '20px 18px' : '16px 18px',
                  borderRadius: 18,
                  background: isActive
                    ? `linear-gradient(135deg, ${rank.color}12 0%, ${rank.color}04 100%)`
                    : isPassed
                      ? 'rgba(34,197,94,0.03)'
                      : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? `1.5px solid ${rank.color}30`
                    : isPassed
                      ? '1px solid rgba(34,197,94,0.08)'
                      : '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Active rank glow accent */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 20,
                      right: 20,
                      height: 1.5,
                      background: `linear-gradient(90deg, transparent, ${rank.color}40, transparent)`,
                    }}
                  />
                )}

                {/* Header row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: isActive ? 14 : 0,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: isActive ? 48 : 40,
                    height: isActive ? 48 : 40,
                    borderRadius: isActive ? 16 : 12,
                    background: isLocked
                      ? 'rgba(255,255,255,0.04)'
                      : `linear-gradient(135deg, ${rank.color}20, ${rank.color}08)`,
                    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.06)' : `${rank.color}25`}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}>
                    <Icon
                      size={isActive ? 22 : 18}
                      color={isLocked ? 'rgba(255,255,255,0.15)' : rank.color}
                      strokeWidth={1.6}
                    />
                    {/* Passed checkmark */}
                    {isPassed && (
                      <div style={{
                        position: 'absolute',
                        bottom: -3,
                        right: -3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #09090b',
                      }}>
                        <CheckCircle2 size={10} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Title & cashback */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: isLocked
                          ? 'rgba(255,255,255,0.30)'
                          : isActive
                            ? 'rgba(255,255,255,0.90)'
                            : 'rgba(255,255,255,0.60)',
                        letterSpacing: '-0.01em',
                      }}>
                        {rank.displayName}
                      </div>
                      <div style={{
                        fontSize: isActive ? 20 : 16,
                        fontWeight: 800,
                        color: isLocked
                          ? 'rgba(255,255,255,0.12)'
                          : isActive
                            ? '#E8D5A3'
                            : 'rgba(255,255,255,0.40)',
                        fontFamily: "'Manrope', sans-serif",
                      }}>
                        {rank.cashback}%
                      </div>
                    </div>
                    {!isActive && (
                      <div style={{
                        fontSize: 12,
                        color: isLocked
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(255,255,255,0.30)',
                        marginTop: 2,
                      }}>
                        {isPassed ? 'Пройден' : `от ${formatMoney(rank.minSpent)}`}
                      </div>
                    )}
                  </div>

                  {/* Status badges */}
                  {isActive && (
                    <m.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.08, type: 'spring', damping: 12 }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 100,
                        background: 'rgba(212,175,55,0.12)',
                        border: '1px solid rgba(212,175,55,0.20)',
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#D4AF37',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        Сейчас
                      </span>
                    </m.div>
                  )}

                  {isLocked && (
                    <Lock size={14} color="rgba(255,255,255,0.12)" />
                  )}
                </div>

                {/* Active rank — expanded content */}
                {isActive && (
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                  >
                    {/* Tagline */}
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontStyle: 'italic',
                      color: `${rank.color}80`,
                      marginBottom: 12,
                    }}>
                      {flavor.tagline}
                    </div>

                    {/* Perks list */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}>
                      {flavor.perks.map(perk => (
                        <div
                          key={perk}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.50)',
                            fontWeight: 500,
                          }}
                        >
                          <div style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: `${rank.color}50`,
                            flexShrink: 0,
                          }} />
                          {perk}
                        </div>
                      ))}
                    </div>
                  </m.div>
                )}
              </m.div>
            )
          })}
        </div>

        {/* ═══════ PROGRESS TO NEXT ═══════ */}
        {nextRank && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: 20,
              padding: '18px 18px',
              borderRadius: 18,
              background: 'rgba(212,175,55,0.04)',
              border: '1px solid rgba(212,175,55,0.10)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.65)',
              }}>
                До «{nextRank.displayName}»
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#E8D5A3',
              }}>
                {formatMoney(user.rank.spent_to_next)}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progress, 3)}%` }}
                transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, rgba(212,175,55,0.5), #D4AF37)',
                }}
              />
            </div>

            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.28)',
              fontWeight: 500,
            }}>
              {progress}% пройдено — кэшбэк вырастет до {nextRank.cashback}%
            </div>
          </m.div>
        )}

        {/* Max rank */}
        {user.rank.is_max && (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            style={{
              marginTop: 20,
              padding: '22px 18px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.03))',
              border: '1px solid rgba(212,175,55,0.18)',
              textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#E8D5A3',
              marginBottom: 6,
            }}>
              Вы на вершине
            </div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.38)',
              lineHeight: 1.5,
            }}>
              Максимальный кэшбэк 10% активен. Все привилегии разблокированы
            </div>
          </m.div>
        )}

        {/* ═══════ CTA ═══════ */}
        {onCreateOrder && nextRank && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{ marginTop: 20 }}
          >
            <m.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => { onClose(); onCreateOrder() }}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))',
                border: '1px solid rgba(212,175,55,0.20)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#E8D5A3',
              }}>
                Оформить заказ
              </span>
              <ArrowRight size={16} color="#E8D5A3" />
            </m.button>
          </m.div>
        )}

      </div>
    </ModalWrapper>
  )
}
