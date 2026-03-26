import { memo } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, RefreshCcw, Clock, EyeOff, Banknote } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, title: 'Каждая работа — с нуля', desc: 'Оригинальный текст, от 80% уникальности' },
  { icon: RefreshCcw, title: 'Правки без ограничений', desc: 'Дорабатываем бесплатно до полного соответствия' },
  { icon: Clock, title: 'Всегда в срок', desc: 'Дедлайн фиксируется до начала работы' },
  { icon: EyeOff, title: 'Полная конфиденциальность', desc: 'Данные защищены, работы не публикуются' },
  { icon: Banknote, title: 'Возврат до старта', desc: 'Оплата только после согласования условий' },
]

export const WhyTrustUs = memo(function WhyTrustUs() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, paddingLeft: 2,
      }}>
        <ShieldCheck size={12} color="var(--gold-400)" strokeWidth={2} />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          Почему нам доверяют
        </span>
      </div>

      {/* Card container */}
      <div style={{
        borderRadius: 12, padding: '4px 16px',
        background: 'rgba(212,175,55,0.02)',
        border: '1px solid rgba(212,175,55,0.06)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}>
        {/* Top shine line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.10) 50%, transparent 90%)',
          pointerEvents: 'none',
        }} />
        {ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={item.title}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(212,175,55,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} color="var(--gold-400)" />
                </motion.div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2 }}>
                    {item.desc}
                  </div>
                </div>
              </motion.div>
              {i < ITEMS.length - 1 && (
                <div style={{
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.08) 20%, rgba(212,175,55,0.08) 80%, transparent 100%)',
                }} />
              )}
            </div>
          )
        })}
        {/* Social proof anchor */}
        <div style={{
          marginTop: 12, textAlign: 'center',
          fontSize: 11, fontWeight: 600, color: 'rgba(212,175,55,0.30)',
          letterSpacing: '0.02em',
        }}>
          Более 2 000 выполненных проектов
        </div>
      </div>
    </motion.div>
  )
})
