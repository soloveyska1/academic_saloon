import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, ChevronDown, User, Headphones,
  Paperclip, Mic, MicOff, FileText, Image, Video, Play, Pause,
  Download, X, Loader, StopCircle, Check, CheckCheck, Circle
} from 'lucide-react'
import { ChatMessage } from '../types'
import { fetchOrderMessages, sendOrderMessage, uploadChatFile, uploadVoiceMessage } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useWebSocketContext } from '../hooks/useWebSocket'

interface Props {
  orderId: number
}

// Typing indicator animation
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 4, padding: '12px 16px' }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{
          y: [0, -4, 0],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut"
        }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#d4af37',
        }}
      />
    ))}
  </div>
)

// Message status indicator
const MessageStatus = ({ isRead, isSent }: { isRead: boolean, isSent: boolean }) => {
  if (!isSent) {
    return <Circle size={12} color="var(--text-muted)" style={{ opacity: 0.5 }} />
  }
  if (isRead) {
    return <CheckCheck size={14} color="#3b82f6" />
  }
  return <Check size={14} color="var(--text-muted)" />
}

// File type icons
const FILE_ICONS: Record<string, typeof FileText> = {
  photo: Image,
  document: FileText,
  video: Video,
  voice: Mic,
  audio: Mic,
}

export function OrderChat({ orderId }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const { addMessageHandler, isConnected } = useWebSocketContext()

  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdminTyping, setIsAdminTyping] = useState(false)

  // File upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load messages when expanded
  useEffect(() => {
    if (isExpanded && messages.length === 0) {
      loadMessages()
    }
  }, [isExpanded])

  // Scroll to bottom when new messages appear
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = addMessageHandler((message) => {
      if (message.type === 'chat_message' && (message as any).order_id === orderId) {
        // New message received via WebSocket
        console.log('[Chat] New message received:', message)
        setIsAdminTyping(false) // Stop typing indicator
        loadMessages()
        hapticSuccess()
      }
      // Handle typing indicator
      if (message.type === 'typing_indicator' && (message as any).order_id === orderId) {
        setIsAdminTyping((message as any).is_typing)
        // Auto-clear typing after 5 seconds
        if ((message as any).is_typing) {
          setTimeout(() => setIsAdminTyping(false), 5000)
        }
      }
    })
    return unsubscribe
  }, [orderId, addMessageHandler, hapticSuccess])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchOrderMessages(orderId)
      setMessages(response.messages)
      setUnreadCount(response.unread_count)
    } catch (err) {
      setError('Не удалось загрузить сообщения')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const text = newMessage.trim()
    if (!text || sending) return

    haptic('medium')
    setSending(true)
    setError(null)

    try {
      const response = await sendOrderMessage(orderId, text)
      if (response.success) {
        hapticSuccess()
        const newMsg: ChatMessage = {
          id: response.message_id,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: text,
          file_type: null,
          file_name: null,
          file_url: null,
          created_at: new Date().toISOString(),
          is_read: true,
        }
        setMessages(prev => [...prev, newMsg])
        setNewMessage('')
      } else {
        hapticError()
        setError('Не удалось отправить сообщение')
      }
    } catch (err) {
      hapticError()
      setError('Ошибка отправки')
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  // File upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 20 МБ)')
      return
    }

    haptic('medium')
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const response = await uploadChatFile(orderId, file, (progress) => {
        setUploadProgress(progress)
      })

      if (response.success) {
        hapticSuccess()
        const newMsg: ChatMessage = {
          id: response.message_id,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: null,
          file_type: file.type.startsWith('image/') ? 'photo' :
                     file.type.startsWith('video/') ? 'video' : 'document',
          file_name: file.name,
          file_url: response.file_url,
          created_at: new Date().toISOString(),
          is_read: true,
        }
        setMessages(prev => [...prev, newMsg])
      } else {
        hapticError()
        setError('Не удалось отправить файл')
      }
    } catch (err) {
      hapticError()
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Use webm format which is widely supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          await sendVoiceMessage(audioBlob)
        }
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingDuration(0)
      haptic('medium')

      // Start duration timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Не удалось начать запись. Разрешите доступ к микрофону.')
      hapticError()
    }
  }

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current.stop()
    }

    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingDuration(0)
    haptic('light')
  }

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const response = await uploadVoiceMessage(orderId, audioBlob, (progress) => {
        setUploadProgress(progress)
      })

      if (response.success) {
        hapticSuccess()
        const newMsg: ChatMessage = {
          id: response.message_id,
          sender_type: 'client',
          sender_name: 'Вы',
          message_text: null,
          file_type: 'voice',
          file_name: 'Голосовое сообщение',
          file_url: response.file_url,
          created_at: new Date().toISOString(),
          is_read: true,
        }
        setMessages(prev => [...prev, newMsg])
      } else {
        hapticError()
        setError('Не удалось отправить голосовое')
      }
    } catch (err) {
      hapticError()
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setRecordingDuration(0)
    }
  }

  // Audio playback
  const toggleAudioPlayback = (msg: ChatMessage) => {
    if (!msg.file_url) return

    if (playingAudioId === msg.id) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingAudioId(null)
    } else {
      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause()
      }

      // Start new playback
      const audio = new Audio(msg.file_url)
      audioRef.current = audio

      audio.onended = () => {
        setPlayingAudioId(null)
        audioRef.current = null
      }

      audio.play().catch(err => {
        console.error('Failed to play audio:', err)
        setPlayingAudioId(null)
      })

      setPlayingAudioId(msg.id)
      haptic('light')
    }
  }

  const toggleExpanded = () => {
    haptic('light')
    setIsExpanded(!isExpanded)
    if (!isExpanded && unreadCount > 0) {
      setUnreadCount(0)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Render message content based on type
  const renderMessageContent = (msg: ChatMessage) => {
    // Text message
    if (msg.message_text) {
      return (
        <div style={{
          fontSize: 14,
          color: 'var(--text-main)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {msg.message_text}
        </div>
      )
    }

    // File message
    if (msg.file_type) {
      const FileIcon = FILE_ICONS[msg.file_type] || FileText
      const isVoice = msg.file_type === 'voice' || msg.file_type === 'audio'
      const isPlaying = playingAudioId === msg.id

      if (isVoice) {
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleAudioPlayback(msg)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 20,
              cursor: 'pointer',
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
              minWidth: 80,
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
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {msg.file_name || 'Голосовое'}
            </span>
          </motion.button>
        )
      }

      // Regular file
      return (
        <motion.a
          href={msg.file_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-default)',
            borderRadius: 12,
            textDecoration: 'none',
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(212, 175, 55, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FileIcon size={18} color="#d4af37" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-main)',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 150,
            }}>
              {msg.file_name || 'Файл'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {msg.file_type === 'photo' ? 'Фото' :
               msg.file_type === 'video' ? 'Видео' : 'Документ'}
            </div>
          </div>
          <Download size={16} color="var(--text-muted)" />
        </motion.a>
      )
    }

    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-card-solid)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        marginTop: 16,
        marginBottom: 80,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <motion.button
        onClick={toggleExpanded}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <MessageCircle size={20} color="#d4af37" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {unreadCount}
            </motion.div>
          )}
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
              Чат с менеджером
            </span>
            {/* Online indicator */}
            <motion.div
              animate={{
                scale: isConnected ? [1, 1.2, 1] : 1,
                opacity: isConnected ? 1 : 0.5,
              }}
              transition={{ repeat: isConnected ? Infinity : 0, duration: 2 }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#71717a',
                boxShadow: isConnected ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {isAdminTyping ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ color: '#d4af37' }}
              >
                печатает...
              </motion.span>
            ) : isConnected ? (
              messages.length > 0 ? `${messages.length} сообщений • онлайн` : 'Задайте вопрос • онлайн'
            ) : (
              messages.length > 0 ? `${messages.length} сообщений` : 'Задайте вопрос'
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} color="var(--text-muted)" />
        </motion.div>
      </motion.button>

      {/* Chat Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '0 16px 16px',
            }}>
              {/* Messages Area */}
              <div style={{
                maxHeight: 350,
                overflowY: 'auto',
                padding: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {loading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: 24,
                    color: 'var(--text-muted)',
                    fontSize: 14,
                  }}>
                    <Loader size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Загрузка...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: 24,
                    color: 'var(--text-muted)',
                    fontSize: 14,
                  }}>
                    Нет сообщений. Напишите первым!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender_type === 'client' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{
                        maxWidth: '85%',
                        padding: msg.file_type && !msg.message_text ? '8px' : '10px 14px',
                        borderRadius: msg.sender_type === 'client'
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: msg.sender_type === 'client'
                          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))'
                          : 'var(--bg-glass)',
                        border: msg.sender_type === 'client'
                          ? '1px solid rgba(212, 175, 55, 0.3)'
                          : '1px solid var(--border-default)',
                      }}>
                        {/* Message Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          padding: msg.file_type && !msg.message_text ? '0 6px' : 0,
                        }}>
                          {msg.sender_type === 'admin' ? (
                            <Headphones size={12} color="#d4af37" />
                          ) : (
                            <User size={12} color="var(--text-muted)" />
                          )}
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: msg.sender_type === 'admin' ? '#d4af37' : 'var(--text-muted)',
                          }}>
                            {msg.sender_name}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {formatTime(msg.created_at)}
                          </span>
                          {/* Message status for client messages */}
                          {msg.sender_type === 'client' && (
                            <MessageStatus isRead={msg.is_read} isSent={true} />
                          )}
                        </div>

                        {/* Message Content */}
                        {renderMessageContent(msg)}
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Typing indicator */}
                <AnimatePresence>
                  {isAdminTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '16px 16px 16px 4px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-default)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Headphones size={12} color="#d4af37" />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#d4af37' }}>
                            Менеджер
                          </span>
                        </div>
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Upload Progress */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '12px 16px',
                      marginBottom: 12,
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}>
                      <Loader size={16} color="#d4af37" className="animate-spin" />
                      <span style={{ fontSize: 13, color: '#d4af37' }}>
                        Загрузка... {uploadProgress}%
                      </span>
                    </div>
                    <div style={{
                      height: 4,
                      background: 'rgba(212, 175, 55, 0.2)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        style={{
                          height: '100%',
                          background: '#d4af37',
                          borderRadius: 2,
                        }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recording Indicator */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '12px 16px',
                      marginBottom: 12,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#ef4444',
                        }}
                      />
                      <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 500 }}>
                        Запись {formatDuration(recordingDuration)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={cancelRecording}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: 'var(--bg-glass)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={18} color="#ef4444" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={stopRecording}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: '#ef4444',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <StopCircle size={18} color="#fff" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '10px 14px',
                    marginBottom: 12,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {error}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setError(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} color="#ef4444" />
                  </motion.button>
                </motion.div>
              )}

              {/* Input Area */}
              <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}>
                {/* File Upload Button */}
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
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploading || isRecording ? 'not-allowed' : 'pointer',
                    opacity: uploading || isRecording ? 0.5 : 1,
                  }}
                >
                  <Paperclip size={18} color="var(--text-muted)" />
                </motion.button>

                {/* Text Input */}
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
                    padding: '12px 16px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    fontSize: 15,
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />

                {/* Voice/Send Button */}
                {newMessage.trim() ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #d4af37, #b48e26)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: sending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sending ? (
                      <Loader size={18} color="#050505" className="animate-spin" />
                    ) : (
                      <Send size={18} color="#050505" />
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onMouseDown={startRecording}
                    disabled={uploading}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: isRecording
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'var(--bg-glass)',
                      border: isRecording
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.5 : 1,
                    }}
                  >
                    {isRecording ? (
                      <MicOff size={18} color="#ef4444" />
                    ) : (
                      <Mic size={18} color="var(--text-muted)" />
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
