import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
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
import { isChatSocketMessage, isTypingIndicatorSocketMessage, useWebSocketContext } from '../hooks/useWebSocket'
import { useSafeBackNavigation } from '../hooks/useSafeBackNavigation'
import { haveSameChatMessages } from '../lib/chatMessages'
import { FloatingParticles } from '../components/ui/PremiumDesign'
import { PremiumBackground } from '../components/ui/PremiumBackground'
import ps from '../styles/PremiumPageSystem.module.css'

const MAX_CHAT_MESSAGE_LENGTH = 5000

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
    return <CheckCheck size={14} color="var(--info-text)" />
  }
  return <Check size={14} color="var(--text-muted)" />
}

export function OrderChatPage() {
  const { id } = useParams<{ id: string }>()
  const orderId = parseInt(id || '0', 10)
  const { haptic } = useTelegram()
  const { addMessageHandler, isConnected } = useWebSocketContext()
  const safeBack = useSafeBackNavigation(orderId ? `/order/${orderId}` : '/orders')

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)
  const pendingRefreshRef = useRef(false)
  const isMountedRef = useRef(true)
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const loadMessages = useCallback(async () => {
    if (!orderId) return

    if (isFetchingRef.current) {
      pendingRefreshRef.current = true
      return
    }

    isFetchingRef.current = true

    try {
      const response = await fetchOrderMessages(orderId)
      if (!isMountedRef.current) return

      errorCountRef.current = 0
      setError(null)
      setMessages((prev) =>
        haveSameChatMessages(prev, response.messages) ? prev : response.messages,
      )
    } catch {
      if (!isMountedRef.current) return

      errorCountRef.current++
      if (errorCountRef.current >= 3) {
        setError('Не удалось загрузить сообщения')
        stopPolling()
      }
    } finally {
      isFetchingRef.current = false
      if (isMountedRef.current) {
        setIsLoading(false)
      }

      if (isMountedRef.current && pendingRefreshRef.current) {
        pendingRefreshRef.current = false
        queueMicrotask(() => {
          if (isMountedRef.current) {
            void loadMessages()
          }
        })
      }
    }
  }, [orderId, stopPolling])

  const startPolling = useCallback(() => {
    if (intervalRef.current || !orderId) return

    intervalRef.current = setInterval(() => {
      void loadMessages()
    }, 5000)
  }, [loadMessages, orderId])

  // Initial load
  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  // Keep polling only as a fallback when the websocket is offline
  // or the document is in the background and real-time delivery is unreliable.
  useEffect(() => {
    if (isConnected && isDocumentVisible) {
      stopPolling()
      return
    }

    startPolling()
    return stopPolling
  }, [isConnected, isDocumentVisible, startPolling, stopPolling])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      const nextVisible = document.visibilityState === 'visible'
      setIsDocumentVisible(nextVisible)

      if (nextVisible) {
        void loadMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // WebSocket for real-time updates
  useEffect(() => {
    const unsubscribe = addMessageHandler((message) => {
      if (isChatSocketMessage(message) && message.order_id === orderId) {
        setIsAdminTyping(false)
        void loadMessages()
        haptic?.('success')
      }
      if (message.type === 'delivery_update' && (message as Record<string, unknown>).order_id === orderId) {
        void loadMessages()
        haptic?.('success')
      }
      if (message.type === 'revision_round_opened' && (message as Record<string, unknown>).order_id === orderId) {
        void loadMessages()
      }
      if (message.type === 'revision_round_updated' && (message as Record<string, unknown>).order_id === orderId) {
        void loadMessages()
      }
      if (message.type === 'revision_round_fulfilled' && (message as Record<string, unknown>).order_id === orderId) {
        void loadMessages()
      }
      if (isTypingIndicatorSocketMessage(message) && message.order_id === orderId) {
        setIsAdminTyping(message.is_typing)
        if (message.is_typing) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = window.setTimeout(() => {
            setIsAdminTyping(false)
            typingTimeoutRef.current = null
          }, 5000)
        } else if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      }
    })
    return () => {
      unsubscribe()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [orderId, addMessageHandler, loadMessages, haptic])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      stopPolling()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      // Fully dispose audio on unmount
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [stopPolling])

  const handleBack = useCallback(() => {
    haptic?.('light')
    safeBack()
  }, [haptic, safeBack])

  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    errorCountRef.current = 0
    void loadMessages()
    if (!isConnected || !isDocumentVisible) {
      startPolling()
    }
  }, [isConnected, isDocumentVisible, loadMessages, startPolling])

  const handleSend = async () => {
    const textToSend = inputText.trim()
    if (!textToSend || isSending) return

    haptic?.('light')
    setIsSending(true)
    setInputText('')

    // Optimistic update — declared before try so catch can access it
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

    try {
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
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setError('Не удалось отправить сообщение')
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
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        stream?.getTracks().forEach(track => track.stop())
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
      // Stop stream tracks if MediaRecorder creation fails
      if (stream) {
        stream?.getTracks().forEach(track => track.stop())
      }
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

  // Dispose current audio element properly
  const disposeAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.src = ''
      audioRef.current = null
    }
  }, [])

  // Audio playback with error handling for Telegram WebView
  const handlePlayAudio = useCallback(async (messageId: number, url: string) => {
    if (playingAudioId === messageId) {
      disposeAudio()
      setPlayingAudioId(null)
      return
    }

    // Dispose previous audio before creating new one
    disposeAudio()

    try {
      const audio = new Audio()
      audioRef.current = audio

      // Set up event handlers before setting src
      audio.onended = () => {
        setPlayingAudioId(null)
      }

      audio.onerror = () => {
        setPlayingAudioId(null)
        // Fallback: open in new tab if playback fails
        window.open(url, '_blank')
      }

      audio.src = url
      audio.load()

      await audio.play()
      setPlayingAudioId(messageId)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Audio playback error:', err)
      setPlayingAudioId(null)
      // Fallback: open audio in new tab/window
      window.open(url, '_blank')
    }
  }, [playingAudioId, disposeAudio])

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
      <div className="app-content flex items-center justify-center h-screen">
        <p className="text-text-muted">Заказ не найден</p>
      </div>
    )
  }

  return (
    <div
      className="page-full-width saloon-page-shell saloon-page-shell--utility app-content flex flex-col min-h-screen relative overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <div className="page-background" aria-hidden="true">
        <PremiumBackground variant="gold" intensity="subtle" interactive={false} />
      </div>
      <FloatingParticles />
      <div className="w-full max-w-[920px] mx-auto flex flex-col min-h-[100dvh] relative z-[1] px-4 py-4 md:px-6">

      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${ps.hero} ${ps.heroUtility} mb-4 shrink-0`}
      >
        <div className={ps.heroCopy}>
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="saloon-icon-button"
            >
              <ArrowLeft size={18} color="var(--text-main)" />
            </motion.button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-11 h-11 rounded-[14px] flex items-center justify-center shadow-gold-glow"
              style={{ background: 'var(--gold-metallic)' }}
            >
              <MessageCircle size={18} color="var(--text-on-gold)" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <h1 className={ps.heroTitle} style={{ fontSize: 'clamp(24px, 5vw, 32px)' }}>
                Чат по заказу #{orderId}
              </h1>
              <p className={ps.heroSubtitle}>
                {isAdminTyping ? 'Печатает...' : 'Вопросы по этому заказу'}
              </p>
            </div>
          </div>

          <div className={ps.chipRow}>
            <span className={`${ps.chip} ${ps.chipStrong}`}>#{orderId}</span>
            <span className={ps.chip}>{messages.length} сообщений</span>
            <span className={ps.chip}>{isConnected ? 'Online' : 'Sync'}</span>
          </div>
        </div>
      </motion.section>

      <div className={`${ps.surface} ${ps.surfaceUtility} flex flex-1 min-h-0 flex-col overflow-hidden`}>
      <div data-scroll-container="true" className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative z-[2]">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center p-5">
            <Loader2 className="animate-spin" color="var(--gold-400)" />
          </div>
        ) : error ? (
          <div className="text-center text-text-muted mt-10">
            <AlertCircle size={48} color="var(--error-text)" className="mx-auto mb-4" />
            <p className="mb-4">{error}</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-400/10 border border-gold-400/30 rounded-xl text-gold-400 cursor-pointer"
            >
              <RefreshCw size={16} />
              Повторить
            </motion.button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-text-muted mt-10">
            <MessageCircle size={48} color="var(--gold-glass-subtle)" className="mx-auto mb-4" />
            <p>Задайте вопрос по этому заказу</p>
            <p className="text-[12px] opacity-60">Мы ответим в ближайшее время</p>
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
                className={`max-w-[85%] flex gap-2 ${isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'}`}
              >
                {!isMe && (
                  <div
                    className="w-8 h-8 rounded-full bg-gold-400/20 flex items-center justify-center shrink-0"
                    style={{ opacity: showAvatar ? 1 : 0 }}
                  >
                    <span className="text-[14px] font-bold text-gold-400">С</span>
                  </div>
                )}

                <div>
                  {/* Bubble */}
                  <div
                    className="text-[15px] leading-[1.4]"
                    style={{
                      padding: msg.file_type === 'photo' ? 4 : '12px 16px',
                      borderRadius: 12,
                      borderTopRightRadius: isMe ? 4 : 18,
                      borderTopLeftRadius: !isMe ? 4 : 18,
                      background: isMe
                        ? 'var(--liquid-gold)'
                        : 'var(--border-default)',
                      color: isMe ? 'var(--text-on-gold)' : 'var(--text-main)',
                      border: !isMe ? '1px solid var(--surface-active)' : 'none',
                      boxShadow: isMe ? '0 4px 12px var(--border-gold)' : 'none'
                    }}>
                    {/* Text message */}
                    {msg.message_text && <span>{msg.message_text}</span>}

                    {/* Photo */}
                    {msg.file_type === 'photo' && msg.file_url && (
                      <img
                        src={msg.file_url}
                        alt={msg.file_name || 'Фото'}
                        className="max-w-full max-h-[300px] rounded-[12px] block"
                      />
                    )}

                    {/* Voice message */}
                    {(msg.file_type === 'voice' || msg.file_type === 'audio') && msg.file_url && (
                      <div className="flex items-center gap-3">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handlePlayAudio(msg.id, msg.file_url!)}
                          className="w-9 h-9 rounded-full border-none flex items-center justify-center cursor-pointer"
                          style={{ background: isMe ? 'var(--surface-strong)' : 'var(--border-gold)' }}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause size={18} color={isMe ? 'var(--text-on-gold)' : 'var(--gold-400)'} />
                          ) : (
                            <Play size={18} color={isMe ? 'var(--text-on-gold)' : 'var(--gold-400)'} />
                          )}
                        </motion.button>
                        <div
                          className="flex-1 h-1 rounded-sm"
                          style={{ background: isMe ? 'var(--surface-strong)' : 'var(--surface-active)' }}
                        >
                          <div
                            className="h-full rounded-sm transition-[width] duration-300"
                            style={{
                              width: playingAudioId === msg.id ? '50%' : '0%',
                              background: isMe ? 'var(--text-on-gold)' : 'var(--gold-400)',
                            }}
                          />
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
                        className="flex items-center gap-3 px-3 py-2 rounded-xl no-underline text-inherit"
                        style={{ background: isMe ? 'var(--surface-active)' : 'var(--border-default)' }}
                      >
                        <FileIcon size={24} color={isMe ? 'var(--text-on-gold)' : 'var(--gold-400)'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                            {msg.file_name || 'Файл'}
                          </div>
                          <div className="text-[11px] opacity-70">
                            {msg.file_type === 'video' ? 'Видео' : 'Документ'}
                          </div>
                        </div>
                        <Download size={18} />
                      </motion.a>
                    )}
                  </div>

                  {/* Time and status */}
                  <div
                    className={`text-[11px] text-text-muted mt-1 flex items-center gap-1 ${isMe ? 'text-right pr-1 justify-end' : 'text-left pl-1 justify-start'}`}
                  >
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
            className="self-start flex gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gold-400/20 flex items-center justify-center">
              <span className="text-[14px] font-bold text-gold-400">С</span>
            </div>
            <div className="px-4 py-3 rounded-[12px] rounded-tl bg-white/5 border border-white/10">
              <div className="flex gap-1">
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
                    className="w-1.5 h-1.5 rounded-full bg-gold-400"
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
        <div className="px-4 py-2 bg-gold-400/10 border-t border-gold-400/20">
          <div className="flex items-center gap-3">
            <Loader2 size={16} color="var(--gold-400)" className="animate-spin" />
            <span className="text-[13px] text-gold-400">
              Загрузка... {uploadProgress}%
            </span>
            <div className="flex-1 h-[3px] bg-gold-400/20 rounded-sm">
              <div
                className="h-full bg-gold-400 rounded-sm transition-[width] duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-red-500"
            />
            <span className="text-sm text-red-500">
              Запись {formatDuration(recordingDuration)}
            </span>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={cancelRecording}
              className="w-9 h-9 rounded-full bg-white/10 border-none flex items-center justify-center cursor-pointer"
            >
              <X size={18} color="var(--text-muted)" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="w-9 h-9 rounded-full bg-red-500 border-none flex items-center justify-center cursor-pointer"
            >
              <StopCircle size={18} color="var(--text-primary)" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="px-4 pt-3 relative z-[3] border-t border-white/10 backdrop-blur-[20px]"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'rgba(10, 10, 10, 0.36)',
        }}
      >
        <div className="flex items-end gap-2 bg-white/5 rounded-3xl py-2 pr-2 pl-4 border border-white/5">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isRecording}
            className="w-9 h-9 rounded-full bg-transparent border-none flex items-center justify-center"
            style={{
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
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            rows={1}
            disabled={isRecording}
            className="flex-1 bg-transparent border-none text-[var(--text-main)] text-[15px] resize-none py-2.5 px-0 max-h-[100px] min-h-[24px] outline-none font-[inherit]"
            style={{ opacity: isRecording ? 0.5 : 1 }}
          />

          {/* Voice or Send button */}
          {inputText.trim() ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={isSending}
              className="w-10 h-10 rounded-full bg-gold-400 flex items-center justify-center border-none text-black shrink-0"
              style={{ cursor: isSending ? 'default' : 'pointer' }}
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={uploading}
              className="w-10 h-10 rounded-full flex items-center justify-center border-none shrink-0"
              style={{
                background: isRecording ? 'var(--error-text)' : 'var(--surface-active)',
                cursor: uploading ? 'default' : 'pointer',
                opacity: uploading ? 0.5 : 1
              }}
            >
              {isRecording ? (
                <MicOff size={18} color="var(--text-primary)" />
              ) : (
                <Mic size={18} color="var(--text-muted)" />
              )}
            </motion.button>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}

export default OrderChatPage
