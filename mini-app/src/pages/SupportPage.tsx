import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Headphones, ShieldCheck } from 'lucide-react'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import { SupportChat } from '../components/support/SupportChat'
import { useTelegram } from '../hooks/useUserData'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { SUPPORT_TELEGRAM_URL } from '../lib/appLinks'

function SupportFeature({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {description}
      </div>
    </div>
  )
}

export function SupportPage() {
  const { haptic } = useTelegram()
  const safeBack = useSafeBackNavigation('/')

  const handleBack = useCallback(() => {
    haptic('light')
    safeBack()
  }, [haptic, safeBack])

  const handleOpenTelegram = useCallback(() => {
    haptic('medium')
    window.open(SUPPORT_TELEGRAM_URL, '_blank', 'noopener,noreferrer')
  }, [haptic])

  return (
    <div
      className="page-full-width"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
      }}
    >
      <div className="page-background">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>

      <div
        className="page-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          paddingBottom: 120,
        }}
      >
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
                Поддержка
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
                Поможем по каждому заказу
              </h1>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  maxWidth: 360,
                }}
              >
                Здесь можно быстро решить вопрос по оплате, срокам, правкам, файлам или открыть прямой канал техподдержки в Telegram.
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenTelegram}
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
            <ExternalLink size={16} />
            Telegram
          </motion.button>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: 24,
            padding: 18,
            marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(18,18,21,0.97) 55%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(212,175,55,0.16)',
            boxShadow: '0 20px 42px -36px rgba(212, 175, 55, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Headphones size={22} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Техподдержка Academic Saloon
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Отвечаем в чате мини-приложения и в Telegram. Если вопрос срочный, лучше сразу открыть внешний канал.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <SupportFeature
              title="Оперативно"
              description="Обычно отвечаем в течение 10 минут в рабочем потоке."
            />
            <SupportFeature
              title="По делу"
              description="Помогаем с оплатой, сроками, правками, файлами и навигацией."
            />
            <SupportFeature
              title="Без потерь"
              description="Переписка сохраняется, поэтому к вопросу можно вернуться позже."
            />
            <SupportFeature
              title="Есть Telegram"
              description="@Thisissaymoon для случаев, когда удобнее перейти во внешний чат."
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            flex: 1,
            minHeight: 0,
            borderRadius: 26,
            overflow: 'hidden',
            background: 'rgba(12,12,15,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 24px 46px -36px rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '16px 18px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#d4af37" />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>
                  Чат поддержки
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  Пишите коротко и по сути, чтобы решить вопрос быстрее.
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <SupportChat />
          </div>
        </motion.section>
      </div>
    </div>
  )
}
