/**
 * Design tokens for Order Wizard components.
 * Centralized spacing, colors, and typography to replace hardcoded values.
 */

// ─── Spacing Scale ───────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

// ─── Border Radius ───────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  '2xl': 16,
  full: 999,
} as const

// ─── Colors ──────────────────────────────────────────────────────────────
export const COLORS = {
  gold: {
    primary: '#d4af37',
    soft: 'rgba(212, 175, 55, 0.10)',
    border: 'rgba(212, 175, 55, 0.25)',
    gradient: 'linear-gradient(135deg, #d4af37, #f5d061)',
  },
  card: {
    bg: 'rgba(255, 255, 255, 0.025)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderFocused: 'rgba(212, 175, 55, 0.25)',
  },
  status: {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
} as const

// ─── Typography ──────────────────────────────────────────────────────────
export const FONT = {
  family: {
    sans: "'Manrope', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  size: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
  },
} as const

// ─── Component Sizes ─────────────────────────────────────────────────────
export const ICON_BOX = {
  sm: 28,
  md: 36,
  lg: 38,
} as const

// ─── Card Padding ────────────────────────────────────────────────────────
export const CARD_PADDING = `${SPACING.xl}px` // 14px → standardize on 14px
