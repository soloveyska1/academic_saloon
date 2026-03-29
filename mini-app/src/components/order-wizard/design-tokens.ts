/**
 * Design tokens for Order Wizard — aligned with global design system.
 * Uses the same values as homepage glass cards.
 */

// ─── Spacing Scale (8px rhythm) ─────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

// ─── Border Radius — matches global --radius-sm/md/lg ───────────────────
export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 18,
  xl: 24,
  full: 9999,
} as const

// ─── Colors — aligned with global CSS variables ─────────────────────────
export const COLORS = {
  gold: {
    primary: '#d4af37',
    light: '#E8D5A3',
    soft: 'rgba(212, 175, 55, 0.06)',
    border: 'rgba(212, 175, 55, 0.08)',
    borderStrong: 'rgba(212, 175, 55, 0.30)',
    gradient: 'linear-gradient(135deg, var(--gold-600), var(--gold-400))',
    shadow: '0 0 20px -5px rgba(212, 175, 55, 0.15)',
    badge: 'rgba(212, 175, 55, 0.75)',
  },
  card: {
    bg: 'rgba(14, 13, 12, 0.88)',
    bgPremium: 'linear-gradient(145deg, rgba(212, 175, 55, 0.05), rgba(14, 13, 12, 0.88) 40%)',
    border: 'rgba(255, 255, 255, 0.06)',
    borderPremium: 'rgba(212, 175, 55, 0.15)',
    borderFocused: 'rgba(212, 175, 55, 0.15)',
  },
  assist: {
    primary: 'var(--gold-400)',
    bg: 'rgba(212, 175, 55, 0.03)',
    border: 'rgba(212, 175, 55, 0.08)',
    icon: 'rgba(212, 175, 55, 0.06)',
    text: 'var(--text-secondary)',
  },
  status: {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
} as const

// ─── Typography ─────────────────────────────────────────────────────────
export const FONT = {
  family: {
    sans: "var(--font-display, 'Manrope', sans-serif)",
    mono: "var(--font-mono, 'JetBrains Mono', monospace)",
  },
  size: {
    '2xs': 10,
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
    '2xl': 17,
  },
} as const

// ─── Component Sizes ────────────────────────────────────────────────────
export const ICON_BOX = {
  xs: 24,
  sm: 28,
  md: 40,
  lg: 44,
  xl: 48,
} as const

// ─── Animation ──────────────────────────────────────────────────────────
export const TAP_SCALE = {
  card: 0.975,
  tile: 0.97,
} as const

// ─── Card Padding ───────────────────────────────────────────────────────
export const CARD_PADDING = `${SPACING.lg}px ${SPACING.xl - 2}px`
export const CARD_PADDING_PREMIUM = `${SPACING.xl - 2}px ${SPACING.xl}px`
