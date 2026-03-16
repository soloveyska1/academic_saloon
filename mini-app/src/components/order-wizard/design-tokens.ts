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
  '3xl': 20,
  full: 999,
} as const

// ─── Colors ──────────────────────────────────────────────────────────────
export const COLORS = {
  gold: {
    primary: '#d4af37',
    light: '#E8D5A3',
    soft: 'rgba(212, 175, 55, 0.10)',
    soft06: 'rgba(212, 175, 55, 0.06)',
    border: 'rgba(212, 175, 55, 0.25)',
    borderStrong: 'rgba(212, 175, 55, 0.45)',
    gradient: 'linear-gradient(135deg, #d4af37, #f5d061)',
    shadow: 'rgba(212, 175, 55, 0.20)',
    badge: 'rgba(212, 175, 55, 0.75)',
  },
  card: {
    bg: 'rgba(255, 255, 255, 0.025)',
    bgSubtle: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderFocused: 'rgba(212, 175, 55, 0.25)',
  },
  assist: {
    primary: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.04)',
    border: 'rgba(96, 165, 250, 0.15)',
    icon: 'rgba(96, 165, 250, 0.07)',
    text: '#93bbfc',
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
    '2xs': 10.5,
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 15,
    xl: 16,
    '2xl': 17,
  },
} as const

// ─── Component Sizes ─────────────────────────────────────────────────────
export const ICON_BOX = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 38,
  xl: 48,
} as const

// ─── Animation ──────────────────────────────────────────────────────────
export const TAP_SCALE = {
  card: 0.98,
  tile: 0.96,
} as const

// ─── Card Padding ────────────────────────────────────────────────────────
export const CARD_PADDING = `${SPACING.xl}px` // 14px → standardize on 14px
