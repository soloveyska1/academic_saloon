import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ExternalLink, Loader2, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { ChatMessage } from '../../types'
import { fetchSupportMessages, sendSupportMessage } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'
import s from '../../pages/SupportPage.module.css'

/* ═══════ Helpers ═══════ */

function haveSameMessages(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false
  return a.every((message, index) => {
    const next = b[index]
    return (
      message.id === next.id &&
      message.message_text === next.message_text &&
      message.created_at === next.created_at &&
      message.is_read === next.is_read &&
      message.sender_type === next.sender_type
    )
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

/* ═══════ Component ═══════ */

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
      setMessages((prev) =>
        haveSameMessages(prev, response.messages) ? prev : response.messages,
      )
    } catch {
      errorCountRef.current += 1
      if (errorCountRef.current >= 3) {
        setError(
          'Не удалось загрузить переписку. Попробуйте обновить чат или откройте Telegram напрямую.',
        )
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
      if (intervalRef.current) clearInterval(intervalRef.current)
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
      setMessages((prev) => [...prev, tempMsg])
      await sendSupportMessage(textToSend)
      await loadMessages()
    } catch {
      setInputText(textToSend)
      setMessages((prev) => prev.filter((message) => message.id !== tempId))
      haptic('error')
    } finally {
      setIsSending(false)
    }
  }

  const messageFeed = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1]
      const showDayDivider =
        !previous || formatDayLabel(previous.created_at) !== formatDayLabel(message.created_at)
      const isClient = message.sender_type === 'client'
      const showSupportLabel = !isClient && (!previous || previous.sender_type === 'client')

      return { message, showDayDivider, showSupportLabel, isClient }
    })
  }, [messages])

  const composerPlaceholder =
    hasLoadedOnce && messages.length === 0
      ? 'Напишите, что нужно решить'
      : 'Сообщение в поддержку'

  const canSend = inputText.trim().length > 0

  /* ═══════ Render ═══════ */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Message area */}
      <div className={s.messageArea}>
        {isLoading && messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
            <Loader2 className={s.spinner} color="#d4af37" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={handleRetry} onOpenTelegram={openSupport} />
        ) : messages.length === 0 ? (
          <EmptyState onOpenTelegram={openSupport} />
        ) : (
          <>
            {messageFeed.map(({ message, showDayDivider, showSupportLabel, isClient }) => (
              <div key={message.id}>
                {showDayDivider && (
                  <div className={s.dayDivider}>
                    <span className={s.dayLabel}>{formatDayLabel(message.created_at)}</span>
                  </div>
                )}

                {!isClient && showSupportLabel && (
                  <div className={s.supportLabel}>
                    <div className={s.supportAvatar}>
                      <ShieldCheck size={14} color="#d4af37" />
                    </div>
                    <div>
                      <div className={s.supportName}>Техподдержка Академического Салона</div>
                      <div className={s.supportSub}>Отвечаем в чате и в Telegram</div>
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
                  <div className={isClient ? s.bubbleClient : s.bubbleAdmin}>
                    <div className={s.bubbleText}>{message.message_text}</div>
                    <div
                      className={`${s.bubbleTime} ${isClient ? s.bubbleTimeClient : s.bubbleTimeAdmin}`}
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

      {/* Composer */}
      <div className={s.composerBar}>
        <div className={s.composerInner}>
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
            className={s.composerTextarea}
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isSending || !canSend}
            className={`${s.sendButton} ${canSend ? s.sendButtonActive : s.sendButtonInactive}`}
          >
            {isSending ? (
              <Loader2 size={16} className={s.spinner} />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>

        <div className={s.composerFooter}>
          <span>По срочным вопросам можно сразу открыть Telegram.</span>
          <button type="button" onClick={openSupport} className={s.composerLink}>
            Telegram
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty State ─── */

const EmptyState = memo(function EmptyState({
  onOpenTelegram,
}: {
  onOpenTelegram: () => void
}) {
  return (
    <div className={s.emptyChat}>
      <div className={s.emptyChatIcon}>
        <ShieldCheck size={24} color="#d4af37" />
      </div>
      <div className={s.emptyChatTitle}>Можно писать сразу сюда</div>
      <div className={s.emptyChatText}>
        Напишите вопрос по оплате, срокам, правкам или файлам. Если удобнее перейти во внешний
        канал, откройте Telegram.
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onOpenTelegram}
        className={s.emptyChatButton}
      >
        <ExternalLink size={15} />
        Telegram
      </motion.button>
    </div>
  )
})

/* ─── Error State ─── */

const ErrorState = memo(function ErrorState({
  error,
  onRetry,
  onOpenTelegram,
}: {
  error: string
  onRetry: () => void
  onOpenTelegram: () => void
}) {
  return (
    <div className={s.errorCard}>
      <AlertCircle
        size={42}
        color="rgba(239,68,68,0.7)"
        style={{ margin: '0 auto 14px' }}
      />
      <div className={s.errorTitle}>Чат временно недоступен</div>
      <div className={s.errorText}>{error}</div>
      <div className={s.errorActions}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onRetry} className={s.retryButton}>
          <RefreshCw size={15} />
          Обновить
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onOpenTelegram}
          className={s.telegramAltButton}
        >
          <ExternalLink size={15} />
          Telegram
        </motion.button>
      </div>
    </div>
  )
})
