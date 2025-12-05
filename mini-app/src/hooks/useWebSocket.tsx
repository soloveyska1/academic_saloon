import { useEffect, useRef, useState, useCallback } from 'react'

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
}

export interface BalanceUpdateMessage extends WSMessage {
  type: 'balance_update'
  balance: number
  change: number
  reason: string
}

export interface NotificationMessage extends WSMessage {
  type: 'notification'
  notification_type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
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

type MessageHandler = (message: WSMessage) => void

interface UseWebSocketOptions {
  onOrderUpdate?: (msg: OrderUpdateMessage) => void
  onBalanceUpdate?: (msg: BalanceUpdateMessage) => void
  onProgressUpdate?: (msg: ProgressUpdateMessage) => void
  onNotification?: (msg: NotificationMessage) => void
  onRefresh?: (msg: RefreshMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

// Get WebSocket URL - using hardcoded base to avoid double /api issue
function getWebSocketUrl(telegramId: number): string {
  // Always use the base domain, not API_URL which may include /api
  const baseUrl = 'wss://academic-saloon.duckdns.org'
  return `${baseUrl}/api/ws?telegram_id=${telegramId}`
}

export function useWebSocket(telegramId: number | null, options: UseWebSocketOptions = {}) {
  const {
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onNotification,
    onRefresh,
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

  // Store handlers in refs to avoid stale closures
  const handlersRef = useRef({
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onNotification,
    onRefresh,
    onConnect,
    onDisconnect,
  })

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onOrderUpdate,
      onBalanceUpdate,
      onProgressUpdate,
      onNotification,
      onRefresh,
      onConnect,
      onDisconnect,
    }
  }, [onOrderUpdate, onBalanceUpdate, onProgressUpdate, onNotification, onRefresh, onConnect, onDisconnect])

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
    try {
      const message: WSMessage = JSON.parse(event.data)
      console.log('[WS] Received message:', message.type, message)
      setLastMessage(message)

      // Call all registered handlers
      messageHandlersRef.current.forEach(handler => handler(message))

      // Call specific handlers based on message type (using refs for latest versions)
      const handlers = handlersRef.current
      switch (message.type) {
        case 'order_update':
          console.log('[WS] Calling onOrderUpdate handler')
          handlers.onOrderUpdate?.(message as OrderUpdateMessage)
          break
        case 'balance_update':
          console.log('[WS] Calling onBalanceUpdate handler')
          handlers.onBalanceUpdate?.(message as BalanceUpdateMessage)
          break
        case 'progress_update':
          console.log('[WS] Calling onProgressUpdate handler')
          handlers.onProgressUpdate?.(message as ProgressUpdateMessage)
          break
        case 'notification':
          console.log('[WS] Calling onNotification handler')
          handlers.onNotification?.(message as NotificationMessage)
          break
        case 'refresh':
          console.log('[WS] Calling onRefresh handler')
          handlers.onRefresh?.(message as RefreshMessage)
          break
        case 'ping':
          // Respond to server ping
          sendMessage({ type: 'pong' })
          break
        case 'connected':
          console.log('[WS] Connected to server')
          break
      }
    } catch (e) {
      console.error('[WS] Failed to parse message:', e)
    }
  }, [sendMessage]) // Only depends on sendMessage now, handlers are from refs

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!telegramId) {
      console.log('[WS] No telegramId, skipping connection')
      return
    }

    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const url = getWebSocketUrl(telegramId)
    console.log('[WS] Connecting to:', url)

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('[WS] Connection opened successfully!')
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttemptsRef.current = 0 // Сброс счётчика при успешном подключении
        handlersRef.current.onConnect?.()

        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage({ type: 'ping' })
          }
        }, 25000) // Ping every 25 seconds
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason)
        setIsConnected(false)
        handlersRef.current.onDisconnect?.()

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }

        // Auto-reconnect с экспоненциальным backoff для экономии батареи
        if (autoReconnect && event.code !== 1000) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            // Экспоненциальный backoff: 5s, 10s, 20s, 40s... до макс 60s
            const backoffDelay = Math.min(
              reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
              60000 // Максимум 60 секунд
            )
            reconnectAttemptsRef.current++
            console.log(`[WS] Reconnecting in ${backoffDelay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect()
            }, backoffDelay)
          } else {
            console.log('[WS] Max reconnection attempts reached, stopping auto-reconnect')
            setConnectionError('Connection lost. Please refresh the page.')
          }
        }
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
        setConnectionError('Connection error')
      }

      wsRef.current = ws
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e)
      setConnectionError('Failed to connect')
    }
  }, [telegramId, handleMessage, autoReconnect, reconnectInterval, sendMessage])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect')
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Connect on mount / telegramId change
  useEffect(() => {
    if (telegramId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [telegramId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && telegramId && !isConnected) {
        console.log('[WS] Tab visible, reconnecting...')
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
  onNotification?: (msg: NotificationMessage) => void
  onRefresh?: (msg: RefreshMessage) => void
}

export function WebSocketProvider({
  telegramId,
  children,
  onOrderUpdate,
  onBalanceUpdate,
  onProgressUpdate,
  onNotification,
  onRefresh,
}: WebSocketProviderProps) {
  const ws = useWebSocket(telegramId, {
    onOrderUpdate,
    onBalanceUpdate,
    onProgressUpdate,
    onNotification,
    onRefresh,
  })

  return (
    <WebSocketContext.Provider value={{
      isConnected: ws.isConnected,
      lastMessage: ws.lastMessage,
      addMessageHandler: ws.addMessageHandler,
      reconnect: ws.reconnect,
    }}>
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
