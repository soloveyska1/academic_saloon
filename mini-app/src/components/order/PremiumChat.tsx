import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, ChevronDown, Headphones,
  Paperclip, Mic, FileText, Image, Video, Play, Pause,
  Download, Loader, Check, CheckCheck, ArrowDown,
  AlertCircle, RefreshCw, Smile, Square
} from 'lucide-react'
import { ChatMessage } from '../../types'
import { fetchOrderMessages, sendOrderMessage, uploadChatFile, uploadVoiceMessage } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'
import { useWebSocketContext } from '../../hooks/useWebSocket'

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+dnJaUmKOfpaamkXdrbXqFioyMjYeHhIOFiI2MiIuKiYeHiIiIiYuNjY6Ojo6NjIuKiIaDgH57eHZ0cnBua2lnZGJgXltYVVJPTEpIRkRAOzY0Mi8tKyknJSMhIB8eHRwbGhoZGBcWFhUUExIREBAP'

export interface PremiumChatHandle {
  open: () => void
  scrollToBottom: () => void
}

interface Props {
  orderId: number
}

// Skeleton loader for messages
const MessageSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} style={{ display: 'flex', flexDirection: i % 2 === 0 ? 'row-reverse' : 'row' }}>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          style={{
            width: `${50 + Math.random() * 30}%`,
            height: 60,
            borderRadius: 16,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
          }}
        />
      </div>
    ))}
  </div>
)

// Empty state component
const EmptyState = ({ onSendHello }: { onSendHello: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center',
      minHeight: 300,
    }}
  >
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}
    >
      <Headphones size={36} color="#d4af37" />
    </motion.div>

    <h3 style={{
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--text-main)',
      marginBottom: 8,
      fontFamily: 'var(--font-serif)',
    }}>
      Персональный менеджер
    </h3>

    <p style={{
      fontSize: 14,
      color: 'var(--text-secondary)',
      lineHeight: 1.6,
      marginBottom: 24,
      maxWidth: 280,
    }}>
      Здесь вы можете задать любой вопрос по заказу. Мы отвечаем быстро!
    </p>

    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSendHello}
      style={{
        padding: '14px 28px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        color: '#d4af37',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Smile size={18} />
      Поздороваться
    </motion.button>
  </motion.div>
)

// Error state
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center',
      minHeight: 200,
    }}
  >
    <div style={{
      width: 64,
      height: 64,
      borderRadius: 20,
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    }}>
      <AlertCircle size={28} color="#ef4444" />
    </div>

    <p style={{
      fontSize: 14,
      color: 'var(--text-secondary)',
      marginBottom: 16,
    }}>
      {message}
    </p>

    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onRetry}
      style={{
        padding: '12px 24px',
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--text-main)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <RefreshCw size={16} />
      Попробовать снова
    </motion.button>
  </motion.div>
)

// Date separator
const DateSeparator = ({ date }: { date: string }) => {
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === now.toDateString()) return 'Сегодня'
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 0',
    }}>
      <div style={{
        padding: '6px 14px',
        borderRadius: 10,
        background: 'rgba(255, 255, 255, 0.05)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-muted)',
      }}>
        {formatDateLabel(date)}
      </div>
    </div>
  )
}

// Typing indicator
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      background: 'rgba(212, 175, 55, 0.1)',
      borderRadius: '16px 16px 16px 4px',
      border: '1px solid rgba(212, 175, 55, 0.2)',
      alignSelf: 'flex-start',
    }}
  >
    <Headphones size={14} color="#d4af37" />
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#d4af37',
          }}
        />
      ))}
    </div>
  </motion.div>
)

// Message component
const Message = ({ msg, isPlaying, onPlayAudio }: {
  msg: ChatMessage
  isPlaying: boolean
  onPlayAudio: () => void
}) => {
  const isClient = msg.sender_type === 'client'
  const isVoice = msg.file_type === 'voice' || msg.file_type === 'audio'

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isClient ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        alignSelf: isClient ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Sender info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        padding: '0 4px',
      }}>
        {!isClient && <Headphones size={12} color="#d4af37" />}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: isClient ? 'var(--text-muted)' : '#d4af37',
        }}>
          {msg.sender_name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {formatTime(msg.created_at)}
        </span>
        {isClient && (
          msg.is_read
            ? <CheckCheck size={12} color="#3b82f6" />
            : <Check size={12} color="var(--text-muted)" />
        )}
      </div>

      {/* Message bubble */}
      <div style={{
        padding: msg.file_type && !msg.message_text ? 8 : '12px 16px',
        borderRadius: isClient ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isClient
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))'
          : 'rgba(255, 255, 255, 0.05)',
        border: isClient
          ? '1px solid rgba(212, 175, 55, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isClient
          ? '0 4px 15px -5px rgba(212, 175, 55, 0.2)'
          : 'none',
      }}>
        {/* Text message */}
        {msg.message_text && (
          <p style={{
            fontSize: 15,
            color: 'var(--text-main)',
            lineHeight: 1.5,
            margin: 0,
            wordBreak: 'break-word',
          }}>
            {msg.message_text}
          </p>
        )}

        {/* Voice message */}
        {isVoice && msg.file_url && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 20,
              cursor: 'pointer',
              minWidth: 140,
            }}
          >
            {isPlaying ? (
              <Pause size={18} color="#d4af37" />
            ) : (
              <Play size={18} color="#d4af37" />
            )}
            <div style={{
              flex: 1,
              height: 4,
              background: 'rgba(212, 175, 55, 0.3)',
              borderRadius: 2,
            }}>
              <motion.div
                animate={isPlaying ? { width: ['0%', '100%'] } : { width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
                style={{
                  height: '100%',
                  background: '#d4af37',
                  borderRadius: 2,
                }}
              />
            </div>
          </motion.button>
        )}

        {/* File message */}
        {msg.file_type && !isVoice && msg.file_url && (
          <motion.a
            href={msg.file_url}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {msg.file_type === 'photo' ? (
                <Image size={18} color="#3b82f6" />
              ) : msg.file_type === 'video' ? (
                <Video size={18} color="#3b82f6" />
              ) : (
                <FileText size={18} color="#3b82f6" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {msg.file_name || 'Файл'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Нажмите для скачивания
              </div>
            </div>
            <Download size={16} color="var(--text-muted)" />
          </motion.a>
        )}
      </div>
    </motion.div>
  )
}

// Group messages by date
function normalizeMessageDates(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map((msg) => {
      const parsed = new Date(msg.created_at)
      if (Number.isNaN(parsed.getTime())) {
        return { ...msg, created_at: new Date().toISOString() }
      }
      return msg
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

function groupMessagesByDate(messages: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''

  messages.forEach((msg) => {
    const safeDate = new Date(msg.created_at)
    const msgDate = safeDate.toDateString()
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groups.push({ date: safeDate.toISOString(), messages: [msg] })
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  })

  return groups
}

export const PremiumChat = forwardRef<PremiumChatHandle, Props>(({ orderId }, ref) => {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { addMessageHandler, isConnected } = useWebSocketContext()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Audio state
  const [playingId, setPlayingId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // File upload
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    open: () => {
      setIsOpen(true)
      haptic('light')
    },
    scrollToBottom: () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }))

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND)
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }, [])

  // Load messages
  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)

    let attempts = 0
    let lastError: unknown = null

    while (attempts < 3) {
      try {
        const response = await fetchOrderMessages(orderId)
        const msgs = normalizeMessageDates(response?.messages || [])
        setMessages(msgs)
        setUnreadCount(response?.unread_count || 0)
        setLoading(false)
        return
      } catch (err) {
        attempts += 1
        lastError = err
        await new Promise((resolve) => setTimeout(resolve, 400 * attempts))
      }
    }

    if (messages.length === 0) {
      setError('Не удалось загрузить сообщения')
    }
    console.error('Chat load error:', lastError)
    setLoading(false)
  }, [orderId, messages.length])

  // Load on open
  useEffect(() => {
    if (isOpen) {
      loadMessages()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when WS reconnects to recover missed topic messages
  useEffect(() => {
    if (isOpen && isConnected) {
      loadMessages(true)
    }
  }, [isConnected, isOpen, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages.length, isOpen])

  // WebSocket handler for real-time updates
  useEffect(() => {
    const unsubscribe = addMessageHandler((message) => {
      const msgData = message as any

      // Handle new chat messages
      const targetOrderId = Number(msgData.order_id)

      if (message.type === 'chat_message' && targetOrderId === orderId) {
        setIsTyping(false)

        // If message data is included, add it directly
        if (msgData.message) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === msgData.message.id)) return prev
            return normalizeMessageDates([...prev, msgData.message])
          })
        } else {
          // Otherwise reload messages
          loadMessages(true)
        }

        // Sound + haptic notification
        playNotificationSound()
        hapticSuccess()
      }

      // Handle typing indicator
      if (message.type === 'typing_indicator' && targetOrderId === orderId) {
        setIsTyping(msgData.is_typing)
        if (msgData.is_typing) {
          setTimeout(() => setIsTyping(false), 5000)
        }
      }

      // Handle admin message specifically (legacy format)
      if (message.type === 'new_message' && targetOrderId === orderId) {
        loadMessages(true)
        playNotificationSound()
        hapticSuccess()
      }
    })
    return unsubscribe
  }, [orderId, addMessageHandler, hapticSuccess, loadMessages, playNotificationSound])

  // Scroll detection
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100)
    }
  }, [])

  // Send message
  const handleSend = async (text?: string) => {
    const messageText = text || newMessage.trim()
    if (!messageText || sending) return

    haptic('medium')
    setSending(true)
    setError(null)

    try {
      const response = await sendOrderMessage(orderId, messageText)
      if (response.success) {
        hapticSuccess()
        const newMsg: ChatMessage = {
          id: response.message_id,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: messageText,
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: new Date().toISOString(),
          is_read: false,
        }
        setMessages(prev => normalizeMessageDates([...prev, newMsg]))
        setNewMessage('')
        inputRef.current?.focus()
      } else {
        hapticError()
        setError('Не удалось отправить')
      }
    } catch (err) {
      hapticError()
      setError('Ошибка отправки')
    } finally {
      setSending(false)
    }
  }

  // File upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.size > 20 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 20 МБ)')
      return
    }

    haptic('medium')
    setUploading(true)

    try {
      const response = await uploadChatFile(orderId, file)
      if (response.success) {
        hapticSuccess()
        loadMessages()
      }
    } catch (err) {
      hapticError()
      setError('Ошибка загрузки файла')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Voice recording - toggle mode (click to start, click to stop)
  const shouldSendRecordingRef = useRef(false)

  const startRecording = async () => {
    if (isRecording || uploading) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      shouldSendRecordingRef.current = false

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const shouldSend = shouldSendRecordingRef.current
        shouldSendRecordingRef.current = false

        if (audioChunksRef.current.length > 0 && shouldSend) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          await sendVoice(blob)
        }
        audioChunksRef.current = []
        setRecordingDuration(0)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingDuration(0)
      haptic('medium')

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch {
      setError('Разрешите доступ к микрофону')
      hapticError()
    }
  }

  const stopRecording = (shouldSend: boolean) => {
    if (!isRecording) return
    shouldSendRecordingRef.current = shouldSend
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    haptic(shouldSend ? 'medium' : 'light')
  }

  const cancelRecording = () => {
    stopRecording(false)
  }

  const sendVoice = async (blob: Blob) => {
    setUploading(true)
    try {
      const response = await uploadVoiceMessage(orderId, blob)
      if (response.success) {
        hapticSuccess()
        setMessages(prev => normalizeMessageDates([...prev, {
          id: response.message_id,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: null,
          file_type: 'audio',
          file_name: 'Голосовое сообщение',
          file_url: response.file_url,
          created_at: new Date().toISOString(),
          is_read: false,
        }]))
        loadMessages(true)
      }
    } catch {
      hapticError()
      setError('Ошибка отправки голосового')
    } finally {
      setUploading(false)
      setRecordingDuration(0)
    }
  }

  // Audio playback
  const toggleAudio = (msg: ChatMessage) => {
    if (!msg.file_url) return

    if (playingId === msg.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(msg.file_url)
      audioRef.current = audio
      audio.onended = () => setPlayingId(null)
      audio.play().catch(() => setPlayingId(null))
      setPlayingId(msg.id)
      haptic('light')
    }
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const messageGroups = groupMessagesByDate(messages)

  // Collapsed state - chat button
  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => { setIsOpen(true); haptic('medium') }}
          style={{
            width: '100%',
            padding: 20,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(25, 25, 30, 0.95), rgba(30, 30, 35, 0.9))',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(212, 175, 55, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
              position: 'relative',
            }}>
              <Headphones size={24} color="#050505" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    background: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    border: '2px solid var(--bg-main)',
                  }}
                >
                  {unreadCount}
                </motion.div>
              )}
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 4,
                fontFamily: 'var(--font-serif)',
              }}>
                Написать менеджеру
              </div>
              <div style={{
                fontSize: 12,
                color: unreadCount > 0 ? '#22c55e' : 'rgba(212, 175, 55, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {unreadCount > 0 ? (
                  <span style={{ fontWeight: 600 }}>{unreadCount} новых</span>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                    Онлайн • Отвечаем быстро
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}>
            <ChevronDown size={20} color="rgba(255, 255, 255, 0.6)" style={{ transform: 'rotate(180deg)' }} />
          </div>
        </motion.button>
      </motion.div>
    )
  }

  // Expanded fullscreen chat
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--bg-main)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(20, 20, 23, 0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setIsOpen(false); haptic('light') }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={20} color="var(--text-main)" />
        </motion.button>

        <div style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Headphones size={22} color="#d4af37" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 2,
          }}>
            Персональный менеджер
          </div>
          <div style={{
            fontSize: 12,
            color: isTyping ? '#d4af37' : (isConnected ? '#22c55e' : 'var(--text-muted)'),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {isTyping ? (
              'печатает...'
            ) : isConnected ? (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                онлайн
              </>
            ) : (
              'оффлайн'
            )}
          </div>
        </div>

        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          #{orderId}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px',
        }}
      >
        {loading ? (
          <MessageSkeleton />
        ) : error && messages.length === 0 ? (
          <ErrorState message={error} onRetry={loadMessages} />
        ) : messages.length === 0 ? (
          <EmptyState onSendHello={() => handleSend('Здравствуйте! 👋')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, paddingBottom: 8 }}>
            {messageGroups.map((group, gi) => (
              <div key={gi}>
                <DateSeparator date={group.date} />
                {group.messages.map((msg) => (
                  <Message
                    key={msg.id}
                    msg={msg}
                    isPlaying={playingId === msg.id}
                    onPlayAudio={() => toggleAudio(msg)}
                  />
                ))}
              </div>
            ))}

            <AnimatePresence>
              {isTyping && <TypingIndicator />}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              position: 'absolute',
              bottom: 100,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'rgba(212, 175, 55, 0.9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
            }}
          >
            <ArrowDown size={20} color="#050505" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Recording indicator - inline in input area */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '10px 16px',
              background: 'rgba(239, 68, 68, 0.08)',
              borderTop: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}
            />
            <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              {formatDuration(recordingDuration)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
              Запись голосового...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px 16px',
              background: 'rgba(212, 175, 55, 0.1)',
              borderTop: '1px solid rgba(212, 175, 55, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Loader size={16} color="#d4af37" className="animate-spin" />
            <span style={{ fontSize: 13, color: '#d4af37' }}>Загрузка...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(20, 20, 23, 0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        {/* File button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          style={{ display: 'none' }}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isRecording}
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: isRecording ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: uploading || isRecording ? 0.5 : 1,
          }}
        >
          <Paperclip size={20} color="var(--text-muted)" />
        </motion.button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Написать сообщение..."
          disabled={sending || uploading || isRecording}
          style={{
            flex: 1,
            padding: '14px 18px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            fontSize: 16,
            color: 'var(--text-main)',
            outline: 'none',
          }}
        />

        {/* Send/Voice button */}
        {newMessage.trim() ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSend()}
            disabled={sending}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #d4af37, #b8860b)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
            }}
          >
            {sending ? (
              <Loader size={20} color="#050505" className="animate-spin" />
            ) : (
              <Send size={20} color="#050505" />
            )}
          </motion.button>
        ) : isRecording ? (
          /* Recording in progress - show cancel + send buttons */
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={cancelRecording}
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: '#ef4444',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
              }}
            >
              <Square size={18} color="#fff" fill="#fff" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => stopRecording(true)}
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
              }}
            >
              <Send size={20} color="#050505" />
            </motion.button>
          </div>
        ) : (
          /* Mic button to start recording */
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={startRecording}
            disabled={uploading}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: uploading ? 0.5 : 1,
            }}
          >
            <Mic size={20} color="var(--text-muted)" />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
})
