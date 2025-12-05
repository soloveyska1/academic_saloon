import { useCallback, useRef } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  HACKER SOUND ENGINE — Premium Mechanical Audio via Web Audio API
//  No external files - all sounds synthesized in realtime
// ═══════════════════════════════════════════════════════════════════════════

type SoundType =
  | 'click'       // UI click
  | 'tick'        // Dial tick
  | 'spin_start'  // Spin beginning
  | 'spin_tick'   // Fast tick during spin
  | 'latch'       // Heavy lock latch
  | 'unlock'      // Vault door opening
  | 'win'         // Success chord
  | 'jackpot'     // Epic fanfare
  | 'alarm'       // Urgency alarm
  | 'error'       // Error buzz
  | 'hover'       // Subtle hover

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

  // Play a single tone with envelope
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

  // Play white noise burst with filter
  const playNoise = useCallback((
    duration: number,
    startTime: number,
    vol: number = 0.1,
    filterFreq: number = 1000
  ) => {
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
    filter.frequency.value = filterFreq

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
          // Sharp UI click
          playTone(2000, 'square', 0.04, t, 0.25)
          playTone(500, 'triangle', 0.05, t + 0.01, 0.4)
          break

        case 'tick':
          // Single dial tick
          playTone(1000, 'square', 0.025, t, 0.2)
          playNoise(0.02, t, 0.08, 2000)
          break

        case 'spin_start':
          // Rising whoosh with tension
          playTone(80, 'sawtooth', 0.8, t, 0.25, 500)
          playNoise(0.4, t, 0.12, 600)
          playTone(40, 'sine', 0.5, t, 0.3, 150)
          break

        case 'spin_tick':
          // Fast tick for spinning
          playTone(1200, 'square', 0.015, t, 0.12)
          break

        case 'latch':
          // Heavy mechanical latch
          playTone(200, 'sawtooth', 0.12, t, 0.5)
          playTone(100, 'square', 0.18, t + 0.04, 0.5)
          playTone(60, 'triangle', 0.25, t + 0.08, 0.6)
          playNoise(0.12, t + 0.02, 0.18, 400)
          break

        case 'unlock':
          // Vault door pneumatic opening
          playTone(300, 'sawtooth', 0.5, t, 0.35, 50)
          playNoise(0.35, t + 0.05, 0.18, 250)
          playTone(80, 'triangle', 0.4, t + 0.25, 0.35)
          // Mechanical release
          playTone(450, 'square', 0.08, t + 0.35, 0.25)
          playTone(350, 'sine', 0.12, t + 0.4, 0.2)
          break

        case 'win':
          // Victory chord (C-E-G-C)
          const winNotes = [523.25, 659.25, 783.99, 1046.50]
          winNotes.forEach((freq, i) => {
            playTone(freq, 'triangle', 0.7, t + i * 0.06, 0.35)
            playTone(freq, 'sine', 0.9, t + i * 0.06, 0.25)
          })
          break

        case 'jackpot':
          // Epic fanfare arpeggio
          const fanfare = [
            { freq: 523.25, delay: 0 },
            { freq: 659.25, delay: 0.07 },
            { freq: 783.99, delay: 0.14 },
            { freq: 1046.50, delay: 0.21 },
            { freq: 1318.51, delay: 0.28 },
            { freq: 1567.98, delay: 0.35 },
            { freq: 2093.00, delay: 0.42 },
          ]
          fanfare.forEach(({ freq, delay }) => {
            playTone(freq, 'triangle', 0.55, t + delay, 0.3)
            playTone(freq / 2, 'sine', 0.45, t + delay, 0.18)
            playTone(freq * 1.5, 'square', 0.12, t + delay, 0.08)
          })
          // Sparkle shimmer
          for (let i = 0; i < 8; i++) {
            playTone(2000 + Math.random() * 2500, 'sine', 0.12, t + 0.55 + i * 0.05, 0.1)
          }
          break

        case 'alarm':
          // Urgent timer alarm
          playTone(880, 'square', 0.08, t, 0.35)
          playTone(660, 'square', 0.08, t + 0.12, 0.35)
          playTone(880, 'square', 0.08, t + 0.24, 0.35)
          break

        case 'error':
          // Error/fail buzz
          playTone(180, 'sawtooth', 0.18, t, 0.35)
          playTone(140, 'sawtooth', 0.2, t + 0.08, 0.35)
          break

        case 'hover':
          // Subtle hover feedback
          playTone(900, 'sine', 0.04, t, 0.06)
          break
      }
    } catch {
      // Silently fail - sound is enhancement only
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
