import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, AlertCircle, ChevronRight, Clock } from 'lucide-react'
// homeStyles removed — classes were undefined, causing unstyled CTA

/* ═══════════════════════════════════════════════════════════════════════════
   SUCCESS SCREEN — v2 «Receipt»

   Синтез трёх агентов:
   ─ UX:     Два пути (auto / manual), receipt-карта, «Оплатить» CTA
   ─ Visual: #ID как hero, gold confetti, staggered choreography
   ─ CRO:    Цена в кнопке, timeline для manual, обещание уведомления

   Принцип: экран подтверждения — не праздник, а мост.
   «Что заказал?» → «Сколько?» → «Что дальше?»
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Custom ease ───
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Stagger helper ───
function stagger(index: number) {
  return { delay: 0.15 + index * 0.08 }
}

// ─── Types ───
export interface SuccessScreenResult {
  ok: boolean
  msg: string
  id?: number
  promoUsed?: { code: string; discount: number } | null
  basePrice?: number
  isManual?: boolean
}

interface SuccessScreenProps {
  result: SuccessScreenResult
  loyaltyDiscount: number
  /** Service label (e.g. "Курсовая работа") */
  serviceLabel?: string
  /** Subject (e.g. "Макроэкономика") */
  subject?: string
  /** Deadline label (e.g. "Неделя") */
  deadlineLabel?: string
  /** Final estimate after all discounts */
  finalEstimate?: number | null
  /** Base estimate before discounts */
  baseEstimate?: number | null
}

export function SuccessScreen({
  result,
  loyaltyDiscount,
  serviceLabel,
  subject,
  deadlineLabel,
  finalEstimate,
  baseEstimate,
}: SuccessScreenProps) {
  const navigate = useNavigate()

  // ─── Derived data ───
  const promoUsed = result.promoUsed
  const savings = useMemo(() => {
    if (!baseEstimate || !promoUsed) return 0
    const afterLoyalty = baseEstimate * (1 - loyaltyDiscount / 100)
    return Math.round(afterLoyalty * (promoUsed.discount / 100))
  }, [baseEstimate, promoUsed, loyaltyDiscount])

  const loyaltySavings = useMemo(() => {
    if (!baseEstimate || loyaltyDiscount <= 0) return 0
    return Math.round(baseEstimate * (loyaltyDiscount / 100))
  }, [baseEstimate, loyaltyDiscount])

  const hasReceipt = !!serviceLabel && (!!finalEstimate || result.isManual)

  useEffect(() => {
    if (!result.ok) return
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      // Haptic is optional outside Telegram WebApp.
    }
  }, [result.ok])

  // ─── Error state ───
  if (!result.ok) {
    return (
      <div style={PAGE_STYLE}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={CENTER_STYLE}
        >
          <motion.section
            style={{
              ...CARD_STYLE,
              border: '1px solid rgba(239, 68, 68, 0.18)',
            }}
          >

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Error icon */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.15 }}
                style={errorCircleStyle}
              >
                <AlertCircle size={20} color="#121212" strokeWidth={2.5} />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...stagger(1) }}
                style={STATUS_LABEL}
              >
                Не удалось отправить
              </motion.div>

              {/* Error message */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT, ...stagger(2) }}
                style={SUBTITLE_STYLE}
              >
                {result.msg}
              </motion.p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...stagger(3) }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => navigate('/')}
                  style={{
                    width: '100%',
                    height: 56,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #D4AF37, #B38728)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px -8px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    color: '#121212',
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "'Manrope', sans-serif",
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>Вернуться на главную</span>
                  <ChevronRight size={18} strokeWidth={2.6} />
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Help text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...stagger(4) }}
            style={HELP_TEXT_STYLE}
          >
            Проверьте подключение и попробуйте ещё раз.
            Если ошибка повторится — напишите в поддержку из профиля.
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ─── Success: Auto-approved vs Manual ───
  const isManual = result.isManual

  return (
    <div style={PAGE_STYLE}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        style={CENTER_STYLE}
      >
        <motion.section
          className={`${homeStyles.voidGlass} ${homeStyles.primaryActionCard} ${homeStyles.returningOrderActionCard}`}
          style={{
            ...CARD_STYLE,
            border: '1px solid rgba(212, 175, 55, 0.14)',
          }}
        >
          <div className={homeStyles.primaryActionGlow} aria-hidden="true" />
          <div className={homeStyles.primaryActionShine} aria-hidden="true" />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* ─── Gold check stamp ─── */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.15 }}
              style={goldCircleStyle}
            >
              <Check size={24} color="#121212" strokeWidth={2.8} />
            </motion.div>

            {/* ─── Order number = HERO ─── */}
            {result.id && (
              <motion.div
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.2 }}
                style={ORDER_NUMBER_STYLE}
              >
                Заказ #{result.id}
              </motion.div>
            )}

            {/* ─── Status label ─── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ...stagger(2) }}
              style={STATUS_LABEL}
            >
              {isManual ? 'Принято!' : 'Готово!'}
            </motion.div>

            {/* ─── Context subtitle ─── */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT, ...stagger(3) }}
              style={SUBTITLE_STYLE}
            >
              {isManual
                ? 'Менеджер уже изучает вашу заявку. Пришлём точную стоимость в Telegram.'
                : 'Мы уже подобрали автора. После оплаты он сразу приступит к работе.'}
            </motion.p>

            {/* ─── Receipt card ─── */}
            {hasReceipt && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT, ...stagger(4) }}
                style={RECEIPT_CARD}
              >
                {/* Service + order number */}
                <div style={RECEIPT_ROW}>
                  <span style={RECEIPT_LABEL_BOLD}>{serviceLabel}</span>
                </div>

                {/* Subject */}
                {subject && (
                  <div style={RECEIPT_ROW}>
                    <span style={RECEIPT_LABEL}>Предмет</span>
                    <span style={RECEIPT_VALUE}>{subject}</span>
                  </div>
                )}

                {/* Deadline */}
                {deadlineLabel && (
                  <div style={RECEIPT_ROW}>
                    <span style={RECEIPT_LABEL}>Срок</span>
                    <span style={RECEIPT_VALUE}>{deadlineLabel}</span>
                  </div>
                )}

                {/* Price breakdown */}
                {!isManual && baseEstimate && finalEstimate && (
                  <>
                    <div style={RECEIPT_DIVIDER} />

                    {/* Base price */}
                    <div style={RECEIPT_ROW}>
                      <span style={RECEIPT_LABEL}>Стоимость</span>
                      <span style={RECEIPT_VALUE}>
                        {baseEstimate.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    {/* Loyalty discount */}
                    {loyaltySavings > 0 && (
                      <div style={RECEIPT_ROW}>
                        <span style={RECEIPT_LABEL}>Скидка {loyaltyDiscount}%</span>
                        <span style={{ ...RECEIPT_VALUE, color: 'rgba(212, 175, 55, 0.75)' }}>
                          −{loyaltySavings.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}

                    {/* Promo discount */}
                    {promoUsed && savings > 0 && (
                      <div style={RECEIPT_ROW}>
                        <span style={RECEIPT_LABEL}>Промокод {promoUsed.code}</span>
                        <span style={{ ...RECEIPT_VALUE, color: 'rgba(212, 175, 55, 0.75)' }}>
                          −{savings.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div style={RECEIPT_TOTAL_DIVIDER} />
                    <div style={RECEIPT_ROW}>
                      <span style={RECEIPT_TOTAL_LABEL}>Итого</span>
                      <span style={RECEIPT_TOTAL_VALUE}>
                        {finalEstimate.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </>
                )}

                {/* Manual review — estimated range */}
                {isManual && baseEstimate && (
                  <>
                    <div style={RECEIPT_DIVIDER} />
                    <div style={RECEIPT_ROW}>
                      <span style={RECEIPT_LABEL}>Предварительно</span>
                      <span style={{ ...RECEIPT_VALUE, color: 'rgba(212, 175, 55, 0.7)' }}>
                        ~{baseEstimate.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      Точная сумма — после проверки менеджером
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ─── Timeline (manual only) ─── */}
            {isManual && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT, ...stagger(5) }}
                style={TIMELINE_CONTAINER}
              >
                {/* Step 1: done */}
                <div style={TIMELINE_ROW}>
                  <div style={TIMELINE_DOT_ACTIVE} />
                  <span style={TIMELINE_TEXT_ACTIVE}>Заявка создана</span>
                  <span style={TIMELINE_TIME}>сейчас</span>
                </div>
                <div style={TIMELINE_LINE} />
                {/* Step 2: pending */}
                <div style={TIMELINE_ROW}>
                  <div style={TIMELINE_DOT_PENDING} />
                  <span style={TIMELINE_TEXT_PENDING}>Оценка менеджера</span>
                  <span style={TIMELINE_TIME}>~30 мин</span>
                </div>

                {/* Reassurance */}
                <div style={REASSURANCE_STYLE}>
                  <Clock size={12} style={{ opacity: 0.5, flexShrink: 0, marginTop: 1 }} />
                  Напишем вам в Telegram, когда заказ будет подтверждён.
                </div>
              </motion.div>
            )}

            {/* ─── CTAs ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
              {/* Primary CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...stagger(isManual ? 6 : 5) }}
                whileTap={{ scale: 0.975 }}
                onClick={() => {
                  if (isManual) {
                    navigate(result.id ? `/order/${result.id}` : '/orders')
                  } else {
                    navigate(result.id ? `/order/${result.id}` : '/orders')
                  }
                }}
                style={{
                  width: '100%',
                  height: 56,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #D4AF37, #B38728)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 32px -8px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  color: '#121212',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "'Manrope', sans-serif",
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>
                  {isManual
                    ? 'Открыть заказ'
                    : finalEstimate
                      ? `Оплатить ${finalEstimate.toLocaleString('ru-RU')} ₽`
                      : 'Перейти к оплате'}
                </span>
                <ChevronRight size={18} strokeWidth={2.6} />
              </motion.button>

              {/* Hairline divider */}
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  margin: '0 auto',
                }}
              />

              {/* Secondary: text link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...stagger(isManual ? 7 : 6) }}
                whileTap={{ scale: 0.975 }}
                onClick={() => navigate('/orders')}
                style={SECONDARY_BUTTON}
              >
                Перейти в мои заказы
              </motion.button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

const PAGE_STYLE: React.CSSProperties = {
  padding: 24,
  paddingBottom: 100,
  minHeight: '100vh',
  height: '100dvh',
  background: 'var(--bg-main)',
}

const CENTER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100%',
}

const CARD_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 420,
  padding: '32px 24px 24px',
  borderRadius: 12,
  overflow: 'hidden',
}

// ─── Gold check (36px) ───
const goldCircleStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #d4af37, #b38728)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  boxShadow: '0 0 32px -4px rgba(212, 175, 55, 0.5), 0 0 64px -8px rgba(212, 175, 55, 0.2)',
}

// ─── Error circle (36px) ───
const errorCircleStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 20px',
  boxShadow: '0 0 24px -4px rgba(239, 68, 68, 0.5)',
}

// ─── Order number hero ───
const ORDER_NUMBER_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.35)',
  textAlign: 'center',
  marginBottom: 4,
}

// ─── Status label — NOW the hero ───
const STATUS_LABEL: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'rgba(255, 255, 255, 0.95)',
  textAlign: 'center',
  marginBottom: 4,
}

// ─── Subtitle ───
const SUBTITLE_STYLE: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.6,
  color: 'rgba(212, 212, 216, 0.7)',
  textAlign: 'center',
  maxWidth: 280,
  margin: '0 auto 20px',
}

// ─── Receipt card ───
const RECEIPT_CARD: React.CSSProperties = {
  padding: 20,
  borderRadius: 16,
  background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.05), rgba(14, 13, 12, 0.88) 35%)',
  border: '1px solid rgba(212, 175, 55, 0.12)',
  marginBottom: 16,
  boxShadow: 'inset 0 1px 0 rgba(255, 248, 214, 0.04)',
}

const RECEIPT_ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 12,
  marginBottom: 4,
}

const RECEIPT_LABEL: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 400,
  color: 'rgba(255, 255, 255, 0.4)',
  fontFamily: "'Manrope', sans-serif",
}

const RECEIPT_LABEL_BOLD: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.85)',
  fontFamily: "'Manrope', sans-serif",
}

const RECEIPT_VALUE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.75)',
  fontFamily: "'Manrope', sans-serif",
  textAlign: 'right',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 180,
}

const RECEIPT_DIVIDER: React.CSSProperties = {
  height: 1,
  background: 'rgba(255, 255, 255, 0.06)',
  margin: '10px 0',
}

const RECEIPT_TOTAL_DIVIDER: React.CSSProperties = {
  height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.18), transparent)',
  margin: '12px 0',
}

const RECEIPT_TOTAL_LABEL: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 0.9)',
  fontFamily: "'Manrope', sans-serif",
}

const RECEIPT_TOTAL_VALUE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--gold-400, #d4af37)',
  fontFamily: "'JetBrains Mono', monospace",
}

// ─── Timeline ───
const TIMELINE_CONTAINER: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 12,
  background: 'rgba(212, 175, 55, 0.04)',
  border: '1px solid rgba(212, 175, 55, 0.08)',
  marginBottom: 4,
}

const TIMELINE_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const TIMELINE_DOT_ACTIVE: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#d4af37',
  flexShrink: 0,
}

const TIMELINE_DOT_PENDING: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  border: '1.5px solid rgba(255, 255, 255, 0.2)',
  background: 'transparent',
  flexShrink: 0,
}

const TIMELINE_LINE: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'rgba(255, 255, 255, 0.08)',
  marginLeft: 3.5,
}

const TIMELINE_TEXT_ACTIVE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.85)',
  flex: 1,
}

const TIMELINE_TEXT_PENDING: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.4)',
  flex: 1,
}

const TIMELINE_TIME: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: 'rgba(255, 255, 255, 0.3)',
  fontFamily: "'JetBrains Mono', monospace",
}

const REASSURANCE_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginTop: 12,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'rgba(255, 255, 255, 0.4)',
}

// ─── Buttons ───
const SECONDARY_BUTTON: React.CSSProperties = {
  minHeight: 48,
  padding: '0 18px',
  borderRadius: 14,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'Manrope', sans-serif",
  cursor: 'pointer',
  width: '100%',
}

const HELP_TEXT_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  marginTop: 12,
  fontSize: 12.5,
  lineHeight: 1.6,
  color: 'var(--text-muted)',
  textAlign: 'center',
}
