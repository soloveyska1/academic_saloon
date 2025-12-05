import { useCallback, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  LEGACY SOUND ENGINE — Premium Mechanical Audio via Web Audio API
//  No external files needed - all sounds synthesized in realtime
// ═══════════════════════════════════════════════════════════════════════════

type SoundType =
  | 'click'       // Button click
  | 'latch'       // Heavy lock latch
  | 'open'        // Vault door pneumatics
  | 'win'         // Success chord
  | 'tick'        // Dial tick
  | 'spin_start'  // Spin beginning whoosh
  | 'spin_stop'   // Spin ending
  | 'jackpot'     // Jackpot fanfare
  | 'error'       // Error buzz
  | 'hover'       // Subtle hover sound

interface SoundEngine {
  play: (type: SoundType) => void
  setVolume: (volume: number) => void
  setEnabled: (enabled: boolean) => void
  isEnabled: () => boolean
}

export const useSound = (): SoundEngine => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const enabledRef = useRef(true)
  const volumeRef = useRef(0.5)

  // Initialize audio context (must be called from user interaction)
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioCtx()
      masterGainRef.current = audioContextRef.current.createGain()
      masterGainRef.current.gain.value = volumeRef.current
      masterGainRef.current.connect(audioContextRef.current.destination)
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  // Play a single tone
  const playTone = useCallback((
    freq: number,
    type: OscillatorType,
    duration: number,
    startTime: number,
    vol: number = 1,
    freqEnd?: number
  ) => {
    const ctx = audioContextRef.current
    if (!ctx || !masterGainRef.current) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)

    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration)
    }

    gain.gain.setValueAtTime(vol * volumeRef.current, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    osc.connect(gain)
    gain.connect(masterGainRef.current)

    osc.start(startTime)
    osc.stop(startTime + duration)
  }, [])

  // Play white noise burst
  const playNoise = useCallback((duration: number, startTime: number, vol: number = 0.1) => {
    const ctx = audioContextRef.current
    if (!ctx || !masterGainRef.current) return

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    noise.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = 1000

    gain.gain.setValueAtTime(vol * volumeRef.current, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(masterGainRef.current)

    noise.start(startTime)
    noise.stop(startTime + duration)
  }, [])

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return

    try {
      initAudio()
      const ctx = audioContextRef.current
      if (!ctx) return
      const t = ctx.currentTime

      switch (type) {
        case 'click':
          // Sharp mechanical click
          playTone(2000, 'square', 0.05, t, 0.3)
          playTone(400, 'triangle', 0.05, t + 0.01, 0.5)
          break

        case 'tick':
          // Single dial tick
          playTone(1200, 'square', 0.03, t, 0.2)
          break

        case 'latch':
          // Heavy lock mechanism
          playTone(800, 'sawtooth', 0.1, t, 0.4)
          playTone(300, 'square', 0.15, t + 0.05, 0.4)
          playTone(150, 'triangle', 0.3, t + 0.1, 0.6)
          playNoise(0.1, t + 0.05, 0.15)
          break

        case 'open':
          // Pneumatic door opening
          playTone(400, 'sawtooth', 0.6, t, 0.4, 80)
          playNoise(0.3, t, 0.2)
          playTone(120, 'triangle', 0.4, t + 0.3, 0.3)
          break

        case 'win':
          // Success chord (C-E-G-C)
          const winNotes = [523.25, 659.25, 783.99, 1046.50]
          winNotes.forEach((freq, i) => {
            playTone(freq, 'triangle', 0.8, t + i * 0.05, 0.4)
            playTone(freq, 'sine', 1.0, t + i * 0.05, 0.3)
          })
          break

        case 'spin_start':
          // Rising whoosh
          playTone(100, 'triangle', 1.0, t, 0.3, 800)
          playNoise(0.5, t, 0.1)
          break

        case 'spin_stop':
          // Descending stop
          playTone(600, 'triangle', 0.4, t, 0.35, 100)
          playTone(80, 'triangle', 0.15, t + 0.35, 0.4)
          break

        case 'jackpot':
          // Epic fanfare
          const fanfare = [
            { freq: 523.25, delay: 0 },
            { freq: 659.25, delay: 0.08 },
            { freq: 783.99, delay: 0.16 },
            { freq: 1046.50, delay: 0.24 },
            { freq: 1318.51, delay: 0.32 },
            { freq: 1567.98, delay: 0.40 },
            { freq: 2093.00, delay: 0.48 },
          ]
          fanfare.forEach(({ freq, delay }) => {
            playTone(freq, 'triangle', 0.6, t + delay, 0.35)
            playTone(freq / 2, 'sine', 0.5, t + delay, 0.2)
            playTone(freq * 2, 'square', 0.15, t + delay, 0.1)
          })
          // Shimmer
          for (let i = 0; i < 10; i++) {
            playTone(2000 + Math.random() * 2000, 'sine', 0.15, t + 0.6 + i * 0.06, 0.12)
          }
          break

        case 'error':
          // Error buzz
          playTone(200, 'sawtooth', 0.15, t, 0.3)
          playTone(180, 'sawtooth', 0.15, t + 0.1, 0.3)
          break

        case 'hover':
          // Subtle hover
          playTone(800, 'sine', 0.05, t, 0.1)
          break
      }
    } catch {
      // Silently fail - sound is enhancement
    }
  }, [initAudio, playTone, playNoise])

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume))
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volumeRef.current
    }
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled
  }, [])

  const isEnabled = useCallback(() => enabledRef.current, [])

  return { play, setVolume, setEnabled, isEnabled }
}
