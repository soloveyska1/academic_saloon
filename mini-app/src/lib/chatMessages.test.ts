import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types'
import { haveSameChatMessages } from './chatMessages'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    sender_type: 'client',
    sender_name: 'Вы',
    message_text: 'Тест',
    file_type: null,
    file_name: null,
    file_url: null,
    created_at: '2026-04-08T10:00:00.000Z',
    is_read: false,
    ...overrides,
  }
}

describe('haveSameChatMessages', () => {
  it('returns true for identical chat payloads', () => {
    const messages = [makeMessage(), makeMessage({ id: 2, message_text: 'Ответ', sender_type: 'admin' })]

    expect(haveSameChatMessages(messages, [...messages])).toBe(true)
  })

  it('returns false when message metadata changes', () => {
    const previous = [makeMessage({ id: 7, is_read: false })]
    const next = [makeMessage({ id: 7, is_read: true })]

    expect(haveSameChatMessages(previous, next)).toBe(false)
  })

  it('returns false when file payload changes', () => {
    const previous = [makeMessage({ id: 9, file_url: null })]
    const next = [makeMessage({ id: 9, file_url: 'https://example.com/file.pdf' })]

    expect(haveSameChatMessages(previous, next)).toBe(false)
  })
})
