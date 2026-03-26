import { memo, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ShieldCheck, Stamp } from 'lucide-react'

/**
 * GuaranteeCertificate — A visual "guarantee document" with a wax-seal stamp effect.
 *
 * Looks like a luxury physical certificate: parchment-toned card, serif font,
 * gold border, and an animated wax-seal stamp that presses in on scroll.
 * No other academic service has anything like this — it signals premium quality
 * and builds instant trust.
 */
export const GuaranteeCertificate = memo(function GuaranteeCertificate() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 24 }}
    >
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14, paddingLeft: 2,
      }}>
        <Stamp size={12} color="var(--gold-400)" strokeWidth={2} />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(212,175,55,0.50)',
        }}>
          Гарантийный сертификат
        </span>
      </div>

      {/* Certificate card */}
      <div style={{
        position: 'relative',
        padding: '24px 20px 20px',
        borderRadius: 14,
        background: 'linear-gradient(170deg, rgba(22,20,14,0.98) 0%, rgba(12,11,10,0.99) 100%)',
        border: '1px solid rgba(212,175,55,0.14)',
        boxShadow: '0 12px 40px -16px rgba(0,0,0,0.6), 0 1px 0 rgba(212,175,55,0.06) inset',
        overflow: 'hidden',
      }}>
        {/* Double gold border inset effect */}
        <div style={{
          position: 'absolute', inset: 6, borderRadius: 10,
          border: '1px solid rgba(212,175,55,0.06)',
          pointerEvents: 'none',
        }} />

        {/* Top ornament line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.15) 50%, transparent 95%)',
          pointerEvents: 'none',
        }} />

        {/* Title */}
        <div style={{
          textAlign: 'center', marginBottom: 16,
          fontFamily: "var(--font-display, 'Playfair Display', serif)",
          fontSize: 16, fontWeight: 700, letterSpacing: '0.04em',
          color: 'var(--gold-400, #D4AF37)',
        }}>
          Сертификат гарантий
        </div>

        {/* Divider */}
        <div style={{
          width: 60, height: 1, margin: '0 auto 14px',
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
        }} />

        {/* Guarantee items */}
        {[
          'Бесплатные правки до защиты',
          'Возврат средств до начала работы',
          'Уникальность от 80% по Антиплагиат',
          'Строгое соблюдение дедлайна',
        ].map((text, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -8 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0',
            }}
          >
            <ShieldCheck size={13} strokeWidth={1.8} color="var(--gold-400)" style={{ flexShrink: 0 }} />
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: 'rgba(245,235,220,0.75)',
              lineHeight: 1.4,
            }}>
              {text}
            </span>
          </motion.div>
        ))}

        {/* Wax seal stamp — animated press-in on scroll */}
        <motion.div
          initial={{ scale: 1.3, opacity: 0, rotate: -15 }}
          animate={isInView
            ? { scale: 1, opacity: 1, rotate: 0 }
            : { scale: 1.3, opacity: 0, rotate: -15 }
          }
          transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 60%, transparent 100%)',
            border: '2px solid rgba(212,175,55,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px -4px rgba(212,175,55,0.15), inset 0 1px 2px rgba(212,175,55,0.10)',
          }}
        >
          <div style={{
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--gold-400, #D4AF37)',
            letterSpacing: '0.06em',
            textAlign: 'center',
            lineHeight: 1.1,
          }}>
            AC
            <div style={{
              fontSize: 7, fontWeight: 600,
              color: 'rgba(212,175,55,0.50)',
              letterSpacing: '0.1em',
              marginTop: 1,
            }}>
              2020
            </div>
          </div>
        </motion.div>

        {/* Bottom signature line */}
        <div style={{
          marginTop: 14, paddingTop: 10,
          borderTop: '1px solid rgba(212,175,55,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600,
            fontStyle: 'italic',
            fontFamily: "var(--font-display, 'Playfair Display', serif)",
            color: 'rgba(212,175,55,0.30)',
          }}>
            Академический Салон
          </span>
          <span style={{
            fontSize: 9, fontWeight: 600,
            color: 'rgba(212,175,55,0.20)',
            letterSpacing: '0.06em',
          }}>
            Действует бессрочно
          </span>
        </div>
      </div>
    </motion.div>
  )
})
