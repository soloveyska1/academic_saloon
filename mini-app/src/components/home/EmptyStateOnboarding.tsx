import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Clock, RotateCcw, CheckCircle2, GraduationCap, FileText, Sparkles } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  TRUST & SOCIAL PROOF SECTION — Replaces old process instructions
//  Purpose: eliminate fears, build trust, show proof of results
//  Psychology: fear reduction → social conformity → action
// ═══════════════════════════════════════════════════════════════════════════

const GUARANTEES = [
  {
    icon: ShieldCheck,
    label: 'Уникальность',
    detail: 'от 70%',
  },
  {
    icon: Clock,
    label: 'Точно в срок',
    detail: 'или возврат',
  },
  {
    icon: RotateCcw,
    label: 'Бесплатные',
    detail: 'правки',
  },
] as const

// Anonymized recent order completions for social proof
const RECENT_ORDERS = [
  {
    icon: GraduationCap,
    type: 'Курсовая',
    subject: 'Финансовый менеджмент',
    result: 'Отлично',
  },
  {
    icon: FileText,
    type: 'Реферат',
    subject: 'Гражданское право',
    result: 'Зачёт',
  },
  {
    icon: Sparkles,
    type: 'Дипломная',
    subject: 'Маркетинг',
    result: 'Отлично',
  },
] as const

export const EmptyStateOnboarding = memo(function EmptyStateOnboarding() {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ── Guarantee Trio ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {GUARANTEES.map((g, i) => {
          const Icon = g.icon
          return (
            <motion.div
              key={g.label}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.16 + i * 0.06 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '14px 8px 12px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,175,55,0.12)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={17} color="var(--gold-400)" strokeWidth={2} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    lineHeight: 1.2,
                  }}
                >
                  {g.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gold-400)',
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {g.detail}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Social Proof: Recent Results ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          padding: '14px 16px 12px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 10,
          }}
        >
          Недавние результаты
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {RECENT_ORDERS.map((order, i) => {
            const Icon = order.icon
            return (
              <motion.div
                key={order.subject}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.36 + i * 0.07 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < RECENT_ORDERS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <Icon size={15} color="var(--gold-400)" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {order.type} · {order.subject}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={12} color="#22c55e" strokeWidth={2.5} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#22c55e',
                    }}
                  >
                    {order.result}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── Bottom reassurance ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          padding: '0 8px',
        }}
      >
        Оплата только после согласования деталей и цены
      </motion.div>
    </div>
  )
})
