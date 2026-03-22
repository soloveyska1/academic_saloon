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
  lg: 24,
  full: 9999,
} as const

// ─── Colors — aligned with global CSS variables ─────────────────────────
export const COLORS = {
  gold: {
    primary: '#d4af37',
    light: '#E8D5A3',
    soft: 'rgba(201, 162, 39, 0.06)',
    border: 'rgba(201, 162, 39, 0.08)',
    borderStrong: 'rgba(201, 162, 39, 0.20)',
    gradient: 'linear-gradient(135deg, var(--gold-600), var(--gold-400))',
    shadow: 'rgba(201, 162, 39, 0.12)',
    badge: 'rgba(201, 162, 39, 0.75)',
  },
  card: {
    bg: 'rgba(12, 12, 10, 0.6)',
    border: 'rgba(255, 255, 255, 0.04)',
    borderFocused: 'rgba(201, 162, 39, 0.15)',
  },
  assist: {
    primary: 'var(--gold-400)',
    bg: 'rgba(201, 162, 39, 0.03)',
    border: 'rgba(201, 162, 39, 0.08)',
    icon: 'rgba(201, 162, 39, 0.06)',
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
  md: 36,
  lg: 38,
  xl: 48,
} as const

// ─── Animation ──────────────────────────────────────────────────────────
export const TAP_SCALE = {
  card: 0.97,
  tile: 0.97,
} as const

// ─── Card Padding ───────────────────────────────────────────────────────
export const CARD_PADDING = `${SPACING.xl}px`
