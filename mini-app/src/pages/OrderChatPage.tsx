import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  MicOff,
  FileText,
  Image,
  Video,
  Download,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  StopCircle,
  MessageCircle,
  Check,
  CheckCheck
} from 'lucide-react'
import { ChatMessage } from '../types'
import { fetchOrderMessages, sendOrderMessage, uploadChatFile, uploadVoiceMessage } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'
import { useWebSocketContext } from '../hooks/useWebSocket'
import { FloatingParticles } from '../components/ui/PremiumDesign'

// File type icons
const FILE_ICONS: Record<string, typeof FileText> = {
  photo: Image,
  document: FileText,
  video: Video,
  voice: Mic,
  audio: Mic,
}

// Message status indicator
const MessageStatus = ({ isRead }: { isRead: boolean }) => {
  if (isRead) {
    return <CheckCheck size={14} color="#3b82f6" />
  }
  return <Check size={14} color="var(--text-muted)" />
}

export function OrderChatPage() {
  const { id } = useParams<{ id: string }>()
  const orderId = parseInt(id || '0', 10)
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const { addMessageHandler } = useWebSocketContext()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
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
  const errorCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    if (!orderId) return
    try {
      const response = await fetchOrderMessages(orderId)
      errorCountRef.current = 0
      setError(null)
      setMessages(response.messages)
    } catch {
      errorCountRef.current++
      if (errorCountRef.current >= 3) {
        setError('Не удалось загрузить сообщения')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  // Initial load and polling
  useEffect(() => {
    loadMessages()
    intervalRef.current = setInterval(loadMessages, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // WebSocket for real-time updates
  useEffect(() => {
    const unsubscribe = addMessageHandler((message) => {
      if (message.type === 'chat_message' && (message as any).order_id === orderId) {
        setIsAdminTyping(false)
        loadMessages()
        haptic?.('success')
      }
      if (message.type === 'typing_indicator' && (message as any).order_id === orderId) {
        setIsAdminTyping((message as any).is_typing)
        if ((message as any).is_typing) {
          setTimeout(() => setIsAdminTyping(false), 5000)
        }
      }
    })
    return unsubscribe
  }, [orderId, addMessageHandler, loadMessages, haptic])

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

  const handleBack = useCallback(() => {
    haptic?.('light')
    navigate(`/order/${orderId}`)
  }, [haptic, navigate, orderId])

  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    errorCountRef.current = 0
    loadMessages()
    if (!intervalRef.current) {
      intervalRef.current = setInterval(loadMessages, 5000)
    }
  }, [loadMessages])

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return

    haptic?.('light')
    setIsSending(true)
    const textToSend = inputText
    setInputText('')

    try {
      // Optimistic update
      const tempMsg: ChatMessage = {
        id: Date.now(),
        sender_type: 'client',
        sender_name: 'Вы',
        message_text: textToSend,
        file_type: null,
        file_name: null,
        file_url: null,
        created_at: new Date().toISOString(),
        is_read: false
      }
      setMessages(prev => [...prev, tempMsg])

      const response = await sendOrderMessage(orderId, textToSend)
      if (response.success) {
        haptic?.('success')
        await loadMessages()
      } else {
        setInputText(textToSend)
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        haptic?.('error')
      }
    } catch {
      setInputText(textToSend)
      haptic?.('error')
    } finally {
      setIsSending(false)
    }
  }

  // File upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 20 МБ)')
      return
    }

    haptic?.('medium')
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const response = await uploadChatFile(orderId, file, (progress) => {
        setUploadProgress(progress)
      })

      if (response.success) {
        haptic?.('success')
        await loadMessages()
      } else {
        haptic?.('error')
        setError('Не удалось отправить файл')
      }
    } catch (err) {
      haptic?.('error')
      setError(err instanceof Error ? err.message : 'Ошибка отправки')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
      haptic?.('medium')

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch {
      setError('Не удалось получить доступ к микрофону')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      haptic?.('medium')
    }
  }, [isRecording, haptic])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = []
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      haptic?.('light')
    }
  }, [isRecording, haptic])

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setUploading(true)
    try {
      const response = await uploadVoiceMessage(orderId, audioBlob)
      if (response.success) {
        haptic?.('success')
        await loadMessages()
      } else {
        haptic?.('error')
        setError('Не удалось отправить голосовое сообщение')
      }
    } catch {
      haptic?.('error')
      setError('Ошибка отправки голосового сообщения')
    } finally {
      setUploading(false)
    }
  }

  // Audio playback
  const handlePlayAudio = useCallback((messageId: number, url: string) => {
    if (playingAudioId === messageId) {
      audioRef.current?.pause()
      setPlayingAudioId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(url)
    audioRef.current = audio
    audio.play()
    setPlayingAudioId(messageId)

    audio.onended = () => {
      setPlayingAudioId(null)
    }
  }, [playingAudioId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!orderId) {
    return (
      <div className="app-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Заказ не найден</p>
      </div>
    )
  }

  return (
    <div
      className="app-content"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        background: 'var(--bg-main)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <FloatingParticles />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          background: 'rgba(10, 10, 12, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={18} color="var(--text-main)" />
        </motion.button>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #d4af37, #8b6914)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
          }}
        >
          <MessageCircle size={18} color="#0a0a0c" />
        </motion.div>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            fontWeight: 700,
            background: 'var(--gold-text-shine)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Чат по заказу #{orderId}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {isAdminTyping ? 'Печатает...' : 'Вопросы по этому заказу'}
          </p>
        </div>
      </motion.header>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 2 }}>
        {isLoading && messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Loader2 className="animate-spin" color="#d4af37" />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            <AlertCircle size={48} color="rgba(239,68,68,0.5)" style={{ margin: '0 auto 16px' }} />
            <p style={{ marginBottom: 16 }}>{error}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 12,
                color: '#d4af37',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Повторить
            </motion.button>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            <MessageCircle size={48} color="rgba(212,175,55,0.3)" style={{ margin: '0 auto 16px' }} />
            <p>Задайте вопрос по этому заказу</p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>Мы ответим в ближайшее время</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_type === 'client'
            const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_type === 'client')
            const FileIcon = msg.file_type ? FILE_ICONS[msg.file_type] || FileText : FileText

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  gap: 8,
                  flexDirection: isMe ? 'row-reverse' : 'row'
                }}
              >
                {!isMe && (
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(212,175,55,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: showAvatar ? 1 : 0,
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#d4af37' }}>С</span>
                  </div>
                )}

                <div>
                  {/* Bubble */}
                  <div style={{
                    padding: msg.file_type === 'photo' ? 4 : '12px 16px',
                    borderRadius: 18,
                    borderTopRightRadius: isMe ? 4 : 18,
                    borderTopLeftRadius: !isMe ? 4 : 18,
                    background: isMe
                      ? 'linear-gradient(135deg, #d4af37, #b38728)'
                      : 'rgba(255,255,255,0.05)',
                    color: isMe ? '#000' : 'var(--text-main)',
                    border: !isMe ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    fontSize: 15,
                    lineHeight: 1.4,
                    boxShadow: isMe ? '0 4px 12px rgba(212,175,55,0.2)' : 'none'
                  }}>
                    {/* Text message */}
                    {msg.message_text && <span>{msg.message_text}</span>}

                    {/* Photo */}
                    {msg.file_type === 'photo' && msg.file_url && (
                      <img
                        src={msg.file_url}
                        alt={msg.file_name || 'Фото'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 300,
                          borderRadius: 14,
                          display: 'block'
                        }}
                      />
                    )}

                    {/* Voice message */}
                    {(msg.file_type === 'voice' || msg.file_type === 'audio') && msg.file_url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePlayAudio(msg.id, msg.file_url!)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(212,175,55,0.2)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause size={18} color={isMe ? '#000' : '#d4af37'} />
                          ) : (
                            <Play size={18} color={isMe ? '#000' : '#d4af37'} />
                          )}
                        </motion.button>
                        <div style={{
                          flex: 1,
                          height: 4,
                          background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                          borderRadius: 2
                        }}>
                          <div style={{
                            width: playingAudioId === msg.id ? '50%' : '0%',
                            height: '100%',
                            background: isMe ? '#000' : '#d4af37',
                            borderRadius: 2,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Document/Video */}
                    {msg.file_type && !['photo', 'voice', 'audio'].includes(msg.file_type) && msg.file_url && (
                      <motion.a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 12px',
                          background: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          textDecoration: 'none',
                          color: 'inherit'
                        }}
                      >
                        <FileIcon size={24} color={isMe ? '#000' : '#d4af37'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {msg.file_name || 'Файл'}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>
                            {msg.file_type === 'video' ? 'Видео' : 'Документ'}
                          </div>
                        </div>
                        <Download size={18} />
                      </motion.a>
                    )}
                  </div>

                  {/* Time and status */}
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                    textAlign: isMe ? 'right' : 'left',
                    paddingRight: isMe ? 4 : 0,
                    paddingLeft: !isMe ? 4 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    gap: 4
                  }}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && <MessageStatus isRead={msg.is_read} />}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}

        {/* Typing indicator */}
        {isAdminTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ alignSelf: 'flex-start', display: 'flex', gap: 8 }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(212,175,55,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#d4af37' }}>С</span>
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: 18,
              borderTopLeftRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
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
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(212,175,55,0.1)',
          borderTop: '1px solid rgba(212,175,55,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Loader2 size={16} color="#d4af37" className="animate-spin" />
            <span style={{ fontSize: 13, color: '#d4af37' }}>
              Загрузка... {uploadProgress}%
            </span>
            <div style={{ flex: 1, height: 3, background: 'rgba(212,175,55,0.2)', borderRadius: 2 }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: '#d4af37',
                borderRadius: 2,
                transition: 'width 0.2s'
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)',
          borderTop: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ef4444'
              }}
            />
            <span style={{ fontSize: 14, color: '#ef4444' }}>
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
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} color="var(--text-muted)" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <StopCircle size={18} color="#fff" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: 'rgba(20, 20, 23, 0.95)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 3
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 24,
          padding: '8px 8px 8px 16px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploading || isRecording ? 'default' : 'pointer',
              opacity: uploading || isRecording ? 0.5 : 1
            }}
          >
            <Paperclip size={20} color="var(--text-muted)" />
          </motion.button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            disabled={isRecording}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: 15,
              resize: 'none',
              padding: '10px 0',
              maxHeight: 100,
              minHeight: 24,
              outline: 'none',
              fontFamily: 'inherit',
              opacity: isRecording ? 0.5 : 1
            }}
          />

          {/* Voice or Send button */}
          {inputText.trim() ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={isSending}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: isSending ? 'default' : 'pointer',
                color: '#000',
                flexShrink: 0
              }}
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={uploading}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: uploading ? 'default' : 'pointer',
                flexShrink: 0,
                opacity: uploading ? 0.5 : 1
              }}
            >
              {isRecording ? (
                <MicOff size={18} color="#fff" />
              ) : (
                <Mic size={18} color="var(--text-muted)" />
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderChatPage
