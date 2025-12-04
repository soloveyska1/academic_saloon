import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, ChevronDown, ChevronUp, User, Headphones } from 'lucide-react'
import { ChatMessage } from '../types'
import { fetchOrderMessages, sendOrderMessage } from '../api/userApi'
import { useTelegram } from '../hooks/useUserData'

interface Props {
  orderId: number
}

export function OrderChat({ orderId }: Props) {
  const { haptic, hapticSuccess, hapticError } = useTelegram()
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
        // Add message to local state
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(20, 20, 23, 0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      {/* Header - Always visible */}
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
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f2f2f2' }}>
            Чат с менеджером
          </div>
          <div style={{ fontSize: 12, color: '#71717a' }}>
            {messages.length > 0 ? `${messages.length} сообщений` : 'Задайте вопрос'}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} color="#71717a" />
        </motion.div>
      </motion.button>

      {/* Chat Content - Expandable */}
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
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '0 16px 16px',
            }}>
              {/* Messages Area */}
              <div style={{
                maxHeight: 300,
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
                    color: '#71717a',
                    fontSize: 14,
                  }}>
                    Загрузка...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: 24,
                    color: '#71717a',
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
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: msg.sender_type === 'client'
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: msg.sender_type === 'client'
                          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: msg.sender_type === 'client'
                          ? '1px solid rgba(212, 175, 55, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                        }}>
                          {msg.sender_type === 'admin' ? (
                            <Headphones size={12} color="#d4af37" />
                          ) : (
                            <User size={12} color="#71717a" />
                          )}
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: msg.sender_type === 'admin' ? '#d4af37' : '#71717a',
                          }}>
                            {msg.sender_name}
                          </span>
                          <span style={{ fontSize: 10, color: '#52525b' }}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 14,
                          color: '#f2f2f2',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}>
                          {msg.message_text}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding: '8px 12px',
                  marginBottom: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#ef4444',
                  textAlign: 'center',
                }}>
                  {error}
                </div>
              )}

              {/* Input Area */}
              <div style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Написать сообщение..."
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    fontSize: 15,
                    color: '#f2f2f2',
                    outline: 'none',
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: newMessage.trim()
                      ? 'linear-gradient(135deg, #d4af37, #b48e26)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: newMessage.trim() && !sending ? 'pointer' : 'not-allowed',
                    opacity: newMessage.trim() ? 1 : 0.5,
                  }}
                >
                  <Send
                    size={20}
                    color={newMessage.trim() ? '#050505' : '#71717a'}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
