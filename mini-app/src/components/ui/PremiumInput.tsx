import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM INPUT v2 — Stripe Checkout / Revolut / iOS native feel

   Design DNA:
   ┌─────────────────────────────────────────────────────────────────┐
   │  Stripe:   Borderless filled surface, minimal chrome,          │
   │            grouped inputs share one card with hairline dividers │
   │  Revolut:  Smooth background-color focus transition,           │
   │            floating label with spring animation                │
   │  iOS:      -webkit-appearance: none, 16px min font (no zoom),  │
   │            momentum-scroll compatible, no box-shadow outlines  │
   │  Material: Filled variant — no outer border, bottom accent     │
   │            line scales from center on focus                    │
   │  Telegram: Gold accent color, WebView-safe (no backdrop-filter │
   │            on inputs — it causes compositing bugs)             │
   └─────────────────────────────────────────────────────────────────┘

   Key rules:
   - NO outer border — the field lives inside a card/group, no double-rect
   - Bottom-line accent on focus (Material Design 3 "filled" variant)
   - Floating label: rests as placeholder, lifts on focus/value
   - Gold glow on focus — subtle, not neon
   - 16px font-size minimum — prevents iOS zoom on focus
   - Telegram WebView safe: no -webkit-appearance bugs
   - All motion via GPU transforms (translateY + scale), zero layout shift
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Reduced motion detection ───
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

// ─── Animation presets ───
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 26, mass: 0.7 }
const SPRING_FAST = prefersReducedMotion ? { duration: 0.01 } : SPRING
const EASE_SMOOTH = {
  duration: prefersReducedMotion ? 0.01 : 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM INPUT (single-line)
   ═══════════════════════════════════════════════════════════════════════════ */

interface PremiumInputProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  /** Optional icon (lucide-react component rendered at 16px) */
  icon?: React.ReactNode
  /** Show as tappable selector (right chevron, onClick instead of typing) */
  asTrigger?: boolean
  onClick?: () => void
  /** Display value when used as trigger (e.g. "5 requirements selected") */
  displayValue?: string
  type?: string
  autoCapitalize?: string
  autoCorrect?: string
  maxLength?: number
}

export function PremiumInput({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  icon,
  asTrigger = false,
  onClick,
  displayValue,
  type = 'text',
  autoCapitalize = 'sentences',
  autoCorrect = 'on',
  maxLength,
}: PremiumInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = !!(value || displayValue)
  const isLifted = focused || hasValue

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setFocused(false)
  }, [])

  // If asTrigger, the whole container is tappable
  const Container = asTrigger ? 'button' : 'div'

  return (
    <Container
      type={asTrigger ? 'button' : undefined}
      onClick={asTrigger ? onClick : undefined}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 56,
        borderRadius: 12,
        // Stripe-style filled surface — NO border, just subtle bg shift
        background: focused
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(255, 255, 255, 0.035)',
        border: 'none',
        outline: 'none',
        cursor: asTrigger ? 'pointer' : undefined,
        textAlign: 'left' as const,
        padding: 0,
        // Smooth 300ms background transition (Revolut-style)
        transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ─── Bottom accent line (gold, scales from center on focus) ─── */}
      <motion.div
        initial={false}
        animate={{
          scaleX: focused ? 1 : 0,
          opacity: focused ? 1 : 0,
        }}
        transition={SPRING_FAST}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, var(--gold-400) 20%, var(--gold-300) 50%, var(--gold-400) 80%, transparent 100%)',
          transformOrigin: 'center',
          borderRadius: '0 0 12px 12px',
          willChange: 'transform, opacity',
        }}
      />

      {/* ─── Soft gold underglow on focus (fintech glow effect) ─── */}
      <motion.div
        initial={false}
        animate={{ opacity: focused ? 1 : 0 }}
        transition={EASE_SMOOTH}
        style={{
          position: 'absolute',
          bottom: -1,
          left: '8%',
          right: '8%',
          height: 24,
          background: 'radial-gradient(ellipse at bottom, rgba(212, 175, 55, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ─── Content layout ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: icon ? '0 16px 0 14px' : '0 16px',
          minHeight: 56,
        }}
      >
        {/* Optional left icon — color transitions on focus */}
        {icon && (
          <motion.div
            initial={false}
            animate={{
              color: focused ? 'var(--gold-400)' : 'var(--text-muted)',
              opacity: focused ? 1 : 0.5,
            }}
            transition={EASE_SMOOTH}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
            }}
          >
            {icon}
          </motion.div>
        )}

        {/* Label + input stack (floating label pattern) */}
        <div style={{ flex: 1, position: 'relative', minHeight: 40 }}>
          {/* Floating label — transforms via GPU (translateY + scale only) */}
          <motion.label
            initial={false}
            animate={{
              y: isLifted ? -8 : 0,
              scale: isLifted ? 0.72 : 1,
              color: focused
                ? 'var(--gold-400)'
                : isLifted
                ? 'var(--text-muted)'
                : 'rgba(255, 255, 255, 0.35)',
            }}
            transition={SPRING_FAST}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              marginTop: -9, // center vertically: half of fontSize * lineHeight
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Manrope', sans-serif",
              transformOrigin: 'left center',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              willChange: 'transform',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </motion.label>

          {/* Input or trigger display — pushed down when label is lifted */}
          {asTrigger ? (
            <div
              style={{
                paddingTop: 14,
                paddingBottom: 4,
                fontSize: 16,
                fontWeight: 600,
                fontFamily: "'Manrope', sans-serif",
                color: displayValue ? 'var(--text-main)' : 'transparent',
                minHeight: 24,
                lineHeight: '24px',
              }}
            >
              {displayValue || label}
            </div>
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              maxLength={maxLength}
              placeholder={isLifted ? (placeholder || '') : ''}
              autoCapitalize={autoCapitalize}
              autoCorrect={autoCorrect}
              spellCheck
              className="premium-input-field"
              style={{
                width: '100%',
                paddingTop: 14,
                paddingBottom: 4,
                fontSize: 16, // Prevents iOS zoom
                fontWeight: 600,
                fontFamily: "'Manrope', sans-serif",
                color: 'var(--text-main)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '14px 0 4px',
                margin: 0,
                lineHeight: '24px',
                minHeight: 24,
                // Telegram WebView safety
                WebkitAppearance: 'none',
                boxShadow: 'none',
              }}
            />
          )}
        </div>

        {/* Trigger chevron */}
        {asTrigger && (
          <motion.div
            initial={false}
            animate={{ color: 'var(--text-muted)', opacity: 0.5 }}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </div>
    </Container>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM TEXTAREA — Same aesthetic, multi-line
   ═══════════════════════════════════════════════════════════════════════════ */

interface PremiumTextareaProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
  maxHeight?: string
  rows?: number
}

export function PremiumTextarea({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = 100,
  maxHeight = '40vh',
  rows = 4,
}: PremiumTextareaProps) {
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasValue = !!value
  const isLifted = focused || hasValue

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`
    },
    [onChange],
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 12,
        background: focused
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(255, 255, 255, 0.035)',
        transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Bottom accent line */}
      <motion.div
        initial={false}
        animate={{
          scaleX: focused ? 1 : 0,
          opacity: focused ? 1 : 0,
        }}
        transition={SPRING_FAST}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, var(--gold-400) 20%, var(--gold-300) 50%, var(--gold-400) 80%, transparent 100%)',
          transformOrigin: 'center',
          borderRadius: '0 0 12px 12px',
          willChange: 'transform, opacity',
        }}
      />

      {/* Focus glow */}
      <motion.div
        initial={false}
        animate={{ opacity: focused ? 1 : 0 }}
        transition={EASE_SMOOTH}
        style={{
          position: 'absolute',
          bottom: -1,
          left: '8%',
          right: '8%',
          height: 24,
          background: 'radial-gradient(ellipse at bottom, rgba(212, 175, 55, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ padding: '0 16px 12px' }}>
        {/* Floating label — always rendered, transforms via GPU */}
        <motion.label
          initial={false}
          animate={{
            y: isLifted ? 0 : 8,
            scale: isLifted ? 0.72 : 1,
            opacity: 1,
            color: focused
              ? 'var(--gold-400)'
              : isLifted
              ? 'var(--text-muted)'
              : 'rgba(255, 255, 255, 0.35)',
          }}
          transition={SPRING_FAST}
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "'Manrope', sans-serif",
            transformOrigin: 'left top',
            pointerEvents: 'none',
            paddingTop: 10,
            paddingBottom: isLifted ? 0 : 0,
            willChange: 'transform',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </motion.label>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isLifted ? (placeholder || '') : ''}
          disabled={disabled}
          rows={rows}
          className="premium-input-field"
          style={{
            width: '100%',
            minHeight,
            maxHeight,
            fontSize: 16,
            lineHeight: 1.55,
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            color: 'var(--text-main)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '4px 0 0',
            margin: 0,
            WebkitAppearance: 'none',
            boxShadow: 'none',
          }}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREMIUM INPUT GROUP — Stacked inputs with shared card surface
   Stripe Checkout-style: multiple fields in one visual block, divided
   by hairlines. NO outer border — just a whisper of surface color.
   ═══════════════════════════════════════════════════════════════════════════ */

interface PremiumInputGroupProps {
  children: React.ReactNode
  /** Optional card-level label like "Order details" */
  groupLabel?: string
}

export function PremiumInputGroup({ children, groupLabel }: PremiumInputGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {groupLabel && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            padding: '0 4px 8px',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {groupLabel}
        </div>
      )}
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          // Barely-there container — Stripe uses almost invisible grouping
          // No border at all — just the faintest surface tint to unify children
          background: 'rgba(255, 255, 255, 0.015)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIVIDER — Hairline between grouped inputs (Stripe-style)
   ═══════════════════════════════════════════════════════════════════════════ */

export function PremiumInputDivider() {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(255, 255, 255, 0.05)',
        margin: '0 16px',
      }}
    />
  )
}
