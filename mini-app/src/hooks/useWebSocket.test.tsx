// @vitest-environment jsdom

import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'

vi.mock('../api/userApi', () => ({
  API_WS_URL: 'ws://example.com/api/ws',
}))

import { useWebSocket } from './useWebSocket'
import type { OrderUpdateMessage } from './useWebSocket'

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  send = vi.fn()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close = vi.fn((code = 1000, reason = '') => {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason } as CloseEvent)
  })

  emitOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  emitClose(code = 1006, reason = 'closed') {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code, reason } as CloseEvent)
  }

  emitMessage(payload: unknown) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload)
    this.onmessage?.({ data } as MessageEvent)
  }
}

let latestHook: ReturnType<typeof useWebSocket> | null = null

function HookHarness({
  telegramId,
  onOrderUpdate,
}: {
  telegramId: number | null
  onOrderUpdate?: (msg: OrderUpdateMessage) => void
}) {
  latestHook = useWebSocket(telegramId, {
    autoReconnect: true,
    reconnectInterval: 1000,
    onOrderUpdate,
  })

  return null
}

describe('useWebSocket reconnect flow', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    latestHook = null
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket)

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('cancels stale auto-reconnect after manual reconnect', () => {
    act(() => {
      root.render(<HookHarness telegramId={123} />)
    })

    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => {
      MockWebSocket.instances[0].emitClose(1006)
    })

    act(() => {
      latestHook?.reconnect()
      vi.advanceTimersByTime(100)
    })

    expect(MockWebSocket.instances).toHaveLength(2)

    act(() => {
      MockWebSocket.instances[1].emitOpen()
      vi.advanceTimersByTime(1000)
    })

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('detaches stale socket handlers before replacing connection', () => {
    act(() => {
      root.render(<HookHarness telegramId={123} />)
    })

    const firstSocket = MockWebSocket.instances[0]

    act(() => {
      latestHook?.reconnect()
      vi.advanceTimersByTime(100)
    })

    expect(MockWebSocket.instances).toHaveLength(2)

    act(() => {
      firstSocket.emitClose(1006)
      vi.advanceTimersByTime(1000)
    })

    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('keeps processing websocket messages when one custom handler throws', () => {
    const onOrderUpdate = vi.fn()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    act(() => {
      root.render(<HookHarness telegramId={123} onOrderUpdate={onOrderUpdate} />)
    })

    const observed: string[] = []
    const unsubscribeThrowing = latestHook?.addMessageHandler(() => {
      throw new Error('boom')
    })
    const unsubscribeHealthy = latestHook?.addMessageHandler(() => {
      observed.push('healthy')
    })

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'order_update',
        timestamp: new Date().toISOString(),
        order_id: 77,
        status: 'pending',
      })
    })

    expect(observed).toEqual(['healthy'])
    expect(onOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 77,
        status: 'pending',
      }),
    )
    expect(warnSpy).toHaveBeenCalledWith('[WS] Message handler failed', expect.any(Error))

    unsubscribeThrowing?.()
    unsubscribeHealthy?.()
    warnSpy.mockRestore()
  })
})
