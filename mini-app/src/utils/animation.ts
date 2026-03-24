/**
 * Unified animation constants — "The Saloon Tempo"
 *
 * ONE stagger speed, ONE easing, ONE breathing period, ONE tap scale.
 * Consistency = luxury. Randomness = chaos.
 */

/* The signature easing — fast start, gentle land */
export const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const

/* Timing system */
export const TIMING = {
  /** Stagger delay between sibling items */
  stagger: 0.07,
  /** Standard entrance animation duration */
  entrance: 0.45,
  /** Breathing / ambient cycle (seconds) */
  breathe: 5,
  /** Quick interaction feedback */
  micro: 0.12,
} as const

/* Interaction scales */
export const TAP_SCALE = 0.96

/* Haptic feedback durations (ms) */
export const HAPTIC = {
  light: 10,
  medium: 20,
  heavy: 35,
} as const

/** Fire haptic feedback if available */
export function haptic(intensity: keyof typeof HAPTIC = 'medium') {
  try { navigator.vibrate?.(HAPTIC[intensity]) } catch { /* noop */ }
}
