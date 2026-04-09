// @vitest-environment jsdom

import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'

vi.mock('../api/userApi', () => ({
  API_WS_URL: 'ws://example.com/api/ws',
}))

import { useWebSocket } from './useWebSocket'
import type { OrderUpdateMessage } from './useWebSocket'
import type { ChatSocketMessage } from './useWebSocket'
import type { DeliveryUpdateMessage } from './useWebSocket'
import type { FileDeliveryMessage } from './useWebSocket'
import type {
  RevisionRoundFulfilledMessage,
  RevisionRoundOpenedMessage,
  RevisionRoundUpdatedMessage,
} from './useWebSocket'

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
  onChatMessage,
  onDeliveryUpdate,
  onFileDelivery,
  onRevisionRoundOpened,
  onRevisionRoundUpdated,
  onRevisionRoundFulfilled,
}: {
  telegramId: number | null
  onOrderUpdate?: (msg: OrderUpdateMessage) => void
  onChatMessage?: (msg: ChatSocketMessage) => void
  onDeliveryUpdate?: (msg: DeliveryUpdateMessage) => void
  onFileDelivery?: (msg: FileDeliveryMessage) => void
  onRevisionRoundOpened?: (msg: RevisionRoundOpenedMessage) => void
  onRevisionRoundUpdated?: (msg: RevisionRoundUpdatedMessage) => void
  onRevisionRoundFulfilled?: (msg: RevisionRoundFulfilledMessage) => void
}) {
  latestHook = useWebSocket(telegramId, {
    autoReconnect: true,
    reconnectInterval: 1000,
    onOrderUpdate,
    onChatMessage,
    onDeliveryUpdate,
    onFileDelivery,
    onRevisionRoundOpened,
    onRevisionRoundUpdated,
    onRevisionRoundFulfilled,
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

  it('forwards file delivery messages to the dedicated handler', () => {
    const onFileDelivery = vi.fn()

    act(() => {
      root.render(<HookHarness telegramId={123} onFileDelivery={onFileDelivery} />)
    })

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'file_delivery',
        timestamp: new Date().toISOString(),
        order_id: 91,
        file_count: 3,
        files_url: 'https://example.com/files',
        title: 'Файлы готовы',
        message: 'Загружено 3 файла',
      })
    })

    expect(onFileDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 91,
        file_count: 3,
        files_url: 'https://example.com/files',
      }),
    )
  })

  it('forwards delivery update messages to the dedicated handler', () => {
    const onDeliveryUpdate = vi.fn()

    act(() => {
      root.render(<HookHarness telegramId={123} onDeliveryUpdate={onDeliveryUpdate} />)
    })

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'delivery_update',
        timestamp: new Date().toISOString(),
        order_id: 91,
        delivery_batch_id: 7,
        version_number: 3,
        revision_count_snapshot: 2,
        file_count: 2,
        files_url: 'https://example.com/files/v3',
        title: 'Исправленная версия по правке #2 готова',
        message: 'Заказ #91 · Версия 3 · 2 файл(ов)',
      })
    })

    expect(onDeliveryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 91,
        delivery_batch_id: 7,
        version_number: 3,
        files_url: 'https://example.com/files/v3',
      }),
    )
  })

  it('forwards chat message notifications to the dedicated handler', () => {
    const onChatMessage = vi.fn()

    act(() => {
      root.render(<HookHarness telegramId={123} onChatMessage={onChatMessage} />)
    })

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'chat_message',
        timestamp: new Date().toISOString(),
        order_id: 45,
        title: '💬 Менеджер',
        message: 'Есть обновление по заказу',
      })
    })

    expect(onChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 45,
        title: '💬 Менеджер',
        message: 'Есть обновление по заказу',
      }),
    )
  })

  it('forwards revision round lifecycle messages to dedicated handlers', () => {
    const onRevisionRoundOpened = vi.fn()
    const onRevisionRoundUpdated = vi.fn()
    const onRevisionRoundFulfilled = vi.fn()

    act(() => {
      root.render(
        <HookHarness
          telegramId={123}
          onRevisionRoundOpened={onRevisionRoundOpened}
          onRevisionRoundUpdated={onRevisionRoundUpdated}
          onRevisionRoundFulfilled={onRevisionRoundFulfilled}
        />,
      )
    })

    act(() => {
      MockWebSocket.instances[0].emitMessage({
        type: 'revision_round_opened',
        timestamp: new Date().toISOString(),
        order_id: 91,
        revision_round_id: 7,
        round_number: 2,
      })
      MockWebSocket.instances[0].emitMessage({
        type: 'revision_round_updated',
        timestamp: new Date().toISOString(),
        order_id: 91,
        revision_round_id: 7,
        round_number: 2,
        latest_comment: 'Добавил скриншот',
      })
      MockWebSocket.instances[0].emitMessage({
        type: 'revision_round_fulfilled',
        timestamp: new Date().toISOString(),
        order_id: 91,
        revision_round_id: 7,
        round_number: 2,
        delivery_batch_id: 18,
        version_number: 3,
      })
    })

    expect(onRevisionRoundOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 91,
        revision_round_id: 7,
        round_number: 2,
      }),
    )
    expect(onRevisionRoundUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 91,
        latest_comment: 'Добавил скриншот',
      }),
    )
    expect(onRevisionRoundFulfilled).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 91,
        delivery_batch_id: 18,
        version_number: 3,
      }),
    )
  })
})
