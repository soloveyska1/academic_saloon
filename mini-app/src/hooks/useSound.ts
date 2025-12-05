import { useRef, useCallback, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  PREMIUM SOUND ENGINE — Mechanical Vault Audio System
//  Uses Web Audio API for low-latency, high-quality sound effects
// ═══════════════════════════════════════════════════════════════════════════

type SoundType =
  | 'click'      // Mechanical click
  | 'latch'      // Lock latch engaging
  | 'open'       // Vault door opening
  | 'win'        // Prize won
  | 'tick'       // Dial tick
  | 'spin_start' // Start spinning
  | 'spin_stop'  // Stop spinning
  | 'jackpot'    // Jackpot celebration

interface SoundEngine {
  play: (type: SoundType) => void
  setVolume: (volume: number) => void
  setEnabled: (enabled: boolean) => void
  isEnabled: () => boolean
}

// Oscillator-based sound synthesis (no external files needed)
function createOscillatorSound(
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
  duration: number,
  volume: number = 0.3,
  fadeOut: boolean = true
) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  if (fadeOut) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  }

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// Create complex mechanical sounds with multiple oscillators
function playMechanicalClick(ctx: AudioContext, volume: number) {
  // High frequency click
  createOscillatorSound(ctx, 'square', 2000, 0.02, volume * 0.4)
  // Mid frequency thud
  setTimeout(() => {
    createOscillatorSound(ctx, 'triangle', 400, 0.05, volume * 0.5)
  }, 5)
}

function playLatchSound(ctx: AudioContext, volume: number) {
  // Metal latch engaging
  createOscillatorSound(ctx, 'sawtooth', 800, 0.03, volume * 0.3)
  setTimeout(() => {
    createOscillatorSound(ctx, 'square', 300, 0.08, volume * 0.4)
  }, 30)
  setTimeout(() => {
    createOscillatorSound(ctx, 'triangle', 150, 0.12, volume * 0.5)
  }, 80)
}

function playOpenSound(ctx: AudioContext, volume: number) {
  // Heavy vault door opening - sweep down
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(400, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)

  gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.5)

  // Metallic resonance
  setTimeout(() => {
    createOscillatorSound(ctx, 'triangle', 120, 0.3, volume * 0.2)
  }, 200)
}

function playWinSound(ctx: AudioContext, volume: number) {
  // Triumphant ascending tones
  const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => {
      createOscillatorSound(ctx, 'triangle', freq, 0.3, volume * 0.4)
      createOscillatorSound(ctx, 'sine', freq * 2, 0.2, volume * 0.2)
    }, i * 100)
  })
}

function playTickSound(ctx: AudioContext, volume: number) {
  // Single dial tick
  createOscillatorSound(ctx, 'square', 1200, 0.015, volume * 0.25)
}

function playSpinStartSound(ctx: AudioContext, volume: number) {
  // Ascending whoosh
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(100, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)

  gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.3)
}

function playSpinStopSound(ctx: AudioContext, volume: number) {
  // Descending with resonance
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(600, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4)

  gainNode.gain.setValueAtTime(volume * 0.35, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.4)

  // Final thud
  setTimeout(() => {
    createOscillatorSound(ctx, 'triangle', 80, 0.15, volume * 0.4)
  }, 350)
}

function playJackpotSound(ctx: AudioContext, volume: number) {
  // Epic fanfare
  const fanfare = [
    { freq: 523.25, delay: 0 },    // C5
    { freq: 659.25, delay: 100 },  // E5
    { freq: 783.99, delay: 200 },  // G5
    { freq: 1046.50, delay: 300 }, // C6
    { freq: 1318.51, delay: 400 }, // E6
    { freq: 1567.98, delay: 500 }, // G6
    { freq: 2093.00, delay: 600 }, // C7
  ]

  fanfare.forEach(({ freq, delay }) => {
    setTimeout(() => {
      createOscillatorSound(ctx, 'triangle', freq, 0.5, volume * 0.35)
      createOscillatorSound(ctx, 'sine', freq / 2, 0.4, volume * 0.2)
      // Add sparkle
      createOscillatorSound(ctx, 'square', freq * 2, 0.1, volume * 0.1)
    }, delay)
  })

  // Shimmer effect
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      createOscillatorSound(ctx, 'sine', 2000 + Math.random() * 2000, 0.15, volume * 0.15)
    }, 700 + i * 80)
  }
}

export function useSound(): SoundEngine {
  const audioContextRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(true)
  const volumeRef = useRef(0.5)

  // Initialize AudioContext on first use (must be triggered by user interaction)
  const getContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    // Resume if suspended (happens after page becomes inactive)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return

    try {
      const ctx = getContext()
      const vol = volumeRef.current

      switch (type) {
        case 'click':
          playMechanicalClick(ctx, vol)
          break
        case 'latch':
          playLatchSound(ctx, vol)
          break
        case 'open':
          playOpenSound(ctx, vol)
          break
        case 'win':
          playWinSound(ctx, vol)
          break
        case 'tick':
          playTickSound(ctx, vol)
          break
        case 'spin_start':
          playSpinStartSound(ctx, vol)
          break
        case 'spin_stop':
          playSpinStopSound(ctx, vol)
          break
        case 'jackpot':
          playJackpotSound(ctx, vol)
          break
      }
    } catch {
      // Silently fail - sound is enhancement, not critical
    }
  }, [getContext])

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume))
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled
  }, [])

  const isEnabled = useCallback(() => enabledRef.current, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return { play, setVolume, setEnabled, isEnabled }
}

// Shared sound context for global access
let globalSoundEngine: SoundEngine | null = null

export function getGlobalSoundEngine(): SoundEngine | null {
  return globalSoundEngine
}

export function setGlobalSoundEngine(engine: SoundEngine) {
  globalSoundEngine = engine
}
