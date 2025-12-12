import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchLiveFeed } from '../api/userApi'
import { LiveFeedData, LiveEvent } from '../types'

interface UseAdminLiveFeedOptions {
  enabled?: boolean
  pollInterval?: number  // ms, default 15000 (15 sec)
  soundEnabled?: boolean
  onNewCriticalEvent?: (event: LiveEvent) => void
}

interface UseAdminLiveFeedResult {
  feed: LiveFeedData | null
  isLoading: boolean
  error: Error | null
  newEventsCount: number
  refresh: () => Promise<void>
  clearNewEvents: () => void
  lastUpdate: Date | null
}

// Sound URLs (using Web Audio API beeps)
const playBeep = (frequency: number, duration: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  } catch (e) {
    console.warn('Audio not supported:', e)
  }
}

const playAlertSound = (priority: 'critical' | 'high' | 'normal') => {
  switch (priority) {
    case 'critical':
      // Double beep for critical
      playBeep(880, 0.15)
      setTimeout(() => playBeep(1100, 0.2), 200)
      break
    case 'high':
      // Single high beep
      playBeep(660, 0.2)
      break
    case 'normal':
      // Soft beep
      playBeep(440, 0.1)
      break
  }
}

export function useAdminLiveFeed({
  enabled = true,
  pollInterval = 15000,
  soundEnabled = true,
  onNewCriticalEvent,
}: UseAdminLiveFeedOptions = {}): UseAdminLiveFeedResult {
  const [feed, setFeed] = useState<LiveFeedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [newEventsCount, setNewEventsCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const lastFetchTime = useRef<string | null>(null)
  const seenEventIds = useRef<Set<string>>(new Set())
  const isFirstFetch = useRef(true)

  const refresh = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchLiveFeed(lastFetchTime.current ?? undefined)

      // Track new events
      let newCriticalCount = 0
      const newEvents: LiveEvent[] = []

      for (const event of data.events) {
        if (!seenEventIds.current.has(event.id)) {
          seenEventIds.current.add(event.id)

          // Don't alert on first fetch (initial load)
          if (!isFirstFetch.current) {
            newEvents.push(event)

            if (event.priority === 'critical' || event.priority === 'high') {
              newCriticalCount++

              // Sound alert
              if (soundEnabled) {
                playAlertSound(event.priority)
              }

              // Callback
              if (onNewCriticalEvent) {
                onNewCriticalEvent(event)
              }

              // Browser notification (if permitted)
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(event.title, {
                  body: event.message,
                  icon: '/favicon.ico',
                  tag: event.id,
                })
              }
            }
          }
        }
      }

      isFirstFetch.current = false
      lastFetchTime.current = data.last_update

      setFeed(data)
      setNewEventsCount(prev => prev + newCriticalCount)
      setLastUpdate(new Date())

    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch live feed'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled, soundEnabled, onNewCriticalEvent])

  const clearNewEvents = useCallback(() => {
    setNewEventsCount(0)
  }, [])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      refresh()
    }
  }, [enabled, refresh])

  // Polling
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [enabled, pollInterval, refresh])

  // Request notification permission
  useEffect(() => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [enabled])

  return {
    feed,
    isLoading,
    error,
    newEventsCount,
    refresh,
    clearNewEvents,
    lastUpdate,
  }
}
