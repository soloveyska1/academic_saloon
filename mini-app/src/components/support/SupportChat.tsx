import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ExternalLink, Loader2, MessageCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { ChatMessage } from '../../types'
import { fetchSupportMessages, sendSupportMessage } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'

function haveSameMessages(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false

  return a.every((message, index) => {
    const next = b[index]
    return message.id === next.id &&
      message.message_text === next.message_text &&
      message.created_at === next.created_at &&
      message.is_read === next.is_read &&
      message.sender_type === next.sender_type
  })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDayLabel(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDate = (left: Date, right: Date) =>
    left.getDate() === right.getDate() &&
    left.getMonth() === right.getMonth() &&
    left.getFullYear() === right.getFullYear()

  if (isSameDate(date, today)) return 'Сегодня'
  if (isSameDate(date, yesterday)) return 'Вчера'

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export function SupportChat() {
  const { haptic, openSupport } = useTelegram()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const errorCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetchSupportMessages()
      errorCountRef.current = 0
      setError(null)
      setMessages(prev => haveSameMessages(prev, response.messages) ? prev : response.messages)
    } catch {
      errorCountRef.current += 1

      if (errorCountRef.current >= 3) {
        setError('Не удалось загрузить переписку. Попробуйте обновить чат или откройте Telegram напрямую.')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }, [])

  useEffect(() => {
    loadMessages()
    intervalRef.current = setInterval(loadMessages, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
    const textToSend = inputText.trim()
    if (!textToSend || isSending) return

    haptic('light')
    setIsSending(true)
    const tempId = Date.now()
    setInputText('')

    try {
      const tempMsg: ChatMessage = {
        id: tempId,
        sender_type: 'client',
        sender_name: 'Вы',
        message_text: textToSend,
        file_type: null,
        file_name: null,
        file_url: null,
        created_at: new Date().toISOString(),
        is_read: false,
      }
      setMessages(prev => [...prev, tempMsg])

      await sendSupportMessage(textToSend)
      await loadMessages()
    } catch {
      setInputText(textToSend)
      setMessages(prev => prev.filter(message => message.id !== tempId))
      haptic('error')
    } finally {
      setIsSending(false)
    }
  }

  const messageFeed = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1]
      const showDayDivider = !previous || formatDayLabel(previous.created_at) !== formatDayLabel(message.created_at)
      const isClient = message.sender_type === 'client'
      const showSupportLabel = !isClient && (!previous || previous.sender_type === 'client')

      return {
        message,
        showDayDivider,
        showSupportLabel,
        isClient,
      }
    })
  }, [messages])

  const composerPlaceholder = hasLoadedOnce && messages.length === 0
    ? 'Напишите, что нужно решить'
    : 'Сообщение в поддержку'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
            <Loader2 className="animate-spin" color="#d4af37" />
          </div>
        ) : error ? (
          <div
            style={{
              marginTop: 20,
              padding: '20px 18px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={42} color="rgba(239,68,68,0.7)" style={{ margin: '0 auto 14px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Чат временно недоступен
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {error}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRetry}
                style={{
                  minHeight: 44,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f4f4f5',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={15} />
                Обновить
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={openSupport}
                style={{
                  minHeight: 44,
                  borderRadius: 14,
                  border: '1px solid rgba(212,175,55,0.18)',
                  background: 'rgba(212,175,55,0.1)',
                  color: '#d4af37',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={15} />
                Telegram
              </motion.button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              marginTop: 8,
              padding: '20px 18px',
              borderRadius: 22,
              background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(18,18,22,0.96) 100%)',
              border: '1px solid rgba(212,175,55,0.16)',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <ShieldCheck size={24} color="#d4af37" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Можно писать сразу сюда
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Напишите вопрос по оплате, срокам, правкам или файлам. Если удобнее перейти во внешний канал, откройте Telegram.
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={openSupport}
              style={{
                minHeight: 46,
                padding: '0 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f4f4f5',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
              >
                <ExternalLink size={15} />
                Telegram
              </motion.button>
          </div>
        ) : (
          <>
            {messageFeed.map(({ message, showDayDivider, showSupportLabel, isClient }) => (
              <div key={message.id}>
                {showDayDivider && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      margin: '8px 0 14px',
                    }}
                  >
                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.52)',
                      }}
                    >
                      {formatDayLabel(message.created_at)}
                    </span>
                  </div>
                )}

                {!isClient && showSupportLabel && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      paddingLeft: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        background: 'rgba(212,175,55,0.12)',
                        border: '1px solid rgba(212,175,55,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShieldCheck size={14} color="#d4af37" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f4f4f5' }}>
                        Техподдержка Academic Saloon
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)' }}>
                        Отвечаем в чате и в Telegram
                      </div>
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    justifyContent: isClient ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '84%',
                      padding: '12px 14px',
                      borderRadius: 18,
                      background: isClient
                        ? 'linear-gradient(135deg, #e7cb72 0%, #d4af37 55%, #b38728 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: isClient ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      color: isClient ? '#090909' : '#f4f4f5',
                      boxShadow: isClient ? '0 8px 22px rgba(212,175,55,0.18)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
                      {message.message_text}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        textAlign: isClient ? 'right' : 'left',
                        fontSize: 11,
                        color: isClient ? 'rgba(9,9,9,0.68)' : 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '12px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15,15,18,0.88)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            padding: '10px 10px 10px 14px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <textarea
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder={composerPlaceholder}
            rows={1}
            style={{
              flex: 1,
              minHeight: 22,
              maxHeight: 120,
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: '#f4f4f5',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isSending || inputText.trim().length === 0}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: 'none',
              background: inputText.trim().length === 0 ? 'rgba(255,255,255,0.08)' : 'var(--gold-metallic)',
              color: inputText.trim().length === 0 ? 'rgba(255,255,255,0.36)' : '#090909',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim().length === 0 ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {isSending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </motion.button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 10,
            fontSize: 11.5,
            color: 'rgba(255,255,255,0.42)',
          }}
        >
          <span>По срочным вопросам можно сразу открыть Telegram.</span>
          <button
            type="button"
            onClick={openSupportTelegram}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#d4af37',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            Telegram
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
