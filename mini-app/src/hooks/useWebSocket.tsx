import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { API_WS_URL } from '../api/userApi'

// WebSocket message types
export type WSMessageType =
  | 'connected'
  | 'order_update'
  | 'balance_update'
  | 'progress_update'
  | 'notification'
  | 'refresh'
  | 'ping'
  | 'pong'
  | 'chat_message'
  | 'typing_indicator'
  | 'file_delivery'

export interface WSMessage {
  type: WSMessageType
  timestamp: string
  [key: string]: unknown
}

export interface OrderUpdateMessage extends WSMessage {
  type: 'order_update'
  order_id: number
  status: string
  data?: Record<string, unknown>
  // Smart notification fields from server
  title?: string
  message?: string
  icon?: string
  color?: string
  priority?: 'low' | 'normal' | 'high'
  action?: string
  celebration?: boolean
  confetti?: boolean
}

export interface BalanceUpdateMessage extends WSMessage {
  type: 'balance_update'
  balance: number
  change: number
  reason: string
  // Smart notification fields from server
  title?: string
  message?: string
  icon?: string
  color?: string
  celebration?: boolean
}

export interface NotificationMessage extends WSMessage {
  type: 'notification'
  notification_type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  // Smart notification fields from server
  icon?: string
  color?: string
}

export interface FileDeliveryMessage extends WSMessage {
  type: 'file_delivery'
  order_id: number
  file_count: number
  files_url: string
  title: string
  message: string
  icon?: string
  color?: string
  priority?: 'low' | 'normal' | 'high'
}

export interface RefreshMessage extends WSMessage {
  type: 'refresh'
  refresh_type: 'all' | 'orders' | 'profile' | 'balance'
}

export interface ProgressUpdateMessage extends WSMessage {
  type: 'progress_update'
  order_id: number
  progress: number
  title?: string
  message?: string
  emoji?: string
}

export interface ChatSocketMessage extends WSMessage {
  type: 'chat_message'
  order_id: number
  title?: string
  message?: string
  icon?: string
  color?: string
}

export interface TypingIndicatorSocketMessage extends WSMessage {
  type: 'typing_indicator'
  order_id: number
  is_typing: boolean
}

export function isChatSocketMessage(message: WSMessage): message is ChatSocketMessage {
  return message.type === 'chat_message' && typeof message.order_id === 'number'
}

export function isTypingIndicatorSocketMessage(message: WSMessage): message is TypingIndicatorSocketMessage {
  return (
    message.type === 'typing_indicator' &&
    typeof message.order_id === 'number' &&
    typeof message.is_typing === 'boolean'
  )
}

type MessageHandler = (message: WSMessage) => void

interface UseWebSocketOptions {
  onOrderUpdate?: (msg: OrderUpdateMessage) => void
  onBalanceUpdate?: (msg: BalanceUpdateMessage) => void
  onProgressUpdate?: (msg: ProgressUpdateMessage) => void
  onChatMessage?: (msg: ChatSocketMessage) => void
  onNotification?: (msg: NotificationMessage) => void
  onRefresh?: (msg: RefreshMessage) => void
  onFileDelivery?: (msg: FileDeliveryMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

// Get WebSocket URL based on configured API host
function getWebSocketUrl(telegramId: number): string {
  const url = new URL(API_WS_URL)
  url.searchParams.set('telegram_id', String(telegramId))
  // Pass initData for authentication
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
  if (tg?.WebApp?.initData) {
    url.searchParams.set('init_data', tg.WebApp.initData)
  }
  return url.toString()
}

export function useWebSocket(telegramId: number | null, options: UseWebSocketOptions = {}) {
  const {
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onChatMessage,
    onNotification,
    onRefresh,
    onFileDelivery,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const pingIntervalRef = useRef<number | null>(null)
  const messageHandlersRef = useRef<Set<MessageHandler>>(new Set())
  const reconnectAttemptsRef = useRef<number>(0)
  const maxReconnectAttempts = 10 // Максимум попыток переподключения

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  const detachSocketHandlers = useCallback((socket: WebSocket | null) => {
    if (!socket) {
      return
    }

    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
  }, [])

  // Store handlers in refs to avoid stale closures
  const handlersRef = useRef({
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onChatMessage,
    onNotification,
    onRefresh,
    onFileDelivery,
    onConnect,
    onDisconnect,
  })

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onOrderUpdate,
      onBalanceUpdate,
      onProgressUpdate,
      onChatMessage,
      onNotification,
      onRefresh,
      onFileDelivery,
      onConnect,
      onDisconnect,
    }
  }, [onOrderUpdate, onBalanceUpdate, onProgressUpdate, onChatMessage, onNotification, onRefresh, onFileDelivery, onConnect, onDisconnect])

  // Add message handler
  const addMessageHandler = useCallback((handler: MessageHandler) => {
    messageHandlersRef.current.add(handler)
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  // Send message
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  // Handle incoming message - uses refs to always have latest handlers
  const handleMessage = useCallback((event: MessageEvent) => {
    let message: WSMessage

    try {
      message = JSON.parse(event.data) as WSMessage
    } catch {
      // Invalid message format - ignore
      return
    }

    setLastMessage(message)

    // Isolate custom listeners so one broken consumer does not block the stream.
    messageHandlersRef.current.forEach(handler => {
      try {
        handler(message)
      } catch (error) {
        console.warn('[WS] Message handler failed', error)
      }
    })

    const handlers = handlersRef.current

    try {
      switch (message.type) {
        case 'order_update':
          handlers.onOrderUpdate?.(message as OrderUpdateMessage)
          break
        case 'balance_update':
          handlers.onBalanceUpdate?.(message as BalanceUpdateMessage)
          break
        case 'progress_update':
          handlers.onProgressUpdate?.(message as ProgressUpdateMessage)
          break
        case 'chat_message':
          handlers.onChatMessage?.(message as ChatSocketMessage)
          break
        case 'notification':
          handlers.onNotification?.(message as NotificationMessage)
          break
        case 'refresh':
          handlers.onRefresh?.(message as RefreshMessage)
          break
        case 'file_delivery':
          handlers.onFileDelivery?.(message as FileDeliveryMessage)
          break
        case 'ping':
          // Respond to server ping
          sendMessage({ type: 'pong' })
          break
        case 'connected':
          // Connection confirmed by server
          break
      }
    } catch (error) {
      console.warn('[WS] Failed to process message', message.type, error)
    }
  }, [sendMessage]) // Only depends on sendMessage now, handlers are from refs

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!telegramId) {
      return
    }

    clearReconnectTimeout()

    // Clear any existing connection
    if (wsRef.current) {
      const staleSocket = wsRef.current
      wsRef.current = null
      detachSocketHandlers(staleSocket)
      staleSocket.close(1000, 'Reconnect')
    }

    const url = getWebSocketUrl(telegramId)

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (wsRef.current !== ws) {
          return
        }

        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0 // Сброс счётчика при успешном подключении
        clearReconnectTimeout()
        handlersRef.current.onConnect?.()

        // Start ping interval to keep connection alive
        clearPingInterval()
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'ping' })
          }
        }, 25000) // Ping every 25 seconds
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }

        setIsConnected(false)
        if (event.code !== 1000) {
          setConnectionError('Соединение потеряно')
        }
        handlersRef.current.onDisconnect?.()

        // Clear ping interval
        clearPingInterval()

        // Auto-reconnect с экспоненциальным backoff для экономии батареи
        if (autoReconnect && event.code !== 1000) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Экспоненциальный backoff: 5s, 10s, 20s, 40s... до макс 60s
            const backoffDelay = Math.min(
              reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
              60000 // Максимум 60 секунд
            )
            reconnectAttemptsRef.current++
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect()
            }, backoffDelay)
          } else {
            setConnectionError('Соединение потеряно. Обновите страницу.')
          }
        }
      }

      ws.onerror = () => {
        if (wsRef.current !== ws) {
          return
        }

        setConnectionError('Ошибка соединения')
      }
    } catch {
      setConnectionError('Не удалось подключиться')
    }
  }, [telegramId, handleMessage, autoReconnect, reconnectInterval, sendMessage, clearReconnectTimeout, clearPingInterval, detachSocketHandlers])

  // Disconnect
  const disconnect = useCallback(() => {
    clearReconnectTimeout()
    clearPingInterval()
    if (wsRef.current) {
      const activeSocket = wsRef.current
      wsRef.current = null
      detachSocketHandlers(activeSocket)
      activeSocket.close(1000, 'User disconnect')
    }
    setIsConnected(false)
  }, [clearReconnectTimeout, clearPingInterval, detachSocketHandlers])

  // Manual reconnect
  const reconnectTimeoutIdRef = useRef<number | null>(null)
  const reconnect = useCallback(() => {
    disconnect()
    if (reconnectTimeoutIdRef.current) {
      clearTimeout(reconnectTimeoutIdRef.current)
    }
    reconnectTimeoutIdRef.current = window.setTimeout(() => {
      reconnectTimeoutIdRef.current = null
      connect()
    }, 100)
  }, [disconnect, connect])

  // Store connect/disconnect in refs to avoid stale closures in the effect
  const connectRef = useRef(connect)
  const disconnectRef = useRef(disconnect)
  useEffect(() => { connectRef.current = connect }, [connect])
  useEffect(() => { disconnectRef.current = disconnect }, [disconnect])

  // Connect on mount / telegramId change
  useEffect(() => {
    if (telegramId) {
      connectRef.current()
    }

    return () => {
      disconnectRef.current()
      if (reconnectTimeoutIdRef.current) {
        clearTimeout(reconnectTimeoutIdRef.current)
        reconnectTimeoutIdRef.current = null
      }
    }
  }, [telegramId])

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && telegramId && !isConnected) {
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [telegramId, isConnected, connect])

  return {
    isConnected,
    lastMessage,
    connectionError,
    sendMessage,
    addMessageHandler,
    connect,
    disconnect,
    reconnect,
  }
}

// Context for global WebSocket access
import { createContext, useContext, ReactNode } from 'react'

interface WebSocketContextValue {
  isConnected: boolean
  lastMessage: WSMessage | null
  addMessageHandler: (handler: MessageHandler) => () => void
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  telegramId: number | null
  children: ReactNode
  onOrderUpdate?: (msg: OrderUpdateMessage) => void
  onBalanceUpdate?: (msg: BalanceUpdateMessage) => void
  onProgressUpdate?: (msg: ProgressUpdateMessage) => void
  onChatMessage?: (msg: ChatSocketMessage) => void
  onNotification?: (msg: NotificationMessage) => void
  onRefresh?: (msg: RefreshMessage) => void
  onFileDelivery?: (msg: FileDeliveryMessage) => void
}

export function WebSocketProvider({
  telegramId,
  children,
  onOrderUpdate,
  onBalanceUpdate,
  onProgressUpdate,
  onChatMessage,
  onNotification,
  onRefresh,
  onFileDelivery,
}: WebSocketProviderProps) {
  const ws = useWebSocket(telegramId, {
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onChatMessage,
    onNotification,
    onRefresh,
    onFileDelivery,
  })

  const contextValue = useMemo(() => ({
    isConnected: ws.isConnected,
    lastMessage: ws.lastMessage,
    addMessageHandler: ws.addMessageHandler,
    reconnect: ws.reconnect,
  }), [ws.isConnected, ws.lastMessage, ws.addMessageHandler, ws.reconnect])

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}
