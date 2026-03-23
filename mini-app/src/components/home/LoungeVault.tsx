import type { CSSProperties, ReactNode } from 'react'
import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Crown, Percent, QrCode, Send, Sparkles } from 'lucide-react'
import { PromoCodeSection } from '../ui/PromoCodeSection'

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
  bonusBalance: number
  referralCode: string
  referralsCount: number
  referralEarnings: number
  copied: boolean
  onCopy: () => void
  onShowQR: () => void
  onTelegramShare: () => void
  alertPanel?: ReactNode
  bonusPanel?: ReactNode
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
}

function CompactStat({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: '15px 14px 14px',
        borderRadius: 20,
        background: accent
          ? 'linear-gradient(180deg, rgba(212,175,55,0.10) 0%, rgba(255,255,255,0.03) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${accent ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.34)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 19,
          fontWeight: 700,
          lineHeight: 1.05,
          color: accent ? 'var(--gold-300)' : 'var(--text-primary)',
          letterSpacing: '-0.04em',
          marginBottom: 6,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          color: 'var(--text-secondary)',
        }}
      >
        {note}
      </div>
    </div>
  )
}

export const LoungeVault = memo(function LoungeVault({
  rank,
  bonusBalance,
  referralCode,
  referralsCount,
  referralEarnings,
  copied,
  onCopy,
  onShowQR,
  onTelegramShare,
  alertPanel,
  bonusPanel,
}: LoungeVaultProps) {
  const outerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    padding: 22,
    borderRadius: 30,
    background: 'linear-gradient(160deg, rgba(27, 21, 12, 0.98) 0%, rgba(12, 12, 13, 0.97) 48%, rgba(8, 8, 10, 1) 100%)',
    border: '1px solid rgba(212,175,55,0.12)',
    boxShadow: '0 30px 56px -40px rgba(0,0,0,0.86)',
  }

  const accessValue = rank.is_max ? 'Полный' : formatMoney(rank.spent_to_next)
  const accessNote = rank.is_max
    ? 'Все привилегии активны'
    : 'До следующего доступа'

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 18 }}
    >
      <div style={outerStyle}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -86,
            right: -54,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 30%, transparent 74%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(212,175,55,0.72)',
                  marginBottom: 8,
                }}
              >
                Клуб
              </div>

              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 31,
                  lineHeight: 0.95,
                  letterSpacing: '-0.05em',
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                Ваши привилегии
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  maxWidth: 280,
                }}
              >
                {rank.is_max
                  ? 'Все привилегии уже доступны.'
                  : `До следующего доступа осталось ${formatMoney(rank.spent_to_next)}.`}
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 18,
                background: 'rgba(18, 16, 12, 0.72)',
                border: '1px solid rgba(212,175,55,0.14)',
                color: 'var(--gold-300)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              <Percent size={14} strokeWidth={2} />
              {rank.cashback}% кэшбэк
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              padding: 18,
              borderRadius: 24,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(15,13,10,0.58) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 14,
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 16,
                top: 4,
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: 132,
                lineHeight: 0.85,
                color: 'rgba(212,175,55,0.05)',
                letterSpacing: '-0.08em',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              %
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                <Sparkles size={15} color="var(--gold-300)" strokeWidth={1.9} />
                Бонусный баланс
              </div>

              <div
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  fontSize: 42,
                  lineHeight: 0.92,
                  letterSpacing: '-0.06em',
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                {formatMoney(bonusBalance)}
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  maxWidth: 280,
                  marginBottom: 16,
                }}
              >
                Бонусы списываются при оплате новых заказов и работают вместе с кэшбэком.
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <CompactStat
                  label="Кэшбэк"
                  value={`${rank.cashback}%`}
                  note="На новые заказы"
                  accent
                />
                <CompactStat
                  label="Доступ"
                  value={accessValue}
                  note={accessNote}
                />
              </div>

              {rank.is_max ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.14)',
                    color: 'var(--gold-300)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Crown size={15} strokeWidth={1.9} />
                  Полный доступ активен
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                      marginBottom: 10,
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, rank.progress)}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, rgba(212,175,55,0.95), rgba(245,225,160,0.8))',
                        boxShadow: '0 10px 20px -16px rgba(212,175,55,0.5)',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>Прогресс доступа</span>
                    <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}>{rank.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(alertPanel || bonusPanel) && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              {alertPanel}
              {bonusPanel}
            </div>
          )}

          <div
            style={{
              padding: 18,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.34)',
                    marginBottom: 6,
                  }}
                >
                  Коды и приглашения
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  Делитесь кодом и открывайте новые скидки
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Код можно скопировать, отправить в Telegram или показать как QR.
                </div>
              </div>

              {(referralsCount > 0 || referralEarnings > 0) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {referralsCount > 0 && (
                    <div
                      style={{
                        padding: '7px 10px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {referralsCount} приглаш.
                    </div>
                  )}
                  {referralEarnings > 0 && (
                    <div
                      style={{
                        padding: '7px 10px',
                        borderRadius: 999,
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.14)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--gold-300)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{formatMoney(referralEarnings)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, marginBottom: 16 }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onCopy}
                style={{
                  minWidth: 0,
                  padding: '14px 16px',
                  borderRadius: 20,
                  border: '1px solid rgba(212,175,55,0.14)',
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--gold-300)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referralCode}
                </span>
                {copied ? (
                  <Check size={18} color="var(--success-text)" strokeWidth={1.9} />
                ) : (
                  <Copy size={18} color="var(--text-secondary)" strokeWidth={1.9} />
                )}
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onTelegramShare}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 20,
                  border: '1px solid rgba(212,175,55,0.14)',
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--gold-300)',
                }}
              >
                <Send size={19} strokeWidth={1.8} />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onShowQR}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 20,
                  border: '1px solid rgba(212,175,55,0.14)',
                  background: 'rgba(212,175,55,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--gold-300)',
                }}
              >
                <QrCode size={20} strokeWidth={1.8} />
              </motion.button>
            </div>

            <PromoCodeSection
              variant="full"
              collapsible
              defaultExpanded={false}
            />
          </div>
        </div>
      </div>
    </motion.section>
  )
})
