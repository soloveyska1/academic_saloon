import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, ShieldCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { ChatMessage } from '../../types'
import { fetchSupportMessages, sendSupportMessage } from '../../api/userApi'
import { useTelegram } from '../../hooks/useUserData'

export function SupportChat() {
    const { haptic } = useTelegram()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const errorCountRef = useRef(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const loadMessages = useCallback(async () => {
        try {
            const response = await fetchSupportMessages()
            // Reset error count on success
            errorCountRef.current = 0
            setError(null)
            // Only update if count changes to avoid flicker
            setMessages(prev => {
                if (prev.length !== response.messages.length) {
                    return response.messages
                }
                return prev
            })
        } catch (err) {
            errorCountRef.current++
            console.error('Failed to load messages:', err)

            // Show error after 3 consecutive failures
            if (errorCountRef.current >= 3) {
                setError('Не удалось загрузить сообщения')
                // Stop polling on repeated errors
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Polling for messages with error recovery
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

    const handleRetry = useCallback(() => {
        setError(null)
        setIsLoading(true)
        errorCountRef.current = 0
        loadMessages()
        // Restart polling
        if (!intervalRef.current) {
            intervalRef.current = setInterval(loadMessages, 5000)
        }
    }, [loadMessages])

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return

        haptic('light')
        setIsSending(true)
        const textToSend = inputText
        setInputText('') // Optimistic clear

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

            await sendSupportMessage(textToSend)
            await loadMessages() // Sync real ID
        } catch (err) {
            console.error('Failed to send:', err)
            // Rollback - restore input
            setInputText(textToSend)
            setMessages(prev => prev.filter(m => m.id !== Date.now()))
            haptic('error')
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        <ShieldCheck size={48} color="rgba(212,175,55,0.3)" style={{ margin: '0 auto 16px' }} />
                        <p>Напишите нам, мы на связи!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_type === 'client'
                        const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_type === 'client')

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
                                        opacity: showAvatar ? 1 : 0 // Keep space
                                    }}>
                                        <ShieldCheck size={16} color="#d4af37" />
                                    </div>
                                )}

                                <div>
                                    {/* Bubble */}
                                    <div style={{
                                        padding: '12px 16px',
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
                                        {msg.message_text}
                                    </div>

                                    {/* Time */}
                                    <div style={{
                                        fontSize: 11,
                                        color: 'var(--text-muted)',
                                        marginTop: 4,
                                        textAlign: isMe ? 'right' : 'left',
                                        paddingRight: isMe ? 4 : 0,
                                        paddingLeft: !isMe ? 4 : 0
                                    }}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '12px 16px',
                background: 'rgba(20, 20, 23, 0.8)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 20,
                    padding: '8px 8px 8px 16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Сообщение..."
                        rows={1}
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
                            fontFamily: 'inherit'
                        }}
                    />

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={!inputText.trim() || isSending}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: inputText.trim() && !isSending ? '#d4af37' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
                            color: inputText.trim() && !isSending ? '#000' : 'rgba(255,255,255,0.3)',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </motion.button>
                </div>
            </div>
        </div>
    )
}
