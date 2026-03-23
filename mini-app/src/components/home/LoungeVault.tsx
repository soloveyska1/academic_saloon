import type { CSSProperties } from 'react'
import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check, Coins, Copy, Crown, Percent, QrCode, Send, Star } from 'lucide-react'
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
}

function formatMoney(value: number): string {
  return `${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`
}

function VaultBlock({
  title,
  value,
  hint,
  accent,
  icon,
}: {
  title: string
  value: string
  hint?: string
  accent?: boolean
  icon: typeof Coins
}) {
  const Icon = icon

  return (
    <div
      style={{
        padding: '16px 16px 15px',
        borderRadius: 20,
        background: accent
          ? 'linear-gradient(180deg, rgba(212,175,55,0.10) 0%, rgba(255,255,255,0.03) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${accent ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${accent ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.06)'}`,
          marginBottom: 12,
        }}
      >
        <Icon size={17} color={accent ? 'var(--gold-300)' : 'var(--gold-400)'} strokeWidth={1.9} />
      </div>

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
        {title}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.05,
          color: accent ? 'var(--gold-300)' : 'var(--text-primary)',
          letterSpacing: '-0.04em',
          marginBottom: hint ? 6 : 0,
        }}
      >
        {value}
      </div>

      {hint && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--text-secondary)',
          }}
        >
          {hint}
        </div>
      )}
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
}: LoungeVaultProps) {
  const outerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    padding: 22,
    borderRadius: 30,
    background: 'linear-gradient(160deg, rgba(28, 22, 12, 0.98) 0%, rgba(13, 13, 14, 0.97) 46%, rgba(8, 8, 10, 1) 100%)',
    border: '1px solid rgba(212,175,55,0.12)',
    boxShadow: '0 30px 56px -40px rgba(0,0,0,0.86)',
  }

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
            top: -90,
            right: -52,
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
                  fontSize: 30,
                  lineHeight: 0.95,
                  letterSpacing: '-0.05em',
                  color: 'var(--text-primary)',
                  marginBottom: 0,
                }}
              >
                Привилегии клуба
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                minWidth: 110,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.34)',
                  marginBottom: 5,
                }}
              >
                Ваш статус
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: 'var(--gold-300)',
                }}
              >
                {rank.emoji} {rank.name}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <VaultBlock
              title="Кэшбэк"
              value={`${rank.cashback}%`}
              hint={rank.is_max ? 'Максимальный уровень открыт' : 'На новые заказы'}
              accent
              icon={Percent}
            />
            <VaultBlock
              title="Бонусы"
              value={formatMoney(bonusBalance)}
              hint={bonusBalance > 0 ? 'Доступны к списанию' : 'Появятся после начислений'}
              icon={Coins}
            />
          </div>

          <div
            style={{
              padding: '16px 16px 15px',
              borderRadius: 22,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <Crown size={16} color="var(--gold-300)" strokeWidth={1.8} />
                Клубный прогресс
              </div>

              {!rank.is_max && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--gold-300)',
                  }}
                >
                  {rank.progress}%
                </div>
              )}
            </div>

            {rank.is_max || !rank.next_rank ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 16,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.14)',
                  color: 'var(--gold-300)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Star size={15} strokeWidth={1.8} />
                Максимальный уровень уже открыт
              </div>
            ) : (
              <>
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
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                  }}
                >
                  До уровня <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{rank.next_rank}</span> осталось{' '}
                  <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}>{formatMoney(rank.spent_to_next)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.34)',
                marginBottom: 10,
              }}
            >
              Промокоды
            </div>
            <PromoCodeSection
              variant="full"
              collapsible
              defaultExpanded={false}
            />
          </div>

          <div
            style={{
              padding: '16px 16px 15px',
              borderRadius: 22,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(13,12,10,0.44) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
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
                  Приглашения
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Ваш код
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

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10 }}>
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
          </div>
        </div>
      </div>
    </motion.section>
  )
})
