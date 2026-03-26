import { memo, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ShieldCheck, RefreshCcw, Clock, EyeOff } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, title: 'Каждая работа — с нуля', desc: 'Оригинальный текст, от 80% уникальности' },
  { icon: RefreshCcw, title: 'Правки без ограничений', desc: 'Дорабатываем до полного соответствия' },
  { icon: Clock, title: 'Всегда в срок', desc: 'Дедлайн фиксируется до начала работы' },
  { icon: EyeOff, title: 'Полная конфиденциальность', desc: 'Данные защищены, работы не публикуются' },
]

const EASE = [0.16, 1, 0.3, 1] as unknown as number[]

/* ─── Animated counter ─── */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1800
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, value])

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display.toLocaleString('ru-RU')}{suffix}
    </span>
  )
}

export const WhyTrustUs = memo(function WhyTrustUs() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={sectionRef}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: EASE }}
      style={{ marginBottom: 32 }}
    >
      {/* Header with counter */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, paddingLeft: 2, paddingRight: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={12} color="var(--gold-400)" strokeWidth={2} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(212,175,55,0.50)',
          }}>
            Гарантии
          </span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(212,175,55,0.40)',
            letterSpacing: '0.02em',
          }}
        >
          <AnimatedCounter value={2000} />+ проектов
        </motion.span>
      </div>

      {/* Clean list — no container card, just items with dividers */}
      {ITEMS.map((item, i) => {
        const Icon = item.icon
        return (
          <div key={item.title}>
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 2px',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} strokeWidth={1.8} color="#D4AF37" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2 }}>
                  {item.desc}
                </div>
              </div>
            </motion.div>
            {i < ITEMS.length - 1 && (
              <div style={{
                height: 1, marginLeft: 56,
                background: 'linear-gradient(90deg, rgba(212,175,55,0.12) 0%, transparent 80%)',
              }} />
            )}
          </div>
        )
      })}
    </motion.div>
  )
})
